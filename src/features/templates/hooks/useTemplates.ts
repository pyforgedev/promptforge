import { useCallback, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  createTemplate,
  deleteTemplate,
  getAllTemplates,
  importTemplatesBatch,
  resetDefaultTemplate,
  seedDefaultTemplateOnce,
  TemplateError,
  updateTemplate,
} from '@/features/templates/services/templateService'
import type { TemplateErrorCode } from '@/features/templates/services/templateService'
import type {
  CreateTemplateInput,
  ImportTemplatesSummary,
  PromptTemplate,
  UpdateTemplateInput,
} from '@/features/templates/types'

type TemplateAction = 'create' | 'update' | 'delete' | 'import' | 'reset'

interface TemplatesQueryResult {
  templates: PromptTemplate[]
  error: TemplateErrorCode | null
}

function errorCode(error: unknown): TemplateErrorCode {
  return error instanceof TemplateError ? error.code : 'STORAGE_FAILED'
}

export function useTemplates() {
  const [pendingAction, setPendingAction] = useState<TemplateAction | null>(null)
  const [actionError, setActionError] = useState<TemplateErrorCode | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [initializationError, setInitializationError] = useState<TemplateErrorCode | null>(null)

  useEffect(() => {
    let active = true
    seedDefaultTemplateOnce()
      .catch((error) => {
        if (active) setInitializationError(errorCode(error))
      })
      .finally(() => {
        if (active) setInitialized(true)
      })
    return () => { active = false }
  }, [])

  const result = useLiveQuery<TemplatesQueryResult>(async () => {
    if (!initialized || initializationError) {
      return { templates: [], error: initializationError }
    }
    try {
      return { templates: await getAllTemplates(), error: null }
    } catch (error) {
      return { templates: [], error: errorCode(error) }
    }
  }, [initialized, initializationError])

  const run = useCallback(async <T,>(action: TemplateAction, operation: () => Promise<T>) => {
    setPendingAction(action)
    setActionError(null)
    try {
      return await operation()
    } catch (error) {
      setActionError(errorCode(error))
      throw error
    } finally {
      setPendingAction(null)
    }
  }, [])

  const create = useCallback(
    (input: CreateTemplateInput) => run('create', () => createTemplate(input)),
    [run],
  )
  const update = useCallback(
    (input: UpdateTemplateInput) => run('update', () => updateTemplate(input)),
    [run],
  )
  const remove = useCallback(
    (id: string) => run('delete', () => deleteTemplate(id)),
    [run],
  )
  const importBatch = useCallback(
    (records: unknown[]): Promise<ImportTemplatesSummary> =>
      run('import', () => importTemplatesBatch(records)),
    [run],
  )
  const resetDefault = useCallback(
    () => run('reset', resetDefaultTemplate),
    [run],
  )
  const clearActionError = useCallback(() => setActionError(null), [])

  return {
    templates: result?.templates ?? [],
    loading: !initialized || result === undefined,
    loadError: initializationError ?? result?.error ?? null,
    actionError,
    pendingAction,
    create,
    update,
    remove,
    importBatch,
    resetDefault,
    clearActionError,
  }
}
