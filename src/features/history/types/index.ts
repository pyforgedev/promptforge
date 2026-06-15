import type { AspectRatio, StylePresetKey } from '@/features/generator/types'

export interface HistoryItem {
  id: string
  content: string
  aspectRatio: string
  niche: string
  stylePreset: string
  qualityScore: any
  createdAt: number
  savedAt: number
  metadata?: {
    similarity?: number
    similarityLevel?: string
  }
}

export interface HistoryFilters {
  aspectRatio: string
  stylePreset: string
  minRating: number
  dateFrom: string
  dateTo: string
  search: string
}
