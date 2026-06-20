import { memo } from 'react'
import { useTranslation } from 'react-i18next'
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
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title={t('history.emptyTitle')}
        description={searchMode === 'local' ? "No prompts found in this folder. Start generating to fill it up!" : t('history.emptyDescription')}
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
              "group relative transition-all duration-200 hover:border-primary/30 cursor-pointer",
              isSelected && "border-primary bg-primary/5 ring-1 ring-primary/20"
            )}
            onClick={() => toggleSelect(item.id)}
          >
            <div className="absolute left-3 top-4 z-10">
              <Checkbox 
                checked={isSelected}
                onCheckedChange={() => toggleSelect(item.id)}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <CardHeader className="pl-10">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <span className="text-sm font-bold text-primary">
                    {item.adobeScore?.total.toFixed(1) ?? 'N/A'}
                  </span>
                  <CardTitle className="text-sm text-muted-foreground font-normal font-mono">
                    {item.category} | {item.niche}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground font-inter">
                  <Clock className="h-3 w-3" />
                  {formatDate(item.createdAt)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pl-10">
              <p className="text-sm text-foreground leading-relaxed line-clamp-3 font-mono">
                {item.fullPrompt}
              </p>
              <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-inter cursor-pointer hover:bg-white/5"
                  onClick={() => handleCopy(item.fullPrompt)}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  {t('generator.copy')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-inter cursor-pointer hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5 text-destructive" />
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
            className="w-full hover:bg-white/5"
          >
            {loading ? t('common.loading') : t('history.loadMore')}
          </Button>
        </div>
      )}
    </div>
  )
})
