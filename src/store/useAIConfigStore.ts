import { create } from 'zustand'
import { getSetting, saveSetting } from '@/services/storage/indexeddb'
import type { AIConfig, AIConfigPreset } from '@/features/settings/types'

interface AIConfigState {
  presets: AIConfigPreset[]
  activeConfig: AIConfig | null
  isReady: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  loadConfigs: () => Promise<void>
  setActiveConfig: (config: AIConfig) => Promise<void>
  savePreset: (preset: AIConfigPreset) => Promise<void>
  deletePreset: (id: string) => Promise<void>
}

const ACTIVE_CONFIG_KEY = 'active_ai_config'
const PRESETS_KEY = 'ai_config_presets'

export const useAIConfigStore = create<AIConfigState>((set, get) => ({
  presets: [],
  activeConfig: null,
  isReady: false,
  isLoading: false,
  error: null,

  loadConfigs: async () => {
    if (get().isLoading) return
    set({ isLoading: true })
    try {
      const [activeConfig, presets] = await Promise.all([
        getSetting(ACTIVE_CONFIG_KEY) as Promise<AIConfig | undefined>,
        getSetting(PRESETS_KEY) as Promise<AIConfigPreset[] | undefined>
      ])
      
      set({ 
        activeConfig: activeConfig || null, 
        presets: presets || [],
        isReady: true,
        isLoading: false 
      })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load configs',
        isLoading: false,
        isReady: true // Still ready even if error, just empty
      })
    }
  },

  setActiveConfig: async (config: AIConfig) => {
    try {
      set({ isLoading: true })
      await saveSetting(ACTIVE_CONFIG_KEY, config)
      set({ activeConfig: config, isLoading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to save active config',
        isLoading: false
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
      
      await saveSetting(PRESETS_KEY, newPresets)
      set({ presets: newPresets, isLoading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to save preset',
        isLoading: false
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
      set({ error: error instanceof Error ? error.message : 'Failed to delete preset' })
      throw error
    }
  }
}))
