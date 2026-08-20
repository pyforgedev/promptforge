import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils'
import { useHistoryStore } from '@/store/useHistoryStore'
import { ALL_FOLDERS_VALUE, FolderSwitcher } from './FolderSwitcher'
import enTranslation from '../../../../public/locales/en/translation.json'
import { MAX_FOLDERS, FolderLimitError } from '@/features/history/types'

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
    ...overrides,
  })
}

describe('FolderSwitcher', () => {
  beforeEach(() => {
    showToast.mockReset()
    setHistoryState()
  })

  it('shows All Prompts and every folder with their count badges', async () => {
    const user = userEvent.setup()
    setHistoryState({
      folders,
      folderCounts: { 'folder-travel': 3, 'folder-food': 0 },
      totalPromptCount: 8,
    })

    renderWithProviders(<FolderSwitcher />)
    await user.click(screen.getByRole('button', { name: /All Prompts/ }))

    const listbox = screen.getByRole('listbox')
    const allOption = within(listbox).getByText('All Prompts').closest('[cmdk-item]')
    const travelOption = within(listbox).getByText('Travel').closest('[cmdk-item]')
    const foodOption = within(listbox).getByText('Food').closest('[cmdk-item]')

    expect(allOption).toHaveTextContent('8')
    expect(travelOption).toHaveTextContent('3')
    expect(foodOption).toHaveTextContent('0')
  })

  it('selects a folder and maps All Prompts to a null folder id', async () => {
    const user = userEvent.setup()
    const setCurrentFolder = vi.fn()
    setHistoryState({ folders, currentFolderId: 'folder-food', setCurrentFolder })

    renderWithProviders(<FolderSwitcher />)

    await user.click(screen.getByRole('button', { name: /Food/ }))
    await user.click(within(screen.getByRole('listbox')).getByText('Travel'))
    expect(setCurrentFolder).toHaveBeenLastCalledWith('folder-travel')

    await user.click(screen.getByRole('button', { name: /Food/ }))
    await user.click(within(screen.getByRole('listbox')).getByText('All Prompts'))
    expect(setCurrentFolder).toHaveBeenLastCalledWith(null)
    expect(ALL_FOLDERS_VALUE).toBe('__all__')
  })

  it('creates a new folder from the footer and selects it', async () => {
    const user = userEvent.setup()
    const createFolder = vi.fn().mockResolvedValue('folder-new')
    const setCurrentFolder = vi.fn()
    setHistoryState({ folders, createFolder, setCurrentFolder })

    renderWithProviders(<FolderSwitcher />)
    await user.click(screen.getByRole('button', { name: /All Prompts/ }))
    await user.click(screen.getByRole('button', { name: 'New Folder' }))

    await waitFor(() => {
      expect(createFolder).toHaveBeenCalledWith('New Folder')
      expect(setCurrentFolder).toHaveBeenCalledWith('folder-new')
    })
    expect(showToast).toHaveBeenCalledWith('success', 'Folder created')
  })

  it('shows a warning toast when the folder limit is reached', async () => {
    const user = userEvent.setup()
    const createFolder = vi.fn().mockRejectedValue(new FolderLimitError('limit reached'))
    setHistoryState({ folders, createFolder })

    renderWithProviders(<FolderSwitcher />)
    await user.click(screen.getByRole('button', { name: /All Prompts/ }))
    await user.click(screen.getByRole('button', { name: 'New Folder' }))

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        'warning',
        enTranslation.toast.folderLimitReached.replace('{{max}}', String(MAX_FOLDERS))
      )
    })
  })
})
