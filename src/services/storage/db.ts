import Dexie, { type EntityTable, type Table, type Transaction } from 'dexie'
import { v4 as uuidv4 } from 'uuid'
import type { Prompt } from '@/types'
import type { Folder } from '@/features/history/types'
import type { GeneratorInput, PromptSegments, AdobeStockScore, VariationAnchors } from '@/features/prompt-generator/types'
import type { IdeaCacheEntry } from './ideaCache'
import type { PromptHistoryRecord, PromptBatchRecord, PromptHistoryV10, PromptTextRecord, PlatformId } from './history'
import type { FormatterBatch, FormatterItem } from './formatter'
import {
  normalizeText,
  tokenize,
  toEpochMillis,
  boundedString,
  boundedStringArray,
  boundedInt,
  resolveFolderKey,
} from './historySearch'

const DB_NAME = 'promptforge'

// ─── v9 → v10 migration helpers ───────────────────────────────────────────────

const SEGMENT_KEYS: (keyof PromptSegments)[] = [
  'subject',
  'composition',
  'lighting',
  'mood',
  'style',
  'technical',
  'colorPalette',
  'environment',
]

function extractLegacyText(value: unknown): string {
  if (typeof value === 'string') return value.slice(0, 20_000)
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    for (const key of ['content', 'text', 'fullPrompt']) {
      if (typeof obj[key] === 'string') return (obj[key] as string).slice(0, 20_000)
    }
  }
  return ''
}

function sanitizeSegments(value: unknown): PromptSegments {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const segments = {} as PromptSegments
  for (const key of SEGMENT_KEYS) {
    segments[key] = boundedString(raw[key], 10_000)
  }
  return segments
}

function sanitizeScore(value: unknown): AdobeStockScore {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const breakdownRaw = (raw.breakdown && typeof raw.breakdown === 'object' ? raw.breakdown : {}) as Record<string, unknown>
  const clamp = (v: unknown, max: number): number =>
    Number.isFinite(Number(v)) ? Math.max(0, Math.min(max, Math.floor(Number(v)))) : 0
  const breakdown: AdobeStockScore['breakdown'] = {
    commercialViability: clamp(breakdownRaw.commercialViability, 25),
    technicalQuality: clamp(breakdownRaw.technicalQuality, 25),
    compositionStrength: clamp(breakdownRaw.compositionStrength, 25),
    marketDiversity: clamp(breakdownRaw.marketDiversity, 25),
  }
  return {
    total: clamp(raw.total, 100) || breakdown.commercialViability + breakdown.technicalQuality + breakdown.compositionStrength + breakdown.marketDiversity,
    breakdown,
    warnings: boundedStringArray(raw.warnings, 20, 500),
    suggestions: boundedStringArray(raw.suggestions, 40, 500),
  }
}

function sanitizeAnchors(value: unknown): VariationAnchors {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  return {
    primaryVariation: boundedString(raw.primaryVariation, 500),
    compositionStyle: boundedString(raw.compositionStyle, 500),
    lightingType: boundedString(raw.lightingType, 500),
    directionHint: boundedString(raw.directionHint, 500),
  }
}

function buildFallbackBatch(batchId: string, niche: string, category: string, generatedAt: number): PromptBatchRecord {
  const generatorInput = {
    niche,
    category,
    batchSize: 1,
    usageContext: 'commercial',
    language: 'en',
    aspectRatio: 'random',
    variationLevel: 3,
    styleMode: 'user',
    mood: { mode: 'user', value: 'none' },
    colorPalette: { mode: 'user', value: 'none' },
    artStyle: { mode: 'user', value: 'none' },
    background: { mode: 'user', value: 'none' },
    humanModel: { mode: 'user', value: 'no_people' },
    customInstructions: '',
    includeHistory: false,
    includeHistoryCount: 20,
    targetMarket: 'global',
    targetPlatform: 'dalle3',
    includeDiversity: true,
    allowTextSpace: false,
    includeNegativePrompts: true,
    includeKeywords: true,
  } as GeneratorInput
  return {
    batchId,
    generatorInput,
    generatedAt: new Date(generatedAt),
  }
}

