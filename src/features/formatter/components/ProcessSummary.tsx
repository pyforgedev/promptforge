import { useTranslation } from 'react-i18next'
import { Check, Minus, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProcessSummaryProps {
  cleanCount: number
  skippedBlanks: number
  duplicateCount: number
}

export function ProcessSummary({ cleanCount, skippedBlanks, duplicateCount }: ProcessSummaryProps) {
  const { t } = useTranslation()

  const stats = [
    {
      icon: Check,
      value: cleanCount,
      label: t('formatter.summaryClean'),
      color: 'text-brand-success',
      bg: 'bg-brand-success/10',
    },
    {
      icon: Minus,
      value: skippedBlanks,
      label: t('formatter.summarySkipped'),
      color: 'text-muted',
      bg: 'bg-surface-hover',
    },
    {
      icon: AlertTriangle,
      value: duplicateCount,
      label: t('formatter.summaryDuplicates'),
      color: duplicateCount > 0 ? 'text-brand-warning' : 'text-muted',
      bg: duplicateCount > 0 ? 'bg-brand-warning/10' : 'bg-surface-hover',
    },
  ]

  return (
    <div className="card-spotlight rounded-xl border border-border-subtle bg-surface p-5 animate-stagger-2">
      <h3 className="mb-4 text-label-ui font-medium text-primary">
        {t('formatter.summaryTitle')}
      </h3>
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-2 rounded-lg bg-surface-hover/50 p-3">
            <div className={stat.bg}>
              <stat.icon className={cn('h-4 w-4', stat.color)} />
            </div>
            <span className="text-heading tabular">{stat.value}</span>
            <span className="text-caption-ui text-muted">{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
