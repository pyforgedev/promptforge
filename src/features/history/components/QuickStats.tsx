import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLiveQuery } from 'dexie-react-hooks'
import db from '@/services/storage/indexeddb'
import { Image, Star } from 'lucide-react'

export const QuickStats = memo(function QuickStats() {
  const { t } = useTranslation()
  const items = useLiveQuery(() => db.prompt_history.toArray(), [])

  const totalPrompts = items?.length ?? 0
  
  let averageScore = 0
  if (items && items.length > 0) {
    const totalScore = items.reduce((acc, item) => acc + (item.adobeScore?.total ?? 0), 0)
    averageScore = totalScore / items.length
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 w-full max-w-4xl px-4">
      <Card key="total-prompts">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('history.totalPrompts')}
          </CardTitle>
          <Image className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalPrompts}</div>
        </CardContent>
      </Card>
      <Card key="avg-score">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('history.averageScore')}
          </CardTitle>
          <Star className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{averageScore.toFixed(1)}</div>
        </CardContent>
      </Card>
    </div>
  )
})
