import { describe, it, expect, beforeEach } from 'vitest'
import { usePromptGeneratorStore } from '@/features/prompt-generator/store/promptGeneratorStore'

describe('usePromptGeneratorStore', () => {
  beforeEach(() => {
    usePromptGeneratorStore.setState({
      input: {
        niche: '',
        category: 'commercial',
        batchSize: 1,
        usageContext: 'commercial',
        targetMarket: 'global',
        targetPlatform: 'midjourney',
        includeDiversity: true,
        allowTextSpace: false
      },
      batch: null,
      isGenerating: false,
      error: null,
      advancedOptionsOpen: false,
      _hasHydrated: true,
    })
  })

  it('updates generator input values', () => {
    usePromptGeneratorStore.getState().setInput({ niche: 'Space Landscape' })
    expect(usePromptGeneratorStore.getState().input.niche).toBe('Space Landscape')
  })

  it('toggles favorite status of prompt in batch', () => {
    const mockBatch = {
      batchId: 'b1',
      generatorInput: {
        niche: 'Space',
        category: 'fantasy',
        batchSize: 1,
        usageContext: 'commercial' as const,
        targetMarket: 'global' as const,
        targetPlatform: 'midjourney' as const,
        includeDiversity: true,
        allowTextSpace: false
      },
      generatedAt: new Date(),
      prompts: [
        {
          id: 'p1',
          variantIndex: 1,
          batchId: 'b1',
          segments: { subject: 'galaxy', composition: '', lighting: '', mood: '', style: '', technical: '', colorPalette: '', environment: '' },
          negativePrompt: '',
          platformVariants: { midjourney: 'galaxy far away' },
          fullPrompt: 'galaxy far away',
          commercialKeywords: [],
          adobeScore: { total: 90, breakdown: { commercialViability: 20, technicalQuality: 20, compositionStrength: 25, marketDiversity: 25 }, warnings: [], suggestions: [] },
          variationAnchors: { primaryVariation: '', compositionStyle: '', lightingType: '', directionHint: '' },
          createdAt: new Date(),
          isFavorite: false
        }
      ]
    }

    usePromptGeneratorStore.setState({ batch: mockBatch })
    usePromptGeneratorStore.getState().toggleFavoriteInBatch('p1')

    expect(usePromptGeneratorStore.getState().batch?.prompts[0].isFavorite).toBe(true)
  })
})
