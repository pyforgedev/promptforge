import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { RotateCcw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ART_STYLE_OPTIONS,
  ASPECT_RATIO_KEYS,
} from '@/services/storage/historySearch'
import { useHistoryStore } from '@/store/useHistoryStore'
import type { ArtStyleOption, AspectRatio } from '@/features/prompt-generator/types'
import type { HistoryFilters as HF, HistorySort } from '../types'

interface HistoryFiltersProps {
  filters: HF
  onFilterChange: <K extends keyof HF>(key: K, value: HF[K]) => void
  onReset: () => void
}

const MIN_SCORE_OPTIONS = [50, 60, 70, 80, 90] as const

export const HistoryFiltersBar = memo(function HistoryFiltersBar({
  filters,
  onFilterChange,
  onReset,
}: HistoryFiltersProps) {
  const { t } = useTranslation()
  const { searchAllFolders, setSearchAllFolders, currentFolderId } = useHistoryStore()
  const invalidDateRange = filters.dateFrom !== ''
    && filters.dateTo !== ''
    && filters.dateFrom > filters.dateTo

  return (
    <div className="card-spotlight flex flex-col gap-4 rounded-lg border border-border-subtle bg-surface p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="history-search" className="text-caption-ui font-medium text-muted">
              {t('common.search')}
            </Label>
            {currentFolderId !== null && (
              <div className="flex items-center gap-1.5">
                <Checkbox
                  id="search-all-folders"
                  checked={searchAllFolders}
                  onCheckedChange={(checked) => setSearchAllFolders(checked === true)}
                  className="data-[state=checked]:border-brand-primary data-[state=checked]:bg-brand-primary"
                />
                <Label htmlFor="search-all-folders" className="cursor-pointer text-caption-ui text-muted">
                  {t('history.searchAllFolders')}
                </Label>
              </div>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              id="history-search"
              value={filters.search}
              onChange={(event) => onFilterChange('search', event.target.value)}
              placeholder={searchAllFolders || currentFolderId === null
                ? t('history.searchEverywherePlaceholder')
                : t('history.searchInFolderPlaceholder')}
              className="pl-8"
            />
          </div>
          {filters.search.trim().length === 1 && (
            <p className="text-caption-ui text-muted">{t('history.searchMinLength')}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-end">
          <div className="flex flex-col gap-1.5">
            <Label className="text-caption-ui text-muted">{t('generator.aspectRatio')}</Label>
            <Select
              value={filters.aspectRatio}
              onValueChange={(value) => onFilterChange('aspectRatio', value as AspectRatio | 'all')}
            >
              <SelectTrigger className="min-w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {ASPECT_RATIO_KEYS.map((ratio) => (
                  <SelectItem key={ratio} value={ratio}>
                    {ratio === 'random' ? t('history.aspectRatioRandom') : ratio}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-caption-ui text-muted">{t('history.artStyle')}</Label>
            <Select
              value={filters.artStyleKey}
              onValueChange={(value) => onFilterChange('artStyleKey', value as ArtStyleOption | 'all')}
            >
              <SelectTrigger className="min-w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {ART_STYLE_OPTIONS.map((style) => (
                  <SelectItem key={style} value={style}>{t(`history.artStyles.${style}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-caption-ui text-muted">{t('history.minScore')}</Label>
            <Select value={String(filters.minScore)} onValueChange={(value) => onFilterChange('minScore', Number(value))}>
              <SelectTrigger className="min-w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">{t('common.all')}</SelectItem>
                {MIN_SCORE_OPTIONS.map((score) => (
                  <SelectItem key={score} value={String(score)}>{score}+</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-caption-ui text-muted">{t('history.sortBy')}</Label>
            <Select value={filters.sort} onValueChange={(value) => onFilterChange('sort', value as HistorySort)}>
              <SelectTrigger className="min-w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">{t('history.sortNewest')}</SelectItem>
                <SelectItem value="date-asc">{t('history.sortOldest')}</SelectItem>
                <SelectItem value="rating-desc">{t('history.sortHighestScore')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2 flex gap-2 sm:col-span-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="history-date-from" className="text-caption-ui text-muted">{t('history.dateFrom')}</Label>
              <Input
                id="history-date-from"
                type="date"
                value={filters.dateFrom}
                max={filters.dateTo || undefined}
                aria-invalid={invalidDateRange}
                aria-describedby={invalidDateRange ? 'history-date-error' : undefined}
                onChange={(event) => onFilterChange('dateFrom', event.target.value)}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="history-date-to" className="text-caption-ui text-muted">{t('history.dateTo')}</Label>
              <Input
                id="history-date-to"
                type="date"
                value={filters.dateTo}
                min={filters.dateFrom || undefined}
                aria-invalid={invalidDateRange}
                aria-describedby={invalidDateRange ? 'history-date-error' : undefined}
                onChange={(event) => onFilterChange('dateTo', event.target.value)}
              />
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={onReset} className="cursor-pointer self-end">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            {t('history.resetFilters')}
          </Button>
        </div>
      </div>
      {invalidDateRange && (
        <p id="history-date-error" role="alert" className="text-caption-ui text-brand-danger">
          {t('history.invalidDateRange')}
        </p>
      )}
    </div>
  )
})
