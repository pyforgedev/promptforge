// promptGeneratorStore — Zustand store for the new PromptComposerEngine-based generator.
// Phase 4.2. Holds GeneratorInput, the generated batch, loading & error state.
// The legacy useGeneratorStore is preserved unchanged for the old generator feature.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { GenerationService } from '../services/generationService'
import { useAIConfigStore } from '@/store/useAIConfigStore'
import { getGeneratorState, saveGeneratorState, withRetry } from '@/services/storage/indexeddb'
import type { GeneratorInput, GeneratedPromptBatch, PromptGeneratorError } from '../types'
import { generatorInputDefaults } from '../schemas/generatorInputSchema'

interface PromptGeneratorStoreState {
  input: GeneratorInput
  batch: GeneratedPromptBatch | null
  isGenerating: boolean
  error: PromptGeneratorError | null
  advancedOptionsOpen: boolean
  _hasHydrated: boolean

  setInput: (input: Partial<GeneratorInput>) => void
  setAdvancedOptionsOpen: (open: boolean) => void
  generatePrompts: () => Promise<void>
  clearBatch: () => void
  resetInput: () => void
  toggleFavoriteInBatch: (id: string) => void
  removePromptsFromBatch: (ids: string[]) => void
}

export const usePromptGeneratorStore = create<PromptGeneratorStoreState>()(
  persist(
    (set, get) => ({
      input: { ...generatorInputDefaults },
      batch: null,
      isGenerating: false,
      error: null,
      advancedOptionsOpen: false,
      _hasHydrated: false,

      setInput: (partial) =>
        set((state) => ({ input: { ...state.input, ...partial } })),
      
      setAdvancedOptionsOpen: (open) =>
        set({ advancedOptionsOpen: open }),

      generatePrompts: async () => {
        if (get().isGenerating) return
        set({ isGenerating: true, error: null, batch: null })

        const activeConfig = useAIConfigStore.getState().activeConfig
        if (!activeConfig?.apiKey) {
          const error: PromptGeneratorError = {
            code: 'PROVIDER_ERROR',
            message: 'API key is not configured. Please set it in the settings.',
          }
          set({ error, isGenerating: false })
          return
        }
        
        const generationService = new GenerationService(activeConfig)
        const { data, error } = await generationService.generatePrompts(get().input)

        if (error) {
          console.error('Prompt Generation Error:', error)
        }

        if (data) {
          const { error: saveError } = await generationService.saveBatch(data)
          if (saveError) {
            console.error('Failed to auto-save batch:', saveError)
          }
        }

        set({ batch: data, error, isGenerating: false })
      },

      clearBatch: () => set({ batch: null, error: null }),
      
      resetInput: () => set({ input: { ...generatorInputDefaults } }),

      toggleFavoriteInBatch: (id) =>
        set((state) => {
          if (!state.batch) return {}
          const updatedPrompts = state.batch.prompts.map((p) =>
            p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
          )
          return {
            batch: {
              ...state.batch,
              prompts: updatedPrompts,
            },
          }
        }),

      removePromptsFromBatch: (ids) =>
        set((state) => {
          if (!state.batch) return {}
          const updatedPrompts = state.batch.prompts.filter(
            (p) => !ids.includes(p.id)
          )
          if (updatedPrompts.length === 0) {
            return { batch: null }
          }
          return {
            batch: {
              ...state.batch,
              prompts: updatedPrompts,
            },
          }
        }),
    }),
    {
      name: 'prompt-generator-v2',
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
      partialize: (state) => ({
        input: { ...state.input, basePromptReference: undefined },
        batch: state.batch,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            state._hasHydrated = true
          } else {
            usePromptGeneratorStore.setState({ _hasHydrated: true })
          }
        }
      },
    },
  ),
)
