import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderWithProviders, screen, waitFor, userEvent, fireEvent, within } from '@/test/utils'
import FormatterPage from '@/pages/FormatterPage'
import { Toaster } from '@/components/ui/sonner'
import {
  createFormatterBatch,
  getActiveBatch,
  markCopiedAndAdvance,
  type CreateFormatterBatchCommand,
} from '@/services/formatter/formatterService'
import db, { type FormatterBatch } from '@/services/storage/indexeddb'

vi.mock('@/services/formatter/formatterService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/formatter/formatterService')>()
  return {
    ...actual,
    createFormatterBatch: vi.fn(actual.createFormatterBatch),
    markCopiedAndAdvance: vi.fn(actual.markCopiedAndAdvance),
  }
})

const COPY_BUTTON_NAME = 'Copy'

function createTestBatch(
  prompts: string[],
  overrides: Partial<Omit<CreateFormatterBatchCommand, 'prompts'>> = {},
) {
  return createFormatterBatch({
    prompts,
    aspectRatios: null,
    skippedBlankCount: 0,
    sourceType: 'paste',
    ...overrides,
  })
}

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

    await createTestBatch(['prompt one', 'prompt two', 'prompt three'])
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
        }, 500)
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
    }, { timeout: 5000 })
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

    await createTestBatch(['alpha', 'beta'])

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

