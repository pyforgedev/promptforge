import db from './db'
import {
  SENTINEL_UNFILED,
  MAX_CANDIDATES_PER_REQUEST,
  normalizeText,
  tokenize,
  tokenizeQuery,
  matchesSearch,
  hashFilters,
  toEpochMillis,
  resolveFolderKey,
} from './historySearch'
import { withQuotaRetry, scheduleRetentionPrune } from './retention'
import type { GeneratedPrompt, GeneratedPromptBatch, GeneratorInput, ImagePlatform } from '@/features/prompt-generator/types'
import type { IndexableType } from 'dexie'

// ─── Raw (persisted) types — internal to storage, never consumed by UI directly ───

export type PlatformId = Extract<ImagePlatform, 'dalle3' | 'nano_banana'>

/** One row of platform-specific prompt text. Single source of truth per platform. */
export interface PromptTextRecord {
  promptId: string
  platform: PlatformId
  content: string
}

/** Prompt history metadata + small read-model keys for indexed querying. */
export interface PromptHistoryV10 {
  id: string
  batchId: string
  variantIndex: number
  segments: PromptSegments
  negativePrompt: string
  commercialKeywords: string[]
  adobeScore: AdobeStockScore
  variationAnchors: VariationAnchors
  /** Epoch millis (stored as number so compound index keys are number-string tuples). */
  createdAt: number
  isFavorite: boolean
  userNotes?: string
  legacy?: boolean
  isDuplicate?: boolean
  duplicateRef?: string
  folderId: string | null
  /** Query-only: sentinel-backed folder key (never null, safe for IndexedDB keys). */
  folderKey: string
  /** Query-only: snapshot of the batch category at write time. */
  categoryKey: string
  /** Query-only: lowercase NFKC-normalized niche snapshot. */
  nicheNormalized: string
  /** Query-only: bounded, deduplicated search terms. */
  searchTerms: string[]
}

export type PromptBatchRecord = Omit<GeneratedPromptBatch, 'prompts'>

// ─── Public DTO — unchanged shape consumed by HistoryList, RecentPrompts, export, store ───

export interface PromptHistoryRecord extends Omit<GeneratedPrompt, 'generatorInput' | 'prompts'> {
  folderId: string | null
  niche: string
  category: string
}

// ─── Cursor-based pagination contract ───

export type HistoryPlan = 'date' | 'folder-date' | 'category-date'

/** Compound index key of the last examined row: [folderKey|createdAtMillis, id] or [createdAtMillis, id]. */
export type HistoryCursorKey = [string, number, string] | [number, string]

export interface HistoryCursor {
  v: 1
  plan: HistoryPlan
  filterHash: string
  key: HistoryCursorKey
}

export interface HistoryQueryParams {
  folderId: string | null
  minRating: number
  search: string
  limit: number
  cursor?: HistoryCursor | null
}

export interface HistoryQueryResult {
  items: PromptHistoryRecord[]
  nextCursor: HistoryCursor | null
  hasMore: boolean
}

const DATE_MIN_MILLIS = -8_640_000_000_000_000
const DATE_MAX_MILLIS = 8_640_000_000_000_000
const ID_UPPER_BOUND = '\uffff'

function parseCursor(raw: HistoryCursor | null | undefined, expectedPlan: HistoryPlan, filterHash: string): HistoryCursor | null {
  if (!raw || typeof raw !== 'object') return null
  if (raw.v !== 1) return null
  if (raw.plan !== expectedPlan) return null
  if (raw.filterHash !== filterHash) return null
  const key = raw.key
  if (!Array.isArray(key)) return null
  if (expectedPlan === 'date') {
    if (key.length !== 1 + 1 || !Number.isFinite(key[0]) || typeof key[1] !== 'string' || key[1].length > 128) return null
  } else if (expectedPlan === 'folder-date' || expectedPlan === 'category-date') {
    if (key.length !== 2 + 1 || typeof key[0] !== 'string' || key[0].length > 128 || !Number.isFinite(key[1]) || typeof key[2] !== 'string' || key[2].length > 128) return null
  } else {
    return null
  }
  return raw
}

