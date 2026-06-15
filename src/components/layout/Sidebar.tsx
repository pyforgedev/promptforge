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
          className="fixed inset-0 z-30 bg-black/70 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 transform border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-transform duration-200 md:static md:translate-x-0 ${
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
                `flex cursor-pointer items-center gap-3 rounded-md px-4 py-2.5 text-[13px] font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
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
