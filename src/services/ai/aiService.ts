import axios from 'axios'
import type { AIRequest, AIResponse } from '@/types'
import type { AIConfig } from '@/features/settings/types'

// Provider Adapter Interface
interface ProviderAdapter {
  generate(request: AIRequest, config: AIConfig): Promise<AIResponse>
}

// Official Gemini Adapter
class GeminiAdapter implements ProviderAdapter {
  async generate(request: AIRequest, config: AIConfig): Promise<AIResponse> {
    const baseUrl = config.endpoint.endsWith('/') ? config.endpoint.slice(0, -1) : config.endpoint
    const url = `${baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`
    
    const response = await axios.post(url, {
      contents: [{
        parts: [{ text: request.prompt }]
      }],
      generationConfig: {
        temperature: request.temperature || 0.7,
        maxOutputTokens: request.maxTokens || 2048,
      }
    })

    if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Gemini API.')
    }

    return {
      content: response.data.candidates[0].content.parts[0].text,
      model: config.model,
      usage: {
        promptTokens: response.data.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.data.usageMetadata?.totalTokenCount || 0,
      },
    }
  }
}

// Standard OpenAI (also handles OpenRouter & Custom) Adapter
class OpenAIAdapter implements ProviderAdapter {
  async generate(request: AIRequest, config: AIConfig): Promise<AIResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    }

    if (config.provider === 'openrouter') {
      headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'https://promptforge.ai'
      headers['X-Title'] = 'PromptForge'
    }

    const url = config.endpoint.endsWith('/chat/completions') 
      ? config.endpoint 
      : `${config.endpoint.endsWith('/') ? config.endpoint.slice(0, -1) : config.endpoint}/chat/completions`

    const response = await axios.post(
      url,
      {
        model: config.model,
        messages: [{ role: 'user', content: request.prompt }],
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 2048,
      },
      { headers }
    )

    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from AI API.')
    }

    return {
      content: response.data.choices[0].message.content,
      model: config.model,
      usage: response.data.usage || {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    }
  }
}

// Provider Factory
class ProviderFactory {
  static getAdapter(provider: string): ProviderAdapter {
    switch (provider) {
      case 'gemini':
        return new GeminiAdapter()
      case 'openai':
      case 'openrouter':
      case 'custom':
        return new OpenAIAdapter()
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }
  }
}

export async function sendPrompt(request: AIRequest, config: AIConfig): Promise<AIResponse> {
  if (!config?.apiKey || !config?.endpoint || !config?.model) {
    throw new Error('AI configuration is incomplete.')
  }

  try {
    const adapter = ProviderFactory.getAdapter(config.provider)
    return await adapter.generate(request, config)
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMsg = error.response?.data?.error?.message || 
                       error.response?.data?.error ||
                       error.message || 
                       'Failed to connect to AI API.'
      throw new Error(errorMsg)
    }
    throw error
  }
}

export async function testConnection(config: AIConfig): Promise<boolean> {
  await sendPrompt({
    prompt: 'hi',
    model: config.model,
    temperature: 0.1,
    maxTokens: 5,
  }, config)
  return true
}

export async function generateCompletion(prompt: string, config: AIConfig): Promise<string> {
  const response = await sendPrompt({
    prompt,
    model: config.model,
    temperature: 0.7,
    maxTokens: 2048,
  }, config)
  return response.content
}
