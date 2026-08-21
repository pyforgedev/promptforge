import { useMemo } from 'react'
import { SaveTemplateDialog } from '@/features/templates/components/SaveTemplateDialog'
import { generatedPromptToTemplateInput } from '@/features/templates/utils/templateMappers'
import type { GeneratedPrompt } from '@/features/prompt-generator/types'

interface SaveAsTemplateDialogProps {
  prompt: GeneratedPrompt | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SaveAsTemplateDialog({ prompt, open, onOpenChange }: SaveAsTemplateDialogProps) {
  const input = useMemo(
    () => prompt ? generatedPromptToTemplateInput(prompt) : null,
    [prompt],
  )

  return (
    <SaveTemplateDialog
      input={input}
      open={open}
      onOpenChange={onOpenChange}
      titleKey="templates.save.dialogTitle"
      successKey="templates.toast.savedFromGenerator"
    />
  )
}
