import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { usePrompts } from '@/features/prompts/hooks/usePrompts'
import { PromptForm } from '@/features/prompts/components/PromptForm'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { PromptFormData } from '@/features/prompts/utils/promptValidators'
import type { GeneratedPrompt } from '../types'

interface SaveAsTemplateDialogProps {
  prompt: GeneratedPrompt | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SaveAsTemplateDialog({
  prompt,
  open,
  onOpenChange,
}: SaveAsTemplateDialogProps) {
  const { t } = useTranslation()
  const { create } = usePrompts()

  const handleSubmit = useCallback(
    async (data: PromptFormData) => {
      await create(data)
      onOpenChange(false)
      toast.success(t('promptCard.savedAsTemplate'))
    },
    [create, onOpenChange, t],
  )

  const displayText =
    prompt?.platformVariants.dalle3 || prompt?.platformVariants.nano_banana || ''

  const initialData = useMemo(
    () => {
      if (!prompt) {
        return {
          id: '', name: '', content: '', category: 'general', tags: [],
          createdAt: 0 as number, updatedAt: 0 as number,
        }
      }
      return {
        id: '',
        name: `${prompt.generatorInput.niche} — Variant ${prompt.variantIndex}`,
        content: displayText,
        category: prompt.generatorInput.category ?? 'general',
        tags: prompt.commercialKeywords.slice(0, 5),
        createdAt: 0 as number,
        updatedAt: 0 as number,
      }
    },
    [prompt, displayText],
  )

  if (!prompt) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('promptCard.saveAsTemplateTitle')}</DialogTitle>
          <DialogDescription />
        </DialogHeader>
        <PromptForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          initialData={initialData}
        />
      </DialogContent>
    </Dialog>
  )
}
