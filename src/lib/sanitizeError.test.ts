import { describe, it, expect } from 'vitest'
import { getErrorMessage, sanitizeError, sanitizeMessage } from './sanitizeError'

describe('getErrorMessage', () => {
  it('returns the error message for Error instances', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom')
  })

  it('redacts sensitive values embedded in error messages', () => {
    const message = getErrorMessage(new Error('Request failed: api_key="sk-1234567890abcdef"'))
    expect(message).toContain('***REDACTED***')
    expect(message).not.toContain('sk-1234567890abcdef')
  })

  it('stringifies non-Error throwables', () => {
    expect(getErrorMessage('oops')).toBe('oops')
    expect(getErrorMessage(42)).toBe('42')
    expect(getErrorMessage(null)).toBe('null')
    expect(getErrorMessage(undefined)).toBe('undefined')
  })

  it('sanitizes non-Error throwables that carry secrets', () => {
    expect(getErrorMessage('api_key=sk-123456')).not.toContain('sk-123456')
    expect(getErrorMessage('Bearer abc-def')).not.toContain('abc-def')
  })

  it('deep-serializes plain objects instead of returning [object Object]', () => {
    const out = getErrorMessage({ message: 'api_key="sk-999"' })
    expect(out).not.toContain('sk-999')
    expect(out).not.toBe('[object Object]')
    expect(out).toContain('***REDACTED***')
  })
})

describe('sanitizeMessage', () => {
  it('redacts api keys, bearer tokens and authorization headers', () => {
    expect(sanitizeMessage('Bearer abc123')).not.toContain('abc123')
    expect(sanitizeMessage('Bearer "quoted-tok"')).not.toContain('quoted-tok')
    expect(sanitizeMessage('x-api-key: "secret123"')).not.toContain('secret123')
    expect(sanitizeMessage('Authorization: "tok456"')).not.toContain('tok456')
  })

  it('redacts unquoted x-goog-api-key values', () => {
    expect(sanitizeMessage('x-goog-api-key abcdefgh123456')).not.toContain('abcdefgh123456')
  })

  it('redacts unquoted api_key values including query strings', () => {
    expect(sanitizeMessage('api_key=sk-987654')).not.toContain('sk-987654')
    expect(sanitizeMessage('?api_key=sk-987654&page=2')).not.toContain('sk-987654')
    expect(sanitizeMessage('{"detail":"api_key = sk-555"')).not.toContain('sk-555')
  })

  it('leaves innocent messages untouched', () => {
    expect(sanitizeMessage('Network error')).toBe('Network error')
  })
})

describe('sanitizeError', () => {
  it('reads the error name and message', () => {
    expect(sanitizeError(new Error('failed'))).toBe('Error: failed')
  })

  it('recursively sanitizes structured throwables', () => {
    const out = sanitizeError({ detail: 'api_key="super-secret"' })
    expect(out).not.toContain('super-secret')
    expect(out).toContain('***REDACTED***')
  })

  it('handles null and undefined', () => {
    expect(sanitizeError(null)).toBe('')
    expect(sanitizeError(undefined)).toBe('')
  })

  it('does not hang on circular structures', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(sanitizeError(circular)).toContain('[circular]')
  })
})