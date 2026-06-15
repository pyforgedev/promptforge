import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Sun, Moon, Monitor, Menu, Sparkles, Check } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

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

  const ActiveThemeIcon = themes.find(t => t.value === preferences.theme)?.icon || Monitor

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-6 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <button
          className="cursor-pointer rounded-md p-2 hover:bg-[var(--bg-surface-hover)] md:hidden"
          onClick={onMenuToggle}
          aria-label={t('nav.home')}
        >
          <Menu className="h-5 w-5 text-[var(--text-primary)]" />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[var(--brand-primary)]" />
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
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
            <SelectItem value="en" className={i18n.language?.startsWith('en') ? 'font-bold' : ''}>
              {t('language.en')}
            </SelectItem>
            <SelectItem value="id" className={i18n.language?.startsWith('id') ? 'font-bold' : ''}>
              {t('language.id')}
            </SelectItem>
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 w-8 px-0" aria-label="Toggle theme">
              <ActiveThemeIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {themes.map(({ value, icon: Icon, label }) => (
              <DropdownMenuItem
                key={value}
                onSelect={() => handleThemeChange(value)}
                className={`flex items-center gap-2 cursor-pointer ${
                  preferences.theme === value ? 'font-bold text-[var(--brand-primary)] bg-[var(--brand-primary)]/10' : ''
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{t(label)}</span>
                {preferences.theme === value && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
})
