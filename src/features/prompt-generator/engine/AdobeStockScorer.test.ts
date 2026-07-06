import { describe, it, expect } from 'vitest'
import { scorePrompt } from './AdobeStockScorer'
import type { GeneratedPrompt, GeneratorInput } from '../types'

function makeInput(overrides: Partial<GeneratorInput> = {}): GeneratorInput {
  return {
    language: 'en',
    niche: 'test',
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
    includeDiversity: true,
    allowTextSpace: false,
    includeNegativePrompts: true,
    includeKeywords: true,
    ...overrides,
  }
}

function makePrompt(overrides: Partial<GeneratedPrompt> = {}): GeneratedPrompt {
  return {
    id: 'test-1',
    variantIndex: 1,
    batchId: 'batch-1',
    segments: {
      subject: 'a professional working at a desk',
      composition: 'rule of thirds, close-up',
      lighting: 'softbox studio lighting',
      mood: 'focused and productive',
      style: 'commercial photography',
      technical: 'shallow depth of field, 85mm lens',
      colorPalette: 'warm tones with teal accents',
      environment: 'modern open-plan office with city view',
    },
    negativePrompt: 'blurry, overexposed, cluttered background',
    platformVariants: { dalle3: '', nano_banana: '' },
    fullPrompt: 'A professional working at a desk in a modern office, softbox studio lighting, shallow depth of field, business and technology theme',
    commercialKeywords: ['business', 'professional', 'office', 'technology'],
    adobeScore: { total: 0, breakdown: { commercialViability: 0, technicalQuality: 0, compositionStrength: 0, marketDiversity: 0 }, warnings: [], suggestions: [] },
    variationAnchors: { primaryVariation: '', compositionStyle: '', lightingType: '', directionHint: '' },
    generatorInput: makeInput(),
    createdAt: new Date(),
    isFavorite: false,
    ...overrides,
  }
}

