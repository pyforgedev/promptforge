import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useHistoryStore } from '@/store/useHistoryStore'
import { MAX_FOLDERS, FolderLimitError } from '@/features/history/types'
import * as indexeddb from '@/services/storage/indexeddb'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => { resolve = res })
  return { promise, resolve }
}

describe('useHistoryStore', () => {
  let queryHistoryItems: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.restoreAllMocks()
    queryHistoryItems = vi.spyOn(indexeddb, 'queryHistoryItems').mockResolvedValue({ items: [], nextCursor: null, hasMore: false })
    useHistoryStore.setState({
      items: [],
      folders: [],
      folderCounts: {},
      totalPromptCount: 0,
      selectedIds: [],
      currentFolderId: null,
      searchAllFolders: false,
      filters: {
        aspectRatio: 'all',
        artStyleKey: 'all',
        minScore: 0,
        dateFrom: '',
        dateTo: '',
        search: '',
        sort: 'date-desc',
      },
      loading: false,
      error: null,
      hasMore: false,
      cursor: null,
    })
  })

  it('forwards every filter and sort field to the query service', async () => {
    useHistoryStore.setState({
      currentFolderId: 'folder-7',
      filters: {
        aspectRatio: '16:9', artStyleKey: 'minimalist', minScore: 80,
        dateFrom: '2026-01-02', dateTo: '2026-01-31', search: 'city', sort: 'rating-desc',
      },
    })

    await useHistoryStore.getState().fetchHistory()

    expect(queryHistoryItems).toHaveBeenCalledWith(expect.objectContaining({
      folderId: 'folder-7', aspectRatio: '16:9', artStyleKey: 'minimalist', minScore: 80,
      dateFrom: '2026-01-02', dateTo: '2026-01-31', search: 'city', sort: 'rating-desc',
      limit: 20, cursor: null, signal: expect.any(AbortSignal),
    }))
  })

  it('aborts the previous request and never applies its stale result', async () => {
    const first = deferred<{ items: Array<{ id: string }>; nextCursor: null; hasMore: boolean }>()
    const second = deferred<{ items: Array<{ id: string }>; nextCursor: null; hasMore: boolean }>()
    const signals: AbortSignal[] = []
    queryHistoryItems
      .mockImplementationOnce((params: Parameters<typeof indexeddb.queryHistoryItems>[0]) => {
        signals.push(params.signal!)
        return first.promise
      })
      .mockImplementationOnce((params: Parameters<typeof indexeddb.queryHistoryItems>[0]) => {
        signals.push(params.signal!)
        return second.promise
      })

    const firstFetch = useHistoryStore.getState().fetchHistory()
    const secondFetch = useHistoryStore.getState().fetchHistory()
    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)

    second.resolve({ items: [{ id: 'fresh' }], nextCursor: null, hasMore: false })
    await secondFetch
    first.resolve({ items: [{ id: 'stale' }], nextCursor: null, hasMore: false })
    await firstFetch
    expect(useHistoryStore.getState().items.map((item) => item.id)).toEqual(['fresh'])
  })

  it('resetFilters restores the complete v11 defaults and starts a fresh fetch', async () => {
    useHistoryStore.setState({ filters: {
      aspectRatio: '4:5', artStyleKey: 'fine_art', minScore: 90,
      dateFrom: '2025-01-01', dateTo: '2025-02-01', search: 'x', sort: 'date-asc',
    } })
    useHistoryStore.getState().resetFilters()
    expect(useHistoryStore.getState().filters).toEqual({
      aspectRatio: 'all', artStyleKey: 'all', minScore: 0,
      dateFrom: '', dateTo: '', search: '', sort: 'date-desc',
    })
    expect(queryHistoryItems).toHaveBeenCalledTimes(1)
  })

  it('selects and deselects items correctly', () => {
    useHistoryStore.getState().toggleSelect('item-1')
    expect(useHistoryStore.getState().selectedIds).toContain('item-1')

    useHistoryStore.getState().toggleSelect('item-1')
    expect(useHistoryStore.getState().selectedIds).not.toContain('item-1')
  })

  it('sets search-all-folders scope correctly', () => {
    useHistoryStore.getState().setSearchAllFolders(true)
    expect(useHistoryStore.getState().searchAllFolders).toBe(true)

    useHistoryStore.getState().setSearchAllFolders(false)
    expect(useHistoryStore.getState().searchAllFolders).toBe(false)
  })

  it('resets search-all-folders scope when switching folders', () => {
    useHistoryStore.getState().setSearchAllFolders(true)
    expect(useHistoryStore.getState().searchAllFolders).toBe(true)

    useHistoryStore.getState().setCurrentFolder('folder-1')
    expect(useHistoryStore.getState().searchAllFolders).toBe(false)
    expect(useHistoryStore.getState().currentFolderId).toBe('folder-1')
  })

  it('rejects folder creation when the folder limit is reached', async () => {
    const manyFolders = Array.from({ length: MAX_FOLDERS }, (_, i) => ({
      id: `folder-${i}`,
      name: `Folder ${i}`,
      parentId: null,
      createdAt: i,
    }))
    useHistoryStore.setState({ folders: manyFolders })

    await expect(useHistoryStore.getState().createFolder('One Too Many')).rejects.toBeInstanceOf(FolderLimitError)
    expect(useHistoryStore.getState().folders).toHaveLength(MAX_FOLDERS)
  })
})
