import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PromptComposerEngine, type LLMClientInterface } from './PromptComposerEngine'
import type { GeneratorInput } from '../types'

vi.mock('./NegativePromptGenerator', () => ({
  generateNegativePrompt: vi.fn(() => ''),
}))

vi.mock('./AdobeStockScorer', () => ({
  scorePrompt: vi.fn(() => ({
    total: 75,
    breakdown: { commercialViability: 20, technicalQuality: 20, compositionStrength: 15, marketDiversity: 20 },
    warnings: [],
    suggestions: [],
  })),
}))

vi.mock('./PlatformAdapter', () => ({
  adaptForPlatform: vi.fn((prompt) => ({
    dalle3: prompt.fullPrompt || 'adapted dalle3 prompt',
    nano_banana: 'adapted nano_banana prompt',
  })),
}))

vi.mock('@/store/useMasterPromptStore', () => ({
  useMasterPromptStore: {
    getState: vi.fn(() => ({ customPrompt: '' })),
  },
}))

function makeInput(overrides: Partial<GeneratorInput> = {}): GeneratorInput {
  return {
    language: 'en',
    niche: 'remote worker at home',
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
    ...overrides,
  }
}

function createMockPrompt(variantId: number) {
  return {
    variant_id: variantId,
    variation_anchors: { primary_variation: 'lighting', composition_style: 'rule of thirds', lighting_type: 'softbox' },
    subject: 'a professional working at a desk',
    composition: 'rule of thirds, close-up',
    lighting: 'softbox studio lighting',
    mood: 'focused and productive',
    style: 'commercial photography',
    technical: 'shallow depth of field, 85mm lens',
    color_palette: 'warm tones with teal accents',
    environment: 'modern open-plan office with city view',
    negative_prompt: 'blurry, overexposed',
    full_prompt: `Prompt ${variantId}: A professional working at a desk in a modern office`,
    commercial_keywords: ['business', 'professional', 'office', 'technology'],
    adobe_compliance_notes: 'clean commercial image',
  }
}

describe('PromptComposerEngine', () => {
  let engine: PromptComposerEngine
  let mockLLM: LLMClientInterface

  beforeEach(() => {
    vi.clearAllMocks()
    mockLLM = {
      complete: vi.fn().mockResolvedValue(JSON.stringify({
        prompts: [createMockPrompt(1)],
      })),
    }
    engine = new PromptComposerEngine({ llmClient: mockLLM })
  })

  describe('compose', () => {
    it('returns a valid GeneratedPromptBatch on success', async () => {
      const result = await engine.compose(makeInput())
      expect(result).toHaveProperty('batchId')
      expect(result).toHaveProperty('prompts')
      expect(result).toHaveProperty('generatorInput')
      expect(result).toHaveProperty('generatedAt')
      expect(result.prompts).toHaveLength(1)
    })

    it('assigns UUIDs to each prompt and respects batchSize', async () => {
      mockLLM.complete = vi.fn().mockResolvedValue(JSON.stringify({
        prompts: [createMockPrompt(1), createMockPrompt(2), createMockPrompt(3)],
      }))
      const result = await engine.compose(makeInput({ batchSize: 3 }))
      expect(result.prompts).toHaveLength(3)
      const ids = result.prompts.map(p => p.id)
      expect(new Set(ids).size).toBe(3)
    })

    it('calls LLM client with system and user prompts', async () => {
      await engine.compose(makeInput())
      expect(mockLLM.complete).toHaveBeenCalledOnce()
      const [systemPrompt, userPrompt] = (mockLLM.complete as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(systemPrompt).toContain('stock photography art director')
      expect(userPrompt).toContain('Generate exactly')
    })

    it('throws PROVIDER_ERROR on invalid input', async () => {
      const invalidInput = { niche: '' } as GeneratorInput
      await expect(engine.compose(invalidInput)).rejects.toMatchObject({
        code: 'PROVIDER_ERROR',
      })
    })

    it('re-throws LLM timeout as LLM_TIMEOUT error', async () => {
      mockLLM.complete = vi.fn().mockRejectedValue(new Error('timeout'))
      await expect(engine.compose(makeInput())).rejects.toMatchObject({
        code: 'LLM_TIMEOUT',
      })
    })

    it('re-throws other LLM errors as PROVIDER_ERROR', async () => {
      mockLLM.complete = vi.fn().mockRejectedValue(new Error('API unavailable'))
      await expect(engine.compose(makeInput())).rejects.toMatchObject({
        code: 'PROVIDER_ERROR',
      })
    })

    it('retries on parse failure and succeeds', async () => {
      mockLLM.complete = vi.fn()
        .mockResolvedValueOnce('not json at all')
        .mockResolvedValueOnce(JSON.stringify({
          prompts: [createMockPrompt(1)],
        }))
      const result = await engine.compose(makeInput())
      expect(result.prompts).toHaveLength(1)
      expect(mockLLM.complete).toHaveBeenCalledTimes(2)
    })

    it('throws PARSE_FAILURE when retry also fails', async () => {
      mockLLM.complete = vi.fn().mockResolvedValue('not json')
      await expect(engine.compose(makeInput())).rejects.toMatchObject({
        code: 'PARSE_FAILURE',
      })
    })

    it('limits output to requested batchSize', async () => {
      mockLLM.complete = vi.fn().mockResolvedValue(JSON.stringify({
        prompts: [createMockPrompt(1), createMockPrompt(2), createMockPrompt(3)],
      }))
      const result = await engine.compose(makeInput({ batchSize: 1 }))
      expect(result.prompts).toHaveLength(1)
    })
  })
})
