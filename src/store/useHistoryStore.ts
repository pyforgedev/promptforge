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
import { emit } from '@/lib/eventBus'
import { sanitizeError } from '@/lib/sanitizeError'
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
          if (import.meta.env.DEV) console.warn('[HistoryStore] fetchHistory DB reset failed:', sanitizeError(retryErr))
          set({ error: 'Failed to load history after database reset.', loading: false })
          return
        }
      }
      if (import.meta.env.DEV) console.warn('[HistoryStore] fetchHistory failed:', sanitizeError(err))
      set({ error: 'Failed to load history.', loading: false })
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
      if (import.meta.env.DEV) console.warn('[HistoryStore] loadMore failed:', sanitizeError(err))
      set({ error: 'Failed to load more history.', loading: false })
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
          if (import.meta.env.DEV) console.warn('[HistoryStore] fetchFolders DB reset failed:', sanitizeError(retryErr))
          set({ error: 'Failed to load folders after database reset.' })
          return
        }
      }
      if (import.meta.env.DEV) console.warn('[HistoryStore] fetchFolders failed:', sanitizeError(err))
      set({ error: 'Failed to load folders.' })
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
    set({ error: null, loading: true })
    try {
      const CHUNK_SIZE = 50
      for (let i = 0; i < selectedIds.length; i += CHUNK_SIZE) {
        const chunk = selectedIds.slice(i, i + CHUNK_SIZE)
        await db.transaction('rw', db.prompt_history, async () => {
          await Promise.all(chunk.map(id => db.prompt_history.delete(id)))
        })
      }
      emit('history:items-deleted', selectedIds)
      get().fetchHistory()
      set({ selectedIds: [], loading: false })
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[HistoryStore] bulkDelete failed:', sanitizeError(err))
      get().fetchHistory()
      set({ error: 'Failed to delete items.', loading: false })
      throw err
    }
  },

  bulkMove: async (folderId) => {
    const { selectedIds } = get()
    set({ error: null, loading: true })
    try {
      await bulkUpdateHistoryFolder(selectedIds, folderId)
      set((state) => ({
        items: state.items.map(item => 
          selectedIds.includes(item.id) ? { ...item, folderId } : item
        ),
        selectedIds: [],
        loading: false
      }))
      if (get().searchMode === 'local') {
        get().fetchHistory()
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[HistoryStore] bulkMove failed:', sanitizeError(err))
      set({ error: 'Failed to move items.', loading: false })
      throw err
    }
  },

  removeAll: async () => {
    set({ error: null })
    try {
      await deleteAllHistory()
      emit('history:all-deleted')
      set({ items: [], selectedIds: [] })
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[HistoryStore] removeAll failed:', sanitizeError(err))
      set({ error: 'Failed to clear history.' })
      throw err
    }
  },

  removeItem: async (id) => {
    set({ error: null })
    try {
      await deleteHistoryItem(id)
      emit('history:items-deleted', [id])
      set((state) => ({
        items: state.items.filter(item => item.id !== id),
        selectedIds: state.selectedIds.filter(i => i !== id)
      }))
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[HistoryStore] removeItem failed:', sanitizeError(err))
      set({ error: 'Failed to delete item.' })
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
      if (import.meta.env.DEV) console.warn('[HistoryStore] createFolder failed:', sanitizeError(err))
      set({ error: 'Failed to create folder.' })
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
      if (import.meta.env.DEV) console.warn('[HistoryStore] renameFolder failed:', sanitizeError(err))
      set({ error: 'Failed to rename folder.' })
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
      if (import.meta.env.DEV) console.warn('[HistoryStore] removeFolder failed:', sanitizeError(err))
      set({ error: 'Failed to remove folder.' })
      throw err
    }
  }
}))
