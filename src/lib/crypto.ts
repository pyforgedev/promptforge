/**
 * SECURITY NOTE: The master encryption key is stored in sessionStorage
 * to survive page reloads within a single browser session. This is NOT
 * secure against XSS attacks — an attacker with script execution can
 * read both the key and encrypted data.
 *
 * Use for non-sensitive user preferences only, NOT for credential storage.
 * API keys should be handled server-side or via secure OAuth flows.
 * The key is automatically cleared when the tab/browser is closed.
 */
const ENCRYPTION_KEY_NAME = 'pf-master-key'

async function getOrCreateKey(): Promise<CryptoKey> {
  const storedKey = sessionStorage.getItem(ENCRYPTION_KEY_NAME)
  if (storedKey) {
    const keyData = JSON.parse(storedKey)
    return await crypto.subtle.importKey(
      'jwk',
      keyData,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
  }

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  const exported = await crypto.subtle.exportKey('jwk', key)
  sessionStorage.setItem(ENCRYPTION_KEY_NAME, JSON.stringify(exported))
  return key
}

export function clearEncryptionKey(): void {
  sessionStorage.removeItem(ENCRYPTION_KEY_NAME)
}

export async function encrypt(text: string): Promise<string> {
  const key = await getOrCreateKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(text)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )
  
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)

  return uint8ArrayToBase64(combined)
}

export async function decrypt(encryptedBase64: string): Promise<string> {
  const key = await getOrCreateKey()
  const combined = base64ToUint8Array(encryptedBase64)

  const iv = combined.slice(0, 12)
  const data = combined.slice(12)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )

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
