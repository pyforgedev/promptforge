import db, { ensureDbReady } from './db'
import { encrypt, decrypt } from '@/lib/crypto'
import { isSensitiveSettingKey } from '@/lib/storageKeys'

export async function getSetting(key: string): Promise<unknown> {
  await ensureDbReady()
  const record = await db.settings.get(key)
  if (!record) return undefined

  if (isSensitiveSettingKey(key)) {
    if (typeof record.value === 'string') {
      try {
        const decrypted = await decrypt(record.value)
        return JSON.parse(decrypted)
      } catch {
        try {
          return JSON.parse(record.value)
        } catch {
          // Ciphertext that cannot be decrypted (orphan): return undefined
          // instead of leaking the raw base64 blob to callers. The record is
          // left in place so the store can flag recoveryNeeded.
          if (import.meta.env.DEV) {
            console.warn(`[Storage] Setting "${key}" cannot be decrypted (orphan data)`)
          }
          return undefined
        }
      }
    }
    return record.value
  }

  return record.value
}

/**
 * Read the raw stored value without decryption/parsing. Used to detect
 * orphan records (record exists but getSetting returned undefined).
 */
export async function peekRawSetting(key: string): Promise<unknown> {
  await ensureDbReady()
  const record = await db.settings.get(key)
  return record?.value
}

export async function saveSetting(key: string, value: unknown): Promise<void> {
  await ensureDbReady()
  let valToSave = value
  if (isSensitiveSettingKey(key)) {
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

export async function deleteSetting(key: string): Promise<void> {
  await ensureDbReady()
  await db.settings.delete(key)
}
