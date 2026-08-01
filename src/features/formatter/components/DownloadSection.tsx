import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import type { DownloadFormat } from '../types'

interface DownloadSectionProps {
  format: DownloadFormat
  onFormatChange: (f: DownloadFormat) => void
  onDownload: () => void
  disabled: boolean
}

export function DownloadSection({
  format,
  onFormatChange,
  onDownload,
  disabled,
}: DownloadSectionProps) {
  const { t } = useTranslation()

  return (
    <div className="card-spotlight rounded-xl border border-border-subtle bg-surface p-5 animate-stagger-3">
      <h3 className="mb-4 text-label-ui font-medium text-primary">
        {t('formatter.downloadTitle')}
      </h3>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-caption-ui text-muted">{t('formatter.downloadFormat')}</label>
          <Select
            value={format}
            onValueChange={(v) => onFormatChange(v as DownloadFormat)}
            disabled={disabled}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="txt">TXT</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="default"
          onClick={onDownload}
          disabled={disabled}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          {t('formatter.download')}
        </Button>
      </div>
    </div>
  )
}
