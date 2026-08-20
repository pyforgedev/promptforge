import db from './db'
import { getSetting, saveSetting } from './settings'
import type { PromptHistoryV10 } from './history'

/**
 * Retention & storage statistics for the normalized prompt history schema.
 *
 * Decisions (docs/audit/architect.md §Retention):
 * - Cap applies to NON-favorites only; favorites are never auto-pruned, even in
 *   an emergency quota prune.
 * - TTL defaults to off with options 90/180/365 days.
 * - Prune is oldest-first along the date index, chunked, and cascade-transactional
 *   (metadata + platform texts + orphaned batches).
 * - `QuotaExceededError` aborts the failed write, performs ONE emergency prune of
 *   non-favorites toward 90% of the active cap, then retries the write exactly once.
 * - Policy changes that immediately delete data require a preview + user confirmation
 *   before being applied; the confirmation happens in the UI layer, not here.
 */

export const RETENTION_DEFAULT_CAP = 5000
export const RETENTION_TTL_OPTIONS = ['off', '90', '180', '365'] as const
export type RetentionTtl = (typeof RETENTION_TTL_OPTIONS)[number]

export interface RetentionPolicy {
  /** Versioned so future fields can be added without breaking parsers. */
  version: 1
  cap: number
  ttl: RetentionTtl
}

export interface OriginUsage {
  /** Bytes. null when the Storage API is unavailable or errored. */
  usage: number | null
  quota: number | null
}

export interface HistoryStorageStats {
  policy: RetentionPolicy
  total: number
  favorites: number
  legacy: number
  lastPruned: number | null
  /** Number of candidates that would be deleted by a prune under the current policy. */
  prunePreview: number
  /** Origin-wide browser storage usage/quota — NOT the size of this history DB. */
  origin: OriginUsage
}

const POLICY_KEY = 'history_retention_policy'
const LAST_PRUNED_KEY = 'history_last_pruned'
const DAY_MS = 86_400_000
/** Max candidates deleted by one auto/prune run (keeps transactions bounded). */
const PRUNE_CHUNK = 500
/** Minimum interval between automatic (non-forced) prune runs. */
const AUTO_PRUNE_INTERVAL_MS = 10 * 60_000

export function isTtlOption(value: unknown): value is RetentionTtl {
  return typeof value === 'string' && (RETENTION_TTL_OPTIONS as readonly string[]).includes(value)
}

/** Validate any stored/input value into a safe, versioned policy. */
export function parsePolicy(value: unknown): RetentionPolicy {
  if (!value || typeof value !== 'object') {
    return { version: 1, cap: RETENTION_DEFAULT_CAP, ttl: 'off' }
  }
  const raw = value as { cap?: unknown; ttl?: unknown }
  const cap = Number.isFinite(Number(raw.cap))
    ? Math.max(100, Math.min(Math.floor(Number(raw.cap)), 100_000))
    : RETENTION_DEFAULT_CAP
  return {
    version: 1,
    cap,
    ttl: isTtlOption(raw.ttl) ? raw.ttl : 'off',
  }
}

export async function getRetentionPolicy(): Promise<RetentionPolicy> {
  const stored = await getSetting(POLICY_KEY)
  return parsePolicy(stored)
}

/** Persist a validated policy. Destructive application + prune is caller-triggered. */
export async function saveRetentionPolicy(policy: RetentionPolicy): Promise<void> {
  const safe = parsePolicy(policy)
  await saveSetting(POLICY_KEY, safe)
}

async function getLastPruned(): Promise<number | null> {
  const raw = await getSetting(LAST_PRUNED_KEY)
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null
}

async function markPruned(timestamp: number): Promise<void> {
  await saveSetting(LAST_PRUNED_KEY, timestamp)
}

// ─── Candidate engine ────────────────────────────────────────────────────────

function resolveCutoff(policy: RetentionPolicy): number | null {
  return policy.ttl === 'off' ? null : Date.now() - Number(policy.ttl) * DAY_MS
}

interface Candidate {
  id: string
  batchId: string
}

/**
 * Scan newest-first (date index descending) and collect non-favorite candidates:
 * - older than the TTL cutoff (when TTL is active), OR
 * - beyond the cap (kept non-favorites are the newest; candidates are the oldest overage).
 * Honors the optional maxCandidates budget; never includes favorites.
 */
async function collectPruneCandidates(policy: RetentionPolicy, maxCandidates = PRUNE_CHUNK): Promise<Candidate[]> {
  const cutoff = resolveCutoff(policy)
  const candidates: Candidate[] = []
  let kept = 0
  await db.prompt_history
    .orderBy('[createdAt+id]')
    .reverse()
    .until(() => candidates.length >= maxCandidates)
    .each((record) => {
      if (record.isFavorite) return
      const olderThanTtl = cutoff !== null && record.createdAt < cutoff
      if (olderThanTtl || kept >= policy.cap) {
        candidates.push({ id: record.id, batchId: record.batchId })
        return
      }
      kept++
    })
  return candidates
}

/** Count candidates (preview) without deleting anything. */
export async function previewRetentionPrune(policy?: RetentionPolicy): Promise<number> {
  const effective = policy ?? (await getRetentionPolicy())
  return collectPruneCandidates(effective, Number.MAX_SAFE_INTEGER).then((c) => c.length)
}

