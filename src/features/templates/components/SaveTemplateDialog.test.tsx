import { renderWithProviders, screen, waitFor } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TemplateError } from '@/features/templates/services/templateService'
import { SaveTemplateDialog } from './SaveTemplateDialog'

const mocks = vi.hoisted(() => ({
  useTemplates: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('@/features/templates/hooks/useTemplates', () => ({ useTemplates: mocks.useTemplates }))
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error } }))

const input = {
  name: 'Saved Prompt',
  content: 'Reusable prompt content',
  category: 'general' as const,
  tags: [],
  source: 'history' as const,
}

describe('SaveTemplateDialog', () => {
  beforeEach(() => {
    mocks.useTemplates.mockReset()
    mocks.success.mockReset()
    mocks.error.mockReset()
  })

  it('closes only after template creation succeeds', async () => {
    const user = userEvent.setup()
    const create = vi.fn().mockResolvedValue({ id: 'saved' })
    const onOpenChange = vi.fn()
    mocks.useTemplates.mockReturnValue({
      create, actionError: null, pendingAction: null, clearActionError: vi.fn(),
    })

    renderWithProviders(
      <SaveTemplateDialog
        input={input}
        open
        onOpenChange={onOpenChange}
        titleKey="templates.save.dialogTitle"
        successKey="templates.toast.savedFromHistory"
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(create).toHaveBeenCalled())
    expect(create.mock.calls[0][0]).toMatchObject(input)
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(mocks.success).toHaveBeenCalledOnce()
  })

  it('keeps the dialog open and renders the duplicate error when creation is rejected', async () => {
    const user = userEvent.setup()
    const create = vi.fn().mockRejectedValue(new TemplateError('DUPLICATE_NAME'))
    const onOpenChange = vi.fn()
    mocks.useTemplates.mockReturnValue({
      create, actionError: 'DUPLICATE_NAME', pendingAction: null, clearActionError: vi.fn(),
    })

    renderWithProviders(
      <SaveTemplateDialog
        input={input}
        open
        onOpenChange={onOpenChange}
        titleKey="templates.save.dialogTitle"
        successKey="templates.toast.savedFromHistory"
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('A template with this name already exists')

    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(create).toHaveBeenCalled())

    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(mocks.error).toHaveBeenCalledOnce()
  })
})
