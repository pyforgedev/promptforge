/**
 * Pure search/normalization utilities for the normalized prompt history schema.
 *
 * This module intentionally has NO dependency on the Dexie `db` instance so it
 * can be imported from both `db.ts` (migration) and `history.ts` (runtime
 * writes/queries) without creating an import cycle.
 *
 * All limits below are hard caps — they exist to bound storage growth and CPU
 * cost of indexing/searching. They were agreed in the v10 architecture ADR
 * (docs/audit/architect.md) and form part of the storage contract.
 */

/** Reserved value standing in for a null folder id in compound index keys.
 *  IndexedDB keys cannot be `null`, so unfiled prompts use this sentinel.
 *  This exact string is rejected as a real folder id at write time. */
export const SENTINEL_UNFILED = '__unfiled__'

/** Hard cap on rows examined by a single query request (residual filter budget). */
export const MAX_CANDIDATES_PER_REQUEST = 200

/** Maximum number of tokens a user search query may contribute. */
export const MAX_QUERY_TOKENS = 20

/** Maximum number of tokens a single stored record may contribute to its search index. */
export const MAX_RECORD_TOKENS = 40

/** Maximum length of any single indexed token. */
export const MAX_TOKEN_LENGTH = 64

/** Minimum length of a query token (prevents single-character scatter queries). */
export const MIN_PREFIX_LENGTH = 2

/** Normalize text for search: Unicode NFKC + locale-agnostic lowercase. */
export function normalizeText(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input.normalize('NFKC').toLowerCase()
}

/**
 * Tokenize text into a bounded, deduplicated array of indexable tokens.
 * Tokens shorter than `MIN_PREFIX_LENGTH` are dropped so single-character
 * fragments never pollute the search terms.
 */
export function tokenize(text: unknown, limit: number = MAX_RECORD_TOKENS): string[] {
  const normalized = normalizeText(text)
  if (!normalized) return []
  const seen = new Set<string>()
  const tokens: string[] = []
  // Split on any run of non-letters/non-digits (Unicode-aware).
  for (const raw of normalized.split(/[^\p{L}\p{N}]+/u)) {
    if (!raw) continue
    const token = raw.slice(0, MAX_TOKEN_LENGTH)
    if (token.length < MIN_PREFIX_LENGTH) continue
    if (!seen.has(token)) {
      seen.add(token)
      tokens.push(token)
    }
    if (tokens.length >= limit) break
  }
  return tokens
}

/** Tokenize a user-supplied search query (stricter token budget than records). */
export function tokenizeQuery(search: unknown): string[] {
  return tokenize(search, MAX_QUERY_TOKENS)
}

/** True when every query token matches a stored term by exact match or prefix. */
export function matchesSearch(row: { searchTerms: string[] }, queryTokens: string[]): boolean {
  if (queryTokens.length === 0) return true
  const terms = row.searchTerms
  if (terms.length === 0) return false
  return queryTokens.every((token) => terms.some((term) => term.startsWith(token)))
}

/**
 * Deterministic hash of the normalized filters. Used to bind a cursor to the
 * filter combination it was created under, so a stale cursor from a previous
 * folder/search/rating is rejected instead of misapplied.
 */
export function hashFilters(filters: { folderId: string | null; minRating: number; searchTokens: string[] }): string {
  const canonical = JSON.stringify([filters.folderId, filters.minRating, filters.searchTokens])
  let hash = 5381
  for (let i = 0; i < canonical.length; i++) {
    hash = ((hash << 5) + hash + canonical.charCodeAt(i)) | 0
  }
  return (hash >>> 0).toString(36)
}

/** Coerce an unknown value into a non-negative finite number (epoch millis). */
export function toEpochMillis(value: unknown): number {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : Date.now()
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value))
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return Math.max(0, parsed)
  }
  return Date.now()
}

/** Coerce an unknown value into a bounded string (defaults to '' when invalid). */
export function boundedString(value: unknown, maxLength = 10_000): string {
  if (typeof value !== 'string') return ''
  return value.slice(0, maxLength)
}

/** Coerce an unknown value into a bounded array of strings. */
export function boundedStringArray(value: unknown, maxItems = 60, maxItemLength = 200): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const item of value) {
    if (typeof item !== 'string' || !item) continue
    out.push(item.slice(0, maxItemLength))
    if (out.length >= maxItems) break
  }
  return out
}

/** Coerce an unknown value into a bounded non-negative integer with a default. */
export function boundedInt(value: unknown, fallback: number, max = 10_000): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.min(Math.floor(value), max))
  }
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Math.max(0, Math.min(Math.floor(Number(value)), max))
  }
  return fallback
}

/** Resolve the folder key for a prompt record (sentinel for unfiled). */
export function resolveFolderKey(folderId: string | null | undefined): string {
  return typeof folderId === 'string' && folderId !== '' && folderId !== SENTINEL_UNFILED
    ? folderId
    : SENTINEL_UNFILED
}