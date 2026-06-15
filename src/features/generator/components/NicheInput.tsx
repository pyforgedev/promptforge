import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Shuffle } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface NicheInputProps {
  value: string
  onChange: (value: string) => void
  onRandomize: () => void
}

export const NicheInput = memo(function NicheInput({
  value,
  onChange,
  onRandomize,
}: NicheInputProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-2 col-span-full md:col-span-1">
      <label htmlFor="niche" className="text-sm font-medium text-foreground">
        {t('generator.niche')}
      </label>
      <div className="flex gap-2 items-start">
        <Textarea
          id="niche"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('generator.nichePlaceholder')}
          className="flex-1 min-h-[80px] resize-none"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onRandomize}
          title={t('generator.randomNiche')}
          className="h-10 w-10 shrink-0"
        >
          <Shuffle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
})
