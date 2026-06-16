import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import pLimit from 'p-limit'
import { generateStructured, generateStructuredStream, generateCompletion } from '@/services/ai/aiService'
import type { AIConfig } from '@/features/settings/types'
import type { GeneratorOptions, GeneratedPrompt, QualityScore, StructuredPromptOutput, StylePresetKey } from '../types'

const qualityScoreSchema = z.object({
  commercialPotential: z.number().min(0).max(10),
  creativity: z.number().min(0).max(10),
  clarity: z.number().min(0).max(10),
  marketability: z.number().min(0).max(10),
  uniqueness: z.number().min(0).max(10),
})

const structuredPromptSchema = z.object({
  content: z.string().min(1),
  qualityScore: qualityScoreSchema
})

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

function generateMockQualityScore(): QualityScore {
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

// No longer needed
// async function evaluatePromptQuality(promptText: string, config: AIConfig): Promise<QualityScore> {
// ...
// }

export async function generatePrompts(
  options: GeneratorOptions,
  config: AIConfig,
  onPartialUpdate?: (index: number, partialData: Partial<StructuredPromptOutput>) => void
): Promise<GeneratedPrompt[]> {
  const actualNiche = options.niche || generateRandomNiche()
  const count = options.count
  const concurrencyLimit = 3
  const limit = pLimit(concurrencyLimit)

  const tasks = Array.from({ length: count }, async (_, i) => {
    return limit(async () => {
      const aspectRatio = options.aspectRatio === 'random'
        ? (['1:1', '4:5', '3:4', '16:9', '9:16', '2:3', '3:2'] as const)[Math.floor(Math.random() * 7)]
        : options.aspectRatio

      const stylePreset = options.stylePreset === 'random'
        ? (['commercial-photography', 'lifestyle', 'corporate', 'food', 'travel', 'technology', 'nature'] as const)[Math.floor(Math.random() * 7)]
        : options.stylePreset

      const promptTemplate = generatePromptContent(
        actualNiche,
        aspectRatio,
        stylePreset,
        options.customStyle,
      )
      
      const structuredPromptMsg = `Generate a high-quality stock photo prompt and evaluate its quality.
Return ONLY valid JSON matching this structure:
{
  "content": "prompt text goes here",
  "qualityScore": {
    "commercialPotential": 0.0,
    "creativity": 0.0,
    "clarity": 0.0,
    "marketability": 0.0,
    "uniqueness": 0.0
  }
}

Base requirements for the prompt:
"${promptTemplate}"`

      try {
        let genOutput: StructuredPromptOutput
        if (onPartialUpdate && config.provider !== 'gemini') { // Gemini adapter stream not implemented yet
          genOutput = await generateStructuredStream(
            structuredPromptMsg,
            structuredPromptSchema,
            config,
            (partial) => onPartialUpdate(i, partial)
          )
        } else {
          genOutput = await generateStructured(structuredPromptMsg, structuredPromptSchema, config)
        }

        const s = genOutput.qualityScore
        const overall = Math.round(((s.commercialPotential + s.creativity + s.clarity + s.marketability + s.uniqueness) / 5) * 10) / 10

        return {
          id: uuidv4(),
          content: genOutput.content,
          aspectRatio,
          niche: actualNiche,
          stylePreset,
          qualityScore: { ...s, overall },
          createdAt: Date.now(),
          tags: [],
          folderId: null,
        } as GeneratedPrompt
      } catch {
        // Fallback to random generation on AI error
        const mockScore = generateMockQualityScore()
        return {
          id: uuidv4(),
          content: promptTemplate,
          aspectRatio,
          niche: actualNiche,
          stylePreset,
          qualityScore: mockScore,
          createdAt: Date.now(),
          tags: [],
          folderId: null,
        } as GeneratedPrompt
      }
    })
  })

  return Promise.all(tasks)
}

export async function improvePrompt(
  content: string,
  options: GeneratorOptions,
  config: AIConfig,
  onPartialUpdate?: (partialData: Partial<StructuredPromptOutput>) => void
): Promise<GeneratedPrompt> {
  const improvementPrompt = `Improve the following stock photo prompt for better quality, clarity, and commercial potential.
Original prompt: "${content}"

Your task:
1. Fix contradictions (e.g., "single icon" vs "cityscape").
2. Enhance details and commercial appeal.
3. Return ONLY valid JSON matching this structure:
{
  "content": "improved prompt text goes here",
  "qualityScore": {
    "commercialPotential": 0.0,
    "creativity": 0.0,
    "clarity": 0.0,
    "marketability": 0.0,
    "uniqueness": 0.0
  }
}`

  try {
    let impOutput: StructuredPromptOutput
    if (onPartialUpdate && config.provider !== 'gemini') {
      impOutput = await generateStructuredStream(
        improvementPrompt,
        structuredPromptSchema,
        config,
        onPartialUpdate
      )
    } else {
      impOutput = await generateStructured(improvementPrompt, structuredPromptSchema, config)
    }

    const s = impOutput.qualityScore
    const overall = Math.round(((s.commercialPotential + s.creativity + s.clarity + s.marketability + s.uniqueness) / 5) * 10) / 10

    const aspectRatio = options.aspectRatio === 'random'
      ? (['1:1', '4:5', '3:4', '16:9', '9:16', '2:3', '3:2'] as const)[Math.floor(Math.random() * 7)]
      : options.aspectRatio

    return {
      id: uuidv4(),
      content: impOutput.content,
      aspectRatio,
      niche: options.niche || 'general',
      stylePreset: options.stylePreset,
      qualityScore: { ...s, overall },
      createdAt: Date.now(),
      tags: [],
      folderId: null,
    }
  } catch {
    // Fallback if AI fails
    const s = generateMockQualityScore()
    const aspectRatio = options.aspectRatio === 'random'
      ? (['1:1', '4:5', '3:4', '16:9', '9:16', '2:3', '3:2'] as const)[Math.floor(Math.random() * 7)]
      : options.aspectRatio

    return {
      id: uuidv4(),
      content,
      aspectRatio,
      niche: options.niche || 'general',
      stylePreset: options.stylePreset,
      qualityScore: s,
      createdAt: Date.now(),
      tags: [],
      folderId: null,
    }
  }
}

export async function fetchNicheIdeas(
  stylePreset: StylePresetKey,
  customStyle: string,
  config: AIConfig,
  usedIdeas: string[] = [],
  signal?: AbortSignal
): Promise<string[]> {
  let styleContext: string
  if (stylePreset === 'none' || stylePreset === 'random') {
    styleContext = 'These should be broad, covering diverse categories suitable for general stock photography.'
  } else if (stylePreset === 'custom') {
    styleContext = customStyle.trim()
      ? `These should be relevant to this style: ${customStyle}. Focus on niches that suit this aesthetic.`
      : 'These should be broad, covering diverse categories suitable for general stock photography.'
  } else {
    styleContext = `These should be specifically relevant to the '${stylePreset}' style/category for stock photography.`
  }

  const avoidList = usedIdeas.length > 0
    ? `\nAvoid these already-used ideas and anything conceptually similar to them:\n${usedIdeas.slice(-20).join(", ")}`
    : ''

  const prompt = `Generate exactly 8 unique, creative niche ideas for stock photography prompts.
${styleContext}${avoidList}
Return ONLY a JSON array of 8 short niche strings (2-5 words each).
Example: ["urban street fashion", "cozy home office", "organic farm harvest"]
No explanations, no markdown, just the JSON array.`

  try {
    const raw = await generateCompletion(prompt, { ...config, }, signal)
    const trimmed = raw.trim()

    try {
      const arrayMatch = trimmed.match(/\[[\s\S]*\]/)
      if (arrayMatch) {
        const parsed = JSON.parse(arrayMatch[0])
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(String).filter(Boolean)
        }
      }
    } catch {
      // fall through to line-split
    }

    const lines = trimmed.split(/[\n,]+/).map(s => s.replace(/^["'\s]+|["'\s]+$/g, '')).filter(Boolean)
    if (lines.length > 0) return lines
  } catch (err) {
    if ((err as Error).name === 'AbortError' || (err as Error).name === 'CanceledError') throw err
  }

  return []
}

export async function improveNicheInput(
  currentInput: string,
  config: AIConfig
): Promise<string> {
  const prompt = `Improve this stock photography niche/idea to be more vivid, specific, and optimized for generating high-quality stock images.
Original: "${currentInput}"
Return ONLY the improved niche text (2-8 words, no quotes, no explanation).
Make it more descriptive and commercially appealing while keeping the core concept.`

  try {
    const result = await generateCompletion(prompt, { ...config, })
    const trimmed = result.trim().replace(/^["']+|["']+$/g, '')
    return trimmed || currentInput
  } catch {
    return currentInput
  }
}
