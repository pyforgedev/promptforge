import { v4 as uuidv4 } from 'uuid'
import db from './db'
import {
  createTemplateSchema,
  normalizeNameKey,
  updateTemplateSchema,
} from '@/features/templates/utils/templateValidators'
import {
  createDefaultTemplate,
  DEFAULT_TEMPLATE_ID,
  DEFAULT_TEMPLATE_KEY,
  DEFAULT_TEMPLATE_SEED_SETTING,
} from '@/features/templates/defaultTemplate'
import type {
  CreateTemplateInput,
  ImportIssueCode,
  ImportTemplatesSummary,
  PersistedPromptTemplate,
  PromptTemplate,
  UpdateTemplateInput,
} from '@/features/templates/types'

export type TemplateErrorCode =
  | 'DUPLICATE_NAME'
  | 'NOT_FOUND'
  | 'INVALID_DATA'
  | 'BUILTIN_CONFLICT'
  | 'IMPORT_LIMIT'
  | 'STORAGE_FAILED'

export class TemplateError extends Error {
  readonly code: TemplateErrorCode

  constructor(code: TemplateErrorCode) {
    super(code)
    this.code = code
    this.name = 'TemplateError'
  }
}

function storageError(error: unknown): never {
  if (error instanceof TemplateError) throw error
  throw new TemplateError('STORAGE_FAILED')
}

function toPersistedTemplate(
  input: CreateTemplateInput,
  overrides?: Partial<Pick<PersistedPromptTemplate, 'id' | 'createdAt' | 'updatedAt' | 'source' | 'builtinKey'>>,
): PersistedPromptTemplate {
  const now = Date.now()
  return {
    id: overrides?.id ?? uuidv4(),
    name: input.name,
    nameKey: normalizeNameKey(input.name),
    content: input.content,
    category: input.category,
    tags: input.tags,
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
    source: overrides?.source ?? input.source ?? 'manual',
    ...(overrides?.builtinKey ? { builtinKey: overrides.builtinKey } : {}),
    ...(input.negativePrompt ? { negativePrompt: input.negativePrompt } : {}),
    ...(input.commercialKeywords ? { commercialKeywords: input.commercialKeywords } : {}),
    ...(input.segments ? { segments: input.segments } : {}),
    ...(input.platformVariants ? { platformVariants: input.platformVariants } : {}),
    ...(input.generatorSettings ? { generatorSettings: input.generatorSettings } : {}),
  }
}

async function reconcileCollision(nameKey: string): Promise<void> {
  const matches = await db.prompts.where('nameKey').equals(nameKey).toArray()
  const collision = matches.length > 1
  await Promise.all(matches.map((template) => {
    if (collision === !!template.legacyNameCollision) return Promise.resolve()
    return db.prompts.put({
      ...template,
      legacyNameCollision: collision ? true : undefined,
    })
  }))
}

export async function getTemplate(id: string): Promise<PromptTemplate | undefined> {
  return db.prompts.get(id)
}

export async function getAllTemplates(): Promise<PromptTemplate[]> {
  return db.prompts.orderBy('[updatedAt+id]').reverse().toArray()
}

export async function createTemplate(input: CreateTemplateInput): Promise<PromptTemplate> {
  const parsed = createTemplateSchema.safeParse(input)
  if (!parsed.success) throw new TemplateError('INVALID_DATA')

  try {
    return await db.transaction('rw', db.prompts, async () => {
      const template = toPersistedTemplate(parsed.data)
      const duplicate = await db.prompts.where('nameKey').equals(template.nameKey).first()
      if (duplicate) throw new TemplateError('DUPLICATE_NAME')
      await db.prompts.add(template)
      return template
    })
  } catch (error) {
    return storageError(error)
  }
}

export async function updateTemplate(input: UpdateTemplateInput): Promise<PromptTemplate> {
  const parsed = updateTemplateSchema.safeParse(input)
  if (!parsed.success) throw new TemplateError('INVALID_DATA')

  try {
    return await db.transaction('rw', db.prompts, async () => {
      const existing = await db.prompts.get(parsed.data.id)
      if (!existing) throw new TemplateError('NOT_FOUND')

      const nextName = parsed.data.name ?? existing.name
      const nextNameKey = normalizeNameKey(nextName)
      if (nextNameKey !== existing.nameKey) {
        const duplicate = await db.prompts.where('nameKey').equals(nextNameKey).first()
        if (duplicate && duplicate.id !== existing.id) {
          throw new TemplateError('DUPLICATE_NAME')
        }
      }

      const changes = Object.fromEntries(
        Object.entries(parsed.data).filter(([key, value]) => key !== 'id' && value !== undefined),
      ) as Omit<UpdateTemplateInput, 'id'>
      const updated: PersistedPromptTemplate = {
        ...existing,
        ...changes,
        id: existing.id,
        name: nextName,
        nameKey: nextNameKey,
        updatedAt: Date.now(),
      }
      await db.prompts.put(updated)
      await reconcileCollision(existing.nameKey)
      if (nextNameKey !== existing.nameKey) await reconcileCollision(nextNameKey)
      return updated
    })
  } catch (error) {
    return storageError(error)
  }
}

