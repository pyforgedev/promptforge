import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils'
import { useHistoryStore } from '@/store/useHistoryStore'
import type { HistoryFilters } from '../types'
import { HistoryFiltersBar } from './HistoryFilters'

const defaults: HistoryFilters = {
  aspectRatio: 'all', artStyleKey: 'all', minScore: 0,
  dateFrom: '', dateTo: '', search: '', sort: 'date-desc',
}

function renderFilters(filters: HistoryFilters = defaults) {
  const onFilterChange = vi.fn()
  const onReset = vi.fn()
  renderWithProviders(<HistoryFiltersBar filters={filters} onFilterChange={onFilterChange} onReset={onReset} />)
  return { onFilterChange, onReset }
}

describe('HistoryFiltersBar', () => {
  beforeEach(() => {
    useHistoryStore.setState({ currentFolderId: null, searchAllFolders: false, setSearchAllFolders: vi.fn() })
  })

  it('renders labels for every v11 filter and wires search and dates', async () => {
    const user = userEvent.setup()
    const { onFilterChange } = renderFilters()
    for (const label of ['Search', 'Aspect Ratio', 'Art style', 'Minimum score', 'Sort by', 'From', 'To']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    await user.type(screen.getByLabelText('Search'), 'city')
    expect(onFilterChange).toHaveBeenLastCalledWith('search', 'y')
    await user.type(screen.getByLabelText('From'), '2026-01-02')
    await user.type(screen.getByLabelText('To'), '2026-01-31')
    expect(onFilterChange).toHaveBeenCalledWith('dateFrom', expect.any(String))
    expect(onFilterChange).toHaveBeenCalledWith('dateTo', expect.any(String))
  })

  it('lets users search aspect ratio options and wires selection', async () => {
    const user = userEvent.setup()
    const { onFilterChange } = renderFilters()
    await user.click(screen.getByLabelText('Aspect Ratio'))
    const listbox = screen.getByRole('listbox')
    for (const ratio of ['All', 'Random', '1:1', '4:5', '2:3', '9:16', '3:2', '4:3', '16:9']) {
      expect(within(listbox).getByText(ratio)).toBeInTheDocument()
    }
    await user.type(screen.getByPlaceholderText('Search...'), '16')
    expect(within(listbox).queryByText('1:1')).not.toBeInTheDocument()
    expect(within(listbox).getByText('16:9')).toBeInTheDocument()
    await user.click(within(listbox).getByText('16:9'))
    expect(onFilterChange).toHaveBeenCalledWith('aspectRatio', '16:9')
  })

  it('lets users search art style options without the redundant "AI selected" entry', async () => {
    const user = userEvent.setup()
    const { onFilterChange } = renderFilters()
    await user.click(screen.getByLabelText('Art style'))
    const listbox = screen.getByRole('listbox')
    expect(within(listbox).queryByText('AI selected')).not.toBeInTheDocument()
    await user.type(screen.getByPlaceholderText('Search...'), 'min')
    expect(within(listbox).queryByText('Cinematic photography')).not.toBeInTheDocument()
    expect(within(listbox).getByText('Minimalist')).toBeInTheDocument()
    await user.click(within(listbox).getByText('Minimalist'))
    expect(onFilterChange).toHaveBeenCalledWith('artStyleKey', 'minimalist')
  })

  it('offers score thresholds 50–90 rather than single-digit values and wires selection', async () => {
    const user = userEvent.setup()
    const { onFilterChange } = renderFilters()
    await user.click(screen.getByLabelText('Minimum score'))
    const listbox = screen.getByRole('listbox')
    for (const score of ['50+', '60+', '70+', '80+', '90+']) expect(within(listbox).getByText(score)).toBeInTheDocument()
    expect(within(listbox).queryByText('5+')).not.toBeInTheDocument()
    expect(within(listbox).queryByText('9+')).not.toBeInTheDocument()
    await user.click(within(listbox).getByText('80+'))
    expect(onFilterChange).toHaveBeenCalledWith('minScore', 80)
  })

  it('wires sort selection', async () => {
    const user = userEvent.setup()
    const { onFilterChange } = renderFilters()
    await user.click(screen.getByLabelText('Sort by'))
    await user.click(within(screen.getByRole('listbox')).getByText('Highest score'))
    expect(onFilterChange).toHaveBeenCalledWith('sort', 'rating-desc')
  })

  it('announces an inverted date range and associates the hint with both inputs', () => {
    renderFilters({ ...defaults, dateFrom: '2026-02-02', dateTo: '2026-02-01' })
    const hint = screen.getByRole('alert')
    expect(hint).toHaveTextContent('The start date must be before or equal to the end date.')
    for (const input of [screen.getByLabelText('From'), screen.getByLabelText('To')]) {
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAttribute('aria-describedby', hint.id)
    }
  })

  it('shows the two-character search hint and invokes reset', async () => {
    const user = userEvent.setup()
    const { onReset } = renderFilters({ ...defaults, search: 'x' })
    expect(screen.getByText('Enter at least two characters to search.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(onReset).toHaveBeenCalledOnce()
  })
})