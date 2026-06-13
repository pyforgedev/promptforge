import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Sun, Moon, Monitor, Menu } from 'lucide-react'
import { useAppContext } from '@/hooks/useAppContext'
import type { Theme } from '@/types'

const themes: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'theme.light' },
  { value: 'dark', icon: Moon, label: 'theme.dark' },
  { value: 'system', icon: Monitor, label: 'theme.system' },
]

interface HeaderProps {
  onMenuToggle: () => void
}

export const Header = memo(function Header({ onMenuToggle }: HeaderProps) {
  const { t, i18n } = useTranslation()
  const { preferences, setTheme } = useAppContext()

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-3">
        <button
          className="rounded-md p-2 hover:bg-secondary md:hidden"
          onClick={onMenuToggle}
          aria-label={t('nav.home')}
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">
          {t('app.name')}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <select
          className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
          value={i18n.language}
          onChange={(e) => changeLanguage(e.target.value)}
          aria-label={t('common.selectLanguage')}
        >
          <option value="en">{t('language.en')}</option>
          <option value="es">{t('language.es')}</option>
        </select>

        <div className="flex rounded-md border border-input">
          {themes.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              className={`rounded-md p-2 transition-colors duration-150 ${
                preferences.theme === value
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
              onClick={() => setTheme(value)}
              aria-label={t(label)}
              title={t(label)}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
    </header>
  )
})
