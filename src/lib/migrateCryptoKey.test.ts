import { describe, it, expect, beforeEach } from 'vitest'
import { migrateFromSessionStorageKey } from './migrateCryptoKey'
import { encryptWithKey, resetEncryptionCache } from './crypto'
import { getSetting } from '@/services/storage/indexeddb'
import db from '@/services/storage/indexeddb'
import { ACTIVE_CONFIG_KEY, PRESETS_KEY } from '@/lib/storageKeys'

const LEGACY_KEY_NAME = 'pf-master-key'

async function seedLegacyEncryptedData() {
  const legacyKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // legacy keys were extractable
    ['encrypt', 'decrypt'],
  )
  const exported = await crypto.subtle.exportKey('jwk', legacyKey)
  sessionStorage.setItem(LEGACY_KEY_NAME, JSON.stringify(exported))

  const config = { provider: 'openai', apiKey: 'legacy-secret', model: 'gpt-4', endpoint: '' }
  const ciphertext = await encryptWithKey(legacyKey, JSON.stringify(config))
  await db.settings.put({ key: ACTIVE_CONFIG_KEY, value: ciphertext })
  await db.settings.put({ key: PRESETS_KEY, value: 'garbage-not-cipher-or-json' })
}

describe('migrateFromSessionStorageKey', () => {
  beforeEach(() => {
    resetEncryptionCache()
    sessionStorage.clear()
  })

  it('returns false when no legacy key exists', async () => {
    expect(await migrateFromSessionStorageKey()).toBe(false)
  })

  it('recovers legacy-encrypted records and removes the legacy key', async () => {
    await seedLegacyEncryptedData()

    const migrated = await migrateFromSessionStorageKey()
    expect(migrated).toBe(true)
    expect(sessionStorage.getItem(LEGACY_KEY_NAME)).toBeNull()

    const config = await getSetting(ACTIVE_CONFIG_KEY)
    expect(config).toEqual({ provider: 'openai', apiKey: 'legacy-secret', model: 'gpt-4', endpoint: '' })

    // A recovered record is now plaintext-free JSON under the new key
    const raw = await db.settings.get(ACTIVE_CONFIG_KEY)
    expect(typeof raw?.value).toBe('string')
    expect(raw?.value).not.toContain('legacy-secret')
  })

  it('leaves undecryptable records in place as orphans', async () => {
    await seedLegacyEncryptedData()
    await migrateFromSessionStorageKey()

    // The corrupt-only record stays untouched
    const record = await db.settings.get(PRESETS_KEY)
    expect(record).toBeDefined()
    expect(await getSetting(PRESETS_KEY)).toBeUndefined()
  })

  it('does not throw and returns false for a corrupt legacy key', async () => {
    sessionStorage.setItem(LEGACY_KEY_NAME, 'not-valid-jwk')
    expect(await migrateFromSessionStorageKey()).toBe(false)
    expect(sessionStorage.getItem(LEGACY_KEY_NAME)).toBeNull()
  })
})