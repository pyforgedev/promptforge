import Dexie, { type EntityTable } from 'dexie'
import type { Prompt } from '@/types'
import type { HistoryItem } from '@/features/history/types'

import { encrypt, decrypt } from '@/lib/crypto'

const DB_NAME = 'promptforge'
const DB_VERSION = 4

class PromptForgeDB extends Dexie {
  prompts!: EntityTable<Prompt, 'id'>
  history!: EntityTable<HistoryItem, 'id'>
  settings!: EntityTable<{ key: string; value: unknown }, 'key'>
  generatorState!: EntityTable<{ key: string; value: unknown }, 'key'>

  constructor() {
    super(DB_NAME)
    this.version(DB_VERSION).stores({
      prompts: 'id, name, category, createdAt',
      history: 'id, aspectRatio, stylePreset, niche, createdAt, savedAt, content, qualityScore',
      settings: 'key',
      generatorState: 'key',
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

export async function saveHistoryItem(item: Omit<HistoryItem, 'savedAt'> & Partial<Pick<HistoryItem, 'savedAt'>>): Promise<string> {
  const historyItem: HistoryItem = {
    ...item,
    savedAt: item.savedAt || Date.now(),
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

export async function getGeneratorState(key: string): Promise<unknown> {
  const record = await db.generatorState.get(key)
  return record?.value
}

export async function saveGeneratorState(key: string, value: unknown): Promise<void> {
  await db.generatorState.put({ key, value })
}

export default db
