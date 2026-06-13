export interface GenerateInput {
  prompt: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface GenerateResult {
  content: string
  model: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}
