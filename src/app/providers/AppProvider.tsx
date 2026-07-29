import { useState, useEffect, useCallback, type ReactNode } from 'react'
import type { AppPreferences, Theme } from '@/types'
import { getSetting, saveSetting } from '@/services/storage/indexeddb'
import { AppContext } from './AppContext'

const defaultPreferences: AppPreferences = {
  theme: 'system',
  language: 'en',
}

const PREFERENCES_KEY = 'app-preferences'

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
      const stored = await getSetting(PREFERENCES_KEY)
      if (stored) {
        setPreferences({ ...defaultPreferences, ...(stored as AppPreferences) })
      }
      setIsReady(true)
    }
    void load()
  }, [])

  useEffect(() => {
    if (isReady) {
      void saveSetting(PREFERENCES_KEY, preferences)
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

  return (
    <AppContext.Provider value={{ preferences, isReady, setTheme, setLanguage }}>
      {children}
    </AppContext.Provider>
  )
}
