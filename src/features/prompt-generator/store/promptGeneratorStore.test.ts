import { describe, it, expect, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { usePromptGeneratorStore } from '@/features/prompt-generator/store/promptGeneratorStore'
import db from '@/services/storage/db'

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
        styleMode: 'user',
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
      styleMode: 'user' as const,
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

  it('uses reference content in memory but excludes reference identity and content from persistence', async () => {
    usePromptGeneratorStore.getState().setTemplateReference('template-1', 'Portrait Base', 'private reference text')

    expect(usePromptGeneratorStore.getState()).toMatchObject({
      activeTemplateReference: { id: 'template-1', name: 'Portrait Base', mode: 'reference' },
      input: { basePromptReference: 'private reference text' },
      advancedOptionsOpen: true,
    })

    await waitFor(async () => {
      const persisted = await db.generatorState.get('prompt-generator-v2')
      expect(persisted).toBeDefined()
      const payload = persisted?.value as { state: Record<string, unknown> }
      expect(payload.state).not.toHaveProperty('activeTemplateReference')
      expect(payload.state).not.toHaveProperty('advancedOptionsOpen')
      expect(payload.state.input).not.toHaveProperty('basePromptReference')
    })
  })
})
