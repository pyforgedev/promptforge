export type FormatterSourceType = 'paste' | 'file'
export type FormatterItemStatus = 'pending' | 'copied'

export interface FormatterBatch {
  id?: number
  sourceType: FormatterSourceType
  originalFileName: string | null
  createdAt: Date
  totalCount: number
  currentIndex: number
}

export interface FormatterItem {
  id?: number
  order: number
  promptText: string
  status: FormatterItemStatus
  copiedAt: Date | null
  detectedAspectRatio: string | null
}
