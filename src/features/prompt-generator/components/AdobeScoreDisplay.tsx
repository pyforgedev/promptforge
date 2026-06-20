import { useTranslation } from 'react-i18next'
import { AlertTriangle, Lightbulb } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { AdobeStockScore } from '../types'

interface ScoreBadgeProps {
  score: number
  onClick?: () => void
  className?: string
}

export function AdobeScoreBadge({ score, className }: ScoreBadgeProps) {
  const color =
    score >= 80
      ? 'bg-brand-success/10 text-brand-success border-brand-success/20'
      : score >= 60
        ? 'bg-brand-warning/10 text-brand-warning border-brand-warning/20'
        : 'bg-brand-danger/10 text-brand-danger border-brand-danger/20'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-caption-ui font-semibold tabular-nums',
        color,
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {score}
    </span>
  )
}

interface BreakdownBarProps {
  label: string
  value: number
  max?: number
}

function BreakdownBar({ label, value, max = 25 }: BreakdownBarProps) {
  const pct = Math.round((value / max) * 100)
  const barColor =
    pct >= 80
      ? 'bg-brand-success'
      : pct >= 60
        ? 'bg-brand-warning'
        : 'bg-brand-danger'

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-caption-ui">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums text-primary">
          {value}
          <span className="text-muted-foreground">/{max}</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-hover">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

interface AdobeScoreDisplayProps {
  score: AdobeStockScore
  children: React.ReactNode
}

export function AdobeScoreDisplay({ score, children }: AdobeScoreDisplayProps) {
  const { t } = useTranslation()

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-metric-score tabular-nums">{score.total}</span>
            <div className="flex flex-col gap-0.5">
              <span className="text-label-ui font-semibold leading-none">
                {t('promptCard.score.title')}
              </span>
              <span className="text-caption-ui font-normal text-muted-foreground">
                {t('promptCard.score.subtitle')}
              </span>
            </div>
            <AdobeScoreBadge score={score.total} className="ml-auto" />
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-1">
          <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-hover/50 p-3">
            <BreakdownBar
              label={t('promptCard.score.breakdown.commercialViability')}
              value={score.breakdown.commercialViability}
            />
            <BreakdownBar
              label={t('promptCard.score.breakdown.technicalQuality')}
              value={score.breakdown.technicalQuality}
            />
            <BreakdownBar
              label={t('promptCard.score.breakdown.compositionStrength')}
              value={score.breakdown.compositionStrength}
            />
            <BreakdownBar
              label={t('promptCard.score.breakdown.marketDiversity')}
              value={score.breakdown.marketDiversity}
            />
          </div>

          {score.warnings.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-1.5 text-caption-ui font-semibold uppercase tracking-wide text-brand-danger">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t('promptCard.score.warnings')}
              </p>
              <ul className="flex flex-col gap-1.5">
                {score.warnings.map((w, i) => (
                  <li
                    key={i}
                    className="rounded-md bg-brand-danger/10 px-3 py-1.5 text-caption-ui text-brand-danger"
                  >
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {score.suggestions.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-1.5 text-caption-ui font-semibold uppercase tracking-wide text-brand-primary">
                <Lightbulb className="h-3.5 w-3.5" />
                {t('promptCard.score.suggestions')}
              </p>
              <ul className="flex flex-col gap-1.5">
                {score.suggestions.map((s, i) => (
                  <li
                    key={i}
                    className="rounded-md bg-brand-primary/10 px-3 py-1.5 text-caption-ui text-brand-primary"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
