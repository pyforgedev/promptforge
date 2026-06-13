import { useState, useEffect, useCallback } from 'react'
import type { Prompt } from '@/types'
import {
  getAllPrompts,
  createPrompt,
  updatePrompt,
  deletePrompt,
} from '@/features/prompts/services/promptService'
import type { CreatePromptInput, UpdatePromptInput } from '@/features/prompts/types'

interface UsePromptsReturn {
  prompts: Prompt[]
  loading: boolean
  creating: boolean
  updating: boolean
  deleting: boolean
  error: string | null
  create: (input: CreatePromptInput) => Promise<Prompt>
  update: (input: UpdatePromptInput) => Promise<Prompt>
  remove: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

export function usePrompts(): UsePromptsReturn {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAllPrompts()
      setPrompts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const create = useCallback(async (input: CreatePromptInput) => {
    setCreating(true)
    setError(null)
    try {
      const prompt = await createPrompt(input)
      setPrompts((prev) => [prompt, ...prev])
      return prompt
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create prompt'
      setError(message)
      throw err
    } finally {
      setCreating(false)
    }
  }, [])

  const update = useCallback(async (input: UpdatePromptInput) => {
    setUpdating(true)
    setError(null)
    try {
      const prompt = await updatePrompt(input)
      setPrompts((prev) => prev.map((p) => (p.id === prompt.id ? prompt : p)))
      return prompt
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update prompt'
      setError(message)
      throw err
    } finally {
      setUpdating(false)
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    setDeleting(true)
    setError(null)
    try {
      await deletePrompt(id)
      setPrompts((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete prompt'
      setError(message)
      throw err
    } finally {
      setDeleting(false)
    }
  }, [])

  return { prompts, loading, creating, updating, deleting, error, create, update, remove, refresh }
}
