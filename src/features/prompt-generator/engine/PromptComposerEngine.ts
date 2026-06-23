// PromptComposerEngine — orchestrates the full prompt generation pipeline.
// Phase 2 scope: Steps 1–6 (variation matrix → LLM call → parsed batch).
// Phase 3 extends this with NegativePromptGenerator, AdobeStockScorer, PlatformAdapter.

import { v4 as uuidv4 } from 'uuid'
import { generatorInputSchema } from '../schemas/generatorInputSchema'
import { llmBatchOutputSchema } from '../schemas/generatedPromptSchema'
import type { LLMBatchOutput, LLMPromptOutput } from '../schemas/generatedPromptSchema'
import type {
  GeneratorInput,
  GeneratedPrompt,
  GeneratedPromptBatch,
  PromptGeneratorError,
  VariationAnchors,
  PromptSegments,
  AdobeStockScore,
} from '../types'
import { MetaPromptBuilder } from './MetaPromptBuilder'
import { useMasterPromptStore } from '@/store/useMasterPromptStore'
import { generateNegativePrompt } from './NegativePromptGenerator'
import { scorePrompt } from './AdobeStockScorer'
import { adaptForPlatform } from './PlatformAdapter'

export interface LLMClientInterface {
  complete(systemPrompt: string, userPrompt: string, options?: { maxTokens?: number }): Promise<string>
}

export interface PromptComposerEngineOptions {
  llmClient: LLMClientInterface
}

export class PromptComposerEngine {
  private options: PromptComposerEngineOptions
  constructor(options: PromptComposerEngineOptions) {
    this.options = options
  }

  async compose(input: GeneratorInput): Promise<GeneratedPromptBatch> {
    const parsed = generatorInputSchema.safeParse(input)
    if (!parsed.success) {
      throw this.makeError('PROVIDER_ERROR', 'Invalid generator input: ' + parsed.error.message)
    }

    const validInput = parsed.data

    const masterPromptOverride = useMasterPromptStore.getState().customPrompt
    const { systemPrompt, userPrompt } = MetaPromptBuilder.build(validInput, masterPromptOverride ?? undefined)

    // Calculate maxTokens dynamically based on requested batch size.
    // Standard size per prompt can be up to 600-800 tokens of JSON.
    // We scale up baseline to 4096 or batchSize * 1000 to prevent truncation on smaller batches.
    const batchSize = validInput.batchSize || 1
    const maxTokens = Math.max(4096, batchSize * 1000)

    let rawResponse: string
    try {
      rawResponse = await this.options.llmClient.complete(systemPrompt, userPrompt, { maxTokens })
    } catch (err) {
      const isTimeout =
        err instanceof Error &&
        (err.message.toLowerCase().includes('timeout') || err.message.toLowerCase().includes('timed out'))
      throw this.makeError(
        isTimeout ? 'LLM_TIMEOUT' : 'PROVIDER_ERROR',
        err instanceof Error ? err.message : 'LLM call failed',
      )
    }

    let llmBatch = this.parseResponse(rawResponse)

    if (!llmBatch) {
      const retryPrompt = MetaPromptBuilder.buildRetryPrompt(rawResponse, validInput)
      let retryResponse: string
      try {
        retryResponse = await this.options.llmClient.complete(systemPrompt, retryPrompt, { maxTokens })
      } catch {
        throw this.makeError('PARSE_FAILURE', 'LLM output could not be parsed and retry call failed', rawResponse)
      }
      llmBatch = this.parseResponse(retryResponse)
      if (!llmBatch) {
        throw this.makeError('PARSE_FAILURE', 'LLM output could not be parsed after retry', rawResponse)
      }
    }

    const batchId = uuidv4()
    const requestedCount = validInput.batchSize

    const validOutputs = llmBatch.prompts.slice(0, requestedCount)
    const rawPrompts: GeneratedPrompt[] = validOutputs.map((p, i) =>
      this.mapLLMOutput(p, i, batchId, validInput),
    )

    const prompts: GeneratedPrompt[] = rawPrompts.map((prompt) => {
      const negativePrompt = generateNegativePrompt(prompt, validInput.targetPlatform)
      const promptWithNeg: GeneratedPrompt = { ...prompt, negativePrompt }
      const adobeScore = scorePrompt(promptWithNeg)
      const promptWithScore: GeneratedPrompt = { ...promptWithNeg, adobeScore }
      const platformVariants = adaptForPlatform(promptWithScore, validInput.targetPlatform, negativePrompt)
      return {
        ...promptWithScore,
        platformVariants,
        fullPrompt: validInput.targetPlatform === 'nano_banana'
          ? platformVariants.nano_banana
          : platformVariants.dalle3,
      }
    })

    return {
      batchId,
      prompts,
      generatorInput: validInput,
      generatedAt: new Date(),
    }
  }

  private parseResponse(raw: string): LLMBatchOutput | null {
    try {
      let jsonStart = raw.indexOf('{')
      let jsonEnd = raw.lastIndexOf('}')
      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        return null
      }
      let cleaned = raw.slice(jsonStart, jsonEnd + 1).trim()
      
      // Robust JSON repair/cleanup logic for minor LLM variations
      // 1. Remove markdown backticks if any inside the substring
      if (cleaned.includes('```')) {
        cleaned = cleaned.replace(/```json/gi, '').replace(/```/g, '')
        jsonStart = cleaned.indexOf('{')
        jsonEnd = cleaned.lastIndexOf('}')
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          cleaned = cleaned.slice(jsonStart, jsonEnd + 1).trim()
        }
      }

      const parsed = JSON.parse(cleaned)
      const validated = llmBatchOutputSchema.safeParse(parsed)
      return validated.success ? validated.data : null
    } catch {
      return null
    }
  }

  private mapLLMOutput(
    p: LLMPromptOutput,
    index: number,
    batchId: string,
    input: GeneratorInput,
  ): GeneratedPrompt {
    const segments: PromptSegments = {
      subject: p.subject,
      composition: p.composition,
      lighting: p.lighting,
      mood: p.mood,
      style: p.style,
      technical: p.technical,
      colorPalette: p.color_palette,
      environment: p.environment,
    }

    const variationAnchors: VariationAnchors = {
      primaryVariation: p.variation_anchors.primary_variation,
      compositionStyle: p.variation_anchors.composition_style,
      lightingType: p.variation_anchors.lighting_type,
      directionHint: '',
    }

    const placeholderScore: AdobeStockScore = {
      total: 0,
      breakdown: {
        commercialViability: 0,
        technicalQuality: 0,
        compositionStrength: 0,
        marketDiversity: 0,
      },
      warnings: [],
      suggestions: [],
    }

    return {
      id: uuidv4(),
      variantIndex: index + 1,
      batchId,
      segments,
      negativePrompt: p.negative_prompt,
      platformVariants: {
        dalle3: p.full_prompt,
        nano_banana: p.full_prompt,
      },
      fullPrompt: p.full_prompt,
      commercialKeywords: input.includeKeywords ? p.commercial_keywords : [],
      adobeScore: placeholderScore,
      variationAnchors,
      generatorInput: input,
      createdAt: new Date(),
      isFavorite: false,
    }
  }

  private makeError(
    code: PromptGeneratorError['code'],
    message: string,
    rawResponse?: string,
  ): PromptGeneratorError {
    return { code, message, rawResponse }
  }
}
