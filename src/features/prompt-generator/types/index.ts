// ─── Input Types ────────────────────────────────────────────────────────────

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

export interface GeneratorInput {
  niche: string                  // Required. Free-form idea/niche text.
  category?: NicheCategory       // Optional category hint.
  batchSize: BatchSize           // Default: 5
  usageContext: UsageContext     // Default: 'commercial'
  targetMarket: TargetMarket     // Default: 'global'
  targetPlatform: ImagePlatform  // Default: 'both'
  includeDiversity: boolean      // Default: true
  moodPreference?: string        // Optional. e.g. 'calm', 'dramatic', 'energetic'
  allowTextSpace: boolean        // Default: false. Reserve copy space in composition.
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
