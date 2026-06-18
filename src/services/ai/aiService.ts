import axios, { type AxiosResponse } from 'axios'
import type { ZodSchema } from 'zod'
import type { AIRequest, AIResponse } from '@/types'
import type { AIConfig } from '@/features/settings/types'
import type { LLMClientInterface } from '@/features/prompt-generator/engine/PromptComposerEngine'
import { AI_ENDPOINTS } from '@/lib/constants'

// Provider Adapter Interface
interface ProviderAdapter {
  generate(request: AIRequest, config: AIConfig, signal?: AbortSignal): Promise<AIResponse>
  generateStream?(request: AIRequest, config: AIConfig, onChunk: (chunk: string) => void): Promise<void>
}

// Official Gemini Adapter
class GeminiAdapter implements ProviderAdapter {
  async generate(request: AIRequest, config: AIConfig, signal?: AbortSignal): Promise<AIResponse> {
    const baseUrl = config.endpoint || AI_ENDPOINTS.gemini
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    const url = `${cleanBaseUrl}/models/${config.model}:generateContent`
    
    const contents: unknown[] = []
    if (request.systemPrompt) {
      contents.push({ role: 'user', parts: [{ text: request.systemPrompt }] })
      contents.push({ role: 'model', parts: [{ text: 'OK' }] }) // Simulate Gemini acknowledging system prompt
    }
    contents.push({ role: 'user', parts: [{ text: request.prompt }] })

    const response = await axios.post(url, {
      contents,
      generationConfig: {
        temperature: request.temperature || 0.7,
        maxOutputTokens: request.maxTokens || 2048,
      }
    }, {
      headers: {
        'x-goog-api-key': config.apiKey
      },
      signal,
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
  async generate(request: AIRequest, config: AIConfig, signal?: AbortSignal): Promise<AIResponse> {
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
    
    const messages: { role: string; content: string }[] = []
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt })
    }
    messages.push({ role: 'user', content: request.prompt })

    const response = await axios.post(
      url,
      {
        model: config.model,
        messages,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 2048,
      },
      { headers, signal }
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
    
    const messages: { role: string; content: string }[] = []
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt })
    }
    messages.push({ role: 'user', content: request.prompt })

    const response = await axios.post(
      url,
      {
        model: config.model,
        messages,
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
          } catch {
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

export class AIService implements LLMClientInterface {
  private config: AIConfig
  constructor(config: AIConfig) {
    this.config = config
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    return generateCompletion(userPrompt, this.config, undefined, systemPrompt)
  }
}


async function sendPrompt(request: AIRequest, config: AIConfig, signal?: AbortSignal): Promise<AIResponse> {
  const adapter = ProviderFactory.getAdapter(config.provider)
  return adapter.generate(request, config, signal)
}

export async function testConnection(config: AIConfig): Promise<boolean> {
  const knownEndpoints: Record<string, string> = { ...AI_ENDPOINTS }
  const baseUrl = (config.endpoint || knownEndpoints[config.provider] || AI_ENDPOINTS.openai).replace(/\/+$/, '')

  if (config.provider === 'gemini') {
    const url = `${baseUrl}/models/${config.model}:generateContent`
    await axios.post(url, { contents: [{ parts: [{ text: 'hi' }] }] }, {
      headers: { 'x-goog-api-key': config.apiKey },
      timeout: 10000,
    })
    return true
  }

  const url = baseUrl.includes('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`
  const res: AxiosResponse = await axios.post(url, {
    model: config.model,
    messages: [{ role: 'user', content: 'hi' }],
    max_tokens: 1,
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    timeout: 10000,
  })

  if (!res.data?.choices?.[0]) {
    throw new Error('Invalid response from AI API.')
  }

  return true
}

export async function generateCompletion(prompt: string, config: AIConfig, signal?: AbortSignal, systemPrompt?: string): Promise<string> {
  const response = await sendPrompt({
    prompt,
    systemPrompt, // Pass systemPrompt
    model: config.model,
    temperature: 0.7,
    maxTokens: 2048,
  }, config, signal)
  return response.content
}

function extractJSON(text: string): string {
  // First try to find markdown JSON block
  const match = text.match(/```(?:json)?[\s\S]*?([\s\S]*?)[\s\S]*?```/i)
  if (match && match[1]) {
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
  config: AIConfig,
  systemPrompt?: string // AGENT NOTE: Added systemPrompt for MetaPromptBuilder
): Promise<T> {
  const response = await sendPrompt({
    prompt,
    systemPrompt, // Pass systemPrompt
    model: config.model,
    temperature: 0.1, // Lower temperature for more deterministic JSON
    maxTokens: 300, // Optimized limit for structured outputs
  }, config)

  try {
    const jsonStr = extractJSON(response.content)
    const parsed = JSON.parse(jsonStr)
    return schema.parse(parsed)
  } catch (error) {
    throw new Error(`Failed to parse structured output from AI. Error: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
  }
}

export async function generateStructuredStream<T>(
  prompt: string,
  schema: ZodSchema<T>,
  config: AIConfig,
  onPartial: (partialData: Partial<T>) => void,
  systemPrompt?: string // AGENT NOTE: Added systemPrompt for MetaPromptBuilder
): Promise<T> {
  const adapter = ProviderFactory.getAdapter(config.provider)
  
  if (!adapter.generateStream) {
    // Fallback to non-streaming if provider doesn't support it
    return generateStructured(prompt, schema, config, systemPrompt)
  }

  let fullResponse = ''
  
  await adapter.generateStream({
    prompt,
    systemPrompt, // Pass systemPrompt
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
    } catch {
      // Ignore partial parse errors
    }
  })

  try {
    const jsonStr = extractJSON(fullResponse)
    const parsed = JSON.parse(jsonStr)
    return schema.parse(parsed)
  } catch (error) {
    throw new Error(`Failed to parse structured stream output from AI.`, { cause: error })
  }
}
