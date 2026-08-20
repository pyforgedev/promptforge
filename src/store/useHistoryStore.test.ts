import { describe, it, expect, beforeEach } from 'vitest'
import { useHistoryStore } from '@/store/useHistoryStore'
import { MAX_FOLDERS, FolderLimitError } from '@/features/history/types'

describe('useHistoryStore', () => {
  beforeEach(() => {
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
        stylePreset: 'all',
        minRating: 0,
        dateFrom: '',
        dateTo: '',
        search: '',
      },
      loading: false,
      error: null,
      hasMore: false,
      cursor: null,
    })
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
