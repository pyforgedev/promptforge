import { useState, useCallback } from 'react'
import { checkDuplicate } from '@/services/similarity/similarityService'
import { getHistoryItems } from '@/services/storage/indexeddb'
import type { SimilarityResult } from '@/services/similarity/similarityService'

interface UseDuplicateCheckReturn {
  checking: boolean
  result: SimilarityResult | null
  check: (content: string) => Promise<SimilarityResult | null>
  clear: () => void
}

export function useDuplicateCheck(): UseDuplicateCheckReturn {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<SimilarityResult | null>(null)

  const check = useCallback(async (content: string): Promise<SimilarityResult | null> => {
    setChecking(true)
    setResult(null)
    try {
      const history = await getHistoryItems()
      const contents = history.map((h) => h.content)
      if (contents.length === 0) return null

      const simResult = await checkDuplicate(content, contents)
      setResult(simResult)
      return simResult
    } catch {
      return null
    } finally {
      setChecking(false)
    }
  }, [])

  const clear = useCallback(() => {
    setResult(null)
  }, [])

  return { checking, result, check, clear }
}
