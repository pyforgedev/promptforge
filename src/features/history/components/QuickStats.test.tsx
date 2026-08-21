import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, waitFor } from '@/test/utils'
import { QuickStats } from './QuickStats'
import db, { SENTINEL_UNFILED } from '@/services/storage/indexeddb'

vi.mock('@/components/animations/CountUp', () => ({
  default: ({ to, className }: { to: number; className?: string }) => (
    <span className={className}>{to}</span>
  ),
}))

describe('QuickStats Component', () => {
  it('renders default/empty statistics correctly', async () => {
    renderWithProviders(<QuickStats />)
    
    // We should wait for dexie query to complete
    await waitFor(() => {
      expect(screen.getAllByText('0')).toHaveLength(2)
    })
  })

  it('displays accurate stats based on prompt history', async () => {
    // Add dummy history records
    await db.prompt_history.bulkAdd([
      {
        id: 'h1',
        variantIndex: 1,
        batchId: 'b1',
        segments: { subject: 'tree', composition: '', lighting: '', mood: '', style: '', technical: '', colorPalette: '', environment: '' },
        negativePrompt: '',
        commercialKeywords: ['nature', 'tree'],
        adobeScore: { total: 80, breakdown: { commercialViability: 20, technicalQuality: 20, compositionStrength: 20, marketDiversity: 20 }, warnings: [], suggestions: [] },
        variationAnchors: { primaryVariation: '', compositionStyle: '', lightingType: '', directionHint: '' },
        createdAt: Date.now(),
        isFavorite: false,
        folderId: null,
        folderKey: SENTINEL_UNFILED,
        categoryKey: 'landscape',
        nicheNormalized: 'nature',
        searchTerms: ['nature', 'tree'],
        aspectRatioKey: 'random',
        artStyleKey: 'none',
      },
      {
        id: 'h2',
        variantIndex: 1,
        batchId: 'b1',
        segments: { subject: 'ocean', composition: '', lighting: '', mood: '', style: '', technical: '', colorPalette: '', environment: '' },
        negativePrompt: '',
        commercialKeywords: ['nature', 'water'],
        adobeScore: { total: 90, breakdown: { commercialViability: 20, technicalQuality: 20, compositionStrength: 25, marketDiversity: 25 }, warnings: [], suggestions: [] },
        variationAnchors: { primaryVariation: '', compositionStyle: '', lightingType: '', directionHint: '' },
        createdAt: Date.now(),
        isFavorite: false,
        folderId: null,
        folderKey: SENTINEL_UNFILED,
        categoryKey: 'landscape',
        nicheNormalized: 'nature',
        searchTerms: ['nature', 'water'],
        aspectRatioKey: 'random',
        artStyleKey: 'none',
      }
    ])

    renderWithProviders(<QuickStats />)

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('85')).toBeInTheDocument()
    })
  })
})