describe('FormatterPage queue filters and Next navigation', () => {
  let writeTextMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    Element.prototype.scrollIntoView = vi.fn()
    writeTextMock = vi.fn().mockResolvedValue(undefined)

    await createTestBatch([
      'first --ar 16:9',
      'second --ar 1:1',
      'third --ar 16:9 --video',
    ])
  })

  afterEach(() => {
    delete (navigator as { clipboard?: unknown }).clipboard
  })

  async function selectOption(user: ReturnType<typeof userEvent.setup>, comboboxName: string, optionName: string) {
    await user.click(screen.getByRole('combobox', { name: comboboxName }))
    await user.click(await screen.findByRole('option', { name: optionName }))
  }

  it('advances to the next prompt via the Next button and persists the raw index', async () => {
    renderPage()
    const user = userEvent.setup()

    await waitFor(() => expect(screen.getByText('Prompt #1')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Next/i }))
    await waitFor(() => expect(screen.getByText('Prompt #2')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Next/i }))
    await waitFor(() => expect(screen.getByText('Prompt #3')).toBeInTheDocument())

    expect(screen.getByRole('button', { name: /Next/i })).toBeDisabled()

    await waitFor(async () => {
      const batch = await getActiveBatch()
      expect(batch?.batch.currentIndex).toBe(2)
    })
  })

  it('filters by scope Completed and clamps the active item into the filtered view', async () => {
    renderPage()
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    })

    await waitFor(() => expect(screen.getByText('Prompt #1')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: COPY_BUTTON_NAME }))
    await waitFor(() => expect(screen.getByText('Prompt #2')).toBeInTheDocument())

    await selectOption(user, 'Scope', 'Completed')

    await waitFor(() => expect(screen.getByText('Prompt #1')).toBeInTheDocument())
    expect(screen.getByText('Overview (1 of 3)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Next/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Previous/i })).toBeDisabled()
  })

  it('filters by aspect ratio and copies within the filtered set', async () => {
    renderPage()
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    })

    await waitFor(() => expect(screen.getByText('Prompt #1')).toBeInTheDocument())

    await selectOption(user, 'Aspect Ratio', '1:1')

    await waitFor(() => expect(screen.getByText('Prompt #2')).toBeInTheDocument())
    expect(screen.getByText('Overview (1 of 3)')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: COPY_BUTTON_NAME }))
    await waitFor(() => expect(writeTextMock).toHaveBeenCalledWith('second --ar 1:1'))
    await waitFor(async () => {
      const batch = await getActiveBatch()
      expect(batch?.batch.currentIndex).toBe(1)
      expect(batch?.items[1].status).toBe('copied')
    })
    // set terfilter hanya berisi satu item — copy tidak maju
    expect(screen.getByText('Prompt #2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Next/i })).toBeDisabled()
  })

  it('navigates Next and Prev within the filtered remaining set', async () => {
    renderPage()
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    })

    await waitFor(() => expect(screen.getByText('Prompt #1')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: COPY_BUTTON_NAME }))
    await waitFor(() => expect(screen.getByText('Prompt #2')).toBeInTheDocument())

    await selectOption(user, 'Scope', 'Remaining')

    // remaining = #2, #3; item aktif (#2, raw 1) terlihat di posisi 0
    await waitFor(() => expect(screen.getByText('Prompt #2')).toBeInTheDocument())
    expect(screen.getByText('Overview (2 of 3)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Previous/i })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /Next/i }))
    await waitFor(() => expect(screen.getByText('Prompt #3')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Next/i })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /Previous/i }))
    await waitFor(() => expect(screen.getByText('Prompt #2')).toBeInTheDocument())

    await waitFor(async () => {
      const batch = await getActiveBatch()
      expect(batch?.batch.currentIndex).toBe(1)
    })
  })

  it('clamps display to the first visible item without writing to DB when the active item is filtered out', async () => {
    renderPage()
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    })

    await waitFor(() => expect(screen.getByText('Prompt #1')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: COPY_BUTTON_NAME }))
    await waitFor(() => expect(screen.getByText('Prompt #2')).toBeInTheDocument())

    await selectOption(user, 'Scope', 'Completed')

    // item aktif (#2, pending) terfilter → clamp ke item visible pertama (#1)
    await waitFor(() => expect(screen.getByText('Prompt #1')).toBeInTheDocument())
    expect(screen.getByText('Overview (1 of 3)')).toBeInTheDocument()

    await waitFor(async () => {
      const batch = await getActiveBatch()
      expect(batch?.batch.currentIndex).toBe(1)
      expect(batch?.items[0].status).toBe('copied')
    })
  })

  it('jumps to a visible item via the overview with a filter active', async () => {
    renderPage()
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    })

    await waitFor(() => expect(screen.getByText('Prompt #1')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: COPY_BUTTON_NAME }))
    await waitFor(() => expect(screen.getByText('Prompt #2')).toBeInTheDocument())

    await selectOption(user, 'Scope', 'Remaining')

    await waitFor(() => expect(screen.getByText('Overview (2 of 3)')).toBeInTheDocument())
    await user.click(screen.getByRole('option', { name: /third --ar 16:9 --video/i }))

    await waitFor(() => expect(screen.getByText('Prompt #3')).toBeInTheDocument())
    await waitFor(async () => {
      const batch = await getActiveBatch()
      expect(batch?.batch.currentIndex).toBe(2)
    })
  })

  it('filters by prompt type Video when a video prompt is detected', async () => {
    renderPage()
    const user = userEvent.setup()

    await waitFor(() => expect(screen.getByText('Prompt #1')).toBeInTheDocument())

    await selectOption(user, 'Type', 'Video')

    await waitFor(() => expect(screen.getByText('Prompt #3')).toBeInTheDocument())
    expect(screen.getByText('Overview (1 of 3)')).toBeInTheDocument()
  })

  it('shows the empty state and disables controls when no item matches the filters', async () => {
    renderPage()
    const user = userEvent.setup()

    await waitFor(() => expect(screen.getByText('Prompt #1')).toBeInTheDocument())

    await selectOption(user, 'Scope', 'Completed')

    await waitFor(() => expect(screen.getByText('No items to display')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: COPY_BUTTON_NAME })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Next/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Previous/i })).toBeDisabled()
  })

  it('opens the paste format help dialog with a docs link from the paste tab', async () => {
    renderPage()
    const user = userEvent.setup()

    await waitFor(() => expect(screen.getByText('Prompt #1')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Show input' }))

    await user.click(screen.getByRole('button', { name: 'Supported paste formats' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/Lines starting with "Prompt:"/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Full documentation/i })).toHaveAttribute(
      'href',
      'https://github.com/pyforgedev/promptforge/blob/main/docs/supported-format-paste.md'
    )
  })
})

