import Papa from 'papaparse'
import db, {
  type FormatterBatch,
  type FormatterItem,
  type FormatterSourceType,
} from '@/services/storage/indexeddb'
import { HIGH_THRESHOLD, calculateSimilarity } from '@/services/similarity/similarityService'

export interface CsvPreviewResult {
  columns: string[]
  detectedColumn: string | null
  previewRows: string[][]
}

export interface DuplicateMatch {
  index: number
  similarToIndex: number
  score: number
}

export type SanityLevel = 'ok' | 'warning' | 'warning_high' | 'blocked'

const ASPECT_RATIO_REGEX = /(?:--ar|--aspect|aspect[\s-]?ratio:?)\s*(\d{1,3}:\d{1,3})/i
const AUTO_DETECT_COLUMNS = new Set(['prompt', 'full_prompt', 'text'])

function resolveDetectedColumn(columns: string[]): string | null {
  if (columns.length === 0) {
    return null
  }

  if (columns.length === 1) {
    return columns[0]
  }

  const matches = columns.filter((column) => AUTO_DETECT_COLUMNS.has(column.toLowerCase()))

  if (matches.length === 1) {
    return matches[0]
  }

  return null
}

function filterItemsByScope(
  items: FormatterItem[],
  scope: 'all' | 'remaining' | 'completed',
): FormatterItem[] {
  if (scope === 'remaining') {
    return items.filter((item) => item.status === 'pending')
  }

  if (scope === 'completed') {
    return items.filter((item) => item.status === 'copied')
  }

  return items
}

export function parseRawText(input: string): string[] {
  const normalized = input
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (normalized.length === 0) {
    return []
  }

  const promptLines = normalized.filter((line) => /^prompt\s*:/i.test(line))
  if (promptLines.length > 0) {
    return promptLines.map((line) => line.replace(/^prompt\s*:\s*/i, '').trim())
  }

  return normalized
}

export function parseCsvPreview(fileContent: string): CsvPreviewResult {
  const result = Papa.parse<Record<string, string>>(fileContent, {
    header: true,
    skipEmptyLines: true,
  })
  const columns = result.meta.fields ?? []
  const previewRows = result.data.slice(0, 5).map((row) => columns.map((column) => row[column] ?? ''))

  return {
    columns,
    detectedColumn: resolveDetectedColumn(columns),
    previewRows,
  }
}

export function parseCsvWithColumn(fileContent: string, column: string): string[] {
  const result = Papa.parse<Record<string, string>>(fileContent, {
    header: true,
    skipEmptyLines: true,
  })
  const selectedValues = result.data.map((row) => row[column] ?? '')

  return parseRawText(selectedValues.join('\n'))
}

export function detectDuplicates(prompts: string[]): DuplicateMatch[] {
  const matches: DuplicateMatch[] = []

  for (let index = 0; index < prompts.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < prompts.length; compareIndex += 1) {
      const result = calculateSimilarity(prompts[index], [prompts[compareIndex]])

      if (result.score >= HIGH_THRESHOLD) {
        matches.push({
          index,
          similarToIndex: compareIndex,
          score: result.score,
        })
      }
    }
  }

  return matches
}

export function detectAspectRatio(promptText: string): string | null {
  return promptText.match(ASPECT_RATIO_REGEX)?.[1] ?? null
}

export function getUniqueAspectRatios(items: FormatterItem[]): string[] {
  const ratios = new Set<string>()
  for (const item of items) {
    if (item.detectedAspectRatio) {
      ratios.add(item.detectedAspectRatio)
    }
  }
  return Array.from(ratios).sort()
}

export function checkSanityLimit(count: number): SanityLevel {
  if (count >= 500) return 'blocked'
  if (count >= 300) return 'warning_high'
  if (count >= 100) return 'warning'
  return 'ok'
}

export async function createFormatterBatch(
  prompts: string[],
  sourceType: FormatterSourceType,
  originalFileName?: string,
): Promise<void> {
  const sanityLevel = checkSanityLimit(prompts.length)

  if (sanityLevel === 'blocked') {
    throw new Error(`Batch terlalu besar (${prompts.length} prompt, maksimal 500), pecah jadi beberapa file lebih kecil.`)
  }

  const batch: FormatterBatch = {
    sourceType,
    originalFileName: originalFileName ?? null,
    createdAt: new Date(),
    totalCount: prompts.length,
    currentIndex: 0,
  }

  const items: FormatterItem[] = prompts.map((promptText, order) => ({
    order,
    promptText,
    status: 'pending',
    copiedAt: null,
    detectedAspectRatio: detectAspectRatio(promptText),
  }))

  await db.transaction('rw', db.formatter_batch, db.formatter_items, async () => {
    await db.formatter_items.clear()
    await db.formatter_batch.clear()
    await db.formatter_batch.add(batch)

    if (items.length > 0) {
      await db.formatter_items.bulkAdd(items)
    }
  })
}

export async function markItemCopied(itemId: number): Promise<void> {
  await db.formatter_items.update(itemId, {
    status: 'copied',
    copiedAt: new Date(),
  })
}

export async function setCurrentIndex(index: number): Promise<void> {
  const activeBatch = await db.formatter_batch.toCollection().first()

  if (!activeBatch?.id) {
    return
  }

  await db.formatter_batch.update(activeBatch.id, { currentIndex: index })
}

export async function resetAllProgress(): Promise<void> {
  await db.transaction('rw', db.formatter_batch, db.formatter_items, async () => {
    await db.formatter_items.toCollection().modify({
      status: 'pending',
      copiedAt: null,
    })

    const activeBatch = await db.formatter_batch.toCollection().first()
    if (activeBatch?.id) {
      await db.formatter_batch.update(activeBatch.id, { currentIndex: 0 })
    }
  })
}

export async function getActiveBatch(): Promise<{ batch: FormatterBatch; items: FormatterItem[] } | null> {
  const batch = await db.formatter_batch.toCollection().first()

  if (!batch) {
    return null
  }

  const items = await db.formatter_items.orderBy('order').toArray()

  return { batch, items }
}

export function exportBatch(
  items: FormatterItem[],
  format: 'txt' | 'csv' | 'json',
  scope: 'all' | 'remaining' | 'completed',
  aspectRatio: string | null = null,
): string {
  let filteredItems = filterItemsByScope(items, scope)
  
  if (aspectRatio) {
    filteredItems = filteredItems.filter((item) => item.detectedAspectRatio === aspectRatio)
  }

  const rows = filteredItems.map((item) => ({
    index: item.order,
    prompt: item.promptText,
    status: item.status,
  }))

  if (format === 'txt') {
    return filteredItems.map((item) => item.promptText).join('\n')
  }

  if (format === 'csv') {
    return Papa.unparse({
      fields: ['index', 'prompt', 'status'],
      data: rows.map((row) => [row.index, row.prompt, row.status]),
    })
  }

  return JSON.stringify(rows, null, 2)
}
