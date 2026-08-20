import { describe, expect, it, beforeEach, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils'
import db from '@/services/storage/indexeddb'
import { saveSetting } from '@/services/storage/settings'
import { HistoryStorageSection } from './HistoryStorageSection'
import type { PromptHistoryV10, PromptTextRecord } from '@/services/storage/history'
import { tokenize, resolveFolderKey } from '@/services/storage/historySearch'

const { showToast } = vi.hoisted(() => ({ showToast: vi.fn() }))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ showToast }),
}))

const POLICY_KEY = 'history_retention_policy'
const DAY = 86_400_000

function makeRecord(id: string, createdAt: number): PromptHistoryV10 {
  return {
    id,
    batchId: `batch-${id}`,
    variantIndex: 1,
    segments: { subject: id, composition: '', lighting: '', mood: '', style: '', technical: '', colorPalette: '', environment: '' },
    negativePrompt: '',
    commercialKeywords: [],
    adobeScore: {
      total: 0,
      breakdown: { commercialViability: 0, technicalQuality: 0, compositionStrength: 0, marketDiversity: 0 },
      warnings: [],
      suggestions: [],
    },
    variationAnchors: { primaryVariation: '', compositionStyle: '', lightingType: '', directionHint: '' },
    createdAt,
    isFavorite: false,
    folderId: null,
    folderKey: resolveFolderKey(null),
    categoryKey: 'other',
    nicheNormalized: 'test',
    searchTerms: tokenize(id),
  }
}

function makeTexts(id: string): PromptTextRecord[] {
  return [
    { promptId: id, platform: 'dalle3', content: `text ${id}` },
    { promptId: id, platform: 'nano_banana', content: `text ${id}` },
  ]
}

async function seedRecords(count: number, nowOffset = 0) {
  const now = Date.now()
  const records = Array.from({ length: count }, (_, i) => makeRecord(`s-${i}`, now - nowOffset - i * 1000))
  await db.prompt_history.bulkPut(records)
  await db.prompt_texts.bulkPut(records.flatMap((r) => makeTexts(r.id)))
  return records
}

async function setPolicy(cap: number, ttl: 'off' | '90' | '180' | '365') {
  await saveSetting(POLICY_KEY, { version: 1, cap, ttl })
}

function renderSection() {
  return renderWithProviders(<HistoryStorageSection />)
}

describe('HistoryStorageSection', () => {
  beforeEach(async () => {
    showToast.mockReset()
    await db.settings.clear()
    await db.prompt_history.clear()
    await db.prompt_texts.clear()
    await db.prompt_batches.clear()
  })

  it('renders skeleton while loading, then stats, and disables prune when there is nothing to clean', async () => {
    await setPolicy(5000, 'off')
    await seedRecords(3)

    renderSection()
    expect(screen.getByRole('status')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Total prompts')).toBeInTheDocument()
    })
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Favorites')).toBeInTheDocument()
    expect(screen.getByText('Legacy prompts')).toBeInTheDocument()
    expect(screen.getByText('Nothing to clean')).toBeInTheDocument()
    expect(screen.getByText('Never cleaned')).toBeInTheDocument()
  })

  it('shows a preview count and requires confirmation before pruning', async () => {
    await setPolicy(100, 'off')
    await seedRecords(105)

    renderSection()
    await waitFor(() => {
      expect(screen.getByText('5 will be removed')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: 'Clean now' }))

    // Confirmation dialog with the impact preview
    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByText(/5 non-favorite prompts will be removed/)).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply' }))

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('success', 'Removed 5 old prompts')
    })
    expect(await db.prompt_history.count()).toBe(100)
  })

  it('keeps data intact when the prune confirmation is cancelled', async () => {
    await setPolicy(100, 'off')
    await seedRecords(105)

    renderSection()
    await waitFor(() => {
      expect(screen.getByText('5 will be removed')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: 'Clean now' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(await db.prompt_history.count()).toBe(105)
    expect(showToast).not.toHaveBeenCalled()
  })

  it('shows an impact preview when changing the TTL and applies only after confirmation', async () => {
    await setPolicy(5000, 'off')
    // 3 prompts older than 90 days → changing TTL to 90 will remove them.
    await seedRecords(3, 100 * DAY)

    renderSection()
    await waitFor(() => {
      expect(screen.getByText('Total prompts')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByLabelText('Auto-remove prompts older than'))
    await userEvent.click(await screen.findByRole('option', { name: '90 days' }))

    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText(/3 non-favorite prompts older than/)).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply' }))

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('success', 'Removed 3 old prompts')
    })
    expect(await db.prompt_history.count()).toBe(0)
  })

  it('cancelling the TTL change leaves the policy untouched', async () => {
    await setPolicy(5000, 'off')
    await seedRecords(2, 200 * DAY)

    renderSection()
    await waitFor(() => {
      expect(screen.getByText('Total prompts')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByLabelText('Auto-remove prompts older than'))
    await userEvent.click(await screen.findByRole('option', { name: '365 days' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(await db.prompt_history.count()).toBe(2)
    const stored = await db.settings.get(POLICY_KEY)
    expect(stored?.value).toEqual({ version: 1, cap: 5000, ttl: 'off' })
  })
})