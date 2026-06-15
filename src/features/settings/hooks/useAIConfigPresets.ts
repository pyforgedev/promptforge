import { useState, useEffect, useCallback } from 'react'
import {
  getPresets,
  savePreset,
  deletePreset,
  getActiveConfig,
  setActiveConfig,
  getCustomModels,
  saveCustomModel,
  deleteCustomModel,
} from '../services/settingsService'
import type { AIConfigPreset, AIConfig } from '../types'

const CSRF_TOKEN = 'promptforge-csrf-token'

function getCSRFToken(): string {
  let token = localStorage.getItem(CSRF_TOKEN)
  if (!token) {
    token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    localStorage.setItem(CSRF_TOKEN, token)
  }
  return token
}

function validateAIConfig(config: AIConfig): string | null {
  if (!config.apiKey || !config.apiKey.trim()) {
    return 'API Key is required'
  }
  if (!config.endpoint || !config.endpoint.trim()) {
    return 'Endpoint is required'
  }
  if (!config.model || !config.model.trim()) {
    return 'Model is required'
  }
  if (!config.apiKey.startsWith('sk-')) {
    return 'API Key must start with sk-'
  }
  if (!config.endpoint.startsWith('http')) {
    return 'Endpoint must be a valid URL'
  }
  return null
}

function handleError(error: unknown): string {
  if (error instanceof Error) {
    return error.message || 'An unexpected error occurred'
  }
  return 'An unexpected error occurred'
}

interface UseAIConfigPresetsReturn {
  presets: AIConfigPreset[]
  activeConfig: AIConfig | null
  customModels: string[]
  loading: boolean
  saving: boolean
  error: string | null
  save: (name: string, config: AIConfig) => Promise<void>
  remove: (id: string) => Promise<void>
  loadPreset: (preset: AIConfigPreset) => Promise<void>
  setConfig: (config: AIConfig) => Promise<void>
  refresh: () => Promise<void>
  exportPresets: () => string
  importPresets: (json: string) => Promise<void>
  addCustomModel: (model: string) => Promise<void>
  removeCustomModel: (model: string) => Promise<void>
}

export function useAIConfigPresets(): UseAIConfigPresetsReturn {
  const [presets, setPresets] = useState<AIConfigPreset[]>([])
  const [activeConfig, setActive] = useState<AIConfig | null>(null)
  const [customModels, setCustomModels] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [p, c, m] = await Promise.all([getPresets(), getActiveConfig(), getCustomModels()])
      setPresets(p)
      setActive(c)
      setCustomModels(m)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      await refresh()
    }
    void load()
  }, [refresh])

  const save = useCallback(async (name: string, config: AIConfig) => {
    setSaving(true)
    setError(null)
    try {
      const validationError = validateAIConfig(config)
      if (validationError) {
        throw new Error(validationError)
      }
      const csrfToken = getCSRFToken()
      if (!csrfToken) {
        throw new Error('CSRF token missing')
      }
      await savePreset(name, config)
      await refresh()
    } catch (err) {
      setError(handleError(err))
    } finally {
      setSaving(false)
    }
  }, [refresh])

  const remove = useCallback(async (id: string) => {
    setError(null)
    try {
      await deletePreset(id)
      setPresets((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete preset')
    }
  }, [])

  const loadPreset = useCallback(async (preset: AIConfigPreset) => {
    setError(null)
    try {
      const config: AIConfig = {
        apiKey: preset.apiKey,
        endpoint: preset.endpoint,
        model: preset.model,
      }
      await setActiveConfig(config)
      setActive(config)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preset')
    }
  }, [])

  const setConfig = useCallback(async (config: AIConfig) => {
    setError(null)
    try {
      await setActiveConfig(config)
      setActive(config)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config')
    }
  }, [])

  const exportPresets = useCallback(() => {
    return JSON.stringify({ presets, activeConfig }, null, 2)
  }, [presets, activeConfig])

  const importPresets = useCallback(async (json: string) => {
    setError(null)
    try {
      const data = JSON.parse(json)
      if (data.presets && Array.isArray(data.presets)) {
        for (const p of data.presets) {
          await savePreset(p.name, {
            apiKey: p.apiKey,
            endpoint: p.endpoint,
            model: p.model,
          })
        }
      }
      if (data.activeConfig) {
        await setActiveConfig(data.activeConfig)
      }
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import presets')
    }
  }, [refresh])

  const addCustomModel = useCallback(async (model: string) => {
    setError(null)
    try {
      const updated = await saveCustomModel(model)
      setCustomModels(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add custom model')
    }
  }, [])

  const removeCustomModel = useCallback(async (model: string) => {
    setError(null)
    try {
      const updated = await deleteCustomModel(model)
      setCustomModels(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete custom model')
    }
  }, [])

  return {
    presets,
    activeConfig,
    customModels,
    loading,
    saving,
    error,
    save,
    remove,
    loadPreset,
    setConfig,
    refresh,
    exportPresets,
    importPresets,
    addCustomModel,
    removeCustomModel,
  }
}
