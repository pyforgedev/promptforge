import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

type ToastType = 'success' | 'error' | 'warning' | 'info'

export function useToast() {
  const { t } = useTranslation()

  const showToast = (
    type: ToastType,
    message: string,
    description?: string,
  ) => {
    try {
      switch (type) {
        case 'success':
          toast.success(message, { description })
          break
        case 'error':
          toast.error(message, { description })
          break
        case 'warning':
          toast.warning(message, { description })
          break
        case 'info':
          toast.info(message, { description })
          break
        default:
          toast(message)
      }
    } catch (err) {
      console.warn('Toast failed, falling back to alert:', message, err)
      alert(`${t('toast.error')}: ${message}`) // Fallback to alert for critical notifications
    }
  }

  const showCopySuccess = () => {
    showToast('success', t('toast.copySuccess'))
  }

  const showGenerationSuccess = () => {
    showToast('success', t('toast.generationSuccess'))
  }

  const showImproveSuccess = () => {
    showToast('success', t('toast.improveSuccess'))
  }

  const showDeleteSuccess = () => {
    showToast('success', t('toast.deleteSuccess'))
  }

  const showDeleteAllSuccess = () => {
    showToast('success', t('toast.deleteAllSuccess'))
  }

  const showError = (error: string) => {
    showToast('error', t('toast.error'), error)
  }

  return {
    showToast,
    showCopySuccess,
    showGenerationSuccess,
    showImproveSuccess,
    showDeleteSuccess,
    showDeleteAllSuccess,
    showError,
  }
}
