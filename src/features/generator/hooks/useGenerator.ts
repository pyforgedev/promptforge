import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/hooks/useToast'
import { useAIConfigStore } from '@/store/useAIConfigStore'
import { useGeneratorStore } from '@/store/useGeneratorStore'
import { generatePrompts, getRandomNiche, improvePrompt } from '../services/generatorService'
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
  const { showGenerationSuccess, showImproveSuccess, showError } = useToast()
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

  const [results, setResultsState] = useState<GeneratedPrompt[]>(() => {
    // Synchronous init if store is already ready
    // Note: Zustant persist hydration is usually async, but this is a safer approach
    return [] 
  })
  
  // Use a ref to track if we've initialized results from store
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
    const newNiche = getRandomNiche()
    setNiche(newNiche)
  }, [setNiche])

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
    try {
      const prompts = await generatePrompts(state(), activeConfig)
      
      // Run duplicate check before setting results to ensure warnings are ready
      await runDuplicateCheck(prompts)
      
      setResults(prompts)
      showGenerationSuccess()
      
      // Auto-save to history using new logging service
      await Promise.all(prompts.map(p => logHistoryItem(p)))
    } catch (err) {
      showError(err instanceof Error ? err.message : t('generator.errors.generationFailed'))
      setError(err instanceof Error ? err.message : t('generator.errors.generationFailed'))
    } finally {
      setLoading(false)
    }
  }, [state, t, runDuplicateCheck, activeConfig, showGenerationSuccess, showError, setResults])

  const generate = doGenerate
  const regenerate = doGenerate

  const improve = useCallback(async (id: string) => {
    if (!activeConfig) {
      showError(t('generator.errors.noActiveConfig'))
      return
    }

    const prompt = results.find((p) => p.id === id)
    if (!prompt) return

    setImprovingId(id)
    try {
      const improved = await improvePrompt(prompt.content, state(), activeConfig)
      const newResults = results.map((p) => (p.id === id ? { ...improved, id: p.id } : p))
      setResults(newResults)
      showImproveSuccess()
      
      // Auto-save improved prompt to history
      await logHistoryItem({
        ...improved,
        id: prompt.id,
      })
    } catch (err) {
      showError(err instanceof Error ? err.message : t('generator.errors.generationFailed'))
      setError(err instanceof Error ? err.message : t('generator.errors.generationFailed'))
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
