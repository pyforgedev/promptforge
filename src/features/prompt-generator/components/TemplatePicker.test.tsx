import { renderWithProviders, screen, waitFor, within } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePromptGeneratorStore } from '@/features/prompt-generator/store/promptGeneratorStore'
import { TemplatePicker } from './TemplatePicker'

const mocks = vi.hoisted(() => ({ useTemplates: vi.fn(), success: vi.fn() }))
vi.mock('@/features/templates/hooks/useTemplates', () => ({ useTemplates: mocks.useTemplates }))
vi.mock('sonner', () => ({ toast: { success: mocks.success } }))

const templates = [
  {
    id: 'full', name: 'Full Template', content: 'full reference', category: 'general', tags: ['full'],
    createdAt: 1, updatedAt: 1, source: 'manual' as const,
    generatorSettings: { niche: 'Loaded niche', targetPlatform: 'nano_banana' as const },
  },
  {
    id: 'text', name: 'Text Template', content: 'reference-only content', category: 'general', tags: [],
    createdAt: 2, updatedAt: 2, source: 'manual' as const,
  },
]

async function selectTemplate(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('button', { name: 'Prompt Template' }))
  await user.click(within(screen.getByRole('listbox')).getByText(name))
}

describe('TemplatePicker', () => {
  beforeEach(() => {
    mocks.success.mockReset()
    mocks.useTemplates.mockReturnValue({ templates, loading: false, loadError: null })
    usePromptGeneratorStore.setState((state) => ({
      input: { ...state.input, niche: '', basePromptReference: undefined },
      activeTemplateReference: null,
      advancedOptionsOpen: false,
    }))
  })

  it('applies generator settings only after the explicit load-settings action', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TemplatePicker />)

    await selectTemplate(user, 'Full Template')
    expect(usePromptGeneratorStore.getState().input.niche).toBe('')

    await user.click(screen.getByRole('button', { name: /Load settings/i }))

    expect(usePromptGeneratorStore.getState().input).toMatchObject({
      niche: 'Loaded niche', targetPlatform: 'nano_banana',
    })
    expect(usePromptGeneratorStore.getState().activeTemplateReference).toEqual({
      id: 'full', name: 'Full Template', mode: 'settings',
    })
  })

  it('sets a text reference and clears it from the active chip', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TemplatePicker />)

    await selectTemplate(user, 'Text Template')
    expect(screen.getByRole('button', { name: /Load settings/i })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /Use as reference/i }))

    expect(usePromptGeneratorStore.getState().input.basePromptReference).toBe('reference-only content')
    expect(screen.getByText('Reference: Text Template')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Clear active template/i }))
    await waitFor(() => expect(usePromptGeneratorStore.getState().activeTemplateReference).toBeNull())
    expect(usePromptGeneratorStore.getState().input.basePromptReference).toBeUndefined()
  })
})
