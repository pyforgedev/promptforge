import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Sparkles, RefreshCw, Copy, X, RotateCcw, Wand2, AlertTriangle, Settings as SettingsIcon } from 'lucide-react'
import { useGenerator } from '../hooks/useGenerator'
import { useAIConfigStore } from '@/store/useAIConfigStore'
import { useToast } from '@/hooks/useToast'
import { AspectRatioSelect } from './AspectRatioSelect'
import { NicheInput } from './NicheInput'
import { StylePresetSelect } from './StylePresetSelect'
import { QualityRating } from './QualityRating'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const GeneratorForm = memo(function GeneratorForm() {
  const { t } = useTranslation()
  const {
    state,
    setAspectRatio,
    setNiche,
    setStylePreset,
    setCustomStyle,
    setCount,
    randomizeNiche,
    results,
    loading,
    improvingId,
    duplicateWarnings,
    error,
    generate,
    regenerate,
    improve,
    dismissDuplicateWarning,
    clear,
    isConfigValid,
  } = useGenerator()

  const isReady = useAIConfigStore(state => state.isReady)
  const { showCopySuccess } = useToast()

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      showCopySuccess()
    } catch {
      // fallback
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-6 w-6 text-primary" />
            {t('generator.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AspectRatioSelect value={state.aspectRatio} onChange={setAspectRatio} />
            <NicheInput
              value={state.niche}
              onChange={setNiche}
              onRandomize={randomizeNiche}
            />
            <StylePresetSelect
              value={state.stylePreset}
              customStyle={state.customStyle}
              onPresetChange={setStylePreset}
              onCustomStyleChange={setCustomStyle}
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-foreground">
              {t('generator.generateCount')}
            </label>
            <Select
              value={String(state.count)}
              onValueChange={(v) => setCount(Number(v) as 1 | 3 | 5 | 10)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 3, 5, 10].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} {n === 1 ? t('generator.prompt') : t('generator.prompts')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            {!isReady ? (
              <div className="flex w-full h-24 items-center justify-center rounded-lg border border-border bg-muted/20">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !isConfigValid ? (
              <div className="flex flex-col w-full gap-3 p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-5 w-5" />
                  <span>API Configuration Required</span>
                </div>
                <p className="text-sm opacity-90">
                  Please configure your AI API key, endpoint, and model in settings to start generating prompts.
                </p>
                <Button asChild variant="outline" className="w-fit border-yellow-500/50 hover:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">
                  <Link to="/settings">
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    Go to Settings
                  </Link>
                </Button>
              </div>
            ) : (
              <Button onClick={generate} disabled={loading} size="lg" className="flex-1">
                {loading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {loading ? t('generator.generating') : t('generator.generate')}
              </Button>
            )}
            {isConfigValid && results.length > 0 && (
              <>
                <Button variant="outline" onClick={regenerate} disabled={loading} className="flex-1">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t('generator.regenerate')}
                </Button>
                <Button variant="outline" onClick={clear} className="flex-1">
                  <X className="mr-2 h-4 w-4" />
                  {t('generator.clear')}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {duplicateWarnings.length > 0 && (
        <div className="flex flex-col gap-3">
          {duplicateWarnings.map((warning) => (
            <div
              key={warning.promptId}
              className={`rounded-lg border p-4 text-sm flex items-start gap-4 ${
                warning.result.level === 'high'
                  ? 'border-destructive/30 bg-destructive/10 text-destructive'
                  : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
              }`}
            >
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium">
                  {warning.result.level === 'high'
                    ? t('generator.duplicateHigh')
                    : t('generator.duplicateMedium')}
                </p>
                <p className="text-xs mt-1 opacity-80">
                  {t('generator.duplicateScore', { score: warning.result.score })}
                </p>
              </div>
              <button
                onClick={() => dismissDuplicateWarning(warning.promptId)}
                className="text-current opacity-60 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold text-foreground">
            {t('generator.results')}
          </h2>
          {results.map((prompt, index) => (
            <Card key={prompt.id} className="transition-all duration-200 hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {t('generator.promptNumber', { number: index + 1 })}
                  </CardTitle>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="px-2 py-1 bg-secondary rounded-full text-xs font-medium">
                      {prompt.aspectRatio}
                    </span>
                    <span className="px-2 py-1 bg-secondary rounded-full text-xs font-medium">
                      {prompt.niche}
                    </span>
                    {prompt.stylePreset !== 'none' && (
                      <span className="px-2 py-1 bg-secondary rounded-full text-xs font-medium">
                        {prompt.stylePreset}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-base text-foreground leading-relaxed">
                  {prompt.content}
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(prompt.content)}
                    className="flex-1"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {t('generator.copy')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => improve(prompt.id)}
                    disabled={improvingId === prompt.id}
                    className="flex-1"
                  >
                    {improvingId === prompt.id ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="mr-2 h-4 w-4" />
                    )}
                    {t('generator.improve')}
                  </Button>

                </div>
                <QualityRating score={prompt.qualityScore} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
})
