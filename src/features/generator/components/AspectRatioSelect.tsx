import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { AspectRatio } from '../types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AspectRatioSelectProps {
  value: AspectRatio
  onChange: (value: AspectRatio) => void
}

const aspectRatios: { value: AspectRatio; labelKey: string }[] = [
  { value: 'random', labelKey: 'generator.aspectRatios.random' },
  { value: '1:1', labelKey: 'generator.aspectRatios.1_1' },
  { value: '4:5', labelKey: 'generator.aspectRatios.4_5' },
  { value: '3:4', labelKey: 'generator.aspectRatios.3_4' },
  { value: '16:9', labelKey: 'generator.aspectRatios.16_9' },
  { value: '9:16', labelKey: 'generator.aspectRatios.9_16' },
  { value: '2:3', labelKey: 'generator.aspectRatios.2_3' },
  { value: '3:2', labelKey: 'generator.aspectRatios.3_2' },
]

export const AspectRatioSelect = memo(function AspectRatioSelect({
  value,
  onChange,
}: AspectRatioSelectProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground">
        {t('generator.aspectRatio')}
      </label>
      <Select value={value} onValueChange={(v) => onChange(v as AspectRatio)}>
        <SelectTrigger className="h-10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {aspectRatios.map(({ value: val, labelKey }) => (
            <SelectItem key={val} value={val} className="py-2">
              {t(labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
})
