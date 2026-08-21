import db from './db'
import {
  SENTINEL_UNFILED,
  SENTINEL_UNKNOWN,
  ASPECT_RATIO_KEYS,
  ART_STYLE_OPTIONS,
  MAX_CANDIDATES_PER_REQUEST,
  MAX_TOTAL_CANDIDATES_PER_REQUEST,
  normalizeText,
  tokenize,
  tokenizeQuery,
  matchesSearch,
  hashFilters,
  toEpochMillis,
  resolveFolderKey,
  resolveAspectRatioKey,
  resolveArtStyleKey,
} from './historySearch'
import { withQuotaRetry, scheduleRetentionPrune } from './retention'
import type {
  ArtStyleOption,
  AdobeStockScore,
  AspectRatio,
  GeneratedPrompt,
  GeneratedPromptBatch,
  GeneratorInput,
  ImagePlatform,
  PromptSegments,
  VariationAnchors,
} from '@/features/prompt-generator/types'
import type { HistorySort } from '@/features/history/types'
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

export interface PromptHistoryV11 extends PromptHistoryV10 {
  /** Query-only snapshots derived from canonical batch generator input. */
  aspectRatioKey: AspectRatio | typeof SENTINEL_UNKNOWN
  artStyleKey: ArtStyleOption | typeof SENTINEL_UNKNOWN
}

export type PromptBatchRecord = Omit<GeneratedPromptBatch, 'prompts'>

// ─── Public DTO — unchanged shape consumed by HistoryList, RecentPrompts, export, store ───

export interface PromptHistoryRecord extends Omit<GeneratedPrompt, 'generatorInput' | 'prompts'> {
  folderId: string | null
  niche: string
  category: string
  /** v11 filter snapshots — null when legacy/system-selected (`SENTINEL_UNKNOWN`) or absent. */
  aspectRatioKey?: AspectRatio | null
  artStyleKey?: ArtStyleOption | null
}

export interface HistoryTemplateSource {
  record: PromptHistoryRecord
  generatorInput?: GeneratorInput
}

// ─── Cursor-based pagination contract ───

export type HistoryPlan = 'date-global' | 'folder-date' | 'rating-global' | 'folder-rating'
export type HistorySortField = 'createdAt' | 'adobeScore.total'
export type HistoryDirection = 'asc' | 'desc'

export type HistoryCursorKey =
  | [number, string]
  | [string, number, string]
  | [number, number, string]
  | [string, number, number, string]

export interface HistoryCursor {
  v: 2
  plan: HistoryPlan
  sortField: HistorySortField
  direction: HistoryDirection
  filterHash: string
  key: HistoryCursorKey
}

export interface HistoryQueryParams {
  folderId?: string | null
  aspectRatio?: string | null
  artStyleKey?: string | null
  minScore?: number
  dateFrom?: string | null
  dateTo?: string | null
  search?: string
  sort?: HistorySort
  limit?: number
  cursor?: HistoryCursor | null
  signal?: AbortSignal
}

export interface HistoryQueryResult {
  items: PromptHistoryRecord[]
  nextCursor: HistoryCursor | null
  hasMore: boolean
}

const DATE_MIN_MILLIS = -8_640_000_000_000_000
const DATE_MAX_MILLIS = 8_640_000_000_000_000
const ID_UPPER_BOUND = '\uffff'
const SCORE_MAX = 100

function validCursorString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128
}

function validCursorNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function parseCursor(
  raw: HistoryCursor | null | undefined,
  expectedPlan: HistoryPlan,
  expectedSortField: HistorySortField,
  expectedDirection: HistoryDirection,
  filterHash: string,
  folderKey: string | null,
): HistoryCursor | null {
  if (!raw || typeof raw !== 'object') return null
  if (raw.v !== 2) return null
  if (raw.plan !== expectedPlan) return null
  if (raw.sortField !== expectedSortField || raw.direction !== expectedDirection) return null
  if (raw.filterHash !== filterHash) return null
  const key = raw.key
  if (!Array.isArray(key)) return null

  if (expectedPlan === 'date-global') {
    if (key.length !== 2 || !validCursorNumber(key[0]) || !validCursorString(key[1])) return null
  } else if (expectedPlan === 'folder-date') {
    if (key.length !== 3 || !validCursorString(key[0]) || key[0] !== folderKey || !validCursorNumber(key[1]) || !validCursorString(key[2])) return null
  } else if (expectedPlan === 'rating-global') {
    if (key.length !== 3 || !validCursorNumber(key[0]) || key[0] < 0 || key[0] > SCORE_MAX || !validCursorNumber(key[1]) || !validCursorString(key[2])) return null
  } else if (expectedPlan === 'folder-rating') {
    if (key.length !== 4 || !validCursorString(key[0]) || key[0] !== folderKey || !validCursorNumber(key[1]) || key[1] < 0 || key[1] > SCORE_MAX || !validCursorNumber(key[2]) || !validCursorString(key[3])) return null
  }
  return raw
}

