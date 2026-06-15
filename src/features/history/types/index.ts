import type { AspectRatio, StylePresetKey, QualityScore } from '@/features/generator/types'

export interface Folder {
  id: string
  name: string
  parentId: string | null
  createdAt: number
}

export interface HistoryItem {
  id: string
  content: string
  aspectRatio: AspectRatio
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
  stylePreset: 'all' | StylePresetKey
  minRating: number
  dateFrom: string
  dateTo: string
  search: string
}
