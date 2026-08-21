import { templateGeneratorSettingsSchema } from '@/features/templates/utils/templateValidators'
import type { CreateTemplateInput, TemplateGeneratorSettings } from '@/features/templates/types'
import type { GeneratedPrompt, GeneratorInput } from '@/features/prompt-generator/types'
import type { HistoryTemplateSource } from '@/services/storage/history'
import { isNicheCategory } from '@/features/templates/types'

export function templateSettingsToGeneratorPatch(
  settings: TemplateGeneratorSettings,
): Partial<GeneratorInput> {
  const parsed = templateGeneratorSettingsSchema.safeParse(settings)
  if (!parsed.success) return {}
  const value = parsed.data
  const patch: Partial<GeneratorInput> = {}
  if (value.language !== undefined) patch.language = value.language
  if (value.niche !== undefined) patch.niche = value.niche
  if (value.category !== undefined) patch.category = value.category
  if (value.usageContext !== undefined) patch.usageContext = value.usageContext
  if (value.targetMarket !== undefined) patch.targetMarket = value.targetMarket
  if (value.targetPlatform !== undefined) patch.targetPlatform = value.targetPlatform
  if (value.aspectRatio !== undefined) patch.aspectRatio = value.aspectRatio
  if (value.variationLevel !== undefined) patch.variationLevel = value.variationLevel
  if (value.styleMode !== undefined) patch.styleMode = value.styleMode
  if (value.mood !== undefined) patch.mood = value.mood
  if (value.colorPalette !== undefined) patch.colorPalette = value.colorPalette
  if (value.artStyle !== undefined) patch.artStyle = value.artStyle
  if (value.background !== undefined) patch.background = value.background
  if (value.humanModel !== undefined) patch.humanModel = value.humanModel
  if (value.customInstructions !== undefined) patch.customInstructions = value.customInstructions
  if (value.includeDiversity !== undefined) patch.includeDiversity = value.includeDiversity
  if (value.allowTextSpace !== undefined) patch.allowTextSpace = value.allowTextSpace
  if (value.includeNegativePrompts !== undefined) patch.includeNegativePrompts = value.includeNegativePrompts
  if (value.includeKeywords !== undefined) patch.includeKeywords = value.includeKeywords
  return patch
}

export function mapGeneratorSettings(input: GeneratorInput): TemplateGeneratorSettings | undefined {
  const candidate = {
    language: input.language,
    ...(input.niche.trim().length >= 3 ? { niche: input.niche } : {}),
    ...(input.category && isNicheCategory(input.category) ? { category: input.category } : {}),
    usageContext: input.usageContext,
    targetMarket: input.targetMarket,
    targetPlatform: input.targetPlatform,
    aspectRatio: input.aspectRatio,
    variationLevel: input.variationLevel,
    styleMode: input.styleMode,
    mood: input.mood,
    colorPalette: input.colorPalette,
    artStyle: input.artStyle,
    background: input.background,
    humanModel: input.humanModel,
    customInstructions: input.customInstructions,
    includeDiversity: input.includeDiversity,
    allowTextSpace: input.allowTextSpace,
    includeNegativePrompts: input.includeNegativePrompts,
    includeKeywords: input.includeKeywords,
  }
  const parsed = templateGeneratorSettingsSchema.safeParse(candidate)
  return parsed.success ? parsed.data : undefined
}

export function generatedPromptToTemplateInput(prompt: GeneratedPrompt): CreateTemplateInput {
  const content = prompt.fullPrompt.trim()
    || prompt.platformVariants[prompt.generatorInput.targetPlatform === 'nano_banana' ? 'nano_banana' : 'dalle3']?.trim()
    || prompt.platformVariants.dalle3.trim()
    || prompt.platformVariants.nano_banana.trim()

  return {
    name: `${prompt.generatorInput.niche} #${prompt.variantIndex}`,
    content,
    category: prompt.generatorInput.category ?? 'general',
    tags: prompt.commercialKeywords.slice(0, 10),
    source: 'generator',
    negativePrompt: prompt.negativePrompt,
    commercialKeywords: prompt.commercialKeywords,
    segments: {
      subject: prompt.segments.subject,
      composition: prompt.segments.composition,
      lighting: prompt.segments.lighting,
      mood: prompt.segments.mood,
      style: prompt.segments.style,
      technical: prompt.segments.technical,
      colorPalette: prompt.segments.colorPalette,
      environment: prompt.segments.environment,
    },
    platformVariants: {
      dalle3: prompt.platformVariants.dalle3,
      nano_banana: prompt.platformVariants.nano_banana,
    },
    generatorSettings: mapGeneratorSettings(prompt.generatorInput),
  }
}

export function historyPromptToTemplateInput(source: HistoryTemplateSource): CreateTemplateInput {
  const { record, generatorInput } = source
  const category = isNicheCategory(record.category) ? record.category : 'general'
  return {
    name: `${record.niche || record.category} #${record.id.slice(0, 8)}`,
    content: record.fullPrompt,
    category,
    tags: record.commercialKeywords.slice(0, 10),
    source: 'history',
    negativePrompt: record.negativePrompt,
    commercialKeywords: record.commercialKeywords,
    segments: {
      subject: record.segments.subject,
      composition: record.segments.composition,
      lighting: record.segments.lighting,
      mood: record.segments.mood,
      style: record.segments.style,
      technical: record.segments.technical,
      colorPalette: record.segments.colorPalette,
      environment: record.segments.environment,
    },
    platformVariants: {
      dalle3: record.platformVariants.dalle3,
      nano_banana: record.platformVariants.nano_banana,
    },
    ...(generatorInput ? { generatorSettings: mapGeneratorSettings(generatorInput) } : {}),
  }
}
