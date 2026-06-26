import { useTranslation } from 'react-i18next'
import { ChevronLeft, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface QueueControlsProps {
  currentIndex: number
  totalItems: number
  copySuccess: boolean
  onCopy: () => void
  onPrev: () => void
}

export function QueueControls({
  currentIndex,
  totalItems,
  copySuccess,
  onCopy,
  onPrev,
}: QueueControlsProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        onClick={onPrev}
        disabled={currentIndex === 0}
        aria-label={t('formatter.prevPrompt')}
      >
        <ChevronLeft className="h-4 w-4" />
        {t('formatter.prevPrompt')}
      </Button>
      <Button
        variant={copySuccess ? 'default' : 'default'}
        className={cn(
          'btn-press min-w-[140px] gap-2 transition-all duration-300',
          copySuccess && 'bg-brand-success text-white hover:bg-brand-success/90'
        )}
        onClick={onCopy}
        disabled={currentIndex >= totalItems}
        aria-label={t('formatter.copyPrompt')}
      >
        {copySuccess ? (
          <>
            <Check className="h-4 w-4" />
            {t('generator.copied')}
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            {t('formatter.copyPrompt')}
            <kbd className="hidden rounded border border-current/20 px-1.5 text-[11px] opacity-50 sm:inline-block">
              Ctrl+C
            </kbd>
          </>
        )}
      </Button>
    </div>
  )
}
