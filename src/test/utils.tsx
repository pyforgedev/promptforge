import { render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from 'i18next'
import type { ReactNode } from 'react'

import { AppContext } from '@/app/providers/AppContext'
import type { AppPreferences } from '@/types'

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'queries'> {
  route?: string
  routePath?: string
  initialPreferences?: Partial<AppPreferences>
}

const defaultPreferences: AppPreferences = {
  theme: 'system',
  language: 'en',
}

export function renderWithProviders(
  ui: ReactNode,
  {
    route = '/',
    routePath = '/',
    initialPreferences = {},
    ...options
  }: RenderWithProvidersOptions = {}
) {
  const mergedPreferences = { ...defaultPreferences, ...initialPreferences }

  const mockContext = {
    preferences: mergedPreferences,
    isReady: true,
    setTheme: () => {},
    setLanguage: (lang: string) => {
      void i18n.changeLanguage(lang)
    },
  }

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <I18nextProvider i18n={i18n}>
        <AppContext.Provider value={mockContext}>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route path={routePath} element={children} />
            </Routes>
          </MemoryRouter>
        </AppContext.Provider>
      </I18nextProvider>
    )
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    i18nInstance: i18n,
  }
}

// Re-export testing library utilities
// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
