import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { AppPreferences, Theme } from '@/types'

interface AppContextType {
  preferences: AppPreferences
  setTheme: (theme: Theme) => void
  setLanguage: (language: string) => void
}

const defaultPreferences: AppPreferences = {
  theme: 'system',
  language: 'en',
}

export const AppContext = createContext<AppContextType | null>(null)

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') {
    root.classList.remove('light', 'dark')
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark')
    } else {
      root.classList.add('light')
    }
  } else {
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<AppPreferences>(() => {
    const stored = localStorage.getItem('app-preferences')
    if (stored) {
      try {
        return { ...defaultPreferences, ...JSON.parse(stored) }
      } catch {
        return defaultPreferences
      }
    }
    return defaultPreferences
  })

  useEffect(() => {
    localStorage.setItem('app-preferences', JSON.stringify(preferences))
    applyTheme(preferences.theme)
  }, [preferences])

  const setTheme = useCallback((theme: Theme) => {
    setPreferences((prev) => ({ ...prev, theme }))
  }, [])

  const setLanguage = useCallback((language: string) => {
    setPreferences((prev) => ({ ...prev, language }))
  }, [])

  return (
    <AppContext.Provider value={{ preferences, setTheme, setLanguage }}>
      {children}
    </AppContext.Provider>
  )
}
