import { ALLOWED_PROTOCOLS } from './constants'
import type { AIConfig } from '@/features/settings/types'

export function validateAIConfig(config: AIConfig): string | null {
  if (!config.apiKey || !config.apiKey.trim()) {
    return 'API Key is required'
  }
  if (!config.endpoint || !config.endpoint.trim()) {
    return 'Endpoint is required'
  }
  if (!config.model || !config.model.trim()) {
    return 'Model is required'
  }

  try {
    const url = new URL(config.endpoint)
    if (config.provider !== 'custom' && !ALLOWED_PROTOCOLS.includes(url.protocol as typeof ALLOWED_PROTOCOLS[number])) {
      return 'Official providers must use HTTPS'
    }
  } catch {
    return 'Endpoint must be a valid URL'
  }

  if (config.provider === 'openai' && !config.apiKey.startsWith('sk-')) {
    // Note: Some newer OpenAI keys might not start with sk-, 
    // but keeping per reviewer suggestion for now or making it provider specific.
    return 'OpenAI API Key usually starts with sk-'
  }

  return null
}
