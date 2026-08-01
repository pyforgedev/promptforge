import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderWithProviders, screen, waitFor, userEvent } from '@/test/utils'
import FormatterPage from '@/pages/FormatterPage'
import { Toaster } from '@/components/ui/sonner'
import {
  createFormatterBatch,
  getActiveBatch,
  markCopiedAndAdvance,
} from '@/services/formatter/formatterService'

vi.mock('@/services/formatter/formatterService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/formatter/formatterService')>()
  return {
    ...actual,
    markCopiedAndAdvance: vi.fn(actual.markCopiedAndAdvance),
  }
})

const COPY_BUTTON_NAME = 'Copy'

function renderPage() {
  return renderWithProviders(
    <>
      <FormatterPage />
      <Toaster />
    </>,
    { route: '/formatter', routePath: '/formatter' },
  )
}

describe('FormatterPage optimistic copy flow', () => {
  let writeTextMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    Element.prototype.scrollIntoView = vi.fn()
    writeTextMock = vi.fn().mockResolvedValue(undefined)

    await createFormatterBatch(['prompt one', 'prompt two', 'prompt three'], 'paste')
  })

  afterEach(() => {
    vi.mocked(markCopiedAndAdvance).mockClear()
    delete (navigator as { clipboard?: unknown }).clipboard
  })

  it('copies the active prompt text and advances instantly while DB write is pending', async () => {
    const realImpl = vi.mocked(markCopiedAndAdvance).getMockImplementation()
    vi.mocked(markCopiedAndAdvance).mockImplementationOnce((itemId, nextIndex) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          realImpl!(itemId, nextIndex).then(() => resolve())
        }, 100)
      })
    })

    renderPage()
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    })

    await waitFor(() => expect(screen.getByText('Prompt #1')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: COPY_BUTTON_NAME }))

    await waitFor(() => expect(screen.getByText('Prompt #2')).toBeInTheDocument())
    expect(writeTextMock).toHaveBeenCalledWith('prompt one')

    const pending = await getActiveBatch()
    expect(pending?.batch.currentIndex).toBe(0)
    expect(pending?.items[0].status).toBe('pending')

    await waitFor(async () => {
      const settled = await getActiveBatch()
      expect(settled?.batch.currentIndex).toBe(1)
      expect(settled?.items[0].status).toBe('copied')
    })
    expect(screen.getByText('Prompt #2')).toBeInTheDocument()
  })

  it('reverts to the previous prompt and shows error toast when the DB write fails', async () => {
    vi.mocked(markCopiedAndAdvance).mockRejectedValueOnce(new Error('db down'))

    renderPage()
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    })

    await waitFor(() => expect(screen.getByText('Prompt #1')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: COPY_BUTTON_NAME }))

    await waitFor(() => expect(screen.getByText('Failed to copy')).toBeInTheDocument())

    const batch = await getActiveBatch()
    expect(batch?.batch.currentIndex).toBe(0)
    expect(batch?.items[0].status).toBe('pending')

    await waitFor(() => expect(screen.getByText('Prompt #1')).toBeInTheDocument())
    expect(screen.queryByText('Prompt #2')).not.toBeInTheDocument()
  })

  it('does not advance when the clipboard write fails', async () => {
    writeTextMock.mockRejectedValueOnce(new Error('clipboard denied'))

    renderPage()
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    })

    await waitFor(() => expect(screen.getByText('Prompt #1')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: COPY_BUTTON_NAME }))

    await waitFor(() => expect(screen.getByText('Failed to copy')).toBeInTheDocument())
    expect(screen.getByText('Prompt #1')).toBeInTheDocument()
    expect(screen.queryByText('Prompt #2')).not.toBeInTheDocument()

    const batch = await getActiveBatch()
    expect(batch?.batch.currentIndex).toBe(0)
    expect(batch?.items[0].status).toBe('pending')
  })

  it('goes back to the previous prompt via the Previous button after a successful copy', async () => {
    renderPage()
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    })

    await waitFor(() => expect(screen.getByText('Prompt #1')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: COPY_BUTTON_NAME }))
    await waitFor(() => expect(screen.getByText('Prompt #2')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Previous/i }))
    await waitFor(() => expect(screen.getByText('Prompt #1')).toBeInTheDocument())
  })

  it('serializes Copy followed by quick Prev so the DB ends in the Prev state', async () => {
    const realImpl = vi.mocked(markCopiedAndAdvance).getMockImplementation()
    vi.mocked(markCopiedAndAdvance).mockImplementationOnce((itemId, nextIndex) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          realImpl!(itemId, nextIndex).then(() => resolve())
        }, 100)
      })
    })

    renderPage()
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    })

    await waitFor(() => expect(screen.getByText('Prompt #1')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: COPY_BUTTON_NAME }))
    await waitFor(() => expect(screen.getByText('Prompt #2')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Previous/i }))
    await waitFor(() => expect(screen.getByText('Prompt #1')).toBeInTheDocument())

    await waitFor(async () => {
      const settled = await getActiveBatch()
      expect(settled?.batch.currentIndex).toBe(0)
      expect(settled?.items[0].status).toBe('copied')
      expect(settled?.items[1].status).toBe('pending')
    })
  })

  it('resets optimistic state and ignores stale writes when a new batch replaces the queue', async () => {
    const realImpl = vi.mocked(markCopiedAndAdvance).getMockImplementation()
    vi.mocked(markCopiedAndAdvance).mockImplementationOnce((itemId, nextIndex) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          realImpl!(itemId, nextIndex).then(() => resolve())
        }, 100)
      })
    })

    renderPage()
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    })

    await waitFor(() => expect(screen.getByText('Prompt #1')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: COPY_BUTTON_NAME }))
    await waitFor(() => expect(screen.getByText('Prompt #2')).toBeInTheDocument())

    await createFormatterBatch(['alpha', 'beta'], 'paste')

    await waitFor(async () => {
      const batch = await getActiveBatch()
      expect(batch?.items[0]?.promptText).toBe('alpha')
      expect(batch?.batch.currentIndex).toBe(0)
      expect(batch?.items[0]?.status).toBe('pending')
    })

    await user.click(screen.getByRole('button', { name: COPY_BUTTON_NAME }))
    await waitFor(async () => {
      const batch = await getActiveBatch()
      expect(batch?.items[0]?.status).toBe('copied')
      expect(batch?.batch.currentIndex).toBe(1)
      expect(batch?.items[1]?.status).toBe('pending')
    })
  })
})
