import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility', () => {
  it('merges class names correctly', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('handles conditional classes', () => {
    const isFalse = false
    const isTrue = true
    expect(cn('a', isFalse && 'b', 'c')).toBe('a c')
    expect(cn('a', isTrue && 'b', 'c')).toBe('a b c')
  })

  it('merges Tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'p-4')).toBe('p-4')
  })
})
