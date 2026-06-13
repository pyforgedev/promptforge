import type { AIRequest, AIResponse } from '@/types'

export async function sendPrompt(request: AIRequest): Promise<AIResponse> {
  const mockResponse: AIResponse = {
    content: `Mock response for: ${request.prompt.substring(0, 50)}...`,
    model: request.model,
    usage: {
      promptTokens: request.prompt.length,
      completionTokens: 100,
      totalTokens: request.prompt.length + 100,
    },
  }

  await new Promise((resolve) => setTimeout(resolve, 500))

  return mockResponse
}

export async function generateCompletion(prompt: string): Promise<string> {
  const response = await sendPrompt({
    prompt,
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2048,
  })
  return response.content
}
