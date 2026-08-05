import Dexie, { type EntityTable } from 'dexie'
import { v4 as uuidv4 } from 'uuid'
import type { Prompt } from '@/types'
import type { Folder } from '@/features/history/types'
import type { GeneratorInput } from '@/features/prompt-generator/types'
import type { IdeaCacheEntry } from './ideaCache'
import type { PromptHistoryRecord, PromptBatchRecord } from './history'
import type { FormatterBatch, FormatterItem } from './formatter'

const DB_NAME = 'promptforge'

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
      if (import.meta.env.DEV) console.log('Upgrading Dexie schema to version 6...')
      const oldHistoryTable = trans.table('history')
      const newHistoryTable = trans.table('prompt_history')
      const newBatchesTable = trans.table('prompt_batches')

      const legacyItems = await oldHistoryTable.toArray()
      if (legacyItems.length === 0) {
        if (import.meta.env.DEV) console.log('No legacy history items to migrate.')
        return
      }

      if (import.meta.env.DEV) console.log(`Found ${legacyItems.length} legacy items to migrate.`)

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

      if (import.meta.env.DEV) console.log(`Migrating ${newBatchRecords.length} new batch records...`)
      await newBatchesTable.bulkAdd(newBatchRecords)

      if (import.meta.env.DEV) console.log(`Migrating ${newHistoryRecords.length} new history records...`)
      await newHistoryTable.bulkAdd(newHistoryRecords)

      if (import.meta.env.DEV) console.log('Migration to version 6 complete.')
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

export default db

// Initialization promise to ensure database is open before any access
let dbInitPromise: Promise<void> | null = null

export async function ensureDbReady(): Promise<void> {
  if (!dbInitPromise) {
    dbInitPromise = db.open()
      .then(() => undefined)
      .catch((err) => {
        if (import.meta.env.DEV) {
          console.error('[Dexie] Failed to open database:', err)
        }
        // Continue despite error to allow graceful degradation
      })
  }
  return dbInitPromise
}

// Helper for retries with exponential backoff
export async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 500): Promise<T> {
  // Ensure database is initialized before attempting operation
  await ensureDbReady()

  try {
    return await fn()
  } catch (error) {
    if (retries <= 0) throw error
    await new Promise((res) => setTimeout(res, delay))
    return withRetry(fn, retries - 1, delay * 2)
  }
}

/**
 * Delete and recreate the entire IndexedDB database.
 * Use this as a last resort when schema migration fails for users
 * with stale/corrupted data from previous versions.
 *
 * After calling this, the `db` instance will auto-recreate on next access.
 */
export async function resetDatabase(): Promise<void> {
  await db.delete()
}
