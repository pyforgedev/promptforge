import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { getGeneratorState, saveGeneratorState, withRetry } from '@/services/storage/indexeddb'

interface MasterPromptState {
  customPrompt: string | null
  isReady: boolean

  setCustomPrompt: (prompt: string) => Promise<void>
  resetToDefault: () => Promise<void>
  load: () => Promise<void>
}

const STORAGE_KEY = 'master_prompt_override'

export const useMasterPromptStore = create<MasterPromptState>()(
  persist(
    (set) => ({
      customPrompt: null,
      isReady: false,

      setCustomPrompt: async (prompt: string) => {
        await withRetry(() => saveGeneratorState(STORAGE_KEY, prompt))
        set({ customPrompt: prompt })
      },

      resetToDefault: async () => {
        await withRetry(() => saveGeneratorState(STORAGE_KEY, null))
        set({ customPrompt: null })
      },

      load: async () => {
        const saved = await withRetry(() => getGeneratorState(STORAGE_KEY)) as string | null | undefined
        set({ customPrompt: saved ?? null, isReady: true })
      },
    }),
    {
      name: STORAGE_KEY,
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
        return (state) => {
          if (state) {
            state.isReady = true
          }
        }
      },
    },
  ),
)
