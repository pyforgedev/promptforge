import { create } from 'zustand'
import db, { 
  deleteHistoryItem, 
  deleteAllHistory,
  getFolders,
  saveFolder,
  deleteFolder,
  bulkUpdateHistoryFolder,
  queryHistoryItems,
  resetDatabase,
} from '@/services/storage/indexeddb'
import { usePromptGeneratorStore } from '@/features/prompt-generator/store/promptGeneratorStore'
import type { PromptHistoryRecord } from '@/services/storage/indexeddb'
import type { HistoryFilters, Folder } from '@/features/history/types'

interface HistoryState {
  items: PromptHistoryRecord[]
  folders: Folder[]
  selectedIds: string[]
  currentFolderId: string | null
  searchMode: 'global' | 'local'
  filters: HistoryFilters
  loading: boolean
  error: string | null
  hasMore: boolean
  offset: number

  // Actions
  fetchHistory: () => Promise<void>
  loadMore: () => Promise<void>
  fetchFolders: () => Promise<void>
  setFilter: <K extends keyof HistoryFilters>(key: K, value: HistoryFilters[K]) => void
  resetFilters: () => void
  setCurrentFolder: (id: string | null) => void
  setSearchMode: (mode: 'global' | 'local') => void
  
  // Multi-select
  toggleSelect: (id: string) => void
  selectAll: (ids: string[]) => void
  deselectAll: () => void
  
  // Bulk Actions
  bulkDelete: () => Promise<void>
  bulkMove: (folderId: string | null) => Promise<void>
  removeAll: () => Promise<void>
  
  // Single Actions
  removeItem: (id: string) => Promise<void>
  
  // Folder Actions
  createFolder: (name: string, parentId?: string | null) => Promise<void>
  renameFolder: (id: string, name: string) => Promise<void>
  removeFolder: (id: string) => Promise<void>
}

function _isSchemaError(err: unknown): boolean {
  const msg = (err as Error)?.message?.toLowerCase() ?? ''
  const name = (err as DOMException)?.name ?? ''
  return (
    msg.includes('schema') ||
    msg.includes('version') ||
    msg.includes('upgrade') ||
    msg.includes('migration') ||
    msg.includes('corruption') ||
    name === 'VersionError' ||
    name === 'InvalidStateError'
  )
}

