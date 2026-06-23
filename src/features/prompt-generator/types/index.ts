// ─── Input Types ────────────────────────────────────────────────────────────

export type Language = 'en' | 'id'

export type UsageContext = 'commercial' | 'editorial' | 'conceptual' | 'abstract'

export type TargetMarket = 'global' | 'us' | 'eu' | 'asia' | 'latin_america'

export type ImagePlatform = 'dalle3' | 'nano_banana' | 'both'

export type BatchSize = 1 | 3 | 5 | 10

export type NicheCategory =
  | 'technology'
  | 'business'
  | 'nature'
  | 'lifestyle'
  | 'healthcare'
  | 'food'
  | 'travel'
  | 'education'
  | 'abstract'
  | 'people'
  | 'architecture'
  | 'other'

export type AspectRatio =
  | 'random'
  | '1:1'
  | '4:5'
  | '2:3'
  | '9:16'
  | '3:2'
  | '4:3'
  | '16:9'

export const MOOD_OPTIONS = [
  'none', 'peaceful', 'joyful', 'energetic', 'dramatic', 'dark_moody',
  'mysterious', 'romantic', 'melancholic', 'professional_corporate',
  'playful', 'serene', 'tense_suspenseful', 'nostalgic', 'futuristic',
] as const

export const COLOR_PALETTE_OPTIONS = [
  'none', 'warm_tones', 'cool_tones', 'monochrome_bw', 'pastel',
  'vibrant_saturated', 'earth_tones', 'high_contrast', 'muted_desaturated',
  'golden_hour_warm', 'cool_blue', 'jewel_tones',
] as const

export const ART_STYLE_OPTIONS = [
  'none', 'photorealistic', 'cinematic_photography', 'editorial_photography',
  'minimalist', 'vintage_retro', 'modern_commercial', 'documentary_style',
  'fine_art', 'studio_product_photography', 'lifestyle_photography',
] as const

export const BACKGROUND_OPTIONS = [
  'none', 'studio_plain_backdrop', 'urban_cityscape', 'nature_outdoor',
  'office_corporate_interior', 'home_domestic_interior', 'abstract_gradient',
  'industrial', 'blurred_bokeh', 'isolated_white_transparent',
] as const

export const HUMAN_MODEL_OPTIONS = [
  'no_people', 'any_person', 'man', 'woman', 'child', 'group_of_people',
  'couple', 'elderly_person', 'teenager',
] as const

export type MoodOption = typeof MOOD_OPTIONS[number]
export type ColorPaletteOption = typeof COLOR_PALETTE_OPTIONS[number]
export type ArtStyleOption = typeof ART_STYLE_OPTIONS[number]
export type BackgroundOption = typeof BACKGROUND_OPTIONS[number]
export type HumanModelOption = typeof HUMAN_MODEL_OPTIONS[number]

export type DualModeField<T extends string> =
  | { mode: 'user'; value: T }
  | { mode: 'system' }

export const OPTION_LABELS: Record<string, string> = {
  none: 'None',
  peaceful: 'Peaceful',
  joyful: 'Joyful',
  energetic: 'Energetic',
  dramatic: 'Dramatic',
  dark_moody: 'Dark Moody',
  mysterious: 'Mysterious',
  romantic: 'Romantic',
  melancholic: 'Melancholic',
  professional_corporate: 'Professional Corporate',
  playful: 'Playful',
  serene: 'Serene',
  tense_suspenseful: 'Tense Suspenseful',
  nostalgic: 'Nostalgic',
  futuristic: 'Futuristic',
  warm_tones: 'Warm Tones',
  cool_tones: 'Cool Tones',
  monochrome_bw: 'Monochrome B&W',
  pastel: 'Pastel',
  vibrant_saturated: 'Vibrant Saturated',
  earth_tones: 'Earth Tones',
  high_contrast: 'High Contrast',
  muted_desaturated: 'Muted Desaturated',
  golden_hour_warm: 'Golden Hour Warm',
  cool_blue: 'Cool Blue',
  jewel_tones: 'Jewel Tones',
  photorealistic: 'Photorealistic',
  cinematic_photography: 'Cinematic Photography',
  editorial_photography: 'Editorial Photography',
  minimalist: 'Minimalist',
  vintage_retro: 'Vintage Retro',
  modern_commercial: 'Modern Commercial',
  documentary_style: 'Documentary Style',
  fine_art: 'Fine Art',
  studio_product_photography: 'Studio Product Photography',
  lifestyle_photography: 'Lifestyle Photography',
  studio_plain_backdrop: 'Studio Plain Backdrop',
  urban_cityscape: 'Urban Cityscape',
  nature_outdoor: 'Nature Outdoor',
  office_corporate_interior: 'Office Corporate Interior',
  home_domestic_interior: 'Home Domestic Interior',
  abstract_gradient: 'Abstract Gradient',
  industrial: 'Industrial',
  blurred_bokeh: 'Blurred Bokeh',
  isolated_white_transparent: 'Isolated White Transparent',
  no_people: 'No People',
  any_person: 'Any Person',
  man: 'Man',
  woman: 'Woman',
  child: 'Child',
  group_of_people: 'Group of People',
  couple: 'Couple',
  elderly_person: 'Elderly Person',
  teenager: 'Teenager',
}

