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
import type { DownloadFormat, DownloadScope } from '../types'

interface DownloadSectionProps {
  format: DownloadFormat
  scope: DownloadScope
  detectedAspectRatios: string[]
  selectedAspectRatio: string | null
  onFormatChange: (f: DownloadFormat) => void
  onScopeChange: (s: DownloadScope) => void
  onAspectRatioChange: (ar: string | null) => void
  onDownload: () => void
  disabled: boolean
}
interface DownloadSectionProps {
  format: DownloadFormat
  scope: DownloadScope
  onFormatChange: (f: DownloadFormat) => void
  onScopeChange: (s: DownloadScope) => void
  onDownload: () => void
  disabled: boolean
}

export function DownloadSection({
  format,
  scope,
  detectedAspectRatios,
  selectedAspectRatio,
  onFormatChange,
  onScopeChange,
  onAspectRatioChange,
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
        
        <div className="flex flex-col gap-2">
          <label className="text-caption-ui text-muted">{t('formatter.downloadScope')}</label>
          <Select
            value={scope}
            onValueChange={(v) => onScopeChange(v as DownloadScope)}
            disabled={disabled}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('formatter.scopeAll')}</SelectItem>
              <SelectItem value="remaining">{t('formatter.scopeRemaining')}</SelectItem>
              <SelectItem value="completed">{t('formatter.scopeCompleted')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {detectedAspectRatios.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="text-caption-ui text-muted">{t('formatter.aspectRatio')}</label>
            <Select
              value={selectedAspectRatio ?? 'none'}
              onValueChange={(v) => onAspectRatioChange(v === 'none' ? null : v)}
              disabled={disabled}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('formatter.aspectRatioNone')}</SelectItem>
                {detectedAspectRatios.map((ratio) => (
                  <SelectItem key={ratio} value={ratio}>
                    {ratio}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
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
