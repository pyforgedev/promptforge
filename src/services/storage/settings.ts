import db, { ensureDbReady } from './db'
import { encrypt, decrypt } from '@/lib/crypto'

export async function getSetting(key: string): Promise<unknown> {
  await ensureDbReady()
  const record = await db.settings.get(key)
  if (!record) return undefined

  if (key.includes('config') || key.includes('preset') || key.includes('api_key')) {
    if (typeof record.value === 'string') {
      try {
        const decrypted = await decrypt(record.value)
        return JSON.parse(decrypted)
      } catch {
        if (import.meta.env.DEV) {
          console.warn(`[Storage] Failed to decrypt setting "${key}", falling back to raw value`)
        }
        try {
          return JSON.parse(record.value)
        } catch {
          return record.value
        }
      }
    }
    return record.value
  }

  return record.value
}

export async function saveSetting(key: string, value: unknown): Promise<void> {
  await ensureDbReady()
  let valToSave = value
  if (key.includes('config') || key.includes('preset') || key.includes('api_key')) {
    let json: string
    try {
      const serialized = JSON.stringify(value)
      if (serialized === undefined) {
        throw new TypeError('value is not serializable')
      }
      json = serialized
    } catch (error) {
      throw new TypeError(
        `[Storage] Cannot encrypt setting "${key}": ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      )
    }
    valToSave = await encrypt(json)
  }
  await db.settings.put({ key, value: valToSave })
}
