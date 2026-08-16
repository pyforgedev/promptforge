import { useCallback, useEffect, useState } from 'react'

export const SIDEBAR_MIN_WIDTH = 220
export const SIDEBAR_MAX_WIDTH = 400
export const SIDEBAR_DEFAULT_WIDTH = 260
export const SIDEBAR_KEYBOARD_STEP = 8
/** Open/close slide duration — must match the `duration-200` class in Sidebar.tsx. */
export const SIDEBAR_TRANSITION_MS = 200

const STORAGE_KEY = 'promptforge:sidebar-width'

/**
 * Parse a value read from localStorage into a valid sidebar width.
 *
 * Storage is treated as untrusted input: non-finite, fractional, empty or
 * out-of-range values fall back to the default. `Number(null)` and
 * `Number('')` both coerce to 0, so falsy inputs are rejected explicitly
 * instead of being clamped into the range.
 */
export function sanitizeStoredWidth(raw: string | null): number {
  if (raw === null || raw === '' || !Number.isFinite(Number(raw))) {
    return SIDEBAR_DEFAULT_WIDTH
  }
  const value = Math.round(Number(raw))
  if (value < SIDEBAR_MIN_WIDTH || value > SIDEBAR_MAX_WIDTH) {
    return SIDEBAR_DEFAULT_WIDTH
  }
  return value
}

/** Clamp a candidate resize width into the valid range. */
export function clampWidth(candidate: number): number {
  if (!Number.isFinite(candidate)) return SIDEBAR_DEFAULT_WIDTH
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(candidate)))
}

export type ResizeResolution =
  | { type: 'resize'; width: number }
  | { type: 'collapse' }

/**
 * Resolve a raw pointer-delta candidate. Values at or below the minimum
 * width collapse the desktop sidebar; anything above is clamped into range.
 */
export function resolveResize(candidate: number): ResizeResolution {
  if (!Number.isFinite(candidate) || candidate <= SIDEBAR_MIN_WIDTH) {
    return { type: 'collapse' }
  }
  return { type: 'resize', width: clampWidth(candidate) }
}

function readStoredWidth(): number {
  try {
    return sanitizeStoredWidth(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    // Storage blocked (private mode, sandboxed iframe) — fall back to default.
    return SIDEBAR_DEFAULT_WIDTH
  }
}

function writeStoredWidth(width: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(width))
  } catch {
    // Quota exceeded or storage blocked — the UI still works for this session.
  }
}

/**
 * Shell layout state for the app: desktop sidebar visibility + width and the
 * mobile off-canvas drawer are kept fully independent so interactions on one
 * breakpoint never leak into the other. Only the last *valid* desktop width
 * is persisted — hidden/collapsed state intentionally is not.
 */
export function useSidebarState() {
  const [desktopVisible, setDesktopVisible] = useState(true)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [width, setWidth] = useState(readStoredWidth)

  useEffect(() => {
    writeStoredWidth(width)
  }, [width])

  const openDesktop = useCallback(() => setDesktopVisible(true), [])
  const collapseDesktop = useCallback(() => setDesktopVisible(false), [])

  const openDrawer = useCallback(() => setMobileDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setMobileDrawerOpen(false), [])
  const toggleDrawer = useCallback(
    () => setMobileDrawerOpen((open) => !open),
    [],
  )

  /** Apply a user-initiated width change; invalid candidates are clamped. */
  const setWidthValid = useCallback(
    (candidate: number) => setWidth((current) => {
      const resolved = clampWidth(candidate)
      return resolved === current ? current : resolved
    }),
    [],
  )

  const resetWidth = useCallback(() => setWidth(SIDEBAR_DEFAULT_WIDTH), [])

  return {
    desktopVisible,
    openDesktop,
    collapseDesktop,
    mobileDrawerOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    width,
    setWidthValid,
    resetWidth,
  }
}