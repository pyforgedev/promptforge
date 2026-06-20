import 'fake-indexeddb/auto'
import { webcrypto } from 'node:crypto'
import '@testing-library/jest-dom'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { vi } from 'vitest'
import db from '@/services/storage/indexeddb'
import { useAIConfigStore } from '@/store/useAIConfigStore'
import { usePromptGeneratorStore } from '@/features/prompt-generator/store/promptGeneratorStore'
import { useHistoryStore } from '@/store/useHistoryStore'

import enTranslation from '../../public/locales/en/translation.json'
import idTranslation from '../../public/locales/id/translation.json'

// 1. Web Crypto API Polyfill for JSDOM
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: true,
  })
} else if (!globalThis.crypto.subtle) {
  Object.defineProperty(globalThis.crypto, 'subtle', {
    value: webcrypto.subtle,
    writable: true,
  })
}

// 2. i18n Test Instance Setup
void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: { translation: enTranslation },
    id: { translation: idTranslation },
  },
  interpolation: {
    escapeValue: false,
  },
})

// 3. Mock MatchMedia (needed for Radix UI and layout checks)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// 4. Clean Database & Reset Zustand stores between tests
beforeEach(async () => {
  // Clear indexeddb tables
  await Promise.all(
    db.tables.map(table => table.clear())
  )

  // Reset Zustand Stores (registers store-clearing behaviors)
  useAIConfigStore.setState({
    presets: [],
    activeConfig: null,
    isReady: true,
    isLoading: false,
    error: null,
  })
  
  usePromptGeneratorStore.setState({
    input: {
      niche: '',
      category: 'commercial',
      batchSize: 1,
      usageContext: 'commercial',
      targetMarket: 'global',
      targetPlatform: 'midjourney',
      includeDiversity: true,
      allowTextSpace: false
    },
    batch: null,
    isGenerating: false,
    error: null,
    advancedOptionsOpen: false,
    _hasHydrated: true,
  })

  useHistoryStore.setState({
    items: [],
    folders: [],
    activeFolderId: null,
    searchQuery: '',
    filterRating: 0,
    isLoading: false,
    error: null,
  })
})
