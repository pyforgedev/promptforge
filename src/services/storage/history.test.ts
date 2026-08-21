import { describe, expect, it, beforeEach } from 'vitest'
import db from './db'
import {
  saveGeneratedPromptBatch,
  saveHistoryItem,
  getHistoryItems,
  getRecentRelevantHistory,
  queryHistoryItems,
  deleteHistoryItem,
  deleteAllHistory,
  togglePromptFavorite,
  bulkUpdateHistoryFolder,
  deleteFolderAndUnassign,
  getHistoryCounts,
  getHistoryTemplateSource,
  type PromptHistoryV11,
  type PromptTextRecord,
} from './history'
import {
  SENTINEL_UNFILED,
  SENTINEL_UNKNOWN,
  ASPECT_RATIO_KEYS,
  ART_STYLE_OPTIONS,
  MAX_TOTAL_CANDIDATES_PER_REQUEST,
  tokenize,
  tokenizeQuery,
  matchesSearch,
  hashFilters,
  resolveFolderKey,
  resolveAspectRatioKey,
  resolveArtStyleKey,
} from './historySearch'
import type {
  GeneratedPrompt,
  GeneratedPromptBatch,
  GeneratorInput,
  NicheCategory,
  PromptSegments,
  AdobeStockScore,
  VariationAnchors,
} from '@/features/prompt-generator/types'

type Platform = 'dalle3' | 'nano_banana'

function makeSegments(subject: string): PromptSegments {
  return { subject, composition: '', lighting: '', mood: '', style: '', technical: '', colorPalette: '', environment: '' }
}

function makeScore(total: number): AdobeStockScore {
  return {
    total,
    breakdown: {
      commercialViability: Math.min(25, Math.max(0, total)),
      technicalQuality: 0,
      compositionStrength: 0,
      marketDiversity: 0,
    },
    warnings: [],
    suggestions: [],
  }
}

function makeAnchors(primary = 'lighting'): VariationAnchors {
  return { primaryVariation: primary, compositionStyle: '', lightingType: '', directionHint: '' }
}

function makeGeneratorInput(opts: { niche: string; category: NicheCategory; targetPlatform: Platform }): GeneratorInput {
  return {
    niche: opts.niche,
    category: opts.category,
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
    targetPlatform: opts.targetPlatform,
    includeDiversity: true,
    allowTextSpace: false,
    includeNegativePrompts: true,
    includeKeywords: true,
  }
}

interface SeedOptions {
  batchId: string
  count?: number
  niche?: string
  category?: NicheCategory
  targetPlatform?: Platform
  score?: number
  text?: string
  folderId?: string | null
  startTime?: number
}

function makePrompt(input: GeneratorInput, opts: SeedOptions & { index: number; id: string }): GeneratedPrompt {
  const dalle = opts.text ?? `${opts.niche ?? 'Nature'} prompt ${opts.id} dalle`
  const nano = opts.text ?? `${opts.niche ?? 'Nature'} prompt ${opts.id} nano`
  return {
    id: opts.id,
    variantIndex: opts.index + 1,
    batchId: opts.batchId,
    segments: makeSegments(opts.id),
    negativePrompt: '',
    platformVariants: { dalle3: dalle, nano_banana: nano },
    fullPrompt: input.targetPlatform === 'nano_banana' ? nano : dalle,
    commercialKeywords: [(opts.niche ?? 'Nature').toLowerCase()],
    adobeScore: makeScore(opts.score ?? 70),
    variationAnchors: makeAnchors(),
    createdAt: new Date((opts.startTime ?? Date.now()) + opts.index),
    isFavorite: false,
    generatorInput: input,
  }
}

function buildBatch(opts: SeedOptions): GeneratedPromptBatch {
  const input = makeGeneratorInput({
    niche: opts.niche ?? 'Nature',
    category: opts.category ?? 'lifestyle',
    targetPlatform: opts.targetPlatform ?? 'dalle3',
  })
  const prompts = Array.from({ length: opts.count ?? 1 }, (_, index) =>
    makePrompt(input, { ...opts, index, id: `${opts.batchId}-p${index + 1}` }),
  )
  return { batchId: opts.batchId, generatorInput: input, generatedAt: new Date(opts.startTime ?? Date.now()), prompts }
}