describe('FormatterPage section format paste', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('creates a batch with prompts and aspect ratios from section format', async () => {
    renderPage()
    const user = userEvent.setup()
    const textarea = await screen.findByPlaceholderText('Paste one prompt per line...')

    const sectionText = [
      '--- Prompt 1 ---',
      '',
      'Aspect Ratio: 16:9',
      '',
      'Prompt:',
      'A photorealistic raccoon body.',
      '',
      '--- Prompt 2 ---',
      '',
      'Prompt:',
      'A squirrel prompt body.',
    ].join('\n')

    fireEvent.change(textarea, { target: { value: sectionText } })
    await user.click(screen.getByRole('button', { name: 'Process' }))

    await waitFor(async () => {
      const batch = await getActiveBatch()
      expect(batch).not.toBeNull()
      expect(batch!.items).toHaveLength(2)
      expect(batch!.items[0].promptText).toBe('A photorealistic raccoon body.')
      expect(batch!.items[0].detectedAspectRatio).toBe('16:9')
      expect(batch!.items[1].promptText).toBe('A squirrel prompt body.')
      expect(batch!.items[1].detectedAspectRatio).toBeNull()
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Show input' })).toHaveAttribute(
        'aria-expanded',
        'false',
      )
    })
    expect(screen.queryByPlaceholderText('Paste one prompt per line...')).not.toBeInTheDocument()
  })

  it('falls back to plain line parsing when a prompt header has no closing dashes', async () => {
    renderPage()
    const user = userEvent.setup()
    const textarea = await screen.findByPlaceholderText('Paste one prompt per line...')

    fireEvent.change(textarea, { target: { value: '--- prompt 1\nplain line two' } })
    await user.click(screen.getByRole('button', { name: 'Process' }))

    await waitFor(async () => {
      const batch = await getActiveBatch()
      expect(batch).not.toBeNull()
      expect(batch!.items.map((item) => item.promptText)).toEqual(['--- prompt 1', 'plain line two'])
    })
  })

  it('does not fall back to plain parsing when a recognized section grammar accepts no prompts', async () => {
    renderPage()
    const user = userEvent.setup()
    const textarea = await screen.findByPlaceholderText('Paste one prompt per line...')
    const allEmptySections = [
      '--- Prompt 1 ---',
      '',
      'Aspect Ratio: 16:9',
      '',
      'metadata without a Prompt field',
    ].join('\n')

    fireEvent.change(textarea, { target: { value: allEmptySections } })
    await user.click(screen.getByRole('button', { name: 'Process' }))

    expect(await getActiveBatch()).toBeNull()
    expect(screen.getByPlaceholderText('Paste one prompt per line...')).toHaveValue(allEmptySections)
    expect(screen.queryByRole('region', { name: 'Processing complete' })).not.toBeInTheDocument()
  })
})

