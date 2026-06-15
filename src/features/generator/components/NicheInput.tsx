import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Shuffle } from 'lucide-react'
import { Input } from '@/components/ui/input'
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
    <div className="flex flex-col gap-2">
      <label htmlFor="niche" className="text-sm font-medium text-foreground">
        {t('generator.niche')}
      </label>
      <div className="flex gap-2">
        <Input
          id="niche"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('generator.nichePlaceholder')}
          className="flex-1 h-10"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onRandomize}
          title={t('generator.randomNiche')}
          className="h-10 w-10"
        >
          <Shuffle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
})
