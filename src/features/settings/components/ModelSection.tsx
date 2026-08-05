import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Network, Plus, X } from 'lucide-react'
import {
  getCustomModels,
  saveCustomModel,
  deleteCustomModel,
} from '@/features/settings/services/settingsService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/useToast'
import type { AIProvider } from '@/features/settings/types'
import { FieldRow, SectionGroup } from './Section'

interface ModelSectionProps {
  provider: AIProvider
  model: string
  onModelChange: (model: string) => void
}

export function ModelSection({ provider, model, onModelChange }: ModelSectionProps) {
  const { t } = useTranslation()
  const { showToast } = useToast()

  const [customModels, setCustomModels] = useState<string[]>([])
  const [customModelsLoading, setCustomModelsLoading] = useState(true)
  const [newCustomModel, setNewCustomModel] = useState('')

  useEffect(() => {
    const load = async () => {
      setCustomModelsLoading(true)
      try {
        const models = await getCustomModels()
        setCustomModels(models)
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[Settings] Failed to load custom models:', err)
        setCustomModels([])
      } finally {
        setCustomModelsLoading(false)
      }
    }
    load()
  }, [])

  const handleAddCustomModel = async () => {
    if (!newCustomModel.trim()) return
    const updated = await saveCustomModel(newCustomModel.trim())
    setCustomModels(updated)
    onModelChange(newCustomModel.trim())
    setNewCustomModel('')
    showToast('success', t('toast.modelAdded', { defaultValue: 'Custom model added' }))
  }

  const handleRemoveCustomModel = async (m: string) => {
    const updated = await deleteCustomModel(m)
    setCustomModels(updated)
    showToast('success', t('toast.modelRemoved', { defaultValue: 'Custom model removed' }))
  }

  return (
    <SectionGroup icon={Network} title={t('settings.modelSection', { defaultValue: 'Model' })}>
      <FieldRow label={t('settings.model')} htmlFor="model-select">
        <Select value={model} onValueChange={onModelChange}>
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
  )
}
