import db from './db'
import type { Folder } from '@/features/history/types'

export async function getFolders(): Promise<Folder[]> {
  return db.folders.toArray()
}

export async function saveFolder(folder: Folder): Promise<string> {
  return db.folders.put(folder)
}

export async function updateFolder(id: string, updates: Partial<Pick<Folder, 'name' | 'parentId'>>): Promise<void> {
  await db.folders.update(id, updates)
}