const defaultFilters: HistoryFilters = {
  aspectRatio: 'all',
  stylePreset: 'all',
  minRating: 0,
  dateFrom: '',
  dateTo: '',
  search: '',
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  items: [],
  folders: [],
  selectedIds: [],
  currentFolderId: null,
  searchMode: 'local',
  filters: defaultFilters,
  loading: false,
  error: null,
  hasMore: false,
  offset: 0,

  /**
   * Check if the error looks like a Dexie schema/migration issue
   * that can be fixed by clearing IndexedDB.
   */
  _isSchemaError(err: unknown): boolean {
    const msg = (err as Error)?.message?.toLowerCase() ?? ''
    const name = (err as DOMException)?.name ?? ''
    return (
      msg.includes('schema') ||
      msg.includes('version') ||
      msg.includes('upgrade') ||
      msg.includes('migration') ||
      msg.includes('corruption') ||
      name === 'VersionError' ||
      name === 'InvalidStateError'
    )
  },

  fetchHistory: async () => {
    set({ loading: true, error: null, offset: 0, items: [] })
    try {
      const { currentFolderId, searchMode, filters } = get()
      const { items, hasMore } = await queryHistoryItems({
        folderId: currentFolderId,
        searchMode,
        minRating: filters.minRating,
        search: filters.search,
        offset: 0,
        limit: 20
      })
      set({ items, hasMore, offset: items.length, loading: false })
    } catch (err) {
      if (_isSchemaError(err)) {
        console.warn('[HistoryStore] fetchHistory failed with schema error, resetting DB...', err)
        try {
          await resetDatabase()
          const { currentFolderId, searchMode, filters } = get()
          const { items, hasMore } = await queryHistoryItems({
            folderId: currentFolderId,
            searchMode,
            minRating: filters.minRating,
            search: filters.search,
            offset: 0,
            limit: 20
          })
          set({ items, hasMore, offset: items.length, loading: false })
          return
        } catch (retryErr) {
          console.error('[HistoryStore] fetchHistory failed after DB reset:', retryErr)
          set({ error: (retryErr as Error).message, loading: false })
          return
        }
      }
      console.warn('[HistoryStore] fetchHistory failed:', err)
      set({ error: (err as Error).message, loading: false })
    }
  },

  loadMore: async () => {
    if (get().loading || !get().hasMore) return
    set({ loading: true, error: null })
    try {
      const { currentFolderId, searchMode, filters, offset, items: existingItems } = get()
      const { items: newItems, hasMore } = await queryHistoryItems({
        folderId: currentFolderId,
        searchMode,
        minRating: filters.minRating,
        search: filters.search,
        offset,
        limit: 20
      })
      set({
        items: [...existingItems, ...newItems],
        hasMore,
        offset: offset + newItems.length,
        loading: false
      })
    } catch (err) {
      console.warn('[HistoryStore] loadMore failed:', err)
      set({ error: (err as Error).message, loading: false })
    }
  },

  fetchFolders: async () => {
    set({ error: null })
    try {
      const folders = await getFolders()
      set({ folders })
    } catch (err) {
      if (_isSchemaError(err)) {
        console.warn('[HistoryStore] fetchFolders failed with schema error, resetting DB...', err)
        try {
          await resetDatabase()
          const folders = await getFolders()
          set({ folders })
          return
        } catch (retryErr) {
          console.error('[HistoryStore] fetchFolders failed after DB reset:', retryErr)
          set({ error: (retryErr as Error).message })
          return
        }
      }
      console.warn('[HistoryStore] fetchFolders failed:', err)
      set({ error: (err as Error).message })
    }
  },

  setFilter: (key, value) => {
    set((state) => ({ filters: { ...state.filters, [key]: value } }))
    get().fetchHistory()
  },

  resetFilters: () => {
    set({ filters: defaultFilters })
    get().fetchHistory()
  },

  setCurrentFolder: (id) => {
    set({ currentFolderId: id, selectedIds: [] })
    get().fetchHistory()
  },

  setSearchMode: (mode) => {
    set({ searchMode: mode })
    get().fetchHistory()
  },

  toggleSelect: (id) => set((state) => ({
    selectedIds: state.selectedIds.includes(id)
      ? state.selectedIds.filter(i => i !== id)
      : [...state.selectedIds, id]
  })),

  selectAll: (ids) => set({ selectedIds: ids }),

  deselectAll: () => set({ selectedIds: [] }),

  bulkDelete: async () => {
    const { selectedIds } = get()
    set({ error: null })
    try {
      await db.transaction('rw', db.prompt_history, async () => {
        await Promise.all(selectedIds.map(id => db.prompt_history.delete(id)))
      })
      usePromptGeneratorStore.getState().removePromptsFromBatch(selectedIds)
      set((state) => ({
        items: state.items.filter(item => !selectedIds.includes(item.id)),
        selectedIds: []
      }))
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  bulkMove: async (folderId) => {
    const { selectedIds } = get()
    set({ error: null })
    try {
      await bulkUpdateHistoryFolder(selectedIds, folderId)
      set((state) => ({
        items: state.items.map(item => 
          selectedIds.includes(item.id) ? { ...item, folderId } : item
        ),
        selectedIds: []
      }))
      if (get().searchMode === 'local') {
        get().fetchHistory()
      }
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  removeAll: async () => {
    set({ error: null })
    try {
      await deleteAllHistory()
      usePromptGeneratorStore.getState().clearBatch()
      set({ items: [], selectedIds: [] })
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  removeItem: async (id) => {
    set({ error: null })
    try {
      await deleteHistoryItem(id)
      usePromptGeneratorStore.getState().removePromptsFromBatch([id])
      set((state) => ({
        items: state.items.filter(item => item.id !== id),
        selectedIds: state.selectedIds.filter(i => i !== id)
      }))
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  createFolder: async (name, parentId = null) => {
    set({ error: null })
    try {
      const newFolder: Folder = {
        id: crypto.randomUUID(),
        name,
        parentId: parentId || null,
        createdAt: Date.now()
      }
      await saveFolder(newFolder)
      set((state) => ({ folders: [...state.folders, newFolder] }))
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  renameFolder: async (id, name) => {
    set({ error: null })
    try {
      const { updateFolder } = await import('@/services/storage/indexeddb')
      await updateFolder(id, { name })
      set((state) => ({
        folders: state.folders.map(f => f.id === id ? { ...f, name } : f)
      }))
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  removeFolder: async (id) => {
    set({ error: null })
    try {
      await deleteFolder(id)
      await db.prompt_history.where('folderId').equals(id).modify({ folderId: null })
      set((state) => ({
        folders: state.folders.filter(f => f.id !== id),
        currentFolderId: state.currentFolderId === id ? null : state.currentFolderId,
        items: state.items.map(item =>
          item.folderId === id ? { ...item, folderId: null } : item
        )
      }))
      if (get().currentFolderId === null) {
        get().fetchHistory()
      }
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  }
}))
