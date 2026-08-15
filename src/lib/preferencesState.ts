import type { AppPreferences } from '@/types'

/**
 * Live, in-memory mirror of AppPreferences owned and written synchronously by
 * AppProvider (single writer). The AI config store reads from here instead of
 * re-reading IndexedDB, so a toggle in the UI takes effect immediately — no
 * race where a session-only choice is ignored because the async persist of
 * the preferences hasn't flushed yet.
 */
let cache: AppPreferences | null = null

export function setPreferencesCache(preferences: AppPreferences | null): void {
  cache = preferences
}

export function getPreferencesCache(): AppPreferences | null {
  return cache
}