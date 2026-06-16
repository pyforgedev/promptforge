
import Dexie, { type EntityTable } from 'dexie'
import type { Prompt } from '@/types'
import type { HistoryItem, Folder } from '@/features/history/types'

import { encrypt, decrypt } from '@/lib/crypto'

const DB_NAME = 'promptforge'
const DB_VERSION = 5

export interface IdeaCacheEntry {
  cacheKey: string; // Primary key: `${niche}|${stylePreset}`
  queue: string[];
  used: string[];
  lastUpdated: number; // Timestamp
}

class PromptForgeDB extends Dexie {
  prompts!: EntityTable<Prompt, 'id'>
  history!: EntityTable<HistoryItem, 'id'>
  folders!: EntityTable<Folder, 'id'>
  settings!: EntityTable<{ key: string; value: unknown }, 'key'>
  generatorState!: EntityTable<{ key: string; value: unknown }, 'key'>
  idea_cache!: EntityTable<IdeaCacheEntry, 'cacheKey'> // New store for idea cache

  constructor() {
    super(DB_NAME)
    this.version(DB_VERSION).stores({
      prompts: 'id, name, category, createdAt',
      history: 'id, aspectRatio, stylePreset, niche, createdAt, savedAt, content, qualityScore, folderId, *tags',
      folders: 'id, name, parentId, createdAt',
      settings: 'key',
      generatorState: 'key',
      idea_cache: 'cacheKey, lastUpdated', // Define schema for idea_cache
    }).upgrade(trans => {
      trans.table('history').toCollection().modify(item => {
        item.folderId = item.folderId || null
        item.tags = item.tags || []
      })
      // Add new stores to existing database versions
      // For version 5, if upgrading from <5, it will add idea_cache.
      // Dexie handles this by creating the new table if it doesn't exist.
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

export async function getHistoryItems(): Promise<HistoryItem[]> {
  return db.history.orderBy('savedAt').reverse().toArray()
}

export async function saveHistoryItem(item: Omit<HistoryItem, 'savedAt' | 'folderId' | 'tags'> & Partial<Pick<HistoryItem, 'savedAt' | 'folderId' | 'tags'>>): Promise<string> {
  const historyItem: HistoryItem = {
    ...item,
    savedAt: item.savedAt || Date.now(),
    folderId: item.folderId || null,
    tags: item.tags || [],
  } as HistoryItem
  
  console.log('Dexie: Saving history item', historyItem)
  try {
    const id = await db.history.put(historyItem)
    console.log('Dexie: Saved history item', id)
    return id
  } catch (error) {
    console.error('Dexie: Failed to save history item', error)
    throw error
  }
}

export async function deleteHistoryItem(id: string): Promise<void> {
  await db.history.delete(id)
}

export async function deleteAllHistory(): Promise<void> {
  await db.history.clear()
}

// Folder helpers
export async function getFolders(): Promise<Folder[]> {
  return db.folders.toArray()
}

export async function saveFolder(folder: Folder): Promise<string> {
  return db.folders.put(folder)
}

export async function deleteFolder(id: string): Promise<void> {
  // Move prompts to root when folder is deleted
  await db.history.where('folderId').equals(id).modify({ folderId: null })
  await db.folders.delete(id)
}

export async function updateFolder(id: string, updates: Partial<Pick<Folder, 'name' | 'parentId'>>): Promise<void> {
  await db.folders.update(id, updates)
}

export async function bulkUpdateHistoryFolder(ids: string[], folderId: string | null): Promise<void> {
  if (!ids || ids.length === 0) return
  await db.history.where('id').anyOf(ids).modify({ folderId })
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
