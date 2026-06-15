import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { getGeneratorState, saveGeneratorState, withRetry } from '@/services/storage/indexeddb'
import type { 
  AspectRatio, 
  StylePresetKey, 
  VariationCount, 
  GeneratedPrompt 
} from '@/features/generator/types'

interface GeneratorState {
  aspectRatio: AspectRatio
  niche: string
  stylePreset: StylePresetKey
  customStyle: string
  count: VariationCount
  lastResult: GeneratedPrompt[] | null
  isReady: boolean
  
  setAspectRatio: (value: AspectRatio) => void
  setNiche: (value: string) => void
  setStylePreset: (value: StylePresetKey) => void
  setCustomStyle: (value: string) => void
  setCount: (value: VariationCount) => void
  setLastResult: (value: GeneratedPrompt[] | null) => void
  hydrate: () => Promise<void>
}

export const useGeneratorStore = create<GeneratorState>()(
  persist(
    (set) => ({
      aspectRatio: 'random',
      niche: '',
      stylePreset: 'none',
      customStyle: '',
      count: 1,
      lastResult: null,
      isReady: false,

      setAspectRatio: (value) => set({ aspectRatio: value }),
      setNiche: (value) => set({ niche: value }),
      setStylePreset: (value) => set({ stylePreset: value }),
      setCustomStyle: (value) => set({ customStyle: value }),
      setCount: (value) => set({ count: value }),
      setLastResult: (value) => set({ lastResult: value }),
      hydrate: async () => {
        const saved = await withRetry(() => getGeneratorState('generator_state')) as Partial<GeneratorState> | undefined
        if (saved) {
          set({ ...saved, isReady: true })
        } else {
          set({ isReady: true })
        }
      },
    }),
    {
      name: 'generator-storage',
      storage: createJSONStorage(() => ({
        getItem: async (name) => {
          const value = await withRetry(() => getGeneratorState(name))
          return value ? JSON.stringify(value) : null
        },
        setItem: async (name, value) => {
          await withRetry(() => saveGeneratorState(name, JSON.parse(value)))
        },
        removeItem: async () => {},
      })),
      onRehydrateStorage: () => {
        return (rehydratedState) => {
          if (rehydratedState) {
            rehydratedState.isReady = true
          }
        }
      },
    }
  )
)
