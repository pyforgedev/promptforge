import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, RefreshCw, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAppContext } from '@/hooks/useAppContext'
import { useToast } from '@/hooks/useToast'
import { useAIConfigStore } from '@/store/useAIConfigStore'
import { getCustomModels, saveCustomModel, deleteCustomModel } from '@/features/settings/services/settingsService'
import { testConnection } from '@/services/ai/aiService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { PageHeader } from '@/components/common/PageHeader'
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

  const [customModels, setCustomModels] = useState<string[]>([])
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
  const { showToast } = useToast()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApiKey(activeConfig?.apiKey || '')
    setEndpoint(activeConfig?.endpoint || '')
    setModel(activeConfig?.model || 'gpt-4')
    setProvider(activeConfig?.provider || 'openai')
  }, [activeConfig])

  // Load custom models
  useEffect(() => {
    const load = async () => {
      const models = await getCustomModels()
      setCustomModels(models)
    }
    load()
  }, [])

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
        createdAt: Date.now()
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
      showToast('success', t('settings.testSuccess', { defaultValue: 'Connection successful!' }))
    } catch (err) {
      setTestResult('error')
      const msg = err instanceof Error ? err.message : 'Connection failed'
      showToast('error', t('settings.testFailed', { defaultValue: `Connection failed: ${msg}`, message: msg }))
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

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader
        title={t('nav.settings')}
        description={t('settings.pageDescription')}
      />

      {/* Theme & Language */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('settings.preferences')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">
              {t('settings.theme')}
            </label>
            <Select
              value={preferences.theme}
              onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t('theme.light')}</SelectItem>
                <SelectItem value="dark">{t('theme.dark')}</SelectItem>
                <SelectItem value="system">{t('theme.system')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">
              {t('settings.language')}
            </label>
            <Select
              value={i18n.language?.startsWith('id') ? 'id' : 'en'}
              onValueChange={(v) => {
                setLanguage(v)
                i18n.changeLanguage(v)
              }}
            >
              <SelectTrigger className="w-36 h-8 px-3 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t('language.en')}</SelectItem>
                <SelectItem value="id">{t('language.id')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* AI Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('settings.aiConfig')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="provider" className="text-sm font-medium text-foreground">
              {t('settings.provider')}
            </label>
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
                <SelectItem value="custom">Custom (9router / Local / Other)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="api-key" className="text-sm font-medium text-foreground">
              {t('settings.apiKey')}
            </label>
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
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="endpoint" className="text-sm font-medium text-foreground">
              {t('settings.endpoint')}
            </label>
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
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="model" className="text-sm font-medium text-foreground">
              {t('settings.model')}
            </label>
            <Select value={model} onValueChange={(v) => {
              setModel(v)
              setTestResult(null)
            }}>
              <SelectTrigger className="w-full">
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
          </div>

          <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3">
            <label className="text-sm font-medium text-foreground">
              {t('settings.addCustomModel')}
            </label>
            <div className="flex gap-2">
              <Input
                value={newCustomModel}
                onChange={(e) => setNewCustomModel(e.target.value)}
                placeholder="e.g. gpt-4o"
                className="h-9"
              />
              <Button variant="secondary"
                size="sm"
                className="h-9"
                onClick={async () => {
                  if (newCustomModel.trim()) {
                    const updated = await saveCustomModel(newCustomModel.trim())
                    setCustomModels(updated)
                    setModel(newCustomModel.trim())
                    setNewCustomModel('')
                    showToast('success', t('toast.modelAdded', { defaultValue: 'Custom model added' }))
                  }
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                {t('common.add')}
              </Button>
            </div>
            {customModels.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {customModels.map((m) => (
                  <div
                    key={m}
                    className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
                  >
                    <span>{m}</span>
                    <button
                      onClick={async () => {
                        const updated = await deleteCustomModel(m)
                        setCustomModels(updated)
                        showToast('success', t('toast.modelRemoved', { defaultValue: 'Custom model removed' }))
                      }}
                      className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 items-center">
            <Button onClick={handleApplyConfig} disabled={isApplying}>
              {isApplying && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              {t('settings.apply')}
            </Button>
            <Button variant="secondary" onClick={handleTestConnection} disabled={isTesting || !apiKey || !endpoint}>
              {isTesting ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : testResult === 'success' ? (
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
              ) : testResult === 'error' ? (
                <AlertCircle className="mr-2 h-4 w-4 text-destructive" />
              ) : null}
              {t('settings.testConnection', { defaultValue: 'Test Connection' })}
            </Button>
            <Button variant="outline" onClick={() => setPresetDialogOpen(true)}>
              {t('settings.savePreset')}
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                {t('settings.savedPresets')}
              </label>
              <div className="flex gap-2">
                <input
                  type="file"
                  id="import-file"
                  className="hidden"
                  accept=".json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const text = await file.text()
                    setImportText(text)
                    setImportOpen(true)
                  }}
                />
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => document.getElementById('import-file')?.click()}>
                  {t('settings.importPresets')}
                </Button>
                {presets.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={handleExport}>
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
                    className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {preset.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {preset.model}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          setProvider(preset.provider || 'openai')
                          setApiKey(preset.apiKey)
                          setEndpoint(preset.endpoint)
                          setModel(preset.model)
                          setTestResult(null)
                          showToast('success', t('toast.presetLoaded', { defaultValue: 'Preset loaded' }))
                        }}
                      >
                        {t('settings.load')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletePresetId(preset.id)}
                      >
                        {t('common.delete')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {t('settings.noPresets', { defaultValue: 'No presets saved. Import or create one.' })}
                </p>
              </div>
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
            <div className="flex flex-col gap-1.5">
              <label htmlFor="preset-name" className="text-sm font-medium">
                {t('settings.presetName')}
              </label>
              <Input
                id="preset-name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="My Preset"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPresetDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSavePreset} disabled={!presetName.trim()}>
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
            <textarea
              rows={8}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='{"presets": [...]}'
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setImportOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleImport} disabled={!importText.trim()}>
                {t('settings.importPresets')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Preset Confirmation Dialog */}
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
