import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useLiveQuery } from 'dexie-react-hooks'
import db from '@/services/storage/indexeddb'
import { EnhancedCopyButton } from '@/features/generator/components/EnhancedCopyButton'

export const RecentPrompts = memo(function RecentPrompts() {
  const { t } = useTranslation()
  const recentItems = useLiveQuery(
    () => db.history.orderBy('createdAt').reverse().limit(3).toArray(),
    []
  )

  if (!recentItems || recentItems.length === 0) {
    return (
      <div className="w-full max-w-4xl px-4 flex flex-col gap-4">
        <h3 className="text-xl font-semibold">{t('history.recentPrompts')}</h3>
        <p className="text-muted-foreground text-sm">{t('history.noRecentPrompts')}</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl px-4 flex flex-col gap-4">
      <h3 className="text-xl font-semibold">{t('history.recentPrompts')}</h3>
      <div className="grid gap-4 sm:grid-cols-1">
        {recentItems.map(item => (
          <Card key={item.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-1 bg-secondary rounded-full font-medium">
                  {item.aspectRatio}
                </span>
                <span className="px-2 py-1 bg-secondary rounded-full font-medium">
                  {item.niche}
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm line-clamp-3 leading-relaxed">
                {item.content}
              </p>
              <div className="flex justify-end mt-2">
                <EnhancedCopyButton
                  content={item.content}
                  aspectRatio={item.aspectRatio}
                  className="w-48"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
})
