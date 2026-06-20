import { describe, it, expect, beforeEach } from 'vitest'
import { encrypt, decrypt } from './crypto'

describe('crypto utilities', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('encrypts and decrypts text successfully', async () => {
    const originalText = 'secret-api-key-123'
    const encrypted = await encrypt(originalText)
    expect(encrypted).not.toBe(originalText)
    expect(typeof encrypted).toBe('string')

    const decrypted = await decrypt(encrypted)
    expect(decrypted).toBe(originalText)
  })

  it('generates master key in localStorage and reuses it', async () => {
    const text = 'hello'
    const encrypted1 = await encrypt(text)
    
    const keyInStorage = localStorage.getItem('pf-master-key')
    expect(keyInStorage).toBeDefined()
    expect(JSON.parse(keyInStorage!)).toHaveProperty('kty', 'oct')

    const decrypted1 = await decrypt(encrypted1)
    expect(decrypted1).toBe(text)
  })
})
