import { describe, it, expect } from 'vitest'
import { toCsvRow } from './csv'

describe('toCsvRow', () => {
  it('wraps every cell in quotes and joins with commas', () => {
    expect(toCsvRow(['a', 'b', 'c'])).toBe('"a","b","c"')
  })

  it('escapes embedded double quotes per RFC 4180', () => {
    expect(toCsvRow(['say "hi"'])).toBe('"say ""hi"""')
  })

  it('stringifies non-string values', () => {
    expect(toCsvRow([1, true, null, undefined])).toBe('"1","true","null","undefined"')
  })

  it('handles empty rows', () => {
    expect(toCsvRow([])).toBe('')
  })
})