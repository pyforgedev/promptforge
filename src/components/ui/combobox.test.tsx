import { describe, it, expect, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Combobox, type ComboboxOption } from './combobox'
import { renderWithProviders } from '@/test/utils'

describe('Combobox UI Component', () => {
  const options: ComboboxOption[] = [
    { value: 'option-1', label: 'Option 1', icon: <span data-testid="icon-1">Icon 1</span> },
    { value: 'option-2', label: 'Option 2', icon: <span data-testid="icon-2">Icon 2</span> },
    { value: 'option-3', label: 'Option 3' },
  ]

  it('renders trigger with placeholder when no value is selected', () => {
    renderWithProviders(
      <Combobox options={options} value="" onValueChange={vi.fn()} placeholder="Choose..." />
    )
    expect(screen.getByRole('button', { name: 'Choose...' })).toBeInTheDocument()
    expect(screen.getByText('Choose...')).toBeInTheDocument()
  })

  it('renders optional icon in trigger when selected option has icon', () => {
    renderWithProviders(
      <Combobox options={options} value="option-1" onValueChange={vi.fn()} />
    )
    const icon = screen.getByTestId('icon-1')
    expect(icon).toBeInTheDocument()
    expect(icon.parentElement?.parentElement).toHaveClass('flex', 'items-center')
    expect(screen.getByText('Option 1')).toBeInTheDocument()
  })

  it('filters options when typing in search input', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Combobox options={options} value="" onValueChange={vi.fn()} />
    )

    await user.click(screen.getByRole('button'))
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()

    const listbox = screen.getByRole('listbox')
    expect(within(listbox).getByText('Option 1')).toBeInTheDocument()
    expect(within(listbox).getByText('Option 2')).toBeInTheDocument()
    expect(within(listbox).getByText('Option 3')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Search...'), '2')

    expect(within(listbox).queryByText('Option 1')).not.toBeInTheDocument()
    expect(within(listbox).getByText('Option 2')).toBeInTheDocument()
    expect(within(listbox).queryByText('Option 3')).not.toBeInTheDocument()
  })

  it('matches the popover width and animation origin to the trigger', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Combobox options={options} value="" onValueChange={vi.fn()} />
    )

    await user.click(screen.getByRole('button'))

    const content = screen.getByRole('listbox').parentElement?.parentElement
    expect(content).toHaveClass('w-[var(--radix-popover-trigger-width)]')
    expect(content).toHaveClass('origin-[var(--radix-popover-content-transform-origin)]')
  })

  it('can render popup content inline for use inside a modal focus scope', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(
      <Combobox
        options={options}
        value=""
        onValueChange={vi.fn()}
        portalled={false}
      />
    )

    await user.click(screen.getByRole('button'))

    const content = screen.getByRole('listbox').parentElement?.parentElement
    expect(container).toContainElement(content ?? null)
    expect(content).toHaveClass('z-dropdown')
  })

  it('forwards aria-invalid to the trigger', () => {
    renderWithProviders(
      <Combobox
        options={options}
        value=""
        onValueChange={vi.fn()}
        aria-invalid
      />
    )

    expect(screen.getByRole('button')).toHaveAttribute('aria-invalid', 'true')
  })

  it('renders check icon ONLY for selected option', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Combobox options={options} value="option-2" onValueChange={vi.fn()} />
    )

    await user.click(screen.getByRole('button'))

    const listbox = screen.getByRole('listbox')

    const opt2Element = within(listbox).getByText('Option 2').closest('[cmdk-item]')
    expect(opt2Element?.querySelector('.lucide-check')).toBeInTheDocument()

    const opt1Element = within(listbox).getByText('Option 1').closest('[cmdk-item]')
    expect(opt1Element?.querySelector('.lucide-check')).toBeNull()

    const opt3Element = within(listbox).getByText('Option 3').closest('[cmdk-item]')
    expect(opt3Element?.querySelector('.lucide-check')).toBeNull()
  })

  it('calls onValueChange when an option is clicked', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    renderWithProviders(
      <Combobox options={options} value="option-1" onValueChange={onValueChange} />
    )

    await user.click(screen.getByRole('button'))
    const listbox = screen.getByRole('listbox')
    await user.click(within(listbox).getByText('Option 3'))

    expect(onValueChange).toHaveBeenCalledWith('option-3')
  })
})
