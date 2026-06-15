import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Star } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { QualityScore } from '../types'

interface QualityRatingProps {
  score?: QualityScore
  isLoading?: boolean
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const percentage = (value / 10) * 100

  return (
    <div className="flex items-center gap-2">
      <span className="w-36 text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs font-medium text-foreground">
        {value.toFixed(1)}
      </span>
    </div>
  )
}

export const QualityRating = memo(function QualityRating({ score, isLoading }: QualityRatingProps) {
  const { t } = useTranslation()

  if (isLoading || !score) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="ml-auto h-6 w-12" />
        </div>
        <div className="flex flex-col gap-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-2 flex-1" />
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Star className="h-4 w-4 fill-primary text-primary" />
        <span className="text-sm font-semibold text-foreground">
          {t('generator.qualityScore')}
        </span>
        <span className="ml-auto text-lg font-bold text-primary">
          {score.overall.toFixed(1)}
          <span className="text-xs text-muted-foreground"> / 10</span>
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <ScoreBar
          label={t('generator.qualityCommercial')}
          value={score.commercialPotential}
        />
        <ScoreBar
          label={t('generator.qualityCreativity')}
          value={score.creativity}
        />
        <ScoreBar
          label={t('generator.qualityClarity')}
          value={score.clarity}
        />
        <ScoreBar
          label={t('generator.qualityMarketability')}
          value={score.marketability}
        />
        <ScoreBar
          label={t('generator.qualityUniqueness')}
          value={score.uniqueness}
        />
      </div>
    </div>
  )
})
