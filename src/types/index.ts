export type Theme = 'light' | 'dark' | 'system'

export interface AppPreferences {
  theme: Theme
  language: string
}

export interface Prompt {
  id: string
  name: string
  content: string
  category: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface AIServiceConfig {
  provider: string
  apiKey: string
  model: string
}

export interface AIRequest {
  prompt: string
  systemPrompt?: string // AGENT NOTE: Added for PromptComposerEngine to support system prompts
  model: string
  temperature: number
  maxTokens: number
}

export interface AIResponse {
  content: string
  model: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}
