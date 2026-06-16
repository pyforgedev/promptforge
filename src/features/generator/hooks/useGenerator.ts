import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/hooks/useToast'
import { useAIConfigStore } from '@/store/useAIConfigStore'
import { useGeneratorStore } from '@/store/useGeneratorStore'
import { generatePrompts, improvePrompt, improveNicheInput } from '../services/generatorService'
import { useIdeaQueue } from './useIdeaQueue'
import { calculateSimilarity, logHistoryItem } from '@/services/similarity/similarityService'
import type { AspectRatio, StylePresetKey, VariationCount, GeneratedPrompt } from '../types'
import type { SimilarityResult } from '@/services/similarity/similarityService'
import { getHistoryItems } from '@/services/storage/indexeddb'

interface DuplicateWarning {
  promptId: string
  result: SimilarityResult
}

interface UseGeneratorReturn {
  state: {
    aspectRatio: AspectRatio
    niche: string
    stylePreset: StylePresetKey
    customStyle: string
    count: VariationCount
  }
  setAspectRatio: (value: AspectRatio) => void
  setNiche: (value: string) => void
  setStylePreset: (value: StylePresetKey) => void
  setCustomStyle: (value: string) => void
  setCount: (value: VariationCount) => void
  randomizeNiche: () => void
  isRandomizing: boolean
  isQueueHydrating: boolean
  isQueueEmpty: boolean
  improveNiche: () => Promise<void>
  isImprovingNiche: boolean
  results: GeneratedPrompt[]
  loading: boolean
  improvingId: string | null
  duplicateWarnings: DuplicateWarning[]
  error: string | null
  generate: () => Promise<void>
  regenerate: () => Promise<void>
  improve: (id: string) => Promise<void>
  dismissDuplicateWarning: (promptId: string) => void
  clear: () => void
  isConfigValid: boolean
}

