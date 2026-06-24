import { memo, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Sparkles, RefreshCw, AlertTriangle, AlertCircle, Settings as SettingsIcon, ChevronDown, ChevronUp, Info, Sliders, Palette, History, Globe } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { usePromptGeneratorStore } from '../store/promptGeneratorStore'
import { useAIConfigStore } from '@/store/useAIConfigStore'
import { RandomIdeaButton } from './RandomIdeaButton'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { cn } from '@/lib/utils'
import type { BatchSize, NicheCategory, TargetMarket, UsageContext, ImagePlatform, MoodOption, ColorPaletteOption, ArtStyleOption, BackgroundOption, HumanModelOption } from '../types'
import { OPTION_LABELS, MOOD_OPTIONS, COLOR_PALETTE_OPTIONS, ART_STYLE_OPTIONS, BACKGROUND_OPTIONS, HUMAN_MODEL_OPTIONS } from '../types'

function SectionGroup({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted" />
        <span className="text-caption-ui text-secondary font-semibold">{title}</span>
      </div>
      <div className="flex flex-col gap-4 pl-5">{children}</div>
    </div>
  )
}

function SectionDivider() {
  return <div className="border-t border-border-subtle" />
}

function makeOptions(options: readonly string[]): ComboboxOption[] {
  return options.map((v) => ({ value: v, label: OPTION_LABELS[v] ?? v }))
}

const moodOptions = makeOptions(MOOD_OPTIONS)
const colorPaletteOptions = makeOptions(COLOR_PALETTE_OPTIONS)
const artStyleOptions = makeOptions(ART_STYLE_OPTIONS)
const backgroundOptions = makeOptions(BACKGROUND_OPTIONS)
const humanModelOptions = makeOptions(HUMAN_MODEL_OPTIONS)

