/**
 * SECURITY NOTE (honest threat model — read carefully)
 *
 * PromptForge is a client-side-only app. The API key you configure in
 * Settings is encrypted at rest with AES-GCM 256 and stored in IndexedDB.
 * The AES master key is itself a WebCrypto `CryptoKey` with
 * extractable:false, persisted in IndexedDB (table `cryptoKeys`) via
 * structured clone. Because the key material cannot be exported
 * (crypto.subtle.exportKey throws), dumping the browser profile / storage
 * files yields ciphertext without a usable key.
 *
 * This is NOT a secure vault and NOT zero-leak:
 * - Any script running in the same origin (e.g. an XSS vulnerability, a
 *   compromised extension) can read the CryptoKey from IndexedDB and call
 *   crypto.subtle.decrypt directly. `extractable:false` only blocks offline
 *   key extraction — it does not block in-page decryption. A strict Content
 *   Security Policy is the remaining first line of defense against XSS.
 * - The key and the ciphertext live in the same IndexedDB database, so a
 *   device thief with the ability to run JS in your profile can decrypt.
 * - IndexedDB is NOT synced to the cloud by Chrome/Firefox (unlike
 *   localStorage), so cloud-sync leakage does not apply.
 *
 * The only true zero-leak option is the "Don't remember API key between
 * sessions" setting (Settings page): with it enabled, the API key is never
 * persisted — it exists only in memory for the current session.
 *
 * Use this layer for non-sensitive user preferences and for API keys with
 * the caveats above. Prefer short-lived keys and treat configured providers
 * as trusted endpoints.
 */
import db from '@/services/storage/db'

export interface CryptoKeyStore {
  load(): Promise<CryptoKey | undefined>
  save(key: CryptoKey): Promise<void>
  clear(): Promise<void>
}

const KEY_STORE_TABLE_KEY = 'master'
const KEY_STORE_ALGORITHM: AesKeyGenParams = { name: 'AES-GCM', length: 256 }

class IndexedDBCryptoKeyStore implements CryptoKeyStore {
  async load(): Promise<CryptoKey | undefined> {
    const record = await db.cryptoKeys.get(KEY_STORE_TABLE_KEY)
    return record?.value
  }

  async save(key: CryptoKey): Promise<void> {
    await db.cryptoKeys.put({ key: KEY_STORE_TABLE_KEY, value: key })
  }

  async clear(): Promise<void> {
    await db.cryptoKeys.delete(KEY_STORE_TABLE_KEY)
  }
}

const defaultStore = new IndexedDBCryptoKeyStore()

let injectedStore: CryptoKeyStore | null = null
let cachedKey: CryptoKey | null = null
let keyPromise: Promise<CryptoKey> | null = null

function resolveStore(): CryptoKeyStore {
  return injectedStore ?? defaultStore
}

/**
 * Test-only injection point. Production code can never redirect the store
 * (the guard below ensures the app bundles cannot reach alternate stores).
 */
export function setCryptoKeyStore(store: CryptoKeyStore): void {
  if (import.meta.env.MODE !== 'test') return
  injectedStore = store
  resetEncryptionCache()
}

/** Clear the in-memory key cache (does NOT touch the persistent store). */
export function resetEncryptionCache(): void {
  cachedKey = null
  keyPromise = null
}

/**
 * Returns the persistent master key, generating and persisting it on first
 * use. The in-flight promise is memoized (HIGH-1: single key creation per
 * store-empty cycle — concurrent callers share one promise, so a race can
 * never generate two keys and silently orphan ciphertext).
 */
export async function ensureMasterKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    keyPromise = doEnsureMasterKey()
    keyPromise.catch(() => {
      keyPromise = null
    })
  }
  return keyPromise
}

async function doEnsureMasterKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey

  const existing = await resolveStore().load()
  if (existing) {
    cachedKey = existing
    return existing
  }

  const key = await crypto.subtle.generateKey(
    KEY_STORE_ALGORITHM,
    false, // extractable:false — key material can never be exported
    ['encrypt', 'decrypt'],
  )
  await persistNewMasterKey(key)
  // Read back the winner from the store: in a cross-tab first-run race the
  // other tab may have persisted its key while we were generating. We must
  // adopt whatever is actually stored — never encrypt with a key that was
  // generated but never persisted (it would orphan the ciphertext).
  cachedKey = (await resolveStore().load()) ?? key
  return cachedKey
}

/**
 * Save the freshly generated key under navigator.locks so two tabs opening on
 * a brand-new profile cannot both generate + overwrite each other's key
 * (which would silently orphan the first tab's ciphertext). The winner's key
 * wins; a losing tab inside the lock adopts it instead of saving its own.
 */
async function persistNewMasterKey(key: CryptoKey): Promise<void> {
  const store = resolveStore()

  if (typeof navigator !== 'undefined' && navigator.locks) {
    await navigator.locks.request('promptforge:master-key', async () => {
      const existing = await store.load()
      if (existing) {
        cachedKey = existing
        return
      }
      await store.save(key)
    })
  } else {
    await store.save(key)
  }
}

export async function hasMasterKey(): Promise<boolean> {
  if (cachedKey) return true
  return (await resolveStore().load()) !== undefined
}

/** Wipe the persistent master key and the in-memory cache. */
export async function clearEncryptionKey(): Promise<void> {
  cachedKey = null
  keyPromise = null
  await resolveStore().clear()
}

export async function encrypt(text: string): Promise<string> {
  const key = await ensureMasterKey()
  return encryptWithKey(key, text)
}

export async function decrypt(encryptedBase64: string): Promise<string> {
  const key = await ensureMasterKey()
  return decryptWithKey(key, encryptedBase64)
}

/** Lower-level helpers (used by legacy key migration). */
export async function encryptWithKey(key: CryptoKey, text: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(text)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)

  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)

  return uint8ArrayToBase64(combined)
}

export async function decryptWithKey(key: CryptoKey, encryptedBase64: string): Promise<string> {
  const combined = base64ToUint8Array(encryptedBase64)

  const iv = combined.slice(0, 12)
  const data = combined.slice(12)

  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)

  return new TextDecoder().decode(decrypted)
}

// Must be <= 0xFFFF to stay within String.fromCharCode's safe argument count.
const BASE64_CHUNK_SIZE = 0x8000

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + BASE64_CHUNK_SIZE))
  }
  return btoa(binary)
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
