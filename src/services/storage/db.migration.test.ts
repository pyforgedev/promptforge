import { describe, expect, it, beforeAll } from 'vitest'
import Dexie from 'dexie'
import { migrateLegacyPromptRow, upgradePromptHistoryToV10 } from './db'
import type { PromptHistoryV10, PromptBatchRecord } from './history'

/**
 * Integration test for the REAL Dexie v9→v10 upgrade path:
 *
 * 1. A throwaway Dexie instance creates an isolated `promptforge-migration-fixture`
 *    database at schema v9 and seeds legacy rows (v9-shaped prompt_history +
 *    prompt_batches).
 * 2. A second instance on the same database declares v9 + v10 and runs the
 *    exported `upgradePromptHistoryToV10` transaction — the exact same upgrade
 *    function the production singleton registers.
 *
 * An isolated fixture name is required because the production singleton is
 * opened at v10 during module load (store hydration on import), so the real
 * upgrade can never run against the `promptforge` database inside tests.
 */
const FIXTURE_DB = 'promptforge-migration-fixture'

const V9_STORES = {
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
}

const V10_STORES = {
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
}

interface V9HistoryRow {
  id: string
  batchId: string
  variantIndex: number
  segments: Record<string, string>
  negativePrompt: string
  platformVariants: { dalle3: string; nano_banana: string }
  fullPrompt: string
  commercialKeywords: string[]
  adobeScore: unknown
  variationAnchors: Record<string, string>
  createdAt: Date
  isFavorite: boolean
  niche?: unknown
  category?: unknown
  folderId: string | null
  legacy?: boolean
  isDuplicate?: boolean
  userNotes?: string
}

function makeV9Row(id: string, batchId: string, opts: Partial<Pick<V9HistoryRow, 'niche' | 'category' | 'isFavorite' | 'legacy' | 'folderId' | 'userNotes' | 'isDuplicate'>> = {}): V9HistoryRow {
  return {
    id,
    batchId,
    variantIndex: 1,
    segments: { subject: id, composition: '', lighting: '', mood: '', style: '', technical: '', colorPalette: '', environment: '' },
    negativePrompt: '',
    platformVariants: { dalle3: `dalle text ${id}`, nano_banana: `nano text ${id}` },
    fullPrompt: `full text ${id}`,
    commercialKeywords: ['kw-' + id],
    adobeScore: {
      total: 70,
      breakdown: { commercialViability: 20, technicalQuality: 20, compositionStrength: 15, marketDiversity: 15 },
      warnings: [],
      suggestions: [],
    },
    variationAnchors: { primaryVariation: '', compositionStyle: '', lightingType: '', directionHint: '' },
    createdAt: new Date(1_700_000_000_000 + (id.length * 1000)),
    isFavorite: opts.isFavorite ?? false,
    niche: opts.niche,
    category: opts.category,
    folderId: opts.folderId ?? null,
    ...(opts.legacy !== undefined ? { legacy: opts.legacy } : {}),
    ...(opts.isDuplicate !== undefined ? { isDuplicate: opts.isDuplicate } : {}),
    ...(opts.userNotes !== undefined ? { userNotes: opts.userNotes } : {}),
  }
}

function makeV9Batch(batchId: string, niche: string, category: string): PromptBatchRecord {
  return {
    batchId,
    generatorInput: {
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
    } as PromptBatchRecord['generatorInput'],
    generatedAt: new Date(1_700_000_000_000),
  }
}

let migrator: Dexie

beforeAll(async () => {
  // Phase 1 — create the database at v9 and seed legacy fixtures.
  const v9 = new Dexie(FIXTURE_DB)
  v9.version(9).stores(V9_STORES)
  await v9.open()

  await v9.table('prompt_history').bulkAdd([
    // 1. Row with its own niche/category — row wins over batch values.
    makeV9Row('row-own', 'batch-a', { niche: 'Travel Photography', category: 'travel', isFavorite: true, folderId: 'folder-x' }),
    // 2. Row WITHOUT niche/category — must fall back to the batch's values.
    makeV9Row('row-fallback', 'batch-a'),
    // 3. Row whose batch does not exist — fallback batch must be synthesized.
    makeV9Row('row-missing-batch', 'batch-gone', { niche: 'Portrait Art', category: 'portrait', legacy: true }),
    // 4. Malformed niche/category — bounded deterministically, no crash.
    makeV9Row('row-malformed', 'batch-a', { niche: 42 as unknown, category: { bogus: true } as unknown, isDuplicate: true, userNotes: 'keep me' }),
  ])
  await v9.table('prompt_batches').bulkAdd([
    makeV9Batch('batch-a', 'Food Styling', 'food'),
  ])
  await v9.close()

  // Phase 2 — reopen with v10 declared; Dexie runs the real upgrade transaction.
  migrator = new Dexie(FIXTURE_DB)
  migrator.version(9).stores(V9_STORES)
  migrator.version(10).stores(V10_STORES).upgrade(upgradePromptHistoryToV10)
  await migrator.open()
})

