import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen, userEvent, within } from '@/test/utils'
import TemplatesPage from '@/pages/TemplatesPage'

function renderPage() {
  return renderWithProviders(<TemplatesPage />, { route: '/templates', routePath: '/templates' })
}

describe('TemplatesPage toolbar responsiveness', () => {
  it('renders import/export/reset/create actions in a wrapping toolbar', () => {
    renderPage()

    // The action toolbar lives in the page header, outside the loading state
    const importBtn = screen.getByRole('button', { name: 'Import' })
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset Default' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Template' })).toBeInTheDocument()

    // Toolbar container: deterministic 2×2 grid on mobile, wraps at sm+
    const toolbar = importBtn.parentElement!
    expect(toolbar.className).toContain('grid-cols-2')
    expect(toolbar.className).toContain('sm:flex-wrap')

    // PageHeader action wrapper may shrink with the viewport (no shrink-0)
    const wrapper = toolbar.parentElement!
    expect(wrapper.className).toContain('min-w-0')
    expect(wrapper.className).not.toContain('shrink-0')
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
