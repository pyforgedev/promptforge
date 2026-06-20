import { describe, it, expect, beforeEach } from 'vitest'
import { useHistoryStore } from '@/store/useHistoryStore'

describe('useHistoryStore', () => {
  beforeEach(() => {
    useHistoryStore.setState({
      items: [],
      folders: [],
      selectedIds: [],
      currentFolderId: null,
      searchMode: 'local',
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
      offset: 0,
    })
  })

  it('selects and deselects items correctly', () => {
    useHistoryStore.getState().toggleSelect('item-1')
    expect(useHistoryStore.getState().selectedIds).toContain('item-1')

    useHistoryStore.getState().toggleSelect('item-1')
    expect(useHistoryStore.getState().selectedIds).not.toContain('item-1')
  })

  it('sets filters and search mode correctly', () => {
    useHistoryStore.getState().setSearchMode('global')
    expect(useHistoryStore.getState().searchMode).toBe('global')
  })
})
