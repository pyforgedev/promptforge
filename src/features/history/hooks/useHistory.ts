import { useState, useEffect, useCallback } from 'react'
import {
  getHistoryItems,
} from '@/services/storage/indexeddb'

import type { PromptHistoryRecord } from '@/services/storage/indexeddb'

interface UseHistoryReturn {
  items: PromptHistoryRecord[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useHistory(): UseHistoryReturn {
  const [items, setItems] = useState<PromptHistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getHistoryItems()
      setItems(data)
    } catch (err) {
      setError(import.meta.env.DEV
        ? (err instanceof Error ? err.message : String(err))
        : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      await refresh()
    }
    void load()
  }, [refresh])

  return {
    items,
    loading,
    error,
    refresh,
  }
}

