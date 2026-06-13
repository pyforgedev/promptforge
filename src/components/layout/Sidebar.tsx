import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Home, LayoutDashboard, Settings, Sparkles } from 'lucide-react'
import { NavLink } from 'react-router-dom'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navItems = [
  { to: '/', icon: Home, label: 'nav.home' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'nav.dashboard' },
  { to: '/generate', icon: Sparkles, label: 'nav.generate' },
  { to: '/settings', icon: Settings, label: 'nav.settings' },
]

export const Sidebar = memo(function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { t } = useTranslation()

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-14 z-40 h-[calc(100vh-3.5rem)] w-60 transform border-r border-border bg-background transition-transform duration-200 md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="flex flex-col gap-1 p-4">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {t(label)}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
})
