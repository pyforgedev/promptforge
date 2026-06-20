// This schema validates the raw JSON object returned by the LLM.
// It is intentionally more lenient than GeneratedPrompt — the engine
// does post-processing to fill in computed fields (id, batchId, scores, etc.)

import { z } from 'zod'

export const llmPromptOutputSchema = z.object({
  variant_id: z.number().int().catch(1),
  variation_anchors: z.object({
    primary_variation: z.string().catch(''),
    composition_style: z.string().catch(''),
    lighting_type: z.string().catch(''),
  }).catch(() => ({
    primary_variation: '',
    composition_style: '',
    lighting_type: '',
  })),
  subject: z.string().catch(''),
  composition: z.string().catch(''),
  lighting: z.string().catch(''),
  mood: z.string().catch(''),
  style: z.string().catch(''),
  technical: z.string().catch(''),
  color_palette: z.string().catch(''),
  environment: z.string().catch(''),
  negative_prompt: z.string().catch(''),
  full_prompt: z.string().catch(''),
  commercial_keywords: z.array(z.string()).catch([]),
  adobe_compliance_notes: z.string().catch(''),
})

export const llmBatchOutputSchema = z.object({
  prompts: z.array(llmPromptOutputSchema),
})

export type LLMPromptOutput = z.infer<typeof llmPromptOutputSchema>
export type LLMBatchOutput = z.infer<typeof llmBatchOutputSchema>
