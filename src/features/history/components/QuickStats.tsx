import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLiveQuery } from 'dexie-react-hooks'
import db from '@/services/storage/indexeddb'
import { Image, Star } from 'lucide-react'
import { MetricTileSkeleton } from '@/components/ui/skeleton'
import CountUp from '@/components/animations/CountUp'

export const QuickStats = memo(function QuickStats() {
  const { t } = useTranslation()
  const items = useLiveQuery(() => db.prompt_history.toArray(), [])
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!items) {
    return (
      <div className="mx-auto grid w-full max-w-4xl gap-4 px-4 sm:grid-cols-2" role="status" aria-live="polite">
        <MetricTileSkeleton />
        <MetricTileSkeleton />
      </div>
    )
  }

  const totalPrompts = items?.length ?? 0

  const averageScore = items && items.length > 0
    ? Math.round((items.reduce((acc, item) => acc + (item.adobeScore?.total ?? 0), 0) / items.length) * 10) / 10
    : 0

  const stats = [
    {
      label: t('history.totalPrompts'),
      value: prefersReducedMotion ? totalPrompts : <CountUp to={totalPrompts} duration={1.6} className="text-metric-score tabular text-brand-primary" />,
      icon: Image,
      accent: 'text-brand-primary',
      glow: 'bg-brand-primary/6',
    },
    {
      label: t('history.averageScore'),
      value: prefersReducedMotion ? averageScore : <CountUp to={averageScore} duration={1.6} className={`text-metric-score tabular ${averageScore >= 80 ? 'text-brand-success' : averageScore >= 60 ? 'text-brand-warning' : 'text-brand-primary'}`} />,
      icon: Star,
      accent: averageScore >= 80 ? 'text-brand-success' : averageScore >= 60 ? 'text-brand-warning' : 'text-brand-primary',
      glow: averageScore >= 80 ? 'bg-brand-success/6' : averageScore >= 60 ? 'bg-brand-warning/6' : 'bg-brand-primary/6',
    },
  ]

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-4 px-4 sm:grid-cols-2">
      {stats.map(({ label, value, icon: Icon, accent, glow }) => (
        <div
          key={label}
          className={`relative overflow-hidden rounded-xl border border-border-subtle bg-surface p-5 card-spotlight`}
        >
          <div className={`absolute -top-4 -right-4 h-20 w-20 rounded-full blur-2xl opacity-60 ${glow}`} />
          <div className="relative flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-caption-ui text-muted">{label}</span>
              {value}
            </div>
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${glow} border border-border-subtle`}>
              <Icon className={`h-4 w-4 ${accent}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
})
