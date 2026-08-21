import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import Dexie from 'dexie'
import { migrateLegacyPromptRow, upgradePromptHistoryToV10, upgradePromptHistoryToV11, upgradeTemplatesToV12 } from './db'
import type { PromptHistoryV10, PromptBatchRecord } from './history'
import { SENTINEL_UNKNOWN } from './historySearch'
import { defaultTemplate, DEFAULT_TEMPLATE_KEY, DEFAULT_TEMPLATE_SEED_SETTING } from '@/features/templates/defaultTemplate'

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
const V11_FIXTURE_DB = 'promptforge-v10-v11-migration-fixture'
const V12_FIXTURE_DB = 'promptforge-v11-v12-migration-fixture'

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

const V11_STORES = {
  ...V10_STORES,
  prompt_history: 'id, batchId, createdAt, folderId, folderKey, categoryKey, [createdAt+id], [folderKey+createdAt+id], [categoryKey+createdAt+id], [adobeScore.total+createdAt+id], [folderKey+adobeScore.total+createdAt+id]',
}

const V12_STORES = {
  ...V11_STORES,
  prompts: 'id, name, nameKey, category, createdAt, updatedAt, builtinKey, [updatedAt+id]',
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
let v11Migrator: Dexie
let v12Migrator: Dexie

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

  const v10 = new Dexie(V11_FIXTURE_DB)
  v10.version(10).stores(V10_STORES)
  await v10.open()
  const rows = [
    { id: 'user-mode', batchId: 'batch-user', categoryKey: 'Raw-CATEGORY' },
    { id: 'system-mode', batchId: 'batch-system', categoryKey: 'system-raw' },
    { id: 'missing-batch', batchId: 'batch-missing', categoryKey: 'missing-raw' },
    { id: 'malformed-batch', batchId: 'batch-malformed', categoryKey: 'malformed-raw' },
  ].map((entry, index) => ({
    ...entry,
    variantIndex: 1,
    segments: { subject: entry.id, composition: '', lighting: '', mood: '', style: '', technical: '', colorPalette: '', environment: '' },
    negativePrompt: '', commercialKeywords: [],
    adobeScore: { total: 50 + index, breakdown: { commercialViability: 0, technicalQuality: 0, compositionStrength: 0, marketDiversity: 0 }, warnings: [], suggestions: [] },
    variationAnchors: { primaryVariation: '', compositionStyle: '', lightingType: '', directionHint: '' },
    createdAt: 100 + index, isFavorite: false, folderId: null, folderKey: '__unfiled__',
    nicheNormalized: 'fixture', searchTerms: ['fixture'],
  }))
  await v10.table('prompt_history').bulkAdd(rows)
  const texts = rows.flatMap((row) => [
    { promptId: row.id, platform: 'dalle3', content: `dalle-${row.id}` },
    { promptId: row.id, platform: 'nano_banana', content: `nano-${row.id}` },
  ])
  await v10.table('prompt_texts').bulkAdd(texts)
  await v10.table('prompt_batches').bulkAdd([
    { ...makeV9Batch('batch-user', 'User', 'user'), generatorInput: { ...makeV9Batch('batch-user', 'User', 'user').generatorInput, aspectRatio: '16:9', artStyle: { mode: 'user', value: 'minimalist' } } },
    { ...makeV9Batch('batch-system', 'System', 'system'), generatorInput: { ...makeV9Batch('batch-system', 'System', 'system').generatorInput, aspectRatio: '4:5', artStyle: { mode: 'system', value: 'minimalist' } } },
    { batchId: 'batch-malformed', generatorInput: { aspectRatio: 'bogus', artStyle: null }, generatedAt: new Date(0) },
  ])
  await v10.close()

  v11Migrator = new Dexie(V11_FIXTURE_DB)
  v11Migrator.version(10).stores(V10_STORES)
  v11Migrator.version(11).stores(V11_STORES).upgrade(upgradePromptHistoryToV11)
  await v11Migrator.open()

  const v11 = new Dexie(V12_FIXTURE_DB)
  v11.version(11).stores(V11_STORES)
  await v11.open()
  await v11.table('prompts').bulkAdd([
    {
      id: 'template-preserved', name: 'Preserved', content: 'core content', category: 'travel',
      tags: ['one', 'two'], createdAt: 100, source: 'manual', negativePrompt: 'no blur',
    },
    { id: 'duplicate-a', name: ' Duplicate ', content: 'first', category: 'general', tags: [], createdAt: 200 },
    { id: 'duplicate-b', name: 'duplicate', content: 'second', category: 'general', tags: [], createdAt: 300 },
    {
      id: 'default-fingerprint', name: defaultTemplate.name, content: defaultTemplate.content,
      category: defaultTemplate.category, tags: defaultTemplate.tags, createdAt: 400,
    },
  ])
  await v11.close()

  v12Migrator = new Dexie(V12_FIXTURE_DB)
  v12Migrator.version(11).stores(V11_STORES)
  v12Migrator.version(12).stores(V12_STORES).upgrade(upgradeTemplatesToV12)
  await v12Migrator.open()
})