interface V10MigrationResult {
  batchId: string
  metadata: PromptHistoryV10
  texts: PromptTextRecord[]
  fallbackBatch: PromptBatchRecord | null
}

/** Bound write size inside the upgrade transaction to avoid memory/IDB pressure on very large datasets. */
const MIGRATION_CHUNK_SIZE = 1_000

function chunked<T>(rows: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size))
  return out
}

async function bulkAddChunked<T>(table: Table<T, unknown>, rows: T[]): Promise<void> {
  for (const chunk of chunked(rows, MIGRATION_CHUNK_SIZE)) {
    await table.bulkAdd(chunk)
  }
}

async function bulkPutChunked<T>(table: Table<T, unknown>, rows: T[]): Promise<void> {
  for (const chunk of chunked(rows, MIGRATION_CHUNK_SIZE)) {
    await table.bulkPut(chunk)
  }
}

/**
 * Atomic v9→v10 upgrade for the prompt history store. Runs inside the
 * `version(10).upgrade()` transaction: any failure aborts the transaction and
 * preserves the v9 database untouched. There is NO automatic reset path.
 *
 * Exported separately so the real Dexie upgrade transaction can be exercised
 * against v9 fixtures on an isolated database instance in tests.
 */
export async function upgradePromptHistoryToV10(trans: Transaction): Promise<void> {
  const historyTable = trans.table('prompt_history')
  const batchesTable = trans.table('prompt_batches')
  const textsTable = trans.table('prompt_texts')

  const existingBatches = (await batchesTable.toArray()) as PromptBatchRecord[]
  const batchById = new Map(existingBatches.map((b) => [b.batchId, b]))

  const newHistory: PromptHistoryV10[] = []
  const newTexts: PromptTextRecord[] = []
  const fallbackBatches = new Map<string, PromptBatchRecord>()

  let migratedRows = 0
  await historyTable.toCollection().each((legacy) => {
    // Build fallback batches lazily per row (rare: only for missing/corrupt batches).
    const raw = (legacy && typeof legacy === 'object' ? legacy : {}) as Record<string, unknown>
    const id = boundedString(raw.id, 128) || String(raw.id ?? '')
    const batchId = boundedString(raw.batchId, 128) || id
    const createdAt = toEpochMillis(raw.createdAt)
    // Resolve niche/category BEFORE metadata construction so batch-derived
    // values flow into nicheNormalized, categoryKey, AND searchTerms.
    const batch = batchById.get(batchId)
    const niche = boundedString(raw.niche, 200) || boundedString(batch?.generatorInput?.niche, 200) || 'Unknown'
    const category = boundedString(raw.category, 50) || boundedString(batch?.generatorInput?.category, 50) || 'other'

    if (!batchById.has(batchId)) {
      const fallback = buildFallbackBatch(batchId, niche, category, createdAt)
      fallbackBatches.set(batchId, fallback)
      batchById.set(batchId, fallback)
    }

    const result = migrateLegacyPromptRow(raw, niche, category)

    newHistory.push(result.metadata)
    newTexts.push(...result.texts)
    migratedRows++
  })

  // Integrity verification inside the transaction — failure aborts the whole upgrade.
  const legacyCount = await historyTable.count()
  if (legacyCount !== migratedRows) {
    throw new Error(`[PromptForge] Migration invariant failed: history count mismatch (${legacyCount} vs ${migratedRows})`)
  }
  const missingBatches = newHistory.filter((h) => !batchById.has(h.batchId))
  if (missingBatches.length > 0) {
    throw new Error(`[PromptForge] Migration invariant failed: ${missingBatches.length} rows reference missing batches`)
  }

  if (fallbackBatches.size > 0) {
    await bulkPutChunked(batchesTable, [...fallbackBatches.values()])
  }
  await bulkPutChunked(textsTable, newTexts)
  await historyTable.clear()
  await bulkAddChunked(historyTable, newHistory)

  if (import.meta.env.DEV) {
    console.log(`[PromptForge] Migration to version 10 complete (${migratedRows} rows, ${fallbackBatches.size} fallback batches).`)
  }
}

