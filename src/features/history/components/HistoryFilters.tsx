import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, RotateCcw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AspectRatio } from '@/features/generator/types'
import type { HistoryFilters as HF } from '../types'

import { useHistoryStore } from '@/store/useHistoryStore'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface HistoryFiltersProps {
  filters: HF
  onFilterChange: <K extends keyof HF>(key: K, value: HF[K]) => void
  onReset: () => void
}

export const HistoryFiltersBar = memo(function HistoryFiltersBar({
  filters,
  onFilterChange,
  onReset,
}: HistoryFiltersProps) {
  const { t } = useTranslation()
  const { searchMode, setSearchMode } = useHistoryStore()

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-1 flex-col gap-1.5 min-w-[200px]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">
              {t('common.search')}
            </label>
            <div className="flex items-center space-x-2">
              <Label htmlFor="search-mode" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {searchMode === 'global' ? 'Global' : 'Local'}
              </Label>
              <Switch 
                id="search-mode" 
                checked={searchMode === 'global'}
                onCheckedChange={(checked) => setSearchMode(checked ? 'global' : 'local')}
                className="scale-75"
              />
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
              placeholder={searchMode === 'global' ? "Search everywhere..." : "Search in this folder..."}
              className="pl-8"
            />
          </div>
        </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          {t('generator.aspectRatio')}
        </label>
        <Select
          value={filters.aspectRatio}
          onValueChange={(v) => onFilterChange('aspectRatio', v as AspectRatio | 'all')}
        >
          <SelectTrigger className="w-28">
            <SelectValue placeholder={t('common.all')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="1:1">1:1</SelectItem>
            <SelectItem value="4:5">4:5</SelectItem>
            <SelectItem value="3:4">3:4</SelectItem>
            <SelectItem value="16:9">16:9</SelectItem>
            <SelectItem value="9:16">9:16</SelectItem>
            <SelectItem value="2:3">2:3</SelectItem>
            <SelectItem value="3:2">3:2</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          {t('history.minRating')}
        </label>
        <Select
          value={String(filters.minRating)}
          onValueChange={(v) => onFilterChange('minRating', Number(v))}
        >
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">{t('common.all')}</SelectItem>
            {[5, 6, 7, 8, 9].map((r) => (
              <SelectItem key={r} value={String(r)}>
                {r}+
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" size="sm" onClick={onReset}>
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
        {t('history.resetFilters')}
      </Button>
      </div>
    </div>
  )
})
