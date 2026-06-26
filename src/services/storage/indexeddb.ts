
import Dexie, { type EntityTable } from 'dexie'
import { v4 as uuidv4 } from 'uuid'
import type { Prompt } from '@/types'
import type { Folder } from '@/features/history/types'
import type { GeneratedPrompt, GeneratedPromptBatch, GeneratorInput } from '@/features/prompt-generator/types'

import { encrypt, decrypt } from '@/lib/crypto'

const DB_NAME = 'promptforge'

export interface IdeaCacheEntry {
  cacheKey: string; // Primary key: `${niche}|${stylePreset}`
  queue: string[];
  used: string[];
  lastUpdated: number; // Timestamp
}

// Represents a single prompt record in the new, normalized schema.
export interface PromptHistoryRecord extends Omit<GeneratedPrompt, 'generatorInput' | 'prompts'> {
  folderId: string | null
  niche: string
  category: string
}

// Note: This interface is intentionally empty as it extends an Omit type.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PromptBatchRecord extends Omit<GeneratedPromptBatch, 'prompts'> {
  // batchId is the primary key
}

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


class PromptForgeDB extends Dexie {
  prompts!: EntityTable<Prompt, 'id'>
  history!: EntityTable<Record<string, unknown>, 'id'>
  prompt_history!: EntityTable<PromptHistoryRecord, 'id'>
  prompt_batches!: EntityTable<PromptBatchRecord, 'batchId'>
  folders!: EntityTable<Folder, 'id'>
  settings!: EntityTable<{ key: string; value: unknown }, 'key'>
  generatorState!: EntityTable<{ key: string; value: unknown }, 'key'>
  idea_cache!: EntityTable<IdeaCacheEntry, 'cacheKey'>
  formatter_batch!: EntityTable<FormatterBatch, 'id'>
  formatter_items!: EntityTable<FormatterItem, 'id'>

  constructor() {
    super(DB_NAME)
    
    // Version 5 Schema (pre-refactor)
    this.version(5).stores({
      prompts: 'id, name, category, createdAt',
      history: 'id, aspectRatio, stylePreset, niche, createdAt, savedAt, content, qualityScore, folderId, *tags',
      folders: 'id, name, parentId, createdAt',
      settings: 'key',
      generatorState: 'key',
      idea_cache: 'cacheKey, lastUpdated',
    })

    // Version 6 Schema (Prompt Engine Refactor)
    this.version(6).stores({
      // New tables for normalized prompt generation history
      prompt_history: 'id, batchId, createdAt, isFavorite, adobeScore.total, *commercialKeywords, legacy',
      prompt_batches: 'batchId, generatedAt, generatorInput.niche, generatorInput.category, generatorInput.usageContext',

      // Deprecated table
      history: null, // Drop the old 'history' table
      
      // Unchanged tables
      prompts: 'id, name, category, createdAt',
      folders: 'id, name, parentId, createdAt',
      settings: 'key',
      generatorState: 'key',
      idea_cache: 'cacheKey, lastUpdated',
    }).upgrade(async (trans) => {
      console.log('Upgrading Dexie schema to version 6...')
      const oldHistoryTable = trans.table('history')
      const newHistoryTable = trans.table('prompt_history')
      const newBatchesTable = trans.table('prompt_batches')

      const legacyItems = await oldHistoryTable.toArray()
      if (legacyItems.length === 0) {
        console.log('No legacy history items to migrate.')
        return
      }

      console.log(`Found ${legacyItems.length} legacy items to migrate.`)

      const newHistoryRecords: PromptHistoryRecord[] = []
      const newBatchRecords: PromptBatchRecord[] = []

      for (const item of legacyItems) {
        const batchId = uuidv4()
        const createdAt = new Date(item.savedAt || item.createdAt || Date.now())

        const niche = item.niche || 'Unknown'
        const category = 'other'

        const generatorInput: GeneratorInput = {
          niche,
          category,
          batchSize: 1,
          usageContext: 'commercial',
          language: 'en',
          aspectRatio: 'random',
          variationLevel: 3,
          styleMode: 'user',
          mood: { mode: 'user', value: 'none' },
          colorPalette: { mode: 'user', value: 'none' },
          artStyle: { mode: 'user', value: 'none' },
          background: { mode: 'user', value: 'none' },
          humanModel: { mode: 'user', value: 'no_people' },
          customInstructions: '',
          includeHistory: false,
          includeHistoryCount: 20,
          targetMarket: 'global',
          targetPlatform: 'dalle3',
          includeDiversity: true,
          allowTextSpace: false,
          includeNegativePrompts: true,
          includeKeywords: true,
        }

        // Create a batch record for this single legacy prompt
        newBatchRecords.push({
          batchId,
          generatorInput,
          generatedAt: createdAt,
        })
        
        // Create the new history record, marking it as legacy
        newHistoryRecords.push({
          id: item.id,
          batchId,
          variantIndex: 1,
          segments: { subject: '', composition: '', lighting: '', mood: '', style: '', technical: '', colorPalette: '', environment: '' },
          negativePrompt: '',
          platformVariants: { dalle3: item.content, nano_banana: item.content },
          fullPrompt: item.content,
          commercialKeywords: item.tags || [],
          adobeScore: {
            total: item.qualityScore || 0,
            breakdown: { commercialViability: 0, technicalQuality: 0, compositionStrength: 0, marketDiversity: 0 },
            warnings: ['Legacy prompt, score is estimated.'],
            suggestions: [],
          },
          variationAnchors: { primaryVariation: '', compositionStyle: '', lightingType: '', directionHint: '' },
          createdAt,
          isFavorite: !!item.isFavorite,
          legacy: true,
          niche,
          category,
          folderId: item.folderId || null,
        })
      }
      
      console.log(`Migrating ${newBatchRecords.length} new batch records...`)
      await newBatchesTable.bulkAdd(newBatchRecords)
      
      console.log(`Migrating ${newHistoryRecords.length} new history records...`)
      await newHistoryTable.bulkAdd(newHistoryRecords)
      
      console.log('Migration to version 6 complete.')
    })

    this.version(7).stores({
      prompt_history: 'id, batchId, createdAt, isFavorite, adobeScore.total, *commercialKeywords, legacy, category, folderId',
      prompt_batches: 'batchId, generatedAt, generatorInput.niche, generatorInput.category, generatorInput.usageContext',
      prompts: 'id, name, category, createdAt',
      folders: 'id, name, parentId, createdAt',
      settings: 'key',
      generatorState: 'key',
      idea_cache: 'cacheKey, lastUpdated',
    })

    this.version(8).stores({
      prompt_history: 'id, batchId, createdAt, isFavorite, adobeScore.total, *commercialKeywords, legacy, category, folderId',
      prompt_batches: 'batchId, generatedAt, generatorInput.niche, generatorInput.category, generatorInput.usageContext',
      prompts: 'id, name, category, createdAt',
      folders: 'id, name, parentId, createdAt',
      settings: 'key',
      generatorState: 'key',
      idea_cache: 'cacheKey, lastUpdated',
      formatter_batch: '++id, createdAt',
      formatter_items: '++id, order, status',
    })
  }
}

