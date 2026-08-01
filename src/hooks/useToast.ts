import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

type ToastType = 'success' | 'error' | 'warning' | 'info'

export function useToast() {
  const { t } = useTranslation()

  const showToast = (
    type: ToastType,
    message: string,
    description?: string,
    duration?: number,
  ) => {
    try {
      const errorDuration = !duration && type === 'error' ? 8000 : undefined
      const options = {
        ...(description ? { description } : {}),
        ...(duration ? { duration } : errorDuration ? { duration: errorDuration } : {}),
      }
      switch (type) {
        case 'success':
          toast.success(message, options)
          break
        case 'error':
          toast.error(message, options)
          break
        case 'warning':
          toast.warning(message, options)
          break
        case 'info':
          toast.info(message, options)
          break
        default:
          toast(message, options)
      }
    } catch (err) {
      console.warn('Toast failed, falling back to alert:', err)
      alert(`${t('toast.error')}: ${message}`) // Fallback to alert for critical notifications
    }
  }

  const showCopySuccess = () => {
    showToast('success', t('toast.copySuccess'), undefined, 3000)
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
