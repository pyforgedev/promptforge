import { useId, useLayoutEffect, useRef, useState } from 'react'
import { Maximize2, Hash, Image, Clapperboard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { detectPromptType } from '@/services/formatter/formatterService'
import type { FormatterItem } from '../types'

const OVERFLOW_TOLERANCE_PX = 1

interface ActivePromptDisplayProps {
  item: FormatterItem
}

export function ActivePromptDisplay({ item }: ActivePromptDisplayProps) {
  const { t } = useTranslation()
  const promptId = useId()
  const promptRef = useRef<HTMLParagraphElement>(null)
  const overflowDetectedRef = useRef(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [hasOverflow, setHasOverflow] = useState(false)
  const isVideo = detectPromptType(item.promptText) === 'video'
  const typeLabel = t(isVideo ? 'formatter.typeVideo' : 'formatter.typeImage')

  useLayoutEffect(() => {
    const promptElement = promptRef.current
    if (!promptElement) return

    let active = true
    const measureOverflow = () => {
      if (!active || overflowDetectedRef.current) return

      if (promptElement.scrollHeight - promptElement.clientHeight > OVERFLOW_TOLERANCE_PX) {
        overflowDetectedRef.current = true
        setHasOverflow(true)
      }
    }

    measureOverflow()

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(measureOverflow)
    resizeObserver?.observe(promptElement)

    const fontsReady = document.fonts?.ready
    if (fontsReady) {
      void fontsReady.then(measureOverflow, () => undefined)
    }

    return () => {
      active = false
      resizeObserver?.disconnect()
    }
  }, [item.promptText])

  return (
    <div className="card-spotlight flex min-h-[160px] flex-col gap-4 rounded-xl border border-border-subtle bg-surface p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-caption-ui text-muted">
          <Hash className="h-3.5 w-3.5" />
          <span>{t('formatter.promptNumber', { number: item.order + 1 })}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-brand-primary/10 px-2.5 py-1 text-caption-ui font-medium text-brand-primary">
            {isVideo ? <Clapperboard className="h-3.5 w-3.5" /> : <Image className="h-3.5 w-3.5" />}
            {typeLabel}
          </span>
          {item.detectedAspectRatio && (
            <div className="flex items-center gap-1.5 rounded-full bg-brand-primary/10 px-2.5 py-1 text-caption-ui font-medium text-brand-primary">
              <Maximize2 className="h-3.5 w-3.5" />
              {item.detectedAspectRatio}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <p
          id={promptId}
          ref={promptRef}
          className={cn(
            'whitespace-pre-wrap break-words font-mono text-[14px] leading-[1.75] text-primary',
            !isExpanded && 'line-clamp-4 sm:line-clamp-6',
          )}
        >
          {item.promptText}
        </p>
        {hasOverflow && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={isExpanded}
            aria-controls={promptId}
            className="mt-2 self-start text-muted hover:text-primary"
            onClick={() => setIsExpanded((expanded) => !expanded)}
          >
            {t(isExpanded ? 'formatter.hideFull' : 'formatter.showFull')}
          </Button>
        )}
      </div>
    </div>
  )
}
