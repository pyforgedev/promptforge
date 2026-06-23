import { describe, it, expect, beforeEach } from 'vitest'
import { usePromptGeneratorStore } from '@/features/prompt-generator/store/promptGeneratorStore'

describe('usePromptGeneratorStore', () => {
  beforeEach(() => {
    usePromptGeneratorStore.setState({
      input: {
        niche: '',
        category: 'abstract',
        batchSize: 1,
        usageContext: 'commercial',
        language: 'en',
        aspectRatio: 'random',
        variationLevel: 3,
        mood: { mode: 'user', value: 'none' },
        colorPalette: { mode: 'user', value: 'none' },
        artStyle: { mode: 'user', value: 'none' },
        background: { mode: 'user', value: 'none' },
        humanModel: { mode: 'user', value: 'no_people' },
        customInstructions: '',
        includeHistory: false,
        includeHistoryCount: 20,
        targetMarket: 'global',
        targetPlatform: 'dalle3',
        includeDiversity: true,
        allowTextSpace: false,
        includeNegativePrompts: true,
        includeKeywords: true
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
    const generatorInput = {
      niche: 'Space',
      category: 'abstract' as const,
      batchSize: 1 as const,
      usageContext: 'commercial' as const,
      language: 'en' as const,
      aspectRatio: 'random' as const,
      variationLevel: 3,
      mood: { mode: 'user' as const, value: 'none' as const },
      colorPalette: { mode: 'user' as const, value: 'none' as const },
      artStyle: { mode: 'user' as const, value: 'none' as const },
      background: { mode: 'user' as const, value: 'none' as const },
      humanModel: { mode: 'user' as const, value: 'no_people' as const },
      customInstructions: '',
      includeHistory: false,
      includeHistoryCount: 20,
      targetMarket: 'global' as const,
      targetPlatform: 'dalle3' as const,
      includeDiversity: true,
      allowTextSpace: false,
      includeNegativePrompts: true,
      includeKeywords: true
    }
    const mockBatch = {
      batchId: 'b1',
      generatorInput,
      generatedAt: new Date(),
      prompts: [
        {
          id: 'p1',
          variantIndex: 1,
          batchId: 'b1',
          segments: { subject: 'galaxy', composition: '', lighting: '', mood: '', style: '', technical: '', colorPalette: '', environment: '' },
          negativePrompt: '',
          platformVariants: { dalle3: 'galaxy far away', nano_banana: 'galaxy far away' },
          fullPrompt: 'galaxy far away',
          commercialKeywords: [],
          adobeScore: { total: 90, breakdown: { commercialViability: 20, technicalQuality: 20, compositionStrength: 25, marketDiversity: 25 }, warnings: [], suggestions: [] },
          variationAnchors: { primaryVariation: '', compositionStyle: '', lightingType: '', directionHint: '' },
          createdAt: new Date(),
          isFavorite: false,
          generatorInput
        }
      ]
    }

    usePromptGeneratorStore.setState({ batch: mockBatch })
    usePromptGeneratorStore.getState().toggleFavoriteInBatch('p1')

    expect(usePromptGeneratorStore.getState().batch?.prompts[0].isFavorite).toBe(true)
  })
})
