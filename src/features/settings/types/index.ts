export interface AIConfigPreset {
  id: string
  name: string
  apiKey: string
  endpoint: string
  model: string
  createdAt: number
}

export interface AIConfig {
  apiKey: string
  endpoint: string
  model: string
}
