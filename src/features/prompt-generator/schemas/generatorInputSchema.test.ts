import { describe, it, expect } from 'vitest'
import { generatorInputSchema, generatorInputDefaults } from './generatorInputSchema'
import { OPTION_LABELS } from '../types'

describe('generatorInputDefaults — style preferences default to system/AI', () => {
  it('mood, colorPalette, artStyle and background default to mode "system" (AI-driven)', () => {
    expect(generatorInputDefaults.mood).toEqual({ mode: 'system' })
    expect(generatorInputDefaults.colorPalette).toEqual({ mode: 'system' })
    expect(generatorInputDefaults.artStyle).toEqual({ mode: 'system' })
    expect(generatorInputDefaults.background).toEqual({ mode: 'system' })
  })

  it('humanModel defaults to AI (mode "system")', () => {
    expect(generatorInputDefaults.humanModel).toEqual({ mode: 'system' })
  })

  it('parsing a valid input without style fields applies system/AI defaults', () => {
    const parsed = generatorInputSchema.parse({
      language: 'en',
      niche: 'remote worker at home',
      batchSize: 1,
      usageContext: 'commercial',
      targetMarket: 'global',
      targetPlatform: 'dalle3',
      aspectRatio: '16:9',
      variationLevel: 3,
      styleMode: 'user',
      includeHistory: false,
      includeHistoryCount: 20,
      includeDiversity: false,
      allowTextSpace: false,
      includeNegativePrompts: true,
      includeKeywords: true,
    })
    expect(parsed.mood).toEqual({ mode: 'system' })
    expect(parsed.colorPalette).toEqual({ mode: 'system' })
    expect(parsed.artStyle).toEqual({ mode: 'system' })
    expect(parsed.background).toEqual({ mode: 'system' })
    expect(parsed.humanModel).toEqual({ mode: 'system' })
  })
})

describe('OPTION_LABELS — "none" now represents AI', () => {
  it('maps "none" to "AI" so the UI can expose an AI option', () => {
    expect(OPTION_LABELS.none).toBe('AI')
  })
})

describe('generatorInputSchema — batch size', () => {
  const validInput = {
    ...generatorInputDefaults,
    niche: 'remote worker at home',
  }

  it.each([1, 2, 6, 10])('accepts an integer batch size of %i', (batchSize) => {
    expect(generatorInputSchema.parse({ ...validInput, batchSize }).batchSize).toBe(batchSize)
  })

  it.each([0, 11, 1.5])('rejects an invalid batch size of %s', (batchSize) => {
    expect(() => generatorInputSchema.parse({ ...validInput, batchSize })).toThrow()
  })
})
