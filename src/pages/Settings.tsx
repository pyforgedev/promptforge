import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plus, RefreshCw, X, CheckCircle2, AlertCircle,
  Upload, Download, Save, Key, Network, FileJson,
  Palette, Cpu, Trash2, RotateCcw, Play,
} from 'lucide-react'
import { useAppContext } from '@/hooks/useAppContext'
import { useToast } from '@/hooks/useToast'
import { useAIConfigStore } from '@/store/useAIConfigStore'
import { useMasterPromptStore } from '@/store/useMasterPromptStore'
import { DEFAULT_SYSTEM_PROMPT } from '@/features/prompt-generator/engine/MetaPromptBuilder'
import {
  getCustomModels,
  saveCustomModel,
  deleteCustomModel,
} from '@/features/settings/services/settingsService'
import { testConnection } from '@/services/ai/aiService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { AIProvider } from '@/features/settings/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { validateAIConfig } from '@/lib/validation'

export default function Settings() {
  const { t, i18n } = useTranslation()
  const { preferences, setTheme, setLanguage } = useAppContext()

  const {
    presets,
    activeConfig,
    setActiveConfig,
    savePreset,
    deletePreset,
  } = useAIConfigStore()

  const {
    customPrompt: savedCustomPrompt,
    load: loadMasterPrompt,
    setCustomPrompt: saveMasterPrompt,
    resetToDefault: resetMasterPrompt,
  } = useMasterPromptStore()

  const [masterPromptText, setMasterPromptText] = useState('')
  const [masterPromptLoaded, setMasterPromptLoaded] = useState(false)

  const [customModels, setCustomModels] = useState<string[]>([])
  const [customModelsLoading, setCustomModelsLoading] = useState(true)
  const [provider, setProvider] = useState<AIProvider>(activeConfig?.provider || 'openai')
  const [apiKey, setApiKey] = useState(activeConfig?.apiKey || '')
  const [endpoint, setEndpoint] = useState(activeConfig?.endpoint || '')
  const [model, setModel] = useState(activeConfig?.model || 'gpt-4')
  const [isApplying, setIsApplying] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [deletePresetId, setDeletePresetId] = useState<string | null>(null)

  const [presetDialogOpen, setPresetDialogOpen] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [newCustomModel, setNewCustomModel] = useState('')
  const [importText, setImportText] = useState('')
  const [importOpen, setImportOpen] = useState(false)

  const importFileRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApiKey(activeConfig?.apiKey || '')
    setEndpoint(activeConfig?.endpoint || '')
    setModel(activeConfig?.model || 'gpt-4')
    setProvider(activeConfig?.provider || 'openai')
  }, [activeConfig])

  useEffect(() => {
    const load = async () => {
      setCustomModelsLoading(true)
      const models = await getCustomModels()
      setCustomModels(models)
      setCustomModelsLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    const load = async () => {
      await loadMasterPrompt()
      const store = useMasterPromptStore.getState()
      const promptValue = store.customPrompt ?? DEFAULT_SYSTEM_PROMPT
      setMasterPromptText(typeof promptValue === 'string' ? promptValue : String(promptValue))
      setMasterPromptLoaded(true)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveMasterPrompt = async () => {
    const trimmed = String(masterPromptText ?? '').trim()
    if (!trimmed || trimmed === DEFAULT_SYSTEM_PROMPT) {
      await resetMasterPrompt()
      showToast('success', t('settings.masterPromptReset', { defaultValue: 'Master prompt reset to default' }))
      return
    }
    await saveMasterPrompt(trimmed)
    showToast('success', t('settings.masterPromptSaved', { defaultValue: 'Master prompt saved successfully' }))
  }

  const handleResetMasterPrompt = async () => {
    await resetMasterPrompt()
    setMasterPromptText(DEFAULT_SYSTEM_PROMPT)
    showToast('success', t('settings.masterPromptReset', { defaultValue: 'Master prompt reset to default' }))
  }

  const handleSavePreset = async () => {
    if (!presetName.trim()) return
    try {
      await savePreset({
        id: crypto.randomUUID(),
        name: presetName.trim(),
        provider,
        apiKey,
        endpoint,
        model,
        createdAt: Date.now(),
      })
      setPresetName('')
      setPresetDialogOpen(false)
      showToast('success', t('toast.presetSaved', { defaultValue: 'Preset saved successfully' }))
    } catch (err) {
      const debugMsg = err instanceof Error ? err.message : String(err)
      showToast('error', import.meta.env.DEV ? debugMsg : t('toast.saveFailed', { defaultValue: 'Failed to save preset' }))
    }
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      await testConnection({ provider, apiKey, endpoint, model })
      setTestResult('success')
      showToast('success', t('settings.testSuccess', { defaultValue: 'Connection successful' }))
    } catch (err) {
      setTestResult('error')
      const msg = err instanceof Error ? err.message : 'Connection failed'
      showToast('error', t('settings.testFailed', { defaultValue: 'Connection failed: {{message}}', message: msg }))
    } finally {
      setIsTesting(false)
    }
  }

  const handleApplyConfig = async () => {
    const validationError = validateAIConfig({ provider, apiKey, endpoint, model })
    if (validationError) {
      showToast('error', validationError)
      return
    }

    setIsApplying(true)
    try {
      await setActiveConfig({ provider, apiKey, endpoint, model })
      showToast('success', t('toast.configApplied', { defaultValue: 'Configuration applied successfully' }))
    } catch (err) {
      const debugMsg = err instanceof Error ? err.message : String(err)
      showToast('error', import.meta.env.DEV ? debugMsg : t('toast.applyFailed', { defaultValue: 'Failed to apply configuration' }))
    } finally {
      setIsApplying(false)
    }
  }

  const handleExport = () => {
    const data = { presets, activeConfig }
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'promptforge-ai-presets.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('success', t('toast.exportSuccess', { defaultValue: 'Presets exported successfully' }))
  }

  const handleImport = async () => {
    if (!importText.trim()) return
    try {
      const data = JSON.parse(importText)
      if (data.presets && Array.isArray(data.presets)) {
        for (const p of data.presets) {
          await savePreset(p)
        }
      }
      if (data.activeConfig) {
        await setActiveConfig(data.activeConfig)
      }
      setImportText('')
      setImportOpen(false)
      showToast('success', t('toast.importSuccess', { defaultValue: 'Presets imported successfully' }))
    } catch (err) {
      const debugMsg = err instanceof Error ? err.message : String(err)
      showToast('error', import.meta.env.DEV ? debugMsg : t('toast.importFailed', { defaultValue: 'Failed to import presets' }))
    }
  }

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setImportText(text)
    setImportOpen(true)
    if (importFileRef.current) {
      importFileRef.current.value = ''
    }
  }

  const handleAddCustomModel = async () => {
    if (!newCustomModel.trim()) return
    const updated = await saveCustomModel(newCustomModel.trim())
    setCustomModels(updated)
    setModel(newCustomModel.trim())
    setNewCustomModel('')
    showToast('success', t('toast.modelAdded', { defaultValue: 'Custom model added' }))
  }

  const handleRemoveCustomModel = async (m: string) => {
    const updated = await deleteCustomModel(m)
    setCustomModels(updated)
    showToast('success', t('toast.modelRemoved', { defaultValue: 'Custom model removed' }))
  }

  const handleLoadPreset = async (preset: typeof presets[number]) => {
    setProvider(preset.provider || 'openai')
    setApiKey(preset.apiKey)
    setEndpoint(preset.endpoint)
    setModel(preset.model)
    setTestResult(null)
    showToast('success', t('toast.presetLoaded', { defaultValue: 'Preset loaded' }))
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-12">
      <PageHeader
        title={t('nav.settings')}
        description={t('settings.pageDescription')}
      />

      {/* Preferences */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/10">
            <Palette className="h-4 w-4 text-brand-primary" />
          </div>
          <div>
            <CardTitle className="text-heading">
              {t('settings.preferences')}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <FieldRow label={t('settings.theme')} htmlFor="theme">
            <Select
              value={preferences.theme}
              onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}
            >
              <SelectTrigger id="theme" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t('theme.light')}</SelectItem>
                <SelectItem value="dark">{t('theme.dark')}</SelectItem>
                <SelectItem value="system">{t('theme.system')}</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label={t('settings.language')} htmlFor="language">
            <Select
              value={i18n.language?.startsWith('id') ? 'id' : 'en'}
              onValueChange={(v) => {
                setLanguage(v)
                i18n.changeLanguage(v)
              }}
            >
              <SelectTrigger id="language" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t('language.en')}</SelectItem>
                <SelectItem value="id">{t('language.id')}</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
        </CardContent>
      </Card>

      {/* AI Configuration */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/10">
            <Cpu className="h-4 w-4 text-brand-primary" />
          </div>
          <div>
            <CardTitle className="text-heading">
              {t('settings.aiConfig')}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Connection Section */}
          <SectionGroup icon={Key} title="Connection">
            <FieldRow label={t('settings.provider')} htmlFor="provider">
              <Select
                value={provider}
                onValueChange={(v: AIProvider) => {
                  setProvider(v)
                  setTestResult(null)
                  if (v === 'openai') setEndpoint('https://api.openai.com/v1')
                  if (v === 'gemini') {
                    setEndpoint('https://generativelanguage.googleapis.com/v1beta')
                    setModel('gemini-1.5-flash')
                  }
                  if (v === 'openrouter') {
                    setEndpoint('https://openrouter.ai/api/v1')
                    setModel('openai/gpt-3.5-turbo')
                  }
                }}
              >
                <SelectTrigger id="provider" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>

            <FieldRow label={t('settings.apiKey')} htmlFor="api-key">
              <Input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value)
                  setTestResult(null)
                }}
                placeholder={t('settings.apiKeyPlaceholder', { defaultValue: 'Enter API Key' })}
              />
            </FieldRow>

            <FieldRow label={t('settings.endpoint')} htmlFor="endpoint">
              <Input
                id="endpoint"
                value={endpoint}
                onChange={(e) => {
                  setEndpoint(e.target.value)
                  setTestResult(null)
                }}
                placeholder="https://api.openai.com/v1"
                disabled={provider !== 'custom'}
              />
            </FieldRow>
          </SectionGroup>

          <SectionDivider />

          {/* Model Section */}
          <SectionGroup icon={Network} title="Model">
            <FieldRow label={t('settings.model')} htmlFor="model-select">
              <Select value={model} onValueChange={(v) => {
                setModel(v)
                setTestResult(null)
              }}>
                <SelectTrigger id="model-select" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {provider === 'openai' && (
                    <>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    </>
                  )}
                  {provider === 'gemini' && (
                    <>
                      <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                      <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                      <SelectItem value="gemini-1.0-pro">Gemini 1.0 Pro</SelectItem>
                    </>
                  )}
                  {provider === 'openrouter' && (
                    <>
                      <SelectItem value="openai/gpt-4o">OpenRouter: GPT-4o</SelectItem>
                      <SelectItem value="anthropic/claude-3.5-sonnet">OpenRouter: Claude 3.5 Sonnet</SelectItem>
                      <SelectItem value="meta-llama/llama-3.1-70b-instruct">OpenRouter: Llama 3.1 70B</SelectItem>
                    </>
                  )}
                  {customModels.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                  {!['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet', ...customModels].includes(model) && (
                    <SelectItem value={model}>{model}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </FieldRow>

            <div className="flex flex-col gap-2 rounded-lg border border-border-subtle p-3">
              <span className="text-caption-ui text-secondary">
                {t('settings.addCustomModel')}
              </span>
              <div className="flex gap-2">
                <Input
                  value={newCustomModel}
                  onChange={(e) => setNewCustomModel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddCustomModel()
                    }
                  }}
                  placeholder="e.g. gpt-4o"
                  className="h-9"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-9 shrink-0"
                  onClick={handleAddCustomModel}
                >
                  <Plus className="h-4 w-4" />
                  {t('common.add')}
                </Button>
              </div>
              {customModelsLoading ? (
                <div className="flex gap-2">
                  <Skeleton className="h-7 w-24 rounded-md" />
                  <Skeleton className="h-7 w-20 rounded-md" />
                </div>
              ) : customModels.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {customModels.map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-surface-hover px-2 py-1 text-caption-ui text-secondary transition-colors hover:border-border-strong"
                    >
                      {m}
                      <button
                        onClick={() => handleRemoveCustomModel(m)}
                        className="ml-0.5 rounded p-0.5 text-muted transition-colors hover:text-primary"
                        aria-label={`Remove ${m}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </SectionGroup>

          <SectionDivider />

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleApplyConfig} disabled={isApplying}>
              {isApplying ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t('settings.apply')}
            </Button>
            <Button
              variant="secondary"
              onClick={handleTestConnection}
              disabled={isTesting || !apiKey || !endpoint}
            >
              {isTesting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : testResult === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-brand-success" />
              ) : testResult === 'error' ? (
                <AlertCircle className="h-4 w-4 text-brand-danger" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {t('settings.testConnection', { defaultValue: 'Test Connection' })}
            </Button>
            <Button variant="outline" onClick={() => setPresetDialogOpen(true)}>
              <Save className="h-4 w-4" />
              {t('settings.savePreset')}
            </Button>
          </div>

          <SectionDivider />

          {/* Saved Presets */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-label-ui text-primary">
                {t('settings.savedPresets')}
              </span>
              <div className="flex gap-1.5">
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileImport}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 px-2 text-caption-ui"
                  onClick={() => importFileRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {t('settings.importPresets')}
                </Button>
                {presets.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 px-2 text-caption-ui"
                    onClick={handleExport}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {t('settings.exportPresets')}
                  </Button>
                )}
              </div>
            </div>

            {presets.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="group flex items-center justify-between rounded-lg border border-border-subtle bg-surface px-4 py-3 transition-all hover:border-border-strong hover:bg-surface-hover"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-label-ui text-primary">
                        {preset.name}
                      </span>
                      <span className="text-caption-ui text-muted">
                        {preset.provider} &middot; {preset.model}
                      </span>
                    </div>
                    <div className="flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 px-2.5 text-caption-ui"
                        onClick={() => handleLoadPreset(preset)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {t('settings.load')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted hover:text-brand-danger"
                        onClick={() => setDeletePresetId(preset.id)}
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title={t('settings.noPresets', { defaultValue: 'No presets saved' })}
                description={t('settings.noPresetsDescription', { defaultValue: 'Import a preset from a file or create one to get started.' })}
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => importFileRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    {t('settings.importPresets')}
                  </Button>
                }
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Preset Dialog */}
      <Dialog open={presetDialogOpen} onOpenChange={setPresetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.savePreset')}</DialogTitle>
            <DialogDescription>
              {t('settings.savePresetDescription', { defaultValue: 'Enter a name for your AI configuration preset to load it later.' })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <FieldRow label={t('settings.presetName')} htmlFor="preset-name">
              <Input
                id="preset-name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSavePreset()
                  }
                }}
                placeholder="My Preset"
                autoFocus
              />
            </FieldRow>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPresetDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSavePreset} disabled={!presetName.trim()}>
                <Save className="h-4 w-4" />
                {t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Presets Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.importPresets')}</DialogTitle>
            <DialogDescription>
              {t('settings.importPresetsDescription', { defaultValue: 'Paste your JSON preset configuration here to import it.' })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='{"presets": [...]}'
              className="min-h-[160px] font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setImportOpen(false)
                setImportText('')
              }}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleImport} disabled={!importText.trim()}>
                <FileJson className="h-4 w-4" />
                {t('settings.importPresets')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Preset Confirmation */}
      <AlertDialog open={!!deletePresetId} onOpenChange={(open) => { if (!open) setDeletePresetId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.deletePresetTitle', { defaultValue: 'Delete Preset' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.deletePresetConfirmation', { defaultValue: 'Are you sure you want to delete this preset? This action cannot be undone.' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deletePresetId) {
                  try {
                    await deletePreset(deletePresetId)
                    showToast('success', t('toast.presetDeleted', { defaultValue: 'Preset deleted successfully' }))
                  } catch {
                    showToast('error', t('toast.deleteFailed', { defaultValue: 'Failed to delete preset' }))
                  } finally {
                    setDeletePresetId(null)
                  }
                }
              }}
              className="bg-brand-danger text-text-on-brand hover:bg-brand-danger/90"
            >
              <Trash2 className="h-4 w-4" />
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Advanced — Master Prompt */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/10">
            <FileJson className="h-4 w-4 text-brand-primary" />
          </div>
          <div>
            <CardTitle className="text-heading">
              {t('settings.masterPrompt', { defaultValue: 'Advanced — Master Prompt' })}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-lg border border-border-subtle bg-warning/5 px-4 py-3 text-sm text-secondary">
            {t('settings.masterPromptWarning', { defaultValue: 'Editing this affects every generation going forward. Use Reset if results get worse.' })}
          </div>
          {masterPromptLoaded ? (
            <Textarea
              value={masterPromptText}
              onChange={(e) => setMasterPromptText(e.target.value)}
              placeholder={t('settings.masterPromptPlaceholder', { defaultValue: 'The default master prompt will appear here...' })}
              className="min-h-[300px] font-mono text-sm"
            />
          ) : (
            <Skeleton className="h-[300px] w-full rounded-lg" />
          )}
          <div className="flex items-center gap-2">
            <Button onClick={handleSaveMasterPrompt} disabled={!String(masterPromptText ?? '').trim()}>
              <Save className="h-4 w-4" />
              {t('common.save')}
            </Button>
            <Button
              variant="outline"
              onClick={handleResetMasterPrompt}
              disabled={!savedCustomPrompt}
            >
              <RotateCcw className="h-4 w-4" />
              {t('templates.resetDefault', { defaultValue: 'Reset to Default' })}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function FieldRow({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={htmlFor} className="shrink-0 text-label-ui text-primary">
        {label}
      </label>
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  )
}

function SectionGroup({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted" />
        <span className="text-caption-ui text-secondary">{title}</span>
      </div>
      <div className="flex flex-col gap-4 pl-5">
        {children}
      </div>
    </div>
  )
}

function SectionDivider() {
  return <div className="border-t border-border-subtle" />
}
