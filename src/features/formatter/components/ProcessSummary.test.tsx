import { beforeEach, describe, expect, it } from 'vitest'
import i18n from 'i18next'
import { renderWithProviders, screen, within } from '@/test/utils'
import enTranslation from '../../../../public/locales/en/translation.json'
import idTranslation from '../../../../public/locales/id/translation.json'
import { ProcessSummary } from './ProcessSummary'

describe('ProcessSummary', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('renders a named section, semantic heading, and one three-entry description list', () => {
    const { container } = renderWithProviders(
      <ProcessSummary
        summary={{ promptCount: 12, skippedBlankCount: 3, duplicatePromptCount: 0 }}
      />,
    )

    const region = screen.getByRole('region', { name: enTranslation.formatter.summaryTitle })
    expect(within(region).getByRole('heading', {
      level: 2,
      name: enTranslation.formatter.summaryTitle,
    })).toBeInTheDocument()
    expect(region.querySelectorAll('dl')).toHaveLength(1)
    expect(region.querySelectorAll('dt')).toHaveLength(3)
    expect(region.querySelectorAll('dd')).toHaveLength(3)

    const expectedEntries = [
      [enTranslation.formatter.summaryPromptsObtained, '12'],
      [enTranslation.formatter.summarySkippedBlanks, '3'],
      [enTranslation.formatter.summaryPotentialDuplicates, '0'],
    ]
    for (const [label, value] of expectedEntries) {
      expect(within(region).getByText(label).nextElementSibling).toHaveTextContent(value)
    }

    expect(container.querySelector('[role="status"]')).toBeNull()
    expect(container.querySelector('[aria-live]')).toBeNull()
  })

  it('applies warning styling only when potential duplicates are greater than zero', () => {
    const { rerender } = renderWithProviders(
      <ProcessSummary
        summary={{ promptCount: 2, skippedBlankCount: 0, duplicatePromptCount: 0 }}
      />,
    )

    let duplicateValue = screen.getByText(
      enTranslation.formatter.summaryPotentialDuplicates,
    ).nextElementSibling
    expect(duplicateValue).not.toHaveClass('text-brand-warning')

    rerender(
      <ProcessSummary
        summary={{ promptCount: 2, skippedBlankCount: null, duplicatePromptCount: null }}
      />,
    )
    duplicateValue = screen.getByText(
      enTranslation.formatter.summaryPotentialDuplicates,
    ).nextElementSibling
    expect(duplicateValue).not.toHaveClass('text-brand-warning')

    rerender(
      <ProcessSummary
        summary={{ promptCount: 2, skippedBlankCount: 0, duplicatePromptCount: 1 }}
      />,
    )
    duplicateValue = screen.getByText(
      enTranslation.formatter.summaryPotentialDuplicates,
    ).nextElementSibling
    expect(duplicateValue).toHaveClass('text-brand-warning')
    expect(screen.getByText(enTranslation.formatter.summarySkippedBlanks).nextElementSibling)
      .not.toHaveClass('text-brand-warning')
  })

  it('renders null values as a hidden visual dash with localized accessible unavailable text', () => {
    renderWithProviders(
      <ProcessSummary
        summary={{ promptCount: 1, skippedBlankCount: null, duplicatePromptCount: null }}
      />,
    )

    const region = screen.getByRole('region', { name: enTranslation.formatter.summaryTitle })
    const visualDashes = region.querySelectorAll('dd span[aria-hidden="true"]')
    expect(visualDashes).toHaveLength(2)
    for (const dash of visualDashes) {
      expect(dash).toHaveTextContent('—')
    }
    expect(within(region).getAllByText(enTranslation.formatter.summaryUnavailableLegacy))
      .toHaveLength(2)
  })

  it('does not add spotlight, animation, or truncation classes', () => {
    const { container } = renderWithProviders(
      <ProcessSummary
        summary={{ promptCount: 4, skippedBlankCount: 1, duplicatePromptCount: 1 }}
      />,
    )

    expect(container.querySelector('[class*="spotlight"]')).toBeNull()
    expect(container.querySelector('[class*="animate"]')).toBeNull()
    expect(container.querySelector('[class*="truncate"]')).toBeNull()
  })

  it('renders the full Indonesian title and labels', async () => {
    await i18n.changeLanguage('id')
    renderWithProviders(
      <ProcessSummary
        summary={{ promptCount: 8, skippedBlankCount: 2, duplicatePromptCount: 1 }}
      />,
      { initialPreferences: { language: 'id' } },
    )

    const region = screen.getByRole('region', { name: idTranslation.formatter.summaryTitle })
    expect(within(region).getByText(idTranslation.formatter.summaryPromptsObtained))
      .toBeInTheDocument()
    expect(within(region).getByText(idTranslation.formatter.summarySkippedBlanks))
      .toBeInTheDocument()
    expect(within(region).getByText(idTranslation.formatter.summaryPotentialDuplicates))
      .toBeInTheDocument()
  })
})
