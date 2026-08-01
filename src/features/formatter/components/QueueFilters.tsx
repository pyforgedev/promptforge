import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DownloadScope, PromptType, QueueSort } from '../types'

interface QueueFiltersProps {
  scope: DownloadScope
  onScopeChange: (s: DownloadScope) => void
  detectedAspectRatios: string[]
  selectedAspectRatio: string | null
  onAspectRatioChange: (ar: string | null) => void
  hasVideoItems: boolean
  queueType: 'all' | PromptType
  onTypeChange: (t: 'all' | PromptType) => void
  queueSort: QueueSort
  onSortChange: (s: QueueSort) => void
}

export function QueueFilters({
  scope,
  onScopeChange,
  detectedAspectRatios,
  selectedAspectRatio,
  onAspectRatioChange,
  hasVideoItems,
  queueType,
  onTypeChange,
  queueSort,
  onSortChange,
}: QueueFiltersProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="queue-scope" className="text-caption-ui text-muted">{t('formatter.downloadScope')}</label>
        <Select
          value={scope}
          onValueChange={(v) => onScopeChange(v as DownloadScope)}
        >
          <SelectTrigger id="queue-scope" className="w-[140px]" aria-label={t('formatter.downloadScope')}>
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
        <div className="flex flex-col gap-1.5">
          <label htmlFor="queue-aspect-ratio" className="text-caption-ui text-muted">{t('formatter.aspectRatio')}</label>
          <Select
            value={selectedAspectRatio ?? 'none'}
            onValueChange={(v) => onAspectRatioChange(v === 'none' ? null : v)}
          >
            <SelectTrigger id="queue-aspect-ratio" className="w-[140px]" aria-label={t('formatter.aspectRatio')}>
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

      {hasVideoItems && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="queue-type" className="text-caption-ui text-muted">{t('formatter.promptType')}</label>
          <Select
            value={queueType}
            onValueChange={(v) => onTypeChange(v as 'all' | PromptType)}
          >
            <SelectTrigger id="queue-type" className="w-[140px]" aria-label={t('formatter.promptType')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('formatter.typeNone')}</SelectItem>
              <SelectItem value="image">{t('formatter.typeImage')}</SelectItem>
              <SelectItem value="video">{t('formatter.typeVideo')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="queue-sort" className="text-caption-ui text-muted">{t('formatter.sortBy')}</label>
        <Select
          value={queueSort}
          onValueChange={(v) => onSortChange(v as QueueSort)}
        >
          <SelectTrigger id="queue-sort" className="w-[150px]" aria-label={t('formatter.sortBy')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="order">{t('formatter.sortOrder')}</SelectItem>
            <SelectItem value="aspectRatio">{t('formatter.sortAspectRatio')}</SelectItem>
            <SelectItem value="status">{t('formatter.sortStatus')}</SelectItem>
            <SelectItem value="length">{t('formatter.sortLength')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
