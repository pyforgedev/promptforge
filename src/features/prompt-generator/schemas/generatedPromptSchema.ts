// This schema validates the raw JSON object returned by the LLM.
// It is intentionally more lenient than GeneratedPrompt — the engine
// does post-processing to fill in computed fields (id, batchId, scores, etc.)

import { z } from 'zod'

export const llmPromptOutputSchema = z.object({
  variant_id: z.number().int(),
  variation_anchors: z.object({
    primary_variation: z.string(),
    composition_style: z.string(),
    lighting_type: z.string(),
  }),
  subject: z.string(),
  composition: z.string(),
  lighting: z.string(),
  mood: z.string(),
  style: z.string(),
  technical: z.string(),
  color_palette: z.string(),
  environment: z.string(),
  negative_prompt: z.string(),
  full_prompt: z.string(),
  commercial_keywords: z.array(z.string()),
  adobe_compliance_notes: z.string(),
})

export const llmBatchOutputSchema = z.object({
  prompts: z.array(llmPromptOutputSchema),
})

export type LLMPromptOutput = z.infer<typeof llmPromptOutputSchema>
export type LLMBatchOutput = z.infer<typeof llmBatchOutputSchema>