/** Deterministically transform one v9 history row into v10 metadata + text rows. */
export function migrateLegacyPromptRow(legacy: unknown, fallbackNiche?: string, fallbackCategory?: string): V10MigrationResult {
  const raw = (legacy && typeof legacy === 'object' ? legacy : {}) as Record<string, unknown>
  const id = boundedString(raw.id, 128) || String(raw.id ?? '')
  const batchId = boundedString(raw.batchId, 128) || id
  const createdAt = toEpochMillis(raw.createdAt)
  // Row-level values win; batch-derived values (already bounded/validated by the
  // caller) fill gaps so metadata + search terms never degrade to placeholder text.
  const niche = boundedString(raw.niche, 200) || fallbackNiche || 'Unknown'
  const category = boundedString(raw.category, 50) || fallbackCategory || 'other'

  const platform = (raw.platformVariants && typeof raw.platformVariants === 'object'
    ? raw.platformVariants as Record<string, unknown>
    : {}) as Record<string, unknown>
  const dalle = extractLegacyText(platform.dalle3) || extractLegacyText(raw.fullPrompt) || ''
  const nano = extractLegacyText(platform.nano_banana) || extractLegacyText(raw.fullPrompt) || ''

  const keywords = boundedStringArray(raw.commercialKeywords, 60)
  const folderId = typeof raw.folderId === 'string' && raw.folderId !== '' ? raw.folderId : null

  const metadata: PromptHistoryV10 = {
    id,
    batchId,
    variantIndex: boundedInt(raw.variantIndex, 1, 10_000),
    segments: sanitizeSegments(raw.segments),
    negativePrompt: boundedString(raw.negativePrompt, 20_000),
    commercialKeywords: keywords,
    adobeScore: sanitizeScore(raw.adobeScore),
    variationAnchors: sanitizeAnchors(raw.variationAnchors),
    createdAt,
    isFavorite: !!raw.isFavorite,
    folderId,
    folderKey: resolveFolderKey(folderId),
    categoryKey: category,
    nicheNormalized: normalizeText(niche),
    searchTerms: tokenize([dalle, nano, niche, category, ...keywords].join(' ')),
  }
  if (typeof raw.userNotes === 'string') metadata.userNotes = boundedString(raw.userNotes, 2_000)
  if (typeof raw.legacy === 'boolean') metadata.legacy = raw.legacy
  if (typeof raw.isDuplicate === 'boolean') metadata.isDuplicate = raw.isDuplicate
  if (typeof raw.duplicateRef === 'string') metadata.duplicateRef = boundedString(raw.duplicateRef, 20_000)

  const texts: PromptTextRecord[] = [
    { promptId: id, platform: 'dalle3', content: dalle },
    { promptId: id, platform: 'nano_banana', content: nano },
  ]

  return { batchId, metadata, texts, fallbackBatch: null }
}

class PromptForgeDB extends Dexie {
  prompts!: EntityTable<Prompt, 'id'>
  /** @deprecated legacy flat table (v5) — dropped as of v6. */
  history!: EntityTable<Record<string, unknown>, 'id'>
  prompt_history!: EntityTable<PromptHistoryV10, 'id'>
  prompt_texts!: Table<PromptTextRecord, [string, PlatformId]>
  prompt_batches!: EntityTable<PromptBatchRecord, 'batchId'>
  folders!: EntityTable<Folder, 'id'>
  settings!: EntityTable<{ key: string; value: unknown }, 'key'>
  cryptoKeys!: EntityTable<{ key: string; value: CryptoKey }, 'key'>
  generatorState!: EntityTable<{ key: string; value: unknown }, 'key'>
  idea_cache!: EntityTable<IdeaCacheEntry, 'cacheKey'>
  formatter_batch!: EntityTable<FormatterBatch, 'id'>
  formatter_items!: EntityTable<FormatterItem, 'id'>

