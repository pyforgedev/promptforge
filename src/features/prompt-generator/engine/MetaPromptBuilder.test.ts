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

describe('MetaPromptBuilder.build — pinned dimensions (USER CONSTRAINT wording)', () => {
  it('pinned mood emits an authoritative USER CONSTRAINT instruction', () => {
    const { userPrompt } = MetaPromptBuilder.build(makeInput({
      mood: { mode: 'user', value: 'peaceful' },
    }))
    expect(userPrompt).toContain('USER CONSTRAINT — Mood: Peaceful')
    expect(userPrompt).toContain('Every mood segment and full_prompt MUST preserve this semantic intent')
  })

  it('pinned colorPalette emits an authoritative USER CONSTRAINT instruction', () => {
    const { userPrompt } = MetaPromptBuilder.build(makeInput({
      colorPalette: { mode: 'user', value: 'warm_tones' },
    }))
    expect(userPrompt).toContain('USER CONSTRAINT — Color Palette: Warm Tones')
    expect(userPrompt).toContain('Every color_palette segment and full_prompt MUST preserve this semantic intent')
  })

  it('pinned background emits an authoritative USER CONSTRAINT instruction', () => {
    const { userPrompt } = MetaPromptBuilder.build(makeInput({
      background: { mode: 'user', value: 'urban_cityscape' },
    }))
    expect(userPrompt).toContain('USER CONSTRAINT — Background / Environment: Urban Cityscape')
    expect(userPrompt).toContain('Every environment segment and full_prompt MUST preserve this semantic intent')
  })

  it('pinned artStyle emits an authoritative USER CONSTRAINT instruction', () => {
    const { userPrompt } = MetaPromptBuilder.build(makeInput({
      artStyle: { mode: 'user', value: 'cinematic_photography' },
    }))
    expect(userPrompt).toContain('USER CONSTRAINT — Art Style: Cinematic Photography')
    expect(userPrompt).toContain('Every style segment and full_prompt MUST preserve this semantic intent')
  })
})

describe('MetaPromptBuilder.build — excluded / system dimensions', () => {
  it('excluded mood (none) emits no USER CONSTRAINT line', () => {
    const { userPrompt } = MetaPromptBuilder.build(makeInput({
      mood: { mode: 'user', value: 'none' },
    }))
    expect(userPrompt).not.toMatch(/USER CONSTRAINT — Mood:/i)
  })

  it('system mood (default) emits no USER CONSTRAINT line', () => {
    const { userPrompt } = MetaPromptBuilder.build(makeInput({
      mood: { mode: 'system' },
    }))
    expect(userPrompt).not.toMatch(/USER CONSTRAINT — Mood:/i)
  })

  it('excluded colorPalette (none) emits no USER CONSTRAINT line', () => {
    const { userPrompt } = MetaPromptBuilder.build(makeInput({
      colorPalette: { mode: 'user', value: 'none' },
    }))
    expect(userPrompt).not.toMatch(/USER CONSTRAINT — Color Palette:/i)
  })

  it('excluded background (none) emits no USER CONSTRAINT line', () => {
    const { userPrompt } = MetaPromptBuilder.build(makeInput({
      background: { mode: 'user', value: 'none' },
    }))
    expect(userPrompt).not.toMatch(/USER CONSTRAINT — Background \/ Environment:/i)
  })
})

describe('MetaPromptBuilder.build — human presence (No People / AI omission)', () => {
  it('pinned humanModel "no_people" emits the authoritative No People constraint', () => {
    const { userPrompt } = MetaPromptBuilder.build(makeInput({
      humanModel: { mode: 'user', value: 'no_people' },
    }))
    expect(userPrompt).toContain('USER CONSTRAINT — Human Presence: No People')
    expect(userPrompt).toContain(
      'Do not include people, hands, faces, silhouettes, body parts, or implied human presence in subject, environment, or full_prompt.',
    )
  })

  it('pinned humanModel with a specific person emits a Human Presence USER CONSTRAINT', () => {
    const { userPrompt } = MetaPromptBuilder.build(makeInput({
      humanModel: { mode: 'user', value: 'man' },
    }))
    expect(userPrompt).toContain('USER CONSTRAINT — Human Presence: Man')
    expect(userPrompt).toContain('Every subject segment and full_prompt MUST preserve this constraint without contradiction.')
  })

  it('system humanModel (AI-determined) emits no Human Presence constraint line', () => {
    const { userPrompt } = MetaPromptBuilder.build(makeInput({
      humanModel: { mode: 'system' },
    }))
    expect(userPrompt).not.toMatch(/USER CONSTRAINT — Human Presence:/i)
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
