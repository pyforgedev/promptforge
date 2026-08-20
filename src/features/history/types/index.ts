export interface Folder {
  id: string
  name: string
  parentId: string | null
  createdAt: number
}

/** Maximum number of folders a user may create (enforced in useHistoryStore). */
export const MAX_FOLDERS = 10

/** Thrown by createFolder when the folder limit has been reached. */
export class FolderLimitError extends Error {}

// Re-export types used by HistoryFilters — defined inline since
// the prompt-generator v2 types don't include these legacy types.
export type LegacyAspectRatio = AspectRatio | string
export type StylePresetKey = string
export type QualityScore = { overall: number }

export type HistorySort = 'date-desc' | 'date-asc' | 'rating-desc'

export interface HistoryItem {
  id: string
  content: string
  aspectRatio: LegacyAspectRatio
  niche: string
  stylePreset: StylePresetKey
  qualityScore: QualityScore
  createdAt: number
  savedAt: number
  folderId: string | null
  tags: string[]
  metadata?: {
    similarity?: number
    similarityLevel?: string
  }
}

export interface HistoryFilters {
  aspectRatio: 'all' | AspectRatio
  artStyleKey: 'all' | ArtStyleOption
  minScore: number
  dateFrom: string
  dateTo: string
  search: string
  sort: HistorySort
}
import type { ArtStyleOption, AspectRatio } from '@/features/prompt-generator/types'
