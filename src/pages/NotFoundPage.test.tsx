import { describe, it, expect } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import { render, screen, userEvent } from '@/test/utils'
import i18n from '@/i18n'
import { AppContext } from '@/app/providers/AppContext'
import { TooltipProvider } from '@/components/ui/tooltip'
import { routes } from '@/app/routes'
import { ROUTES } from '@/app/routePaths'
import type { ReactNode } from 'react'

const mockContext = {
  preferences: { theme: 'system' as const, language: 'en', rememberApiKey: true },
  isReady: true,
  setTheme: () => {},
  setLanguage: () => {},
  setRememberApiKey: () => {},
}

function renderRouter(initialPath: string) {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <I18nextProvider i18n={i18n}>
        <AppContext.Provider value={mockContext}>
          <TooltipProvider delayDuration={300}>
            {children}
          </TooltipProvider>
        </AppContext.Provider>
      </I18nextProvider>
    )
  }

  render(<Wrapper><RouterProvider router={router} /></Wrapper>)
  return router
}

describe('NotFoundPage (real router integration)', () => {
  it('renders 404 with translated title and message on unknown paths', async () => {
    renderRouter('/this-route-does-not-exist')

    expect(await screen.findByText('404')).toBeInTheDocument()
    expect(screen.getByText('Page not found')).toBeInTheDocument()
    expect(screen.getByText('This page does not exist or may have moved.')).toBeInTheDocument()
  })

  it('navigates to the home route via the Go home button', async () => {
    const router = renderRouter('/this-route-does-not-exist')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Go home' }))

    expect(router.state.location.pathname).toBe(ROUTES.home)
  })
})

describe('routes config', () => {
  it('registers a catch-all route rendering NotFoundPage', () => {
    const layout = routes[0]
    const catchAll = layout.children.find((route) => route.path === ROUTES.notFound)

    expect(catchAll).toBeDefined()
    expect(catchAll?.path).toBe('*')
  })
})