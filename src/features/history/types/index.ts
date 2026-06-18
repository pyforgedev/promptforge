export interface Folder {
  id: string
  name: string
  parentId: string | null
  createdAt: number
}

// Re-export types used by HistoryFilters — defined inline since
// the prompt-generator v2 types don't include these legacy types.
export type LegacyAspectRatio = '1:1' | '4:5' | '3:4' | '16:9' | '9:16' | '2:3' | '3:2' | 'random' | string
export type StylePresetKey = string
export type QualityScore = { overall: number }

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
  aspectRatio: 'all' | LegacyAspectRatio
  stylePreset: 'all' | StylePresetKey
  minRating: number
  dateFrom: string
  dateTo: string
  search: string
}
