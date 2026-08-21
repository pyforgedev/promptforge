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

export interface ParsedFormatterInput {
  prompts: string[]
  aspectRatios: (string | null)[] | null
  skippedBlankCount: number
}

export interface CreateFormatterBatchCommand extends ParsedFormatterInput {
  sourceType: FormatterSourceType
  originalFileName?: string
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

export type QueueSort = 'order' | 'aspectRatio' | 'status' | 'length'
export type PromptType = 'image' | 'video'

export interface QueueViewOptions {
  scope: 'all' | 'remaining' | 'completed'
  aspectRatio: string | null
  type: 'all' | PromptType
  sort: QueueSort
}

const VIDEO_PROMPT_MARKERS = [
  /(^|\s)--video\b/i,
  /\bvideo\b/i,
  /\bveo\b/i,
  /\bsora\b/i,
  /\bkling\b/i,
  /\bhailuo\b/i,
  /\brunway\b/i,
  /\bpika\b/i,
  /\bpixverse\b/i,
  /\bluma\b/i,
  /\bwanx\b/i,
  /\bwalt\b/i,
  /\bcogvideox\b/i,
  /\bhotshot\b/i,
  /\bminimax\b/i,
  /\banimatediff\b/i,
  /\bdream machine\b/i,
  /\bstable video\b/i,
  /\bvideo diffusion\b/i,
]

// Heuristik: flag `--video`, kata "video", atau keyword model video → video;
// selain itu dianggap image. Sifatnya heuristik — false positive mungkin
// terjadi (mis. "video game" pada prompt image), filter tipe tetap opsional.
export function detectPromptType(promptText: string): PromptType {
  return VIDEO_PROMPT_MARKERS.some((marker) => marker.test(promptText)) ? 'video' : 'image'
}

export function applyQueueView(items: FormatterItem[], options: QueueViewOptions): FormatterItem[] {
  const { scope, aspectRatio, type, sort } = options

  let visible = filterItemsByScope(items, scope)

  if (aspectRatio) {
    visible = visible.filter((item) => item.detectedAspectRatio === aspectRatio)
  }

  if (type !== 'all') {
    visible = visible.filter((item) => detectPromptType(item.promptText) === type)
  }

  if (sort === 'aspectRatio') {
    // Sortir leksikografis (konsisten dengan getUniqueAspectRatios & daftar
    // filter AR): pengelompokan adalah tujuan utama, bukan urutan natural.
    visible = [...visible].sort((a, b) => {
      const ratioA = a.detectedAspectRatio ?? '\uffff'
      const ratioB = b.detectedAspectRatio ?? '\uffff'
      return ratioA.localeCompare(ratioB)
    })
  } else if (sort === 'status') {
    visible = [...visible].sort((a, b) => {
      const statusA = a.status === 'pending' ? 0 : 1
      const statusB = b.status === 'pending' ? 0 : 1
      return statusA - statusB
    })
  } else if (sort === 'length') {
    visible = [...visible].sort((a, b) => a.promptText.length - b.promptText.length)
  }

  return visible
}

export const SECTION_HEADER_REGEX = /^---\s*prompt(?:\s+\d+)?\s*---$/im

export function parsePromptSections(input: string): ParsedFormatterInput {
  const lines = input.replace(/\r\n/g, '\n').split('\n')
  const prompts: string[] = []
  const aspectRatios: (string | null)[] = []
  let aspectRatio: string | null = null
  let body: string[] = []
  let inBody = false
  let inSection = false
  let hasPromptField = false
  let skippedBlankCount = 0

  const closeSection = () => {
    if (!inSection) return

    const prompt = body.join(' ').trim()
    if (hasPromptField) {
      if (prompt.length > 0) {
        prompts.push(prompt)
        aspectRatios.push(aspectRatio)
      } else {
        skippedBlankCount += 1
      }
    }

    aspectRatio = null
    body = []
    inBody = false
    hasPromptField = false
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (SECTION_HEADER_REGEX.test(line)) {
      closeSection()
      inSection = true
      continue
    }

    if (!inSection) continue

    if (aspectRatio === null) {
      const arMatch = line.match(/^aspect\s+ratio\s*:\s*(\d{1,3}:\d{1,3})$/i)
      if (arMatch) {
        aspectRatio = arMatch[1]
        continue
      }
    }

    if (!inBody) {
      if (/^prompt\s*:/i.test(line)) {
        hasPromptField = true
        inBody = true
        const inlineValue = line.replace(/^prompt\s*:\s*/i, '').trim()
        if (inlineValue) {
          body.push(inlineValue)
        }
      }
      continue
    }

    if (line.length > 0) {
      body.push(line)
    }
  }

  closeSection()

  return { prompts, aspectRatios, skippedBlankCount }
}

export function parseRawText(input: string): ParsedFormatterInput {
  const normalizedInput = input.replace(/\r\n/g, '\n')
  const lines = normalizedInput.split('\n').map((line) => line.trim())
  const promptLines = lines.filter((line) => /^prompt\s*:/i.test(line))

  if (promptLines.length > 0) {
    const values = promptLines.map((line) => line.replace(/^prompt\s*:\s*/i, '').trim())
    return {
      prompts: values.filter(Boolean),
      aspectRatios: null,
      skippedBlankCount: values.filter((value) => value.length === 0).length,
    }
  }

  const mdPromptLines = lines.filter((line) => /^-\s*\*\*prompt\s*:\*\*/i.test(line))
  if (mdPromptLines.length > 0) {
    const values = mdPromptLines.map((line) => line.replace(/^-\s*\*\*prompt\s*:\*\*\s*/i, '').trim())
    return {
      prompts: values.filter(Boolean),
      aspectRatios: null,
      skippedBlankCount: values.filter((value) => value.length === 0).length,
    }
  }

  if (normalizedInput.length === 0) {
    return { prompts: [], aspectRatios: null, skippedBlankCount: 0 }
  }

  if (normalizedInput.endsWith('\n')) {
    lines.pop()
  }

  return {
    prompts: lines.filter(Boolean),
    aspectRatios: null,
    skippedBlankCount: lines.filter((line) => line.length === 0).length,
  }
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

export function parseCsvWithColumn(fileContent: string, column: string): ParsedFormatterInput {
  const result = Papa.parse<Record<string, string>>(fileContent, {
    header: true,
    skipEmptyLines: true,
  })
  const selectedValues = result.data.map((row) => row[column] ?? '')
  const skippedBlankCount = selectedValues.filter((value) => value.trim().length === 0).length
  const parsed = parseRawText(selectedValues.filter((value) => value.trim().length > 0).join('\n'))

  return {
    prompts: parsed.prompts,
    aspectRatios: null,
    skippedBlankCount,
  }
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

function countDuplicatePromptRows(prompts: string[]): number {
  let duplicatePromptCount = 0

  for (let index = 1; index < prompts.length; index += 1) {
    for (let priorIndex = 0; priorIndex < index; priorIndex += 1) {
      const result = calculateSimilarity(prompts[index], [prompts[priorIndex]])

      if (result.score >= HIGH_THRESHOLD) {
        duplicatePromptCount += 1
        break
      }
    }
  }

  return duplicatePromptCount
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

export async function createFormatterBatch({
  prompts,
  sourceType,
  originalFileName,
  aspectRatios,
  skippedBlankCount,
}: CreateFormatterBatchCommand): Promise<void> {
  const sanityLevel = checkSanityLimit(prompts.length)

  if (sanityLevel === 'blocked') {
    throw new Error(`Batch terlalu besar (${prompts.length} prompt, maksimal 500), pecah jadi beberapa file lebih kecil.`)
  }

  if (!Number.isInteger(skippedBlankCount) || skippedBlankCount < 0) {
    throw new TypeError('skippedBlankCount must be a non-negative integer')
  }

  const duplicatePromptCount = countDuplicatePromptRows(prompts)

  const batch: FormatterBatch = {
    sourceType,
    originalFileName: originalFileName ?? null,
    createdAt: new Date(),
    totalCount: prompts.length,
    currentIndex: 0,
    processSummary: {
      skippedBlankCount,
      duplicatePromptCount,
    },
  }

  const items: FormatterItem[] = prompts.map((promptText, order) => ({
    order,
    promptText,
    status: 'pending',
    copiedAt: null,
    detectedAspectRatio: aspectRatios?.[order] ?? detectAspectRatio(promptText),
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

export async function markCopiedAndAdvance(itemId: number, nextIndex: number): Promise<void> {
  await db.transaction('rw', db.formatter_batch, db.formatter_items, async () => {
    const updated = await db.formatter_items.update(itemId, {
      status: 'copied',
      copiedAt: new Date(),
    })

    if (updated === 0) {
      return
    }

    const activeBatch = await db.formatter_batch.toCollection().first()
    if (activeBatch?.id) {
      await db.formatter_batch.update(activeBatch.id, { currentIndex: nextIndex })
    }
  })
}

export async function clearQueue(): Promise<void> {
  await db.transaction('rw', db.formatter_batch, db.formatter_items, async () => {
    await db.formatter_items.clear()
    await db.formatter_batch.clear()
  })
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

export function exportBatch(items: FormatterItem[], format: 'txt' | 'csv' | 'json'): string {
  const rows = items.map((item) => ({
    index: item.order,
    prompt: item.promptText,
    status: item.status,
  }))

  if (format === 'txt') {
    return items.map((item) => item.promptText).join('\n')
  }

  if (format === 'csv') {
    return Papa.unparse({
      fields: ['index', 'prompt', 'status'],
      data: rows.map((row) => [row.index, row.prompt, row.status]),
    })
  }

  return JSON.stringify(rows, null, 2)
}
