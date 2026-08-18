import db from './db'
import type { GeneratedPrompt, GeneratedPromptBatch } from '@/features/prompt-generator/types'

// Represents a single prompt record in the new, normalized schema.
export interface PromptHistoryRecord extends Omit<GeneratedPrompt, 'generatorInput' | 'prompts'> {
  folderId: string | null
  niche: string
  category: string
}

export type PromptBatchRecord = Omit<GeneratedPromptBatch, 'prompts'>

export interface HistoryQueryParams {
  folderId: string | null
  minRating: number
  search: string
  offset: number
  limit: number
}

export async function saveGeneratedPromptBatch(batch: GeneratedPromptBatch): Promise<string> {
  const { batchId, generatorInput, generatedAt, prompts } = batch

  const batchRecord: PromptBatchRecord = {
    batchId,
    generatorInput,
    generatedAt,
  }

  const historyRecords: PromptHistoryRecord[] = prompts.map((prompt: GeneratedPrompt) => {
    const { id, variantIndex, batchId: pbId, segments, negativePrompt, platformVariants, fullPrompt, commercialKeywords, adobeScore, variationAnchors, createdAt, isFavorite, userNotes, legacy, isDuplicate, duplicateRef } = prompt
    return {
      id, variantIndex, batchId: pbId, segments, negativePrompt, platformVariants, fullPrompt, commercialKeywords, adobeScore, variationAnchors, createdAt, isFavorite, userNotes, legacy,
      isDuplicate,
      duplicateRef,
      folderId: null,
      niche: generatorInput.niche,
      category: generatorInput.category ?? 'other',
    }
  })

  await db.prompt_batches.put(batchRecord)
  await db.prompt_history.bulkAdd(historyRecords)

  return batchId
}

export async function saveHistoryItem(item: Omit<PromptHistoryRecord, 'createdAt'>): Promise<string> {
  const record: PromptHistoryRecord = {
    ...item,
    createdAt: new Date(),
  }
  return db.prompt_history.put(record)
}

export async function getHistoryItems(): Promise<PromptHistoryRecord[]> {
  return db.prompt_history.toArray()
}

export async function getRecentRelevantHistory(category: string, limit: number): Promise<PromptHistoryRecord[]> {
  const targetCategory = category || 'other'
  return db.prompt_history
    .orderBy('createdAt')
    .reverse()
    .filter(item => item.category === targetCategory)
    .limit(limit)
    .toArray()
}

export async function queryHistoryItems(params: HistoryQueryParams): Promise<{ items: PromptHistoryRecord[], hasMore: boolean }> {
  const { folderId, minRating, search, offset, limit } = params

  let collection
  if (folderId !== null) {
    collection = db.prompt_history.where('folderId').equals(folderId)
  } else {
    collection = db.prompt_history.orderBy('createdAt').reverse()
  }

  const q = search ? search.toLowerCase() : ''
  collection = collection.filter(item => {
    if (minRating > 0 && (item.adobeScore?.total ?? 0) < minRating) return false
    if (q) {
      if (
        !item.fullPrompt.toLowerCase().includes(q) &&
        !item.niche.toLowerCase().includes(q) &&
        !item.category.toLowerCase().includes(q)
      ) {
        return false
      }
    }
    return true
  })

  const results = await collection.offset(offset).limit(limit + 1).toArray()

  if (folderId !== null) {
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  const hasMore = results.length > limit
  if (hasMore) {
    results.pop()
  }

  return {
    items: results,
    hasMore
  }
}

export async function deleteHistoryItem(id: string): Promise<void> {
  await db.prompt_history.delete(id)
}

export async function deleteHistoryItems(ids: string[]): Promise<void> {
  const CHUNK_SIZE = 50
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE)
    await db.transaction('rw', db.prompt_history, async () => {
      await Promise.all(chunk.map(id => db.prompt_history.delete(id)))
    })
  }
}

export async function deleteAllHistory(): Promise<void> {
  await db.prompt_history.clear()
}

export async function togglePromptFavorite(id: string): Promise<boolean> {
  const record = await db.prompt_history.get(id)
  if (!record) return false
  const next = !record.isFavorite
  await db.prompt_history.update(id, { isFavorite: next })
  return next
}

export async function deleteFolder(id: string): Promise<void> {
  await db.folders.delete(id)
}

export async function deleteFolderAndUnassign(id: string): Promise<void> {
  await db.transaction('rw', db.folders, db.prompt_history, async () => {
    await db.folders.delete(id)
    await db.prompt_history.where('folderId').equals(id).modify({ folderId: null })
  })
}

export async function bulkUpdateHistoryFolder(ids: string[], folderId: string | null): Promise<void> {
  await db.prompt_history.where('id').anyOf(ids).modify({ folderId })
}
