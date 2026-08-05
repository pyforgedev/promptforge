import db, { ensureDbReady } from './db'

export async function getGeneratorState(key: string): Promise<unknown> {
  await ensureDbReady()
  const record = await db.generatorState.get(key)
  return record?.value
}

export async function saveGeneratorState(key: string, value: unknown): Promise<void> {
  await ensureDbReady()
  await db.generatorState.put({ key, value })
}