describe('AdobeStockScorer', () => {
  describe('scorePrompt', () => {
    it('returns a score object with total, breakdown, warnings, suggestions', () => {
      const prompt = makePrompt()
      const result = scorePrompt(prompt)
      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('breakdown')
      expect(result).toHaveProperty('warnings')
      expect(result).toHaveProperty('suggestions')
      expect(typeof result.total).toBe('number')
      expect(result.total).toBeGreaterThanOrEqual(0)
      expect(result.total).toBeLessThanOrEqual(100)
    })

    it('breakdown has all four categories', () => {
      const result = scorePrompt(makePrompt())
      const categories = ['commercialViability', 'technicalQuality', 'compositionStrength', 'marketDiversity']
      for (const cat of categories) {
        expect(result.breakdown).toHaveProperty(cat)
        expect(result.breakdown[cat as keyof typeof result.breakdown]).toBeGreaterThanOrEqual(0)
        expect(result.breakdown[cat as keyof typeof result.breakdown]).toBeLessThanOrEqual(25)
      }
    })

    it('total is sum of all breakdown categories', () => {
      const result = scorePrompt(makePrompt())
      const sum = result.breakdown.commercialViability + result.breakdown.technicalQuality + result.breakdown.compositionStrength + result.breakdown.marketDiversity
      expect(result.total).toBe(sum)
    })

    it('scores higher for prompts with commercial themes', () => {
      const genericPrompt = makePrompt({
        fullPrompt: 'A random object on a table',
        segments: { ...makePrompt().segments, subject: 'a cup', environment: 'tabletop', lighting: 'basic', composition: 'straight on', technical: 'basic', colorPalette: 'neutral' },
      })
      const commercialPrompt = makePrompt({
        fullPrompt: 'A business professional working in a modern office with technology, team collaboration, and innovation',
        segments: { ...makePrompt().segments, subject: 'business professional working in office', environment: 'modern corporate office' },
      })
      const genericScore = scorePrompt(genericPrompt)
      const commercialScore = scorePrompt(commercialPrompt)
      expect(commercialScore.breakdown.commercialViability).toBeGreaterThanOrEqual(genericScore.breakdown.commercialViability)
    })
  })

  describe('commercialViability scoring', () => {
    it('awards points for universal theme keywords', () => {
      const prompt = makePrompt({ fullPrompt: 'A business team collaborating in a modern office' })
      const result = scorePrompt(prompt)
      expect(result.breakdown.commercialViability).toBeGreaterThan(0)
    })

    it('deducts for prohibited brand content', () => {
      const prompt = makePrompt({ fullPrompt: 'A person wearing nike shoes' })
      const result = scorePrompt(prompt)
      expect(result.warnings.some(w => w.toLowerCase().includes('brand'))).toBe(true)
    })
  })

  describe('technicalQuality scoring', () => {
    it('awards points for specific lighting descriptors', () => {
      const goodLighting = makePrompt({ segments: { ...makePrompt().segments, lighting: 'softbox studio lighting with golden hour warmth' } })
      const badLighting = makePrompt({ segments: { ...makePrompt().segments, lighting: 'okay' } })
      expect(scorePrompt(goodLighting).breakdown.technicalQuality).toBeGreaterThan(scorePrompt(badLighting).breakdown.technicalQuality)
    })

    it('awards points for named composition techniques', () => {
      const named = makePrompt({ segments: { ...makePrompt().segments, composition: 'rule of thirds with leading lines' } })
      const plain = makePrompt({ segments: { ...makePrompt().segments, composition: 'a view' } })
      expect(scorePrompt(named).breakdown.technicalQuality).toBeGreaterThan(scorePrompt(plain).breakdown.technicalQuality)
    })
  })

  describe('compositionStrength scoring', () => {
    it('awards points for named compositional techniques', () => {
      const named = makePrompt({ segments: { ...makePrompt().segments, composition: 'symmetrical framing with layered depth' } })
      const plain = makePrompt({ segments: { ...makePrompt().segments, composition: 'ok' } })
      expect(scorePrompt(named).breakdown.compositionStrength).toBeGreaterThan(scorePrompt(plain).breakdown.compositionStrength)
    })

    it('awards points for detailed environment', () => {
      const detailed = makePrompt({ segments: { ...makePrompt().segments, environment: 'a spacious modern open-plan office with floor-to-ceiling windows and city skyline view' } })
      const sparse = makePrompt({ segments: { ...makePrompt().segments, environment: 'office' } })
      expect(scorePrompt(detailed).breakdown.compositionStrength).toBeGreaterThan(scorePrompt(sparse).breakdown.compositionStrength)
    })
  })

  describe('marketDiversity scoring', () => {
    it('scores 25 when no human subject is present', () => {
      const noHuman = makePrompt({
        fullPrompt: 'A beautiful landscape with mountains and a lake',
        segments: { ...makePrompt().segments, subject: 'mountain landscape' },
      })
      const result = scorePrompt(noHuman)
      expect(result.breakdown.marketDiversity).toBe(25)
    })

    it('awards diversity bonus when human subject has diverse representation', () => {
      const diverse = makePrompt({
        fullPrompt: 'A diverse team of multicultural professionals collaborating in a modern office',
        segments: { ...makePrompt().segments, subject: 'diverse team of multicultural professionals' },
      })
      const result = scorePrompt(diverse)
      expect(result.breakdown.marketDiversity).toBeGreaterThan(10)
    })
  })

  describe('warnings', () => {
    it('warns about prohibited content', () => {
      const prompt = makePrompt({ fullPrompt: 'Someone using an apple smartphone' })
      const result = scorePrompt(prompt)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('warns about very short prompts', () => {
      const prompt = makePrompt({ fullPrompt: 'A cat' })
      const result = scorePrompt(prompt)
      expect(result.warnings.some(w => w.includes('brief'))).toBe(true)
    })
  })

  describe('suggestions', () => {
    it('returns improvement suggestions', () => {
      const prompt = makePrompt()
      const result = scorePrompt(prompt)
      expect(Array.isArray(result.suggestions)).toBe(true)
      expect(result.suggestions.length).toBeLessThanOrEqual(4)
    })
  })
})
