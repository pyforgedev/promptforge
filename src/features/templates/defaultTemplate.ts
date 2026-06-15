import type { CreatePromptInput } from '@/features/prompts/types'

export const defaultTemplate: CreatePromptInput = {
  name: 'Stock Photo Prompt',
  category: 'general',
  tags: ['stock', 'commercial', 'photo'],
  content: `A [subject] in [setting] during [time of day], captured with [camera style].
The image should convey [mood/emotion] with [lighting] lighting.
Style: [style], [color palette], [composition].
Stock photography, high quality, professional, well-composed.
8k resolution, detailed, sharp focus, natural lighting.`,
}

export function getDefaultTemplateContent(): string {
  return defaultTemplate.content
}
