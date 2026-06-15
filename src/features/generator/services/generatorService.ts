import { v4 as uuidv4 } from 'uuid'
import type { GeneratorOptions, GeneratedPrompt, QualityScore } from '../types'

const styleKeywords: Record<string, string[]> = {
  'commercial-photography': ['commercial', 'professional lighting', 'product-focused', 'clean background', 'high-end'],
  lifestyle: ['lifestyle', 'candid', 'natural lighting', 'authentic', 'everyday moments'],
  corporate: ['corporate', 'professional', 'office environment', 'business attire', 'modern workspace'],
  medical: ['medical', 'clinical', 'healthcare', 'sterile environment', 'professional medical'],
  food: ['food photography', 'culinary', 'appetizing', 'gourmet', 'food styling'],
  travel: ['travel', 'destination', 'wanderlust', 'landscape', 'cultural'],
  education: ['educational', 'academic', 'learning environment', 'classroom', 'study'],
  technology: ['technology', 'digital', 'modern tech', 'innovation', 'futuristic'],
  business: ['business', 'professional', 'corporate', 'entrepreneurship', 'office'],
  nature: ['nature', 'landscape', 'wildlife', 'outdoor', 'scenic'],
  'real-estate': ['real estate', 'architectural', 'interior design', 'property', 'luxury home'],
}

const nicheTemplates: Record<string, string[]> = {
  technology: [
    'A diverse team of engineers collaborating on cutting-edge technology in a modern innovation lab',
    'Futuristic smart city with autonomous vehicles and sustainable architecture at golden hour',
    'Close-up of a glowing circuit board with intricate connections and blue LED accents',
  ],
  business: [
    'Confident business professional presenting data analytics to colleagues in a modern boardroom',
    'Successful entrepreneur working on laptop in a minimalist coffee shop with city view',
    'Diverse group of professionals networking at a corporate event with branded backdrop',
  ],
  '': [
    'Professional workspace with natural lighting and modern ergonomic furniture arrangement',
    'Diverse group of people collaborating on creative projects in a bright modern office',
    'Aerial view of a bustling cityscape during golden hour with dramatic cloud formations',
  ],
}

const randomNiches = [
  'technology', 'business', 'healthcare', 'education', 'travel',
  'food', 'real estate', 'fitness', 'fashion', 'finance',
  'agriculture', 'transportation', 'energy', 'manufacturing', 'retail',
]

function generateRandomNiche(): string {
  return randomNiches[Math.floor(Math.random() * randomNiches.length)]
}

function generatePromptContent(
  niche: string,
  aspectRatio: string,
  stylePreset: string,
  customStyle: string,
): string {
  const keywords = stylePreset !== 'none' && stylePreset !== 'random' && stylePreset !== 'custom'
    ? styleKeywords[stylePreset] || []
    : []
  
  if (stylePreset === 'custom' && customStyle) {
    keywords.push(customStyle)
  }

  const templates = nicheTemplates[niche.toLowerCase()] || nicheTemplates['']
  const basePrompt = templates[Math.floor(Math.random() * templates.length)]

  const parts = [basePrompt]
  
  if (aspectRatio !== 'random') {
    parts.push(`aspect ratio ${aspectRatio}`)
  }

  if (keywords.length > 0) {
    parts.push(keywords.join(', '))
  }

  if (niche) {
    parts.push(`related to ${niche}`)
  }

  parts.push('stock photography, high quality, professional, well-composed')
  parts.push('8k resolution, detailed, sharp focus, natural lighting')

  return parts.join(', ')
}

function generateQualityScore(): QualityScore {
  const randomScore = () => Math.round((6 + Math.random() * 3.5) * 10) / 10
  const cp = randomScore()
  const cr = randomScore()
  const cl = randomScore()
  const m = randomScore()
  const u = randomScore()
  const overall = Math.round(((cp + cr + cl + m + u) / 5) * 10) / 10

  return {
    overall,
    commercialPotential: cp,
    creativity: cr,
    clarity: cl,
    marketability: m,
    uniqueness: u,
  }
}

export async function generatePrompts(options: GeneratorOptions): Promise<GeneratedPrompt[]> {
  const prompts: GeneratedPrompt[] = []
  const actualNiche = options.niche || generateRandomNiche()
  const count = options.count

  await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700))

  for (let i = 0; i < count; i++) {
    const aspectRatio = options.aspectRatio === 'random'
      ? (['1:1', '4:5', '3:4', '16:9', '9:16', '2:3', '3:2'] as const)[Math.floor(Math.random() * 7)]
      : options.aspectRatio

    const stylePreset = options.stylePreset === 'random'
      ? (['commercial-photography', 'lifestyle', 'corporate', 'food', 'travel', 'technology', 'nature'] as const)[Math.floor(Math.random() * 7)]
      : options.stylePreset

    const content = generatePromptContent(
      actualNiche,
      aspectRatio,
      stylePreset,
      options.customStyle,
    )

    prompts.push({
      id: uuidv4(),
      content,
      aspectRatio,
      niche: actualNiche,
      stylePreset,
      qualityScore: generateQualityScore(),
      createdAt: Date.now(),
    })
  }

  return prompts
}

export async function improvePrompt(
  content: string,
  options: GeneratorOptions,
): Promise<GeneratedPrompt> {
  const improvements = [
    'with more dramatic lighting and enhanced shadows',
    'featuring additional foreground elements for depth',
    'with a wider angle perspective showing more context',
    'with warmer color grading for a more inviting atmosphere',
    'with increased detail in textures and materials',
    'from a unique low-angle perspective for added impact',
  ]

  await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500))

  const improvement = improvements[Math.floor(Math.random() * improvements.length)]
  const aspectRatio = options.aspectRatio === 'random'
    ? (['1:1', '4:5', '3:4', '16:9', '9:16', '2:3', '3:2'] as const)[Math.floor(Math.random() * 7)]
    : options.aspectRatio

  return {
    id: uuidv4(),
    content: `${content}, ${improvement}`,
    aspectRatio,
    niche: options.niche || 'general',
    stylePreset: options.stylePreset,
    qualityScore: generateQualityScore(),
    createdAt: Date.now(),
  }
}

export function getRandomNiche(): string {
  return generateRandomNiche()
}
