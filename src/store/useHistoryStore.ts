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
  updateFolder,
} from '@/services/storage/indexeddb'
import { emit } from '@/lib/eventBus'
import { sanitizeError } from '@/lib/sanitizeError'
import i18n from '@/i18n'
import type { HistoryCursor, PromptHistoryRecord } from '@/services/storage/indexeddb'
import type { HistoryFilters, Folder } from '@/features/history/types'
import { MAX_FOLDERS, FolderLimitError } from '@/features/history/types'

const PAGE_SIZE = 20

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
  /** Opaque cursor for the next page; reset whenever filters/folder/search change. */
  cursor: HistoryCursor | null
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

const defaultFilters: HistoryFilters = {
  aspectRatio: 'all',
  artStyleKey: 'all',
  minScore: 0,
  dateFrom: '',
  dateTo: '',
  search: '',
  sort: 'date-desc',
}

const SEARCH_DEBOUNCE_MS = 300

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
let activeHistoryController: AbortController | null = null

/**
 * Monotonic request sequence. Every fetchHistory/loadMore call claims the next
 * ID; responses are applied only if their claim is still current. This discards
 * stale results from superseded requests (rapid folder/filter/search changes,
 * or a loadMore that was in flight when the user changed the current view).
 */
let fetchSeq = 0

function scheduleSearchFetch(): void {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    searchDebounceTimer = null
    useHistoryStore.getState().fetchHistory()
  }, SEARCH_DEBOUNCE_MS)
}

function cancelScheduledSearch(): void {
  if (!searchDebounceTimer) return
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = null
}

function startHistoryRequest(): AbortController {
  activeHistoryController?.abort()
  const controller = new AbortController()
  activeHistoryController = controller
  return controller
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

async function refreshHistoryCounts(): Promise<void> {
  try {
    const { total, byFolder } = await getHistoryCounts()
    useHistoryStore.setState({ totalPromptCount: total, folderCounts: byFolder })
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[HistoryStore] refreshHistoryCounts failed:', sanitizeError(err))
  }
}

function mergeItems(existing: PromptHistoryRecord[], incoming: PromptHistoryRecord[]): PromptHistoryRecord[] {
  const seen = new Set(existing.map((item) => item.id))
  return [...existing, ...incoming.filter((item) => !seen.has(item.id))]
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
  cursor: null,
  hasLoaded: false,

  fetchHistory: async () => {
    const seq = ++fetchSeq
    const controller = startHistoryRequest()
    set({ loading: true, error: null, cursor: null })
    try {
      const { currentFolderId, searchAllFolders, filters } = get()
      const { items, nextCursor, hasMore } = await queryHistoryItems({
        folderId: searchAllFolders ? null : currentFolderId,
        aspectRatio: filters.aspectRatio,
        artStyleKey: filters.artStyleKey,
        minScore: filters.minScore,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        search: filters.search,
        sort: filters.sort,
        limit: PAGE_SIZE,
        cursor: null,
        signal: controller.signal,
      })
      if (seq !== fetchSeq) return // superseded by a newer fetch — discard
      if (activeHistoryController === controller) activeHistoryController = null
      set({ items, cursor: nextCursor, hasMore, loading: false, hasLoaded: true })
    } catch (err) {
      if (seq !== fetchSeq) return
      if (activeHistoryController === controller) activeHistoryController = null
      if (isAbortError(err)) {
        set({ loading: false })
        return
      }
      // NOTE: since the v10 migration, schema/version/migration failures surface
      // from the storage layer as typed errors and are NEVER auto-reset here.
      // The DB is only reset via explicit user confirmation.
      if (import.meta.env.DEV) console.warn('[HistoryStore] fetchHistory failed:', sanitizeError(err))
      set({ error: i18n.t('errors.history.loadFailed'), loading: false })
    }
  },

  loadMore: async () => {
    if (get().loading || !get().hasMore) return
    const seq = ++fetchSeq
    const controller = startHistoryRequest()
    set({ loading: true, error: null })
    try {
      const { currentFolderId, searchAllFolders, filters, cursor, items: existingItems } = get()
      const { items: newItems, nextCursor, hasMore } = await queryHistoryItems({
        folderId: searchAllFolders ? null : currentFolderId,
        aspectRatio: filters.aspectRatio,
        artStyleKey: filters.artStyleKey,
        minScore: filters.minScore,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        search: filters.search,
        sort: filters.sort,
        limit: PAGE_SIZE,
        cursor,
        signal: controller.signal,
      })
      if (seq !== fetchSeq) return // superseded (view/filter changed) — discard, do not merge
      if (activeHistoryController === controller) activeHistoryController = null
      set({
        items: mergeItems(existingItems, newItems),
        cursor: nextCursor,
        hasMore,
        loading: false,
      })
    } catch (err) {
      if (seq !== fetchSeq) return
      if (activeHistoryController === controller) activeHistoryController = null
      if (isAbortError(err)) {
        set({ loading: false })
        return
      }
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
      // See note in fetchHistory — no automatic DB reset for schema/version errors.
      if (import.meta.env.DEV) console.warn('[HistoryStore] fetchFolders failed:', sanitizeError(err))
      set({ error: i18n.t('errors.history.loadFoldersFailed') })
    }
  },

  setFilter: (key, value) => {
    set((state) => ({ filters: { ...state.filters, [key]: value } }))
    if (key === 'search') {
      scheduleSearchFetch()
    } else {
      cancelScheduledSearch()
      get().fetchHistory()
    }
  },

  resetFilters: () => {
    cancelScheduledSearch()
    set({ filters: defaultFilters })
    get().fetchHistory()
  },

  setCurrentFolder: (id) => {
    cancelScheduledSearch()
    set({ currentFolderId: id, selectedIds: [], searchAllFolders: false })
    get().fetchHistory()
  },

  setSearchAllFolders: (value) => {
    cancelScheduledSearch()
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
      set({ items: [], selectedIds: [], totalPromptCount: 0, folderCounts: {}, cursor: null, hasMore: false })
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
