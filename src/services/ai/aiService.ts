import axios from 'axios'
import { z, type ZodSchema } from 'zod'
import type { AIRequest, AIResponse } from '@/types'
import type { AIConfig } from '@/features/settings/types'
import { validateAIConfig } from '@/lib/validation'
import { AI_ENDPOINTS } from '@/lib/constants'

// Provider Adapter Interface
interface ProviderAdapter {
  generate(request: AIRequest, config: AIConfig): Promise<AIResponse>
  generateStream?(request: AIRequest, config: AIConfig, onChunk: (chunk: string) => void): Promise<void>
}

// Official Gemini Adapter
class GeminiAdapter implements ProviderAdapter {
  async generate(request: AIRequest, config: AIConfig): Promise<AIResponse> {
    const baseUrl = config.endpoint || AI_ENDPOINTS.gemini
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    const url = `${cleanBaseUrl}/models/${config.model}:generateContent`
    
    const response = await axios.post(url, {
      contents: [{
        parts: [{ text: request.prompt }]
      }],
      generationConfig: {
        temperature: request.temperature || 0.7,
        maxOutputTokens: request.maxTokens || 2048,
      }
    }, {
      headers: {
        'x-goog-api-key': config.apiKey
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

    const baseUrl = config.endpoint || AI_ENDPOINTS.openai
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    const url = cleanBaseUrl.endsWith('/chat/completions') 
      ? cleanBaseUrl 
      : `${cleanBaseUrl}/chat/completions`

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

  async generateStream(request: AIRequest, config: AIConfig, onChunk: (chunk: string) => void): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    }

    if (config.provider === 'openrouter') {
      headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'https://promptforge.ai'
      headers['X-Title'] = 'PromptForge'
    }

    const baseUrl = config.endpoint || AI_ENDPOINTS.openai
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    const url = cleanBaseUrl.endsWith('/chat/completions') 
      ? cleanBaseUrl 
      : `${cleanBaseUrl}/chat/completions`

    const response = await axios.post(
      url,
      {
        model: config.model,
        messages: [{ role: 'user', content: request.prompt }],
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 2048,
        stream: true,
      },
      { 
        headers,
        responseType: 'stream',
        adapter: 'fetch' // Use fetch adapter for streaming in browser
      }
    )

    const reader = response.data.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6))
            const chunk = data.choices?.[0]?.delta?.content
            if (chunk) {
              onChunk(chunk)
            }
          } catch (e) {
            // Ignore parse errors on partial chunks
          }
        }
      }
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
  const validationError = validateAIConfig(config)
  if (validationError) {
    throw new Error(validationError)
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
      throw new Error(errorMsg, { cause: error })
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

function extractJSON(text: string): string {
  // First try to find markdown JSON block
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (match) {
    const content = match[1].trim()
    if (content.startsWith('{')) return content
  }
  
  // Otherwise try to find the first '{' and last '}'
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1)
  }
  
  return text
}

export async function generateStructured<T>(
  prompt: string, 
  schema: ZodSchema<T>, 
  config: AIConfig
): Promise<T> {
  const response = await sendPrompt({
    prompt,
    model: config.model,
    temperature: 0.1, // Lower temperature for more deterministic JSON
    maxTokens: 300, // Optimized limit for structured outputs
  }, config)

  try {
    const jsonStr = extractJSON(response.content)
    const parsed = JSON.parse(jsonStr)
    return schema.parse(parsed)
  } catch (error) {
    throw new Error(`Failed to parse structured output from AI. Error: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function generateStructuredStream<T>(
  prompt: string,
  schema: ZodSchema<T>,
  config: AIConfig,
  onPartial: (partialData: Partial<T>) => void
): Promise<T> {
  const adapter = ProviderFactory.getAdapter(config.provider)
  
  if (!adapter.generateStream) {
    // Fallback to non-streaming if provider doesn't support it
    return generateStructured(prompt, schema, config)
  }

  let fullResponse = ''
  
  await adapter.generateStream({
    prompt,
    model: config.model,
    temperature: 0.1,
    maxTokens: 300, // Optimized limit for structured outputs
  }, config, (chunk) => {
    fullResponse += chunk
    try {
      const jsonStr = extractJSON(fullResponse)
      if (jsonStr) {
        // Attempt to parse partial JSON
        // Using a permissive parse for partial updates could go here, 
        // but for now we just try strict parse and ignore if incomplete
        const parsed = JSON.parse(jsonStr)
        onPartial(parsed)
      }
    } catch (e) {
      // Ignore partial parse errors
    }
  })

  try {
    const jsonStr = extractJSON(fullResponse)
    const parsed = JSON.parse(jsonStr)
    return schema.parse(parsed)
  } catch (error) {
    throw new Error(`Failed to parse structured stream output from AI.`)
  }
}
