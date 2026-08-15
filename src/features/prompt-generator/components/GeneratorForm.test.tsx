import { describe, it, expect, beforeEach } from 'vitest'
import { screen, fireEvent, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GeneratorForm } from './GeneratorForm'
import { renderWithProviders } from '@/test/utils'
import { usePromptGeneratorStore } from '../store/promptGeneratorStore'
import i18n from 'i18next'
import enTranslation from '../../../../public/locales/en/translation.json'
import idTranslation from '../../../../public/locales/id/translation.json'

describe('GeneratorForm UX & Controls', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    usePromptGeneratorStore.setState({
      input: {
        niche: '',
        category: 'lifestyle',
        batchSize: 1,
        usageContext: 'commercial',
        language: 'en',
        aspectRatio: 'random',
        variationLevel: 3,
        styleMode: 'user',
        mood: { mode: 'user', value: 'none' },
        colorPalette: { mode: 'user', value: 'none' },
        artStyle: { mode: 'user', value: 'none' },
        background: { mode: 'user', value: 'none' },
        humanModel: { mode: 'user', value: 'no_people' },
        customInstructions: '',
        includeHistory: false,
        includeHistoryCount: 20,
        targetMarket: 'global',
        targetPlatform: 'dalle3',
        includeDiversity: true,
        allowTextSpace: false,
        includeNegativePrompts: true,
        includeKeywords: true,
      },
      batch: null,
      isGenerating: false,
      error: null,
      advancedOptionsOpen: false,
      _hasHydrated: true,
    })
  })

  it('renders category as searchable combobox while language is a normal select', async () => {
    const user = userEvent.setup()
    renderWithProviders(<GeneratorForm />)

    // Category button (combobox trigger)
    const categoryButton = screen.getByRole('button', { name: enTranslation.generator.form.category.label })
    expect(categoryButton).toBeInTheDocument()

    await user.click(categoryButton)
    expect(screen.getByPlaceholderText(`${enTranslation.common.search}...`)).toBeInTheDocument()

    // Filter category options
    await user.type(screen.getByPlaceholderText(`${enTranslation.common.search}...`), 'Tech')
    const listbox = screen.getByRole('listbox')
    expect(within(listbox).getByText(enTranslation.generator.form.category.options.technology)).toBeInTheDocument()

    // Language select trigger is Radix Select named by its label "Language"
    const languageTrigger = screen.getByRole('combobox', { name: enTranslation.generator.form.language.label })
    expect(languageTrigger).toBeInTheDocument()

    // Open language select dropdown and verify no search input is inside it
    await user.click(languageTrigger)
    expect(screen.getByRole('option', { name: enTranslation.generator.form.language.options.en })).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(`${enTranslation.common.search}...`)).not.toBeInTheDocument()
  })

  it('renders Custom Instructions with maxLength=500 and bounded resize classes when enabled', async () => {
    const user = userEvent.setup()
    renderWithProviders(<GeneratorForm />)

    // Toggle custom instructions switch on via id
    const customInstructionsSwitch = document.getElementById('customInstructions-toggle')!
    expect(customInstructionsSwitch).toBeInTheDocument()

    await user.click(customInstructionsSwitch)

    const textarea = screen.getByPlaceholderText(enTranslation.generator.form.customInstructions.placeholder)
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveAttribute('maxlength', '500')
    expect(textarea).toHaveClass('resize-y')
    expect(textarea).toHaveClass('min-h-[80px]')
    expect(textarea).toHaveClass('max-h-48')

    // Check character count indicator
    expect(screen.getByText('0/500')).toBeInTheDocument()
  })

  it('allows temporary batch size editing and restores the last valid value on blur', async () => {
    const user = userEvent.setup()
    renderWithProviders(<GeneratorForm />)

    const batchSizeInput = screen.getByRole('spinbutton', {
      name: enTranslation.generator.generateCount,
    })

    await user.clear(batchSizeInput)
    expect(batchSizeInput).toHaveValue(null)
    expect(usePromptGeneratorStore.getState().input.batchSize).toBe(1)

    await user.tab()
    expect(batchSizeInput).toHaveValue(1)

    await user.clear(batchSizeInput)
    await user.type(batchSizeInput, '7')
    expect(batchSizeInput).toHaveValue(7)
    expect(usePromptGeneratorStore.getState().input.batchSize).toBe(7)
  })

  describe('Variation Context history status text tiers', () => {
    it('shows low status text when includeHistoryCount is <= 15', async () => {
      usePromptGeneratorStore.setState((state) => ({
        input: { ...state.input, includeHistory: true, includeHistoryCount: 15 },
      }))

      renderWithProviders(<GeneratorForm />)

      expect(
        screen.getByText(enTranslation.generator.form.includeHistory.levels.low)
      ).toBeInTheDocument()
    })

    it('shows moderate status text when includeHistoryCount is between 16 and 35', async () => {
      usePromptGeneratorStore.setState((state) => ({
        input: { ...state.input, includeHistory: true, includeHistoryCount: 25 },
      }))

      renderWithProviders(<GeneratorForm />)

      expect(
        screen.getByText(enTranslation.generator.form.includeHistory.levels.moderate)
      ).toBeInTheDocument()
    })

    it('shows high status text when includeHistoryCount is > 35', async () => {
      usePromptGeneratorStore.setState((state) => ({
        input: { ...state.input, includeHistory: true, includeHistoryCount: 40 },
      }))

      renderWithProviders(<GeneratorForm />)

      expect(
        screen.getByText(enTranslation.generator.form.includeHistory.levels.high)
      ).toBeInTheDocument()
    })

    it('updates status text dynamically when slider value changes', async () => {
      usePromptGeneratorStore.setState((state) => ({
        input: { ...state.input, includeHistory: true, includeHistoryCount: 10 },
      }))

      renderWithProviders(<GeneratorForm />)

      expect(
        screen.getByText(enTranslation.generator.form.includeHistory.levels.low)
      ).toBeInTheDocument()

      const slider = screen.getByRole('slider', {
        name: enTranslation.generator.form.includeHistory.sliderLabel,
      })

      fireEvent.change(slider, { target: { value: '30' } })
      await waitFor(() => {
        expect(
          screen.getByText(enTranslation.generator.form.includeHistory.levels.moderate)
        ).toBeInTheDocument()
      })

      fireEvent.change(slider, { target: { value: '45' } })
      await waitFor(() => {
        expect(
          screen.getByText(enTranslation.generator.form.includeHistory.levels.high)
        ).toBeInTheDocument()
      })
    })

    it('renders localized status text when language is set to Indonesian', async () => {
      await i18n.changeLanguage('id')
      usePromptGeneratorStore.setState((state) => ({
        input: { ...state.input, includeHistory: true, includeHistoryCount: 10 },
      }))

      renderWithProviders(<GeneratorForm />, { initialPreferences: { language: 'id' } })

      expect(
        screen.getByText(idTranslation.generator.form.includeHistory.levels.low)
      ).toBeInTheDocument()
    })
  })
})
