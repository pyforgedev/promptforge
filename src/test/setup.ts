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
import {
  setCryptoKeyStore,
  resetEncryptionCache,
  type CryptoKeyStore,
} from '@/lib/crypto'
import { setPreferencesCache } from '@/lib/preferencesState'

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

// 3. localStorage/sessionStorage shim
// Node >=22 exposes an experimental global `localStorage` (returns undefined
// without --localstorage-file), which prevents vitest's populateGlobal from
// copying jsdom's real Storage. Provide spec-compliant in-memory versions.
class MemoryStorage {
  private store = new Map<string, string>()

  get length() {
    return this.store.size
  }

  clear() {
    this.store.clear()
  }

  getItem(key: string) {
    return this.store.get(key) ?? null
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string) {
    this.store.delete(key)
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value))
  }
}

if (typeof Storage !== 'undefined') {
  Object.setPrototypeOf(MemoryStorage.prototype, Storage.prototype)
}

const memoryStorage = new MemoryStorage()
const memorySessionStorage = new MemoryStorage()

Object.defineProperty(globalThis, 'localStorage', {
  value: memoryStorage,
  configurable: true,
  writable: true,
})
Object.defineProperty(globalThis, 'sessionStorage', {
  value: memorySessionStorage,
  configurable: true,
  writable: true,
})

// 3b. Crypto: inject an in-memory CryptoKeyStore for tests.
// fake-indexeddb (Node) cannot structured-clone a CryptoKey
// (DataCloneError), so tests must never touch the IndexedDB-backed default
// store — production browser behavior is verified via QA. If the test
// runtime ever gains CryptoKey clone support, the real backend is used.
let testMasterKey: CryptoKey | null = null
const testCryptoKeyStore: CryptoKeyStore = {
  load: async () => testMasterKey ?? undefined,
  save: async (key) => {
    testMasterKey = key
  },
  clear: async () => {
    testMasterKey = null
  },
}

let canStructuredCloneCryptoKey = false
try {
  const probe = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 128 }, false, ['encrypt', 'decrypt'])
  structuredClone(probe)
  canStructuredCloneCryptoKey = true
} catch {
  // runtime lacks CryptoKey structured-clone support — keep injection below
}

if (!canStructuredCloneCryptoKey) {
  setCryptoKeyStore(testCryptoKeyStore)
}

// 4. Mock MatchMedia (needed for Radix UI and layout checks)
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

// 5. Pointer capture stubs (jsdom gap — Radix Select pointer handlers call these)
if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => {}
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
}

// 5b. Window.scrollTo stub (jsdom gap — Layout scrolls to top on route change)
if (typeof window !== 'undefined') {
  window.scrollTo ??= () => {}
}

// 6. ResizeObserver stub (jsdom gap — Radix ScrollArea constructs it on mount)
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}

// 7. IntersectionObserver stub (jsdom gap — framer-motion useInView constructs
// it; mark every observed element as intersecting so items render in view)
if (typeof globalThis.IntersectionObserver === 'undefined') {
  class IntersectionObserverStub {
    private readonly callback: IntersectionObserverCallback

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback
    }

    observe(target: Element) {
      this.callback(
        [{ isIntersecting: true, target } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      )
    }

    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
    root = null
    rootMargin = ''
    thresholds = [0]
  }
  globalThis.IntersectionObserver =
    IntersectionObserverStub as unknown as typeof IntersectionObserver
}

// 4. Clean Database & Reset Zustand stores between tests
beforeEach(async () => {
  // Clear in-memory storage shims
  memoryStorage.clear()
  memorySessionStorage.clear()

  // Drop the in-memory key cache so each test starts from the store
  resetEncryptionCache()
  await testCryptoKeyStore.clear()
  setPreferencesCache(null)

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
    recoveryNeeded: false,
    recoveryKeys: [],
  })
  
  usePromptGeneratorStore.setState({
    input: {
      niche: '',
      category: 'lifestyle',
      batchSize: 1,
      usageContext: 'commercial',
      language: 'en',
      aspectRatio: 'random',
      variationLevel: 3,
      styleMode: 'user',
      mood: { mode: 'user', value: 'none' },
      colorPalette: { mode: 'user', value: 'none' },
      artStyle: { mode: 'user', value: 'none' },
      background: { mode: 'user', value: 'none' },
      humanModel: { mode: 'user', value: 'no_people' },
      customInstructions: '',
      includeHistory: false,
      includeHistoryCount: 20,
      targetMarket: 'global',
      targetPlatform: 'dalle3',
      includeDiversity: true,
      allowTextSpace: false,
      includeNegativePrompts: true,
      includeKeywords: true
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
    folderCounts: {},
    totalPromptCount: 0,
    selectedIds: [],
    currentFolderId: null,
    searchAllFolders: false,
    filters: {
      aspectRatio: 'all',
      artStyleKey: 'all',
      minScore: 0,
      dateFrom: '',
      dateTo: '',
      search: '',
      sort: 'date-desc',
    },
    loading: false,
    error: null,
    hasMore: false,
    cursor: null,
  })
})
