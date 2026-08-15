import { useState, useEffect, useCallback, type ReactNode } from 'react'
import type { AppPreferences, Theme } from '@/types'
import { getSetting, saveSetting } from '@/services/storage/indexeddb'
import { APP_PREFERENCES_KEY } from '@/lib/storageKeys'
import { setPreferencesCache } from '@/lib/preferencesState'
import { AppContext } from './AppContext'

const defaultPreferences: AppPreferences = {
  theme: 'dark',
  language: 'en',
  rememberApiKey: true,
}

function disableTransitions(root: HTMLElement) {
  root.classList.add('theme-switching')
  // Force reflow so the disable class takes effect before we mutate the DOM
  void root.offsetHeight
}

function enableTransitions(root: HTMLElement) {
  root.classList.remove('theme-switching')
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  disableTransitions(root)

  const effectiveTheme = theme === 'system' 
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  root.setAttribute('data-theme', effectiveTheme);
  root.classList.remove('light', 'dark');
  root.classList.add(effectiveTheme);

  enableTransitions(root)
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<AppPreferences>(defaultPreferences)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const load = async () => {
      const stored = await getSetting(APP_PREFERENCES_KEY)
      if (stored) {
        setPreferences({ ...defaultPreferences, ...(stored as AppPreferences) })
      }
      setIsReady(true)
    }
    void load()
  }, [])

  // Keep the live cache in sync with React state (single writer for the store)
  useEffect(() => {
    setPreferencesCache(preferences)
  }, [preferences])

  useEffect(() => {
    if (isReady) {
      void saveSetting(APP_PREFERENCES_KEY, preferences)
      applyTheme(preferences.theme)
    }
  }, [preferences, isReady])

  const setTheme = useCallback((theme: Theme) => {
    applyTheme(theme)
    setPreferences((prev) => ({ ...prev, theme }))
  }, [])

  const setLanguage = useCallback((language: string) => {
    setPreferences((prev) => ({ ...prev, language }))
  }, [])

  const setRememberApiKey = useCallback((remember: boolean) => {
    setPreferences((prev) => ({ ...prev, rememberApiKey: remember }))
  }, [])

  return (
    <AppContext.Provider value={{ preferences, isReady, setTheme, setLanguage, setRememberApiKey }}>
      {children}
    </AppContext.Provider>
  )
}
