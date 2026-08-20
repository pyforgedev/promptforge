import { describe, expect, it, beforeEach, vi } from 'vitest'
import db from './db'
import * as retention from './retention'
import {
  RETENTION_DEFAULT_CAP,
  type RetentionPolicy,
} from './retention'
import { saveSetting, deleteSetting } from './settings'
import type { PromptHistoryV11, PromptTextRecord } from './history'
import { SENTINEL_UNKNOWN, tokenize, resolveFolderKey } from './historySearch'

const POLICY_KEY = 'history_retention_policy'
const LAST_PRUNED_KEY = 'history_last_pruned'
const DAY = 86_400_000

function makeRecord(id: string, opts: { createdAt?: number; favorite?: boolean; legacy?: boolean; batchId?: string }): PromptHistoryV11 {
  const createdAt = opts.createdAt ?? Date.now()
  return {
    id,
    batchId: opts.batchId ?? `batch-${id}`,
    variantIndex: 1,
    segments: { subject: id, composition: '', lighting: '', mood: '', style: '', technical: '', colorPalette: '', environment: '' },
    negativePrompt: '',
    commercialKeywords: [],
    adobeScore: {
      total: 0,
      breakdown: { commercialViability: 0, technicalQuality: 0, compositionStrength: 0, marketDiversity: 0 },
      warnings: [],
      suggestions: [],
    },
    variationAnchors: { primaryVariation: '', compositionStyle: '', lightingType: '', directionHint: '' },
    createdAt,
    isFavorite: !!opts.favorite,
    ...(opts.legacy ? { legacy: true } : {}),
    folderId: null,
    folderKey: resolveFolderKey(null),
    categoryKey: 'other',
    nicheNormalized: 'test',
    searchTerms: tokenize(id),
    aspectRatioKey: SENTINEL_UNKNOWN,
    artStyleKey: SENTINEL_UNKNOWN,
  }
}

function makeTexts(id: string): PromptTextRecord[] {
  return [
    { promptId: id, platform: 'dalle3', content: `text ${id}` },
    { promptId: id, platform: 'nano_banana', content: `text ${id}` },
  ]
}

async function seed(opts: { records: PromptHistoryV11[]; withTexts?: boolean }) {
  await db.prompt_history.bulkPut(opts.records)
  if (opts.withTexts) {
    await db.prompt_texts.bulkPut(opts.records.flatMap((r) => makeTexts(r.id)))
  }
  return opts.records
}

async function setPolicy(policy: RetentionPolicy) {
  await saveSetting(POLICY_KEY, policy)
}

describe('retention policy validation', () => {
  beforeEach(async () => {
    await db.settings.clear()
    await db.prompt_history.clear()
    await db.prompt_texts.clear()
    await db.prompt_batches.clear()
  })

  it('falls back to safe defaults for missing or corrupt policy', async () => {
    await deleteSetting(POLICY_KEY)
    expect(await retention.getRetentionPolicy()).toEqual({ version: 1, cap: RETENTION_DEFAULT_CAP, ttl: 'off' })

    await saveSetting(POLICY_KEY, { cap: 'garbage', ttl: 'nope' })
    expect(await retention.getRetentionPolicy()).toEqual({ version: 1, cap: RETENTION_DEFAULT_CAP, ttl: 'off' })

    await saveSetting(POLICY_KEY, null)
    expect(await retention.getRetentionPolicy()).toEqual({ version: 1, cap: RETENTION_DEFAULT_CAP, ttl: 'off' })
  })

  it('validates and bounds persisted policy values', async () => {
    await setPolicy({ version: 1, cap: 3, ttl: '365' })
    expect(await retention.getRetentionPolicy()).toEqual({ version: 1, cap: 100, ttl: '365' })

    await setPolicy({ version: 1, cap: 999_999, ttl: '90' })
    expect(await retention.getRetentionPolicy()).toEqual({ version: 1, cap: 100_000, ttl: '90' })

    expect(retention.isTtlOption('90')).toBe(true)
    expect(retention.isTtlOption('999')).toBe(false)
  })
})

