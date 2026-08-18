import { create } from 'zustand'
import {
  deleteHistoryItem,
  deleteHistoryItems,
  deleteAllHistory,
  getFolders,
  getHistoryCounts,
  saveFolder,
  deleteFolderAndUnassign,
  bulkUpdateHistoryFolder,
  queryHistoryItems,
  resetDatabase,
  updateFolder,
} from '@/services/storage/indexeddb'
import { emit } from '@/lib/eventBus'
import { sanitizeError } from '@/lib/sanitizeError'
import i18n from '@/i18n'
import type { PromptHistoryRecord } from '@/services/storage/indexeddb'
import type { HistoryFilters, Folder } from '@/features/history/types'
import { MAX_FOLDERS, FolderLimitError } from '@/features/history/types'

interface HistoryState {
  items: PromptHistoryRecord[]
  folders: Folder[]
  folderCounts: Record<string, number>
  totalPromptCount: number
  selectedIds: string[]
  currentFolderId: string | null
  searchAllFolders: boolean
  filters: HistoryFilters
  loading: boolean
  error: string | null
  hasMore: boolean
  offset: number
  hasLoaded: boolean

  // Actions
  fetchHistory: () => Promise<void>
  loadMore: () => Promise<void>
  fetchFolders: () => Promise<void>
  setFilter: <K extends keyof HistoryFilters>(key: K, value: HistoryFilters[K]) => void
  resetFilters: () => void
  setCurrentFolder: (id: string | null) => void
  setSearchAllFolders: (value: boolean) => void
  
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
  createFolder: (name: string, parentId?: string | null) => Promise<string>
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

const SEARCH_DEBOUNCE_MS = 300

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

function scheduleSearchFetch(): void {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    searchDebounceTimer = null
    useHistoryStore.getState().fetchHistory()
  }, SEARCH_DEBOUNCE_MS)
}

