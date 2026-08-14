// src/features/prompt-generator/components/PromptResultsDisplay.tsx
// This component renders the output of the V2 generator.
// It listens to the usePromptGeneratorStore for the batch, loading, and error states.

import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { usePromptGeneratorStore } from '../store/promptGeneratorStore'
import { useAIConfigStore } from '@/store/useAIConfigStore'
import { GenerationService } from '../services/generationService'

import { GeneratorPromptCard } from './GeneratorPromptCard'
import { BatchActionBar } from './BatchActionBar'
import { SaveAsTemplateDialog } from './SaveAsTemplateDialog'
import { ServerCrash, AlertCircle } from 'lucide-react'
import { CardSkeleton } from '@/components/ui/skeleton'
import type { GeneratedPrompt } from '../types'

export function PromptResultsDisplay() {
  const { t } = useTranslation()
  const [templatePrompt, setTemplatePrompt] = useState<GeneratedPrompt | null>(null)
  const { batch, isGenerating, error, toggleFavoriteInBatch } = usePromptGeneratorStore(
    useShallow((state) => ({
      batch: state.batch,
      isGenerating: state.isGenerating,
      error: state.error,
      toggleFavoriteInBatch: state.toggleFavoriteInBatch,
    })),
  )

  const activeConfig = useAIConfigStore((s) => s.activeConfig)

  const handleToggleFavorite = useCallback(async (id: string) => {
    if (!activeConfig) return
    const service = new GenerationService(activeConfig)
    const { error } = await service.toggleFavorite(id)
    if (error) throw new Error(error.message)
    toggleFavoriteInBatch(id)
  }, [activeConfig, toggleFavoriteInBatch])

  const handleExportCSV = useCallback(() => {
    if (!batch) return
    const rows = batch.prompts.map((p) => [
      p.id,
      p.variantIndex,
      p.fullPrompt,
      p.platformVariants.dalle3,
      p.platformVariants.nano_banana,
      p.negativePrompt,
      p.commercialKeywords.join('; '),
      p.adobeScore.total,
      p.isFavorite,
    ])
    const csv = [
      ['id', 'variantIndex', 'fullPrompt', 'dalle3', 'nano_banana', 'negativePrompt', 'keywords', 'adobeScore', 'isFavorite'].join(','),
      ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prompts-${batch.batchId}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t('batchActionBar.exported'))
  }, [batch, t])

  const handleSaveAsTemplate = useCallback((prompt: GeneratedPrompt) => {
    setTemplatePrompt(prompt)
  }, [])

  const handleExportJSON = useCallback(() => {
    if (!batch) return
    const blob = new Blob([JSON.stringify(batch, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prompts-${batch.batchId}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t('batchActionBar.exported'))
  }, [batch, t])

  if (isGenerating && !batch) {
    const batchSize = usePromptGeneratorStore.getState().input.batchSize || 3
    return (
      <div className="flex flex-col gap-6" role="status" aria-live="polite">
        <AnimatePresence>
          {Array.from({ length: batchSize }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
            >
              <CardSkeleton />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    )
  }

  if (error && !batch) {
    const errorCode = error.code || 'PROVIDER_ERROR';
    return (
      <div className="overlay-glass flex min-h-[220px] flex-col justify-center gap-4 rounded-r-lg border-l-[3px] border-l-brand-danger p-6">
        {errorCode === 'PARTIAL_BATCH' ? (
           <AlertCircle className="h-6 w-6 text-brand-danger" />
        ) : (
           <ServerCrash className="h-6 w-6 text-brand-danger" />
        )}
        <div className="flex flex-col gap-1">
          <h3 className="text-heading text-brand-danger">{t(`generator.form.errors.${errorCode}.title`)}</h3>
          <p className="max-w-xl text-body-ui text-secondary">{error.message}</p>
        </div>
      </div>
    )
  }
  
  if (!batch || batch.prompts.length === 0) {
    return null // Render nothing if there's no batch and no loading/error
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <AnimatePresence>
          <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col gap-6"
          >
            <BatchActionBar
              onExportCSV={handleExportCSV}
              onExportJSON={handleExportJSON}
            />
            {batch.prompts.map((prompt) => (
              <GeneratorPromptCard
                key={prompt.id}
                prompt={prompt}
                totalInBatch={batch.prompts.length}
                onToggleFavorite={handleToggleFavorite}
                onSaveAsTemplate={handleSaveAsTemplate}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      <SaveAsTemplateDialog
        prompt={templatePrompt}
        open={!!templatePrompt}
        onOpenChange={(open) => { if (!open) setTemplatePrompt(null) }}
      />
    </>
  )
}
