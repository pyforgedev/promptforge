import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils'
import { useHistoryStore } from '@/store/useHistoryStore'
import { FolderChips } from './FolderChips'

const { showToast } = vi.hoisted(() => ({ showToast: vi.fn() }))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ showToast }),
}))

const folders = [
  { id: 'folder-travel', name: 'Travel', parentId: null, createdAt: 1 },
  { id: 'folder-food', name: 'Food', parentId: null, createdAt: 2 },
]

function setHistoryState(overrides: Partial<ReturnType<typeof useHistoryStore.getState>> = {}) {
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
    ...overrides,
  })
}

describe('FolderChips', () => {
  beforeEach(() => {
    showToast.mockReset()
    setHistoryState()
  })

  it('renders nothing when there are no folders', () => {
    const { container } = renderWithProviders(<FolderChips />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders counts and changes the current folder when chips are clicked', async () => {
    const user = userEvent.setup()
    const setCurrentFolder = vi.fn()
    setHistoryState({
      folders,
      folderCounts: { 'folder-travel': 2 },
      totalPromptCount: 7,
      currentFolderId: 'folder-travel',
      setCurrentFolder,
    })

    renderWithProviders(<FolderChips />)

    const allChip = screen.getByRole('button', { name: /All Prompts\s*7/ })
    const travelChip = screen.getByRole('button', { name: /Travel\s*2/ })
    const foodChip = screen.getByRole('button', { name: /Food\s*0/ })
    expect(allChip).toHaveAttribute('aria-pressed', 'false')
    expect(travelChip).toHaveAttribute('aria-pressed', 'true')

    await user.click(foodChip)
    await user.click(allChip)

    expect(setCurrentFolder).toHaveBeenNthCalledWith(1, 'folder-food')
    expect(setCurrentFolder).toHaveBeenNthCalledWith(2, null)
  })

  it('submits a renamed folder from the rename dialog', async () => {
    const user = userEvent.setup()
    const renameFolder = vi.fn().mockResolvedValue(undefined)
    setHistoryState({ folders: [folders[0]], renameFolder })

    renderWithProviders(<FolderChips />)
    await user.click(screen.getByRole('button', { name: 'Options' }))
    await user.click(screen.getByRole('menuitem', { name: 'Rename' }))

    const dialog = screen.getByRole('dialog', { name: 'Rename Folder' })
    const input = within(dialog).getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'Destinations')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(renameFolder).toHaveBeenCalledWith('folder-travel', 'Destinations')
    })
    expect(showToast).toHaveBeenCalledWith('success', 'Folder renamed')
  })

  it('removes the folder after delete confirmation', async () => {
    const user = userEvent.setup()
    const removeFolder = vi.fn().mockResolvedValue(undefined)
    setHistoryState({ folders: [folders[0]], removeFolder })

    renderWithProviders(<FolderChips />)
    await user.click(screen.getByRole('button', { name: 'Options' }))
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }))

    const alert = screen.getByRole('alertdialog', { name: 'Delete Folder' })
    expect(within(alert).getByText(/Are you sure you want to delete this folder/)).toBeInTheDocument()
    await user.click(within(alert).getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(removeFolder).toHaveBeenCalledWith('folder-travel')
    })
    expect(showToast).toHaveBeenCalledWith('success', 'Folder deleted')
  })
})
