import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Check, ChevronDown } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { toast } from 'sonner'

interface NegativePromptPanelProps {
  negativePrompt: string
}

export function NegativePromptPanel({ negativePrompt }: NegativePromptPanelProps) {
  const { t } = useTranslation()
  const shouldReduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(negativePrompt)
    setCopied(true)
    toast.success(t('promptCard.copied'))
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="border-t border-border-subtle">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-caption-ui font-medium text-muted transition-colors hover:text-primary"
      >
        <span>{t('promptCard.negative.title')}</span>
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
            <div className="flex flex-col gap-2 px-4 pb-3">
              <p className="text-caption-ui text-muted">
                {t('promptCard.negative.description')}
              </p>
              <div className="relative rounded-md bg-surface-hover/50 p-3">
                <p className="pr-8 text-body-ui leading-relaxed text-primary">{negativePrompt}</p>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="absolute right-2 top-2 rounded p-1 text-muted transition-colors hover:text-primary"
                  aria-label={t('promptCard.negative.copy')}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-brand-success" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