const db = new PromptForgeDB()

// Helper for retries with exponential backoff
export async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 500): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (retries <= 0) throw error
    await new Promise((res) => setTimeout(res, delay))
    return withRetry(fn, retries - 1, delay * 2)
  }
}

export async function getPrompt(id: string): Promise<Prompt | undefined> {
  return db.prompts.get(id)
}

export async function getAllPrompts(): Promise<Prompt[]> {
  return db.prompts.toArray()
}

export async function savePrompt(prompt: Prompt): Promise<string> {
  return db.prompts.put(prompt)
}

export async function deletePrompt(id: string): Promise<void> {
  await db.prompts.delete(id)
}

export async function getSetting(key: string): Promise<unknown> {
  const record = await db.settings.get(key)
  if (!record) return undefined
  
  if (key.includes('config') || key.includes('preset') || key.includes('api_key')) {
    try {
      const decrypted = await decrypt(record.value as string)
      return JSON.parse(decrypted)
    } catch {
      return record.value
    }
  }
  return record.value
}

export async function saveSetting(key: string, value: unknown): Promise<void> {
  let valToSave = value
  if (key.includes('config') || key.includes('preset') || key.includes('api_key')) {
    const json = JSON.stringify(value)
    valToSave = await encrypt(json)
  }
  await db.settings.put({ key, value: valToSave })
}

// === HISTORY REFACTOR - Functions below need updating or removal ===

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

export interface HistoryQueryParams {
  folderId: string | null
  searchMode: 'global' | 'local'
  minRating: number
  search: string
  offset: number
  limit: number
}

export async function queryHistoryItems(params: HistoryQueryParams): Promise<{ items: PromptHistoryRecord[], hasMore: boolean }> {
  const { folderId, searchMode, minRating, search, offset, limit } = params
  
  let collection
  if (searchMode === 'local' && folderId !== null) {
    collection = db.prompt_history.where('folderId').equals(folderId)
  } else {
    collection = db.prompt_history.orderBy('createdAt').reverse()
  }

  const q = search ? search.toLowerCase() : ''
  collection = collection.filter(item => {
    if (searchMode === 'local' && item.folderId !== folderId) return false
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
  
  if (searchMode === 'local' && folderId !== null) {
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

export async function bulkUpdateHistoryFolder(ids: string[], folderId: string | null): Promise<void> {
  await db.prompt_history.where('id').anyOf(ids).modify({ folderId })
}

// Folder helpers - These now operate on prompt_history
export async function getFolders(): Promise<Folder[]> {
  return db.folders.toArray()
}

export async function saveFolder(folder: Folder): Promise<string> {
  return db.folders.put(folder)
}

export async function updateFolder(id: string, updates: Partial<Pick<Folder, 'name' | 'parentId'>>): Promise<void> {
  await db.folders.update(id, updates)
}

export async function getGeneratorState(key: string): Promise<unknown> {
  const record = await db.generatorState.get(key)
  return record?.value
}

export async function saveGeneratorState(key: string, value: unknown): Promise<void> {
  await db.generatorState.put({ key, value })
}

export async function getIdeaCache(cacheKey: string): Promise<IdeaCacheEntry | undefined> {
  return db.idea_cache.get(cacheKey)
}

export async function saveIdeaCache(entry: IdeaCacheEntry): Promise<string> {
  return db.idea_cache.put(entry)
}

export async function deleteIdeaCache(cacheKey: string): Promise<void> {
  await db.idea_cache.delete(cacheKey)
}

export async function clearExpiredIdeaCache(threshold: number): Promise<void> {
  const expiredKeys = await db.idea_cache
    .where('lastUpdated')
    .below(Date.now() - threshold)
    .primaryKeys()
  await db.idea_cache.bulkDelete(expiredKeys)
}

export default db