describe('FormatterPage process summary', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    delete (navigator as { clipboard?: unknown }).clipboard
  })

  it('persists and renders accurate counts for pasted blank rows', async () => {
    renderPage()
    const user = userEvent.setup()
    const textarea = await screen.findByPlaceholderText('Paste one prompt per line...')

    fireEvent.change(textarea, { target: { value: 'first prompt\n\nsecond prompt\n' } })
    await user.click(screen.getByRole('button', { name: 'Process' }))

    const summary = await screen.findByRole('region', { name: 'Processing complete' })
    expect(within(summary).getByText('Prompts obtained').nextElementSibling).toHaveTextContent('2')
    expect(within(summary).getByText('Skipped blanks').nextElementSibling).toHaveTextContent('1')
    expect(within(summary).getByText('Potential duplicates').nextElementSibling).toHaveTextContent('0')

    const stored = await getActiveBatch()
    expect(stored?.batch.processSummary).toEqual({
      skippedBlankCount: 1,
      duplicatePromptCount: 0,
    })
  })

  it('carries parsed blank counts and aspect ratios through replacement confirmation', async () => {
    await createTestBatch(['old first', 'old second'])
    const oldBatch = await getActiveBatch()
    await markCopiedAndAdvance(oldBatch!.items[0].id!, 1)

    renderPage()
    const user = userEvent.setup()
    await screen.findByText('Prompt #2')
    await user.click(screen.getByRole('button', { name: 'Show input' }))

    const replacement = [
      '--- Prompt 1 ---',
      'Aspect Ratio: 9:16',
      'Prompt:',
      'replacement prompt',
      '--- Prompt 2 ---',
      'Prompt:',
      '',
    ].join('\n')
    fireEvent.change(screen.getByPlaceholderText('Paste one prompt per line...'), {
      target: { value: replacement },
    })
    await user.click(screen.getByRole('button', { name: 'Process' }))
    await user.click(await screen.findByRole('button', { name: 'Replace & continue' }))

    await waitFor(async () => {
      const stored = await getActiveBatch()
      expect(stored?.items).toHaveLength(1)
      expect(stored?.items[0].promptText).toBe('replacement prompt')
      expect(stored?.items[0].detectedAspectRatio).toBe('9:16')
      expect(stored?.batch.processSummary).toEqual({
        skippedBlankCount: 1,
        duplicatePromptCount: 0,
      })
    })
  })

  it('keeps summary values stable when copy progress changes', async () => {
    const repeatedPrompt = 'same restored prompt'
    await createTestBatch(
      [repeatedPrompt, repeatedPrompt, repeatedPrompt],
      { skippedBlankCount: 2 },
    )
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    })

    renderPage()
    const user = userEvent.setup()
    const summary = await screen.findByRole('region', { name: 'Processing complete' })
    expect(within(summary).getByText('Skipped blanks').nextElementSibling).toHaveTextContent('2')
    expect(within(summary).getByText('Potential duplicates').nextElementSibling).toHaveTextContent('2')

    await user.click(screen.getByRole('button', { name: COPY_BUTTON_NAME }))
    await screen.findByText('Prompt #2')

    expect(within(summary).getByText('Prompts obtained').nextElementSibling).toHaveTextContent('3')
    expect(within(summary).getByText('Skipped blanks').nextElementSibling).toHaveTextContent('2')
    expect(within(summary).getByText('Potential duplicates').nextElementSibling).toHaveTextContent('2')
    await waitFor(async () => {
      expect((await getActiveBatch())?.batch.processSummary).toEqual({
        skippedBlankCount: 2,
        duplicatePromptCount: 2,
      })
    })
  })

  it('restores a complete persisted snapshot without changing it during render', async () => {
    await createTestBatch(
      ['restored duplicate', 'restored duplicate', 'distinct prompt'],
      { skippedBlankCount: 5 },
    )
    const before = await db.formatter_batch.toCollection().first()
    vi.mocked(createFormatterBatch).mockClear()

    renderPage()

    const summary = await screen.findByRole('region', { name: 'Processing complete' })
    expect(within(summary).getByText('Prompts obtained').nextElementSibling).toHaveTextContent('3')
    expect(within(summary).getByText('Skipped blanks').nextElementSibling).toHaveTextContent('5')
    expect(within(summary).getByText('Potential duplicates').nextElementSibling).toHaveTextContent('1')
    expect(vi.mocked(createFormatterBatch)).not.toHaveBeenCalled()
    expect(await db.formatter_batch.toCollection().first()).toEqual(before)
  })

  it.each([
    ['missing', undefined],
    ['null', null],
    ['partial', { skippedBlankCount: 2 }],
    ['malformed', { skippedBlankCount: '2', duplicatePromptCount: 0 }],
    ['inconsistent', { skippedBlankCount: 2, duplicatePromptCount: 3 }],
  ])('shows unavailable derived values for a %s raw snapshot without backfilling storage', async (_case, snapshot) => {
    const rawBatch = {
      sourceType: 'paste',
      originalFileName: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      totalCount: 3,
      currentIndex: 0,
      ...(snapshot === undefined ? {} : { processSummary: snapshot }),
    } as unknown as FormatterBatch
    const batchId = await db.formatter_batch.add(rawBatch)
    await db.formatter_items.bulkAdd(
      ['legacy one', 'legacy two', 'legacy three'].map((promptText, order) => ({
        order,
        promptText,
        status: 'pending' as const,
        copiedAt: null,
        detectedAspectRatio: null,
      })),
    )
    const before = await db.formatter_batch.get(batchId)
    vi.mocked(createFormatterBatch).mockClear()

    renderPage()

    const summary = await screen.findByRole('region', { name: 'Processing complete' })
    expect(within(summary).getByText('Prompts obtained').nextElementSibling).toHaveTextContent('3')
    expect(within(summary).getAllByText('Not available for batches created earlier')).toHaveLength(2)
    expect(vi.mocked(createFormatterBatch)).not.toHaveBeenCalled()
    expect(await db.formatter_batch.get(batchId)).toEqual(before)
  })
})

