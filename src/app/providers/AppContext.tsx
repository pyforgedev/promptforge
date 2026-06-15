import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { AppPreferences, Theme } from '@/types'
import { getSetting, saveSetting } from '@/services/storage/indexeddb'

interface AppContextType {
  preferences: AppPreferences
  isReady: boolean
  setTheme: (theme: Theme) => void
  setLanguage: (language: string) => void
}

const defaultPreferences: AppPreferences = {
  theme: 'system',
  language: 'en',
}

export const AppContext = createContext<AppContextType | null>(null)

const PREFERENCES_KEY = 'app-preferences'

function applyTheme(theme: Theme) {
  const root = document.documentElement
  const effectiveTheme = theme === 'system' 
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  
  root.setAttribute('data-theme', effectiveTheme);
  // Maintain backward compatibility for transition
  root.classList.remove('light', 'dark');
  root.classList.add(effectiveTheme);
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
