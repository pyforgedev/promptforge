import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Check, ChevronDown } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { toast } from 'sonner'

import type { PromptSegments } from '../types'

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
}

function SegmentRow({ label, value }: SegmentRowProps) {
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
      <span className="w-28 shrink-0 text-caption-ui font-medium text-muted-foreground">{label}</span>
      <span className="flex-1 text-body-ui leading-relaxed text-primary">{value}</span>
      <button
        onClick={handleCopy}
        className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
        aria-label={t('promptCard.copySegment', { segment: label })}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-brand-success" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  )
}

interface SegmentsPanelProps {
  segments: PromptSegments
  unavailable?: boolean
}

export function SegmentsPanel({ segments, unavailable }: SegmentsPanelProps) {
  const { t } = useTranslation()
  const shouldReduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)

  return (
    <div className="border-t border-border/50">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-caption-ui font-medium text-muted-foreground transition-colors hover:text-primary"
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
            transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="group flex flex-col divide-y divide-border/40 px-4 pb-3">
              {unavailable ? (
                <p className="py-2 text-body-ui text-muted-foreground">
                  {t('promptCard.segments.unavailable')}
                </p>
              ) : (
                SEGMENT_KEYS.map((key) => (
                  <SegmentRow
                    key={key}
                    label={t(`promptCard.segments.${key}`)}
                    value={segments[key]}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
