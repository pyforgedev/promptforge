import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnimatedList } from './AnimatedList'
import { render } from '@/test/utils'

describe('AnimatedList', () => {
  const items = ['Alpha', 'Beta', 'Gamma', 'Delta']

  it('renders every item as a listbox option', () => {
    render(<AnimatedList items={items} />)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(4)
    for (const item of items) {
      expect(screen.getByRole('option', { name: item })).toBeInTheDocument()
    }
  })

  it('selects and reports an item on click (uncontrolled)', async () => {
    const user = userEvent.setup()
    const onItemSelect = vi.fn()
    render(<AnimatedList items={items} onItemSelect={onItemSelect} />)

    await user.click(screen.getByRole('option', { name: 'Gamma' }))

    expect(onItemSelect).toHaveBeenCalledWith('Gamma', 2)
    expect(screen.getByRole('option', { name: 'Gamma' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('ignores arrow keys when the listbox is not focused', async () => {
    const user = userEvent.setup()
    render(<AnimatedList items={items} />)

    await user.keyboard('{ArrowDown}')

    expect(screen.getByRole('option', { name: 'Alpha' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })

  it('moves the selection with arrow keys and confirms with Enter (uncontrolled)', async () => {
    const user = userEvent.setup()
    const onItemSelect = vi.fn()
    render(
      <AnimatedList items={items} initialSelectedIndex={0} onItemSelect={onItemSelect} />,
    )

    screen.getByRole('listbox').focus()
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{ArrowDown}')

    expect(screen.getByRole('option', { name: 'Gamma' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await user.keyboard('{Enter}')
    expect(onItemSelect).toHaveBeenCalledWith('Gamma', 2)
  })

  it('clamps arrow navigation at the list bounds (uncontrolled)', async () => {
    const user = userEvent.setup()
    render(<AnimatedList items={items} initialSelectedIndex={0} />)

    screen.getByRole('listbox').focus()
    await user.keyboard('{ArrowUp}')

    expect(screen.getByRole('option', { name: 'Alpha' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('follows the controlled selectedIndex prop and reports navigation (controlled)', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    const { rerender } = render(
      <AnimatedList items={items} selectedIndex={1} onNavigate={onNavigate} />,
    )

    expect(screen.getByRole('option', { name: 'Beta' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    screen.getByRole('listbox').focus()
    await user.keyboard('{ArrowDown}')
    expect(onNavigate).toHaveBeenCalledWith(2)

    rerender(<AnimatedList items={items} selectedIndex={2} onNavigate={onNavigate} />)
    expect(screen.getByRole('option', { name: 'Gamma' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('does not move the controlled selection on hover but still reports clicks', async () => {
    const user = userEvent.setup()
    const onItemSelect = vi.fn()
    render(
      <AnimatedList items={items} selectedIndex={1} onItemSelect={onItemSelect} />,
    )

    await user.hover(screen.getByRole('option', { name: 'Delta' }))

    expect(screen.getByRole('option', { name: 'Beta' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await user.click(screen.getByRole('option', { name: 'Alpha' }))
    expect(onItemSelect).toHaveBeenCalledWith('Alpha', 0)
  })

  it('does not navigate on a no-op move at the list bounds', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<AnimatedList items={items} selectedIndex={3} onNavigate={onNavigate} />)

    screen.getByRole('listbox').focus()
    await user.keyboard('{ArrowDown}')

    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('ignores keyboard navigation when the list is empty', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    const onItemSelect = vi.fn()
    render(<AnimatedList items={[]} onNavigate={onNavigate} onItemSelect={onItemSelect} />)

    screen.getByRole('listbox').focus()
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Enter}')

    expect(onNavigate).not.toHaveBeenCalled()
    expect(onItemSelect).not.toHaveBeenCalled()
  })

  it('does not emit an aria-activedescendant for an out-of-range selection', () => {
    render(<AnimatedList items={items} selectedIndex={99} />)
    expect(screen.getByRole('listbox')).not.toHaveAttribute('aria-activedescendant')
  })

  it('ignores keyboard events originating from text inputs inside the listbox', async () => {
    const user = userEvent.setup()
    render(
      <AnimatedList
        items={items}
        renderItem={() => <input type="text" aria-label="inline field" />}
      />,
    )

    await user.click(screen.getAllByRole('textbox')[0])

    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowDown}')

    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'false')
  })

  it('passes the item, index and selected state to renderItem', () => {
    const renderItem = vi.fn(() => <span>custom row</span>)
    render(
      <AnimatedList
        items={items}
        initialSelectedIndex={1}
        renderItem={renderItem}
      />,
    )

    expect(renderItem).toHaveBeenCalledWith('Alpha', { index: 0, selected: false })
    expect(renderItem).toHaveBeenCalledWith('Beta', { index: 1, selected: true })
    expect(screen.getAllByText('custom row')).toHaveLength(4)
  })

  it('toggles the gradient overlays via showGradients', () => {
    const { container } = render(<AnimatedList items={items} />)
    expect(container.querySelector('.bg-gradient-to-b')).toBeInTheDocument()
    expect(container.querySelector('.bg-gradient-to-t')).toBeInTheDocument()

    const { container: noGradients } = render(
      <AnimatedList items={items} showGradients={false} />,
    )
    expect(noGradients.querySelector('.bg-gradient-to-b')).not.toBeInTheDocument()
    expect(noGradients.querySelector('.bg-gradient-to-t')).not.toBeInTheDocument()
  })

  it('hides the custom scrollbar via displayScrollbar', () => {
    const { container } = render(
      <AnimatedList items={items} displayScrollbar={false} />,
    )
    expect(container.querySelector('[role="listbox"]')?.className).toContain(
      '[scrollbar-width:none]',
    )
  })

  it('renders an empty listbox without options when items is empty', () => {
    render(<AnimatedList items={[]} />)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })
})