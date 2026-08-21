import type { ComponentProps } from 'react'
import i18n from 'i18next'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  act,
  cleanup,
  renderWithProviders,
  screen,
  userEvent,
} from '@/test/utils'
import type { FormatterItem } from '../types'
import { ActivePromptDisplay } from './ActivePromptDisplay'
import { QueueView } from './QueueView'

type Geometry = {
  scrollHeight: number
  clientHeight: number
  reads: number
}

type ResizeObserverRecord = {
  callback: ResizeObserverCallback
  observe: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
}

const originalResizeObserverDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  'ResizeObserver',
)
const originalFontsDescriptor = Object.getOwnPropertyDescriptor(document, 'fonts')
const translationRestorers: Array<() => void> = []

function item(overrides: Partial<FormatterItem> = {}): FormatterItem {
  return {
    id: 1,
    order: 0,
    promptText: 'A prompt',
    status: 'pending',
    copiedAt: null,
    detectedAspectRatio: null,
    ...overrides,
  }
}

function mockGeometry(scrollHeight: number, clientHeight: number): Geometry {
  const geometry = { scrollHeight, clientHeight, reads: 0 }

  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
    if (this.tagName !== 'P') return 0
    geometry.reads += 1
    return geometry.scrollHeight
  })
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) {
    if (this.tagName !== 'P') return 0
    geometry.reads += 1
    return geometry.clientHeight
  })

  return geometry
}

function mockResizeObserver() {
  const records: ResizeObserverRecord[] = []

  class LocalResizeObserver {
    readonly observe = vi.fn()
    readonly unobserve = vi.fn()
    readonly disconnect = vi.fn()
    readonly callback: ResizeObserverCallback

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback
      records.push(this)
    }
  }

  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: LocalResizeObserver,
  })

  return records
}

function observerFor(element: Element, records: ResizeObserverRecord[]) {
  const record = records.find(({ observe }) => observe.mock.calls.some(([target]) => target === element))
  expect(record).toBeDefined()
  return record!
}

function mockFontsReady() {
  const callbacks: Array<() => unknown> = []
  const then = vi.fn((onFulfilled: () => unknown) => {
    callbacks.push(onFulfilled)
    return Promise.resolve()
  })

  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { ready: { then } },
  })

  return {
    then,
    resolve() {
      for (const callback of callbacks) callback()
    },
  }
}

function overrideTranslation(language: string, key: string, value: string) {
  const previous = i18n.getResource(language, 'translation', key) as string
  i18n.addResource(language, 'translation', key, value)
  translationRestorers.push(() => {
    i18n.addResource(language, 'translation', key, previous)
  })
}

function restoreDescriptor(
  target: object,
  property: PropertyKey,
  descriptor: PropertyDescriptor | undefined,
) {
  if (descriptor) {
    Object.defineProperty(target, property, descriptor)
  } else {
    Reflect.deleteProperty(target, property)
  }
}

afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  restoreDescriptor(globalThis, 'ResizeObserver', originalResizeObserverDescriptor)
  restoreDescriptor(document, 'fonts', originalFontsDescriptor)
  while (translationRestorers.length > 0) translationRestorers.pop()?.()
  await i18n.changeLanguage('en')
})

