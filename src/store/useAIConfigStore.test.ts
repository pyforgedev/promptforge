import { describe, it, expect, beforeEach } from 'vitest'
import { useAIConfigStore } from './useAIConfigStore'
import type { AIConfig, AIConfigPreset } from '@/features/settings/types'

describe('useAIConfigStore', () => {
  beforeEach(() => {
    useAIConfigStore.setState({
      presets: [],
      activeConfig: null,
      isReady: true,
      isLoading: false,
      error: null,
    })
  })

  it('sets active config', async () => {
    const config: AIConfig = {
      provider: 'openai',
      apiKey: 'test-key',
      model: 'gpt-4',
    }

    await useAIConfigStore.getState().setActiveConfig(config)
    expect(useAIConfigStore.getState().activeConfig).toEqual(config)
  })

  it('saves and deletes presets', async () => {
    const preset: AIConfigPreset = {
      id: 'pr1',
      name: 'My OpenAI',
      config: {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
      }
    }

    await useAIConfigStore.getState().savePreset(preset)
    expect(useAIConfigStore.getState().presets).toContainEqual(preset)

    await useAIConfigStore.getState().deletePreset('pr1')
    expect(useAIConfigStore.getState().presets).not.toContainEqual(preset)
  })
})