afterAll(async () => {
  migrator?.close()
  v11Migrator?.close()
  v12Migrator?.close()
  // Delete only the three throwaway fixture databases owned by this test file.
  await Dexie.delete(FIXTURE_DB)
  await Dexie.delete(V11_FIXTURE_DB)
  await Dexie.delete(V12_FIXTURE_DB)
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

describe('v10 → v11 database upgrade (real Dexie transaction)', () => {
  it('retains all date indexes, adds both rating indexes, and preserves row count', async () => {
    const indexNames = v11Migrator.table('prompt_history').schema.indexes.map((index) => index.name)
    expect(indexNames).toEqual(expect.arrayContaining([
      '[createdAt+id]',
      '[folderKey+createdAt+id]',
      '[categoryKey+createdAt+id]',
      '[adobeScore.total+createdAt+id]',
      '[folderKey+adobeScore.total+createdAt+id]',
    ]))
    expect(await v11Migrator.table('prompt_history').count()).toBe(4)
  })

  it('populates user snapshots and maps system, missing, and malformed batches to sentinels', async () => {
    const user = await v11Migrator.table('prompt_history').get('user-mode')
    expect(user).toMatchObject({ aspectRatioKey: '16:9', artStyleKey: 'minimalist' })
    const system = await v11Migrator.table('prompt_history').get('system-mode')
    expect(system).toMatchObject({ aspectRatioKey: '4:5', artStyleKey: SENTINEL_UNKNOWN })
    for (const id of ['missing-batch', 'malformed-batch']) {
      expect(await v11Migrator.table('prompt_history').get(id)).toMatchObject({
        aspectRatioKey: SENTINEL_UNKNOWN,
        artStyleKey: SENTINEL_UNKNOWN,
      })
    }
  })

  it('leaves raw category snapshots and prompt text rows unchanged', async () => {
    const categories = Object.fromEntries((await v11Migrator.table('prompt_history').toArray()).map((row) => [row.id, row.categoryKey]))
    expect(categories).toEqual({
      'user-mode': 'Raw-CATEGORY',
      'system-mode': 'system-raw',
      'missing-batch': 'missing-raw',
      'malformed-batch': 'malformed-raw',
    })
    const texts = await v11Migrator.table('prompt_texts').orderBy('[promptId+platform]').toArray()
    expect(texts).toHaveLength(8)
    expect(texts.find((row) => row.promptId === 'user-mode' && row.platform === 'dalle3')?.content).toBe('dalle-user-mode')
  })
})

describe('v11 → v12 template upgrade (real Dexie transaction)', () => {
  it('preserves row identities and core content while backfilling normalized fields', async () => {
    const rows = await v12Migrator.table('prompts').toArray()
    expect(rows).toHaveLength(4)
    expect(rows.map((row) => row.id).sort()).toEqual([
      'default-fingerprint', 'duplicate-a', 'duplicate-b', 'template-preserved',
    ])

    const preserved = await v12Migrator.table('prompts').get('template-preserved')
    expect(preserved).toMatchObject({
      id: 'template-preserved',
      name: 'Preserved',
      nameKey: 'preserved',
      content: 'core content',
      category: 'travel',
      tags: ['one', 'two'],
      createdAt: 100,
      updatedAt: 100,
      source: 'manual',
      negativePrompt: 'no blur',
    })
  })

  it('marks every normalized legacy duplicate without merging either row', async () => {
    const duplicates = await v12Migrator.table('prompts').bulkGet(['duplicate-a', 'duplicate-b'])
    expect(duplicates).toHaveLength(2)
    for (const row of duplicates) {
      expect(row).toMatchObject({ nameKey: 'duplicate', legacyNameCollision: true, source: 'legacy' })
    }
    expect(duplicates.map((row) => row?.content)).toEqual(['first', 'second'])
  })

  it('recognizes the single exact default fingerprint as the builtin template', async () => {
    expect(await v12Migrator.table('prompts').get('default-fingerprint')).toMatchObject({
      builtinKey: DEFAULT_TEMPLATE_KEY,
      source: 'builtin',
    })
  })

  it('records that pre-v12 users have completed default-template seeding', async () => {
    expect(await v12Migrator.table('settings').get(DEFAULT_TEMPLATE_SEED_SETTING)).toMatchObject({
      key: DEFAULT_TEMPLATE_SEED_SETTING,
      value: { status: 'pre-v12-complete', updatedAt: expect.any(Number) },
    })
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
