import type { QualityScore } from '@/features/generator/types'

export interface HistoryItem {
  id: string
  content: string
  aspectRatio: string
  niche: string
  stylePreset: string
  qualityScore: QualityScore
  createdAt: number
  savedAt: number
}

export interface HistoryFilters {
  aspectRatio: string
  stylePreset: string
  minRating: number
  dateFrom: string
  dateTo: string
  search: string
}
