import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import pLimit from 'p-limit'
import { generateCompletion, generateStructured, generateStructuredStream } from '@/services/ai/aiService'
import type { AIConfig } from '@/features/settings/types'
import type { GeneratorOptions, GeneratedPrompt, QualityScore, StructuredPromptOutput } from '../types'

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

      let output: StructuredPromptOutput | null = null

      try {
        if (onPartialUpdate && config.provider !== 'gemini') { // Gemini adapter stream not implemented yet
          output = await generateStructuredStream(
            structuredPromptMsg,
            structuredPromptSchema,
            config,
            (partial) => onPartialUpdate(i, partial)
          )
        } else {
          output = await generateStructured(structuredPromptMsg, structuredPromptSchema, config)
        }
      } catch (error) {
        console.warn(`Generation failed for item ${i}, using fallback.`, error)
        const mockScore = generateMockQualityScore()
        output = {
          content: promptTemplate, // fallback to template
          qualityScore: {
            commercialPotential: mockScore.commercialPotential,
            creativity: mockScore.creativity,
            clarity: mockScore.clarity,
            marketability: mockScore.marketability,
            uniqueness: mockScore.uniqueness
          }
        }
      }

      const s = output.qualityScore
      const overall = Math.round(((s.commercialPotential + s.creativity + s.clarity + s.marketability + s.uniqueness) / 5) * 10) / 10

      return {
        id: uuidv4(),
        content: output.content,
        aspectRatio,
        niche: actualNiche,
        stylePreset,
        qualityScore: { ...s, overall },
        createdAt: Date.now(),
      } as GeneratedPrompt
    })
  })

  return Promise.all(tasks)
}

function parseImprovedPrompt(rawOutput: string, originalPrompt: string): string {
  // 1. Remove "New prompt:", "Improved prompt:", etc.
  let text = rawOutput.replace(/^(?:new|improved|final|enhanced)\s*prompt:\s*/i, '').trim()

  // 2. Extract content from backticks or quotes if they wrap the entire output
  const wrapMatch = text.match(/^[`"'](.+)[`"']$/s)
  if (wrapMatch?.[1]) {
    text = wrapMatch[1].trim()
  }

  // 3. Extract text after common indicators if present (like "New prompt: `...`")
  const patterns = [
    /New prompt:\s*[`"']?([^`"']+)`?"?/i,
    /Improved prompt:\s*[`"']?([^`"']+)`?"?/i,
    /Final prompt:\s*[`"']?([^`"']+)`?"?/i,
  ]

  for (const pattern of patterns) {
    const match = rawOutput.match(pattern)
    if (match?.[1]) {
      return match[1].trim()
    }
  }

  // 4. If output contains reasoning (more than one sentence or starts with reasoning patterns), 
  // try to find the prompt part. Usually prompts for AI art are long comma-separated strings.
  if (text.toLowerCase().includes('clash') || text.toLowerCase().includes('drop') || text.includes('\n')) {
    const lines = text.split('\n')
    // Search for lines that look like a prompt (long, many commas, starts with keywords)
    const promptLine = lines.find(l => l.includes(',') && l.length > 20)
    if (promptLine) return promptLine.trim()
  }

  return text || originalPrompt
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

  let output: StructuredPromptOutput | null = null

  try {
    if (onPartialUpdate && config.provider !== 'gemini') {
      output = await generateStructuredStream(
        improvementPrompt,
        structuredPromptSchema,
        config,
        onPartialUpdate
      )
    } else {
      output = await generateStructured(improvementPrompt, structuredPromptSchema, config)
    }
  } catch (error) {
    console.warn(`Improvement failed, using fallback.`, error)
    const mockScore = generateMockQualityScore()
    output = {
      content, // fallback to original
      qualityScore: {
        commercialPotential: mockScore.commercialPotential,
        creativity: mockScore.creativity,
        clarity: mockScore.clarity,
        marketability: mockScore.marketability,
        uniqueness: mockScore.uniqueness
      }
    }
  }

  const s = output.qualityScore
  const overall = Math.round(((s.commercialPotential + s.creativity + s.clarity + s.marketability + s.uniqueness) / 5) * 10) / 10

  const aspectRatio = options.aspectRatio === 'random'
    ? (['1:1', '4:5', '3:4', '16:9', '9:16', '2:3', '3:2'] as const)[Math.floor(Math.random() * 7)]
    : options.aspectRatio

  return {
    id: uuidv4(),
    content: output.content,
    aspectRatio,
    niche: options.niche || 'general',
    stylePreset: options.stylePreset,
    qualityScore: { ...s, overall },
    createdAt: Date.now(),
  }
}

export function getRandomNiche(): string {
  return generateRandomNiche()
}
