import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dices, AlertCircle } from 'lucide-react'
import { useReducedMotion } from 'framer-motion'
import { useAIConfigStore } from '@/store/useAIConfigStore'
import { generateCompletion } from '@/services/ai/aiService'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'

interface RandomIdeaButtonProps {
  category?: string
  onIdeaGenerated: (idea: string) => void
}

export function RandomIdeaButton({ category, onIdeaGenerated }: RandomIdeaButtonProps) {
  const { t } = useTranslation()
  const shouldReduceMotion = useReducedMotion()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const activeConfig = useAIConfigStore((s) => s.activeConfig)

  const handleClick = async () => {
    if (!category || !activeConfig || isLoading) return
    setIsLoading(true)
    setError(null)
    try {
      const idea = await generateCompletion(
        `Generate one short, commercially relevant niche idea (1-2 sentences) for stock photography in the category: ${category}. Return only the idea, no explanation, no formatting.`,
        activeConfig,
        undefined,
        'You are a creative consultant for stock photography. Generate one concise, commercially viable niche idea.',
      )
      onIdeaGenerated(idea.trim())
    } catch {
      setError(t('generator.form.errors.PROVIDER_ERROR.message'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!category || isLoading}
              onClick={handleClick}
              aria-label={t('generator.form.niche.randomIdeaTooltip')}
              className="h-5 w-5 text-muted hover:text-primary"
            >
              {isLoading ? (
                <Dices className={`h-3.5 w-3.5${shouldReduceMotion ? '' : ' motion-safe:animate-pulse'}`} />
              ) : (
                <Dices className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {category
              ? t('generator.form.niche.randomIdeaTooltip')
              : t('generator.form.niche.selectCategoryFirst')}
          </TooltipContent>
        </Tooltip>
        {error && (
          <div className="overlay-glass border-l-[3px] border-l-brand-danger rounded-r-lg px-3 py-2 text-sm flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-danger" />
            <span className="text-text-primary">{error}</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