// ─── Hydration: raw stored rows → public DTO ───

async function hydrateRecords(rows: PromptHistoryV10[]): Promise<PromptHistoryRecord[]> {
  if (rows.length === 0) return []

  const batchIds = [...new Set(rows.map((r) => r.batchId).filter(Boolean))]
  const batchRows = batchIds.length > 0 ? await db.prompt_batches.bulkGet(batchIds) : []
  const batchById = new Map<string, PromptBatchRecord | undefined>()
  batchIds.forEach((id, i) => batchById.set(id, batchRows[i]))

  const textKeys = rows.flatMap((r) => [
    [r.id, 'dalle3'] as [string, PlatformId],
    [r.id, 'nano_banana'] as [string, PlatformId],
  ])
  const textRows = await db.prompt_texts.bulkGet(textKeys)
  const textsByPrompt = new Map<string, Partial<Record<PlatformId, string>>>()
  textKeys.forEach((key, i) => {
    const row = textRows[i]
    if (!row) return
    const entry = textsByPrompt.get(key[0]) ?? {}
    entry[key[1]] = row.content
    textsByPrompt.set(key[0], entry)
  })

  return rows.map((record) => {
    const input = batchById.get(record.batchId)?.generatorInput
    const texts = textsByPrompt.get(record.id) ?? {}
    const dalle = texts.dalle3 ?? ''
    const nano = texts.nano_banana ?? ''
    const platformVariants = { dalle3: dalle, nano_banana: nano }
    const isNanoTarget = input?.targetPlatform === 'nano_banana'
    const fullPrompt = isNanoTarget ? nano || dalle : dalle || nano
    const niche = input?.niche && input.niche !== '' ? input.niche : record.nicheNormalized
    const category = input?.category && input.category !== '' ? input.category : record.categoryKey

    const dto: PromptHistoryRecord = {
      id: record.id,
      variantIndex: record.variantIndex,
      batchId: record.batchId,
      segments: record.segments,
      negativePrompt: record.negativePrompt,
      platformVariants,
      fullPrompt,
      commercialKeywords: record.commercialKeywords,
      adobeScore: record.adobeScore,
      variationAnchors: record.variationAnchors,
      createdAt: new Date(record.createdAt),
      isFavorite: !!record.isFavorite,
      folderId: record.folderId,
      niche,
      category,
    }
    if (record.userNotes !== undefined) dto.userNotes = record.userNotes
    if (record.legacy !== undefined) dto.legacy = record.legacy
    if (record.isDuplicate !== undefined) dto.isDuplicate = record.isDuplicate
    if (record.duplicateRef !== undefined) dto.duplicateRef = record.duplicateRef
    return dto
  })
}

// ─── Writes ───

function toV10Metadata(
  prompt: GeneratedPrompt,
  batchInput: GeneratorInput,
  base: { folderId?: string | null } = {},
): PromptHistoryV10 {
  const category = typeof batchInput.category === 'string' && batchInput.category !== '' ? batchInput.category : 'other'
  const niche = typeof batchInput.niche === 'string' ? batchInput.niche : ''
  const keywords = Array.isArray(prompt.commercialKeywords)
    ? prompt.commercialKeywords.filter((k): k is string => typeof k === 'string' && k !== '').slice(0, 60)
    : []
  const textSource = [prompt.platformVariants?.dalle3 ?? '', prompt.platformVariants?.nano_banana ?? '', niche, category, ...keywords].join(' ')

  const record: PromptHistoryV10 = {
    id: prompt.id,
    batchId: prompt.batchId,
    variantIndex: prompt.variantIndex,
    segments: prompt.segments,
    negativePrompt: typeof prompt.negativePrompt === 'string' ? prompt.negativePrompt : '',
    commercialKeywords: keywords,
    adobeScore: prompt.adobeScore,
    variationAnchors: prompt.variationAnchors,
    createdAt: toEpochMillis(prompt.createdAt),
    isFavorite: !!prompt.isFavorite,
    folderId: base.folderId ?? null,
    folderKey: resolveFolderKey(base.folderId ?? null),
    categoryKey: category,
    nicheNormalized: normalizeText(niche),
    searchTerms: tokenize(textSource),
  }
  if (typeof prompt.userNotes === 'string') record.userNotes = prompt.userNotes
  if (typeof prompt.legacy === 'boolean') record.legacy = prompt.legacy
  if (typeof prompt.isDuplicate === 'boolean') record.isDuplicate = prompt.isDuplicate
  if (typeof prompt.duplicateRef === 'string') record.duplicateRef = prompt.duplicateRef
  return record
}

