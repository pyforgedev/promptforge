import type { CsvPreviewResult } from '@/services/formatter/formatterService'

export type { CsvPreviewResult }

export type { FormatterItem } from '@/services/storage/indexeddb'

export type InputMode = 'paste' | 'upload'
export type DownloadFormat = 'txt' | 'csv' | 'json'
export type DownloadScope = 'all' | 'remaining' | 'completed'


