import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getHistoryItems,
  saveHistoryItem,
  deleteHistoryItem,
  deleteAllHistory,
} from '@/services/storage/indexeddb'
import type { HistoryItem, HistoryFilters } from '../types'

interface UseHistoryReturn {
  items: HistoryItem[]
  filteredItems: HistoryItem[]
  loading: boolean
  saving: boolean
  error: string | null
  filters: HistoryFilters
  setFilter: <K extends keyof HistoryFilters>(key: K, value: HistoryFilters[K]) => void
  resetFilters: () => void
  save: (item: Omit<HistoryItem, 'savedAt'>) => Promise<void>
  remove: (id: string) => Promise<void>
  removeAll: () => Promise<void>
  refresh: () => Promise<void>
  exportText: () => string
}

const defaultFilters: HistoryFilters = {
  aspectRatio: 'all',
  stylePreset: 'all',
  minRating: 0,
  dateFrom: '',
  dateTo: '',
  search: '',
}

export function useHistory(): UseHistoryReturn {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<HistoryFilters>(defaultFilters)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getHistoryItems()
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history')
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

  const setFilter = useCallback(<K extends keyof HistoryFilters>(key: K, value: HistoryFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters)
  }, [])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filters.aspectRatio && filters.aspectRatio !== 'all' && item.aspectRatio !== filters.aspectRatio) return false
      if (filters.stylePreset && filters.stylePreset !== 'all' && item.stylePreset !== filters.stylePreset) return false
      if (filters.minRating > 0 && (item.qualityScore?.overall ?? 0) < filters.minRating) return false
      if (filters.dateFrom && item.savedAt < new Date(filters.dateFrom).getTime()) return false
      if (filters.dateTo && item.savedAt > new Date(filters.dateTo).getTime() + 86400000) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!item.content.toLowerCase().includes(q) && !item.niche.toLowerCase().includes(q)) {
          return false
        }
      }
      return true
    })
  }, [items, filters])

  const save = useCallback(async (item: Omit<HistoryItem, 'savedAt'>) => {
    setSaving(true)
    setError(null)
    try {
      const historyItem: HistoryItem = {
        ...item,
        savedAt: Date.now(),
      }
      await saveHistoryItem(historyItem)
      setItems((prev) => [historyItem, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save history')
    } finally {
      setSaving(false)
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    setError(null)
    try {
      await deleteHistoryItem(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete history item')
    }
  }, [])

  const removeAll = useCallback(async () => {
    setError(null)
    try {
      await deleteAllHistory()
      setItems([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear history')
    }
  }, [])

  const exportText = useCallback(() => {
    return items
      .map((item, i) => {
        return [
          `Prompt #${i + 1}`,
          `Aspect Ratio: ${item.aspectRatio}`,
          `Niche: ${item.niche}`,
          `Style: ${item.stylePreset}`,
          `Score: ${item.qualityScore?.overall ?? 'N/A'}/10`,
          `Date: ${new Date(item.savedAt).toLocaleString()}`,
          `---`,
          item.content,
          `==========`,
        ].join('\n')
      })
      .join('\n\n')
  }, [items])

  return {
    items,
    filteredItems,
    loading,
    saving,
    error,
    filters,
    setFilter,
    resetFilters,
    save,
    remove,
    removeAll,
    refresh,
    exportText,
  }
}
