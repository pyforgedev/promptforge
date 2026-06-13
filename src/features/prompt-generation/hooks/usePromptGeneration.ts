import { useState, useCallback } from 'react'
import { generate } from '@/features/prompt-generation/services/promptGenerationService'
import type { GenerateInput, GenerateResult } from '@/features/prompt-generation/types'

interface UsePromptGenerationReturn {
  result: GenerateResult | null
  loading: boolean
  error: string | null
  generate: (input: GenerateInput) => Promise<void>
  clear: () => void
}

export function usePromptGeneration(): UsePromptGenerationReturn {
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = useCallback(async (input: GenerateInput) => {
    setLoading(true)
    setError(null)
    try {
      const res = await generate(input)
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { result, loading, error, generate: handleGenerate, clear }
}
