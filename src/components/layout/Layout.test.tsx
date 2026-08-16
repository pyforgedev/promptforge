import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import { render, screen, fireEvent } from '@/test/utils'
import i18n from '@/i18n'
import { AppContext } from '@/app/providers/AppContext'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Layout } from './Layout'
import { ROUTES } from '@/app/routePaths'
import type { ReactNode } from 'react'

const mockContext = {
  preferences: { theme: 'system' as const, language: 'en', rememberApiKey: true },
  isReady: true,
  setTheme: () => {},
  setLanguage: () => {},
  setRememberApiKey: () => {},
}

function renderLayoutRouter(initialPath = ROUTES.home) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <Layout />,
        children: [
          {
            path: ROUTES.home,
            element: <div data-testid="page-content">Home Content</div>,
          },
          {
            path: ROUTES.generator,
            element: <div data-testid="page-content">Generator Content</div>,
          },
          {
            path: ROUTES.settings,
            element: <div data-testid="page-content">Settings Content</div>,
          },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  )

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <I18nextProvider i18n={i18n}>
        <AppContext.Provider value={mockContext}>
          <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
        </AppContext.Provider>
      </I18nextProvider>
    )
  }

  const renderResult = render(
    <Wrapper>
      <RouterProvider router={router} />
    </Wrapper>,
  )

  return { router, ...renderResult }
}

