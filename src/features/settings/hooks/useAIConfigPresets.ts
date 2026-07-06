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
import { sanitizeError } from '@/lib/sanitizeError'
import type { AIConfigPreset, AIConfig } from '../types'
import { validateAIConfig } from '@/lib/validation'

function handleError(error: unknown, context: string): string {
  if (import.meta.env.DEV) {
    console.warn(`[AIConfigPresets] ${context} failed:`, sanitizeError(error))
  }
  return `Failed to ${context}`
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
      setError(handleError(err, 'load settings'))
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
      await savePreset(name, config)
      await refresh()
    } catch (err) {
      setError(handleError(err, 'save preset'))
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
      setError(handleError(err, 'delete preset'))
    }
  }, [])

  const loadPreset = useCallback(async (preset: AIConfigPreset) => {
    setError(null)
    try {
      const config: AIConfig = {
        provider: preset.provider,
        apiKey: preset.apiKey,
        endpoint: preset.endpoint,
        model: preset.model,
      }
      await setActiveConfig(config)
      setActive(config)
    } catch (err) {
      setError(handleError(err, 'load preset'))
    }
  }, [])

  const setConfig = useCallback(async (config: AIConfig) => {
    setError(null)
    try {
      await setActiveConfig(config)
      setActive(config)
    } catch (err) {
      setError(handleError(err, 'save config'))
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
            provider: p.provider || 'openai',
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
      setError(handleError(err, 'import presets'))
    }
  }, [refresh])

  const addCustomModel = useCallback(async (model: string) => {
    setError(null)
    try {
      const updated = await saveCustomModel(model)
      setCustomModels(updated)
    } catch (err) {
      setError(handleError(err, 'add custom model'))
    }
  }, [])

  const removeCustomModel = useCallback(async (model: string) => {
    setError(null)
    try {
      const updated = await deleteCustomModel(model)
      setCustomModels(updated)
    } catch (err) {
      setError(handleError(err, 'delete custom model'))
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