/** Persist one generation batch: canonical batch + per-prompt metadata + platform texts, atomically. */
export async function saveGeneratedPromptBatch(batch: GeneratedPromptBatch): Promise<string> {
  const { batchId, generatorInput, generatedAt, prompts } = batch
  const batchRecord: PromptBatchRecord = { batchId, generatorInput, generatedAt }
  const texts: PromptTextRecord[] = []
  const historyRecords: PromptHistoryV10[] = []

  for (const prompt of prompts) {
    historyRecords.push(toV10Metadata(prompt, generatorInput))
    texts.push(
      { promptId: prompt.id, platform: 'dalle3', content: typeof prompt.platformVariants.dalle3 === 'string' ? prompt.platformVariants.dalle3 : '' },
      { promptId: prompt.id, platform: 'nano_banana', content: typeof prompt.platformVariants.nano_banana === 'string' ? prompt.platformVariants.nano_banana : '' },
    )
  }

  await withQuotaRetry(() =>
    db.transaction('rw', db.prompt_batches, db.prompt_history, db.prompt_texts, async () => {
      await db.prompt_batches.put(batchRecord)
      await db.prompt_history.bulkAdd(historyRecords)
      await db.prompt_texts.bulkPut(texts)
    }),
  )

  scheduleRetentionPrune()

  return batchId
}

/** Persist a single history item (metadata + two platform texts) atomically. */
export async function saveHistoryItem(item: Omit<PromptHistoryRecord, 'createdAt'>): Promise<string> {
  const { platformVariants, niche, category, ...rest } = item
  const createdAt = toEpochMillis(new Date())
  const categoryKey = typeof category === 'string' && category !== '' ? category : 'other'
  const record: PromptHistoryV10 = {
    ...rest,
    createdAt,
    folderId: rest.folderId ?? null,
    folderKey: resolveFolderKey(rest.folderId ?? null),
    categoryKey,
    nicheNormalized: normalizeText(niche),
    searchTerms: tokenize([platformVariants.dalle3, platformVariants.nano_banana, niche, category].join(' ')),
  }
  const texts: PromptTextRecord[] = [
    { promptId: record.id, platform: 'dalle3', content: typeof platformVariants.dalle3 === 'string' ? platformVariants.dalle3 : '' },
    { promptId: record.id, platform: 'nano_banana', content: typeof platformVariants.nano_banana === 'string' ? platformVariants.nano_banana : '' },
  ]
  await withQuotaRetry(() =>
    db.transaction('rw', db.prompt_history, db.prompt_texts, async () => {
      await db.prompt_history.put(record)
      await db.prompt_texts.bulkPut(texts)
    }),
  )

  scheduleRetentionPrune()

  return record.id
}

// ─── Reads ───

/** All history items, hydrated to the public DTO (used by full JSON export). */
export async function getHistoryItems(): Promise<PromptHistoryRecord[]> {
  const rows = await db.prompt_history.toArray()
  return hydrateRecords(rows)
}

/** The most recent prompts across all folders, hydrated (used by the Home page). */
export async function getRecentPrompts(limit = 3): Promise<PromptHistoryRecord[]> {
  const rows = await db.prompt_history
    .orderBy('[createdAt+id]')
    .reverse()
    .limit(Math.max(1, Math.min(Math.floor(limit), 50)))
    .toArray()
  return hydrateRecords(rows)
}

