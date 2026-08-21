import { z } from 'zod'
import {
  ART_STYLE_OPTIONS,
  BACKGROUND_OPTIONS,
  COLOR_PALETTE_OPTIONS,
  HUMAN_MODEL_OPTIONS,
  MOOD_OPTIONS,
} from '@/features/prompt-generator/types'
import { NICHE_CATEGORIES } from '@/features/prompt-generator/constants/categories'
import { TEMPLATE_CATEGORIES } from '@/features/templates/types'

const NAME_MAX = 100
const CONTENT_MAX = 10_000
const TAG_MAX = 50
const TAGS_MAX = 10
const METADATA_TEXT_MAX = 20_000
const KEYWORDS_MAX = 60

function hasControlCharacters(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint <= 31 || codePoint === 127
  })
}

export function normalizeNameKey(name: string): string {
  return name.normalize('NFKC').trim().toLowerCase()
}

export function normalizeTagKey(tag: string): string {
  return tag.normalize('NFKC').trim().toLowerCase()
}

function dedupeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const rawTag of tags) {
    const tag = rawTag.normalize('NFKC').trim()
    const key = normalizeTagKey(tag)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(tag)
  }
  return result
}

const nameSchema = z.string()
  .transform((value) => value.normalize('NFKC').trim())
  .pipe(z.string()
    .min(1, { message: 'templates.validation.nameRequired' })
    .max(NAME_MAX, { message: 'templates.validation.nameTooLong' })
    .refine((value) => !hasControlCharacters(value), { message: 'templates.validation.invalidCharacters' }))

const contentSchema = z.string().trim()
  .min(1, { message: 'templates.validation.contentRequired' })
  .max(CONTENT_MAX, { message: 'templates.validation.contentTooLong' })
const categorySchema = z.enum(TEMPLATE_CATEGORIES)
const tagsSchema = z.array(
  z.string()
    .transform((value) => value.normalize('NFKC').trim())
    .pipe(z.string()
      .min(1)
      .max(TAG_MAX, { message: 'templates.validation.tagTooLong' })
      .refine((value) => !hasControlCharacters(value), { message: 'templates.validation.invalidCharacters' })),
).max(TAGS_MAX, { message: 'templates.validation.tooManyTags' }).transform(dedupeTags)

const segmentsSchema = z.object({
  subject: z.string().max(10_000),
  composition: z.string().max(10_000),
  lighting: z.string().max(10_000),
  mood: z.string().max(10_000),
  style: z.string().max(10_000),
  technical: z.string().max(10_000),
  colorPalette: z.string().max(10_000),
  environment: z.string().max(10_000),
}).strict()

const platformVariantsSchema = z.object({
  dalle3: z.string().max(METADATA_TEXT_MAX).optional(),
  nano_banana: z.string().max(METADATA_TEXT_MAX).optional(),
}).strict()

function optionalDualModeSchema<const T extends readonly [string, ...string[]]>(options: T) {
  return z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('user'), value: z.enum(options) }).strict(),
    z.object({ mode: z.literal('system') }).strict(),
  ]).optional()
}

export const templateGeneratorSettingsSchema = z.object({
  language: z.enum(['en', 'id']).optional(),
  niche: z.string().min(3).max(300).optional(),
  category: z.enum(NICHE_CATEGORIES).optional(),
  usageContext: z.enum(['commercial', 'editorial', 'conceptual', 'abstract']).optional(),
  targetMarket: z.enum(['global', 'us', 'eu', 'asia', 'latin_america']).optional(),
  targetPlatform: z.enum(['dalle3', 'nano_banana', 'both']).optional(),
  aspectRatio: z.enum(['random', '1:1', '4:5', '2:3', '9:16', '3:2', '4:3', '16:9']).optional(),
  variationLevel: z.number().int().min(1).max(5).optional(),
  styleMode: z.enum(['user', 'system']).optional(),
  mood: optionalDualModeSchema(MOOD_OPTIONS),
  colorPalette: optionalDualModeSchema(COLOR_PALETTE_OPTIONS),
  artStyle: optionalDualModeSchema(ART_STYLE_OPTIONS),
  background: optionalDualModeSchema(BACKGROUND_OPTIONS),
  humanModel: optionalDualModeSchema(HUMAN_MODEL_OPTIONS),
  customInstructions: z.string().max(500).optional(),
  includeDiversity: z.boolean().optional(),
  allowTextSpace: z.boolean().optional(),
  includeNegativePrompts: z.boolean().optional(),
  includeKeywords: z.boolean().optional(),
}).strict()

const optionalMetadataShape = {
  negativePrompt: z.string().max(METADATA_TEXT_MAX).optional(),
  commercialKeywords: z.array(z.string().trim().min(1).max(500)).max(KEYWORDS_MAX).transform(dedupeTags).optional(),
  segments: segmentsSchema.optional(),
  platformVariants: platformVariantsSchema.optional(),
  generatorSettings: templateGeneratorSettingsSchema.optional(),
}

export const createTemplateSchema = z.object({
  name: nameSchema,
  content: contentSchema,
  category: categorySchema,
  tags: tagsSchema,
  source: z.enum(['manual', 'import', 'generator', 'history']).optional(),
  ...optionalMetadataShape,
}).strict()

export const updateTemplateSchema = z.object({
  id: z.string().min(1).max(128),
  name: nameSchema.optional(),
  content: contentSchema.optional(),
  category: categorySchema.optional(),
  tags: tagsSchema.optional(),
  source: z.enum(['manual', 'import', 'generator', 'history']).optional(),
  ...optionalMetadataShape,
}).strict()

export const templateFormSchema = z.object({
  name: nameSchema,
  content: contentSchema,
  category: z.string().min(1, { message: 'templates.validation.categoryRequired' }),
  tags: tagsSchema,
})

export type TemplateFormData = z.infer<typeof templateFormSchema>
