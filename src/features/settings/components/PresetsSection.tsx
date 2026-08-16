import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Upload, Download, Save, FileJson, RotateCcw, Trash2,
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { getErrorMessage } from '@/lib/sanitizeError'
import { downloadFile } from '@/lib/download'
import { useAIConfigStore } from '@/store/useAIConfigStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { AIConfigPreset, AIProvider } from '@/features/settings/types'
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
import { EmptyState } from '@/components/common/EmptyState'
import { FieldRow } from './Section'

interface PresetsSectionProps {
  provider: AIProvider
  apiKey: string
  endpoint: string
  model: string
  onLoadPreset: (preset: AIConfigPreset) => void
}

export function PresetsSection({
  provider,
  apiKey,
  endpoint,
  model,
  onLoadPreset,
}: PresetsSectionProps) {
  const { t } = useTranslation()
  const { presets, activeConfig, savePreset, deletePreset, setActiveConfig } = useAIConfigStore()
  const { showToast } = useToast()

  const [presetDialogOpen, setPresetDialogOpen] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [importText, setImportText] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [deletePresetId, setDeletePresetId] = useState<string | null>(null)

  const importFileRef = useRef<HTMLInputElement>(null)

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
      showToast('success', t('toast.presetSaved', { defaultValue: 'Preset saved' }))
    } catch (err) {
      const debugMsg = getErrorMessage(err)
      showToast('error', import.meta.env.DEV ? debugMsg : t('toast.saveFailed', { defaultValue: 'Failed to save preset' }))
    }
  }

  const handleExport = () => {
    const data = { presets, activeConfig }
    downloadFile(JSON.stringify(data, null, 2), 'promptforge-ai-presets.json', 'application/json')
    showToast('success', t('toast.exportSuccess', { defaultValue: 'Presets exported' }))
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
      showToast('success', t('toast.importSuccess', { defaultValue: 'Presets imported' }))
    } catch (err) {
      const debugMsg = getErrorMessage(err)
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

  const handleLoadPreset = (preset: AIConfigPreset) => {
    onLoadPreset(preset)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-label-ui text-primary">
          {t('settings.savedPresets')}
        </span>
        <div className="flex gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-caption-ui"
            onClick={() => setPresetDialogOpen(true)}
          >
            <Save className="h-3.5 w-3.5" />
            {t('settings.savePreset')}
          </Button>
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
              className="group flex items-center justify-between rounded-lg border border-border-subtle bg-surface px-4 py-3 transition-all hover:border-border-strong hover:bg-surface-hover card-spotlight"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-label-ui text-primary">
                  {preset.name}
                </span>
                <span className="text-caption-ui text-muted">
                  {preset.provider} &middot; {preset.model}
                </span>
              </div>
              <div className="flex gap-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
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
                    showToast('success', t('toast.presetDeleted', { defaultValue: 'Preset deleted' }))
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
    </div>
  )
}