export interface HistoryCounts {
  total: number
  byFolder: Record<string, number>
}

export async function getHistoryCounts(): Promise<HistoryCounts> {
  const [total, folderKeys] = await Promise.all([
    db.prompt_history.count(),
    db.prompt_history.orderBy('folderId').keys(),
  ])
  const byFolder: Record<string, number> = {}
  for (const key of folderKeys) {
    if (typeof key !== 'string') continue
    byFolder[key] = (byFolder[key] ?? 0) + 1
  }
  return { total, byFolder }
}

/** Recent prompts in a category (used by the generator's include-history similarity check). */
export async function getRecentRelevantHistory(category: string, limit: number): Promise<PromptHistoryRecord[]> {
  const categoryKey = typeof category === 'string' && category !== '' ? category : 'other'
  const bounded = Math.max(1, Math.min(Math.floor(limit), 500))
  const rows = await db.prompt_history
    .where('[categoryKey+createdAt+id]')
    .between(
      [categoryKey, DATE_MIN_MILLIS, ''] as IndexableType,
      [categoryKey, DATE_MAX_MILLIS, ID_UPPER_BOUND] as IndexableType,
      true,
      true,
    )
    .reverse()
    .limit(bounded)
    .toArray()
  return hydrateRecords(rows)
}

// ─── Query planner: date-first source index + bounded residual filter + cursor ───

function buildQueryCollection(params: {
  plan: HistoryPlan
  folderId: string | null
  cursor: HistoryCursor | null
}) {
  const { plan, folderId, cursor } = params
  let collection

  if (plan === 'folder-date') {
    const folderKey = folderId! // non-null by construction
    if (cursor) {
      const [ck, ms, id] = cursor.key as [string, number, string]
      collection = db.prompt_history
        .where('[folderKey+createdAt+id]')
        .between(
          [folderKey, DATE_MIN_MILLIS, ''] as IndexableType,
          [ck, ms, id] as IndexableType,
          true,
          false, // exclusive upper: resume strictly below the last examined key
        )
    } else {
      collection = db.prompt_history
        .where('[folderKey+createdAt+id]')
        .between(
          [folderKey, DATE_MIN_MILLIS, ''] as IndexableType,
          [folderKey, DATE_MAX_MILLIS, ID_UPPER_BOUND] as IndexableType,
          true,
          true,
        )
    }
    return collection.reverse()
  }

  if (cursor) {
    const [ms, id] = cursor.key as [number, string]
    collection = db.prompt_history
      .where('[createdAt+id]')
      .between(
        [DATE_MIN_MILLIS, ''] as IndexableType,
        [ms, id] as IndexableType,
        true,
        false, // exclusive upper: resume strictly below the last examined key
      )
  } else {
    collection = db.prompt_history.orderBy('[createdAt+id]')
  }
  return collection.reverse()
}

/**
 * Query history with a date-first index source, a hard candidate budget for
 * residual rating/search filters, and an opaque, filter-bound cursor.
 *
 * - Since IndexedDB does not intersect indexes, the planner picks exactly one
 *   date-ordered source index and applies `minRating`/`search` as residual
 *   checks over a bounded number of candidates (`MAX_CANDIDATES_PER_REQUEST`).
 * - Pages may be partially filled when the budget is exhausted; continuation
 *   is provided via `nextCursor` and the UI keeps loading more.
 */
