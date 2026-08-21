import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/utils'
import { InputSection } from './InputSection'
import type { CsvPreviewResult, InputMode } from '../types'

interface HarnessProps {
  initialOpen?: boolean
  inputMode?: InputMode
  pasteText?: string
  uploadedFileName?: string | null
  csvPreview?: CsvPreviewResult | null
  selectedCsvColumn?: string | null
  onFileUpload?: (name: string, content: string) => void
}

function ControlledHarness({
  initialOpen = true,
  inputMode = 'paste',
  pasteText = '',
  uploadedFileName = null,
  csvPreview = null,
  selectedCsvColumn = null,
  onFileUpload = vi.fn(),
}: HarnessProps) {
  const [open, setOpen] = useState(initialOpen)

  return (
    <InputSection
      open={open}
      inputMode={inputMode}
      pasteText={pasteText}
      uploadedFileName={uploadedFileName}
      csvPreview={csvPreview}
      selectedCsvColumn={selectedCsvColumn}
      onOpenChange={setOpen}
      onInputModeChange={vi.fn()}
      onPasteTextChange={vi.fn()}
      onClear={vi.fn()}
      onFileUpload={onFileUpload}
      onSelectCsvColumn={vi.fn()}
      onConfirmCsvColumn={vi.fn()}
      onProcess={() => setOpen(false)}
    />
  )
}

describe('InputSection', () => {
  it('exposes controlled expanded semantics and toggles by click, Enter, and Space', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ControlledHarness pasteText="A supplied prompt" />)

    expect(screen.getByText('Paste or upload prompts')).toBeInTheDocument()
    let trigger = screen.getByRole('button', { name: 'Hide input' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const contentId = trigger.getAttribute('aria-controls')
    expect(contentId).toBeTruthy()
    expect(document.getElementById(contentId!)).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue('A supplied prompt')

    await user.click(trigger)
    trigger = screen.getByRole('button', { name: 'Show input' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument())

    await user.click(trigger)
    trigger = screen.getByRole('button', { name: 'Hide input' })
    expect(screen.getByRole('textbox')).toHaveValue('A supplied prompt')

    trigger.focus()
    await user.keyboard('{Enter}')
    trigger = screen.getByRole('button', { name: 'Show input' })
    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument())

    trigger.focus()
    await user.keyboard(' ')
    expect(screen.getByRole('button', { name: 'Hide input' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByRole('textbox')).toHaveValue('A supplied prompt')
  })

  it('returns focus to the persistent trigger when its parent closes it', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ControlledHarness />)

    await user.click(screen.getByRole('button', { name: 'Process' }))

    const trigger = screen.getByRole('button', { name: 'Show input' })
    await waitFor(() => expect(trigger).toHaveFocus())
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('declares the collapsible and reduced-motion animation classes', () => {
    renderWithProviders(<ControlledHarness />)

    const trigger = screen.getByRole('button', { name: 'Hide input' })
    const content = document.getElementById(trigger.getAttribute('aria-controls')!)
    expect(content).toHaveClass(
      'overflow-hidden',
      'data-[state=closed]:animate-collapsible-up',
      'data-[state=open]:animate-collapsible-down',
      'motion-reduce:animate-none',
    )

    const chevron = trigger.querySelector('svg')
    expect(chevron).toHaveClass(
      'transition-transform',
      'duration-200',
      'group-data-[state=open]:rotate-180',
      'motion-reduce:transition-none',
    )
  })

  it('keeps one exact file input and restores supplied upload state after reopening', async () => {
    const user = userEvent.setup()
    const onFileUpload = vi.fn()
    const csvPreview: CsvPreviewResult = {
      columns: ['prompt', 'category'],
      previewRows: [['A castle', 'architecture']],
      detectedColumn: null,
    }
    const { container } = renderWithProviders(
      <ControlledHarness
        inputMode="upload"
        uploadedFileName="prompts.csv"
        csvPreview={csvPreview}
        selectedCsvColumn="prompt"
        onFileUpload={onFileUpload}
      />,
    )

    let inputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]')
    expect(inputs).toHaveLength(1)
    expect(inputs[0]).toHaveAttribute('accept', '.txt,.csv')
    expect(inputs[0]).toHaveClass('hidden')
    expect(screen.getByText('prompts.csv')).toBeInTheDocument()
    expect(screen.getByText('Preview (first 5 rows)')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveTextContent('prompt')

    await user.upload(
      inputs[0],
      new File(['first prompt\nsecond prompt'], 'notes.txt', { type: 'text/plain' }),
    )
    await waitFor(() => {
      expect(onFileUpload).toHaveBeenCalledOnce()
      expect(onFileUpload).toHaveBeenCalledWith(
        'notes.txt',
        'first prompt\nsecond prompt',
      )
    })

    await user.click(screen.getByRole('button', { name: 'Hide input' }))
    await waitFor(() => {
      expect(container.querySelectorAll('input[type="file"]')).toHaveLength(0)
    })

    await user.click(screen.getByRole('button', { name: 'Show input' }))
    inputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]')
    expect(inputs).toHaveLength(1)
    expect(inputs[0]).toHaveAttribute('accept', '.txt,.csv')
    expect(screen.getByText('prompts.csv')).toBeInTheDocument()
    expect(screen.getByText('Preview (first 5 rows)')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveTextContent('prompt')
  })
})
