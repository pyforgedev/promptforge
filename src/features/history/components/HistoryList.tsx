import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/app/routePaths'
import { AlertCircle, Copy, Trash2, Star, Clock, FilePlus2 } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/common/EmptyState'
import { HistoryCardSkeleton } from '@/components/ui/skeleton'
import { useHistoryStore } from '@/store/useHistoryStore'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import type { PromptHistoryRecord } from '@/services/storage/indexeddb'
import { tokenizeQuery } from '@/services/storage/historySearch'
import { getHistoryTemplateSource } from '@/services/storage/indexeddb'
import { historyPromptToTemplateInput } from '@/features/templates/utils/templateMappers'
import { SaveTemplateDialog } from '@/features/templates/components/SaveTemplateDialog'
import type { CreateTemplateInput } from '@/features/templates/types'

interface HistoryListProps {
  items: PromptHistoryRecord[]
  loading: boolean
  error: string | null
  onCopy: (content: string) => void
  onDelete: (id: string) => void
}

const historyListPropsSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    fullPrompt: z.string(),
    niche: z.string(),
    category: z.string(),
    createdAt: z.union([z.date(), z.string()]),
  }).passthrough()),
  loading: z.boolean(),
  error: z.string().nullable(),
})

function validateHistoryListProps(props: HistoryListProps): void {
  if (!import.meta.env.DEV) return
  const result = historyListPropsSchema.safeParse(props)
  if (!result.success) {
    console.warn('[HistoryList] Prop validation failed:', result.error.issues)
  }
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date instanceof Date ? date : new Date(date))
}

function buildHighlightPattern(search: string): RegExp | null {
  const tokens = tokenizeQuery(search)
  if (tokens.length === 0) return null
  const escaped = tokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return new RegExp(`(${escaped.join('|')})`, 'iu')
}

function HighlightedPrompt({ content, pattern }: { content: string; pattern: RegExp | null }) {
  if (!pattern || !pattern.test(content)) return <>{content}</>
  return (
    <>
      {content.split(pattern).map((part, index) => index % 2 === 1
        ? <mark key={`${index}-${part}`} className="rounded-sm bg-brand-primary/20 text-primary">{part}</mark>
        : <span key={`${index}-${part}`}>{part}</span>)}
    </>
  )
}

