import type { GeneratorInput, ImagePlatform } from '../types'
import { OPTION_LABELS } from '../types'
import { PLATFORM_SPECS } from '../constants/platformSpecs'
import {
  COMPOSITION_STYLES,
  LIGHTING_TYPES,
  MOOD_DESCRIPTORS,
  TECHNICAL_STYLES,
  COLOR_PALETTES,
  ENVIRONMENTS,
  PHOTOGRAPHIC_STYLES,
} from '../constants/photographyDimensions'
import {
  buildVariationPlan,
  resolveStatus,
  pickRandom,
  type VariationPlan,
  type PoolDimension,
} from './VariationStrategyEngine'

const SYSTEM_PROMPT = `You are a senior stock photography art director and AI image prompt engineer with \
10+ years of experience creating commercially successful images for Adobe Stock, \
Getty Images, and Shutterstock.

Your specialty is crafting precise image generation prompts that:
- Produce technically excellent, commercially viable photographs
- Achieve high acceptance rates on premium stock platforms (80%+ acceptance rate)
- Represent diverse humanity authentically without tokenism
- Balance strong artistic vision with broad market appeal and licensing value

You think like a photo buyer: you know what editorial teams, marketing departments, \
and creative agencies search for. You know that an image with generic composition \
and unspecified lighting will never sell. You know that the difference between \
a stock photo that earns $0.25 and one that earns $250 is specificity, story, \
and commercial intentionality.

When generating prompts, you always:
1. Specify lighting with professional precision (not just 'good light' — name the setup)
2. Name the compositional approach (not just 'nice framing' — rule of thirds? leading lines?)
3. Define the technical feel (shallow DOF? deep focus? film grain? cinematic widescreen?)
4. Establish emotional atmosphere with specific adjectives
5. Avoid anything that would cause platform rejection (brand names, celebrity likenesses, \
controversial symbols, explicit content)
6. Think about who would buy this image and why`

const TARGET_PLATFORM_DESCRIPTIONS: Record<ImagePlatform, string> = {
  dalle3: 'DALL-E 3 / GPT Image 2 — natural language, flowing descriptive prose, no tag syntax',
  nano_banana: 'Nano Banana Pro / Nano Banana 2 — natural language, optimized for Nano Banana Pro (2000 character limit)',
  both: 'DALL-E 3 and Nano Banana Pro — write the full_prompt in natural language (DALL-E optimized), the platform adapter will handle Nano Banana formatting separately',
}

const PHOTOGRAPHY_DIMENSIONS_REFERENCE = {
  composition_styles: COMPOSITION_STYLES,
  lighting_types: LIGHTING_TYPES,
  mood_descriptors: MOOD_DESCRIPTORS,
  technical_styles: TECHNICAL_STYLES,
  color_palettes: COLOR_PALETTES,
  environments: ENVIRONMENTS,
  photographic_styles: PHOTOGRAPHIC_STYLES,
}

const OUTPUT_JSON_SCHEMA = `{
  "prompts": [
    {
      "variant_id": <integer, 1-based>,
      "variation_anchors": {
        "primary_variation": "<the pivot dimension for this variant>",
        "composition_style": "<the anchored or varied composition approach>",
        "lighting_type": "<the anchored or varied lighting type>"
      },
      "subject": "<specific, vivid subject description — who or what, in detail>",
      "composition": "<framing, angle, perspective, named compositional technique>",
      "lighting": "<lighting source, quality, direction, color temperature, intensity>",
      "mood": "<emotional tone, atmosphere, energy level, psychological feel>",
      "style": "<photographic genre and style — editorial, commercial, documentary, etc.>",
      "technical": "<camera/lens feel, depth of field, motion, rendering aesthetic>",
      "color_palette": "<color grading direction, dominant palette, temperature>",
      "environment": "<setting, background, location context, time of day if relevant>",
      "negative_prompt": "<specific elements to suppress for this variant — be precise>",
      "full_prompt": "<complete assembled prompt, optimized for the target platform, minimum 60 words>",
      "commercial_keywords": ["<keyword1>", "<keyword2>", ...],
      "adobe_compliance_notes": "<one sentence self-assessment of commercial viability>"
    }
  ]
}`

const DIMENSION_LABELS: Record<PoolDimension, string> = {
  lighting: 'Lighting',
  camera_angle: 'Camera Angle / Shot Type',
  composition: 'Composition',
  background: 'Background / Environment',
  color_palette: 'Color Palette / Grading',
  mood: 'Atmosphere / Mood',
  technical: 'Technical (lens, DOF)',
  subject_pose: 'Subject Pose / Action detail',
}