export const GeneratorForm = memo(function GeneratorForm() {
  const { t } = useTranslation()
  const shouldReduceMotion = useReducedMotion()

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

  const [customInstructionsEnabled, setCustomInstructionsEnabled] = useState(() => !!input.customInstructions)
  const [basePromptRefEnabled, setBasePromptRefEnabled] = useState(() => !!input.basePromptReference)

  const isDiverseDisabled = input.humanModel?.mode === 'user' && input.humanModel?.value === 'no_people' || false

  type StyleFieldKey = 'mood' | 'colorPalette' | 'artStyle' | 'background' | 'humanModel'

  const lastStyleModeUserValues = useRef<Record<StyleFieldKey, string>>({
    mood: input.mood?.mode === 'user' ? input.mood?.value ?? 'none' : 'none',
    colorPalette: input.colorPalette?.mode === 'user' ? input.colorPalette?.value ?? 'none' : 'none',
    artStyle: input.artStyle?.mode === 'user' ? input.artStyle?.value ?? 'none' : 'none',
    background: input.background?.mode === 'user' ? input.background?.value ?? 'none' : 'none',
    humanModel: input.humanModel?.mode === 'user' ? input.humanModel?.value ?? 'no_people' : 'no_people',
  })

  const handleGenerate = () => {
    if (!isGenerating) {
      generatePrompts()
    }
  }

  const handleStyleModeChange = useCallback(
    (mode: 'user' | 'system') => {
      const save = lastStyleModeUserValues.current
      const i = input
      if (mode === 'user') {
        setInput({
          styleMode: 'user',
          mood: { mode: 'user', value: save.mood as MoodOption },
          colorPalette: { mode: 'user', value: save.colorPalette as ColorPaletteOption },
          artStyle: { mode: 'user', value: save.artStyle as ArtStyleOption },
          background: { mode: 'user', value: save.background as BackgroundOption },
          humanModel: { mode: 'user', value: save.humanModel as HumanModelOption },
        })
      } else {
        if (i.mood?.mode === 'user') save.mood = i.mood?.value ?? 'none'
        if (i.colorPalette?.mode === 'user') save.colorPalette = i.colorPalette?.value ?? 'none'
        if (i.artStyle?.mode === 'user') save.artStyle = i.artStyle?.value ?? 'none'
        if (i.background?.mode === 'user') save.background = i.background?.value ?? 'none'
        if (i.humanModel?.mode === 'user') save.humanModel = i.humanModel?.value ?? 'no_people'
        setInput({
          styleMode: 'system',
          mood: { mode: 'system' },
          colorPalette: { mode: 'system' },
          artStyle: { mode: 'system' },
          background: { mode: 'system' },
          humanModel: { mode: 'system' },
        })
      }
    },
    [input, setInput],
  )

  const handleStyleValueChange = useCallback(
    (field: StyleFieldKey, value: string) => {
      lastStyleModeUserValues.current[field] = value
      setInput({ [field]: { mode: 'user' as const, value } } as Partial<typeof input>)
    },
    [setInput],
  )

  const languageOptions: ComboboxOption[] = [
    { value: 'en', label: t('generator.form.language.options.en') },
    { value: 'id', label: t('generator.form.language.options.id') },
  ]

  const aspectRatioOptions: ComboboxOption[] = [
    { value: 'random', label: t('generator.form.aspectRatio.random') },
    { value: '1:1', label: '1:1' },
    { value: '4:5', label: '4:5' },
    { value: '2:3', label: '2:3' },
    { value: '9:16', label: '9:16' },
    { value: '3:2', label: '3:2' },
    { value: '4:3', label: '4:3' },
    { value: '16:9', label: '16:9' },
  ]

  const nicheCategories: NicheCategory[] = ['technology', 'business', 'nature', 'lifestyle', 'healthcare', 'food', 'travel', 'education', 'abstract', 'people', 'architecture', 'other']

  const styleFields: { key: StyleFieldKey; options: ComboboxOption[] }[] = [
    { key: 'mood', options: moodOptions },
    { key: 'colorPalette', options: colorPaletteOptions },
    { key: 'artStyle', options: artStyleOptions },
    { key: 'background', options: backgroundOptions },
    { key: 'humanModel', options: humanModelOptions },
  ]

  return (
    <Card className="border-border-subtle card-spotlight">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl font-semibold tracking-tight">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/10">
            <Sparkles className="h-4 w-4 text-brand-primary" />
          </div>
          {t('generator.title_v2')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-8">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="language">{t('generator.form.language.label')}</Label>
              <Combobox
                options={languageOptions}
                value={input.language}
                onValueChange={(v) => setInput({ language: v as 'en' | 'id' })}
                placeholder={t('generator.form.language.label')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="aspect-ratio">{t('generator.form.aspectRatio.label')}</Label>
              <Combobox
                options={aspectRatioOptions}
                value={input.aspectRatio}
                onValueChange={(v) => setInput({ aspectRatio: v as typeof input.aspectRatio })}
                placeholder={t('generator.form.aspectRatio.label')}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Label htmlFor="niche">{t('generator.niche_v2')}</Label>
              <RandomIdeaButton
                category={input.category}
                onIdeaGenerated={(idea) => setInput({ niche: idea })}
              />
            </div>
            <Textarea
              id="niche"
              autoFocus
              value={input.niche}
              onChange={(e) => setInput({ niche: e.target.value })}
              placeholder={t('generator.form.niche.placeholder')}
              className="min-h-[100px] resize-none"
            />
          </div>
        </div>

        <SectionDivider />

        <SectionGroup icon={Sliders} title="Output Settings">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="variationLevel">{t('generator.form.variationLevel.label')}</Label>
              <ToggleGroup.Root
                type="single"
                value={String(input.variationLevel)}
                onValueChange={(val) => {
                  if (val) setInput({ variationLevel: parseInt(val, 10) })
                }}
                className="flex gap-0"
              >
                {[1, 2, 3, 4, 5].map((level) => {
                  const levelColors = [
                    'bg-blue-500',
                    'bg-emerald-500',
                    'bg-yellow-500',
                    'bg-orange-500',
                    'bg-red-500',
                  ]
                  return (
                    <ToggleGroup.Item
                      key={level}
                      value={String(level)}
                      className={cn(
                        "group relative flex h-9 w-9 cursor-pointer items-center justify-center border border-border-subtle bg-surface-hover text-sm font-medium text-secondary transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2",
                        "data-[state=on]:bg-brand-primary data-[state=on]:text-text-on-brand",
                        "hover:bg-surface-hover/80",
                        level === 1 && "rounded-l-md",
                        level === 5 && "rounded-r-md",
                        "border-r-0 last:border-r"
                      )}
                    >
                      {level}
                      <span
                        className={cn(
                          "absolute bottom-0.5 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full",
                          levelColors[level - 1]
                        )}
                      />
                      <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border-strong bg-surface/80 px-2.5 py-1 text-caption-ui text-primary opacity-0 shadow-xl backdrop-blur-md transition-opacity group-hover:opacity-100">
                        {t(`generator.form.variationLevel.level${level}`)}
                      </div>
                    </ToggleGroup.Item>
                  )
                })}
              </ToggleGroup.Root>
            </div>
          </div>
        </SectionGroup>

        <SectionDivider />

        <SectionGroup icon={Palette} title="Style Preferences">
          <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <TooltipProvider delayDuration={300}>
              <div className="flex items-center gap-2">
                <Label>{t('generator.form.styleMode.label')}</Label>
                <Tooltip>
                  <TooltipTrigger type="button" className="flex cursor-help">
                    <Info className="h-3.5 w-3.5 text-muted" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    {t('generator.form.styleMode.tooltip')}
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
            <ToggleGroup.Root
              type="single"
              value={input.styleMode}
              onValueChange={(val) => val && handleStyleModeChange(val as 'user' | 'system')}
              className="flex gap-0"
            >
              <ToggleGroup.Item
                value="user"
                className={cn(
                  "flex h-9 cursor-pointer items-center justify-center rounded-l-md border border-r-0 border-border-subtle bg-surface-hover px-4 text-sm font-medium text-secondary transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2",
                  "data-[state=on]:bg-brand-primary data-[state=on]:text-text-on-brand",
                  "hover:bg-surface-hover/80"
                )}
              >
                {t('generator.form.styleMode.userLabel')}
              </ToggleGroup.Item>
              <ToggleGroup.Item
                value="system"
                className={cn(
                  "flex h-9 cursor-pointer items-center justify-center rounded-r-md border border-border-subtle bg-surface-hover px-4 text-sm font-medium text-secondary transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2",
                  "data-[state=on]:bg-brand-primary data-[state=on]:text-text-on-brand",
                  "hover:bg-surface-hover/80"
                )}
              >
                {t('generator.form.styleMode.systemLabel')}
              </ToggleGroup.Item>
            </ToggleGroup.Root>
          </div>

          {input.styleMode === 'user' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {styleFields.map(({ key, options }) => {
                const field = input[key]
                return (
                  <div key={key} className="flex flex-col gap-1.5">
                    <Label htmlFor={`${key}-value`}>{t(`generator.form.${key}.label`)}</Label>
                    <Combobox
                      options={options}
                      value={field?.mode === 'user' ? field?.value ?? 'none' : 'none'}
                      onValueChange={(v) => handleStyleValueChange(key, v)}
                      placeholder={t(`generator.form.${key}.label`)}
                    />
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted">
              {t('generator.form.styleMode.systemDescription')}
            </p>
          )}
        </div>
        </SectionGroup>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="customInstructions">{t('generator.form.customInstructions.label')}</Label>
            <Switch
              id="customInstructions-toggle"
              checked={customInstructionsEnabled}
              onCheckedChange={setCustomInstructionsEnabled}
            />
          </div>
          {customInstructionsEnabled && (
            <Textarea
              id="customInstructions"
              value={input.customInstructions}
              onChange={(e) => setInput({ customInstructions: e.target.value })}
              placeholder={t('generator.form.customInstructions.placeholder')}
              className="min-h-[80px]"
            />
          )}
        </div>

        <SectionDivider />

        <SectionGroup icon={History} title="Variation Context">
          <TooltipProvider delayDuration={300}>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-hover/30 px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="includeHistory" className="cursor-pointer">
                      {t('generator.form.includeHistory.label')}
                    </Label>
                    <Tooltip>
                      <TooltipTrigger type="button" className="flex cursor-help">
                        <Info className="h-3.5 w-3.5 text-muted" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        {t('generator.form.includeHistory.tooltip')}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-caption-ui text-muted">
                    {t('generator.form.includeHistory.description')}
                  </p>
                </div>
                <Switch
                  id="includeHistory"
                  checked={input.includeHistory}
                  onCheckedChange={(v) => setInput({ includeHistory: v })}
                />
              </div>
              {input.includeHistory && (
                <div className="flex flex-col gap-2 px-1">
                  <div className="flex items-center justify-between">
                    <span className="text-caption-ui text-muted">{t('generator.form.includeHistory.sliderLabel')}</span>
                    <span className={cn(
                      "text-label-ui font-medium tabular-nums",
                      input.includeHistoryCount <= 15 ? "text-brand-success" :
                      input.includeHistoryCount <= 35 ? "text-brand-warning" :
                      "text-brand-danger"
                    )}>
                      {input.includeHistoryCount}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min={5}
                      max={50}
                      step={1}
                      value={input.includeHistoryCount}
                      onChange={(e) => setInput({ includeHistoryCount: Number(e.target.value) })}
                      className="w-full h-2 appearance-none rounded-full cursor-pointer bg-transparent"
                      style={{
                        background: (() => {
                          const pct = ((input.includeHistoryCount - 5) / 45) * 100
                          const seg1 = ((15 - 5) / 45) * 100
                          const seg2 = ((35 - 5) / 45) * 100
                          const activeColor =
                            input.includeHistoryCount <= 15
                              ? 'var(--color-brand-success)'
                              : input.includeHistoryCount <= 35
                              ? 'var(--color-brand-warning)'
                              : 'var(--color-brand-danger)'
                          if (input.includeHistoryCount <= 15) {
                            return `linear-gradient(to right, var(--color-brand-success) 0%, var(--color-brand-success) ${pct}%, color-mix(in srgb, var(--color-brand-success) 20%, transparent) ${pct}%, color-mix(in srgb, var(--color-brand-warning) 20%, transparent) ${seg1}%, color-mix(in srgb, var(--color-brand-warning) 20%, transparent) ${seg2}%, color-mix(in srgb, var(--color-brand-danger) 20%, transparent) ${seg2}%, color-mix(in srgb, var(--color-brand-danger) 20%, transparent) 100%)`
                          } else if (input.includeHistoryCount <= 35) {
                            return `linear-gradient(to right, var(--color-brand-success) 0%, var(--color-brand-success) ${seg1}%, var(--color-brand-warning) ${seg1}%, var(--color-brand-warning) ${pct}%, color-mix(in srgb, var(--color-brand-warning) 20%, transparent) ${pct}%, color-mix(in srgb, var(--color-brand-danger) 20%, transparent) ${seg2}%, color-mix(in srgb, var(--color-brand-danger) 20%, transparent) 100%)`
                          } else {
                            return `linear-gradient(to right, var(--color-brand-success) 0%, var(--color-brand-success) ${seg1}%, var(--color-brand-warning) ${seg1}%, var(--color-brand-warning) ${seg2}%, var(--color-brand-danger) ${seg2}%, ${activeColor} ${pct}%, color-mix(in srgb, var(--color-brand-danger) 20%, transparent) ${pct}%, color-mix(in srgb, var(--color-brand-danger) 20%, transparent) 100%)`
                          }
                        })()
                      }}
                      aria-label={t('generator.form.includeHistory.sliderLabel')}
                    />
                  </div>
                  <div className="flex justify-between text-caption-ui text-muted px-0.5">
                    <span>5</span>
                    <span>50</span>
                  </div>
                </div>
              )}
            </div>
          </TooltipProvider>
        </SectionGroup>

        <SectionDivider />

        <div>
          <button
            type="button"
            onClick={() => setAdvancedOptionsOpen(!advancedOptionsOpen)}
            aria-expanded={advancedOptionsOpen}
            aria-controls="advanced-options-panel"
            className="flex items-center gap-1.5 text-label-ui font-medium text-muted hover:text-primary transition-colors"
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
                <SectionGroup icon={Globe} title="Advanced Options">
                <div className="grid gap-4">
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

                  <TooltipProvider delayDuration={300}>
                    <div className={cn(
                      "flex items-center justify-between rounded-lg border border-border-subtle bg-surface-hover/30 px-4 py-3",
                      isDiverseDisabled && "opacity-50"
                    )}>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor="includeDiversity"
                            className={cn("cursor-pointer", isDiverseDisabled && "cursor-not-allowed")}
                          >
                            {t('generator.form.includeDiversity.label')}
                          </Label>
                          {isDiverseDisabled && (
                            <Tooltip>
                              <TooltipTrigger type="button" className="flex cursor-help">
                                <Info className="h-3.5 w-3.5 text-muted" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                {t('generator.form.diverseRepresentation.disabledTooltip')}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <p className="text-caption-ui text-muted">
                          {t('generator.form.includeDiversity.description')}
                        </p>
                      </div>
                      <Switch
                        id="includeDiversity"
                        checked={input.includeDiversity}
                        onCheckedChange={(v) => setInput({ includeDiversity: v })}
                        disabled={isDiverseDisabled}
                      />
                    </div>
                  </TooltipProvider>

                  <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-hover/30 px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <Label htmlFor="allowTextSpace" className="cursor-pointer">
                        {t('generator.form.allowTextSpace.label')}
                      </Label>
                      <p className="text-caption-ui text-muted">
                        {t('generator.form.allowTextSpace.description')}
                      </p>
                    </div>
                    <Switch
                      id="allowTextSpace"
                      checked={input.allowTextSpace}
                      onCheckedChange={(v) => setInput({ allowTextSpace: v })}
                      className="data-[state=unchecked]:border"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-hover/30 px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <Label htmlFor="includeNegativePrompts" className="cursor-pointer">
                        {t('generator.form.includeNegativePrompts.label')}
                      </Label>
                      <p className="text-caption-ui text-muted">
                        {t('generator.form.includeNegativePrompts.description')}
                      </p>
                    </div>
                    <Switch
                      id="includeNegativePrompts"
                      checked={input.includeNegativePrompts}
                      onCheckedChange={(v) => setInput({ includeNegativePrompts: v })}
                      className="data-[state=unchecked]:border"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-hover/30 px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <Label htmlFor="includeKeywords" className="cursor-pointer">
                        {t('generator.form.includeKeywords.label')}
                      </Label>
                      <p className="text-caption-ui text-muted">
                        {t('generator.form.includeKeywords.description')}
                      </p>
                    </div>
                    <Switch
                      id="includeKeywords"
                      checked={input.includeKeywords}
                      onCheckedChange={(v) => setInput({ includeKeywords: v })}
                      className="data-[state=unchecked]:border"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="basePromptReference">
                      {t('generator.form.basePromptReference.label')}
                    </Label>
                    <Switch
                      id="basePromptReference-toggle"
                      checked={basePromptRefEnabled}
                      onCheckedChange={setBasePromptRefEnabled}
                    />
                  </div>
                  {basePromptRefEnabled && (
                    <>
                      <p className="text-caption-ui text-muted">
                        {t('generator.form.basePromptReference.description')}
                      </p>
                      <Textarea
                        id="basePromptReference"
                        value={input.basePromptReference ?? ''}
                        onChange={(e) => setInput({ basePromptReference: e.target.value || undefined })}
                        placeholder={t('generator.form.basePromptReference.placeholder')}
                        className="min-h-[80px]"
                      />
                    </>
                  )}
                </div>
                </SectionGroup>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
              {isGenerating ? <RefreshCw className="mr-2 h-4 w-4 motion-safe:animate-pulse" /> : <Sparkles className="mr-2 h-4 w-4" />}
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