describe('v9 → v10 database upgrade (real Dexie transaction)', () => {
  it('preserves row count and produces exactly two text rows per prompt', async () => {
    expect(await migrator.table('prompt_history').count()).toBe(4)
    const texts = await migrator.table('prompt_texts').toArray()
    expect(texts).toHaveLength(8)
    for (const id of ['row-own', 'row-fallback', 'row-missing-batch', 'row-malformed']) {
      const pair = await migrator.table('prompt_texts').where('promptId').equals(id).toArray()
      expect(pair.map((t) => t.platform).sort()).toEqual(['dalle3', 'nano_banana'])
    }
  })

  it('strips duplicated payloads from the metadata rows', async () => {
    for (const id of ['row-own', 'row-fallback', 'row-missing-batch', 'row-malformed']) {
      const row = (await migrator.table('prompt_history').get(id)) as PromptHistoryV10 & Record<string, unknown>
      expect(row).toBeDefined()
      expect('fullPrompt' in row).toBe(false)
      expect('platformVariants' in row).toBe(false)
    }
  })

  it('prefers row-level niche/category when present', async () => {
    const row = await migrator.table('prompt_history').get('row-own')
    expect(row?.nicheNormalized).toBe('travel photography')
    expect(row?.categoryKey).toBe('travel')
    // Search terms include the row's niche/category content, not batch content.
    expect(row?.searchTerms).toContain('travel')
    expect(row?.searchTerms).not.toContain('food')
  })

  it('falls back to batch-derived niche/category and includes them in search terms', async () => {
    const row = await migrator.table('prompt_history').get('row-fallback')
    expect(row?.nicheNormalized).toBe('food styling')
    expect(row?.categoryKey).toBe('food')
    expect(row?.searchTerms).toContain('food')
    expect(row?.searchTerms).toContain('styling')
    expect(row?.searchTerms).not.toContain('unknown')
  })

  it('synthesizes a fallback batch for rows whose batch is missing', async () => {
    const row = await migrator.table('prompt_history').get('row-missing-batch')
    expect(row?.batchId).toBe('batch-gone')
    const batch = await migrator.table('prompt_batches').get('batch-gone')
    expect(batch).toBeDefined()
    expect(batch?.generatorInput.niche).toBe('Portrait Art')
    expect(batch?.generatorInput.category).toBe('portrait')
  })

  it('treats malformed niche/category as absent (batch fallback) and keeps flags', async () => {
    const row = await migrator.table('prompt_history').get('row-malformed')
    // The row's niche/category are non-strings, so the batch fallback applies.
    expect(row?.nicheNormalized).toBe('food styling')
    expect(row?.categoryKey).toBe('food')
    expect(row?.isDuplicate).toBe(true)
    expect(row?.userNotes).toBe('keep me')
  })

  it('preserves favorite, folder, and legacy markers', async () => {
    const own = await migrator.table('prompt_history').get('row-own')
    expect(own?.isFavorite).toBe(true)
    expect(own?.folderId).toBe('folder-x')
    expect(own?.folderKey).not.toBe('')
    const legacy = await migrator.table('prompt_history').get('row-missing-batch')
    expect(legacy?.legacy).toBe(true)
  })
})

describe('migrateLegacyPromptRow (unit)', () => {
  it('falls back to batch-derived niche/category BEFORE building search terms', () => {
    const raw = {
      id: 'u-1',
      batchId: 'b-1',
      createdAt: new Date(1_700_000_000_000),
      platformVariants: { dalle3: 'sunset over ocean', nano_banana: '' },
      fullPrompt: 'sunset over ocean',
      commercialKeywords: [],
    }
    const result = migrateLegacyPromptRow(raw, 'Food Styling', 'food')
    expect(result.metadata.nicheNormalized).toBe('food styling')
    expect(result.metadata.categoryKey).toBe('food')
    // Search terms MUST include the batch niche content, not placeholder text.
    expect(result.metadata.searchTerms).toContain('food')
    expect(result.metadata.searchTerms).toContain('styling')
    expect(result.metadata.searchTerms).not.toContain('unknown')
  })

  it('prefers row-level niche/category and keeps row defaults bounded', () => {
    const result = migrateLegacyPromptRow(
      { id: 'u-2', batchId: 'b-2', createdAt: 1_700_000_000_000, niche: 'Travel Photography', category: 'travel', platformVariants: {}, fullPrompt: 'x', commercialKeywords: undefined },
      'Food Styling',
      'food',
    )
    expect(result.metadata.nicheNormalized).toBe('travel photography')
    expect(result.metadata.categoryKey).toBe('travel')
    expect(result.metadata.searchTerms).toContain('travel')
    expect(result.metadata.searchTerms).not.toContain('food')
  })

  it('derives the two text rows from platform variants then fullPrompt', () => {
    const result = migrateLegacyPromptRow(
      { id: 'u-3', batchId: 'b-3', createdAt: 1_700_000_000_000, platformVariants: { dalle3: 'text-a' }, fullPrompt: 'fallback', commercialKeywords: [] },
    )
    expect(result.texts).toEqual([
      { promptId: 'u-3', platform: 'dalle3', content: 'text-a' },
      { promptId: 'u-3', platform: 'nano_banana', content: 'fallback' },
    ])
  })

  it('bounds malformed input without throwing', () => {
    const result = migrateLegacyPromptRow(
      { id: 42 as unknown, batchId: { bad: true } as unknown, createdAt: 'not-a-date', niche: 42 as unknown, category: [] as unknown, platformVariants: null, fullPrompt: 7 as unknown, commercialKeywords: 'nope' },
    )
    expect(typeof result.metadata.id).toBe('string')
    expect(typeof result.metadata.batchId).toBe('string')
    expect(result.metadata.nicheNormalized).toBe('unknown')
    expect(result.metadata.categoryKey).toBe('other')
    expect(Array.isArray(result.metadata.commercialKeywords)).toBe(true)
    expect(result.texts).toHaveLength(2)
  })
})