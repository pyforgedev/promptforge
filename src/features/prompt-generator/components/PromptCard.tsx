import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Check, Heart, RotateCcw, ChevronDown, Tag, Bookmark } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
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
        className="flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
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
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2.5 px-4 pb-3">
              <div className="flex flex-wrap gap-1.5">
                {keywords.map((kw, i) => (
                  <button
                    key={kw}
                    onClick={() => copyOne(kw, i)}
                    className={cn(
                      'cursor-pointer rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                      copiedIdx === i
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                        : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground',
                    )}
                  >
                    {kw}
                  </button>
                ))}
              </div>
              <button
                onClick={copyAll}
                className="cursor-pointer self-start text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
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
    prompt.generatorInput.targetPlatform === 'both' ||
    prompt.generatorInput.targetPlatform === 'dalle3' ||
    prompt.generatorInput.targetPlatform === 'nano_banana'

  const platforms: { id: DisplayPlatform; label: string }[] = [
    { id: 'dalle3', label: t('promptCard.platform.dalle3') },
    { id: 'nano_banana', label: t('promptCard.platform.nano_banana') },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="relative flex flex-col overflow-hidden rounded-xl border border-border bg-card"
    >
      {isRegenerating && (
        <div className="absolute inset-0 z-10 flex flex-col gap-3 rounded-xl bg-card/80 p-4 backdrop-blur-sm">
          <div className="h-4 w-3/4 animate-pulse rounded bg-border" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-border" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-border" />
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-2.5">
        <span className="text-xs font-medium text-muted-foreground">
          {t('promptCard.variantLabel', {
            index: prompt.variantIndex,
            total: totalInBatch,
          })}
        </span>

        <div className="flex items-center gap-2">
          {prompt.legacy ? (
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
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
                'relative cursor-pointer py-2 pr-4 text-xs font-medium transition-colors',
                activePlatform === p.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
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

      <div className="relative px-4 py-3">
        <p className="select-text text-sm leading-relaxed text-foreground">{displayText}</p>
        <button
          onClick={handleCopy}
          className="absolute right-3 top-3 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={t('promptCard.copyPrompt')}
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-400" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>

      <SegmentsPanel
        segments={prompt.segments}
        unavailable={prompt.legacy}
      />

      <NegativePromptPanel negativePrompt={prompt.negativePrompt} />

      <KeywordsPanel keywords={prompt.commercialKeywords} />

      <div className="flex items-center justify-between gap-2 border-t border-border/60 px-4 py-2.5">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFavorite}
            className={cn(
              'gap-1.5 text-xs',
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
              className="gap-1.5 text-xs text-muted-foreground"
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
            className="gap-1.5 text-xs text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t('promptCard.regenerateVariant')}
          </Button>
        )}
      </div>
    </motion.div>
  )
}
