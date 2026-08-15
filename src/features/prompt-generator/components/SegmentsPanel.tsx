import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Check, ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import type { PromptSegments } from '../types'
import type { SegmentSource, SegmentSources } from '../utils/segmentSources'

const SEGMENT_KEYS = [
  'subject',
  'composition',
  'lighting',
  'mood',
  'style',
  'technical',
  'colorPalette',
  'environment',
] as const

interface SegmentRowProps {
  label: string
  value: string
  source: SegmentSource
}

function SegmentRow({ label, value, source }: SegmentRowProps) {
  const [copied, setCopied] = useState(false)
  const { t } = useTranslation()

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    toast.success(t('promptCard.copied'))
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="flex w-28 shrink-0 flex-col items-start gap-1 text-caption-ui font-medium text-muted">
        {label}
        <span className={source === 'user'
          ? 'rounded-sm border border-brand-primary/30 bg-brand-primary/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-brand-primary'
          : 'rounded-sm border border-border-subtle bg-surface-hover px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted'}>
          {t(`promptCard.segments.source.${source}`)}
        </span>
      </span>
      <span className="flex-1 text-body-ui leading-relaxed text-primary">{value}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleCopy}
            className="mt-0.5 shrink-0 cursor-pointer rounded p-0.5 text-muted opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
            aria-label={t('promptCard.copySegment', { segment: label })}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-brand-success" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          {t('promptCard.copySegment', { segment: label })}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

interface SegmentsPanelProps {
  segments: PromptSegments
  sources: SegmentSources
  unavailable?: boolean
}

export function SegmentsPanel({ segments, sources, unavailable }: SegmentsPanelProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <div className="border-t border-border-subtle">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-caption-ui font-medium text-muted transition-colors hover:text-primary"
      >
        <span>{t('promptCard.segments.title')}</span>
        <ChevronDown
          className="h-3.5 w-3.5 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <TooltipProvider delayDuration={300}>
              <div className="group flex flex-col divide-y divide-border-subtle px-4 pb-3">
                {unavailable ? (
                  <p className="py-2 text-body-ui text-muted">
                    {t('promptCard.segments.unavailable')}
                  </p>
                ) : (
                  SEGMENT_KEYS.map((key) => (
                    <SegmentRow
                      key={key}
                      label={t(`promptCard.segments.${key}`)}
                      value={segments[key]}
                      source={sources[key]}
                    />
                  ))
                )}
              </div>
            </TooltipProvider>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
