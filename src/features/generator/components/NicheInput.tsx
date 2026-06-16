import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Shuffle, Sparkles, Loader2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface NicheInputProps {
  value: string
  onChange: (value: string) => void
  onRandomize: () => void
  isRandomizing: boolean
  isQueueHydrating: boolean
  isQueueEmpty: boolean
  onImprove: () => void
  isImproving: boolean
  isConfigValid: boolean
}

export const NicheInput = memo(function NicheInput({
  value,
  onChange,
  onRandomize,
  isRandomizing,
  isQueueHydrating,
  isQueueEmpty,
  onImprove,
  isImproving,
  isConfigValid,
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
          className={`flex-1 min-h-[80px] resize-none transition-opacity duration-200 ${isImproving ? 'opacity-50 animate-pulse' : ''}`}
        />
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onRandomize}
            disabled={isRandomizing || isQueueHydrating || (isQueueEmpty && !isConfigValid)}
            title={t('generator.randomNiche')}
            className="h-10 w-10 shrink-0"
          >
            {isRandomizing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Shuffle className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onImprove}
            disabled={!value.trim() || isImproving || !isConfigValid}
            title={t('generator.improveNiche')}
            className="h-10 w-10 shrink-0"
          >
            {isImproving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
})