export interface GeneratorInput {
  language: Language
  niche: string
  category?: NicheCategory
  batchSize: BatchSize
  usageContext: UsageContext
  targetMarket: TargetMarket
  targetPlatform: ImagePlatform
  aspectRatio: AspectRatio
  variationLevel: number
  mood: DualModeField<MoodOption>
  colorPalette: DualModeField<ColorPaletteOption>
  artStyle: DualModeField<ArtStyleOption>
  background: DualModeField<BackgroundOption>
  humanModel: DualModeField<HumanModelOption>
  customInstructions: string
  includeHistory: boolean
  includeHistoryCount: number
  includeDiversity: boolean
  allowTextSpace: boolean
  basePromptReference?: string
  includeNegativePrompts: boolean
  includeKeywords: boolean
}

// ─── Output Types ───────────────────────────────────────────────────────────

export interface PromptSegments {
  subject: string        // Main subject — who/what is in the image
  composition: string    // Framing, angle, perspective, rule of thirds etc.
  lighting: string       // Light source, quality, direction, color temperature
  mood: string           // Emotional tone and atmosphere
  style: string          // Photographic style/genre (editorial, commercial, candid…)
  technical: string      // Camera feel, depth of field, lens type, rendering style
  colorPalette: string   // Color grading direction and palette
  environment: string    // Setting, background, context
}

export interface PlatformVariants {
  dalle3: string         // Prompt optimized for DALL-E 3 / GPT Image 2
  nano_banana: string    // Prompt optimized for Nano Banana Pro / Nano Banana 2
}

export interface AdobeStockScoreBreakdown {
  commercialViability: number    // 0–25
  technicalQuality: number       // 0–25
  compositionStrength: number    // 0–25
  marketDiversity: number        // 0–25
}

export interface AdobeStockScore {
  total: number                      // 0–100 (sum of breakdown)
  breakdown: AdobeStockScoreBreakdown
  warnings: string[]                 // Issues that lower the score or risk rejection
  suggestions: string[]              // Actionable improvements
}

export interface VariationAnchors {
  primaryVariation: string    // Which dimension is the "star" pivot for this variant
  compositionStyle: string    // The anchored composition approach
  lightingType: string        // The anchored lighting type
  directionHint: string       // Overall creative direction hint (e.g. 'dramatic', 'minimal')
}

export interface GeneratedPrompt {
  id: string                        // UUID v4
  variantIndex: number              // Position in batch (1-based)
  batchId: string                   // UUID linking all prompts from same generation
  segments: PromptSegments
  negativePrompt: string            // Auto-generated, context-aware, platform-formatted
  platformVariants: PlatformVariants
  fullPrompt: string                // Default full prompt (dalle3 variant by default)
  commercialKeywords: string[]      // Suggested Adobe Stock keywords (10–15)
  adobeScore: AdobeStockScore
  variationAnchors: VariationAnchors
  generatorInput: GeneratorInput    // Input reference — stored with prompt
  createdAt: Date
  isFavorite: boolean               // Default: false
  userNotes?: string                // Optional user annotation
  legacy?: boolean                  // true = migrated from old schema (no segments/score)
  isDuplicate?: boolean
  duplicateRef?: string
}

export interface GeneratedPromptBatch {
  batchId: string
  prompts: GeneratedPrompt[]
  generatorInput: GeneratorInput
  generatedAt: Date
}

// ─── Engine Internal Types ───────────────────────────────────────────────────

export type VariationPivot =
  | 'lighting'
  | 'composition'
  | 'mood_atmosphere'
  | 'technical_feel'
  | 'environment'
  | 'color_palette'

export interface VariationStrategy {
  index: number              // Prompt's position in batch
  primaryPivot: VariationPivot
  directionHint: string      // Creative direction adjective
  anchoredDimensions: Partial<Record<VariationPivot, string>>
}

export interface PromptGeneratorError {
  code: 'LLM_TIMEOUT' | 'PARSE_FAILURE' | 'PARTIAL_BATCH' | 'PROVIDER_ERROR'
  message: string
  rawResponse?: string       // For PARSE_FAILURE — attach raw LLM output
  partialPrompts?: GeneratedPrompt[]  // For PARTIAL_BATCH
}

// ─── Platform Spec Type ──────────────────────────────────────────────────────

export interface PlatformSpec {
  id: ImagePlatform
  displayName: string
  maxPromptLength: number
  supportsNegativePrompt: boolean
  negativePromptFormat: 'inline' | 'separate_field' | 'none'
  promptStyle: 'natural_language' | 'weighted_tags' | 'hybrid'
  notes: string
}