const DIMENSION_OPTIONS: Partial<Record<PoolDimension, readonly string[]>> = {
  lighting: LIGHTING_TYPES,
  composition: COMPOSITION_STYLES,
  color_palette: COLOR_PALETTES,
  mood: MOOD_DESCRIPTORS,
  technical: TECHNICAL_STYLES,
  background: ENVIRONMENTS,
}

function buildDimensionInstructions(input: GeneratorInput): string[] {
  const lines: string[] = []

  const moodStatus = resolveStatus(input.mood)
  const colorPaletteStatus = resolveStatus(input.colorPalette)
  const backgroundStatus = resolveStatus(input.background)
  const artStyleStatus = resolveStatus(input.artStyle)

  if (moodStatus === 'pinned') {
    const label = input.mood.mode === 'user'
      ? (OPTION_LABELS[(input.mood as { mode: 'user'; value: string }).value] ?? (input.mood as { mode: 'user'; value: string }).value)
      : ''
    lines.push(`Mood: ${label} — maintain this mood consistently across all variants.`)
  }

  if (colorPaletteStatus === 'pinned') {
    const label = input.colorPalette.mode === 'user'
      ? (OPTION_LABELS[(input.colorPalette as { mode: 'user'; value: string }).value] ?? (input.colorPalette as { mode: 'user'; value: string }).value)
      : ''
    lines.push(`Color Palette: ${label} — maintain this color palette consistently across all variants.`)
  }

  if (backgroundStatus === 'pinned') {
    const label = input.background.mode === 'user'
      ? (OPTION_LABELS[(input.background as { mode: 'user'; value: string }).value] ?? (input.background as { mode: 'user'; value: string }).value)
      : ''
    lines.push(`Background / Environment: ${label} — maintain this background consistently across all variants.`)
  }

  if (artStyleStatus === 'pinned') {
    const label = input.artStyle.mode === 'user'
      ? (OPTION_LABELS[(input.artStyle as { mode: 'user'; value: string }).value] ?? (input.artStyle as { mode: 'user'; value: string }).value)
      : ''
    lines.push(`Art Style: ${label} — apply this style consistently across all variants.`)
  }

  return lines
}

function buildVariantInstructions(
  _input: GeneratorInput,
  plan: VariationPlan,
  variantIndex: number,
): string[] {
  const lines: string[] = []

  for (const dim of plan.dimensionsToVary) {
    const options = DIMENSION_OPTIONS[dim]
    if (options && options.length > 0) {
      const chosen = pickRandom(options, variantIndex * 7 + plan.dimensionsToVary.indexOf(dim) * 3)
      lines.push(`${DIMENSION_LABELS[dim]}: vary across variants — this variant: ${chosen}.`)
    } else {
      lines.push(`${DIMENSION_LABELS[dim]}: vary this dimension creatively for this variant.`)
    }
  }

  return lines
}

