import { useTranslation } from 'react-i18next'
import { ActivePromptDisplay } from './ActivePromptDisplay'
import { QueueControls } from './QueueControls'
import { OverviewList } from './OverviewList'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { RotateCcw, List, Trash2 } from 'lucide-react'
import type { FormatterItem } from '../types'

interface QueueViewProps {
  items: FormatterItem[]
  currentIndex: number
  copySuccess: boolean
  onCopy: () => void
  onPrev: () => void
  onJump: (index: number) => void
  onResetPrompt: () => void
  onClearQueue: () => void
}

export function QueueView({
  items,
  currentIndex,
  copySuccess,
  onCopy,
  onPrev,
  onJump,
  onResetPrompt,
  onClearQueue,
}: QueueViewProps) {
  const { t } = useTranslation()
  const totalItems = items.length
  const copiedCount = items.filter((i) => i.status === 'copied').length
  const progressPercent = totalItems > 0 ? (copiedCount / totalItems) * 100 : 0
  const currentItem = items[currentIndex]

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

        {currentItem ? (
          <ActivePromptDisplay item={currentItem} />
        ) : (
          <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-border-subtle bg-surface">
            <div className="flex flex-col items-center gap-2 text-muted">
              <List className="h-5 w-5" />
              <span className="text-body-ui">No items to display</span>
            </div>
          </div>
        )}

        <QueueControls
          currentIndex={currentIndex}
          totalItems={totalItems}
          copySuccess={copySuccess}
          onCopy={onCopy}
          onPrev={onPrev}
        />
      </div>

      <div className="card-spotlight flex h-[520px] flex-col rounded-xl border border-border-subtle bg-surface">
        <div className="flex shrink-0 items-center gap-2 border-b border-border-subtle px-4 py-2.5">
          <List className="h-4 w-4 text-muted" />
          <span className="text-caption-ui font-medium text-muted">
            Overview ({totalItems})
          </span>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <OverviewList items={items} currentIndex={currentIndex} onJump={onJump} />
        </ScrollArea>
      </div>
    </div>
  )
}
