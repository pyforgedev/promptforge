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

  // Use skeletons if overall is 0 (initial state during stream) or isLoading
  const showSkeleton = isLoading || !score || score.overall === 0

  if (showSkeleton) {
    return (
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 animate-pulse">
        <div className="mb-3 flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full bg-[var(--border-subtle)]" />
          <Skeleton className="h-4 w-32 bg-[var(--border-subtle)]" />
          <Skeleton className="ml-auto h-6 w-12 bg-[var(--border-subtle)]" />
        </div>
        <div className="flex flex-col gap-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-3 w-36 bg-[var(--border-subtle)]" />
              <Skeleton className="h-2 flex-1 bg-[var(--border-subtle)]" />
              <Skeleton className="h-3 w-8 bg-[var(--border-subtle)]" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Star className="h-4 w-4 fill-[var(--brand-primary)] text-[var(--brand-primary)]" />
        <span className="text-[13px] font-semibold text-[var(--text-primary)]">
          {t('generator.qualityScore')}
        </span>
        <span className="ml-auto font-mono text-2xl font-bold text-[var(--brand-primary)]">
          {score.overall.toFixed(1)}
          <span className="text-xs text-[var(--text-muted)] font-sans"> / 10</span>
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
