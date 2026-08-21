import { describe, expect, it } from 'vitest'
import type { GeneratedPrompt, GeneratorInput } from '@/features/prompt-generator/types'
import { generatedPromptToTemplateInput, mapGeneratorSettings } from './templateMappers'

function generatorInput(overrides: Partial<GeneratorInput> = {}): GeneratorInput {
  return {
    language: 'en',
    niche: 'Mountain travel',
    category: 'travel',
    batchSize: 4,
    usageContext: 'commercial',
    targetMarket: 'global',
    targetPlatform: 'dalle3',
    aspectRatio: '16:9',
    variationLevel: 3,
    styleMode: 'user',
    mood: { mode: 'user', value: 'dramatic' },
    colorPalette: { mode: 'system' },
    artStyle: { mode: 'user', value: 'photorealistic' },
    background: { mode: 'system' },
    humanModel: { mode: 'user', value: 'no_people' },
    customInstructions: 'Keep it natural',
    includeHistory: true,
    includeHistoryCount: 30,
    includeDiversity: true,
    allowTextSpace: false,
    basePromptReference: 'private transient reference',
    includeNegativePrompts: true,
    includeKeywords: true,
    ...overrides,
  }
}

function generatedPrompt(): GeneratedPrompt {
  return {
    id: 'generated-1',
    variantIndex: 2,
    batchId: 'batch-secret',
    segments: {
      subject: 'mountain', composition: 'wide', lighting: 'sunrise', mood: 'calm',
      style: 'photo', technical: 'sharp', colorPalette: 'warm', environment: 'outdoors',
    },
    negativePrompt: 'blur',
    platformVariants: { dalle3: 'DALL-E prompt', nano_banana: 'Nano prompt' },
    fullPrompt: '  Primary prompt  ',
    commercialKeywords: ['travel', 'mountain'],
    adobeScore: {
      total: 91,
      breakdown: { commercialViability: 25, technicalQuality: 22, compositionStrength: 22, marketDiversity: 22 },
      warnings: [],
      suggestions: [],
    },
    variationAnchors: {
      primaryVariation: 'lighting', compositionStyle: 'wide', lightingType: 'sunrise', directionHint: 'calm',
    },
    generatorInput: generatorInput(),
    createdAt: new Date(1),
    isFavorite: true,
  }
}

describe('template mappers', () => {
  it('maps only the allowlisted reusable generator settings', () => {
    const settings = mapGeneratorSettings(generatorInput())

    expect(settings).toMatchObject({
      language: 'en',
      niche: 'Mountain travel',
      category: 'travel',
      targetPlatform: 'dalle3',
      includeKeywords: true,
    })
    expect(settings).not.toHaveProperty('basePromptReference')
    expect(settings).not.toHaveProperty('batchSize')
    expect(settings).not.toHaveProperty('includeHistory')
    expect(settings).not.toHaveProperty('includeHistoryCount')
  })

  it('drops an invalid legacy category without discarding other settings', () => {
    const input = generatorInput()
    ;(input as GeneratorInput & { category: string }).category = 'legacy-category'

    const settings = mapGeneratorSettings(input)

    expect(settings).toMatchObject({ language: 'en', aspectRatio: '16:9' })
    expect(settings).not.toHaveProperty('category')
  })

  it('maps generated prompt content and metadata without transient scoring or batch fields', () => {
    const mapped = generatedPromptToTemplateInput(generatedPrompt())

    expect(mapped).toMatchObject({
      name: 'Mountain travel #2',
      content: 'Primary prompt',
      category: 'travel',
      tags: ['travel', 'mountain'],
      source: 'generator',
      negativePrompt: 'blur',
      commercialKeywords: ['travel', 'mountain'],
      platformVariants: { dalle3: 'DALL-E prompt', nano_banana: 'Nano prompt' },
    })
    expect(mapped.segments).toEqual(generatedPrompt().segments)
    expect(mapped).not.toHaveProperty('batchId')
    expect(mapped).not.toHaveProperty('adobeScore')
    expect(mapped).not.toHaveProperty('variationAnchors')
    expect(mapped.generatorSettings).not.toHaveProperty('basePromptReference')
    expect(mapped.generatorSettings).not.toHaveProperty('batchSize')
    expect(mapped.generatorSettings).not.toHaveProperty('includeHistory')
    expect(mapped.generatorSettings).not.toHaveProperty('includeHistoryCount')
  })

  it('falls back to the selected platform variant when fullPrompt is blank', () => {
    const prompt = generatedPrompt()
    prompt.fullPrompt = '  '
    prompt.generatorInput = generatorInput({ targetPlatform: 'nano_banana' })

    expect(generatedPromptToTemplateInput(prompt).content).toBe('Nano prompt')
  })
})
