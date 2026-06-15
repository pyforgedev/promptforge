export type AspectRatio =
  | 'random'
  | '1:1'
  | '4:5'
  | '3:4'
  | '16:9'
  | '9:16'
  | '2:3'
  | '3:2'

export type StylePresetKey =
  | 'none'
  | 'random'
  | 'custom'
  | 'commercial-photography'
  | 'lifestyle'
  | 'corporate'
  | 'medical'
  | 'food'
  | 'travel'
  | 'education'
  | 'technology'
  | 'business'
  | 'nature'
  | 'real-estate'

export type VariationCount = 1 | 3 | 5 | 10

export interface GeneratorOptions {
  aspectRatio: AspectRatio
  niche: string
  stylePreset: StylePresetKey
  customStyle: string
  count: VariationCount
}

export interface QualityScore {
  overall: number
  commercialPotential: number
  creativity: number
  clarity: number
  marketability: number
  uniqueness: number
}

export interface GeneratedPrompt {
  id: string
  content: string
  aspectRatio: AspectRatio
  niche: string
  stylePreset: StylePresetKey
  qualityScore: QualityScore
  createdAt: number
}
