import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Plus } from 'lucide-react'
import { useAppContext } from '@/hooks/useAppContext'
import { useAIConfigPresets } from '@/features/settings/hooks/useAIConfigPresets'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

export default function Settings() {
  const { t, i18n } = useTranslation()
  const { preferences, setTheme, setLanguage } = useAppContext()
  const {
    presets,
    activeConfig,
    customModels,
    saving,
    error,
    save,
    remove,
    loadPreset,
    setConfig,
    exportPresets,
    importPresets,
    addCustomModel,
    removeCustomModel,
  } = useAIConfigPresets()

  const [presetDialogOpen, setPresetDialogOpen] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [apiKey, setApiKey] = useState(activeConfig?.apiKey ?? '')
  const [endpoint, setEndpoint] = useState(activeConfig?.endpoint ?? '')
  const [model, setModel] = useState(activeConfig?.model ?? 'gpt-4')
  const [newCustomModel, setNewCustomModel] = useState('')
  const [importText, setImportText] = useState('')
  const [importOpen, setImportOpen] = useState(false)

  const handleSavePreset = async () => {
    if (!presetName.trim()) return
    await save(presetName.trim(), { apiKey, endpoint, model })
    setPresetName('')
    setPresetDialogOpen(false)
  }

  const handleApplyConfig = () => {
    setConfig({ apiKey, endpoint, model })
  }

  const handleExport = () => {
    const json = exportPresets()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'promptforge-ai-presets.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    if (!importText.trim()) return
    await importPresets(importText)
    setImportText('')
    setImportOpen(false)
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
              value={i18n.language}
              onValueChange={(v) => {
                setLanguage(v)
                i18n.changeLanguage(v)
              }}
            >
              <SelectTrigger className="w-36">
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
            <label htmlFor="api-key" className="text-sm font-medium text-foreground">
              {t('settings.apiKey')}
            </label>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={apiKey ? `sk-...${apiKey.slice(-4)}` : 'sk-...'}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="endpoint" className="text-sm font-medium text-foreground">
              {t('settings.endpoint')}
            </label>
            <Input
              id="endpoint"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://api.openai.com/v1"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="model" className="text-sm font-medium text-foreground">
              {t('settings.model')}
            </label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4">GPT-4</SelectItem>
                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
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
              Add Custom Model
            </label>
            <div className="flex gap-2">
              <Input
                value={newCustomModel}
                onChange={(e) => setNewCustomModel(e.target.value)}
                placeholder="e.g. gpt-4o"
                className="h-9"
              />
              <Button
                variant="secondary"
                size="sm"
                className="h-9"
                onClick={() => {
                  if (newCustomModel.trim()) {
                    addCustomModel(newCustomModel.trim())
                    setModel(newCustomModel.trim())
                    setNewCustomModel('')
                  }
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add
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
                      onClick={() => removeCustomModel(m)}
                      className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleApplyConfig}>
              {t('settings.apply')}
            </Button>
            <Button variant="outline" onClick={() => setPresetDialogOpen(true)}>
              {t('settings.savePreset')}
            </Button>
          </div>

          {presets.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                {t('settings.savedPresets')}
              </label>
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
                        onClick={() => loadPreset(preset)}
                      >
                        {t('settings.load')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => remove(preset.id)}
                      >
                        {t('common.delete')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-1">
                <Button variant="outline" size="sm" onClick={handleExport}>
                  {t('settings.exportPresets')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                  {t('settings.importPresets')}
                </Button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Save Preset Dialog */}
      <Dialog open={presetDialogOpen} onOpenChange={setPresetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.savePreset')}</DialogTitle>
            <DialogDescription />
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
              <Button onClick={handleSavePreset} disabled={saving || !presetName.trim()}>
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
            <DialogDescription />
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
    </div>
  )
}