export async function queryHistoryItems(params: HistoryQueryParams): Promise<HistoryQueryResult> {
  const limit = Math.max(1, Math.min(Number.isFinite(params.limit) ? Math.floor(params.limit) : 20, 100))
  const minRating = Number.isFinite(params.minRating) ? Math.max(0, params.minRating) : 0
  const folderId = params.folderId
  const searchTokens = tokenizeQuery(params.search)

  const plan: HistoryPlan = folderId !== null ? 'folder-date' : 'date'
  const filterHash = hashFilters({ folderId, minRating, searchTokens })

  const cursor = params.cursor ? parseCursor(params.cursor, plan, filterHash) : null

  const collection = buildQueryCollection({ plan, folderId, cursor })

  const outputRows: PromptHistoryV10[] = []
  let examined = 0
  let lastExaminedKey: IndexableType | null = null
  let stoppedEarly = false

  await collection
    .until(() => {
      // Stop before processing the next row once the page is full or the
      // candidate budget is exhausted. `stoppedEarly` therefore guarantees an
      // unprocessed row exists below, so hasMore is exact without a lookahead.
      const shouldStop = examined >= MAX_CANDIDATES_PER_REQUEST || outputRows.length >= limit
      if (shouldStop) stoppedEarly = true
      return shouldStop
    })
    .each((record, c) => {
      lastExaminedKey = c.key
      examined++
      if (minRating > 0 && (record.adobeScore?.total ?? 0) < minRating) return
      if (!matchesSearch(record, searchTokens)) return
      outputRows.push(record)
    })

  const hasMore = stoppedEarly
  const nextCursor: HistoryCursor | null =
    hasMore && lastExaminedKey !== null
      ? { v: 1, plan, filterHash, key: lastExaminedKey as HistoryCursorKey }
      : null

  return {
    items: await hydrateRecords(outputRows),
    nextCursor,
    hasMore,
  }
}

// ─── Mutations (all cascade-consistent, transactional) ───

async function cleanupBatchIfOrphaned(batchId: string): Promise<void> {
  const remaining = await db.prompt_history.where('batchId').equals(batchId).count()
  if (remaining === 0) {
    await db.prompt_batches.delete(batchId)
  }
}

export async function deleteHistoryItem(id: string): Promise<void> {
  await db.transaction('rw', db.prompt_history, db.prompt_texts, db.prompt_batches, async () => {
    const record = await db.prompt_history.get(id)
    if (!record) return
    await db.prompt_history.delete(id)
    await db.prompt_texts.where('promptId').equals(id).delete()
    await cleanupBatchIfOrphaned(record.batchId)
  })
}

export async function deleteHistoryItems(ids: string[]): Promise<void> {
  const CHUNK_SIZE = 50
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE)
    await db.transaction('rw', db.prompt_history, db.prompt_texts, db.prompt_batches, async () => {
      const rows = await db.prompt_history.where('id').anyOf(chunk).toArray()
      await db.prompt_history.where('id').anyOf(chunk).delete()
      await db.prompt_texts.where('promptId').anyOf(chunk).delete()
      const batchIds = [...new Set(rows.map((r) => r.batchId).filter(Boolean))]
      for (const batchId of batchIds) {
        await cleanupBatchIfOrphaned(batchId)
      }
    })
  }
}

export async function deleteAllHistory(): Promise<void> {
  await db.transaction('rw', db.prompt_history, db.prompt_texts, db.prompt_batches, async () => {
    await Promise.all([
      db.prompt_history.clear(),
      db.prompt_texts.clear(),
      db.prompt_batches.clear(),
    ])
  })
}

export async function togglePromptFavorite(id: string): Promise<boolean> {
  const record = await db.prompt_history.get(id)
  if (!record) return false
  const next = !record.isFavorite
  await db.prompt_history.update(id, { isFavorite: next })
  return next
}

export async function deleteFolder(id: string): Promise<void> {
  await db.folders.delete(id)
}

export async function deleteFolderAndUnassign(id: string): Promise<void> {
  await db.transaction('rw', db.folders, db.prompt_history, async () => {
    await db.folders.delete(id)
    await db.prompt_history
      .where('folderId')
      .equals(id)
      .modify((record) => {
        record.folderId = null
        record.folderKey = SENTINEL_UNFILED
      })
  })
}

export async function bulkUpdateHistoryFolder(ids: string[], folderId: string | null): Promise<void> {
  await db.transaction('rw', db.prompt_history, async () => {
    await db.prompt_history
      .where('id')
      .anyOf(ids)
      .modify((record) => {
        record.folderId = folderId ?? null
        record.folderKey = resolveFolderKey(folderId ?? null)
      })
  })
}

export { hydrateRecords }