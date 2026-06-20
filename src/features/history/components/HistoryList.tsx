import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Copy, Trash2, Star, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useHistoryStore } from '@/store/useHistoryStore'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import type { PromptHistoryRecord } from '@/services/storage/indexeddb'

interface HistoryListProps {
  items: PromptHistoryRecord[]
  loading: boolean
  error: string | null
  onCopy: (content: string) => void
  onDelete: (id: string) => void
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date instanceof Date ? date : new Date(date))
}

export const HistoryList = memo(function HistoryList({
  items,
  loading,
  error,
  onCopy,
  onDelete,
}: HistoryListProps) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const { selectedIds, toggleSelect, searchMode, hasMore, loadMore } = useHistoryStore()

  const handleCopy = async (content: string) => {
    await onCopy(content)
  }

  const handleDelete = async (id: string) => {
    try {
      await onDelete(id)
      showToast('success', t('toast.itemDeleted'))
    } catch {
      showToast('error', t('toast.error'))
    }
  }

  if (loading && items.length === 0) return <LoadingSpinner />

  if (error) {
    return (
      <div className="overlay-glass border-l-[3px] border-l-brand-danger p-4 text-body-ui rounded-r-lg text-brand-danger">
        {error}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title={t('history.emptyTitle')}
        description={searchMode === 'local' ? "No prompts found in this folder. Start generating to fill it up!" : t('history.emptyDescription')}
        action={
          <Button asChild variant="default" className="mt-2">
            <Link to="/">
              {t('history.goToGenerator', { defaultValue: 'Go to Generator' })}
            </Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const isSelected = selectedIds.includes(item.id)

        return (
          <Card 
            key={item.id} 
            className={cn(
              "group relative transition-all duration-200 hover:border-brand-primary/30 cursor-pointer",
              isSelected && "border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary/20"
            )}
            onClick={() => toggleSelect(item.id)}
          >
            <div className="absolute left-2 sm:left-3 top-4 z-10">
              <Checkbox 
                checked={isSelected}
                onCheckedChange={() => toggleSelect(item.id)}
                className="data-[state=checked]:bg-brand-primary data-[state=checked]:border-brand-primary"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <CardHeader className="pl-9 sm:pl-10">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 fill-brand-primary text-brand-primary" />
                  <span className="text-body-mono font-semibold text-brand-primary tabular-nums shrink-0">
                    {item.adobeScore?.total.toFixed(0) ?? 'N/A'}
                  </span>
                  <CardTitle className="text-body-mono text-muted font-normal truncate min-w-0">
                    {item.category} | {item.niche}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-1 text-caption-ui text-muted shrink-0">
                  <Clock className="h-3 w-3" />
                  {formatDate(item.createdAt)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pl-9 sm:pl-10">
              <p className="text-body-mono text-primary leading-relaxed line-clamp-2 sm:line-clamp-3">
                {item.fullPrompt}
              </p>
              <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 sm:h-8 text-caption-ui cursor-pointer"
                  onClick={() => handleCopy(item.fullPrompt)}
                >
                  <Copy className="mr-1 h-3 w-3 sm:mr-1.5 sm:h-3.5 sm:w-3.5" />
                  {t('generator.copy')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 sm:h-8 text-caption-ui cursor-pointer hover:bg-brand-danger/10 hover:border-brand-danger/30 hover:text-brand-danger"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="mr-1 h-3 w-3 sm:mr-1.5 sm:h-3.5 sm:w-3.5 text-brand-danger" />
                  {t('common.delete')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
      {hasMore && (
        <div className="flex justify-center mt-4 w-full">
          <Button 
            variant="outline" 
            onClick={loadMore} 
            disabled={loading}
            className="w-full hover:bg-surface-hover"
          >
            {loading ? t('common.loading') : t('history.loadMore')}
          </Button>
        </div>
      )}
    </div>
  )
})
