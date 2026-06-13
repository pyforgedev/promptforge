import { generateCompletion } from '@/services/ai/aiService'
import type { GenerateInput, GenerateResult } from '@/features/prompt-generation/types'

export async function generate(input: GenerateInput): Promise<GenerateResult> {
  const content = await generateCompletion(input.prompt)

  return {
    content,
    model: input.model ?? 'gpt-4',
    usage: {
      promptTokens: input.prompt.length,
      completionTokens: content.length,
      totalTokens: input.prompt.length + content.length,
    },
  }
}
