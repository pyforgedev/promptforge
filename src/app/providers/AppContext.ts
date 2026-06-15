import { createContext } from 'react'
import type { AppPreferences, Theme } from '@/types'

export interface AppContextType {
  preferences: AppPreferences
  isReady: boolean
  setTheme: (theme: Theme) => void
  setLanguage: (language: string) => void
}

export const AppContext = createContext<AppContextType | null>(null)
