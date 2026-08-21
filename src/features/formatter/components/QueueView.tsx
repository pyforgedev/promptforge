import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { ActivePromptDisplay } from './ActivePromptDisplay'
import { QueueControls } from './QueueControls'
import { QueueFilters } from './QueueFilters'
import { AnimatedList } from '@/components/ui/AnimatedList'
import { Button } from '@/components/ui/button'
import { Check, List, Play, RotateCcw, Trash2 } from 'lucide-react'
import type { DownloadScope, FormatterItem, PromptType, QueueSort } from '../types'

interface QueueViewProps {
  items: FormatterItem[]
  totalItems: number
  copiedCount: number
  currentIndex: number
  copySuccess: boolean
  onCopy: () => void
  onPrev: () => void
  onNext: () => void
  onJump: (index: number) => void
  onResetPrompt: () => void
  onClearQueue: () => void
  scope: DownloadScope
  onScopeChange: (s: DownloadScope) => void
  detectedAspectRatios: string[]
  selectedAspectRatio: string | null
  onAspectRatioChange: (ar: string | null) => void
  hasVideoItems: boolean
  queueType: 'all' | PromptType
  onTypeChange: (t: 'all' | PromptType) => void
  queueSort: QueueSort
  onSortChange: (s: QueueSort) => void
}

export function QueueView({
  items,
  totalItems,
  copiedCount,
  currentIndex,
  copySuccess,
  onCopy,
  onPrev,
  onNext,
  onJump,
  onResetPrompt,
  onClearQueue,
  scope,
  onScopeChange,
  detectedAspectRatios,
  selectedAspectRatio,
  onAspectRatioChange,
  hasVideoItems,
  queueType,
  onTypeChange,
  queueSort,
  onSortChange,
}: QueueViewProps) {
  const { t } = useTranslation()
  const progressPercent = totalItems > 0 ? (copiedCount / totalItems) * 100 : 0
  const currentItem = items[currentIndex]
  const promptTexts = useMemo(() => items.map((item) => item.promptText), [items])
  const overviewLabel = t('formatter.overviewCount', {
    filtered: items.length,
    total: totalItems,
  })

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[60%_1fr] animate-stagger-2">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-heading text-primary">{t('formatter.queueTitle')}</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClearQueue} className="gap-1.5 text-muted hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
              {t('formatter.clear')}
            </Button>
            <Button variant="ghost" size="sm" onClick={onResetPrompt} className="gap-1.5 text-muted hover:text-primary">
              <RotateCcw className="h-3.5 w-3.5" />
              {t('formatter.resetProgress')}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-caption-ui text-muted">
            <span>{t('formatter.progress', { copied: copiedCount, total: totalItems })}</span>
            <span className="tabular">{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-primary to-brand-primary-hover transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <QueueFilters
          scope={scope}
          onScopeChange={onScopeChange}
          detectedAspectRatios={detectedAspectRatios}
          selectedAspectRatio={selectedAspectRatio}
          onAspectRatioChange={onAspectRatioChange}
          hasVideoItems={hasVideoItems}
          queueType={queueType}
          onTypeChange={onTypeChange}
          queueSort={queueSort}
          onSortChange={onSortChange}
        />

        {currentItem ? (
          <ActivePromptDisplay
            key={currentItem.id ?? `${currentItem.order}:${currentItem.promptText}`}
            item={currentItem}
          />
        ) : (
          <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-border-subtle bg-surface">
            <div className="flex flex-col items-center gap-2 text-muted">
              <List className="h-5 w-5" />
              <span className="text-body-ui">{t('formatter.noItemsToDisplay')}</span>
            </div>
          </div>
        )}

        <QueueControls
          currentIndex={currentIndex}
          totalItems={items.length}
          copySuccess={copySuccess}
          onCopy={onCopy}
          onPrev={onPrev}
          onNext={onNext}
        />
      </div>

      <div className="card-spotlight flex h-[520px] flex-col rounded-xl border border-border-subtle bg-surface">
        <div className="flex shrink-0 items-center gap-2 border-b border-border-subtle px-4 py-2.5">
          <List className="h-4 w-4 text-muted" />
          <span className="text-caption-ui font-medium text-muted">{overviewLabel}</span>
        </div>
        <AnimatedList
          items={promptTexts}
          selectedIndex={currentIndex}
          onItemSelect={(_item, index) => onJump(index)}
          onNavigate={onJump}
          ariaLabel={overviewLabel}
          className="flex-1 min-h-0"
          scrollClassName="h-full max-h-none px-2 py-2"
          itemClassName=""
          renderItem={(text, { index, selected }) => {
            const item = items[index]
            const isCopied = item?.status === 'copied'
            return (
              <div
                className={cn(
                  'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150',
                  selected && 'bg-brand-primary/10 ring-1 ring-brand-primary/30',
                  !selected && isCopied && 'opacity-60 hover:opacity-90',
                  !selected && !isCopied && 'hover:bg-surface-hover',
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-caption-ui font-medium transition-all',
                    selected
                      ? 'bg-brand-primary text-text-on-brand'
                      : 'bg-surface-hover text-muted',
                  )}
                >
                  {selected ? <Play className="h-3 w-3 fill-current" /> : item.order + 1}
                </span>
                <span
                  className={cn(
                    'flex-1 truncate font-mono text-[13px] leading-relaxed',
                    isCopied ? 'text-muted line-through decoration-muted/30' : 'text-primary',
                  )}
                >
                  {text}
                </span>
                {isCopied ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-success/15">
                    <Check className="h-3 w-3 text-brand-success" />
                  </span>
                ) : selected ? (
                  <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-brand-primary" />
                ) : (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-border-subtle" />
                )}
              </div>
            )
          }}
        />
      </div>
    </div>
  )
}
