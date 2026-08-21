// ─── Niche Categories ────────────────────────────────────────────────────────
// Single source of truth for Generator niche categories.
// NOTE: `general` is intentionally NOT here — it is Templates-only.

export const NICHE_CATEGORIES = [
  'technology',
  'business',
  'nature',
  'lifestyle',
  'healthcare',
  'food',
  'travel',
  'education',
  'abstract',
  'people',
  'architecture',
  'other',
] as const

export type NicheCategory = typeof NICHE_CATEGORIES[number]