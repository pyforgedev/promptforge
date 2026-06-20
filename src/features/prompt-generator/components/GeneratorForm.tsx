// src/features/prompt-generator/components/GeneratorForm.tsx
// This is the new, refactored Generator Form for the Prompt Engine V2.
// It connects exclusively to usePromptGeneratorStore and is decoupled from result display.

import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Sparkles, RefreshCw, AlertTriangle, AlertCircle, Settings as SettingsIcon, ChevronDown, ChevronUp } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { usePromptGeneratorStore } from '../store/promptGeneratorStore'
import { useAIConfigStore } from '@/store/useAIConfigStore'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import type { BatchSize, NicheCategory, TargetMarket, UsageContext, ImagePlatform } from '../types'

export const GeneratorForm = memo(function GeneratorForm() {
  const { t } = useTranslation()
  const shouldReduceMotion = useReducedMotion()
  // advancedOptionsOpen is managed in the store so external actions
  // (e.g. "Use as Reference" from templates) can open the panel

  // Component state from the new Zustand store
  const { input, setInput, generatePrompts, isGenerating, error, advancedOptionsOpen, setAdvancedOptionsOpen } = usePromptGeneratorStore(
    useShallow((state) => ({
      input: state.input,
      setInput: state.setInput,
      generatePrompts: state.generatePrompts,
      isGenerating: state.isGenerating,
      error: state.error,
      advancedOptionsOpen: state.advancedOptionsOpen,
      setAdvancedOptionsOpen: state.setAdvancedOptionsOpen,
    })),
  )

  const isAIConfigReady = useAIConfigStore(useShallow(state => state.isReady && !!state.activeConfig?.apiKey))

  const handleGenerate = () => {
    if (!isGenerating) {
      generatePrompts()
    }
  }

  const nicheCategories: NicheCategory[] = ['technology', 'business', 'nature', 'lifestyle', 'healthcare', 'food', 'travel', 'education', 'abstract', 'people', 'architecture', 'other']

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-heading">
          <Sparkles className="h-6 w-6 text-primary" />
          {t('generator.title_v2')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {/* Main Inputs */}
        <div className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="flex flex-col gap-1.5">
              <Label htmlFor="niche-category">{t('generator.form.category.label')}</Label>
              <Select
                value={input.category}
                onValueChange={(v) => setInput({ category: v as NicheCategory })}
              >
                <SelectTrigger id="niche-category">
                  <SelectValue placeholder={t('generator.form.category.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {nicheCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{t(`generator.form.category.options.${cat}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
               <Label htmlFor="batchSize">{t('generator.generateCount')}</Label>
                <Select
                  value={String(input.batchSize)}
                  onValueChange={(v) => setInput({ batchSize: Number(v) as BatchSize })}
                >
                  <SelectTrigger id="batchSize">
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
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="niche">{t('generator.niche_v2')}</Label>
            <Textarea
              id="niche"
              autoFocus
              value={input.niche}
              onChange={(e) => setInput({ niche: e.target.value })}
              placeholder={t('generator.form.niche.placeholder')}
              className="min-h-[100px]"
            />
          </div>
        </div>

        {/* Core Options */}
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="usageContext">{t('generator.form.usageContext.label')}</Label>
              <Select
                value={input.usageContext}
                onValueChange={(v) => setInput({ usageContext: v as UsageContext })}
              >
                <SelectTrigger id="usageContext">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="commercial">{t('generator.form.usageContext.options.commercial')}</SelectItem>
                  <SelectItem value="editorial">{t('generator.form.usageContext.options.editorial')}</SelectItem>
                  <SelectItem value="conceptual">{t('generator.form.usageContext.options.conceptual')}</SelectItem>
                  <SelectItem value="abstract">{t('generator.form.usageContext.options.abstract')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="targetPlatform">{t('generator.form.targetPlatform.label')}</Label>
              <Select
                value={input.targetPlatform}
                onValueChange={(v) => setInput({ targetPlatform: v as ImagePlatform })}
              >
                <SelectTrigger id="targetPlatform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">{t('generator.form.targetPlatform.options.both')}</SelectItem>
                  <SelectItem value="dalle3">{t('generator.form.targetPlatform.options.dalle3')}</SelectItem>
                  <SelectItem value="nano_banana">{t('generator.form.targetPlatform.options.nano_banana')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

             <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-hover/30 px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="includeDiversity" className="cursor-pointer">
                  {t('generator.form.includeDiversity.label')}
                </Label>
                <p className="text-caption-ui text-muted-foreground">
                  {t('generator.form.includeDiversity.description')}
                </p>
              </div>
              <Switch
                id="includeDiversity"
                checked={input.includeDiversity}
                onCheckedChange={(v) => setInput({ includeDiversity: v })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-hover/30 px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="allowTextSpace" className="cursor-pointer">
                  {t('generator.form.allowTextSpace.label')}
                </Label>
                <p className="text-caption-ui text-muted-foreground">
                  {t('generator.form.allowTextSpace.description')}
                </p>
              </div>
              <Switch
                id="allowTextSpace"
                checked={input.allowTextSpace}
                onCheckedChange={(v) => setInput({ allowTextSpace: v })}
              />
            </div>
        </div>

        {/* Advanced Options Accordion */}
        <div>
          <button
            type="button"
            onClick={() => setAdvancedOptionsOpen(!advancedOptionsOpen)}
            aria-expanded={advancedOptionsOpen}
            aria-controls="advanced-options-panel"
            className="flex items-center gap-1.5 text-label-ui font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            {advancedOptionsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {t('generator.form.advancedOptions.toggle')}
          </button>

          <AnimatePresence>
            {advancedOptionsOpen && (
              <motion.div
                id="advanced-options-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="grid gap-4 sm:grid-cols-2 pt-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="targetMarket">{t('generator.form.targetMarket.label')}</Label>
                    <Select
                      value={input.targetMarket}
                      onValueChange={(v) => setInput({ targetMarket: v as TargetMarket })}
                    >
                      <SelectTrigger id="targetMarket"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">{t('generator.form.targetMarket.options.global')}</SelectItem>
                        <SelectItem value="us">{t('generator.form.targetMarket.options.us')}</SelectItem>
                        <SelectItem value="eu">{t('generator.form.targetMarket.options.eu')}</SelectItem>
                        <SelectItem value="asia">{t('generator.form.targetMarket.options.asia')}</SelectItem>
                        <SelectItem value="latin_america">{t('generator.form.targetMarket.options.latin_america')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="moodPreference">{t('generator.form.moodPreference.label')}</Label>
                    <Input
                      id="moodPreference"
                      value={input.moodPreference ?? ''}
                      onChange={(e) => setInput({ moodPreference: e.target.value || undefined })}
                      placeholder={t('generator.form.moodPreference.placeholder')}
                    />
                  </div>
                </div>
                {/* Base Prompt Reference */}
                <div className="flex flex-col gap-1.5 pt-4">
                  <Label htmlFor="basePromptReference">
                    {t('generator.form.basePromptReference.label')}
                  </Label>
                <p className="text-caption-ui text-muted-foreground">
                    {t('generator.form.basePromptReference.description')}
                  </p>
                  <Textarea
                    id="basePromptReference"
                    value={input.basePromptReference ?? ''}
                    onChange={(e) => setInput({ basePromptReference: e.target.value || undefined })}
                    placeholder={t('generator.form.basePromptReference.placeholder')}
                    className="min-h-[80px]"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Button & Errors */}
        <div className="flex flex-col gap-4">
          {!isAIConfigReady ? (
            <div className="overlay-glass border-l-[3px] border-l-brand-warning flex flex-col w-full gap-3 p-4 rounded-r-lg text-brand-warning">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-5 w-5" />
                <span>{t('generator.form.errors.apiConfigRequired.title')}</span>
              </div>
              <p className="text-body-ui text-secondary">{t('generator.form.errors.apiConfigRequired.description')}</p>
              <Button asChild variant="outline" className="w-fit border-brand-warning/30 text-brand-warning hover:bg-brand-warning/10 hover:text-brand-primary-hover">
                <Link to="/settings">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  {t('generator.form.errors.apiConfigRequired.button')}
                </Link>
              </Button>
            </div>
          ) : (
            <Button onClick={handleGenerate} disabled={isGenerating || !input.niche.trim()} size="lg" className="flex-1">
              {isGenerating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {isGenerating ? t('generator.generating') : t('generator.generate_v2')}
            </Button>
          )}

          {error && (
            <div className="overlay-glass border-l-[3px] border-l-brand-danger p-4 rounded-r-lg text-sm flex flex-col gap-1">
              <p className="flex items-center gap-1.5 font-medium text-brand-danger">
                <AlertCircle className="h-4 w-4" />
                {t(`generator.form.errors.${error.code}.title`)}
              </p>
              <p className="text-secondary">{error.message}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
})
