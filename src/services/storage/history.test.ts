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
  type PromptHistoryV10,
  type PromptTextRecord,
} from './history'
import {
  SENTINEL_UNFILED,
  MAX_CANDIDATES_PER_REQUEST,
  tokenize,
  tokenizeQuery,
  matchesSearch,
  hashFilters,
  resolveFolderKey,
} from './historySearch'
import type {
  GeneratedPrompt,
  GeneratedPromptBatch,
  GeneratorInput,
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

function makeGeneratorInput(opts: { niche: string; category: string; targetPlatform: Platform }): GeneratorInput {
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
  category?: string
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
  } = {},
): PromptHistoryV10 {
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
    expect(tokenizeQuery('cat dog bird fish wolf fox lynx bear deer', 20).length).toBeLessThanOrEqual(20)
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
    const base = { folderId: null, minRating: 60, searchTokens: ['cat'] }
    expect(hashFilters(base)).toBe(hashFilters({ ...base }))
    expect(hashFilters(base)).not.toBe(hashFilters({ ...base, minRating: 70 }))
    expect(hashFilters(base)).not.toBe(hashFilters({ ...base, searchTokens: ['dog'] }))
  })

  it('resolves folder keys to the sentinel for null/empty/sentinel values', () => {
    expect(resolveFolderKey(null)).toBe(SENTINEL_UNFILED)
    expect(resolveFolderKey(undefined)).toBe(SENTINEL_UNFILED)
    expect(resolveFolderKey('')).toBe(SENTINEL_UNFILED)
    expect(resolveFolderKey(SENTINEL_UNFILED)).toBe(SENTINEL_UNFILED)
    expect(resolveFolderKey('folder-1')).toBe('folder-1')
  })
})

describe('prompt history storage (v10 schema)', () => {
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
    expect(items[0].generatorInput).toBeUndefined()

    // Raw records never carry the duplicated payload
    const raw = await db.prompt_history.get(items[0].id)
    expect(raw?.fullPrompt).toBeUndefined()
    expect(raw?.platformVariants).toBeUndefined()
    expect(raw?.niche).toBeUndefined()
    expect(raw?.category).toBeUndefined()
  })

  it('derives fullPrompt from the active target platform (nano_banana)', async () => {
    const batch = buildBatch({ batchId: 'b-nano', targetPlatform: 'nano_banana' })
    await saveGeneratedPromptBatch(batch)
    const items = await getHistoryItems()
    expect(items[0].fullPrompt).toContain('nano')
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
    }
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
    let { items } = await queryHistoryItems({ folderId: null, minRating: 0, search: '', limit: 10 })
    expect(items.map((i) => i.createdAt.getTime())).toEqual([4000, 3000, 2000, 1000])

    // folder filter
    ;({ items } = await queryHistoryItems({ folderId: 'folder-travel', minRating: 0, search: '', limit: 10 }))
    expect(items).toHaveLength(2)
    expect(items.map((i) => i.category).sort()).toEqual(['lifestyle', 'travel'])

    // min rating residual
    ;({ items } = await queryHistoryItems({ folderId: null, minRating: 80, search: '', limit: 10 }))
    expect(items.map((i) => i.adobeScore.total)).toEqual([90, 95])

    // token/prefix search
    ;({ items } = await queryHistoryItems({ folderId: null, minRating: 0, search: 'gold', limit: 10 }))
    expect(items.map((i) => i.fullPrompt)).toEqual(['golden sunset beach', 'golden retriever dog'])

    // multi-token AND
    ;({ items } = await queryHistoryItems({ folderId: null, minRating: 0, search: 'golden dog', limit: 10 }))
    expect(items.map((i) => i.fullPrompt)).toEqual(['golden retriever dog'])

    // combined folder + rating + search
    ;({ items } = await queryHistoryItems({ folderId: 'folder-travel', minRating: 80, search: 'gold', limit: 10 }))
    expect(items.map((i) => i.fullPrompt)).toEqual(['golden sunset beach'])
  })

  it('paginates with a stable cursor and no duplicates', async () => {
    const batch = buildBatch({ batchId: 'b-page', count: 5, startTime: 10_000 })
    await saveGeneratedPromptBatch(batch)
    const ids = batch.prompts.map((p) => p.id)

    const page1 = await queryHistoryItems({ folderId: null, minRating: 0, search: '', limit: 2 })
    expect(page1.items).toHaveLength(2)
    expect(page1.hasMore).toBe(true)
    expect(page1.nextCursor).not.toBeNull()

    const page2 = await queryHistoryItems({ folderId: null, minRating: 0, search: '', limit: 2, cursor: page1.nextCursor })
    expect(page2.items).toHaveLength(2)
    expect(page2.hasMore).toBe(true)

    const page3 = await queryHistoryItems({ folderId: null, minRating: 0, search: '', limit: 2, cursor: page2.nextCursor })
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
    const page1 = await queryHistoryItems({ folderId: null, minRating: 0, search: '', limit: 2 })
    expect(page1.hasMore).toBe(true)

    const restarted = await queryHistoryItems({
      folderId: null,
      minRating: 80,
      search: '',
      limit: 2,
      cursor: page1.nextCursor,
    })
    expect(restarted.items.length).toBeLessThanOrEqual(2)
  })

  it('bounds candidate examination per request (residual budget)', async () => {
    const batch = buildBatch({ batchId: 'b-budget', count: MAX_CANDIDATES_PER_REQUEST + 50, startTime: 0 })
    await saveGeneratedPromptBatch(batch)

    // All rows fail the search filter (no 'zzzz' token indexed) → the budget
    // exhausts before a full page can be filled.
    const result = await queryHistoryItems({ folderId: null, minRating: 0, search: 'zzzz', limit: 20 })
    expect(result.items).toHaveLength(0)
    expect(result.hasMore).toBe(true)
    expect(result.nextCursor).not.toBeNull()
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