import { useLayoutEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { useFavicon } from '@/hooks/useFavicon'
import { useSidebarState } from '@/hooks/useSidebarState'

export function Layout() {
  const sidebar = useSidebarState()
  const { pathname } = useLocation()

  useFavicon()

  useLayoutEffect(() => {
    // Reset scroll position on route change
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return (
    <div className="relative flex min-h-dvh flex-col bg-app lg:flex-row">
      <Sidebar
        isDrawerOpen={sidebar.mobileDrawerOpen}
        onCloseDrawer={sidebar.closeDrawer}
        isDesktopVisible={sidebar.desktopVisible}
        width={sidebar.width}
        onWidthChange={sidebar.setWidthValid}
        onCollapse={sidebar.collapseDesktop}
        onResetWidth={sidebar.resetWidth}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          onMobileMenuToggle={sidebar.toggleDrawer}
          isDesktopSidebarHidden={!sidebar.desktopVisible}
          onDesktopMenuToggle={sidebar.openDesktop}
        />
        <main className="z-base flex-1 p-4 md:p-6 animate-fade-in">
          <div className="mx-auto w-full max-w-[1280px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}