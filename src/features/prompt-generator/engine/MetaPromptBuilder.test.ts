import { describe, it, expect } from 'vitest'
import { MetaPromptBuilder } from './MetaPromptBuilder'
import type { GeneratorInput } from '../types'

function makeInput(overrides: Partial<GeneratorInput> = {}): GeneratorInput {
  return {
    language: 'en',
    niche: 'remote worker at home',
    batchSize: 3,
    usageContext: 'commercial',
    targetMarket: 'global',
    targetPlatform: 'dalle3',
    aspectRatio: '16:9',
    variationLevel: 3,
    styleMode: 'user',
    mood: { mode: 'system' },
    colorPalette: { mode: 'system' },
    artStyle: { mode: 'system' },
    background: { mode: 'system' },
    humanModel: { mode: 'system' },
    customInstructions: '',
    includeHistory: false,
    includeHistoryCount: 20,
    includeDiversity: false,
    allowTextSpace: false,
    includeNegativePrompts: true,
    includeKeywords: true,
    ...overrides,
  }
}

describe('MetaPromptBuilder.build — pinned dimensions', () => {
  it('pinned mood appears with "maintain" instruction in userPrompt', () => {
    const { userPrompt } = MetaPromptBuilder.build(makeInput({
      mood: { mode: 'user', value: 'peaceful' },
    }))
    expect(userPrompt).toMatch(/Mood:.*Peaceful.*maintain.*consistently/i)
  })

  it('pinned colorPalette appears with "maintain" instruction in userPrompt', () => {
    const { userPrompt } = MetaPromptBuilder.build(makeInput({
      colorPalette: { mode: 'user', value: 'warm_tones' },
    }))
    expect(userPrompt).toMatch(/Color Palette:.*Warm Tones.*maintain.*consistently/i)
  })

  it('pinned background appears with "maintain" instruction in userPrompt', () => {
    const { userPrompt } = MetaPromptBuilder.build(makeInput({
      background: { mode: 'user', value: 'urban_cityscape' },
    }))
    expect(userPrompt).toMatch(/Background.*Urban Cityscape.*maintain.*consistently/i)
  })

  it('pinned artStyle appears with style instruction in userPrompt', () => {
    const { userPrompt } = MetaPromptBuilder.build(makeInput({
      artStyle: { mode: 'user', value: 'cinematic_photography' },
    }))
    expect(userPrompt).toMatch(/Art Style:.*Cinematic Photography/i)
  })
})

describe('MetaPromptBuilder.build — excluded dimensions', () => {
  it('excluded mood (none) does NOT appear as a dimension instruction line', () => {
    const { userPrompt } = MetaPromptBuilder.build(makeInput({
      mood: { mode: 'user', value: 'none' },
    }))
    expect(userPrompt).not.toMatch(/Mood:.*maintain/i)
    expect(userPrompt).not.toMatch(/no mood specified/i)
  })

  it('excluded colorPalette (none) does NOT appear as pinned instruction', () => {
    const { userPrompt } = MetaPromptBuilder.build(makeInput({
      colorPalette: { mode: 'user', value: 'none' },
    }))
    expect(userPrompt).not.toMatch(/Color Palette:.*maintain/i)
  })

  it('excluded background (none) does NOT appear as pinned instruction', () => {
    const { userPrompt } = MetaPromptBuilder.build(makeInput({
      background: { mode: 'user', value: 'none' },
    }))
    expect(userPrompt).not.toMatch(/Background.*maintain/i)
  })
})

describe('MetaPromptBuilder.build — free dimensions varied', () => {
  it('free mood in dimensionsToVary produces vary instruction per variant', () => {
    const { userPrompt } = MetaPromptBuilder.build(makeInput({
      mood: { mode: 'system' },
      variationLevel: 5,
    }))
    expect(userPrompt).toMatch(/Atmosphere \/ Mood.*vary across variants.*this variant:/i)
  })

  it('each variant block is listed separately', () => {
    const { userPrompt } = MetaPromptBuilder.build(makeInput({ batchSize: 3 }))
    expect(userPrompt).toContain('Variant 1:')
    expect(userPrompt).toContain('Variant 2:')
    expect(userPrompt).toContain('Variant 3:')
  })
})

describe('MetaPromptBuilder.build — customInstructions', () => {
  it('customInstructions appears in its own section, not mixed into structural instructions', () => {
    const { userPrompt } = MetaPromptBuilder.build(makeInput({
      customInstructions: 'Always include a dog in the scene.',
    }))
    const customIdx = userPrompt.indexOf('ADDITIONAL USER INSTRUCTIONS:')
    const criticalIdx = userPrompt.indexOf('CRITICAL RULES:')
    expect(customIdx).toBeGreaterThan(-1)
    expect(criticalIdx).toBeGreaterThan(-1)
    expect(customIdx).toBeGreaterThan(criticalIdx)
    expect(userPrompt).toContain('Always include a dog in the scene.')
  })

  it('customInstructions section is absent when empty', () => {
    const { userPrompt } = MetaPromptBuilder.build(makeInput({ customInstructions: '' }))
    expect(userPrompt).not.toContain('ADDITIONAL USER INSTRUCTIONS:')
  })
})

describe('MetaPromptBuilder.build — language', () => {
  it('language instruction present when language is not en', () => {
    const { userPrompt } = MetaPromptBuilder.build(makeInput({ language: 'id' }))
    expect(userPrompt).toMatch(/LANGUAGE:.*id/i)
  })

  it('no language instruction when language is en', () => {
    const { userPrompt } = MetaPromptBuilder.build(makeInput({ language: 'en' }))
    expect(userPrompt).not.toMatch(/LANGUAGE:/i)
  })
})

describe('MetaPromptBuilder.build — variation level in output', () => {
  it('variation level is mentioned in the prompt', () => {
    const { userPrompt } = MetaPromptBuilder.build(makeInput({ variationLevel: 4 }))
    expect(userPrompt).toContain('VARIATION LEVEL: 4/5')
  })
})
