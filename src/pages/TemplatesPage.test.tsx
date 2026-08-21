import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, userEvent, waitFor, within } from '@/test/utils'
import TemplatesPage from '@/pages/TemplatesPage'

function renderPage() {
  return renderWithProviders(<TemplatesPage />, { route: '/templates', routePath: '/templates' })
}

const toolbarActions = [
  {
    label: 'Import',
    buttonClasses: ['md:w-auto', 'md:px-4'],
    labelClasses: ['hidden', 'md:inline'],
    tooltipClass: 'md:hidden',
  },
  {
    label: 'Export',
    buttonClasses: ['lg:w-auto', 'lg:px-4'],
    labelClasses: ['hidden', 'lg:inline'],
    tooltipClass: 'lg:hidden',
  },
  {
    label: 'Reset Default',
    buttonClasses: ['xl:w-auto', 'xl:px-4'],
    labelClasses: ['hidden', 'xl:inline'],
    tooltipClass: 'xl:hidden',
  },
  {
    label: 'Create Template',
    buttonClasses: ['sm:w-auto', 'sm:px-4'],
    labelClasses: ['hidden', 'sm:inline'],
    tooltipClass: 'sm:hidden',
  },
] as const

describe('TemplatesPage toolbar responsiveness', () => {
  it('uses a wrapping flex toolbar inside a shrinkable PageHeader action wrapper', () => {
    const { container } = renderPage()

    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')
    expect(fileInput).not.toBeNull()

    const toolbar = fileInput!.parentElement!
    expect(toolbar).toHaveClass('flex', 'flex-wrap', 'items-center', 'gap-2')

    const wrapper = toolbar.parentElement!
    expect(wrapper).toHaveClass('min-w-0')
    expect(wrapper).not.toHaveClass('shrink-0')
  })

  it.each(toolbarActions)(
    'renders exactly one $label icon button with reciprocal responsive label classes',
    ({ label, buttonClasses, labelClasses }) => {
      renderPage()

      const buttons = screen.getAllByRole('button', { name: label })
      expect(buttons).toHaveLength(1)

      const button = buttons[0]
      expect(button).toHaveAttribute('aria-label', label)
      expect(button).toHaveClass('h-10', 'w-10', ...buttonClasses)

      const translatedLabels = button.querySelectorAll('span')
      expect(translatedLabels).toHaveLength(1)
      expect(translatedLabels[0].textContent).toBe(label)
      expect(translatedLabels[0]).toHaveClass(...labelClasses)
    },
  )

  it('shows the exact tooltip contract for every action, including disabled triggers', async () => {
    const user = userEvent.setup()
    renderPage()

    for (const { label, tooltipClass } of toolbarActions) {
      const button = screen.getByRole('button', { name: label })
      const trigger = button.parentElement!
      expect(trigger.tagName).toBe('SPAN')
      expect(trigger).toHaveClass('inline-flex')
      expect(within(trigger).getAllByRole('button', { name: label })).toHaveLength(1)

      await user.hover(trigger)

      const tooltip = await screen.findByRole('tooltip')
      expect(tooltip.textContent).toBe(label)
      expect(tooltip.parentElement).toHaveClass(tooltipClass)

      await user.keyboard('{Escape}')
      await user.unhover(trigger)
      await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
    }
  })

  it('keeps one hidden .txt input, delegates Import once, and initially disables Export', async () => {
    const user = userEvent.setup()
    const { container } = renderPage()

    const fileInputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]')
    expect(fileInputs).toHaveLength(1)

    const fileInput = fileInputs[0]
    expect(fileInput).toHaveAttribute('accept', '.txt')
    expect(fileInput).toHaveClass('hidden')

    const exportButton = screen.getByRole('button', { name: 'Export' })
    expect(exportButton).toBeDisabled()

    const inputClick = vi.spyOn(fileInput, 'click').mockImplementation(() => {})
    await user.click(screen.getByRole('button', { name: 'Import' }))
    expect(inputClick).toHaveBeenCalledTimes(1)
  })
})

describe('TemplatesPage category filter', () => {
  it('lets users search canonical categories and shows the selected category in the trigger', async () => {
    const user = userEvent.setup()
    renderPage()

    // The filters render only after the initial template load completes.
    await screen.findByPlaceholderText('Search templates by name or content...')

    const categoryTrigger = screen.getByRole('button', { name: 'Category' })
    await user.click(categoryTrigger)

    const categorySearch = screen.getByPlaceholderText('Search...')
    const listbox = screen.getByRole('listbox')
    expect(categorySearch).toBeInTheDocument()

    await user.type(categorySearch, 'Technology')

    expect(within(listbox).getByText('Technology')).toBeInTheDocument()
    expect(within(listbox).queryByText('Business')).not.toBeInTheDocument()

    await user.click(within(listbox).getByText('Technology'))

    expect(categoryTrigger).toHaveTextContent('Technology')
  })
})
