import { saveSetting, getSetting } from '@/services/storage/indexeddb'

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
