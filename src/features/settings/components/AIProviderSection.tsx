import { useTranslation } from 'react-i18next'
import { Key } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AIProvider } from '@/features/settings/types'
import { FieldRow, SectionGroup } from './Section'

interface AIProviderSectionProps {
  provider: AIProvider
  apiKey: string
  endpoint: string
  onProviderChange: (provider: AIProvider) => void
  onApiKeyChange: (value: string) => void
  onEndpointChange: (value: string) => void
}

export function AIProviderSection({
  provider,
  apiKey,
  endpoint,
  onProviderChange,
  onApiKeyChange,
  onEndpointChange,
}: AIProviderSectionProps) {
  const { t } = useTranslation()

  return (
    <SectionGroup icon={Key} title={t('settings.connection', { defaultValue: 'Connection' })}>
      <FieldRow label={t('settings.provider')} htmlFor="provider">
        <Select
          value={provider}
          onValueChange={(v) => onProviderChange(v as AIProvider)}
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
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder={t('settings.apiKeyPlaceholder', { defaultValue: 'Enter API Key' })}
        />
      </FieldRow>

      <FieldRow label={t('settings.endpoint')} htmlFor="endpoint">
        <Input
          id="endpoint"
          value={endpoint}
          onChange={(e) => onEndpointChange(e.target.value)}
          placeholder="https://api.openai.com/v1"
          disabled={provider !== 'custom'}
        />
      </FieldRow>
      {provider === 'custom' && (
        <p className="pl-5 text-caption-ui text-secondary">
          {t('settings.customEndpointHint', {
            defaultValue: 'Your custom endpoint must be HTTPS and allowed by the site’s Content Security Policy (connect-src).',
          })}
        </p>
      )}
    </SectionGroup>
  )
}
