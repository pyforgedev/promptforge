import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useLiveQuery } from 'dexie-react-hooks'
import db from '@/services/storage/indexeddb'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import type { PromptHistoryRecord } from '@/services/storage/indexeddb'

export const RecentPrompts = memo(function RecentPrompts() {
  const { t } = useTranslation()
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
      <div className="w-full max-w-4xl px-4 flex flex-col gap-4">
        <h3 className="text-heading">{t('history.recentPrompts')}</h3>
        <p className="text-body-ui text-secondary">{t('history.noRecentPrompts')}</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl px-4 flex flex-col gap-4">
      <h3 className="text-heading">{t('history.recentPrompts')}</h3>
      <div className="grid gap-4 sm:grid-cols-1">
        {recentItems.map(item => (
          <Card key={item.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-caption-ui text-muted">
                <span className="px-2 py-1 bg-surface-hover rounded-full">
                  {item.variationAnchors.primaryVariation}
                </span>
                <span className="px-2 py-1 bg-surface-hover rounded-full">
                  {item.variationAnchors.compositionStyle}
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-body-ui line-clamp-3 leading-relaxed">
                {item.fullPrompt}
              </p>
              <div className="flex justify-end mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-48"
                  onClick={() => handleCopy(item)}
                >
                  {copiedId === item.id ? (
                    <Check className="mr-1.5 h-3.5 w-3.5 text-brand-success" />
                  ) : (
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {copiedId === item.id ? t('promptCard.copied') : t('generator.copy')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
})
