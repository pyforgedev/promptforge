import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Cpu, RefreshCw, CheckCircle2, AlertCircle, Save, Play, TriangleAlert,
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { getErrorMessage } from '@/lib/sanitizeError'
import { useAIConfigStore } from '@/store/useAIConfigStore'
import { useAppContext } from '@/hooks/useAppContext'
import { testConnection } from '@/services/ai/aiService'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/PageHeader'
import { validateAIConfig } from '@/lib/validation'
import type { AIConfigPreset, AIProvider } from '@/features/settings/types'
import { AIProviderSection } from './AIProviderSection'
import { ModelSection } from './ModelSection'
import { PresetsSection } from './PresetsSection'
import { MasterPromptSection } from './MasterPromptSection'
import { HistoryStorageSection } from './HistoryStorageSection'
import { SectionDivider } from './Section'

export function SettingsPageContent() {
  const { t } = useTranslation()
  const { showToast } = useToast()

  const {
    activeConfig,
    isReady,
    setActiveConfig,
    recoveryNeeded,
    recoveryKeys,
    clearOrphanedConfigs,
    forgetStoredApiKeys,
  } = useAIConfigStore()

  const { preferences, setRememberApiKey } = useAppContext()
  const rememberApiKey = preferences.rememberApiKey !== false

  const handleForgetApiKeys = async () => {
    try {
      await forgetStoredApiKeys()
      showToast('success', t('settings.apiKeysForgotten', { defaultValue: 'Stored API keys removed' }))
    } catch {
      showToast('error', t('settings.apiKeysForgetFailed', { defaultValue: 'Failed to remove stored API keys' }))
    }
  }

  const handleClearOrphaned = async () => {
    try {
      await clearOrphanedConfigs(recoveryKeys)
      showToast('success', t('settings.orphanCleared', { defaultValue: 'Unrecoverable configuration cleared' }))
    } catch {
      showToast('error', t('settings.orphanClearFailed', { defaultValue: 'Failed to clear unrecoverable configuration' }))
    }
  }

  const [provider, setProvider] = useState<AIProvider>(activeConfig?.provider || 'openai')
  const [apiKey, setApiKey] = useState(activeConfig?.apiKey || '')
  const [endpoint, setEndpoint] = useState(activeConfig?.endpoint || '')
  const [model, setModel] = useState(activeConfig?.model || 'gpt-4')
  const [isApplying, setIsApplying] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApiKey(activeConfig?.apiKey || '')
    setEndpoint(activeConfig?.endpoint || '')
    setModel(activeConfig?.model || 'gpt-4')
    setProvider(activeConfig?.provider || 'openai')
  }, [activeConfig])

  const handleProviderChange = (v: AIProvider) => {
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
  }

  const handleApiKeyChange = (value: string) => {
    setApiKey(value)
    setTestResult(null)
  }

  const handleEndpointChange = (value: string) => {
    setEndpoint(value)
    setTestResult(null)
  }

  const handleModelChange = (value: string) => {
    setModel(value)
    setTestResult(null)
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
      showToast('success', t('toast.configApplied', { defaultValue: 'Configuration applied' }))
    } catch (err) {
      const debugMsg = getErrorMessage(err)
      showToast('error', import.meta.env.DEV ? debugMsg : t('toast.applyFailed', { defaultValue: 'Failed to apply configuration' }))
    } finally {
      setIsApplying(false)
    }
  }

  const handleLoadPreset = (preset: AIConfigPreset) => {
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

      {!isReady ? (
        <div className="flex flex-col gap-6" role="status" aria-live="polite">
          <Skeleton className="h-[400px] w-full rounded-xl" />
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>
      ) : (
        <>
          {recoveryNeeded && (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-xl border border-brand-danger/30 bg-brand-danger/10 p-4"
            >
              <div className="flex items-center gap-2">
                <TriangleAlert className="h-4 w-4 shrink-0 text-brand-danger" />
                <p className="text-sm text-primary">
                  {t('settings.configRecoverBanner', {
                    defaultValue: 'Your saved API configuration could not be restored. It was encrypted with a previous session-only key that no longer exists. Re-enter it to continue.',
                  })}
                </p>
              </div>
              <Button variant="destructive" onClick={handleClearOrphaned} className="w-fit">
                {t('settings.clearAndReenter', { defaultValue: 'Clear & re-enter' })}
              </Button>
            </div>
          )}

          <Card className="card-spotlight">
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
              <AIProviderSection
                provider={provider}
                apiKey={apiKey}
                endpoint={endpoint}
                onProviderChange={handleProviderChange}
                onApiKeyChange={handleApiKeyChange}
                onEndpointChange={handleEndpointChange}
              />

              <SectionDivider />

              <ModelSection
                provider={provider}
                model={model}
                onModelChange={handleModelChange}
              />

              <SectionDivider />

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleApplyConfig} disabled={isApplying}>
                  {isApplying ? (
                    <RefreshCw className="h-4 w-4 animate-pulse" />
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
                    <RefreshCw className="h-4 w-4 animate-pulse" />
                  ) : testResult === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-brand-success" />
                  ) : testResult === 'error' ? (
                    <AlertCircle className="h-4 w-4 text-brand-danger" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {t('settings.testConnection', { defaultValue: 'Test Connection' })}
                </Button>
              </div>

              <SectionDivider />

              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-label-ui text-primary">
                    {t('settings.sessionOnlyKey', { defaultValue: "Don't remember API key between sessions" })}
                  </span>
                  <span className="text-caption-ui text-secondary">
                    {t('settings.sessionOnlyKeyDescription', { defaultValue: 'When enabled, your API key is never saved to disk — you will re-enter it on every visit. Endpoint and model are still remembered.' })}
                  </span>
                  {!rememberApiKey && (
                    <button
                      type="button"
                      onClick={handleForgetApiKeys}
                      className="mt-1 w-fit text-caption-ui font-medium text-brand-primary underline-offset-4 hover:underline"
                    >
                      {t('settings.removeStoredKeys', { defaultValue: 'Remove API keys already stored' })}
                    </button>
                  )}
                </div>
                <Switch
                  checked={!rememberApiKey}
                  onCheckedChange={(checked) => {
                    setRememberApiKey(!checked)
                    if (checked) void handleForgetApiKeys()
                  }}
                  aria-label={t('settings.sessionOnlyKey', { defaultValue: "Don't remember API key between sessions" })}
                />
              </div>

              <SectionDivider />

              <PresetsSection
                provider={provider}
                apiKey={apiKey}
                endpoint={endpoint}
                model={model}
                onLoadPreset={handleLoadPreset}
              />
            </CardContent>
          </Card>

          <MasterPromptSection />

          <HistoryStorageSection />
        </>
      )}
    </div>
  )
}