async function refreshHistoryCounts(): Promise<void> {
  try {
    const { total, byFolder } = await getHistoryCounts()
    useHistoryStore.setState({ totalPromptCount: total, folderCounts: byFolder })
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[HistoryStore] refreshHistoryCounts failed:', sanitizeError(err))
  }
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  items: [],
  folders: [],
  folderCounts: {},
  totalPromptCount: 0,
  selectedIds: [],
  currentFolderId: null,
  searchAllFolders: false,
  filters: defaultFilters,
  loading: false,
  error: null,
  hasMore: false,
  offset: 0,
  hasLoaded: false,

  fetchHistory: async () => {
    set({ loading: true, error: null, offset: 0 })
    try {
      const { currentFolderId, searchAllFolders, filters } = get()
      const { items, hasMore } = await queryHistoryItems({
        folderId: searchAllFolders ? null : currentFolderId,
        minRating: filters.minRating,
        search: filters.search,
        offset: 0,
        limit: 20
      })
      set({ items, hasMore, offset: items.length, loading: false, hasLoaded: true })
    } catch (err) {
      if (_isSchemaError(err)) {
        console.warn('[HistoryStore] fetchHistory failed with schema error, resetting DB...', err)
        try {
          await resetDatabase()
          const { currentFolderId, searchAllFolders, filters } = get()
          const { items, hasMore } = await queryHistoryItems({
            folderId: searchAllFolders ? null : currentFolderId,
            minRating: filters.minRating,
            search: filters.search,
            offset: 0,
            limit: 20
          })
          set({ items, hasMore, offset: items.length, loading: false, hasLoaded: true })
          return
        } catch (retryErr) {
          console.error('[HistoryStore] fetchHistory failed after DB reset:', retryErr)
          if (import.meta.env.DEV) console.warn('[HistoryStore] fetchHistory DB reset failed:', sanitizeError(retryErr))
          set({ error: i18n.t('errors.history.loadFailedAfterReset'), loading: false })
          return
        }
      }
      if (import.meta.env.DEV) console.warn('[HistoryStore] fetchHistory failed:', sanitizeError(err))
      set({ error: i18n.t('errors.history.loadFailed'), loading: false })
    }
  },

  loadMore: async () => {
    if (get().loading || !get().hasMore) return
    set({ loading: true, error: null })
    try {
      const { currentFolderId, searchAllFolders, filters, offset, items: existingItems } = get()
      const { items: newItems, hasMore } = await queryHistoryItems({
        folderId: searchAllFolders ? null : currentFolderId,
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
      set({ error: i18n.t('errors.history.loadMoreFailed'), loading: false })
    }
  },

  fetchFolders: async () => {
    set({ error: null })
    try {
      const [folders, counts] = await Promise.all([getFolders(), getHistoryCounts()])
      set({ folders, folderCounts: counts.byFolder, totalPromptCount: counts.total })
    } catch (err) {
      if (_isSchemaError(err)) {
        console.warn('[HistoryStore] fetchFolders failed with schema error, resetting DB...', err)
        try {
          await resetDatabase()
          const [folders, counts] = await Promise.all([getFolders(), getHistoryCounts()])
          set({ folders, folderCounts: counts.byFolder, totalPromptCount: counts.total })
          return
        } catch (retryErr) {
          if (import.meta.env.DEV) console.warn('[HistoryStore] fetchFolders DB reset failed:', sanitizeError(retryErr))
          set({ error: i18n.t('errors.history.loadFoldersFailedAfterReset') })
          return
        }
      }
      if (import.meta.env.DEV) console.warn('[HistoryStore] fetchFolders failed:', sanitizeError(err))
      set({ error: i18n.t('errors.history.loadFoldersFailed') })
    }
  },

  setFilter: (key, value) => {
    set((state) => ({ filters: { ...state.filters, [key]: value } }))
    if (key === 'search') {
      scheduleSearchFetch()
    } else {
      get().fetchHistory()
    }
  },

  resetFilters: () => {
    set({ filters: defaultFilters })
    get().fetchHistory()
  },

  setCurrentFolder: (id) => {
    set({ currentFolderId: id, selectedIds: [], searchAllFolders: false })
    get().fetchHistory()
  },

  setSearchAllFolders: (value) => {
    set({ searchAllFolders: value })
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
      await deleteHistoryItems(selectedIds)
      emit('history:items-deleted', selectedIds)
      get().fetchHistory()
      set({ selectedIds: [], loading: false })
      void refreshHistoryCounts()
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[HistoryStore] bulkDelete failed:', sanitizeError(err))
      get().fetchHistory()
      set({ error: i18n.t('errors.history.deleteItemsFailed'), loading: false })
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
      const { currentFolderId, searchAllFolders } = get()
      if (currentFolderId !== null && !searchAllFolders) {
        get().fetchHistory()
      }
      void refreshHistoryCounts()
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[HistoryStore] bulkMove failed:', sanitizeError(err))
      set({ error: i18n.t('errors.history.moveItemsFailed'), loading: false })
      throw err
    }
  },

  removeAll: async () => {
    set({ error: null })
    try {
      await deleteAllHistory()
      emit('history:all-deleted')
      set({ items: [], selectedIds: [], totalPromptCount: 0, folderCounts: {} })
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[HistoryStore] removeAll failed:', sanitizeError(err))
      set({ error: i18n.t('errors.history.clearFailed') })
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
      void refreshHistoryCounts()
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[HistoryStore] removeItem failed:', sanitizeError(err))
      set({ error: i18n.t('errors.history.deleteItemFailed') })
      throw err
    }
  },

  createFolder: async (name, parentId = null) => {
    if (get().folders.length >= MAX_FOLDERS) {
      throw new FolderLimitError(`Folder limit of ${MAX_FOLDERS} reached`)
    }
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
      return newFolder.id
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[HistoryStore] createFolder failed:', sanitizeError(err))
      set({ error: i18n.t('errors.history.createFolderFailed') })
      throw err
    }
  },

  renameFolder: async (id, name) => {
    set({ error: null })
    try {
      await updateFolder(id, { name })
      set((state) => ({
        folders: state.folders.map(f => f.id === id ? { ...f, name } : f)
      }))
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[HistoryStore] renameFolder failed:', sanitizeError(err))
      set({ error: i18n.t('errors.history.renameFolderFailed') })
      throw err
    }
  },

  removeFolder: async (id) => {
    set({ error: null })
    try {
      await deleteFolderAndUnassign(id)
      set((state) => {
        const folderCounts = { ...state.folderCounts }
        delete folderCounts[id]
        return {
          folders: state.folders.filter(f => f.id !== id),
          currentFolderId: state.currentFolderId === id ? null : state.currentFolderId,
          searchAllFolders: state.currentFolderId === id ? false : state.searchAllFolders,
          folderCounts,
          items: state.items.map(item =>
            item.folderId === id ? { ...item, folderId: null } : item
          )
        }
      })
      void refreshHistoryCounts()
      if (get().currentFolderId === null) {
        get().fetchHistory()
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[HistoryStore] removeFolder failed:', sanitizeError(err))
      set({ error: i18n.t('errors.history.removeFolderFailed') })
      throw err
    }
  }
}))
