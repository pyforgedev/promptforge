import db from './db'

export interface IdeaCacheEntry {
  cacheKey: string; // Primary key: `${niche}|${stylePreset}`
  queue: string[];
  used: string[];
  lastUpdated: number; // Timestamp
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
