import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Check, Heart, RotateCcw, ChevronDown, Tag, Bookmark, AlertTriangle } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AdobeScoreBadge, AdobeScoreDisplay } from './AdobeScoreDisplay'
import { SegmentsPanel } from './SegmentsPanel'
import { NegativePromptPanel } from './NegativePromptPanel'
import type { GeneratedPrompt } from '../types'

type DisplayPlatform = 'dalle3' | 'nano_banana'

interface KeywordsPanelProps {
  keywords: string[]
}

function KeywordsPanel({ keywords }: KeywordsPanelProps) {
  const { t } = useTranslation()
  const shouldReduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  const copyAll = async () => {
    await navigator.clipboard.writeText(keywords.join(', '))
    toast.success(t('promptCard.copied'))
  }

  const copyOne = async (kw: string, idx: number) => {
    await navigator.clipboard.writeText(kw)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 1200)
  }

  return (
    <div className="border-t border-border/50">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-caption-ui font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <span className="flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5" />
          {t('promptCard.keywords.title')}
        </span>
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
            <div className="flex flex-col gap-2.5 px-4 pb-3">
              <div className="flex flex-wrap gap-1.5">
                {keywords.map((kw, i) => (
                  <button
                    key={kw}
                    onClick={() => copyOne(kw, i)}
                    className={cn(
                      'cursor-pointer rounded-full border px-2.5 py-0.5 text-caption-ui transition-colors',
                    copiedIdx === i
                      ? 'border-brand-success/40 bg-brand-success/10 text-brand-success'
                      : 'border-border-subtle bg-surface-hover text-muted-foreground hover:border-brand-primary/40 hover:text-primary',
                    )}
                  >
                    {kw}
                  </button>
                ))}
              </div>
              <button
                onClick={copyAll}
                className="cursor-pointer self-start text-caption-ui text-muted-foreground underline-offset-2 transition-colors hover:text-primary hover:underline"
              >
                {t('promptCard.keywords.copyAll')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface PromptCardProps {
  prompt: GeneratedPrompt
  totalInBatch: number
  onRegenerate?: (variantIndex: number) => Promise<void>
  onToggleFavorite?: (id: string) => Promise<void>
  onSaveAsTemplate?: (prompt: GeneratedPrompt) => void
}

export function PromptCard({
  prompt,
  totalInBatch,
  onRegenerate,
  onToggleFavorite,
  onSaveAsTemplate,
}: PromptCardProps) {
  const { t } = useTranslation()
  const shouldReduceMotion = useReducedMotion()

  const defaultPlatform: DisplayPlatform =
    prompt.generatorInput.targetPlatform === 'nano_banana' ? 'nano_banana' : 'dalle3'

  const [activePlatform, setActivePlatform] = useState<DisplayPlatform>(defaultPlatform)
  const [copied, setCopied] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const displayText = prompt.platformVariants[activePlatform]

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayText)
    setCopied(true)
    toast.success(t('promptCard.copied'))
    setTimeout(() => setCopied(false), 1500)
  }

  const handleRegenerate = async () => {
    if (!onRegenerate) return
    setIsRegenerating(true)
    try {
      await onRegenerate(prompt.variantIndex)
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleFavorite = async () => {
    try {
      await onToggleFavorite?.(prompt.id)
      toast.success(
        !prompt.isFavorite ? t('promptCard.favorited') : t('promptCard.unfavorited'),
      )
    } catch {
      // driven by props, no local state to revert
    }
  }

  const showPlatformTabs =
    prompt.generatorInput.targetPlatform === 'both'

  const platforms: { id: DisplayPlatform; label: string }[] = [
    { id: 'dalle3', label: t('promptCard.platform.dalle3') },
    { id: 'nano_banana', label: t('promptCard.platform.nano_banana') },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
      className="relative flex flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface"
    >
      {isRegenerating && (
        <div className="absolute inset-0 z-10 flex flex-col gap-3 rounded-xl bg-surface/80 p-4 backdrop-blur-sm">
          <div className="h-4 w-3/4 animate-pulse rounded bg-border" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-border" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-border" />
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-caption-ui font-medium text-muted-foreground">
            {t('promptCard.variantLabel', {
              index: prompt.variantIndex,
              total: totalInBatch,
            })}
          </span>
          {prompt.generatorInput.targetPlatform && prompt.generatorInput.targetPlatform !== 'both' && (
            <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {t('promptCard.optimizedFor', {
                platform: prompt.generatorInput.targetPlatform === 'dalle3'
                  ? t('promptCard.platform.dalle3')
                  : t('promptCard.platform.nano_banana')
              })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {prompt.legacy ? (
            <span className="rounded-full border border-border-subtle bg-surface-hover px-2 py-0.5 text-caption-ui text-muted-foreground">
              {t('promptCard.legacyBadge')}
            </span>
          ) : (
            <AdobeScoreDisplay score={prompt.adobeScore}>
              <button className="cursor-pointer">
                <AdobeScoreBadge score={prompt.adobeScore.total} />
              </button>
            </AdobeScoreDisplay>
          )}
        </div>
      </div>

      {showPlatformTabs && (
        <div className="flex border-b border-border/60 px-4">
          {platforms.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePlatform(p.id)}
              className={cn(
                'relative cursor-pointer py-2 pr-4 text-caption-ui font-medium transition-colors',
                activePlatform === p.id
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-primary',
              )}
            >
              {p.label}
              {activePlatform === p.id && (
                <motion.span
                  layoutId={`tab-underline-${prompt.id}`}
                  className="absolute bottom-0 left-0 right-4 h-0.5 rounded-full bg-primary"
                />
              )}
            </button>
          ))}
        </div>
      )}

      {prompt.isDuplicate && (
        <div className="flex items-start gap-2.5 border-b border-border-subtle bg-brand-warning/10 px-4 py-2 text-caption-ui text-brand-warning">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-warning" />
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{t('promptCard.duplicateWarning')}</span>
            {prompt.duplicateRef && (
              <span className="text-caption-ui text-secondary line-clamp-1 italic">
                "{prompt.duplicateRef}"
              </span>
            )}
          </div>
        </div>
      )}

      <div className="relative px-4 py-3">
        <p className="select-text text-body-ui leading-relaxed text-primary">{displayText}</p>
        <button
          onClick={handleCopy}
          className="absolute right-3 top-3 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-primary"
          aria-label={t('promptCard.copyPrompt')}
        >
          {copied ? (
            <Check className="h-4 w-4 text-brand-success" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>

      <SegmentsPanel
        segments={prompt.segments}
        unavailable={prompt.legacy}
      />

      {prompt.generatorInput.includeNegativePrompts !== false && prompt.negativePrompt && (
        <NegativePromptPanel negativePrompt={prompt.negativePrompt} />
      )}

      {prompt.generatorInput.includeKeywords !== false && prompt.commercialKeywords && prompt.commercialKeywords.length > 0 && (
        <KeywordsPanel keywords={prompt.commercialKeywords} />
      )}

      <div className="flex items-center justify-between gap-2 border-t border-border/60 px-4 py-2.5">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFavorite}
            className={cn(
              'gap-1.5 text-caption-ui',
              prompt.isFavorite ? 'text-rose-400 hover:text-rose-300' : 'text-muted-foreground',
            )}
          >
            <Heart
              className="h-3.5 w-3.5"
              fill={prompt.isFavorite ? 'currentColor' : 'none'}
            />
            {prompt.isFavorite ? t('promptCard.unfavorite') : t('promptCard.favorite')}
          </Button>

          {onSaveAsTemplate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSaveAsTemplate(prompt)}
              className="gap-1.5 text-caption-ui text-muted-foreground"
            >
              <Bookmark className="h-3.5 w-3.5" />
              {t('promptCard.saveAsTemplate')}
            </Button>
          )}
        </div>

        {onRegenerate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="gap-1.5 text-caption-ui text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t('promptCard.regenerateVariant')}
          </Button>
        )}
      </div>
    </motion.div>
  )
}