function v10Meta(
  id: string,
  opts: {
    batchId: string
    folderId?: string | null
    time?: number
    score?: number
    text?: string
    categoryKey?: string
    niche?: string
  },
): PromptHistoryV11 {
  const folderId = opts.folderId ?? null
  const text = opts.text ?? `text for ${id}`
  const niche = opts.niche ?? 'Test'
  const category = opts.categoryKey ?? 'other'
  return {
    id,
    batchId: opts.batchId,
    variantIndex: 1,
    segments: makeSegments(id),
    negativePrompt: '',
    commercialKeywords: [],
    adobeScore: makeScore(opts.score ?? 0),
    variationAnchors: makeAnchors(),
    createdAt: opts.time ?? 1,
    isFavorite: false,
    folderId,
    folderKey: resolveFolderKey(folderId),
    categoryKey: category,
    nicheNormalized: niche.toLowerCase(),
    searchTerms: tokenize(text),
    aspectRatioKey: 'random',
    artStyleKey: 'none',
  }
}

function v10Texts(id: string, text: string): PromptTextRecord[] {
  return [
    { promptId: id, platform: 'dalle3', content: text },
    { promptId: id, platform: 'nano_banana', content: text },
  ]
}

let seedSeq = 0
function nextId(prefix = 'p'): string {
  seedSeq += 1
  return `${prefix}-${seedSeq}`
}

describe('historySearch utils', () => {
  it('normalizes text with NFKC + lowercase', () => {
    const normalized = tokenize('Éclair — CAFÉ 12')
    expect(normalized).toContain('éclair')
    expect(normalized).toContain('café')
    expect(normalized).toContain('12')
  })

  it('drops single-character fragments and deduplicates tokens', () => {
    expect(tokenize('a b c a b c')).toEqual([])
    expect(tokenize('cat cat dog dog')).toEqual(['cat', 'dog'])
  })

  it('bounds token counts and lengths', () => {
    expect(tokenize('cat dog bird fish', 2)).toHaveLength(2)
    const long = 'x'.repeat(200)
    expect(tokenize(long)[0]).toHaveLength(64)
  })

  it('query tokens respect the stricter query budget', () => {
    expect(tokenizeQuery('cat dog bird fish wolf fox lynx bear deer').length).toBeLessThanOrEqual(20)
  })

  it('matches by exact token or prefix with AND semantics', () => {
    const row = { searchTerms: ['camera', 'landscape', 'sunset'] }
    expect(matchesSearch(row, ['cam'])).toBe(true)
    expect(matchesSearch(row, ['camera'])).toBe(true)
    expect(matchesSearch(row, ['camera', 'landscape'])).toBe(true)
    expect(matchesSearch(row, ['camera', 'ocean'])).toBe(false)
    expect(matchesSearch(row, [])).toBe(true)
  })

  it('hashes filters deterministically and reacts to changes', () => {
    const base = {
      folderId: null,
      aspectRatio: null,
      artStyleKey: null,
      minScore: 60,
      dateFrom: null,
      dateTo: null,
      searchTokens: ['cat'],
      sort: 'date-desc' as const,
    }
    expect(hashFilters(base)).toBe(hashFilters({ ...base }))
    const variants = [
      { ...base, folderId: 'folder-1' },
      { ...base, aspectRatio: '16:9' as const },
      { ...base, artStyleKey: 'photorealistic' as const },
      { ...base, minScore: 70 },
      { ...base, dateFrom: 1 },
      { ...base, dateTo: 2 },
      { ...base, searchTokens: ['dog'] },
      { ...base, sort: 'date-asc' as const },
    ]
    for (const variant of variants) expect(hashFilters(base)).not.toBe(hashFilters(variant))
  })

  it('normalizes v11 snapshots with allowlists and rejects malformed or inherited values', () => {
    for (const ratio of ASPECT_RATIO_KEYS) expect(resolveAspectRatioKey({ aspectRatio: ratio })).toBe(ratio)
    for (const style of ART_STYLE_OPTIONS) {
      expect(resolveArtStyleKey({ artStyle: { mode: 'user', value: style } })).toBe(style)
    }
    expect(resolveArtStyleKey({ artStyle: { mode: 'system', value: 'photorealistic' } })).toBe(SENTINEL_UNKNOWN)
    expect(resolveArtStyleKey({ artStyle: { mode: 'user', value: 'not-allowed' } })).toBe(SENTINEL_UNKNOWN)
    for (const malformed of [null, undefined, [], '16:9', { aspectRatio: 1 }, { aspectRatio: 'bogus' }]) {
      expect(resolveAspectRatioKey(malformed)).toBe(SENTINEL_UNKNOWN)
    }
    for (const malformed of [null, undefined, [], {}, { artStyle: [] }, { artStyle: null }, { artStyle: { value: 'none' } }]) {
      expect(resolveArtStyleKey(malformed)).toBe(SENTINEL_UNKNOWN)
    }
    expect(resolveAspectRatioKey(Object.create({ aspectRatio: '16:9' }))).toBe(SENTINEL_UNKNOWN)
    expect(resolveArtStyleKey({ artStyle: Object.create({ mode: 'user', value: 'none' }) })).toBe(SENTINEL_UNKNOWN)
  })

  it('resolves folder keys to the sentinel for null/empty/sentinel values', () => {
    expect(resolveFolderKey(null)).toBe(SENTINEL_UNFILED)
    expect(resolveFolderKey(undefined)).toBe(SENTINEL_UNFILED)
    expect(resolveFolderKey('')).toBe(SENTINEL_UNFILED)
    expect(resolveFolderKey(SENTINEL_UNFILED)).toBe(SENTINEL_UNFILED)
    expect(resolveFolderKey('folder-1')).toBe('folder-1')
  })
})

