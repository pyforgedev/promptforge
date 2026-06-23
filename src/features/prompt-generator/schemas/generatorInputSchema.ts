import { z } from 'zod'
import type { GeneratorInput } from '../types'
import { MOOD_OPTIONS, COLOR_PALETTE_OPTIONS, ART_STYLE_OPTIONS, BACKGROUND_OPTIONS, HUMAN_MODEL_OPTIONS } from '../types'

function dualModeSchema<T extends readonly string[]>(options: T) {
  return z.discriminatedUnion('mode', [
    z.object({
      mode: z.literal('user'),
      value: z.enum(options),
    }),
    z.object({
      mode: z.literal('system'),
    }),
  ])
}

const moodSchema = dualModeSchema(MOOD_OPTIONS)
const colorPaletteSchema = dualModeSchema(COLOR_PALETTE_OPTIONS)
const artStyleSchema = dualModeSchema(ART_STYLE_OPTIONS)
const backgroundSchema = dualModeSchema(BACKGROUND_OPTIONS)
const humanModelSchema = dualModeSchema(HUMAN_MODEL_OPTIONS)

export const generatorInputSchema = z.object({
  language: z.enum(['en', 'id']),
  niche: z.string()
    .min(3, 'Niche must be at least 3 characters')
    .max(300, 'Niche must be under 300 characters'),
  category: z.enum([
    'technology', 'business', 'nature', 'lifestyle', 'healthcare',
    'food', 'travel', 'education', 'abstract', 'people', 'architecture', 'other'
  ]).optional(),
  batchSize: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(10)]),
  usageContext: z.enum(['commercial', 'editorial', 'conceptual', 'abstract']),
  targetMarket: z.enum(['global', 'us', 'eu', 'asia', 'latin_america']),
  targetPlatform: z.enum(['dalle3', 'nano_banana', 'both']),
  aspectRatio: z.enum(['random', '1:1', '4:5', '2:3', '9:16', '3:2', '4:3', '16:9']),
  variationLevel: z.number().int().min(1).max(5),
  styleMode: z.enum(['user', 'system']).default('user'),
  mood: moodSchema.optional().default({ mode: 'user', value: 'none' }),
  colorPalette: colorPaletteSchema.optional().default({ mode: 'user', value: 'none' }),
  artStyle: artStyleSchema.optional().default({ mode: 'user', value: 'none' }),
  background: backgroundSchema.optional().default({ mode: 'user', value: 'none' }),
  humanModel: humanModelSchema.optional().default({ mode: 'user', value: 'no_people' }),
  customInstructions: z.string().max(500).default(''),
  includeHistory: z.boolean(),
  includeHistoryCount: z.number().int().min(5).max(50),
  includeDiversity: z.boolean(),
  allowTextSpace: z.boolean(),
  basePromptReference: z.string().max(2000).optional(),
  includeNegativePrompts: z.boolean(),
  includeKeywords: z.boolean(),
}) satisfies z.ZodType<GeneratorInput>

export const generatorInputDefaults: GeneratorInput = {
  language: 'en',
  niche: '',
  category: undefined,
  batchSize: 5,
  usageContext: 'commercial',
  targetMarket: 'global',
  targetPlatform: 'both',
  aspectRatio: 'random',
  variationLevel: 3,
  styleMode: 'user',
  mood: { mode: 'user', value: 'none' },
  colorPalette: { mode: 'user', value: 'none' },
  artStyle: { mode: 'user', value: 'none' },
  background: { mode: 'user', value: 'none' },
  humanModel: { mode: 'user', value: 'no_people' },
  customInstructions: '',
  includeHistory: false,
  includeHistoryCount: 20,
  includeDiversity: true,
  allowTextSpace: false,
  basePromptReference: undefined,
  includeNegativePrompts: true,
  includeKeywords: true,
}