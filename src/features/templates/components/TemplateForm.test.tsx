import { renderWithProviders, screen, waitFor } from '@/test/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TemplateForm } from './TemplateForm'

describe('TemplateForm', () => {
  it('submits the canonical general category by default', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderWithProviders(<TemplateForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText('Name'), 'General Template')
    await user.type(screen.getByLabelText('Content'), 'Canonical content')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: 'General Template', content: 'Canonical content', category: 'general', tags: [],
    })
  })

  it('keeps an unknown initial category available as an explicit legacy option', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <TemplateForm
        initialData={{ name: 'Old', content: 'Old content', category: 'custom-old', tags: [] }}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Category' }))
    const categorySearch = screen.getByRole('combobox')

    await user.type(categorySearch, 'legacy')

    expect(screen.getByRole('option', { name: 'custom-old (legacy)' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'General' })).not.toBeInTheDocument()
  })

  it('filters canonical categories by label and submits the selected category', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderWithProviders(
      <TemplateForm
        initialData={{ name: 'Tech', content: 'Technology content', category: 'general', tags: [] }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Category' }))
    await user.type(screen.getByRole('combobox'), 'Technology')

    expect(screen.queryByRole('option', { name: 'General' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: 'Technology' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: 'Tech', content: 'Technology content', category: 'technology', tags: [],
    })
  })

  it('keeps the category popup above a real dialog and allows selection', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Edit template</DialogTitle>
          <DialogDescription>Update the template details.</DialogDescription>
          <TemplateForm
            initialData={{ name: 'Dialog template', content: 'Dialog content', category: 'general', tags: [] }}
            onSubmit={vi.fn().mockResolvedValue(undefined)}
            onCancel={vi.fn()}
          />
        </DialogContent>
      </Dialog>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Edit template' })
    const categoryTrigger = screen.getByRole('button', { name: 'Category' })

    await user.click(categoryTrigger)

    const listbox = screen.getByRole('listbox')
    const popupContent = listbox.parentElement?.parentElement
    expect(dialog).toContainElement(popupContent ?? null)
    expect(popupContent).toHaveClass('z-dropdown')

    await user.click(screen.getByRole('option', { name: 'Technology' }))
    expect(categoryTrigger).toHaveTextContent('Technology')
  })

  it('renders translated schema validation messages rather than translation keys', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TemplateForm onSubmit={vi.fn()} onCancel={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(screen.getByText('Content is required')).toBeInTheDocument()
    expect(screen.queryByText('templates.validation.nameRequired')).not.toBeInTheDocument()
  })

  it('shows a translated submit error and disables both actions while pending', () => {
    renderWithProviders(
      <TemplateForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        submitError="DUPLICATE_NAME"
        pending
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('A template with this name already exists')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('keeps actions disabled while an asynchronous submission is unresolved', async () => {
    const user = userEvent.setup()
    let resolveSubmission!: () => void
    const submission = new Promise<void>((resolve) => { resolveSubmission = resolve })
    renderWithProviders(
      <TemplateForm
        initialData={{ name: 'Pending', content: 'Content', category: 'general', tags: [] }}
        onSubmit={() => submission}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()

    resolveSubmission()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled())
  })
})
