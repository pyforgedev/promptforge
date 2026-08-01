import type { CsvPreviewResult, PromptType, QueueSort, QueueViewOptions } from '@/services/formatter/formatterService'

export type { CsvPreviewResult, PromptType, QueueSort, QueueViewOptions }

export type { FormatterItem } from '@/services/storage/indexeddb'

export type InputMode = 'paste' | 'upload'
export type DownloadFormat = 'txt' | 'csv' | 'json'
export type DownloadScope = 'all' | 'remaining' | 'completed'


