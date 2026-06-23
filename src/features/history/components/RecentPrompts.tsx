import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLiveQuery } from 'dexie-react-hooks'
import db from '@/services/storage/indexeddb'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { Copy, Check, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import type { PromptHistoryRecord } from '@/services/storage/indexeddb'

export const RecentPrompts = memo(function RecentPrompts() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const recentItems = useLiveQuery(
    () => db.prompt_history.orderBy('createdAt').reverse().limit(3).toArray(),
    []
  )

  const handleCopy = async (item: PromptHistoryRecord) => {
    await navigator.clipboard.writeText(item.fullPrompt)
    setCopiedId(item.id)
    toast.success(t('promptCard.copied'))
    setTimeout(() => setCopiedId(null), 1500)
  }

  if (!recentItems || recentItems.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4">
        <h3 className="text-heading">{t('history.recentPrompts')}</h3>
        <EmptyState
          title={t('history.noRecentPrompts')}
          description={t('history.emptyDescription')}
          action={
            <Button size="sm" variant="outline" onClick={() => navigate('/generator')}>
              <Wand2 className="h-4 w-4" />
              {t('home.getStarted')}
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4">
      <h3 className="text-heading">{t('history.recentPrompts')}</h3>
      <div className="grid gap-3 sm:grid-cols-1">
        {recentItems.map(item => (
          <div
            key={item.id}
            className="group relative flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface p-4 transition-all duration-200 hover:border-border-strong card-spotlight"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 bg-surface-hover rounded-md text-caption-ui text-muted border border-border-subtle">
                {item.variationAnchors.primaryVariation}
              </span>
              <span className="px-2 py-0.5 bg-surface-hover rounded-md text-caption-ui text-muted border border-border-subtle">
                {item.variationAnchors.compositionStyle}
              </span>
            </div>
            <p className="line-clamp-2 text-body-mono text-primary">
              {item.fullPrompt}
            </p>
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-caption-ui text-muted opacity-100 transition-colors sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 hover:text-primary"
                onClick={() => handleCopy(item)}
              >
                {copiedId === item.id ? (
                  <Check className="h-3.5 w-3.5 text-brand-success" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copiedId === item.id ? t('promptCard.copied') : t('generator.copy')}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})
