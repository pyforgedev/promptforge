import { describe, it, expect, beforeEach } from 'vitest'
import { useAIConfigStore } from './useAIConfigStore'
import db, { saveSetting, getSetting } from '@/services/storage/indexeddb'
import { resetEncryptionCache } from '@/lib/crypto'
import { setPreferencesCache } from '@/lib/preferencesState'
import { ACTIVE_CONFIG_KEY, PRESETS_KEY, APP_PREFERENCES_KEY } from '@/lib/storageKeys'
import type { AIConfig, AIConfigPreset } from '@/features/settings/types'

const baseState = {
  presets: [] as AIConfigPreset[],
  activeConfig: null as AIConfig | null,
  isReady: true,
  isLoading: false,
  error: null as string | null,
  recoveryNeeded: false,
  recoveryKeys: [] as string[],
}

describe('useAIConfigStore', () => {
  beforeEach(() => {
    resetEncryptionCache()
    useAIConfigStore.setState(baseState)
  })

  it('sets active config', async () => {
    const config: AIConfig = {
      provider: 'openai',
      apiKey: 'test-key',
      model: 'gpt-4',
      endpoint: '',
    }

    await useAIConfigStore.getState().setActiveConfig(config)
    expect(useAIConfigStore.getState().activeConfig).toEqual(config)
  })

  it('saves and deletes presets', async () => {
    const preset: AIConfigPreset = {
      id: 'pr1',
      name: 'My OpenAI',
      provider: 'openai',
      apiKey: 'test-key',
      model: 'gpt-4',
      endpoint: '',
      createdAt: Date.now()
    }

    await useAIConfigStore.getState().savePreset(preset)
    expect(useAIConfigStore.getState().presets).toContainEqual(preset)

    await useAIConfigStore.getState().deletePreset('pr1')
    expect(useAIConfigStore.getState().presets).not.toContainEqual(preset)
  })

  it('loads persisted config and presets', async () => {
    const config: AIConfig = {
      provider: 'openai',
      apiKey: 'test-key',
      model: 'gpt-4',
      endpoint: 'https://api.openai.com/v1',
    }
    await saveSetting(ACTIVE_CONFIG_KEY, config)

    await useAIConfigStore.getState().loadConfigs()
    const state = useAIConfigStore.getState()
    expect(state.activeConfig).toEqual(config)
    expect(state.recoveryNeeded).toBe(false)
  })

  it('flags orphaned ciphertext as recoveryNeeded without throwing or leaking it', async () => {
    await db.settings.put({ key: ACTIVE_CONFIG_KEY, value: 'garbage-not-json-or-cipher' })

    await useAIConfigStore.getState().loadConfigs()
    const state = useAIConfigStore.getState()
    expect(state.activeConfig).toBeNull()
    expect(state.recoveryNeeded).toBe(true)
    expect(state.recoveryKeys).toContain(ACTIVE_CONFIG_KEY)
    expect(state.isReady).toBe(true)
  })

  it('clears orphaned records only on explicit action', async () => {
    await db.settings.put({ key: ACTIVE_CONFIG_KEY, value: 'garbage-not-json-or-cipher' })
    await useAIConfigStore.getState().loadConfigs()
    expect(useAIConfigStore.getState().recoveryNeeded).toBe(true)

    await useAIConfigStore.getState().clearOrphanedConfigs([ACTIVE_CONFIG_KEY])
    expect(useAIConfigStore.getState().recoveryNeeded).toBe(false)
    expect(useAIConfigStore.getState().recoveryKeys).toEqual([])
    expect(await db.settings.get(ACTIVE_CONFIG_KEY)).toBeUndefined()
  })

  it('resets recoveryNeeded after a successful save', async () => {
    await db.settings.put({ key: ACTIVE_CONFIG_KEY, value: 'garbage-not-json-or-cipher' })
    await useAIConfigStore.getState().loadConfigs()
    expect(useAIConfigStore.getState().recoveryNeeded).toBe(true)

    await useAIConfigStore.getState().setActiveConfig({
      provider: 'openai', apiKey: 'fresh', model: 'gpt-4', endpoint: '',
    })
    expect(useAIConfigStore.getState().recoveryNeeded).toBe(false)
  })

  it('keeps apiKey in memory but never persists it when rememberApiKey is off', async () => {
    await saveSetting(APP_PREFERENCES_KEY, { theme: 'dark', language: 'en', rememberApiKey: false })

    await useAIConfigStore.getState().setActiveConfig({
      provider: 'openai', apiKey: 'super-secret', model: 'gpt-4', endpoint: '',
    })

    const stored = await getSetting(ACTIVE_CONFIG_KEY) as AIConfig
    expect(stored.apiKey).toBe('')
    expect(stored.model).toBe('gpt-4')
    // In-memory state keeps the key for the current session
    expect(useAIConfigStore.getState().activeConfig?.apiKey).toBe('super-secret')
  })

  it('honors an immediate toggle-off even when persisted preferences lag behind', async () => {
    // Simulates: user flips the switch, then hits Apply before AppProvider's
    // async preferences-persist has flushed (DB still says rememberApiKey: true)
    await saveSetting(APP_PREFERENCES_KEY, { theme: 'dark', language: 'en', rememberApiKey: true })
    setPreferencesCache({ theme: 'dark', language: 'en', rememberApiKey: false })

    await useAIConfigStore.getState().setActiveConfig({
      provider: 'openai', apiKey: 'should-not-persist', model: 'gpt-4', endpoint: '',
    })

    const stored = await getSetting(ACTIVE_CONFIG_KEY) as AIConfig
    expect(stored.apiKey).toBe('')
    expect(useAIConfigStore.getState().activeConfig?.apiKey).toBe('should-not-persist')
  })

  it('strips apiKey from stored presets when rememberApiKey is off', async () => {
    await saveSetting(APP_PREFERENCES_KEY, { theme: 'dark', language: 'en', rememberApiKey: false })

    const preset: AIConfigPreset = {
      id: 'pr1', name: 'My OpenAI', provider: 'openai', apiKey: 'preset-secret', model: 'gpt-4', endpoint: '', createdAt: Date.now(),
    }
    await useAIConfigStore.getState().savePreset(preset)

    const stored = await getSetting(PRESETS_KEY) as AIConfigPreset[]
    expect(stored[0].apiKey).toBe('')
    expect(useAIConfigStore.getState().presets[0].apiKey).toBe('preset-secret')
  })

  it('forgetStoredApiKeys purges apiKey from what is already at rest', async () => {
    await saveSetting(ACTIVE_CONFIG_KEY, {
      provider: 'openai', apiKey: 'old-secret', model: 'gpt-4', endpoint: '',
    })
    await saveSetting(PRESETS_KEY, [{
      id: 'pr1', name: 'My OpenAI', provider: 'openai', apiKey: 'preset-secret', model: 'gpt-4', endpoint: '', createdAt: Date.now(),
    }])

    await useAIConfigStore.getState().forgetStoredApiKeys()

    const storedActive = await getSetting(ACTIVE_CONFIG_KEY) as AIConfig
    const storedPresets = await getSetting(PRESETS_KEY) as AIConfigPreset[]
    expect(storedActive.apiKey).toBe('')
    expect(storedActive.model).toBe('gpt-4')
    expect(storedPresets[0].apiKey).toBe('')
  })
})
