import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TemplateForm } from '@/features/templates/components/TemplateForm'
import { useTemplates } from '@/features/templates/hooks/useTemplates'
import type { CreateTemplateInput, TemplateCategory } from '@/features/templates/types'
import type { TemplateFormData } from '@/features/templates/utils/templateValidators'
import { TemplateError } from '@/features/templates/services/templateService'

interface SaveTemplateDialogProps {
  input: CreateTemplateInput | null
  open: boolean
  onOpenChange: (open: boolean) => void
  titleKey: string
  successKey: string
}

export function SaveTemplateDialog({ input, open, onOpenChange, titleKey, successKey }: SaveTemplateDialogProps) {
  const { t } = useTranslation()
  const { create, actionError, pendingAction, clearActionError } = useTemplates()

  useEffect(() => {
    if (open) clearActionError()
  }, [clearActionError, open])

  const handleSubmit = useCallback(async (data: TemplateFormData) => {
    if (!input) return
    try {
      await create({ ...input, ...data, category: data.category as TemplateCategory })
      onOpenChange(false)
      toast.success(t(successKey))
    } catch (error) {
      const code = error instanceof TemplateError ? error.code : 'STORAGE_FAILED'
      const key = code === 'DUPLICATE_NAME' ? 'duplicateName'
        : code === 'NOT_FOUND' ? 'notFound'
          : code === 'INVALID_DATA' ? 'invalidData'
            : code === 'BUILTIN_CONFLICT' ? 'builtinConflict'
              : code === 'IMPORT_LIMIT' ? 'importLimit'
                : 'storageFailed'
      toast.error(t(`templates.errors.${key}`))
    }
  }, [create, input, onOpenChange, successKey, t])

  if (!input) return null

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (nextOpen) clearActionError()
      onOpenChange(nextOpen)
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(titleKey)}</DialogTitle>
          <DialogDescription>{t('templates.save.description')}</DialogDescription>
        </DialogHeader>
        <TemplateForm
          initialData={input}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          submitError={actionError}
          pending={pendingAction === 'create'}
        />
      </DialogContent>
    </Dialog>
  )
}
