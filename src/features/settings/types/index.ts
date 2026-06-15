export type AIProvider = 'openai' | 'gemini' | 'openrouter' | 'custom'

export interface AIConfig {
  provider: AIProvider
  apiKey: string
  endpoint: string
  model: string
}

export interface AIConfigPreset extends AIConfig {
  id: string
  name: string
  createdAt: number
}
