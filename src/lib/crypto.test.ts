import { describe, it, expect, beforeEach } from 'vitest'
import {
  encrypt,
  decrypt,
  ensureMasterKey,
  hasMasterKey,
  clearEncryptionKey,
  resetEncryptionCache,
  setCryptoKeyStore,
  type CryptoKeyStore,
} from './crypto'

describe('crypto utilities', () => {
  beforeEach(() => {
    sessionStorage.clear()
    resetEncryptionCache()
  })

  it('encrypts and decrypts text successfully', async () => {
    const originalText = 'secret-api-key-123'
    const encrypted = await encrypt(originalText)
    expect(encrypted).not.toBe(originalText)
    expect(typeof encrypted).toBe('string')

    const decrypted = await decrypt(encrypted)
    expect(decrypted).toBe(originalText)
  })

  it('generates a non-extractable master key and persists it in the store', async () => {
    const key = await ensureMasterKey()
    expect(key.extractable).toBe(false)
    expect(await hasMasterKey()).toBe(true)
  })

  it('reuses the persisted key across simulated page reloads', async () => {
    const text = 'hello'
    const encrypted1 = await encrypt(text)

    // Simulate a fresh page session: drop the in-memory cache, keep the store.
    resetEncryptionCache()

    const decrypted1 = await decrypt(encrypted1)
    expect(decrypted1).toBe(text)
    expect(await hasMasterKey()).toBe(true)
  })

  it('does not write the key material to sessionStorage anymore', async () => {
    await encrypt('x')
    expect(sessionStorage.getItem('pf-master-key')).toBeNull()
  })

  it('adopts a key persisted by a competing tab instead of encrypting with an unpinned key', async () => {
    // Simulates a cross-tab first-run race: while this tab is generating its
    // key, the competing tab persists the winning key first. Our save is thus
    // a no-op and we must adopt the stored (foreign) key — otherwise the
    // ciphertext is encrypted with a key that was never persisted and the
    // data becomes an orphan after reload.
    let store: CryptoKey[] = []
    let releaseSave!: () => void
    const saveBlocker = new Promise<void>((resolve) => { releaseSave = resolve })
    let ourSaveArrived = false

    const raceStore: CryptoKeyStore = {
      load: async () => store[0],
      save: async () => {
        ourSaveArrived = true
        await saveBlocker
        // The competing tab wins: persist its key, ignore ours
        if (store.length === 0) {
          store = [await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])]
        }
      },
      clear: async () => { store = [] },
    }
    setCryptoKeyStore(raceStore)
    resetEncryptionCache()

    const ensurePromise = ensureMasterKey()
    // Let the save attempt arrive, then resolve the race once.
    await new Promise<void>((resolve) => {
      const check = () => {
        if (ourSaveArrived) { releaseSave(); resolve() } else setTimeout(check, 5)
      }
      check()
    })
    await ensurePromise

    // Everything from here on must use the ADOPTED (persisted) key
    const cipher = await encrypt('cross-tab secret')
    resetEncryptionCache() // simulate reload
    expect(await decrypt(cipher)).toBe('cross-tab secret')
    expect(await hasMasterKey()).toBe(true)
  })

  it('clears the master key from cache and store', async () => {
    await ensureMasterKey()
    await clearEncryptionKey()
    expect(await hasMasterKey()).toBe(false)
  })

  it('round-trips a large payload without stack overflow', async () => {
    const largeText = 'x'.repeat(256 * 1024)
    const encrypted = await encrypt(largeText)
    const decrypted = await decrypt(encrypted)
    expect(decrypted).toBe(largeText)
  })
})