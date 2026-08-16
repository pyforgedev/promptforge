import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_DEFAULT_WIDTH,
  sanitizeStoredWidth,
  clampWidth,
  resolveResize,
  useSidebarState,
} from './useSidebarState'

describe('sanitizeStoredWidth', () => {
  it('returns default width for null and empty string', () => {
    expect(sanitizeStoredWidth(null)).toBe(SIDEBAR_DEFAULT_WIDTH)
    expect(sanitizeStoredWidth('')).toBe(SIDEBAR_DEFAULT_WIDTH)
  })

  it('parses valid string width within range', () => {
    expect(sanitizeStoredWidth('260')).toBe(260)
    expect(sanitizeStoredWidth('220')).toBe(220)
    expect(sanitizeStoredWidth('400')).toBe(400)
    expect(sanitizeStoredWidth('300')).toBe(300)
  })

  it('rounds fractional strings', () => {
    expect(sanitizeStoredWidth('260.5')).toBe(261)
    expect(sanitizeStoredWidth('260.4')).toBe(260)
  })

  it('returns default width for out-of-range values', () => {
    expect(sanitizeStoredWidth('219')).toBe(SIDEBAR_DEFAULT_WIDTH)
    expect(sanitizeStoredWidth('401')).toBe(SIDEBAR_DEFAULT_WIDTH)
    expect(sanitizeStoredWidth('-5')).toBe(SIDEBAR_DEFAULT_WIDTH)
    expect(sanitizeStoredWidth('0')).toBe(SIDEBAR_DEFAULT_WIDTH)
  })

  it('returns default width for non-finite and non-numeric strings', () => {
    expect(sanitizeStoredWidth('abc')).toBe(SIDEBAR_DEFAULT_WIDTH)
    expect(sanitizeStoredWidth('NaN')).toBe(SIDEBAR_DEFAULT_WIDTH)
    expect(sanitizeStoredWidth('Infinity')).toBe(SIDEBAR_DEFAULT_WIDTH)
    expect(sanitizeStoredWidth('-Infinity')).toBe(SIDEBAR_DEFAULT_WIDTH)
    expect(sanitizeStoredWidth('1e308')).toBe(SIDEBAR_DEFAULT_WIDTH)
  })
})

describe('clampWidth', () => {
  it('preserves values within range', () => {
    expect(clampWidth(300)).toBe(300)
    expect(clampWidth(220)).toBe(220)
    expect(clampWidth(400)).toBe(400)
  })

  it('clamps values below minimum to SIDEBAR_MIN_WIDTH', () => {
    expect(clampWidth(219)).toBe(SIDEBAR_MIN_WIDTH)
    expect(clampWidth(100)).toBe(SIDEBAR_MIN_WIDTH)
    expect(clampWidth(-10)).toBe(SIDEBAR_MIN_WIDTH)
  })

  it('clamps values above maximum to SIDEBAR_MAX_WIDTH', () => {
    expect(clampWidth(500)).toBe(SIDEBAR_MAX_WIDTH)
    expect(clampWidth(401)).toBe(SIDEBAR_MAX_WIDTH)
  })

  it('handles non-finite values by falling back to default', () => {
    expect(clampWidth(Number.NaN)).toBe(SIDEBAR_DEFAULT_WIDTH)
    expect(clampWidth(Number.POSITIVE_INFINITY)).toBe(SIDEBAR_DEFAULT_WIDTH)
    expect(clampWidth(Number.NEGATIVE_INFINITY)).toBe(SIDEBAR_DEFAULT_WIDTH)
  })

  it('rounds fractional inputs', () => {
    expect(clampWidth(250.6)).toBe(251)
    expect(clampWidth(250.2)).toBe(250)
  })
})