export async function deleteTemplate(id: string): Promise<void> {
  try {
    await db.transaction('rw', db.prompts, async () => {
      const existing = await db.prompts.get(id)
      if (!existing) throw new TemplateError('NOT_FOUND')
      await db.prompts.delete(id)
      await reconcileCollision(existing.nameKey)
    })
  } catch (error) {
    storageError(error)
  }
}

export async function seedDefaultTemplateOnce(): Promise<void> {
  try {
    await db.transaction('rw', [db.prompts, db.settings], async () => {
      const marker = await db.settings.get(DEFAULT_TEMPLATE_SEED_SETTING)
      if (marker) return

      const existingBuiltin = await db.prompts.where('builtinKey').equals(DEFAULT_TEMPLATE_KEY).first()
      const occupiedId = await db.prompts.get(DEFAULT_TEMPLATE_ID)
      const defaultTemplate = createDefaultTemplate()
      const duplicateName = await db.prompts
        .where('nameKey')
        .equals(normalizeNameKey(defaultTemplate.name))
        .first()
      if (existingBuiltin || occupiedId || duplicateName) {
        await db.settings.put({
          key: DEFAULT_TEMPLATE_SEED_SETTING,
          value: { status: 'conflict', updatedAt: Date.now() },
        })
        return
      }

      const template = defaultTemplate
      await db.prompts.add({
        ...template,
        nameKey: normalizeNameKey(template.name),
      })
      await db.settings.put({
        key: DEFAULT_TEMPLATE_SEED_SETTING,
        value: { status: 'seeded', updatedAt: Date.now() },
      })
    })
  } catch (error) {
    storageError(error)
  }
}

export async function resetDefaultTemplate(): Promise<PromptTemplate> {
  try {
    return await db.transaction('rw', [db.prompts, db.settings], async () => {
      const builtins = await db.prompts.where('builtinKey').equals(DEFAULT_TEMPLATE_KEY).toArray()
      if (builtins.length > 1) throw new TemplateError('BUILTIN_CONFLICT')

      const occupiedId = await db.prompts.get(DEFAULT_TEMPLATE_ID)
      if (occupiedId && occupiedId.builtinKey !== DEFAULT_TEMPLATE_KEY) {
        throw new TemplateError('BUILTIN_CONFLICT')
      }

      const fresh = createDefaultTemplate()
      const sameName = await db.prompts
        .where('nameKey')
        .equals(normalizeNameKey(fresh.name))
        .toArray()
      if (builtins.length === 0 && sameName.length > 1) {
        throw new TemplateError('BUILTIN_CONFLICT')
      }
      // Pre-v12 reset identified the default by name. Adopt that single row so
      // users who edited its content can still restore it after migration.
      const existing = builtins[0] ?? sameName[0]
      const template: PersistedPromptTemplate = {
        ...fresh,
        id: existing?.id ?? fresh.id,
        createdAt: existing?.createdAt ?? fresh.createdAt,
        nameKey: normalizeNameKey(fresh.name),
      }
      const duplicate = sameName.find((candidate) => candidate.id !== existing?.id)
      if (duplicate) throw new TemplateError('DUPLICATE_NAME')

      await db.prompts.put(template)
      await db.settings.put({
        key: DEFAULT_TEMPLATE_SEED_SETTING,
        value: { status: 'seeded', updatedAt: Date.now() },
      })
      return template
    })
  } catch (error) {
    return storageError(error)
  }
}

function addIssue(
  summary: ImportTemplatesSummary,
  record: number,
  code: ImportIssueCode,
): void {
  if (summary.issues.length < 20) summary.issues.push({ record, code })
  else summary.issuesTruncated = true
}

export async function importTemplatesBatch(records: unknown[]): Promise<ImportTemplatesSummary> {
  if (records.length > 500) throw new TemplateError('IMPORT_LIMIT')

  const summary: ImportTemplatesSummary = {
    total: records.length,
    imported: 0,
    duplicatesExisting: 0,
    duplicatesInFile: 0,
    invalid: 0,
    issues: [],
    issuesTruncated: false,
  }
  const candidates: Array<{ template: PersistedPromptTemplate; record: number }> = []
  const seen = new Set<string>()

  records.forEach((record, index) => {
    const parsed = createTemplateSchema.safeParse(record)
    const ordinal = index + 1
    if (!parsed.success) {
      summary.invalid++
      addIssue(summary, ordinal, 'INVALID_RECORD')
      return
    }
    const nameKey = normalizeNameKey(parsed.data.name)
    if (seen.has(nameKey)) {
      summary.duplicatesInFile++
      addIssue(summary, ordinal, 'DUPLICATE_IN_FILE')
      return
    }
    seen.add(nameKey)
    candidates.push({
      template: toPersistedTemplate({ ...parsed.data, source: 'import' }),
      record: ordinal,
    })
  })

  if (candidates.length === 0) return summary

  try {
    await db.transaction('rw', db.prompts, async () => {
      const accepted: PersistedPromptTemplate[] = []
      for (const { template, record } of candidates) {
        const duplicate = await db.prompts.where('nameKey').equals(template.nameKey).first()
        if (duplicate) {
          summary.duplicatesExisting++
          addIssue(summary, record, 'DUPLICATE_EXISTING')
        } else {
          accepted.push(template)
        }
      }
      if (accepted.length > 0) await db.prompts.bulkAdd(accepted)
      summary.imported = accepted.length
    })
    return summary
  } catch (error) {
    return storageError(error)
  }
}
