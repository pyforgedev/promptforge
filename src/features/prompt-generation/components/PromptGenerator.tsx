import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, Sparkles, RefreshCw } from 'lucide-react'
import { usePromptGeneration } from '@/features/prompt-generation/hooks/usePromptGeneration'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const PromptGenerator = memo(function PromptGenerator() {
  const { t } = useTranslation()
  const { result, loading, error, generate, clear } = usePromptGeneration()
  const [input, setInput] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    await generate({ prompt: input.trim() })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {t('promptGeneration.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="prompt-input" className="text-sm font-medium">
              {t('promptGeneration.inputLabel')}
            </label>
            <textarea
              id="prompt-input"
              rows={4}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('promptGeneration.placeholder')}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading || !input.trim()}>
              {loading ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {t('promptGeneration.submit')}
            </Button>
            {result && (
              <Button type="button" variant="outline" onClick={clear}>
                {t('promptGeneration.clear')}
              </Button>
            )}
          </div>
        </form>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium">{t('promptGeneration.response')}</h4>
            <div className="rounded-lg border border-border bg-muted p-4 text-sm">
              {result.content}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('promptGeneration.tokens', {
                total: result.usage.totalTokens,
              })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
})