describe('retention pruning', () => {
  beforeEach(async () => {
    await db.settings.clear()
    await db.prompt_history.clear()
    await db.prompt_texts.clear()
    await db.prompt_batches.clear()
  })

  it('prunes non-favorites older than the TTL cutoff, keeping recent rows and ALL favorites', async () => {
    await setPolicy({ version: 1, cap: RETENTION_DEFAULT_CAP, ttl: '180' })
    const now = Date.now()
    await seed({
      records: [
        makeRecord('old-1', { createdAt: now - 200 * DAY }),
        makeRecord('old-2', { createdAt: now - 365 * DAY }),
        makeRecord('recent-1', { createdAt: now - 30 * DAY }),
        makeRecord('recent-2', { createdAt: now - 10 * DAY }),
        makeRecord('favorite-old', { createdAt: now - 400 * DAY, favorite: true }),
      ],
      withTexts: true,
    })

    const deleted = await retention.runRetentionPrune({ force: true })

    expect(deleted).toBe(2)
    expect(await db.prompt_history.get('old-1')).toBeUndefined()
    expect(await db.prompt_history.get('old-2')).toBeUndefined()
    expect(await db.prompt_history.get('recent-1')).toBeDefined()
    expect(await db.prompt_history.get('recent-2')).toBeDefined()
    expect(await db.prompt_history.get('favorite-old')).toBeDefined()
    // Texts cascaded with the pruned rows
    expect(await db.prompt_texts.where('promptId').equals('old-1').count()).toBe(0)
  })

  it('enforces the cap by keeping the newest non-favorites and deleting the oldest overage', async () => {
    await setPolicy({ version: 1, cap: 100, ttl: 'off' })
    const now = Date.now()
    const records = [
      ...Array.from({ length: 103 }, (_, i) => makeRecord(`nf-${i}`, { createdAt: now - i * 1000 })),
      // Oldest rows in the store are favorites and must survive regardless of cap.
      makeRecord('fav-oldest-1', { createdAt: now - 1_000_000, favorite: true }),
      makeRecord('fav-oldest-2', { createdAt: now - 2_000_000, favorite: true }),
    ]
    await seed({ records, withTexts: true })

    const deleted = await retention.runRetentionPrune({ force: true })

    expect(deleted).toBe(3)
    expect(await db.prompt_history.get('nf-100')).toBeUndefined()
    expect(await db.prompt_history.get('nf-101')).toBeUndefined()
    expect(await db.prompt_history.get('nf-102')).toBeUndefined()
    expect(await db.prompt_history.get('nf-0')).toBeDefined()
    expect(await db.prompt_history.get('nf-99')).toBeDefined()
    expect(await db.prompt_history.get('fav-oldest-1')).toBeDefined()
    expect(await db.prompt_history.get('fav-oldest-2')).toBeDefined()
    expect(await db.prompt_history.count()).toBe(102)
  })

  it('cleans up shared batches only when they become orphaned', async () => {
    await setPolicy({ version: 1, cap: RETENTION_DEFAULT_CAP, ttl: '90' })
    const now = Date.now()
    await seed({
      records: [
        makeRecord('a', { createdAt: now - 100 * DAY, batchId: 'shared' }),
        makeRecord('b', { createdAt: now - 120 * DAY, batchId: 'shared' }),
        makeRecord('c', { createdAt: now - 110 * DAY, batchId: 'shared' }),
      ],
      withTexts: true,
    })
    await db.prompt_batches.put({ batchId: 'shared', generatorInput: { niche: 'x', category: 'other' } as never, generatedAt: new Date(now) })

    await retention.runRetentionPrune({ force: true })
    expect(await db.prompt_batches.get('shared')).toBeUndefined()
  })

  it('preview counts candidates without deleting anything', async () => {
    await setPolicy({ version: 1, cap: 100, ttl: 'off' })
    const now = Date.now()
    const records = Array.from({ length: 103 }, (_, i) => makeRecord(`pv-${i}`, { createdAt: now - i * 1000 }))
    await seed({ records, withTexts: true })

    const preview = await retention.previewRetentionPrune()
    expect(preview).toBe(3)
    expect(await db.prompt_history.count()).toBe(103)

    const prospective = await retention.previewRetentionPrune({ version: 1, cap: 101, ttl: 'off' })
    expect(prospective).toBe(2)
  })

  it('respects the auto-prune frequency gate but allows forced prunes', async () => {
    await setPolicy({ version: 1, cap: RETENTION_DEFAULT_CAP, ttl: '90' })
    const now = Date.now()
    await seed({ records: [makeRecord('v-1', { createdAt: now - 100 * DAY })], withTexts: true })

    expect(await retention.runRetentionPrune({ force: true })).toBe(1)
    // Immediately after, a non-forced run is gated by the 10-minute interval.
    await seed({ records: [makeRecord('v-2', { createdAt: now - 200 * DAY })], withTexts: true })
    expect(await retention.runRetentionPrune()).toBe(0)
    expect(await db.prompt_history.get('v-2')).toBeDefined()

    expect(await retention.runRetentionPrune({ force: true })).toBe(1)
    expect(await db.prompt_history.get('v-2')).toBeUndefined()
  })

  it('deletes nothing for a favorite-only dataset and leaves favorites untouched by emergency prune', async () => {
    await setPolicy({ version: 1, cap: 100, ttl: '90' })
    const now = Date.now()
    await seed({
      records: [
        makeRecord('fav-a', { createdAt: now - 400 * DAY, favorite: true }),
        makeRecord('fav-b', { createdAt: now - 500 * DAY, favorite: true }),
      ],
      withTexts: true,
    })

    expect(await retention.runRetentionPrune({ force: true })).toBe(0)
    expect(await db.prompt_history.count()).toBe(2)
    expect(await retention.emergencyPruneNonFavorites()).toBe(0)
    expect(await db.prompt_history.count()).toBe(2)
    expect(await db.prompt_history.get('fav-a')).toBeDefined()
    expect(await db.prompt_history.get('fav-b')).toBeDefined()
  })
})

