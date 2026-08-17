import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/utils'
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
