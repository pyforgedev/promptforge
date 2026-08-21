import type { CreateTemplateInput, PromptTemplate } from '@/features/templates/types'

export const DEFAULT_TEMPLATE_ID = 'template:builtin:stock-photo-v1'
export const DEFAULT_TEMPLATE_KEY = 'stock-photo-v1' as const
export const DEFAULT_TEMPLATE_SEED_SETTING = 'templates.seed.stock-photo-v1'

export const defaultTemplate: CreateTemplateInput = {
  name: 'Stock Photo Prompt',
  category: 'general',
  tags: ['stock', 'commercial', 'photo'],
  content: `A [subject] in [setting] during [time of day], captured with [camera style].
The image should convey [mood/emotion] with [lighting] lighting.
Style: [style], [color palette], [composition].
Stock photography, high quality, professional, well-composed.
8k resolution, detailed, sharp focus, natural lighting.`,
}

export function createDefaultTemplate(now = Date.now()): PromptTemplate {
  return {
    ...defaultTemplate,
    id: DEFAULT_TEMPLATE_ID,
    source: 'builtin',
    builtinKey: DEFAULT_TEMPLATE_KEY,
    createdAt: now,
    updatedAt: now,
  }
}