// ─── Hydration: raw stored rows → public DTO ───

async function hydrateRecords(rows: PromptHistoryV11[]): Promise<PromptHistoryRecord[]> {
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
    const category = input?.category ?? record.categoryKey

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
      aspectRatioKey: record.aspectRatioKey === SENTINEL_UNKNOWN ? null : record.aspectRatioKey,
      artStyleKey: record.artStyleKey === SENTINEL_UNKNOWN ? null : record.artStyleKey,
    }
    if (record.userNotes !== undefined) dto.userNotes = record.userNotes
    if (record.legacy !== undefined) dto.legacy = record.legacy
    if (record.isDuplicate !== undefined) dto.isDuplicate = record.isDuplicate
    if (record.duplicateRef !== undefined) dto.duplicateRef = record.duplicateRef
    return dto
  })
}

// ─── Writes ───

function toV11Metadata(
  prompt: GeneratedPrompt,
  batchInput: GeneratorInput,
  base: { folderId?: string | null } = {},
): PromptHistoryV11 {
  const category = batchInput.category ?? 'other'
  const niche = typeof batchInput.niche === 'string' ? batchInput.niche : ''
  const keywords = Array.isArray(prompt.commercialKeywords)
    ? prompt.commercialKeywords.filter((k): k is string => typeof k === 'string' && k !== '').slice(0, 60)
    : []
  const textSource = [prompt.platformVariants?.dalle3 ?? '', prompt.platformVariants?.nano_banana ?? '', niche, category, ...keywords].join(' ')

  const record: PromptHistoryV11 = {
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
    aspectRatioKey: resolveAspectRatioKey(batchInput),
    artStyleKey: resolveArtStyleKey(batchInput),
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
  const historyRecords: PromptHistoryV11[] = []

  for (const prompt of prompts) {
    historyRecords.push(toV11Metadata(prompt, generatorInput))
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
  const record: PromptHistoryV11 = {
    ...rest,
    createdAt,
    folderId: rest.folderId ?? null,
    folderKey: resolveFolderKey(rest.folderId ?? null),
    categoryKey,
    nicheNormalized: normalizeText(niche),
    searchTerms: tokenize([platformVariants.dalle3, platformVariants.nano_banana, niche, category].join(' ')),
    aspectRatioKey: SENTINEL_UNKNOWN,
    artStyleKey: SENTINEL_UNKNOWN,
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

/** Hydrate one history item for explicit user-initiated template creation. */
export async function getHistoryTemplateSource(id: string): Promise<HistoryTemplateSource | undefined> {
  const row = await db.prompt_history.get(id)
  if (!row) return undefined
  const [record] = await hydrateRecords([row])
  if (!record) return undefined
  const batch = await db.prompt_batches.get(row.batchId)
  return {
    record,
    ...(batch?.generatorInput ? { generatorInput: batch.generatorInput } : {}),
  }
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

// ─── Query planner: one ordered source index + bounded residual filters ───

interface DateBounds {
  from: number | null
  to: number | null
  invalid: boolean
}

function parseLocalDate(value: string, nextDay: boolean): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const exact = new Date(year, month - 1, day)
  if (exact.getFullYear() !== year || exact.getMonth() !== month - 1 || exact.getDate() !== day) return null
  const date = nextDay ? new Date(year, month - 1, day + 1) : exact
  const millis = date.getTime()
  return Number.isFinite(millis) && millis >= 0 && millis <= DATE_MAX_MILLIS ? millis : null
}

function normalizeDateBounds(dateFrom: unknown, dateTo: unknown): DateBounds {
  const fromText = typeof dateFrom === 'string' ? dateFrom.trim() : ''
  const toText = typeof dateTo === 'string' ? dateTo.trim() : ''
  const from = fromText ? parseLocalDate(fromText, false) : null
  const to = toText ? parseLocalDate(toText, true) : null
  const invalid = (fromText !== '' && from === null)
    || (toText !== '' && to === null)
    || (from !== null && to !== null && from >= to)
  return { from, to, invalid }
}

function normalizeAspectRatio(value: unknown): AspectRatio | null {
  return typeof value === 'string' && ASPECT_RATIO_KEYS.includes(value as AspectRatio)
    ? value as AspectRatio
    : null
}

function normalizeArtStyle(value: unknown): ArtStyleOption | null {
  return typeof value === 'string' && ART_STYLE_OPTIONS.includes(value as ArtStyleOption)
    ? value as ArtStyleOption
    : null
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new DOMException('History query aborted', 'AbortError')
}

function buildQueryCollection(params: {
  plan: HistoryPlan
  folderId: string | null
  cursor: HistoryCursor | null
  direction: HistoryDirection
  dateFrom: number | null
  dateTo: number | null
  minScore: number
}) {
  const { plan, folderId, cursor, direction, dateFrom, dateTo, minScore } = params
  let collection

  if (plan === 'folder-date') {
    const folderKey = folderId! // non-null by construction
    const lower = cursor && direction === 'asc'
      ? cursor.key as [string, number, string]
      : [folderKey, dateFrom ?? DATE_MIN_MILLIS, ''] as [string, number, string]
    const upper = cursor && direction === 'desc'
      ? cursor.key as [string, number, string]
      : [folderKey, dateTo ?? DATE_MAX_MILLIS, dateTo === null ? ID_UPPER_BOUND : ''] as [string, number, string]
    collection = db.prompt_history
      .where('[folderKey+createdAt+id]')
      .between(
        lower as IndexableType,
        upper as IndexableType,
        !(cursor && direction === 'asc'),
        !(cursor && direction === 'desc') && dateTo === null,
      )
    return direction === 'desc' ? collection.reverse() : collection
  }

  if (plan === 'date-global') {
    const lower = cursor && direction === 'asc'
      ? cursor.key as [number, string]
      : [dateFrom ?? DATE_MIN_MILLIS, ''] as [number, string]
    const upper = cursor && direction === 'desc'
      ? cursor.key as [number, string]
      : [dateTo ?? DATE_MAX_MILLIS, dateTo === null ? ID_UPPER_BOUND : ''] as [number, string]
    collection = db.prompt_history
      .where('[createdAt+id]')
      .between(
        lower as IndexableType,
        upper as IndexableType,
        !(cursor && direction === 'asc'),
        !(cursor && direction === 'desc') && dateTo === null,
      )
    return direction === 'desc' ? collection.reverse() : collection
  }

  if (plan === 'folder-rating') {
    const folderKey = folderId!
    const upper = cursor
      ? cursor.key as [string, number, number, string]
      : [folderKey, SCORE_MAX, DATE_MAX_MILLIS, ID_UPPER_BOUND] as [string, number, number, string]
    collection = db.prompt_history
      .where('[folderKey+adobeScore.total+createdAt+id]')
      .between(
        [folderKey, minScore, DATE_MIN_MILLIS, ''] as IndexableType,
        upper as IndexableType,
        true,
        !cursor,
      )
    return collection.reverse()
  }

  const upper = cursor
    ? cursor.key as [number, number, string]
    : [SCORE_MAX, DATE_MAX_MILLIS, ID_UPPER_BOUND] as [number, number, string]
  collection = db.prompt_history
    .where('[adobeScore.total+createdAt+id]')
    .between(
      [minScore, DATE_MIN_MILLIS, ''] as IndexableType,
      upper as IndexableType,
      true,
      !cursor,
    )
  return collection.reverse()
}

function makeCursor(params: {
  plan: HistoryPlan
  sortField: HistorySortField
  direction: HistoryDirection
  filterHash: string
  key: IndexableType
}): HistoryCursor {
  return {
    v: 2,
    plan: params.plan,
    sortField: params.sortField,
    direction: params.direction,
    filterHash: params.filterHash,
    key: params.key as HistoryCursorKey,
  }
}

/** Query history using one allowlisted ordered source and bounded adaptive scanning. */
export async function queryHistoryItems(params: HistoryQueryParams): Promise<HistoryQueryResult> {
  const limit = Math.max(1, Math.min(Number.isFinite(params.limit) ? Math.floor(params.limit!) : 20, 100))
  const minScore = Number.isFinite(params.minScore)
    ? Math.max(0, Math.min(SCORE_MAX, Math.floor(params.minScore!)))
    : 0
  const rawFolderId = params.folderId
  const folderId = typeof rawFolderId === 'string'
    && rawFolderId.length > 0
    && rawFolderId.length <= 128
    && rawFolderId !== SENTINEL_UNFILED
    ? rawFolderId
    : null
  const aspectRatio = normalizeAspectRatio(params.aspectRatio)
  const artStyleKey = normalizeArtStyle(params.artStyleKey)
  const dateBounds = normalizeDateBounds(params.dateFrom, params.dateTo)
  if (dateBounds.invalid) return { items: [], nextCursor: null, hasMore: false }

  const searchTokens = tokenizeQuery(params.search)
  const sort: HistorySort = params.sort === 'date-asc' || params.sort === 'rating-desc'
    ? params.sort
    : 'date-desc'
  const ratingSort = sort === 'rating-desc'
  const plan: HistoryPlan = ratingSort
    ? folderId === null ? 'rating-global' : 'folder-rating'
    : folderId === null ? 'date-global' : 'folder-date'
  const sortField: HistorySortField = ratingSort ? 'adobeScore.total' : 'createdAt'
  const direction: HistoryDirection = sort === 'date-asc' ? 'asc' : 'desc'
  const filterHash = hashFilters({
    folderId,
    aspectRatio,
    artStyleKey,
    minScore,
    dateFrom: dateBounds.from,
    dateTo: dateBounds.to,
    searchTokens,
    sort,
  })
  const cursor = parseCursor(
    params.cursor,
    plan,
    sortField,
    direction,
    filterHash,
    folderId,
  )

  const outputRows: PromptHistoryV11[] = []
  let examinedTotal = 0
  let resumeCursor = cursor
  let lastExaminedKey: IndexableType | null = null
  let sourceExhausted = false

  while (examinedTotal < MAX_TOTAL_CANDIDATES_PER_REQUEST && outputRows.length < limit) {
    throwIfAborted(params.signal)
    const collection = buildQueryCollection({
      plan,
      folderId,
      cursor: resumeCursor,
      direction,
      dateFrom: dateBounds.from,
      dateTo: dateBounds.to,
      minScore,
    })
    let examinedChunk = 0
    let stoppedEarly = false

    await collection
      .until(() => {
        const shouldStop = examinedChunk >= MAX_CANDIDATES_PER_REQUEST
          || outputRows.length >= limit
          || params.signal?.aborted === true
        if (shouldStop) stoppedEarly = true
        return shouldStop
      })
      .each((record, context) => {
        lastExaminedKey = context.key
        examinedChunk++
        examinedTotal++
        const score = Number.isFinite(record.adobeScore?.total) ? record.adobeScore.total : 0
        if (!ratingSort && minScore > 0 && score < minScore) return
        if (ratingSort && dateBounds.from !== null && record.createdAt < dateBounds.from) return
        if (ratingSort && dateBounds.to !== null && record.createdAt >= dateBounds.to) return
        if (aspectRatio !== null && record.aspectRatioKey !== aspectRatio) return
        if (artStyleKey !== null && record.artStyleKey !== artStyleKey) return
        if (!matchesSearch(record, searchTokens)) return
        outputRows.push(record)
      })

    throwIfAborted(params.signal)
    if (!stoppedEarly) {
      sourceExhausted = true
      break
    }
    if (lastExaminedKey === null) break
    resumeCursor = makeCursor({ plan, sortField, direction, filterHash, key: lastExaminedKey })
    if (examinedTotal >= MAX_TOTAL_CANDIDATES_PER_REQUEST || outputRows.length >= limit) break
    await yieldToBrowser()
  }

  let hasMore = false
  if (!sourceExhausted && lastExaminedKey !== null) {
    throwIfAborted(params.signal)
    const probeCursor = makeCursor({ plan, sortField, direction, filterHash, key: lastExaminedKey })
    const probe = await buildQueryCollection({
      plan,
      folderId,
      cursor: probeCursor,
      direction,
      dateFrom: dateBounds.from,
      dateTo: dateBounds.to,
      minScore,
    }).limit(1).toArray()
    hasMore = probe.length > 0
  }

  const nextCursor = hasMore && lastExaminedKey !== null
    ? makeCursor({ plan, sortField, direction, filterHash, key: lastExaminedKey })
    : null

  throwIfAborted(params.signal)
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