describe('quota recovery', () => {
  beforeEach(async () => {
    await db.settings.clear()
    await db.prompt_history.clear()
    await db.prompt_texts.clear()
    await db.prompt_batches.clear()
  })

  it('retries the write exactly once after an emergency prune, then succeeds', async () => {
    await setPolicy({ version: 1, cap: RETENTION_DEFAULT_CAP, ttl: 'off' })
    const recover = vi.fn().mockResolvedValue(18)
    const write = vi.fn()
      .mockRejectedValueOnce(new DOMException('quota', 'QuotaExceededError'))
      .mockResolvedValueOnce('ok')

    const result = await retention.withQuotaRetry(write, recover)

    expect(result).toBe('ok')
    expect(write).toHaveBeenCalledTimes(2)
    expect(recover).toHaveBeenCalledTimes(1)
  })

  it('surfaces the quota error on a second failure — no retry loop, no auto-reset', async () => {
    await setPolicy({ version: 1, cap: RETENTION_DEFAULT_CAP, ttl: 'off' })
    const recover = vi.fn().mockResolvedValue(0)
    const quotaError = new DOMException('quota', 'QuotaExceededError')
    const write = vi.fn().mockRejectedValue(quotaError)

    await expect(retention.withQuotaRetry(write, recover)).rejects.toBe(quotaError)
    expect(write).toHaveBeenCalledTimes(2)
    expect(recover).toHaveBeenCalledTimes(1)
  })

  it('does not retry non-quota errors', async () => {
    const recover = vi.fn().mockResolvedValue(0)
    const boom = new Error('boom')
    const write = vi.fn().mockRejectedValue(boom)

    await expect(retention.withQuotaRetry(write, recover)).rejects.toBe(boom)
    expect(write).toHaveBeenCalledTimes(1)
    expect(recover).not.toHaveBeenCalled()
  })

  it('emergency prune deletes oldest non-favorites toward 90% of the cap', async () => {
    await setPolicy({ version: 1, cap: 100, ttl: 'off' })
    const now = Date.now()
    await seed({
      records: [
        ...Array.from({ length: 20 }, (_, i) => makeRecord(`eq-${i}`, { createdAt: now - i * 1000 })),
        makeRecord('eq-fav', { createdAt: now - 100_000, favorite: true }),
      ],
    })

    const deleted = await retention.emergencyPruneNonFavorites()
    // targetKept = 90 → all 20 non-favorites fit → nothing to delete
    expect(deleted).toBe(0)
    expect(await db.prompt_history.count()).toBe(21)
    expect(await db.prompt_history.get('eq-fav')).toBeDefined()
  })
})

describe('storage stats', () => {
  beforeEach(async () => {
    await db.settings.clear()
    await db.prompt_history.clear()
    await db.prompt_texts.clear()
    await db.prompt_batches.clear()
  })

  it('reports total, favorites, legacy, policy, last-pruned, and origin (unavailable fallback)', async () => {
    await setPolicy({ version: 1, cap: RETENTION_DEFAULT_CAP, ttl: '180' })
    await saveSetting(LAST_PRUNED_KEY, 1234567890)
    const now = Date.now()
    await seed({
      records: [
        makeRecord('a', { createdAt: now }),
        makeRecord('b', { createdAt: now, favorite: true }),
        makeRecord('c', { createdAt: now, legacy: true }),
        makeRecord('d', { createdAt: now, favorite: true, legacy: true }),
      ],
    })

    const stats = await retention.getHistoryStorageStats()
    expect(stats.total).toBe(4)
    expect(stats.favorites).toBe(2)
    expect(stats.legacy).toBe(2)
    expect(stats.policy.ttl).toBe('180')
    expect(stats.lastPruned).toBe(1234567890)
    expect(stats.prunePreview).toBe(0)
    // navigator.storage may be present in some environments; when unavailable it must be null.
    expect('origin' in stats).toBe(true)
  })
})
