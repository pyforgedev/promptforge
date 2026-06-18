// Adobe Stock content guidelines reference.
// Source: https://helpx.adobe.com/stock/contributor/help/content-guidelines.html
// These rules directly inform AdobeStockScorer logic.

export const PROHIBITED_CONTENT_KEYWORDS = [
  // Brand names
  'nike', 'adidas', 'apple', 'google', 'microsoft', 'coca-cola', 'pepsi',
  'mcdonalds', 'starbucks', 'amazon', 'facebook', 'instagram', 'twitter',
  // Would add 50+ more in real implementation
]

export const CELEBRITY_SIGNALS = [
  // Signals that a prompt may be requesting a recognizable person
  // Used to trigger a warning in the scorer
  'famous', 'celebrity', 'president', 'politician', 'ceo of',
]

export const COMMERCIAL_APPEAL_BOOSTERS = [
  'universal workplace scenario',
  'diverse representation',
  'copy space for text',
  'clean background',
  'aspirational lifestyle',
  'seasonal theme',
  'conceptual business',
  'health and wellness',
  'technology and innovation',
  'sustainability and environment',
] as const

export const SCORING_WEIGHTS = {
  commercialViability: 25,
  technicalQuality: 25,
  compositionStrength: 25,
  marketDiversity: 25,
} as const

export const COMMON_REJECTION_REASONS = [
  'Brand logos or trademarks visible in image',
  'Recognizable person without model release',
  'Technically poor quality (blur, noise, artifacts)',
  'Limited commercial use case — too niche or regional',
  'Copyrighted character or artwork',
  'Offensive or discriminatory content',
  'Misleading or factually incorrect depiction',
] as const

export const SCORE_THRESHOLDS = {
  high: 80,    // Green badge — strong commercial prospect
  medium: 60,  // Yellow badge — acceptable, improvements suggested
  low: 0,      // Red badge — significant concerns
} as const