export const HistoryList = memo(function HistoryList({
  items,
  loading,
  error,
  onCopy,
  onDelete,
}: HistoryListProps) {
  validateHistoryListProps({ items, loading, error, onCopy, onDelete })
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [templateInput, setTemplateInput] = useState<CreateTemplateInput | null>(null)
  const [templateLoadingId, setTemplateLoadingId] = useState<string | null>(null)
  const {
    selectedIds,
    toggleSelect,
    currentFolderId,
    searchAllFolders,
    filters,
    resetFilters,
    hasMore,
    loadMore,
    hasLoaded,
  } = useHistoryStore()
  const isFolderScoped = currentFolderId !== null && !searchAllFolders
  const highlightPattern = buildHighlightPattern(filters.search)
  const hasActiveFilters = filters.search.trim() !== ''
    || filters.aspectRatio !== 'all'
    || filters.artStyleKey !== 'all'
    || filters.minScore > 0
    || filters.dateFrom !== ''
    || filters.dateTo !== ''
    || filters.sort !== 'date-desc'

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

  const handleSaveAsTemplate = async (id: string) => {
    setTemplateLoadingId(id)
    try {
      const source = await getHistoryTemplateSource(id)
      if (!source) throw new Error('NOT_FOUND')
      setTemplateInput(historyPromptToTemplateInput(source))
    } catch {
      showToast('error', t('templates.errors.historySourceFailed'))
    } finally {
      setTemplateLoadingId(null)
    }
  }

  if (loading && items.length === 0 && !hasLoaded) {
    return (
      <div className="flex flex-col gap-3" role="status" aria-live="polite">
        {Array.from({ length: 5 }).map((_, i) => (
          <HistoryCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="overlay-glass flex items-start gap-2 rounded-r-lg border-l-[3px] border-l-brand-danger p-4 text-body-ui">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-danger" />
        <span className="text-secondary">{error}</span>
      </div>
    )
  }

  if (items.length === 0) {
    const filtered = hasActiveFilters || searchAllFolders
    return (
      <EmptyState
        title={filtered ? t('history.filteredEmptyTitle') : t('history.emptyTitle')}
        description={filtered
          ? t('history.filteredEmptyDescription')
          : isFolderScoped ? t('history.emptyFolderDescription') : t('history.emptyDescription')}
        action={
          filtered ? (
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={resetFilters}>{t('history.resetFilters')}</Button>
              {hasMore && <Button onClick={loadMore} disabled={loading}>{t('history.loadMore')}</Button>}
            </div>
          ) : (
            <Button asChild variant="default" className="mt-2">
              <Link to={ROUTES.home}>{t('history.goToGenerator')}</Link>
            </Button>
          )
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
              "group relative cursor-pointer transition-all duration-200 hover:border-border-strong hover:bg-surface-hover card-spotlight",
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
                <HighlightedPrompt content={item.fullPrompt} pattern={highlightPattern} />
              </p>
              {highlightPattern && !highlightPattern.test(item.fullPrompt) && (
                <span className="mt-2 inline-flex rounded-full border border-border-subtle px-2 py-0.5 text-caption-ui text-muted">
                  {t('history.matchOutsidePreview')}
                </span>
              )}
              {item.aspectRatioKey != null || (item.artStyleKey != null && item.artStyleKey !== 'none') ? (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {item.aspectRatioKey != null && (
                    <span className="rounded-md border border-border-subtle bg-surface-hover px-2 py-0.5 font-mono text-caption-ui text-muted">
                      {item.aspectRatioKey === 'random' ? t('history.aspectRatioRandom') : item.aspectRatioKey}
                    </span>
                  )}
                  {item.artStyleKey != null && item.artStyleKey !== 'none' && (
                    <span className="rounded-md border border-border-subtle bg-surface-hover px-2 py-0.5 text-caption-ui text-muted">
                      {t(`history.artStyles.${item.artStyleKey}`)}
                    </span>
                  )}
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 cursor-pointer text-caption-ui sm:h-8"
                  onClick={() => handleSaveAsTemplate(item.id)}
                  disabled={templateLoadingId === item.id}
                >
                  <FilePlus2 className="mr-1 h-3 w-3 sm:mr-1.5 sm:h-3.5 sm:w-3.5" />
                  {t('history.saveAsTemplate')}
                </Button>
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
                  className="h-7 cursor-pointer text-caption-ui text-muted hover:border-brand-danger/30 hover:bg-brand-danger/10 hover:text-brand-danger sm:h-8"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="mr-1 h-3 w-3 sm:mr-1.5 sm:h-3.5 sm:w-3.5" />
                  {t('common.delete')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
      {hasMore ? (
        <div className="mt-4 flex w-full flex-col gap-3">
          {loading ? (
            // Append skeleton (§6.17) — existing items stay visible below the new cards.
            <>
              <HistoryCardSkeleton />
              <HistoryCardSkeleton />
            </>
          ) : (
            <div className="flex justify-center w-full">
              <Button
                variant="outline"
                onClick={loadMore}
                className="w-full hover:bg-surface-hover"
              >
                {t('history.loadMore')}
              </Button>
            </div>
          )}
        </div>
      ) : hasLoaded && !loading ? (
        <p className="mt-4 w-full text-center text-caption-ui text-muted">
          {t('history.endOfList')}
        </p>
      ) : null}
      <SaveTemplateDialog
        input={templateInput}
        open={!!templateInput}
        onOpenChange={(open) => { if (!open) setTemplateInput(null) }}
        titleKey="templates.save.dialogTitle"
        successKey="templates.toast.savedFromHistory"
      />
    </div>
  )
})
