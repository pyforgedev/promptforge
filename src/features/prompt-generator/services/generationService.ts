import { PromptComposerEngine } from '../engine/PromptComposerEngine'
import { AIService } from '@/services/ai/aiService'
import { saveGeneratedPromptBatch, togglePromptFavorite, getRecentRelevantHistory } from '@/services/storage/indexeddb'
import { calculateSimilarity } from '@/services/similarity/similarityService'
import { DUPLICATE_CHECK_HISTORY_LIMIT, SIMILARITY_THRESHOLD } from '@/lib/constants'
import type { AIConfig } from '@/features/settings/types'
import type { GeneratorInput, GeneratedPromptBatch, PromptGeneratorError, GeneratedPrompt } from '../types'

/**
 * A new generation service that encapsulates the PromptComposerEngine.
 * It acts as the primary entry point for initiating a prompt generation task.
 */
export class GenerationService {
  private engine: PromptComposerEngine

  constructor(config: AIConfig) {
    const aiService = new AIService(config)
    this.engine = new PromptComposerEngine({ llmClient: aiService })
  }

  /**
   * Generates a batch of prompts using the PromptComposerEngine.
   * @param input The user's desired parameters for generation.
   * @returns A result object containing either the prompt batch or an error.
   */
  public async generatePrompts(
    input: GeneratorInput
  ): Promise<{ data: GeneratedPromptBatch | null; error: PromptGeneratorError | null }> {
    try {
      const promptBatch = await this.engine.compose(input)
      
      if (promptBatch && promptBatch.prompts && promptBatch.prompts.length > 0) {
        const historyItems = await getRecentRelevantHistory(
          input.category || 'other',
          DUPLICATE_CHECK_HISTORY_LIMIT
        )

        if (historyItems.length > 0) {
          const historyTexts = historyItems.map(item => item.fullPrompt)
          
          for (const prompt of promptBatch.prompts) {
            const similarity = calculateSimilarity(prompt.fullPrompt, historyTexts)
            if (similarity.score >= SIMILARITY_THRESHOLD) {
              prompt.isDuplicate = true
              const matchedText = similarity.matches[0]
              const matchedItem = historyItems.find(item => item.fullPrompt === matchedText)
              prompt.duplicateRef = matchedItem?.fullPrompt || matchedText
            }
          }
        }
      }

      return { data: promptBatch, error: null }
    } catch (err) {
      // The engine throws PromptGeneratorError objects on failure
      if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
        return { data: null, error: err as PromptGeneratorError }
      }

      // Fallback for unexpected errors
      const debugMsg = err instanceof Error ? err.message : String(err)
      return {
        data: null,
        error: {
          code: 'PROVIDER_ERROR',
          message: import.meta.env.DEV ? debugMsg : 'An unexpected error occurred during prompt generation.',
        },
      }
    }
  }

  /**
   * Regenerates a specific prompt variant in a batch.
   * @param batchId The ID of the batch containing the prompt to regenerate.
   * @param variantIndex The index of the variant to regenerate (1-based).
   * @returns A result object containing either the regenerated prompt or an error.
   */
  public async regeneratePrompt(
    _batchId: string,
    _variantIndex: number
  ): Promise<{ data: GeneratedPrompt | null; error: PromptGeneratorError | null }> {
    try {
      // TODO: Implement regeneratePrompt
      void _batchId
      void _variantIndex
      return { data: null, error: null }
    } catch (err) {
      const debugMsg = err instanceof Error ? err.message : String(err)
      return {
        data: null,
        error: {
          code: 'PROVIDER_ERROR',
          message: import.meta.env.DEV ? debugMsg : 'An unexpected error occurred during prompt regeneration.',
        },
      }
    }
  }

  /**
   * Toggles the favorite status of a prompt.
   * @param promptId The ID of the prompt to toggle.
   * @returns A result object containing either the updated prompt or an error.
   */
  public async toggleFavorite(
    promptId: string
  ): Promise<{ data: GeneratedPrompt | null; error: PromptGeneratorError | null }> {
    try {
      await togglePromptFavorite(promptId)
      return { data: null, error: null }
    } catch (err) {
      const debugMsg = err instanceof Error ? err.message : String(err)
      return {
        data: null,
        error: {
          code: 'PROVIDER_ERROR',
          message: import.meta.env.DEV ? debugMsg : 'An unexpected error occurred while toggling favorite status.',
        },
      }
    }
  }

  /**
   * Saves a generated prompt batch to the database.
   * @param batch The batch to save.
   * @returns A result object containing either the saved batch ID or an error.
   */
  public async saveBatch(
    batch: GeneratedPromptBatch
  ): Promise<{ data: string | null; error: PromptGeneratorError | null }> {
    try {
      const batchId = await saveGeneratedPromptBatch(batch)
      return { data: batchId, error: null }
    } catch (err) {
      const debugMsg = err instanceof Error ? err.message : String(err)
      return {
        data: null,
        error: {
          code: 'PROVIDER_ERROR',
          message: import.meta.env.DEV ? debugMsg : 'An unexpected error occurred while saving the batch.',
        },
      }
    }
  }
}
