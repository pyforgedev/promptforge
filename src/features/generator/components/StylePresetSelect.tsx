import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { StylePresetKey } from '../types'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface StylePresetSelectProps {
  value: StylePresetKey
  customStyle: string
  onPresetChange: (value: StylePresetKey) => void
  onCustomStyleChange: (value: string) => void
}

const presets: { value: StylePresetKey; labelKey: string }[] = [
  { value: 'none', labelKey: 'generator.stylePresets.none' },
  { value: 'random', labelKey: 'generator.stylePresets.random' },
  { value: 'custom', labelKey: 'generator.stylePresets.custom' },
  { value: 'commercial-photography', labelKey: 'generator.stylePresets.commercialPhotography' },
  { value: 'lifestyle', labelKey: 'generator.stylePresets.lifestyle' },
  { value: 'corporate', labelKey: 'generator.stylePresets.corporate' },
  { value: 'medical', labelKey: 'generator.stylePresets.medical' },
  { value: 'food', labelKey: 'generator.stylePresets.food' },
  { value: 'travel', labelKey: 'generator.stylePresets.travel' },
  { value: 'education', labelKey: 'generator.stylePresets.education' },
  { value: 'technology', labelKey: 'generator.stylePresets.technology' },
  { value: 'business', labelKey: 'generator.stylePresets.business' },
  { value: 'nature', labelKey: 'generator.stylePresets.nature' },
  { value: 'real-estate', labelKey: 'generator.stylePresets.realEstate' },
]

export const StylePresetSelect = memo(function StylePresetSelect({
  value,
  customStyle,
  onPresetChange,
  onCustomStyleChange,
}: StylePresetSelectProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground">
        {t('generator.stylePreset')}
      </label>
      <Select value={value} onValueChange={(v) => onPresetChange(v as StylePresetKey)}>
        <SelectTrigger className="h-10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {presets.map(({ value: val, labelKey }) => (
            <SelectItem key={val} value={val} className="py-2">
              {t(labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value === 'custom' && (
        <Input
          value={customStyle}
          onChange={(e) => onCustomStyleChange(e.target.value)}
          placeholder={t('generator.customStylePlaceholder')}
          className="mt-2 h-10"
        />
      )}
    </div>
  )
})
