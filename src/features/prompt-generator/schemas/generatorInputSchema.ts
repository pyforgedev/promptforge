import { z } from 'zod'
import type { GeneratorInput } from '../types'

export const generatorInputSchema = z.object({
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
  includeDiversity: z.boolean(),
  moodPreference: z.string().max(100).optional(),
  allowTextSpace: z.boolean(),
  basePromptReference: z.string().max(2000).optional(),
}) satisfies z.ZodType<GeneratorInput>

export const generatorInputDefaults: GeneratorInput = {
  niche: '',
  category: undefined,
  batchSize: 5,
  usageContext: 'commercial',
  targetMarket: 'global',
  targetPlatform: 'both',
  includeDiversity: true,
  moodPreference: undefined,
  allowTextSpace: false,
  basePromptReference: undefined,
}
