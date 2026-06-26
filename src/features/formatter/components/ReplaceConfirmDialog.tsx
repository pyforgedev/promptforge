import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ReplaceConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  copiedCount: number
  totalCount: number
  onConfirm: () => void
}

export function ReplaceConfirmDialog({
  open,
  onOpenChange,
  copiedCount,
  totalCount,
  onConfirm,
}: ReplaceConfirmDialogProps) {
  const { t } = useTranslation()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('formatter.replaceTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('formatter.replaceDescription', { copied: copiedCount, total: totalCount })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-brand-danger text-text-on-brand hover:bg-brand-danger/90"
            onClick={onConfirm}
          >
            {t('formatter.replaceContinue')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
