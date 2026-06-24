import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Home, Settings, Wand2, FileText, Clock,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navItems = [
  { to: '/', icon: Home, label: 'nav.home' },
  { to: '/generator', icon: Wand2, label: 'nav.generator' },
  { to: '/history', icon: Clock, label: 'nav.history' },
  { to: '/templates', icon: FileText, label: 'nav.templates' },
  { to: '/settings', icon: Settings, label: 'nav.settings' },
]

export const Sidebar = memo(function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { t } = useTranslation()

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-drawer bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-14 z-drawer h-[calc(100dvh-3.5rem)] w-[260px] border-r border-border-subtle bg-surface/95 backdrop-blur-md transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <nav className="flex flex-col gap-0.5 p-3">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
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
      </aside>
    </>
  )
})
