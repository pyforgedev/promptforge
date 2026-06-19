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

import { PromptCard } from './PromptCard'
import { BatchActionBar } from './BatchActionBar'
import { SaveAsTemplateDialog } from './SaveAsTemplateDialog'
import { Loader2, ServerCrash, AlertCircle } from 'lucide-react'
import type { GeneratedPrompt } from '../types'

export function PromptResultsDisplay() {
  const { t } = useTranslation()
  const [templatePrompt, setTemplatePrompt] = useState<GeneratedPrompt | null>(null)
  const { batch, isGenerating, error } = usePromptGeneratorStore(
    useShallow((state) => ({
      batch: state.batch,
      isGenerating: state.isGenerating,
      error: state.error,
    })),
  )

  const activeConfig = useAIConfigStore((s) => s.activeConfig)

  const handleToggleFavorite = useCallback(async (id: string) => {
    if (!activeConfig) return
    const service = new GenerationService(activeConfig)
    const { error } = await service.toggleFavorite(id)
    if (error) throw new Error(error.message)
  }, [activeConfig])

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
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-center rounded-lg border-2 border-dashed border-border p-12 min-h-[300px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <h3 className="text-xl font-semibold">{t('generator.results.generatingTitle')}</h3>
        <p className="text-muted-foreground max-w-sm">{t('generator.results.generatingDescription')}</p>
      </div>
    )
  }

  if (error && !batch) {
    const errorCode = error.code || 'PROVIDER_ERROR';
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-center rounded-lg border-2 border-dashed border-destructive/50 bg-destructive/5 p-12 min-h-[300px]">
        {errorCode === 'PARTIAL_BATCH' ? (
           <AlertCircle className="h-10 w-10 text-destructive" />
        ) : (
           <ServerCrash className="h-10 w-10 text-destructive" />
        )}
        <h3 className="text-xl font-semibold text-destructive">{t(`generator.form.errors.${errorCode}.title`)}</h3>
        <p className="text-muted-foreground max-w-sm">{error.message}</p>
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
              <PromptCard
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
