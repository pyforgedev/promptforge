import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Trash2, Star, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import type { HistoryItem } from '../types'

interface HistoryListProps {
  items: HistoryItem[]
  loading: boolean
  error: string | null
  onCopy: (content: string) => void
  onDelete: (id: string) => void
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp)
}

export const HistoryList = memo(function HistoryList({
  items,
  loading,
  error,
  onCopy,
  onDelete,
}: HistoryListProps) {
  const { t } = useTranslation()

  if (loading) return <LoadingSpinner />

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
        description={t('history.emptyDescription')}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <Card key={item.id} className="transition-all duration-200 hover:border-primary/30">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="text-sm font-bold text-primary">
                  {item.qualityScore?.overall.toFixed(1) ?? 'N/A'}
                </span>
                <CardTitle className="text-sm text-muted-foreground font-normal">
                  {item.aspectRatio} | {item.niche}
                </CardTitle>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDate(item.savedAt)}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground leading-relaxed line-clamp-3">
              {item.content}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCopy(item.content)}
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                {t('generator.copy')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(item.id)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5 text-destructive" />
                {t('common.delete')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
})
