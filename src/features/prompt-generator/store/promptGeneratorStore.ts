// promptGeneratorStore — Zustand store for the new PromptComposerEngine-based generator.
// Phase 4.2. Holds GeneratorInput, the generated batch, loading & error state.
// The legacy useGeneratorStore is preserved unchanged for the old generator feature.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { GenerationService } from '../services/generationService'
import { useAIConfigStore } from '@/store/useAIConfigStore'
import type { GeneratorInput, GeneratedPromptBatch, PromptGeneratorError } from '../types'
import { generatorInputDefaults } from '../schemas/generatorInputSchema'

interface PromptGeneratorStoreState {
  input: GeneratorInput
  batch: GeneratedPromptBatch | null
  isGenerating: boolean
  error: PromptGeneratorError | null

  setInput: (input: Partial<GeneratorInput>) => void
  generatePrompts: () => Promise<void>
  clearBatch: () => void
  resetInput: () => void
}

export const usePromptGeneratorStore = create<PromptGeneratorStoreState>()(
  persist(
    (set, get) => ({
      input: { ...generatorInputDefaults },
      batch: null,
      isGenerating: false,
      error: null,

      setInput: (partial) =>
        set((state) => ({ input: { ...state.input, ...partial } })),

      generatePrompts: async () => {
        if (get().isGenerating) return
        set({ isGenerating: true, error: null })

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

        set({ batch: data, error, isGenerating: false })

        if (data) {
          const { error: saveError } = await generationService.saveBatch(data)
          if (saveError) {
            console.error('Failed to auto-save batch:', saveError)
          }
        }
      },

      clearBatch: () => set({ batch: null, error: null }),
      
      resetInput: () => set({ input: { ...generatorInputDefaults } }),
    }),
    {
      name: 'prompt-generator-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ input: state.input }),
    },
  ),
)
