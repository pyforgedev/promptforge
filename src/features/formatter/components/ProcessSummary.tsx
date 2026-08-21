import { useTranslation } from 'react-i18next'
import { CircleCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ProcessSummaryViewModel {
  promptCount: number
  skippedBlankCount: number | null
  duplicatePromptCount: number | null
}

interface ProcessSummaryProps {
  summary: ProcessSummaryViewModel
}

export function ProcessSummary({ summary }: ProcessSummaryProps) {
  const { t } = useTranslation()

  const stats = [
    {
      value: summary.promptCount,
      label: t('formatter.summaryPromptsObtained'),
      warning: false,
    },
    {
      value: summary.skippedBlankCount,
      label: t('formatter.summarySkippedBlanks'),
      warning: false,
    },
    {
      value: summary.duplicatePromptCount,
      label: t('formatter.summaryPotentialDuplicates'),
      warning: summary.duplicatePromptCount !== null && summary.duplicatePromptCount > 0,
    },
  ]

  return (
    <section
      aria-labelledby="formatter-process-summary-title"
      className="rounded-lg border border-border-subtle bg-surface px-3 py-2"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0">
        <div className="flex shrink-0 items-center gap-2 sm:pr-4">
          <CircleCheck aria-hidden="true" className="h-4 w-4 text-brand-success" />
          <h2 id="formatter-process-summary-title" className="text-label-ui font-semibold text-primary">
            {t('formatter.summaryTitle')}
          </h2>
        </div>

        <dl className="grid min-w-0 flex-1 grid-cols-3 divide-x divide-border-subtle border-t border-border-subtle sm:border-l sm:border-t-0">
          {stats.map((stat) => (
            <div key={stat.label} className="min-w-0 px-2 pt-2 sm:px-4 sm:pt-0">
              <dt className="text-caption-ui text-muted">{stat.label}</dt>
              <dd
                className={cn(
                  'mt-1 text-metric-score tabular-nums text-primary',
                  stat.warning && 'text-brand-warning',
                )}
              >
                {stat.value === null ? (
                  <>
                    <span aria-hidden="true">&mdash;</span>
                    <span className="sr-only">{t('formatter.summaryUnavailableLegacy')}</span>
                  </>
                ) : stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