describe('ActivePromptDisplay', () => {
  it.each([0, 1])('does not show a disclosure control for a %dpx overflow difference', (difference) => {
    mockGeometry(100 + difference, 100)
    mockResizeObserver()

    renderWithProviders(
      <ActivePromptDisplay item={item({ promptText: 'Very long text '.repeat(100) })} />,
    )

    expect(screen.queryByRole('button', { name: 'Show full' })).not.toBeInTheDocument()
  })

  it('shows a collapsed disclosure for an initial geometry difference greater than 1px', () => {
    mockGeometry(102, 100)
    mockResizeObserver()
    const { container } = renderWithProviders(<ActivePromptDisplay item={item()} />)

    const paragraph = container.querySelector('p')!
    const button = screen.getByRole('button', { name: 'Show full' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById(button.getAttribute('aria-controls')!)).toBe(paragraph)
    expect(paragraph).toHaveClass('line-clamp-4', 'sm:line-clamp-6')
    expect(paragraph).toHaveClass('whitespace-pre-wrap', 'break-words')
  })

  it.each(['observer', 'fonts'] as const)(
    'promotes a non-overflowing prompt when a later %s measurement detects overflow',
    async (source) => {
      const geometry = mockGeometry(100, 100)
      const observers = mockResizeObserver()
      const fonts = mockFontsReady()
      const { container } = renderWithProviders(<ActivePromptDisplay item={item()} />)
      const paragraph = container.querySelector('p')!

      expect(screen.queryByRole('button', { name: 'Show full' })).not.toBeInTheDocument()
      geometry.scrollHeight = 103

      act(() => {
        if (source === 'observer') {
          const observer = observerFor(paragraph, observers)
          observer.callback([], observer as unknown as ResizeObserver)
        } else {
          fonts.resolve()
        }
      })

      expect(await screen.findByRole('button', { name: 'Show full' })).toBeInTheDocument()
    },
  )

  it('links the control to one escaped paragraph without exposing prompt text in its generated id', () => {
    const promptText = 'user-secret-token <img data-injected="yes" src=x>\n第二行 🚀'
    mockGeometry(120, 100)
    mockResizeObserver()
    const { container } = renderWithProviders(
      <ActivePromptDisplay item={item({ promptText })} />,
    )

    const button = screen.getByRole('button', { name: 'Show full' })
    const controlledId = button.getAttribute('aria-controls')!
    const paragraph = document.getElementById(controlledId)!

    expect(container.querySelectorAll('p')).toHaveLength(1)
    expect(paragraph.tagName).toBe('P')
    expect(paragraph.id).not.toContain('user-secret-token')
    expect(paragraph.childNodes).toHaveLength(1)
    expect(paragraph.firstChild?.nodeType).toBe(Node.TEXT_NODE)
    expect(paragraph.textContent).toBe(promptText)
    expect(container.querySelector('[data-injected="yes"]')).toBeNull()
    expect(container.querySelector('[role="tooltip"]')).toBeNull()
    expect(container.querySelector('[aria-live]')).toBeNull()
  })

  it('toggles by click and native keyboard activation while preserving exact text and button focus', async () => {
    const promptText = '  First line 🌌  \nSecond\tline\n\n最後の行 🚀  '
    mockGeometry(140, 100)
    mockResizeObserver()
    const { container } = renderWithProviders(
      <ActivePromptDisplay item={item({ promptText })} />,
    )
    const user = userEvent.setup()
    const paragraph = container.querySelector('p')!

    const assertTextIsUnchanged = () => {
      expect(paragraph.textContent).toBe(promptText)
      expect(paragraph.childNodes).toHaveLength(1)
      expect(container.querySelectorAll('p')).toHaveLength(1)
    }

    let button = screen.getByRole('button', { name: 'Show full' })
    await user.click(button)
    button = screen.getByRole('button', { name: 'Hide full' })
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button).toHaveFocus()
    expect(paragraph).not.toHaveClass('line-clamp-4', 'sm:line-clamp-6')
    assertTextIsUnchanged()

    await user.click(button)
    button = screen.getByRole('button', { name: 'Show full' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()
    expect(paragraph).toHaveClass('line-clamp-4', 'sm:line-clamp-6')
    assertTextIsUnchanged()

    await user.keyboard('{Enter}')
    button = screen.getByRole('button', { name: 'Hide full' })
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button).toHaveFocus()
    expect(paragraph).not.toHaveClass('line-clamp-4', 'sm:line-clamp-6')
    assertTextIsUnchanged()

    await user.keyboard(' ')
    button = screen.getByRole('button', { name: 'Show full' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()
    expect(paragraph).toHaveClass('line-clamp-4', 'sm:line-clamp-6')
    assertTextIsUnchanged()
  })

  it('latches overflow after expansion even if a later measurement no longer overflows', async () => {
    const geometry = mockGeometry(130, 100)
    const observers = mockResizeObserver()
    const { container } = renderWithProviders(<ActivePromptDisplay item={item()} />)
    const user = userEvent.setup()
    const paragraph = container.querySelector('p')!

    await user.click(screen.getByRole('button', { name: 'Show full' }))
    geometry.scrollHeight = 100
    const observer = observerFor(paragraph, observers)
    act(() => observer.callback([], observer as unknown as ResizeObserver))

    expect(screen.getByRole('button', { name: 'Hide full' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('disconnects on unmount and ignores stale observer and font-ready callbacks without remeasuring', () => {
    const geometry = mockGeometry(100, 100)
    const observers = mockResizeObserver()
    const fonts = mockFontsReady()
    const { container, unmount } = renderWithProviders(<ActivePromptDisplay item={item()} />)
    const paragraph = container.querySelector('p')!
    const observer = observerFor(paragraph, observers)

    unmount()
    const readsAtUnmount = geometry.reads
    geometry.scrollHeight = 150
    act(() => {
      observer.callback([], observer as unknown as ResizeObserver)
      fonts.resolve()
    })

    expect(observer.disconnect).toHaveBeenCalledOnce()
    expect(geometry.reads).toBe(readsAtUnmount)
    expect(screen.queryByRole('button', { name: /full/i })).not.toBeInTheDocument()
  })

  it('uses localized Indonesian disclosure labels', async () => {
    await i18n.changeLanguage('id')
    mockGeometry(120, 100)
    mockResizeObserver()
    renderWithProviders(<ActivePromptDisplay item={item()} />, {
      initialPreferences: { language: 'id' },
    })
    const user = userEvent.setup()

    const show = screen.getByRole('button', { name: 'Tampilkan penuh' })
    expect(show).toHaveAttribute('aria-expanded', 'false')
    await user.click(show)
    expect(screen.getByRole('button', { name: 'Sembunyikan tampilan penuh' }))
      .toHaveAttribute('aria-expanded', 'true')
  })

  it('interpolates the prompt number through the formatter translation key', () => {
    overrideTranslation('en', 'formatter.promptNumber', 'Test queue item {{number}}')
    mockGeometry(100, 100)
    mockResizeObserver()

    renderWithProviders(<ActivePromptDisplay item={item({ order: 6 })} />)

    expect(screen.getByText('Test queue item 7')).toBeInTheDocument()
    expect(screen.queryByText('Prompt #7')).not.toBeInTheDocument()
  })
})

function queueProps(
  items: FormatterItem[],
  currentIndex: number,
): ComponentProps<typeof QueueView> {
  return {
    items,
    totalItems: items.length,
    copiedCount: items.filter(({ status }) => status === 'copied').length,
    currentIndex,
    copySuccess: false,
    onCopy: vi.fn(),
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onJump: vi.fn(),
    onResetPrompt: vi.fn(),
    onClearQueue: vi.fn(),
    scope: 'all',
    onScopeChange: vi.fn(),
    detectedAspectRatios: [],
    selectedAspectRatio: null,
    onAspectRatioChange: vi.fn(),
    hasVideoItems: false,
    queueType: 'all',
    onTypeChange: vi.fn(),
    queueSort: 'order',
    onSortChange: vi.fn(),
  }
}

describe('QueueView active prompt disclosure identity', () => {
  it('preserves expansion for a same-id rerender but collapses switched and revisited items', async () => {
    mockGeometry(140, 100)
    mockResizeObserver()
    const itemA = item({ id: 10, order: 0, promptText: 'Prompt A' })
    const itemB = item({ id: 20, order: 1, promptText: 'Prompt B' })
    const { rerender } = renderWithProviders(
      <QueueView {...queueProps([itemA, itemB], 0)} />,
    )
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Show full' }))
    expect(screen.getByRole('button', { name: 'Hide full' })).toBeInTheDocument()

    const sameCanonicalItem = item({
      id: 10,
      order: 0,
      promptText: 'Prompt A',
      status: 'copied',
      copiedAt: new Date('2026-08-21T00:00:00Z'),
    })
    rerender(<QueueView {...queueProps([sameCanonicalItem, itemB], 0)} />)
    expect(screen.getByRole('button', { name: 'Hide full' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )

    rerender(<QueueView {...queueProps([sameCanonicalItem, itemB], 1)} />)
    expect(screen.getByRole('button', { name: 'Show full' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )

    rerender(<QueueView {...queueProps([sameCanonicalItem, itemB], 0)} />)
    expect(screen.getByRole('button', { name: 'Show full' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('uses order and prompt text as stable fallback identity for an id-less item', async () => {
    mockGeometry(140, 100)
    mockResizeObserver()
    const idLess = item({ id: undefined, order: 3, promptText: 'Imported prompt' })
    const { rerender } = renderWithProviders(<QueueView {...queueProps([idLess], 0)} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Show full' }))
    rerender(
      <QueueView
        {...queueProps([
          item({
            id: undefined,
            order: 3,
            promptText: 'Imported prompt',
            status: 'copied',
          }),
        ], 0)}
      />,
    )

    expect(screen.getByRole('button', { name: 'Hide full' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })
})
