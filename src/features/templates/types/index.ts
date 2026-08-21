import type {
  GeneratorInput,
  NicheCategory,
  PlatformVariants,
  PromptSegments,
} from '@/features/prompt-generator/types'
import { NICHE_CATEGORIES } from '@/features/prompt-generator/constants/categories'

export const TEMPLATE_CATEGORIES = ['general', ...NICHE_CATEGORIES] as const

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number]
export type TemplateSource =
  | 'manual'
  | 'import'
  | 'generator'
  | 'history'
  | 'builtin'
  | 'legacy'

export type TemplateGeneratorSettings = Partial<
  Omit<
    GeneratorInput,
    | 'batchSize'
    | 'includeHistory'
    | 'includeHistoryCount'
    | 'basePromptReference'
  >
>

export interface PromptTemplate {
  id: string
  name: string
  content: string
  category: string
  tags: string[]
  createdAt: number
  updatedAt: number
  source: TemplateSource
  builtinKey?: 'stock-photo-v1'
  negativePrompt?: string
  commercialKeywords?: string[]
  segments?: PromptSegments
  platformVariants?: Partial<PlatformVariants>
  generatorSettings?: TemplateGeneratorSettings
}

export interface PersistedPromptTemplate extends PromptTemplate {
  nameKey: string
  legacyNameCollision?: true
}

export interface CreateTemplateInput {
  name: string
  content: string
  category: TemplateCategory
  tags: string[]
  source?: Exclude<TemplateSource, 'builtin' | 'legacy'>
  negativePrompt?: string
  commercialKeywords?: string[]
  segments?: PromptSegments
  platformVariants?: Partial<PlatformVariants>
  generatorSettings?: TemplateGeneratorSettings
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  id: string
}

export type ImportIssueCode = 'INVALID_RECORD' | 'DUPLICATE_EXISTING' | 'DUPLICATE_IN_FILE'

export interface ImportTemplatesSummary {
  total: number
  imported: number
  duplicatesExisting: number
  duplicatesInFile: number
  invalid: number
  issues: Array<{ record: number; code: ImportIssueCode }>
  issuesTruncated: boolean
}

export function isNicheCategory(value: string): value is NicheCategory {
  return (NICHE_CATEGORIES as readonly string[]).includes(value)
}

export function hasGeneratorSettings(
  template: PromptTemplate,
): template is PromptTemplate & { generatorSettings: TemplateGeneratorSettings } {
  return !!template.generatorSettings && Object.keys(template.generatorSettings).length > 0
}