describe('prompt history storage (v11 schema)', () => {
  beforeEach(async () => {
    await db.prompt_history.clear()
    await db.prompt_texts.clear()
    await db.prompt_batches.clear()
    await db.folders.clear()
  })

  it('counts history records and tallies only assigned folder ids', async () => {
    await db.prompt_history.bulkPut([
      v10Meta('unfiled-1', { batchId: 'b1' }),
      v10Meta('travel-1', { batchId: 'b1', folderId: 'folder-travel' }),
      v10Meta('travel-2', { batchId: 'b1', folderId: 'folder-travel' }),
      v10Meta('food-1', { batchId: 'b1', folderId: 'folder-food' }),
    ])

    await expect(getHistoryCounts()).resolves.toEqual({
      total: 4,
      byFolder: {
        'folder-food': 1,
        'folder-travel': 2,
      },
    })
  })

  it('persists a batch and hydrates the public DTO with batch-derived data', async () => {
    const batch = buildBatch({ batchId: 'b-persist', targetPlatform: 'dalle3' })
    await saveGeneratedPromptBatch(batch)

    const items = await getHistoryItems()
    expect(items).toHaveLength(1)
    expect(items[0].niche).toBe('Nature')
    expect(items[0].category).toBe('lifestyle')
    expect(items[0].fullPrompt).toContain('dalle')
    expect(items[0].platformVariants.dalle3).toContain('dalle')
    expect(items[0].platformVariants.nano_banana).toContain('nano')
    expect(items[0]).not.toHaveProperty('generatorInput')

    // Raw records never carry the duplicated payload
    const raw = await db.prompt_history.get(items[0].id)
    expect(raw).not.toHaveProperty('fullPrompt')
    expect(raw).not.toHaveProperty('platformVariants')
    expect(raw).not.toHaveProperty('niche')
    expect(raw).not.toHaveProperty('category')
  })

  it('derives fullPrompt from the active target platform (nano_banana)', async () => {
    const batch = buildBatch({ batchId: 'b-nano', targetPlatform: 'nano_banana' })
    await saveGeneratedPromptBatch(batch)
    const items = await getHistoryItems()
    expect(items[0].fullPrompt).toContain('nano')
  })

  it('hydrates a history template source with its batch generator settings', async () => {
    const batch = buildBatch({ batchId: 'template-source', targetPlatform: 'nano_banana' })
    await saveGeneratedPromptBatch(batch)

    const source = await getHistoryTemplateSource(batch.prompts[0].id)

    expect(source?.record).toMatchObject({
      id: batch.prompts[0].id,
      fullPrompt: expect.stringContaining('nano'),
      niche: 'Nature',
    })
    expect(source?.generatorInput).toEqual(batch.generatorInput)
  })

  it('hydrates the history record without generator settings when its batch is missing', async () => {
    const batch = buildBatch({ batchId: 'template-source-missing-batch' })
    await saveGeneratedPromptBatch(batch)
    await db.prompt_batches.delete(batch.batchId)

    const source = await getHistoryTemplateSource(batch.prompts[0].id)

    expect(source?.record.id).toBe(batch.prompts[0].id)
    expect(source).not.toHaveProperty('generatorInput')
  })

  it('returns recent prompts in a category, newest first, and only within that category', async () => {
    await saveGeneratedPromptBatch(buildBatch({ batchId: 'cat-a-1', category: 'lifestyle', startTime: 1000 }));
    await saveGeneratedPromptBatch(buildBatch({ batchId: 'cat-b-1', category: 'travel', startTime: 2000 }));
    await saveGeneratedPromptBatch(buildBatch({ batchId: 'cat-a-2', category: 'lifestyle', startTime: 3000 }));
    await saveGeneratedPromptBatch(buildBatch({ batchId: 'cat-b-2', category: 'travel', startTime: 4000 }))

    const lifestyle = await getRecentRelevantHistory('lifestyle', 10)
    expect(lifestyle.map((i) => i.createdAt.getTime())).toEqual([3000, 1000])

    const travel = await getRecentRelevantHistory('travel', 10)
    expect(travel.map((i) => i.createdAt.getTime())).toEqual([4000, 2000])
  })

  it('queries newest-first across all folders with folder, rating, and search residual filters', async () => {
    const seed = {
      q1: { folderId: 'folder-travel', time: 4000, score: 90, text: 'golden sunset beach', categoryKey: 'lifestyle' },
      q2: { folderId: 'folder-travel', time: 3000, score: 50, text: 'blue mountains', categoryKey: 'travel' },
      q3: { folderId: null as string | null, time: 2000, score: 75, text: 'golden retriever dog', categoryKey: 'lifestyle' },
      q4: { folderId: 'folder-food', time: 1000, score: 95, text: 'spicy noodle bowl', categoryKey: 'travel' },
    } as const
    await db.prompt_batches.bulkPut(
      (Object.keys(seed) as (keyof typeof seed)[]).map((key) => ({
        batchId: `bq-${key}`,
        generatorInput: makeGeneratorInput({ niche: 'Nature', category: seed[key].categoryKey, targetPlatform: 'dalle3' }),
        generatedAt: new Date(0),
      })),
    )
    await db.prompt_history.bulkPut(
      (Object.keys(seed) as (keyof typeof seed)[]).map((key) =>
        v10Meta(key, { batchId: `bq-${key}`, ...seed[key] }),
      ),
    )
    await db.prompt_texts.bulkPut(
      (Object.keys(seed) as (keyof typeof seed)[]).flatMap((key) => v10Texts(key, seed[key].text)),
    )

    // all folders, newest first
    let { items } = await queryHistoryItems({ folderId: null, minScore: 0, search: '', limit: 10 })
    expect(items.map((i) => i.createdAt.getTime())).toEqual([4000, 3000, 2000, 1000])

    // folder filter
    ;({ items } = await queryHistoryItems({ folderId: 'folder-travel', minScore: 0, search: '', limit: 10 }))
    expect(items).toHaveLength(2)
    expect(items.map((i) => i.category).sort()).toEqual(['lifestyle', 'travel'])

    // min rating residual
    ;({ items } = await queryHistoryItems({ folderId: null, minScore: 80, search: '', limit: 10 }))
    expect(items.map((i) => i.adobeScore.total)).toEqual([90, 95])

    // token/prefix search
    ;({ items } = await queryHistoryItems({ folderId: null, minScore: 0, search: 'gold', limit: 10 }))
    expect(items.map((i) => i.fullPrompt)).toEqual(['golden sunset beach', 'golden retriever dog'])

    // multi-token AND
    ;({ items } = await queryHistoryItems({ folderId: null, minScore: 0, search: 'golden dog', limit: 10 }))
    expect(items.map((i) => i.fullPrompt)).toEqual(['golden retriever dog'])

    // combined folder + rating + search
    ;({ items } = await queryHistoryItems({ folderId: 'folder-travel', minScore: 80, search: 'gold', limit: 10 }))
    expect(items.map((i) => i.fullPrompt)).toEqual(['golden sunset beach'])
  })

  it('applies exact aspect-ratio and art-style residual filters', async () => {
    const rows = [
      { id: 'snap-a', aspectRatioKey: '16:9', artStyleKey: 'photorealistic' },
      { id: 'snap-b', aspectRatioKey: '16:9', artStyleKey: 'minimalist' },
      { id: 'snap-c', aspectRatioKey: '4:5', artStyleKey: 'photorealistic' },
    ] as const
    await db.prompt_history.bulkPut(rows.map((entry, index) => ({
      ...v10Meta(entry.id, { batchId: 'snap-batch', time: index + 1, text: entry.id }),
      aspectRatioKey: entry.aspectRatioKey,
      artStyleKey: entry.artStyleKey,
    })))
    await db.prompt_texts.bulkPut(rows.flatMap((entry) => v10Texts(entry.id, entry.id)))

    const result = await queryHistoryItems({ aspectRatio: '16:9', artStyleKey: 'photorealistic', limit: 10 })
    expect(result.items.map((item) => item.id)).toEqual(['snap-a'])
  })

  it('treats dateTo as an inclusive local calendar day and rejects invalid ranges safely', async () => {
    const dayStart = new Date(2026, 4, 10).getTime()
    const nextDay = new Date(2026, 4, 11).getTime()
    await db.prompt_history.bulkPut([
      v10Meta('date-start', { batchId: 'dates', time: dayStart }),
      v10Meta('date-end', { batchId: 'dates', time: nextDay - 1 }),
      v10Meta('date-outside', { batchId: 'dates', time: nextDay }),
    ])
    await db.prompt_texts.bulkPut(['date-start', 'date-end', 'date-outside'].flatMap((id) => v10Texts(id, id)))

    const included = await queryHistoryItems({ dateFrom: '2026-05-10', dateTo: '2026-05-10', limit: 10 })
    expect(included.items.map((item) => item.id).sort()).toEqual(['date-end', 'date-start'])
    for (const params of [
      { dateFrom: '2026-05-11', dateTo: '2026-05-10' },
      { dateFrom: '2026-02-30' },
      { dateTo: 'not-a-date' },
    ]) {
      await expect(queryHistoryItems({ ...params, limit: 10 })).resolves.toEqual({ items: [], nextCursor: null, hasMore: false })
    }
  })

  it.each(['date-desc', 'date-asc'] as const)('paginates %s stably when timestamps tie', async (sort) => {
    const ids = ['tie-a', 'tie-c', 'tie-b', 'tie-d']
    await db.prompt_history.bulkPut(ids.map((id) => v10Meta(id, { batchId: 'ties', time: 5000 })))
    await db.prompt_texts.bulkPut(ids.flatMap((id) => v10Texts(id, id)))
    const first = await queryHistoryItems({ sort, limit: 2 })
    const second = await queryHistoryItems({ sort, limit: 2, cursor: first.nextCursor })
    const actual = [...first.items, ...second.items].map((item) => item.id)
    expect(actual).toEqual(sort === 'date-desc' ? [...ids].sort().reverse() : [...ids].sort())
    expect(new Set(actual).size).toBe(ids.length)
  })

  it.each([null, 'rating-folder'] as const)('sorts rating-desc %s by score, createdAt, and id descending', async (folderId) => {
    const rows = [
      v10Meta('rate-a', { batchId: 'ratings', folderId, score: 90, time: 100 }),
      v10Meta('rate-c', { batchId: 'ratings', folderId, score: 90, time: 100 }),
      v10Meta('rate-b', { batchId: 'ratings', folderId, score: 90, time: 200 }),
      v10Meta('rate-z', { batchId: 'ratings', folderId, score: 80, time: 999 }),
    ]
    await db.prompt_history.bulkPut(rows)
    await db.prompt_texts.bulkPut(rows.flatMap((row) => v10Texts(row.id, row.id)))
    const result = await queryHistoryItems({ folderId, sort: 'rating-desc', limit: 10 })
    expect(result.items.map((item) => item.id)).toEqual(['rate-b', 'rate-c', 'rate-a', 'rate-z'])
  })

  it('applies date bounds as residual filters to rating ordering', async () => {
    const inDay = new Date(2026, 6, 2, 12).getTime()
    const outDay = new Date(2026, 6, 3, 12).getTime()
    const rows = [
      v10Meta('rating-in', { batchId: 'rating-date', score: 80, time: inDay }),
      v10Meta('rating-out', { batchId: 'rating-date', score: 99, time: outDay }),
    ]
    await db.prompt_history.bulkPut(rows)
    await db.prompt_texts.bulkPut(rows.flatMap((row) => v10Texts(row.id, row.id)))
    const result = await queryHistoryItems({ sort: 'rating-desc', dateFrom: '2026-07-02', dateTo: '2026-07-02', limit: 10 })
    expect(result.items.map((item) => item.id)).toEqual(['rating-in'])
  })

  it('paginates with a stable cursor and no duplicates', async () => {
    const batch = buildBatch({ batchId: 'b-page', count: 5, startTime: 10_000 })
    await saveGeneratedPromptBatch(batch)
    const ids = batch.prompts.map((p) => p.id)

    const page1 = await queryHistoryItems({ folderId: null, minScore: 0, search: '', limit: 2 })
    expect(page1.items).toHaveLength(2)
    expect(page1.hasMore).toBe(true)
    expect(page1.nextCursor).not.toBeNull()

    const page2 = await queryHistoryItems({ folderId: null, minScore: 0, search: '', limit: 2, cursor: page1.nextCursor })
    expect(page2.items).toHaveLength(2)
    expect(page2.hasMore).toBe(true)

    const page3 = await queryHistoryItems({ folderId: null, minScore: 0, search: '', limit: 2, cursor: page2.nextCursor })
    expect(page3.items).toHaveLength(1)
    expect(page3.hasMore).toBe(false)
    expect(page3.nextCursor).toBeNull()

    const all = [...page1.items, ...page2.items, ...page3.items]
    expect(all).toHaveLength(5)
    expect(new Set(all.map((i) => i.id)).size).toBe(5)
    expect(ids).toContain(all[0].id)
  })

  it('ignores a stale cursor (filter mismatch) and restarts from the beginning', async () => {
    await saveGeneratedPromptBatch(buildBatch({ batchId: 'b-stale', count: 3, startTime: 20_000 }))
    const page1 = await queryHistoryItems({ folderId: null, minScore: 0, search: '', limit: 2 })
    expect(page1.hasMore).toBe(true)

    const restarted = await queryHistoryItems({
      folderId: null,
      minScore: 80,
      search: '',
      limit: 2,
      cursor: page1.nextCursor,
    })
    expect(restarted.items.length).toBeLessThanOrEqual(2)
  })

  it('safely restarts for malformed and legacy v1 cursors', async () => {
    await saveGeneratedPromptBatch(buildBatch({ batchId: 'b-bad-cursor', count: 3, startTime: 30_000 }))
    const expected = await queryHistoryItems({ limit: 2 })
    for (const cursor of [
      { v: 1 },
      { v: 2, plan: 'date-global', sortField: 'createdAt', direction: 'desc', filterHash: 'wrong', key: ['bad'] },
    ]) {
      const restarted = await queryHistoryItems({ limit: 2, cursor: cursor as never })
      expect(restarted.items.map((item) => item.id)).toEqual(expected.items.map((item) => item.id))
    }
  })

  it('continues through sparse matches beyond the first 200 candidates to fill a page', async () => {
    const rows = Array.from({ length: 260 }, (_, index) => {
      const id = `sparse-${String(index).padStart(3, '0')}`
      return v10Meta(id, { batchId: 'sparse', time: index, text: index < 245 ? 'ordinary' : 'needle' })
    })
    await db.prompt_history.bulkPut(rows)
    await db.prompt_texts.bulkPut(rows.flatMap((row) => v10Texts(row.id, row.searchTerms.includes('needle') ? 'needle' : 'ordinary')))
    const result = await queryHistoryItems({ search: 'needle', sort: 'date-asc', limit: 10 })
    expect(result.items).toHaveLength(10)
    expect(result.items.every((item) => item.fullPrompt === 'needle')).toBe(true)
  })

  it('bounds candidate examination per request (residual budget)', async () => {
    const batch = buildBatch({ batchId: 'b-budget', count: MAX_TOTAL_CANDIDATES_PER_REQUEST + 50, startTime: 0 })
    await saveGeneratedPromptBatch(batch)

    // All rows fail the search filter (no 'zzzz' token indexed) → the budget
    // exhausts before a full page can be filled.
    const result = await queryHistoryItems({ folderId: null, minScore: 0, search: 'zzzz', limit: 20 })
    expect(result.items).toHaveLength(0)
    expect(result.hasMore).toBe(true)
    expect(result.nextCursor).not.toBeNull()
  }, 15_000)

  it('continues after the 2000-candidate ceiling without skipping or duplicating later matches', async () => {
    const count = MAX_TOTAL_CANDIDATES_PER_REQUEST + 25
    const rows = Array.from({ length: count }, (_, index) => {
      const id = `ceiling-${String(index).padStart(4, '0')}`
      const text = index < MAX_TOTAL_CANDIDATES_PER_REQUEST ? 'ordinary' : 'target'
      return v10Meta(id, { batchId: 'ceiling', time: index, text })
    })
    await db.prompt_history.bulkPut(rows)
    await db.prompt_texts.bulkPut(rows.flatMap((row) => v10Texts(row.id, row.searchTerms.includes('target') ? 'target' : 'ordinary')))
    const first = await queryHistoryItems({ search: 'target', sort: 'date-asc', limit: 20 })
    expect(first.items).toHaveLength(0)
    expect(first.hasMore).toBe(true)
    const second = await queryHistoryItems({ search: 'target', sort: 'date-asc', limit: 20, cursor: first.nextCursor })
    const third = await queryHistoryItems({ search: 'target', sort: 'date-asc', limit: 20, cursor: second.nextCursor })
    const ids = [...second.items, ...third.items].map((item) => item.id)
    expect(ids).toHaveLength(25)
    expect(new Set(ids).size).toBe(25)
  }, 15_000)

  it('rejects with AbortError before attempting hydration', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(queryHistoryItems({ signal: controller.signal, limit: 10 })).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('deletes a single item and cascades its text rows and orphaned batch', async () => {
    const batch = buildBatch({ batchId: 'b-cascade', count: 2 })
    await saveGeneratedPromptBatch(batch)
    const removed = batch.prompts[1]
    const preserved = batch.prompts[0]

    await deleteHistoryItem(removed.id)

    expect(await db.prompt_texts.where('promptId').equals(removed.id).count()).toBe(0)
    expect(await db.prompt_texts.where('promptId').equals(preserved.id).count()).toBe(2)
    // Batch is still referenced by the preserved prompt
    expect(await db.prompt_batches.get(batch.batchId)).toBeDefined()

    await deleteHistoryItem(preserved.id)
    expect(await db.prompt_batches.get(batch.batchId)).toBeUndefined()
  })

  it('clears all history, texts, and batches together', async () => {
    await saveGeneratedPromptBatch(buildBatch({ batchId: 'b-clear', count: 3 }))
    await deleteAllHistory()
    expect(await db.prompt_history.count()).toBe(0)
    expect(await db.prompt_texts.count()).toBe(0)
    expect(await db.prompt_batches.count()).toBe(0)
  })

  it('moves folders and updates the sentinel-backed folder key together', async () => {
    const batch = buildBatch({ batchId: 'b-move', count: 2 })
    await saveGeneratedPromptBatch(batch)
    const ids = batch.prompts.map((p) => p.id)

    await bulkUpdateHistoryFolder(ids, 'folder-x')
    let rows = await db.prompt_history.bulkGet(ids)
    expect(rows.every((r) => r?.folderId === 'folder-x' && r.folderKey === 'folder-x')).toBe(true)

    await deleteFolderAndUnassign('folder-x')
    rows = await db.prompt_history.bulkGet(ids)
    expect(rows.every((r) => r?.folderId === null && r.folderKey === SENTINEL_UNFILED)).toBe(true)
  })

  it('toggles favorites atomically', async () => {
    const batch = buildBatch({ batchId: 'b-fav', count: 1 })
    await saveGeneratedPromptBatch(batch)
    const id = batch.prompts[0].id

    expect(await togglePromptFavorite(id)).toBe(true)
    expect((await db.prompt_history.get(id))?.isFavorite).toBe(true)
    expect(await togglePromptFavorite(id)).toBe(false)
  })

  it('persists a single history item via saveHistoryItem and hydrates without a batch', async () => {
    const item = {
      id: nextId('single'),
      variantIndex: 1,
      batchId: 'b-single',
      segments: makeSegments('subject'),
      negativePrompt: '',
      platformVariants: { dalle3: 'dalle single', nano_banana: 'nano single' },
      fullPrompt: 'dalle single',
      commercialKeywords: [],
      adobeScore: makeScore(0),
      variationAnchors: makeAnchors(),
      isFavorite: false,
      folderId: null,
      niche: 'Standalone',
      category: 'other',
    }
    await saveHistoryItem(item)

    const items = await getHistoryItems()
    expect(items).toHaveLength(1)
    expect(items[0].fullPrompt).toBe('dalle single')
    // Without a backing batch, the hydrated niche falls back to the
    // normalized snapshot stored on the raw record.
    expect(items[0].niche).toBe('standalone')
    expect(items[0].category).toBe('other')
  })
})
