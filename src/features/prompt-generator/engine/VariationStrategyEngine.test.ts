import { describe, it, expect } from 'vitest'
import { resolveStatus, buildVariationPlan } from './VariationStrategyEngine'
import type { GeneratorInput } from '../types'

function makeInput(overrides: Partial<GeneratorInput> = {}): GeneratorInput {
  return {
    language: 'en',
    niche: 'test niche',
    batchSize: 1,
    usageContext: 'commercial',
    targetMarket: 'global',
    targetPlatform: 'dalle3',
    aspectRatio: '1:1',
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

describe('resolveStatus', () => {
  it('returns free when mode is system', () => {
    expect(resolveStatus({ mode: 'system' })).toBe('free')
  })

  it('returns excluded when value is none', () => {
    expect(resolveStatus({ mode: 'user', value: 'none' })).toBe('excluded')
  })

  it('returns excluded when value is no_people', () => {
    expect(resolveStatus({ mode: 'user', value: 'no_people' })).toBe('excluded')
  })

  it('returns pinned when mode is user with a real value', () => {
    expect(resolveStatus({ mode: 'user', value: 'peaceful' })).toBe('pinned')
  })
})

describe('buildVariationPlan — pool size', () => {
  it('full pool is 8 when all fields are free (system mode)', () => {
    const plan = buildVariationPlan(makeInput({ variationLevel: 3 }))
    expect(plan.availablePool).toHaveLength(8)
  })

  it('drops mood from pool when mood is pinned', () => {
    const plan = buildVariationPlan(makeInput({
      mood: { mode: 'user', value: 'peaceful' },
    }))
    expect(plan.availablePool).toHaveLength(7)
    expect(plan.availablePool).not.toContain('mood')
  })

  it('drops mood from pool when mood is excluded', () => {
    const plan = buildVariationPlan(makeInput({
      mood: { mode: 'user', value: 'none' },
    }))
    expect(plan.availablePool).toHaveLength(7)
    expect(plan.availablePool).not.toContain('mood')
  })

  it('drops color_palette from pool when pinned', () => {
    const plan = buildVariationPlan(makeInput({
      colorPalette: { mode: 'user', value: 'warm_tones' },
    }))
    expect(plan.availablePool).not.toContain('color_palette')
  })

  it('drops background from pool when pinned', () => {
    const plan = buildVariationPlan(makeInput({
      background: { mode: 'user', value: 'urban_cityscape' },
    }))
    expect(plan.availablePool).not.toContain('background')
  })

  it('pool is 6 when mood + colorPalette are pinned', () => {
    const plan = buildVariationPlan(makeInput({
      mood: { mode: 'user', value: 'dramatic' },
      colorPalette: { mode: 'user', value: 'warm_tones' },
    }))
    expect(plan.availablePool).toHaveLength(6)
  })
})

describe('buildVariationPlan — numToVary formula', () => {
  it('level 1 with full pool (8) → 2 dimensions varied', () => {
    const plan = buildVariationPlan(makeInput({ variationLevel: 1 }))
    expect(plan.numToVary).toBe(2)
    expect(plan.dimensionsToVary).toHaveLength(2)
  })

  it('level 5 with full pool (8) → 8 dimensions varied', () => {
    const plan = buildVariationPlan(makeInput({ variationLevel: 5 }))
    expect(plan.numToVary).toBe(8)
    expect(plan.dimensionsToVary).toHaveLength(8)
  })

  it('level 3 with pool of 6 (2 pinned) → proportional from 6, not from 8', () => {
    const plan = buildVariationPlan(makeInput({
      variationLevel: 3,
      mood: { mode: 'user', value: 'dramatic' },
      colorPalette: { mode: 'user', value: 'warm_tones' },
    }))
    expect(plan.availablePool).toHaveLength(6)
    const expected = Math.max(1, Math.ceil((3 / 5) * 6))
    expect(plan.numToVary).toBe(expected)
  })

  it('level 1 with pool of 6 → proportional from 6', () => {
    const plan = buildVariationPlan(makeInput({
      variationLevel: 1,
      mood: { mode: 'user', value: 'peaceful' },
      colorPalette: { mode: 'user', value: 'cool_tones' },
    }))
    expect(plan.availablePool).toHaveLength(6)
    const expected = Math.max(1, Math.ceil((1 / 5) * 6))
    expect(plan.numToVary).toBe(expected)
  })

  it('numToVary is never less than 1', () => {
    const plan = buildVariationPlan(makeInput({ variationLevel: 1 }))
    expect(plan.numToVary).toBeGreaterThanOrEqual(1)
  })

  it('dimensionsToVary is a prefix slice of availablePool', () => {
    const plan = buildVariationPlan(makeInput({ variationLevel: 3 }))
    expect(plan.dimensionsToVary).toEqual(plan.availablePool.slice(0, plan.numToVary))
  })
})

describe('buildVariationPlan — statuses', () => {
  it('reports artStyle status correctly', () => {
    const plan = buildVariationPlan(makeInput({
      artStyle: { mode: 'user', value: 'cinematic_photography' },
    }))
    expect(plan.artStyleStatus).toBe('pinned')
  })

  it('artStyle does NOT affect pool count (not in pool)', () => {
    const planWithArtStyle = buildVariationPlan(makeInput({
      artStyle: { mode: 'user', value: 'cinematic_photography' },
    }))
    const planWithout = buildVariationPlan(makeInput())
    expect(planWithArtStyle.availablePool).toHaveLength(planWithout.availablePool.length)
  })
})
