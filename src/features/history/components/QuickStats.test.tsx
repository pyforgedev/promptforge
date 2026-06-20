import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen, waitFor } from '@/test/utils'
import { QuickStats } from './QuickStats'
import db from '@/services/storage/indexeddb'

describe('QuickStats Component', () => {
  it('renders default/empty statistics correctly', async () => {
    renderWithProviders(<QuickStats />)
    
    // We should wait for dexie query to complete
    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument()
      expect(screen.getByText('0.0')).toBeInTheDocument()
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
        platformVariants: { dalle3: 'beautiful green tree', nano_banana: 'beautiful green tree' },
        fullPrompt: 'beautiful green tree',
        commercialKeywords: ['nature', 'tree'],
        adobeScore: { total: 80, breakdown: { commercialViability: 20, technicalQuality: 20, compositionStrength: 20, marketDiversity: 20 }, warnings: [], suggestions: [] },
        variationAnchors: { primaryVariation: '', compositionStyle: '', lightingType: '', directionHint: '' },
        createdAt: new Date(),
        isFavorite: false,
        niche: 'Nature',
        category: 'landscape',
        folderId: null
      },
      {
        id: 'h2',
        variantIndex: 1,
        batchId: 'b1',
        segments: { subject: 'ocean', composition: '', lighting: '', mood: '', style: '', technical: '', colorPalette: '', environment: '' },
        negativePrompt: '',
        platformVariants: { dalle3: 'beautiful ocean view', nano_banana: 'beautiful ocean view' },
        fullPrompt: 'beautiful ocean view',
        commercialKeywords: ['nature', 'water'],
        adobeScore: { total: 90, breakdown: { commercialViability: 20, technicalQuality: 20, compositionStrength: 25, marketDiversity: 25 }, warnings: [], suggestions: [] },
        variationAnchors: { primaryVariation: '', compositionStyle: '', lightingType: '', directionHint: '' },
        createdAt: new Date(),
        isFavorite: false,
        niche: 'Nature',
        category: 'landscape',
        folderId: null
      }
    ])

    renderWithProviders(<QuickStats />)

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('85.0')).toBeInTheDocument()
    })
  })
})
