/**
 * One-time migration for users whose settings were encrypted with the old
 * sessionStorage-backed master key (`pf-master-key`, extractable JWK).
 *
 * Runs during startup. If the old session key is still present (same browser
 * session as the pre-upgrade data), every sensitive record is decrypted with
 * the legacy key and re-encrypted with the new persistent non-extractable
 * key. The legacy key is then removed from sessionStorage.
 *
 * Records that fail to decrypt are left untouched — loadConfigs() detects
 * them as orphans and the Settings page shows a recovery banner instead of
 * silently wiping or leaking them.
 */
import db from '@/services/storage/db'
import { decryptWithKey } from '@/lib/crypto'
import { saveSetting } from '@/services/storage/settings'
import { SENSITIVE_SETTING_KEYS } from '@/lib/storageKeys'

const LEGACY_SESSION_KEY_NAME = 'pf-master-key'

export async function migrateFromSessionStorageKey(): Promise<boolean> {
  const storedKey = sessionStorage.getItem(LEGACY_SESSION_KEY_NAME)
  if (!storedKey) return false

  try {
    let legacyJWK: JsonWebKey
    try {
      legacyJWK = JSON.parse(storedKey)
    } catch {
      // Corrupt legacy key — nothing we can recover; treat as no migration.
      sessionStorage.removeItem(LEGACY_SESSION_KEY_NAME)
      return false
    }

    // Med#5: import the legacy JWK as non-extractable — we only ever decrypt
    // with it, we never need to re-export its material.
    const legacyKey = await crypto.subtle.importKey(
      'jwk',
      legacyJWK,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    )

    let migratedAny = false
    for (const key of SENSITIVE_SETTING_KEYS) {
      const record = await db.settings.get(key)
      if (!record || typeof record.value !== 'string') continue
      try {
        const decrypted = await decryptWithKey(legacyKey, record.value)
        await saveSetting(key, JSON.parse(decrypted))
        migratedAny = true
      } catch {
        // Undecryptable record — leave it in place; orphan flow handles it.
        if (import.meta.env.DEV) {
          console.warn(`[Crypto] Legacy migration could not recover "${key}"`)
        }
      }
    }

    sessionStorage.removeItem(LEGACY_SESSION_KEY_NAME)
    return migratedAny
  } catch {
    // Never block startup on migration failures — proceed with orphan flow.
    return false
  }
}