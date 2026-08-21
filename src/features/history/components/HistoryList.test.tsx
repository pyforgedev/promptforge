import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils'
import { useHistoryStore } from '@/store/useHistoryStore'
import type { PromptHistoryRecord } from '@/services/storage/indexeddb'
import { HistoryList } from './HistoryList'

const integrationMocks = vi.hoisted(() => ({
  getHistoryTemplateSource: vi.fn(),
}))

vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ showToast: vi.fn() }) }))
vi.mock('@/services/storage/indexeddb', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/storage/indexeddb')>()
  return { ...actual, getHistoryTemplateSource: integrationMocks.getHistoryTemplateSource }
})
vi.mock('@/features/templates/components/SaveTemplateDialog', () => ({
  SaveTemplateDialog: ({ input, open }: { input: unknown; open: boolean }) =>
    open ? <div data-testid="save-template-dialog">{JSON.stringify(input)}</div> : null,
}))

const defaults = {
  aspectRatio: 'all' as const, artStyleKey: 'all' as const, minScore: 0,
  dateFrom: '', dateTo: '', search: '', sort: 'date-desc' as const,
}

function item(overrides: Partial<PromptHistoryRecord> = {}): PromptHistoryRecord {
  return {
    id: 'history-1', batchId: 'batch-1', variantIndex: 1,
    segments: { subject: '', composition: '', lighting: '', mood: '', style: '', technical: '', colorPalette: '', environment: '' },
    negativePrompt: '', platformVariants: { dalle3: '', nano_banana: '' },
    fullPrompt: 'safe prompt', commercialKeywords: [],
    adobeScore: { total: 80, breakdown: { commercialViability: 20, technicalQuality: 20, compositionStrength: 20, marketDiversity: 20 }, warnings: [], suggestions: [] },
    variationAnchors: { primaryVariation: '', compositionStyle: '', lightingType: '', directionHint: '' },
    createdAt: new Date(0), isFavorite: false, folderId: null, niche: 'Nature', category: 'travel',
    aspectRatioKey: null, artStyleKey: null,
    ...overrides,
  }
}

function renderList(items: PromptHistoryRecord[] = []) {
  return renderWithProviders(<HistoryList items={items} loading={false} error={null} onCopy={vi.fn()} onDelete={vi.fn()} />)
}

describe('HistoryList v11 states', () => {
  beforeEach(() => {
    integrationMocks.getHistoryTemplateSource.mockReset()
    useHistoryStore.setState({
      selectedIds: [], currentFolderId: null, searchAllFolders: false, filters: defaults,
      hasMore: false, hasLoaded: true, loading: false,
      toggleSelect: vi.fn(), resetFilters: vi.fn(), loadMore: vi.fn(),
    })
  })

  it('offers reset for a filtered empty result', async () => {
    const user = userEvent.setup()
    const resetFilters = vi.fn()
    useHistoryStore.setState({ filters: { ...defaults, minScore: 80 }, resetFilters })
    renderList()
    expect(screen.getByText('No matching prompts')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(resetFilters).toHaveBeenCalledOnce()
  })

  it('keeps Load More available on an empty filtered page when the scanner has a continuation', async () => {
    const user = userEvent.setup()
    const loadMore = vi.fn()
    useHistoryStore.setState({ filters: { ...defaults, search: 'needle' }, hasMore: true, loadMore })
    renderList()
    await user.click(screen.getByRole('button', { name: 'Load More' }))
    expect(loadMore).toHaveBeenCalledOnce()
  })

  it('renders markup-like prompt content as safe text while highlighting matches', () => {
    useHistoryStore.setState({ filters: { ...defaults, search: 'needle' } })
    const { container } = renderList([item({ fullPrompt: '<img src=x onerror="alert(1)"> needle <script>bad()</script>' })])
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('script')).toBeNull()
    expect(screen.getByText(/<img src=x onerror=/)).toBeInTheDocument()
    expect(screen.getByText('needle', { selector: 'mark' })).toBeInTheDocument()
  })

  it('shows an outside-preview badge when indexed search does not occur in fullPrompt', () => {
    useHistoryStore.setState({ filters: { ...defaults, search: 'keyword' } })
    renderList([item({ fullPrompt: 'visible preview', commercialKeywords: ['keyword'] })])
    expect(screen.getByText('Match outside preview')).toBeInTheDocument()
  })

  it('renders aspect ratio and art style tags above the actions when snapshots exist', () => {
    renderList([item({ aspectRatioKey: '16:9', artStyleKey: 'photorealistic' })])
    expect(screen.getByText('16:9')).toBeInTheDocument()
    expect(screen.getByText('Photorealistic')).toBeInTheDocument()
  })

  it('localizes the random aspect ratio tag', () => {
    renderList([item({ aspectRatioKey: 'random' })])
    expect(screen.getByText('Random')).toBeInTheDocument()
  })

  it('omits tags for unknown or default (none) art style', () => {
    renderList([item({ aspectRatioKey: null, artStyleKey: 'none' })])
    expect(screen.queryByText('Random')).not.toBeInTheDocument()
    expect(screen.queryByText('Photorealistic')).not.toBeInTheDocument()
    expect(screen.queryByText('Minimalist')).not.toBeInTheDocument()
  })

  it('opens Save as Template from hydrated history data without toggling card selection', async () => {
    const user = userEvent.setup()
    const toggleSelect = vi.fn()
    const record = item({ fullPrompt: 'source prompt', niche: 'Travel' })
    integrationMocks.getHistoryTemplateSource.mockResolvedValue({ record })
    useHistoryStore.setState({ toggleSelect })
    renderList([record])

    await user.click(screen.getByRole('button', { name: 'Save as Template' }))

    expect(integrationMocks.getHistoryTemplateSource).toHaveBeenCalledWith(record.id)
    expect(await screen.findByTestId('save-template-dialog')).toHaveTextContent('source prompt')
    expect(toggleSelect).not.toHaveBeenCalled()
  })
})