/** Delete candidates with cascade (platform texts + orphaned batches), transactionally, in bounded slices. */
async function deleteCandidates(candidates: Candidate[]): Promise<number> {
  if (candidates.length === 0) return 0
  await db.transaction('rw', db.prompt_history, db.prompt_texts, db.prompt_batches, async () => {
    const ids = candidates.map((c) => c.id)
    for (let i = 0; i < ids.length; i += 100) {
      const slice = ids.slice(i, i + 100)
      await db.prompt_history.where('id').anyOf(slice).delete()
      await db.prompt_texts.where('promptId').anyOf(slice).delete()
    }
    const batchIds = [...new Set(candidates.map((c) => c.batchId))]
    for (const batchId of batchIds) {
      const remaining = await db.prompt_history.where('batchId').equals(batchId).count()
      if (remaining === 0) {
        await db.prompt_batches.delete(batchId)
      }
    }
  })
  return candidates.length
}

/**
 * Run a retention prune under the current policy. Measures work in bounded
 * chunks: when the candidate budget is exhausted, the next run (or the next
 * explicit "Prune now") continues. `force` bypasses the auto-prune frequency gate.
 */
export async function runRetentionPrune(opts: { force?: boolean } = {}): Promise<number> {
  const policy = await getRetentionPolicy()
  if (!opts.force) {
    const last = await getLastPruned()
    if (last !== null && Date.now() - last < AUTO_PRUNE_INTERVAL_MS) {
      return 0
    }
  }
  const candidates = await collectPruneCandidates(policy)
  if (candidates.length === 0) return 0
  const deleted = await deleteCandidates(candidates)
  await markPruned(Date.now())
  return deleted
}

/** Emergency quota recovery: prune non-favorites down toward 90% of the active cap. */
export async function emergencyPruneNonFavorites(): Promise<number> {
  const policy = await getRetentionPolicy()
  const targetKept = Math.max(1, Math.floor(policy.cap * 0.9))
  const candidates: Candidate[] = []
  let kept = 0
  await db.prompt_history.orderBy('[createdAt+id]').reverse().each((record) => {
    if (record.isFavorite) return
    if (kept < targetKept) {
      kept++
      return
    }
    candidates.push({ id: record.id, batchId: record.batchId })
  })
  return deleteCandidates(candidates)
}

/** True for IndexedDB / browser quota exhaustion errors (several shapes exist). */
export function isQuotaExceededError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { name?: unknown; code?: unknown; message?: unknown }
  if (e.name === 'QuotaExceededError') return true
  if (typeof e.code === 'number' && [22, 1014].includes(e.code)) return true
  if (typeof e.message === 'string' && /quota/i.test(e.message)) return true
  return false
}

/**
 * Wrap a write (save) with exactly ONE emergency-quota retry.
 * The failed write is allowed to abort; we emergency-prune non-favorites and
 * retry once. Failure on the second attempt surfaces the actionable quota error
 * — no reset, no loop, no favorite deletion. `recover` is injectable for tests.
 */
export async function withQuotaRetry<T>(
  write: () => Promise<T>,
  recover: () => Promise<number> = emergencyPruneNonFavorites,
): Promise<T> {
  try {
    return await write()
  } catch (err) {
    if (!isQuotaExceededError(err)) throw err
    await recover()
    return write()
  }
}

// ─── Stats ───────────────────────────────────────────────────────────────────

async function getOriginUsage(): Promise<OriginUsage> {
  try {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined
    if (nav?.storage && typeof nav.storage.estimate === 'function') {
      const estimate = await nav.storage.estimate()
      return {
        usage: typeof estimate.usage === 'number' ? estimate.usage : null,
        quota: typeof estimate.quota === 'number' ? estimate.quota : null,
      }
    }
  } catch {
    // Storage API may be unavailable or throw (e.g. private mode) — explicit fallback.
  }
  return { usage: null, quota: null }
}

/** Aggregate stats for the Settings "History storage" card. */
export async function getHistoryStorageStats(): Promise<HistoryStorageStats> {
  const [policy, lastPruned, total, favorites, legacy, prunePreview, origin] = await Promise.all([
    getRetentionPolicy(),
    getLastPruned(),
    db.prompt_history.count(),
    db.prompt_history.toCollection().filter((r: PromptHistoryV10) => r.isFavorite === true).count(),
    db.prompt_history.toCollection().filter((r: PromptHistoryV10) => r.legacy === true).count(),
    previewRetentionPrune(),
    getOriginUsage(),
  ])
  return { policy, total, favorites, legacy, lastPruned, prunePreview, origin }
}

// ─── Idle scheduling (non-blocking, frequency-bounded) ───────────────────────

let pruneTimer: ReturnType<typeof setTimeout> | null = null

/** Schedule a deferred, frequency-bounded auto-prune after a successful save. */
export function scheduleRetentionPrune(delayMs = 5000): void {
  if (pruneTimer !== null) return
  pruneTimer = setTimeout(() => {
    pruneTimer = null
    void runRetentionPrune().catch(() => {
      // Pruning is best-effort; failures surface through explicit actions/stats.
    })
  }, delayMs)
}