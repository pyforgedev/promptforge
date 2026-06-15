import { v4 as uuidv4 } from 'uuid'
import { saveSetting, getSetting } from '@/services/storage/indexeddb'
import type { AIConfigPreset, AIConfig } from '../types'

const PRESETS_KEY = 'ai-config-presets'
const ACTIVE_CONFIG_KEY = 'ai-active-config'

export async function getPresets(): Promise<AIConfigPreset[]> {
  const data = await getSetting(PRESETS_KEY)
  return Array.isArray(data) ? data : []
}

export async function savePreset(
  name: string,
  config: AIConfig,
): Promise<AIConfigPreset> {
  const presets = await getPresets()
  const existing = presets.find((p) => p.name === name)
  if (existing) {
    const updated: AIConfigPreset = {
      ...existing,
      ...config,
      createdAt: Date.now(),
    }
    const newPresets = presets.map((p) => (p.id === existing.id ? updated : p))
    await saveSetting(PRESETS_KEY, newPresets)
    return updated
  }

  const preset: AIConfigPreset = {
    id: uuidv4(),
    name,
    ...config,
    createdAt: Date.now(),
  }
  await saveSetting(PRESETS_KEY, [...presets, preset])
  return preset
}

export async function deletePreset(id: string): Promise<void> {
  const presets = await getPresets()
  await saveSetting(PRESETS_KEY, presets.filter((p) => p.id !== id))
}

export async function getActiveConfig(): Promise<AIConfig | null> {
  const data = await getSetting(ACTIVE_CONFIG_KEY)
  return data as AIConfig | null
}

export async function setActiveConfig(config: AIConfig): Promise<void> {
  await saveSetting(ACTIVE_CONFIG_KEY, config)
}

const CUSTOM_MODELS_KEY = 'custom-models'

export async function getCustomModels(): Promise<string[]> {
  const data = await getSetting(CUSTOM_MODELS_KEY)
  return Array.isArray(data) ? data : []
}

export async function saveCustomModel(model: string): Promise<string[]> {
  const models = await getCustomModels()
  const trimmed = model.trim()
  if (trimmed && !models.includes(trimmed)) {
    const updated = [...models, trimmed]
    await saveSetting(CUSTOM_MODELS_KEY, updated)
    return updated
  }
  return models
}

export async function deleteCustomModel(model: string): Promise<string[]> {
  const models = await getCustomModels()
  const updated = models.filter((m) => m !== model)
  await saveSetting(CUSTOM_MODELS_KEY, updated)
  return updated
}