describe('FormatterPage input section lifecycle', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('starts expanded without a batch and can restore Paste through the empty-state action', async () => {
    renderPage()
    const user = userEvent.setup()

    const initialTrigger = await screen.findByRole('button', { name: 'Hide input' })
    expect(initialTrigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByPlaceholderText('Paste one prompt per line...')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Upload' }))
    expect(screen.getByText('Choose a file')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hide input' }))
    await waitFor(() => expect(screen.queryByText('Choose a file')).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Start formatting' }))

    expect(screen.getByRole('button', { name: 'Hide input' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByPlaceholderText('Paste one prompt per line...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Supported paste formats' })).toBeInTheDocument()
  })

  it('restores an active batch collapsed and allows the user to reopen it', async () => {
    await createTestBatch(['restored prompt'])
    renderPage()
    const user = userEvent.setup()

    await waitFor(() => expect(screen.getByText('Prompt #1')).toBeInTheDocument())
    const trigger = screen.getByRole('button', { name: 'Show input' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByPlaceholderText('Paste one prompt per line...')).not.toBeInTheDocument()

    await user.click(trigger)

    expect(screen.getByRole('button', { name: 'Hide input' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByPlaceholderText('Paste one prompt per line...')).toBeInTheDocument()
  })

  it('keeps the form open and retains input when batch creation fails', async () => {
    vi.mocked(createFormatterBatch).mockRejectedValueOnce(new Error('database unavailable'))
    renderPage()
    const user = userEvent.setup()

    const textarea = await screen.findByPlaceholderText('Paste one prompt per line...')
    await user.type(textarea, 'keep this prompt')
    await user.click(screen.getByRole('button', { name: 'Process' }))

    await waitFor(() => expect(screen.getByText('Failed to create batch')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Hide input' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByPlaceholderText('Paste one prompt per line...')).toHaveValue(
      'keep this prompt',
    )
  })

  it('reopens the no-batch form after Clear queue is confirmed', async () => {
    await createTestBatch(['queued prompt'])
    renderPage()
    const user = userEvent.setup()

    await waitFor(() => expect(screen.getByText('Prompt #1')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Show input' }))
    await user.click(screen.getByRole('button', { name: 'Hide input' }))
    expect(screen.getByRole('button', { name: 'Show input' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )

    await user.click(screen.getByRole('button', { name: 'Clear' }))
    await user.click(await screen.findByRole('button', { name: 'Clear queue' }))

    await waitFor(() => {
      expect(screen.getByText('No batch loaded')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Hide input' })).toHaveAttribute(
        'aria-expanded',
        'true',
      )
    })
    expect(screen.getByPlaceholderText('Paste one prompt per line...')).toBeInTheDocument()
  })
})
