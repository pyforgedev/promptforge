import { memo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Home, Settings, Wand2, FileText, Clock, ListChecks,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { ROUTES, type RoutePath } from '@/app/routePaths'
import {
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_KEYBOARD_STEP,
  resolveResize,
} from '@/hooks/useSidebarState'
import { AppLogo } from '@/components/common/AppLogo'
import { MenuButton } from './MenuButton'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

interface SidebarProps {
  isDrawerOpen: boolean
  onCloseDrawer: () => void
  isDesktopVisible: boolean
  width: number
  onWidthChange: (candidate: number) => void
  onCollapse: () => void
  onResetWidth: () => void
}

const navItems: { to: RoutePath; icon: typeof Home; label: string }[] = [
  { to: ROUTES.home, icon: Home, label: 'nav.home' },
  { to: ROUTES.generator, icon: Wand2, label: 'nav.generator' },
  { to: ROUTES.history, icon: Clock, label: 'nav.history' },
  { to: ROUTES.templates, icon: FileText, label: 'nav.templates' },
  { to: ROUTES.formatter, icon: ListChecks, label: 'nav.formatter' },
  { to: ROUTES.settings, icon: Settings, label: 'nav.settings' },
]

function SidebarResizeHandle({
  width,
  onWidthChange,
  onCollapse,
  onResetWidth,
  onResizeStart,
  onResizeEnd,
}: {
  width: number
  onWidthChange: (candidate: number) => void
  onCollapse: () => void
  onResetWidth: () => void
  onResizeStart: () => void
  onResizeEnd: () => void
}) {
  const { t } = useTranslation()

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      const startX = e.clientX
      const startWidth = width
      const target = e.currentTarget
      target.setPointerCapture(e.pointerId)
      onResizeStart()

      let cleanedUp = false
      const cleanup = () => {
        if (cleanedUp) return
        cleanedUp = true
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
        window.removeEventListener('pointercancel', handlePointerUp)
        if (target.hasPointerCapture(e.pointerId)) {
          try {
            target.releasePointerCapture(e.pointerId)
          } catch {
            // Pointer already released — safe to ignore.
          }
        }
        onResizeEnd()
      }

      const handlePointerMove = (ev: PointerEvent) => {
        const resolution = resolveResize(startWidth + (ev.clientX - startX))
        if (resolution.type === 'collapse') {
          cleanup()
          onCollapse()
          return
        }
        onWidthChange(resolution.width)
      }

      const handlePointerUp = () => cleanup()

      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
      window.addEventListener('pointercancel', handlePointerUp)
    },
    [width, onWidthChange, onCollapse, onResizeStart, onResizeEnd],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          onWidthChange(width - SIDEBAR_KEYBOARD_STEP)
          break
        case 'ArrowRight':
          e.preventDefault()
          onWidthChange(width + SIDEBAR_KEYBOARD_STEP)
          break
        case 'Home':
          e.preventDefault()
          onWidthChange(SIDEBAR_MIN_WIDTH)
          break
        case 'End':
          e.preventDefault()
          onWidthChange(SIDEBAR_MAX_WIDTH)
          break
      }
    },
    [width, onWidthChange],
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-valuemin={SIDEBAR_MIN_WIDTH}
          aria-valuemax={SIDEBAR_MAX_WIDTH}
          aria-valuenow={width}
          aria-label={t('common.resizeSidebar', { defaultValue: 'Resize sidebar' })}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onKeyDown={handleKeyDown}
          onDoubleClick={onResetWidth}
          className="group absolute right-0 top-0 hidden h-full w-4 cursor-col-resize touch-none select-none items-center justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-primary lg:flex"
        >
          <span className="h-10 w-[3px] rounded-full bg-border-strong/70 transition-colors duration-150 group-hover:bg-brand-primary/60 group-active:bg-brand-primary/70" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">
        {t('common.resizeSidebarHint', {
          defaultValue: 'Drag to resize — double-click to reset',
        })}
      </TooltipContent>
    </Tooltip>
  )
}

export const Sidebar = memo(function Sidebar({
  isDrawerOpen,
  onCloseDrawer,
  isDesktopVisible,
  width,
  onWidthChange,
  onCollapse,
  onResetWidth,
}: SidebarProps) {
  const { t } = useTranslation()
  const [isResizing, setIsResizing] = useState(false)

  return (
    <>
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-drawer bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseDrawer}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-drawer flex h-dvh w-[260px] flex-col border-r border-border-subtle bg-surface/95 backdrop-blur-md transition-[width,transform,visibility] duration-200 ease-out motion-reduce:transition-none lg:sticky lg:top-0 lg:z-auto lg:min-w-0 lg:overflow-hidden lg:w-(--sb-w) ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isDesktopVisible
            ? 'lg:translate-x-0'
            : 'lg:-translate-x-full lg:w-0 lg:invisible'
        } ${isResizing ? 'lg:transition-none' : ''}`}
        style={{ '--sb-w': `${width}px` } as React.CSSProperties}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border-subtle px-3">
            <AppLogo size="sm" />
            <span className="text-label-ui font-semibold text-primary tracking-tight">
              {t('app.name')}
            </span>
            {isDesktopVisible && (
              <MenuButton
                onClick={onCollapse}
                className="ml-auto hidden lg:flex"
                label={t('common.closeNavigation', { defaultValue: 'Close navigation' })}
                variant="close"
              />
            )}
          </div>

          <nav className="flex flex-1 flex-col gap-0.5 p-3">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === ROUTES.home}
                onClick={onCloseDrawer}
                className={({ isActive }) =>
                  `group relative flex min-w-[44px] cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-label-ui font-medium tracking-tight transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-app lg:min-w-0 ${
                    isActive
                      ? 'bg-brand-primary/10 text-brand-primary'
                      : 'text-secondary hover:bg-surface-hover hover:text-primary'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-brand-primary" />
                    )}
                    <Icon className={`h-4 w-4 transition-colors duration-150 ${isActive ? 'text-brand-primary' : 'text-muted group-hover:text-primary'}`} />
                    {t(label)}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-border-subtle px-3 py-2.5">
            <span className="font-mono text-caption-ui text-muted tabular">v{__APP_VERSION__}</span>
          </div>
        </div>

        {isDesktopVisible && (
          <SidebarResizeHandle
            width={width}
            onWidthChange={onWidthChange}
            onCollapse={onCollapse}
            onResetWidth={onResetWidth}
            onResizeStart={() => setIsResizing(true)}
            onResizeEnd={() => setIsResizing(false)}
          />
        )}
      </aside>
    </>
  )
})