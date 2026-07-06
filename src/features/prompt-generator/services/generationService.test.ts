import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GenerationService } from './generationService'
import type { AIConfig } from '@/features/settings/types'
import type { GeneratorInput, GeneratedPromptBatch } from '../types'

vi.mock('../engine/PromptComposerEngine', () => {
  const mockCompose = vi.fn()
  return {
    PromptComposerEngine: vi.fn(() => ({
      compose: mockCompose,
    })),
  }
})

vi.mock('@/services/ai/aiService', () => ({
  AIService: vi.fn(() => ({})),
}))

vi.mock('@/services/storage/indexeddb', () => ({
  saveGeneratedPromptBatch: vi.fn().mockResolvedValue('batch-1'),
  getRecentRelevantHistory: vi.fn().mockResolvedValue([]),
  togglePromptFavorite: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/services/similarity/similarityService', () => ({
  calculateSimilarity: vi.fn().mockReturnValue({ score: 0, matches: [] }),
}))

const mockConfig: AIConfig = {
  provider: 'openai',
  apiKey: 'test-key',
  model: 'gpt-4',
  endpoint: '',
}

const mockGeneratorInput: GeneratorInput = {
  language: 'en',
  niche: 'remote worker',
  batchSize: 1,
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
}

describe('GenerationService', () => {
  let service: GenerationService

  beforeEach(() => {
    service = new GenerationService(mockConfig)
  })

  describe('regeneratePrompt', () => {
    it('returns NOT_IMPLEMENTED error', async () => {
      const result = await service.regeneratePrompt('batch-1', 0)
      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('NOT_IMPLEMENTED')
    })
  })

  describe('saveBatch', () => {
    it('returns batch ID on success', async () => {
      const batch = {
        batchId: 'batch-1',
        generatorInput: mockGeneratorInput,
        generatedAt: new Date(),
        prompts: [{ id: 'p1', variantIndex: 1, batchId: 'test-1', segments: { subject: '', composition: '', lighting: '', mood: '', style: '', technical: '', colorPalette: '', environment: '' }, negativePrompt: '', platformVariants: { dalle3: '', nano_banana: '' }, fullPrompt: 'test', commercialKeywords: [], adobeScore: { total: 0, breakdown: { commercialViability: 0, technicalQuality: 0, compositionStrength: 0, marketDiversity: 0 }, warnings: [], suggestions: [] }, variationAnchors: { primaryVariation: '', compositionStyle: '', lightingType: '', directionHint: '' }, generatorInput: mockGeneratorInput, createdAt: new Date(), isFavorite: false }],
      } as GeneratedPromptBatch
      const result = await service.saveBatch(batch)
      expect(result.data).toBe('batch-1')
      expect(result.error).toBeNull()
    })
  })

  describe('toggleFavorite', () => {
    it('returns success on toggle', async () => {
      const result = await service.toggleFavorite('prompt-1')
      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })
  })
})
