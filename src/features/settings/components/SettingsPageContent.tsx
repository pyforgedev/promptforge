import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Cpu, RefreshCw, CheckCircle2, AlertCircle, Save, Play,
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { useAIConfigStore } from '@/store/useAIConfigStore'
import { testConnection } from '@/services/ai/aiService'
import { Button } from '@/components/ui/button'
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
import { SectionDivider } from './Section'

export function SettingsPageContent() {
  const { t } = useTranslation()
  const { showToast } = useToast()

  const {
    activeConfig,
    isReady,
    setActiveConfig,
  } = useAIConfigStore()

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
      const debugMsg = err instanceof Error ? err.message : String(err)
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
        </>
      )}
    </div>
  )
}
