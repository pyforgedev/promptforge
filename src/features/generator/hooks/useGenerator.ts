import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { generatePrompts, getRandomNiche, improvePrompt } from '../services/generatorService'
import { checkDuplicate } from '@/services/similarity/similarityService'
import { saveHistoryItem, getHistoryItems } from '@/services/storage/indexeddb'
import type { AspectRatio, StylePresetKey, VariationCount, GeneratedPrompt } from '../types'
import type { SimilarityResult } from '@/services/similarity/similarityService'

interface GeneratorState {
  aspectRatio: AspectRatio
  niche: string
  stylePreset: StylePresetKey
  customStyle: string
  count: VariationCount
}

interface DuplicateWarning {
  promptId: string
  result: SimilarityResult
}

interface UseGeneratorReturn {
  state: GeneratorState
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
  saveToHistory: (id: string) => Promise<void>
  clear: () => void
}

export function useGenerator(): UseGeneratorReturn {
  const { t } = useTranslation()
  const [state, setState] = useState<GeneratorState>({
    aspectRatio: 'random',
    niche: '',
    stylePreset: 'none',
    customStyle: '',
    count: 1,
  })

  const [results, setResults] = useState<GeneratedPrompt[]>([])
  const [loading, setLoading] = useState(false)
  const [improvingId, setImprovingId] = useState<string | null>(null)
  const [duplicateWarnings, setDuplicateWarnings] = useState<DuplicateWarning[]>([])
  const [error, setError] = useState<string | null>(null)

  const setAspectRatio = useCallback((value: AspectRatio) => {
    setState((prev) => ({ ...prev, aspectRatio: value }))
  }, [])

  const setNiche = useCallback((value: string) => {
    setState((prev) => ({ ...prev, niche: value }))
  }, [])

  const setStylePreset = useCallback((value: StylePresetKey) => {
    setState((prev) => ({ ...prev, stylePreset: value }))
  }, [])

  const setCustomStyle = useCallback((value: string) => {
    setState((prev) => ({ ...prev, customStyle: value }))
  }, [])

  const setCount = useCallback((value: VariationCount) => {
    setState((prev) => ({ ...prev, count: value }))
  }, [])

  const randomizeNiche = useCallback(() => {
    const niche = getRandomNiche()
    setState((prev) => ({ ...prev, niche }))
  }, [])

  const runDuplicateCheck = useCallback(async (prompts: GeneratedPrompt[]) => {
    const historyItems = await getHistoryItems()
    const existingContents = historyItems.map((h) => h.content)
    if (existingContents.length === 0) return

    const warnings: DuplicateWarning[] = []
    for (const p of prompts) {
      const result = await checkDuplicate(p.content, existingContents)
      if (result && result.level !== 'low') {
        warnings.push({ promptId: p.id, result })
      }
    }
    setDuplicateWarnings(warnings)
  }, [])

  const doGenerate = useCallback(async () => {
    setLoading(true)
    setError(null)
    setDuplicateWarnings([])
    try {
      const prompts = await generatePrompts(state)
      setResults(prompts)
      runDuplicateCheck(prompts)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('generator.errors.generationFailed'))
    } finally {
      setLoading(false)
    }
  }, [state, t, runDuplicateCheck])

  const generate = doGenerate
  const regenerate = doGenerate

  const improve = useCallback(async (id: string) => {
    const prompt = results.find((p) => p.id === id)
    if (!prompt) return

    setImprovingId(id)
    try {
      const improved = await improvePrompt(prompt.content, state)
      setResults((prev) =>
        prev.map((p) => (p.id === id ? { ...improved, id: p.id } : p)),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : t('generator.errors.generationFailed'))
    } finally {
      setImprovingId(null)
    }
  }, [results, state, t])

  const dismissDuplicateWarning = useCallback((promptId: string) => {
    setDuplicateWarnings((prev) => prev.filter((w) => w.promptId !== promptId))
  }, [])

  const saveToHistory = useCallback(async (id: string) => {
    const prompt = results.find((p) => p.id === id)
    if (!prompt) return
    try {
      await saveHistoryItem({
        id: prompt.id,
        content: prompt.content,
        aspectRatio: prompt.aspectRatio,
        niche: prompt.niche,
        stylePreset: prompt.stylePreset,
        qualityScore: prompt.qualityScore,
        createdAt: prompt.createdAt,
        savedAt: Date.now(),
      })
    } catch {
      // silently fail - history is optional
    }
  }, [results])

  const clear = useCallback(() => {
    setResults([])
    setError(null)
    setDuplicateWarnings([])
  }, [])

  return {
    state,
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
    saveToHistory,
    clear,
  }
}