  constructor() {
    super(DB_NAME)

    // Version 5 Schema (pre-refactor)
    this.version(5).stores({
      prompts: 'id, name, category, createdAt',
      history: 'id, aspectRatio, stylePreset, niche, createdAt, savedAt, content, qualityScore, folderId, *tags',
      folders: 'id, name, parentId, createdAt',
      settings: 'key',
      generatorState: 'key',
      idea_cache: 'cacheKey, lastUpdated',
    })

    // Version 6 Schema (Prompt Engine Refactor)
    this.version(6).stores({
      prompt_history: 'id, batchId, createdAt, isFavorite, adobeScore.total, *commercialKeywords, legacy',
      prompt_batches: 'batchId, generatedAt, generatorInput.niche, generatorInput.category, generatorInput.usageContext',
      history: null, // Drop the old 'history' table
      prompts: 'id, name, category, createdAt',
      folders: 'id, name, parentId, createdAt',
      settings: 'key',
      generatorState: 'key',
      idea_cache: 'cacheKey, lastUpdated',
    }).upgrade(async (trans) => {
      if (import.meta.env.DEV) console.log('Upgrading Dexie schema to version 6...')
      const oldHistoryTable = trans.table('history')
      const newHistoryTable = trans.table('prompt_history')
      const newBatchesTable = trans.table('prompt_batches')

      const legacyItems = await oldHistoryTable.toArray()
      if (legacyItems.length === 0) {
        if (import.meta.env.DEV) console.log('No legacy history items to migrate.')
        return
      }

      if (import.meta.env.DEV) console.log(`Found ${legacyItems.length} legacy items to migrate.`)

      const newHistoryRecords: PromptHistoryRecord[] = []
      const newBatchRecords: PromptBatchRecord[] = []

      for (const item of legacyItems) {
        const batchId = uuidv4()
        const createdAt = toEpochMillis(item.savedAt || item.createdAt || Date.now())

        const niche = boundedString(item.niche, 200) || 'Unknown'
        const category = 'other'

        const generatorInput: GeneratorInput = {
          niche,
          category,
          batchSize: 1,
          usageContext: 'commercial',
          language: 'en',
          aspectRatio: 'random',
          variationLevel: 3,
          styleMode: 'user',
          mood: { mode: 'user', value: 'none' },
          colorPalette: { mode: 'user', value: 'none' },
          artStyle: { mode: 'user', value: 'none' },
          background: { mode: 'user', value: 'none' },
          humanModel: { mode: 'user', value: 'no_people' },
          customInstructions: '',
          includeHistory: false,
          includeHistoryCount: 20,
          targetMarket: 'global',
          targetPlatform: 'dalle3',
          includeDiversity: true,
          allowTextSpace: false,
          includeNegativePrompts: true,
          includeKeywords: true,
        }

        newBatchRecords.push({
          batchId,
          generatorInput,
          generatedAt: new Date(createdAt),
        })

        const content = typeof item.content === 'string' ? item.content.slice(0, 20_000) : ''
        newHistoryRecords.push({
          id: boundedString(item.id, 128) || String(item.id ?? ''),
          batchId,
          variantIndex: 1,
          segments: { subject: '', composition: '', lighting: '', mood: '', style: '', technical: '', colorPalette: '', environment: '' },
          negativePrompt: '',
          platformVariants: { dalle3: content, nano_banana: content },
          fullPrompt: content,
          commercialKeywords: boundedStringArray(item.tags, 60),
          adobeScore: {
            total: Number.isFinite(Number(item.qualityScore)) ? Math.max(0, Math.min(100, Math.floor(Number(item.qualityScore)))) : 0,
            breakdown: { commercialViability: 0, technicalQuality: 0, compositionStrength: 0, marketDiversity: 0 },
            warnings: ['Legacy prompt, score is estimated.'],
            suggestions: [],
          },
          variationAnchors: { primaryVariation: '', compositionStyle: '', lightingType: '', directionHint: '' },
          createdAt: new Date(createdAt),
          isFavorite: !!item.isFavorite,
          legacy: true,
          niche,
          category,
          folderId: typeof item.folderId === 'string' && item.folderId !== '' ? item.folderId : null,
        })
      }

      if (import.meta.env.DEV) console.log(`Migrating ${newBatchRecords.length} new batch records...`)
      await newBatchesTable.bulkAdd(newBatchRecords)

      if (import.meta.env.DEV) console.log(`Migrating ${newHistoryRecords.length} new history records...`)
      await newHistoryTable.bulkAdd(newHistoryRecords)

      if (import.meta.env.DEV) console.log('Migration to version 6 complete.')
    })

    this.version(7).stores({
      prompt_history: 'id, batchId, createdAt, isFavorite, adobeScore.total, *commercialKeywords, legacy, category, folderId',
      prompt_batches: 'batchId, generatedAt, generatorInput.niche, generatorInput.category, generatorInput.usageContext',
      prompts: 'id, name, category, createdAt',
      folders: 'id, name, parentId, createdAt',
      settings: 'key',
      generatorState: 'key',
      idea_cache: 'cacheKey, lastUpdated',
    })

    this.version(8).stores({
      prompt_history: 'id, batchId, createdAt, isFavorite, adobeScore.total, *commercialKeywords, legacy, category, folderId',
      prompt_batches: 'batchId, generatedAt, generatorInput.niche, generatorInput.category, generatorInput.usageContext',
      prompts: 'id, name, category, createdAt',
      folders: 'id, name, parentId, createdAt',
      settings: 'key',
      generatorState: 'key',
      idea_cache: 'cacheKey, lastUpdated',
      formatter_batch: '++id, createdAt',
      formatter_items: '++id, order, status',
    })

    // Version 9: dedicated table for the persistent (non-extractable) master
    // encryption key. New table only — no upgrade logic needed, safe for v8 users.
    this.version(9).stores({
      prompt_history: 'id, batchId, createdAt, isFavorite, adobeScore.total, *commercialKeywords, legacy, category, folderId',
      prompt_batches: 'batchId, generatedAt, generatorInput.niche, generatorInput.category, generatorInput.usageContext',
      prompts: 'id, name, category, createdAt',
      folders: 'id, name, parentId, createdAt',
      settings: 'key',
      cryptoKeys: 'key',
      generatorState: 'key',
      idea_cache: 'cacheKey, lastUpdated',
      formatter_batch: '++id, createdAt',
      formatter_items: '++id, order, status',
    })

    // Version 10: normalized prompt history — platform texts split into
    // `prompt_texts`, metadata stripped of duplicated payloads, and compound
    // date-first indexes for query planning. Upgrade is atomic: any failure
    // aborts the transaction and preserves v9. There is NO automatic reset.
    this.version(10).stores({
      prompt_history: 'id, batchId, createdAt, folderId, folderKey, categoryKey, [createdAt+id], [folderKey+createdAt+id], [categoryKey+createdAt+id]',
      prompt_texts: '[promptId+platform], promptId',
      prompt_batches: 'batchId, generatedAt, generatorInput.niche, generatorInput.category, generatorInput.usageContext',
      prompts: 'id, name, category, createdAt',
      folders: 'id, name, parentId, createdAt',
      settings: 'key',
      cryptoKeys: 'key',
      generatorState: 'key',
      idea_cache: 'cacheKey, lastUpdated',
      formatter_batch: '++id, createdAt',
      formatter_items: '++id, order, status',
    }).upgrade(upgradePromptHistoryToV10)
  }
}

