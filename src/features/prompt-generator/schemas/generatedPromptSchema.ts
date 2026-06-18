// This schema validates the raw JSON object returned by the LLM.
// It is intentionally more lenient than GeneratedPrompt — the engine
// does post-processing to fill in computed fields (id, batchId, scores, etc.)

import { z } from 'zod'

export const llmPromptOutputSchema = z.object({
  variant_id: z.number().int().positive(),
  variation_anchors: z.object({
    primary_variation: z.string(),
    composition_style: z.string(),
    lighting_type: z.string(),
  }),
  subject: z.string().min(10),
  composition: z.string().min(5),
  lighting: z.string().min(5),
  mood: z.string().min(5),
  style: z.string().min(5),
  technical: z.string().min(5),
  color_palette: z.string().min(5),
  environment: z.string().min(5),
  negative_prompt: z.string().min(10),
  full_prompt: z.string().min(30),
  commercial_keywords: z.array(z.string()).min(5).max(20),
  adobe_compliance_notes: z.string(),
})

export const llmBatchOutputSchema = z.object({
  prompts: z.array(llmPromptOutputSchema),
})

export type LLMPromptOutput = z.infer<typeof llmPromptOutputSchema>
export type LLMBatchOutput = z.infer<typeof llmBatchOutputSchema>
