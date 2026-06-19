import { useTranslation } from 'react-i18next'
import { Download, FileJson } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePromptGeneratorStore } from '../store/promptGeneratorStore'

interface BatchActionBarProps {
  onExportCSV?: () => void
  onExportJSON?: () => void
}

export function BatchActionBar({
  onExportCSV,
  onExportJSON,
}: BatchActionBarProps) {
  const { t } = useTranslation()
  const batch = usePromptGeneratorStore((s) => s.batch)

  if (!batch || batch.prompts.length === 0) return null

  const { niche } = batch.generatorInput
  const count = batch.prompts.length

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-border bg-card/70 px-4 py-3 shadow-sm">
      <div className="flex flex-col">
        <p className="text-sm font-medium text-foreground">
          {t('batchActionBar.title', { count })}
        </p>
        <p className="text-xs text-muted-foreground">
          {t('batchActionBar.nicheLabel')}: <span className="font-semibold">{niche}</span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        {onExportCSV && (
          <Button variant="outline" size="sm" onClick={onExportCSV} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('batchActionBar.exportCSV')}</span>
            <span className="sm:hidden">{t('batchActionBar.export')} CSV</span>
          </Button>
        )}
        {onExportJSON && (
          <Button variant="outline" size="sm" onClick={onExportJSON} className="gap-1.5">
            <FileJson className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('batchActionBar.exportJSON')}</span>
            <span className="sm:hidden">{t('batchActionBar.export')} JSON</span>
          </Button>
        )}
      </div>
    </div>
  )
}