export class MetaPromptBuilder {
  static build(
    input: GeneratorInput,
  ): { systemPrompt: string; userPrompt: string } {
    const plan = buildVariationPlan(input)
    const platformDescription = TARGET_PLATFORM_DESCRIPTIONS[input.targetPlatform]
    const platformSpec = input.targetPlatform !== 'both'
      ? PLATFORM_SPECS[input.targetPlatform]
      : null
    const platformNotes = platformSpec
      ? `PLATFORM NOTES: ${platformSpec.notes}`
      : `PLATFORM NOTES: ${PLATFORM_SPECS['dalle3'].notes}`

    const conditionalLines: string[] = []

    if (input.allowTextSpace) {
      conditionalLines.push(
        'COPY SPACE REQUIREMENT: At least one dimension of the composition must include significant negative space suitable for text overlay. Note this in the composition segment.',
      )
    }

    if (input.includeDiversity) {
      conditionalLines.push(
        'DIVERSITY REQUIREMENT: When human subjects are depicted, ensure meaningful diversity across the batch in terms of age, ethnicity, and gender. Avoid tokenism — diversity should feel natural to the scene, not forced.',
      )
    }

    if (!input.includeNegativePrompts) {
      conditionalLines.push(
        'NEGATIVE PROMPT EXCLUSION: Do NOT generate negative prompts. The "negative_prompt" field in the JSON response MUST be an empty string "".',
      )
    }

    if (!input.includeKeywords) {
      conditionalLines.push(
        'COMMERCIAL KEYWORDS EXCLUSION: Do NOT generate commercial keywords. The "commercial_keywords" field in the JSON response MUST be an empty array [].',
      )
    }

    if (input.targetPlatform === 'dalle3') {
      conditionalLines.push(
        'TARGET PLATFORM CONSTRAINT: The prompt is specifically and only for DALL-E 3. Focus the "full_prompt" field purely on natural descriptive language (no tag lists, maximum 4000 characters). Do not include any formatting or considerations for other engines.',
      )
    } else if (input.targetPlatform === 'nano_banana') {
      conditionalLines.push(
        'TARGET PLATFORM CONSTRAINT: The prompt is specifically and only for Nano Banana. Focus the "full_prompt" field on Nano Banana specifications (maximum 2000 characters). Do not include any formatting or considerations for DALL-E 3.',
      )
    }

    if (input.language && input.language !== 'en') {
      conditionalLines.push(
        `LANGUAGE: Generate descriptive field values in the user's language (language code: ${input.language}). All JSON keys must remain in English — only translate the string values for descriptive fields (subject, composition, lighting, mood, style, technical, color_palette, environment, full_prompt, adobe_compliance_notes).`,
      )
    }

    const globalDimensionLines = buildDimensionInstructions(input)

    const variantBlocks: string[] = []
    for (let i = 0; i < input.batchSize; i++) {
      const variantLines = buildVariantInstructions(input, plan, i)
      variantBlocks.push(`Variant ${i + 1}:\n${variantLines.map(l => `  - ${l}`).join('\n')}`)
    }

    const userPrompt = `Generate exactly ${input.batchSize} UNIQUE and DIVERGENT stock image prompts for:

CONCEPT: ${input.niche}
CATEGORY HINT: ${input.category ?? 'Not specified — infer from concept'}
USAGE CONTEXT: ${input.usageContext}
TARGET MARKET: ${input.targetMarket}
${conditionalLines.length > 0 ? conditionalLines.join('\n') + '\n' : ''}
TARGET PLATFORM: ${platformDescription}
${platformNotes}

VARIATION LEVEL: ${input.variationLevel}/5 — ${plan.numToVary} out of ${plan.availablePool.length} available dimensions are varied across variants.

DIMENSION INSTRUCTIONS — CONSISTENT ACROSS ALL VARIANTS:
${globalDimensionLines.length > 0 ? globalDimensionLines.map(l => `- ${l}`).join('\n') : '- (no pinned dimensions — all relevant dimensions are free for system to determine)'}

DIMENSION INSTRUCTIONS — PER VARIANT (dimensions to vary):
${variantBlocks.join('\n\n')}

PHOTOGRAPHY DIMENSION REFERENCE (use these as vocabulary):
${JSON.stringify(PHOTOGRAPHY_DIMENSIONS_REFERENCE, null, 2)}

${input.basePromptReference ? `REFERENCE PROMPT (use as creative anchor only):
The following is an existing prompt the user likes. Do NOT copy or \
paraphrase it. Use it as a creative reference point — understand its \
subject, mood, and style, then generate fresh and varied prompts \
inspired by that direction.
---
${input.basePromptReference}
---
` : ''}CRITICAL RULES:
1. No two prompts should feel like minor rewrites of each other — they should represent genuinely different creative approaches to the same concept
2. Every prompt MUST specify all 8 dimensions: subject, composition, lighting, mood, style, technical, color_palette, environment
3. Never include: brand names, trademark symbols, celebrity likenesses, copyrighted characters, explicit content, hate symbols
4. Think about the end buyer: who licenses this image, and for what purpose?
5. The commercial_keywords array should contain 10–15 precise, searchable terms that a stock photo buyer would actually type
${input.customInstructions ? `
ADDITIONAL USER INSTRUCTIONS:
${input.customInstructions}
` : ''}
OUTPUT REQUIREMENTS:
- Respond ONLY with valid JSON
- No markdown formatting, no code blocks, no backtick fences
- No preamble or explanation before or after the JSON
- Start your response with { and end with }
- The JSON must exactly match this schema:

${OUTPUT_JSON_SCHEMA}`

    return { systemPrompt: SYSTEM_PROMPT, userPrompt }
  }

  static buildRetryPrompt(
    rawResponse: string,
    input: GeneratorInput,
  ): string {
    const parseError = (() => {
      try {
        JSON.parse(rawResponse.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim())
        return 'Response did not match the required schema'
      } catch (e) {
        return e instanceof Error ? e.message : 'Unknown parse error'
      }
    })()

    return `Your previous response could not be parsed as valid JSON.

Parse error: ${parseError}

Rules:
- Start your response with { and end with }
- No markdown, no backtick code blocks, no explanatory text
- Every string value must use standard JSON double-quoted strings
- Arrays use [] brackets
- Do not add trailing commas

Generate the same ${input.batchSize} prompts for concept: "${input.niche}"

Use the exact same JSON schema as before. Output only the JSON object.`
  }
}
