// NegativePromptGenerator — builds context-aware, platform-formatted negative prompts.
// Phase 3.1

import type { GeneratedPrompt, ImagePlatform } from '../types'

const UNIVERSAL_NEGATIVES = [
  'blurry',
  'out of focus',
  'watermark',
  'text overlay',
  'signature',
  'logo',
  'low quality',
  'pixelated',
  'noise',
  'heavy grain',
  'oversaturated',
  'overexposed',
  'underexposed',
  'distorted',
  'deformed',
  'jpeg artifacts',
  'compression artifacts',
]

const STYLE_NEGATIVES: Record<string, string[]> = {
  portrait: [
    'bad anatomy',
    'extra fingers',
    'face distortion',
    'asymmetrical eyes',
    'skin artifacts',
    'uncanny valley',
    'extra limbs',
    'malformed hands',
  ],
  architecture: [
    'distorted perspective',
    'impossible geometry',
    'leaning buildings',
    'warped lines',
    'fisheye distortion',
  ],
  nature: [
    'artificial looking',
    'over-processed HDR',
    'fake colors',
    'plastic textures',
    'over-sharpened',
    'unnatural saturation',
  ],
  food: [
    'unappetizing presentation',
    'wilted food',
    'unnatural colors',
    'dirty surfaces',
    'poor plating',
  ],
  technology: [
    'unrealistic screens',
    'wrong text on displays',
    'broken interfaces',
    'glitchy elements',
  ],
  fashion: [
    'poor styling',
    'wrinkled clothing',
    'mismatched colors',
    'unflattering pose',
  ],
  aerial: [
    'motion blur',
    'horizon tilt',
    'lens distortion',
    'haze artifacts',
  ],
}

const COMMERCIAL_NEGATIVES = [
  'visible brand logos',
  'brand names',
  'trademarks',
  'copyrighted symbols',
  'celebrity faces',
  'recognizable persons',
]

function detectStyleCategory(style: string): string | null {
  const lower = style.toLowerCase()
  if (lower.includes('portrait') || lower.includes('person') || lower.includes('people')) return 'portrait'
  if (lower.includes('architecture') || lower.includes('building') || lower.includes('interior')) return 'architecture'
  if (lower.includes('nature') || lower.includes('landscape') || lower.includes('wildlife')) return 'nature'
  if (lower.includes('food') || lower.includes('beverage') || lower.includes('culinary')) return 'food'
  if (lower.includes('technology') || lower.includes('tech') || lower.includes('digital')) return 'technology'
  if (lower.includes('fashion') || lower.includes('editorial')) return 'fashion'
  if (lower.includes('aerial') || lower.includes('drone')) return 'aerial'
  return null
}

function buildLayeredNegatives(
  prompt: GeneratedPrompt,
  includeCommercial: boolean,
): string[] {
  const terms: string[] = [...UNIVERSAL_NEGATIVES]

  const styleCategory = detectStyleCategory(prompt.segments.style)
  if (styleCategory && STYLE_NEGATIVES[styleCategory]) {
    terms.push(...STYLE_NEGATIVES[styleCategory])
  }

  if (includeCommercial) {
    terms.push(...COMMERCIAL_NEGATIVES)
  }

  return [...new Set(terms)]
}

function formatForDalle3(terms: string[]): string {
  return `Avoid: ${terms.join(', ')}.`
}

function formatForNanaBanana(terms: string[]): string {
  return terms.join(', ')
}

export function generateNegativePrompt(
  prompt: GeneratedPrompt,
  platform: ImagePlatform,
): string {
  if (prompt.generatorInput.includeNegativePrompts === false) {
    return ''
  }
  const isCommercial = prompt.generatorInput.usageContext === 'commercial'
  const terms = buildLayeredNegatives(prompt, isCommercial)

  if (platform === 'dalle3') {
    return formatForDalle3(terms)
  }

  return formatForNanaBanana(terms)
}
