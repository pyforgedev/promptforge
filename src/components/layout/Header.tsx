import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Sun, Moon, Monitor, Menu, Sparkles } from 'lucide-react'
import { useAppContext } from '@/hooks/useAppContext'
import { useToast } from '@/hooks/useToast'
import type { Theme } from '@/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
  const { showToast } = useToast()

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    showToast('success', t('toast.languageChanged', { defaultValue: 'Language updated successfully' }))
  }

  const handleThemeChange = (value: Theme) => {
    setTheme(value)
    showToast('success', t('toast.themeChanged', { defaultValue: 'Theme updated successfully' }))
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          className="cursor-pointer rounded-md p-2 hover:bg-secondary md:hidden"
          onClick={onMenuToggle}
          aria-label={t('nav.home')}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">
            {t('app.name')}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Select
          value={i18n.language?.startsWith('id') ? 'id' : 'en'}
          onValueChange={(v) => changeLanguage(v)}
        >
          <SelectTrigger className="w-[140px] h-8 px-3 text-xs" aria-label={t('common.selectLanguage')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">{t('language.en')}</SelectItem>
            <SelectItem value="id">{t('language.id')}</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex rounded-md border border-border">
          {themes.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              className={`cursor-pointer rounded-md p-2 transition-colors duration-150 ${
                preferences.theme === value
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
              onClick={() => handleThemeChange(value)}
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