describe('resolveResize', () => {
  it('returns resize resolution for candidate strictly above minimum', () => {
    expect(resolveResize(221)).toEqual({ type: 'resize', width: 221 })
    expect(resolveResize(300)).toEqual({ type: 'resize', width: 300 })
    expect(resolveResize(450)).toEqual({ type: 'resize', width: SIDEBAR_MAX_WIDTH })
  })

  it('returns collapse resolution when candidate is exactly minimum or below', () => {
    expect(resolveResize(SIDEBAR_MIN_WIDTH)).toEqual({ type: 'collapse' })
    expect(resolveResize(219)).toEqual({ type: 'collapse' })
    expect(resolveResize(0)).toEqual({ type: 'collapse' })
    expect(resolveResize(-50)).toEqual({ type: 'collapse' })
  })

  it('returns collapse resolution for non-finite candidate', () => {
    expect(resolveResize(Number.NaN)).toEqual({ type: 'collapse' })
    expect(resolveResize(Number.POSITIVE_INFINITY)).toEqual({ type: 'collapse' })
    expect(resolveResize(Number.NEGATIVE_INFINITY)).toEqual({ type: 'collapse' })
  })
})

describe('useSidebarState hook', () => {
  const STORAGE_KEY = 'promptforge:sidebar-width'

  beforeEach(() => {
    window.localStorage.clear()
  })

  it('initializes with default width when localStorage is empty', () => {
    const { result } = renderHook(() => useSidebarState())
    expect(result.current.width).toBe(SIDEBAR_DEFAULT_WIDTH)
    expect(result.current.desktopVisible).toBe(true)
    expect(result.current.mobileDrawerOpen).toBe(false)
  })

  it('initializes width from valid value in localStorage', () => {
    window.localStorage.setItem(STORAGE_KEY, '320')
    const { result } = renderHook(() => useSidebarState())
    expect(result.current.width).toBe(320)
  })

  it('persists valid width updates to localStorage', () => {
    const { result } = renderHook(() => useSidebarState())

    act(() => {
      result.current.setWidthValid(350)
    })

    expect(result.current.width).toBe(350)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('350')
  })

  it('clamps invalid width candidates and persists clamped value', () => {
    const { result } = renderHook(() => useSidebarState())

    act(() => {
      result.current.setWidthValid(500)
    })

    expect(result.current.width).toBe(SIDEBAR_MAX_WIDTH)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(String(SIDEBAR_MAX_WIDTH))

    act(() => {
      result.current.setWidthValid(100)
    })

    expect(result.current.width).toBe(SIDEBAR_MIN_WIDTH)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(String(SIDEBAR_MIN_WIDTH))
  })

  it('controls desktop visibility without modifying persisted width', () => {
    const { result } = renderHook(() => useSidebarState())

    act(() => {
      result.current.setWidthValid(310)
    })
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('310')

    act(() => {
      result.current.collapseDesktop()
    })
    expect(result.current.desktopVisible).toBe(false)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('310')

    act(() => {
      result.current.openDesktop()
    })
    expect(result.current.desktopVisible).toBe(true)
    expect(result.current.width).toBe(310)
  })

  it('controls mobile drawer state independently', () => {
    const { result } = renderHook(() => useSidebarState())

    expect(result.current.mobileDrawerOpen).toBe(false)

    act(() => {
      result.current.openDrawer()
    })
    expect(result.current.mobileDrawerOpen).toBe(true)

    act(() => {
      result.current.closeDrawer()
    })
    expect(result.current.mobileDrawerOpen).toBe(false)

    act(() => {
      result.current.toggleDrawer()
    })
    expect(result.current.mobileDrawerOpen).toBe(true)

    act(() => {
      result.current.toggleDrawer()
    })
    expect(result.current.mobileDrawerOpen).toBe(false)
  })

  it('resets width to default and persists it', () => {
    const { result } = renderHook(() => useSidebarState())

    act(() => {
      result.current.setWidthValid(380)
    })
    expect(result.current.width).toBe(380)

    act(() => {
      result.current.resetWidth()
    })
    expect(result.current.width).toBe(SIDEBAR_DEFAULT_WIDTH)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(String(SIDEBAR_DEFAULT_WIDTH))
  })

  it('falls back to default width when localStorage.getItem throws', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Access denied')
    })

    const { result } = renderHook(() => useSidebarState())
    expect(result.current.width).toBe(SIDEBAR_DEFAULT_WIDTH)

    getItemSpy.mockRestore()
  })

  it('does not crash when localStorage.setItem throws', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded')
    })

    const { result } = renderHook(() => useSidebarState())

    expect(() => {
      act(() => {
        result.current.setWidthValid(330)
      })
    }).not.toThrow()

    expect(result.current.width).toBe(330)
    setItemSpy.mockRestore()
  })
})