describe('Layout interaction & integration', () => {
  const STORAGE_KEY = 'promptforge:sidebar-width'

  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  describe('Mobile drawer interactions', () => {
    it('toggles mobile drawer with hamburger button, closes on overlay click and NavLink click', () => {
      renderLayoutRouter()

      const openNavButtons = screen.getAllByRole('button', { name: 'Open navigation' })
      // Mobile hamburger is the initial one rendered in header
      const mobileMenuBtn = openNavButtons[0]

      // Initially overlay is not present
      expect(document.querySelector('.fixed.inset-0.z-drawer')).toBeNull()

      // Click mobile hamburger to open drawer
      fireEvent.click(mobileMenuBtn)
      const overlay = document.querySelector('.fixed.inset-0.z-drawer')
      expect(overlay).not.toBeNull()

      // Click overlay to close drawer
      fireEvent.click(overlay!)
      expect(document.querySelector('.fixed.inset-0.z-drawer')).toBeNull()

      // Reopen drawer, then click a NavLink
      fireEvent.click(mobileMenuBtn)
      expect(document.querySelector('.fixed.inset-0.z-drawer')).not.toBeNull()

      const generatorNavLink = screen.getByRole('link', { name: 'Generator' })
      fireEvent.click(generatorNavLink)
      expect(document.querySelector('.fixed.inset-0.z-drawer')).toBeNull()
    })
  })

  describe('Resize handle pointer drag', () => {
    it('updates sidebar width and persists to localStorage on pointer move', () => {
      renderLayoutRouter()

      const separator = screen.getByRole('separator', { name: 'Resize sidebar' })
      expect(separator).toHaveAttribute('aria-valuenow', '260')

      fireEvent.pointerDown(separator, {
        clientX: 260,
        pointerId: 1,
      })

      fireEvent(
        window,
        new MouseEvent('pointermove', {
          clientX: 300,
          bubbles: true,
        }),
      )

      expect(separator).toHaveAttribute('aria-valuenow', '300')

      fireEvent(
        window,
        new MouseEvent('pointerup', {
          clientX: 300,
          bubbles: true,
        }),
      )

      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('300')
    })

    it('collapses desktop sidebar when dragged below min width and reveals desktop open button', async () => {
      renderLayoutRouter()

      const separator = screen.getByRole('separator', { name: 'Resize sidebar' })

      // Drag below 220px (e.g. clientX: 180 delta is -80 -> candidate 180)
      fireEvent.pointerDown(separator, {
        clientX: 260,
        pointerId: 1,
      })

      fireEvent(
        window,
        new MouseEvent('pointermove', {
          clientX: 180,
          bubbles: true,
        }),
      )

      // Sidebar aside is hidden on desktop (has lg:hidden) and separator is removed from DOM
      expect(screen.queryByRole('separator', { name: 'Resize sidebar' })).toBeNull()

      // Header renders only the mobile open button immediately after collapse —
      // the desktop open button waits for the 200ms close animation to finish
      let openNavButtons = screen.getAllByRole('button', { name: 'Open navigation' })
      expect(openNavButtons).toHaveLength(1)

      // ...then appears once the collapse animation has completed
      openNavButtons = await screen.findAllByRole('button', { name: 'Open navigation' })
      expect(openNavButtons).toHaveLength(2)

      // Clicking desktop reopen button restores sidebar at last valid width
      const desktopMenuBtn = openNavButtons[1]
      fireEvent.click(desktopMenuBtn)

      const restoredSeparator = screen.getByRole('separator', { name: 'Resize sidebar' })
      expect(restoredSeparator).toBeInTheDocument()
      expect(restoredSeparator).toHaveAttribute('aria-valuenow', '260')
    })

    it('cleans up window listeners on pointercancel', () => {
      renderLayoutRouter()

      const separator = screen.getByRole('separator', { name: 'Resize sidebar' })

      fireEvent.pointerDown(separator, {
        clientX: 260,
        pointerId: 1,
      })

      // Cancel pointer event
      fireEvent(
        window,
        new MouseEvent('pointercancel', {
          clientX: 260,
          bubbles: true,
        }),
      )

      // Subsequent pointermove should not update width
      fireEvent(
        window,
        new MouseEvent('pointermove', {
          clientX: 350,
          bubbles: true,
        }),
      )

      expect(separator).toHaveAttribute('aria-valuenow', '260')
    })
  })

  describe('Keyboard navigation on resize handle', () => {
    it('adjusts width on ArrowRight and ArrowLeft', async () => {
      renderLayoutRouter()

      const separator = screen.getByRole('separator', { name: 'Resize sidebar' })

      fireEvent.keyDown(separator, { key: 'ArrowRight' })
      expect(separator).toHaveAttribute('aria-valuenow', '268')
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('268')

      fireEvent.keyDown(separator, { key: 'ArrowLeft' })
      expect(separator).toHaveAttribute('aria-valuenow', '260')
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('260')
    })

    it('jumps to min on Home and max on End', async () => {
      renderLayoutRouter()

      const separator = screen.getByRole('separator', { name: 'Resize sidebar' })

      fireEvent.keyDown(separator, { key: 'Home' })
      expect(separator).toHaveAttribute('aria-valuenow', '220')
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('220')

      fireEvent.keyDown(separator, { key: 'End' })
      expect(separator).toHaveAttribute('aria-valuenow', '400')
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('400')
    })
  })

  describe('Double click reset', () => {
    it('resets width to 260 on double click', () => {
      window.localStorage.setItem(STORAGE_KEY, '350')
      renderLayoutRouter()

      const separator = screen.getByRole('separator', { name: 'Resize sidebar' })
      expect(separator).toHaveAttribute('aria-valuenow', '350')

      fireEvent.doubleClick(separator)
      expect(separator).toHaveAttribute('aria-valuenow', '260')
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('260')
    })
  })

  describe('Desktop sidebar toggle button', () => {
    it('collapses desktop sidebar on click and reveals open navigation button', async () => {
      renderLayoutRouter()

      // Initial render: close toggle sits in the sidebar brand row (not the header),
      // and the separator is present
      const closeNavButton = screen.getByRole('button', { name: 'Close navigation' })
      expect(closeNavButton).toBeInTheDocument()
      expect(closeNavButton.closest('aside')).not.toBeNull()
      expect(closeNavButton.closest('header')).toBeNull()
      expect(screen.getByRole('separator', { name: 'Resize sidebar' })).toBeInTheDocument()

      // Click Close navigation -> sidebar collapses
      fireEvent.click(closeNavButton)

      // Separator is removed from DOM and 'Close navigation' button no longer exists
      expect(screen.queryByRole('separator', { name: 'Resize sidebar' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Close navigation' })).toBeNull()

      // Only the mobile open button exists right after the click — the desktop
      // open button must not appear instantly (waits for the 200ms close animation)
      expect(screen.getAllByRole('button', { name: 'Open navigation' })).toHaveLength(1)

      // ...it appears once the collapse animation has completed
      const openNavButtons = await screen.findAllByRole('button', { name: 'Open navigation' })
      expect(openNavButtons).toHaveLength(2)

      // Clicking desktop reopen button restores sidebar
      const desktopOpenBtn = openNavButtons[1]
      fireEvent.click(desktopOpenBtn)

      const restoredSeparator = screen.getByRole('separator', { name: 'Resize sidebar' })
      expect(restoredSeparator).toBeInTheDocument()
      expect(restoredSeparator).toHaveAttribute('aria-valuenow', '260')
      expect(screen.getByRole('button', { name: 'Close navigation' })).toBeInTheDocument()
    })
  })

  describe('Brand placement', () => {
    it('renders the brand mark and name inside the sidebar, not the header', () => {
      renderLayoutRouter()

      const brandText = screen.getByText('PromptForge')
      expect(brandText.closest('aside')).not.toBeNull()
      expect(brandText.closest('header')).toBeNull()

      const brandImg = screen.getByRole('img', { name: 'PromptForge' })
      expect(brandImg.closest('aside')).not.toBeNull()
      expect(brandImg.closest('header')).toBeNull()
    })
  })

  describe('Sidebar open/close animation', () => {
    it('applies slide-out classes on collapse and restores them on reopen', async () => {
      renderLayoutRouter()

      const aside = document.querySelector('aside')!
      expect(aside.className).toContain('lg:translate-x-0')
      expect(aside.className).not.toContain('lg:invisible')

      fireEvent.click(screen.getByRole('button', { name: 'Close navigation' }))

      expect(aside.className).toContain('lg:-translate-x-full')
      expect(aside.className).toContain('lg:w-0')
      expect(aside.className).toContain('lg:invisible')

      // Reopen restores the visible state (after the delayed open button appears)
      const openNavButtons = await screen.findAllByRole('button', { name: 'Open navigation' })
      fireEvent.click(openNavButtons[1])
      expect(aside.className).toContain('lg:translate-x-0')
      expect(aside.className).not.toContain('lg:invisible')
    })
  })

  describe('Version and active navigation rendering', () => {
    it('renders app version footer and navigation links', () => {
      renderLayoutRouter()

      expect(screen.getByText(`v${__APP_VERSION__}`)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Generator' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'History' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Templates' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Formatter' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument()
    })
  })
})