const db = new PromptForgeDB()

export default db

// Initialization promise to ensure database is open before any access
let dbInitPromise: Promise<void> | null = null

export async function ensureDbReady(): Promise<void> {
  if (!dbInitPromise) {
    dbInitPromise = db.open()
      .then(() => undefined)
      .catch((err) => {
        if (import.meta.env.DEV) {
          console.error('[Dexie] Failed to open database:', err)
        }
        // Continue despite error to allow graceful degradation
      })
  }
  return dbInitPromise
}

// Helper for retries with exponential backoff
export async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 500): Promise<T> {
  // Ensure database is initialized before attempting operation
  await ensureDbReady()

  try {
    return await fn()
  } catch (error) {
    if (retries <= 0) throw error
    await new Promise((res) => setTimeout(res, delay))
    return withRetry(fn, retries - 1, delay * 2)
  }
}

/**
 * Delete and recreate the entire IndexedDB database.
 * Use this as a last resort when schema migration fails for users
 * with stale/corrupted data from previous versions.
 *
 * After calling this, the `db` instance will auto-recreate on next access.
 * NOTE: must only ever be called after explicit user confirmation — never
 * automatically from an error handler (see the v10 migration contract).
 */
export async function resetDatabase(): Promise<void> {
  await db.delete()
}