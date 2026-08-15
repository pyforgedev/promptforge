import { create } from 'zustand'
import { getSetting, saveSetting, peekRawSetting, deleteSetting } from '@/services/storage/indexeddb'
import { ACTIVE_CONFIG_KEY, PRESETS_KEY, APP_PREFERENCES_KEY } from '@/lib/storageKeys'
import { getPreferencesCache } from '@/lib/preferencesState'
import { sanitizeError } from '@/lib/sanitizeError'
import i18n from '@/i18n'
import type { AIConfig, AIConfigPreset } from '@/features/settings/types'
import type { AppPreferences } from '@/types'

interface AIConfigState {
  presets: AIConfigPreset[]
  activeConfig: AIConfig | null
  isReady: boolean
  isLoading: boolean
  error: string | null
  recoveryNeeded: boolean
  recoveryKeys: string[]

  // Actions
  loadConfigs: () => Promise<void>
  setActiveConfig: (config: AIConfig) => Promise<void>
  savePreset: (preset: AIConfigPreset) => Promise<void>
  deletePreset: (id: string) => Promise<void>
  clearOrphanedConfigs: (keys: string[]) => Promise<void>
  forgetStoredApiKeys: () => Promise<void>
}

// Single source of truth: the live cache maintained by AppProvider (set
// synchronously when the toggle flips). Falls back to IndexedDB only before
// AppProvider has loaded preferences.
async function shouldRememberApiKey(): Promise<boolean> {
  const cached = getPreferencesCache()
  if (cached) return cached.rememberApiKey !== false
  const prefs = (await getSetting(APP_PREFERENCES_KEY)) as Partial<AppPreferences> | undefined
  return prefs?.rememberApiKey !== false
}

export const useAIConfigStore = create<AIConfigState>((set, get) => ({
  presets: [],
  activeConfig: null,
  isReady: false,
  isLoading: false,
  error: null,
  recoveryNeeded: false,
  recoveryKeys: [],

  loadConfigs: async () => {
    if (get().isLoading) return
    set({ isLoading: true })
    try {
      const [activeConfig, presets, rawActive, rawPresets] = await Promise.all([
        getSetting(ACTIVE_CONFIG_KEY) as Promise<AIConfig | undefined>,
        getSetting(PRESETS_KEY) as Promise<AIConfigPreset[] | undefined>,
        peekRawSetting(ACTIVE_CONFIG_KEY),
        peekRawSetting(PRESETS_KEY),
      ])

      // A record that exists but yields undefined was encrypted with a key we
      // no longer have (orphan). Never leak the raw blob to the UI; surface a
      // recovery state instead.
      const recoveryKeys: string[] = []
      if (rawActive !== undefined && activeConfig === undefined) recoveryKeys.push(ACTIVE_CONFIG_KEY)
      if (rawPresets !== undefined && presets === undefined) recoveryKeys.push(PRESETS_KEY)

      set({
        activeConfig: activeConfig || null,
        presets: Array.isArray(presets) ? presets : [],
        recoveryNeeded: recoveryKeys.length > 0,
        recoveryKeys,
        isReady: true,
        isLoading: false,
      })
    } catch (error) {
      set({
        error: i18n.t('errors.ai.loadConfigsFailed'),
        isLoading: false,
        isReady: true,
      })
      if (import.meta.env.DEV) {
        console.warn('[AIConfigStore] loadConfigs failed:', sanitizeError(error))
      }
    }
  },

  setActiveConfig: async (config: AIConfig) => {
    try {
      set({ isLoading: true })
      const remember = await shouldRememberApiKey()
      const configToSave = remember ? config : { ...config, apiKey: '' }
      await saveSetting(ACTIVE_CONFIG_KEY, configToSave)
      set({
        activeConfig: config,
        isLoading: false,
        recoveryNeeded: false,
        recoveryKeys: [],
      })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[AIConfigStore] setActiveConfig failed:', sanitizeError(error))
      }
      set({
        error: i18n.t('errors.ai.saveActiveConfigFailed'),
        isLoading: false,
      })
      throw error
    }
  },

  savePreset: async (preset: AIConfigPreset) => {
    try {
      set({ isLoading: true })
      const currentPresets = get().presets
      const existingIndex = currentPresets.findIndex(p => p.id === preset.id)
      let newPresets: AIConfigPreset[]

      if (existingIndex >= 0) {
        newPresets = [...currentPresets]
        newPresets[existingIndex] = preset
      } else {
        newPresets = [...currentPresets, preset]
      }

      const remember = await shouldRememberApiKey()
      const presetsToSave = remember
        ? newPresets
        : newPresets.map(p => (p.apiKey ? { ...p, apiKey: '' } : p))

      await saveSetting(PRESETS_KEY, presetsToSave)
      set({
        presets: newPresets,
        isLoading: false,
        recoveryNeeded: false,
        recoveryKeys: [],
      })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[AIConfigStore] savePreset failed:', sanitizeError(error))
      }
      set({
        error: i18n.t('errors.ai.savePresetFailed'),
        isLoading: false,
      })
      throw error
    }
  },

  deletePreset: async (id: string) => {
    try {
      const newPresets = get().presets.filter(p => p.id !== id)
      await saveSetting(PRESETS_KEY, newPresets)
      set({ presets: newPresets })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[AIConfigStore] deletePreset failed:', sanitizeError(error))
      }
      set({ error: i18n.t('errors.ai.deletePresetFailed') })
      throw error
    }
  },

  clearOrphanedConfigs: async (keys: string[]) => {
    await Promise.all(keys.map(key => deleteSetting(key)))
    set({ recoveryNeeded: false, recoveryKeys: [] })
  },

  // "Don't remember API key" mode: strip apiKey from everything already at
  // rest. The master key is NOT touched (HIGH-2) — endpoint/model settings
  // stay decryptable for future sessions.
  forgetStoredApiKeys: async () => {
    const [storedActive, storedPresets] = await Promise.all([
      getSetting(ACTIVE_CONFIG_KEY) as Promise<AIConfig | undefined>,
      getSetting(PRESETS_KEY) as Promise<AIConfigPreset[] | undefined>,
    ])

    if (storedActive?.apiKey) {
      await saveSetting(ACTIVE_CONFIG_KEY, { ...storedActive, apiKey: '' })
    }
    if (Array.isArray(storedPresets) && storedPresets.some(p => p.apiKey)) {
      await saveSetting(PRESETS_KEY, storedPresets.map(p => (p.apiKey ? { ...p, apiKey: '' } : p)))
    }
  },
}))