export function useGenerator(): UseGeneratorReturn {
  const { t } = useTranslation()
  const { showToast, showGenerationSuccess, showImproveSuccess, showError } = useToast()
  const { activeConfig, isReady: isAIReady } = useAIConfigStore()
  const {
    aspectRatio,
    niche,
    stylePreset,
    customStyle,
    count,
    lastResult,
    isReady: isStoreReady,
    setAspectRatio,
    setNiche,
    setStylePreset,
    setCustomStyle,
    setCount,
    setLastResult,
    hydrate
  } = useGeneratorStore()

  useEffect(() => {
    if (!isStoreReady) {
      hydrate()
    }
  }, [isStoreReady, hydrate])

  const state = useCallback(() => ({
    aspectRatio,
    niche,
    stylePreset,
    customStyle,
    count,
  }), [aspectRatio, niche, stylePreset, customStyle, count])

  const isConfigValid = isAIReady && !!(
    activeConfig?.apiKey &&
    activeConfig?.endpoint?.startsWith('http') &&
    activeConfig?.model
  )

  const { getNextIdea, isHydrating: isQueueHydrating, isFetchingInitial, isRefilling, isQueueEmpty } = useIdeaQueue(
    stylePreset,
    customStyle,
    activeConfig ?? null,
    isConfigValid
  )

  const [results, setResultsState] = useState<GeneratedPrompt[]>(() => {
    return [] 
  })
  
  const isInitialized = useRef(false)

  useEffect(() => {
    if (isStoreReady && lastResult && !isInitialized.current) {
      setResultsState(lastResult)
      isInitialized.current = true
    }
  }, [isStoreReady, lastResult])

  const setResults = useCallback((prompts: GeneratedPrompt[]) => {
    setResultsState(prompts)
    setLastResult(prompts)
  }, [setLastResult])

  const [loading, setLoading] = useState(false)
  const [improvingId, setImprovingId] = useState<string | null>(null)
  const [duplicateWarnings, setDuplicateWarnings] = useState<DuplicateWarning[]>([])
  const [error, setError] = useState<string | null>(null)

  const randomizeNiche = useCallback(() => {
    const idea = getNextIdea()
    if (idea) {
      setNiche(idea)
    } else if (!isConfigValid) {
      showError(t('generator.errors.noActiveConfig'))
    } else {
      showToast('info', t('generator.queueRefilling'))
    }
  }, [getNextIdea, setNiche, isConfigValid, showError, showToast, t])

  const isRandomizing = (isFetchingInitial || isRefilling) && isQueueEmpty

  const [isImprovingNiche, setIsImprovingNiche] = useState(false)

  const improveNiche = useCallback(async () => {
    if (!niche.trim() || !activeConfig || !isConfigValid) return
    setIsImprovingNiche(true)
    try {
      const improved = await improveNicheInput(niche, activeConfig)
      setNiche(improved)
    } catch (err) {
      showError(err instanceof Error ? err.message : t('generator.errors.generationFailed'))
    } finally {
      setIsImprovingNiche(false)
    }
  }, [niche, activeConfig, isConfigValid, setNiche, showError, t])

  const runDuplicateCheck = useCallback(async (prompts: GeneratedPrompt[]) => {
    const historyItems = await getHistoryItems()
    const existingContents = historyItems.map((h) => h.content)
    if (existingContents.length === 0) return

    const warnings: DuplicateWarning[] = []
    for (const p of prompts) {
      const result = calculateSimilarity(p.content, existingContents)
      if (result && result.level !== 'low') {
        warnings.push({ promptId: p.id, result })
      }
    }
    setDuplicateWarnings(warnings)
  }, [])

  const doGenerate = useCallback(async () => {
    if (!activeConfig) {
      showError(t('generator.errors.noActiveConfig'))
      return
    }

    setLoading(true)
    setError(null)
    setDuplicateWarnings([])
    
    // Initialize results with placeholders for streaming
    const initialPrompts: GeneratedPrompt[] = Array.from({ length: state().count }).map(() => ({
      id: crypto.randomUUID(),
      content: '',
      aspectRatio: state().aspectRatio,
      niche: state().niche,
      stylePreset: state().stylePreset,
      qualityScore: {
        commercialPotential: 0,
        creativity: 0,
        clarity: 0,
        marketability: 0,
        uniqueness: 0,
        overall: 0
      },
      createdAt: Date.now(),
      tags: [], // Add missing tags
      folderId: null // Add missing folderId
    }))
    
    setResultsState(initialPrompts)
    
    const handlePartialUpdate = (index: number, partialData: Partial<{ content: string; qualityScore: Partial<GeneratedPrompt['qualityScore']> }>) => {
      setResultsState(prev => {
        const newResults = [...prev]
        if (newResults[index]) {
          newResults[index] = {
            ...newResults[index],
            ...(partialData.content !== undefined ? { content: partialData.content } : {}),
            ...(partialData.qualityScore !== undefined ? {
              qualityScore: {
                ...newResults[index].qualityScore,
                ...partialData.qualityScore as Record<string, number>
              }
            } : {})
          }
        }
        return newResults
      })
    }

    try {
      const prompts = await generatePrompts(state(), activeConfig, handlePartialUpdate)
      
      // Run duplicate check before setting results to ensure warnings are ready
      await runDuplicateCheck(prompts)
      
      setResults(prompts)
      showGenerationSuccess()
      
      // Auto-save to history using new logging service
      await Promise.all(prompts.map(p => logHistoryItem({
        ...p,
        tags: p.tags || [],
        folderId: p.folderId || null,
      })))
    } catch (err) {
      showError(err instanceof Error ? err.message : t('generator.errors.generationFailed'))
      setError(err instanceof Error ? err.message : t('generator.errors.generationFailed'))
      // On error, clear placeholders
      setResultsState(lastResult || [])
    } finally {
      setLoading(false)
    }
  }, [state, t, runDuplicateCheck, activeConfig, showGenerationSuccess, showError, setResults, lastResult])

  const generate = doGenerate
  const regenerate = doGenerate

  const improve = useCallback(async (id: string) => {
    if (!activeConfig) {
      showError(t('generator.errors.noActiveConfig'))
      return
    }

    const promptIndex = results.findIndex((p) => p.id === id)
    if (promptIndex === -1) return
    const prompt = results[promptIndex]

    setImprovingId(id)
    
    // Clear content of target prompt during streaming to show new output
    setResultsState(prev => {
      const newResults = [...prev]
      if (newResults[promptIndex]) {
        newResults[promptIndex] = {
          ...newResults[promptIndex],
          content: ''
        }
      }
      return newResults
    })

    const handlePartialUpdate = (partialData: Partial<{ content: string; qualityScore: Partial<GeneratedPrompt['qualityScore']> }>) => {
      setResultsState(prev => {
        const newResults = [...prev]
        if (newResults[promptIndex]) {
          newResults[promptIndex] = {
            ...newResults[promptIndex],
            ...(partialData.content !== undefined ? { content: partialData.content } : {}),
            ...(partialData.qualityScore !== undefined ? {
              qualityScore: {
                ...newResults[promptIndex].qualityScore,
                ...partialData.qualityScore as Record<string, number>
              }
            } : {})
          }
        }
        return newResults
      })
    }

    try {
      const improved = await improvePrompt(prompt.content, state(), activeConfig, handlePartialUpdate)
      const newResults = results.map((p) => (p.id === id ? { ...improved, id: p.id } : p))
      setResults(newResults)
      showImproveSuccess()
      
      // Auto-save improved prompt to history
      await logHistoryItem({
        ...improved,
        id: prompt.id,
        tags: improved.tags || [],
        folderId: improved.folderId || null,
      })
    } catch (err) {
      showError(err instanceof Error ? err.message : t('generator.errors.generationFailed'))
      setError(err instanceof Error ? err.message : t('generator.errors.generationFailed'))
      // Revert if error
      setResults(results)
    } finally {
      setImprovingId(null)
    }
  }, [results, state, t, activeConfig, showImproveSuccess, showError, setResults])

  const dismissDuplicateWarning = useCallback((promptId: string) => {
    setDuplicateWarnings((prev) => prev.filter((w) => w.promptId !== promptId))
  }, [])



  const clear = useCallback(() => {
    setResults([])
    setLastResult(null)
    setError(null)
    setDuplicateWarnings([])
  }, [setResults, setLastResult])

  return {
    state: state(),
    setAspectRatio,
    setNiche,
    setStylePreset,
    setCustomStyle,
    setCount,
    randomizeNiche,
    isRandomizing,
    isQueueHydrating,
    isQueueEmpty,
    improveNiche,
    isImprovingNiche,
    results,
    loading,
    improvingId,
    duplicateWarnings,
    error,
    generate,
    regenerate,
    improve,
    dismissDuplicateWarning,
    clear,
    isConfigValid,
  }
}
