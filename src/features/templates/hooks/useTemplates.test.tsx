import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import db from '@/services/storage/db'
import { createTemplate, seedDefaultTemplateOnce } from '@/features/templates/services/templateService'
import { useTemplates } from './useTemplates'

const validTemplate = {
  name: 'Reactive Template',
  content: 'A reusable prompt body',
  category: 'general' as const,
  tags: ['test'],
}

describe('useTemplates', () => {
  it('reacts to template table writes without an explicit reload', async () => {
    await seedDefaultTemplateOnce()
    const { result } = renderHook(() => useTemplates())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await createTemplate(validTemplate)
    })

    await waitFor(() => {
      expect(result.current.templates.some((template) => template.name === validTemplate.name)).toBe(true)
    })

    await act(async () => {
      const saved = await db.prompts.where('nameKey').equals('reactive template').first()
      await db.prompts.delete(saved!.id)
    })

    await waitFor(() => {
      expect(result.current.templates.some((template) => template.name === validTemplate.name)).toBe(false)
    })
  })

  it('reports action failures separately from a successful live load and can clear them', async () => {
    await seedDefaultTemplateOnce()
    const { result } = renderHook(() => useTemplates())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.loadError).toBeNull()

    await act(async () => {
      await expect(result.current.create({ ...validTemplate, name: '' })).rejects.toMatchObject({ code: 'INVALID_DATA' })
    })

    expect(result.current.actionError).toBe('INVALID_DATA')
    expect(result.current.loadError).toBeNull()

    act(() => result.current.clearActionError())
    expect(result.current.actionError).toBeNull()
  })
})
