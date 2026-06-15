import Dexie, { type EntityTable } from 'dexie'
import type { Prompt } from '@/types'
import type { HistoryItem } from '@/features/history/types'

const DB_NAME = 'promptforge'
const DB_VERSION = 2

class PromptForgeDB extends Dexie {
  prompts!: EntityTable<Prompt, 'id'>
  history!: EntityTable<HistoryItem, 'id'>
  settings!: EntityTable<{ key: string; value: unknown }, 'key'>

  constructor() {
    super(DB_NAME)
    this.version(DB_VERSION).stores({
      prompts: 'id, name, category, createdAt',
      history: 'id, aspectRatio, stylePreset, niche, createdAt, savedAt',
      settings: 'key',
    })
  }
}

const db = new PromptForgeDB()

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
  return record?.value
}

export async function saveSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value })
}

export async function getHistoryItems(): Promise<HistoryItem[]> {
  return db.history.orderBy('savedAt').reverse().toArray()
}

export async function saveHistoryItem(item: HistoryItem): Promise<string> {
  return db.history.put(item)
}

export async function deleteHistoryItem(id: string): Promise<void> {
  await db.history.delete(id)
}

export async function deleteAllHistory(): Promise<void> {
  await db.history.clear()
}

export default db
