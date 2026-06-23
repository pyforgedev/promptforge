import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Sun, Moon, Monitor, Menu, Check } from 'lucide-react'
import { useAppContext } from '@/hooks/useAppContext'
import { useToast } from '@/hooks/useToast'
import { AppLogo } from '@/components/common/AppLogo'
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
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

const themes: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'theme.light' },
  { value: 'dark', icon: Moon, label: 'theme.dark' },
  { value: 'system', icon: Monitor, label: 'theme.system' },
]

export const Header = memo(function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { t, i18n } = useTranslation()
  const { preferences, setTheme } = useAppContext()
  const { showToast } = useToast()

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    showToast('success', t('toast.languageChanged', { defaultValue: 'Language updated' }))
  }

  const handleThemeChange = (value: Theme) => {
    setTheme(value)
    showToast('success', t('toast.themeChanged', { defaultValue: 'Theme updated' }))
  }

  const ActiveThemeIcon = themes.find(entry => entry.value === preferences.theme)?.icon || Monitor

  return (
    <header className="sticky top-0 z-sticky flex h-14 items-center justify-between border-b border-border-subtle bg-surface/80 px-4 md:px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          className="cursor-pointer rounded-md p-1.5 transition-colors duration-150 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-app lg:hidden"
          onClick={onMenuToggle}
          aria-label={t('common.openNavigation', { defaultValue: 'Open navigation' })}
        >
          <Menu className="h-5 w-5 text-primary" />
        </button>
        <div className="flex items-center gap-2.5">
          <AppLogo size="sm" />
          <span className="text-label-ui font-semibold text-primary tracking-tight">
            {t('app.name')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={i18n.language?.startsWith('id') ? 'id' : 'en'}
          onValueChange={(v) => changeLanguage(v)}
        >
          <SelectTrigger className="h-8 w-[130px] border-border-subtle bg-transparent px-3 text-caption-ui transition-colors hover:bg-surface-hover" aria-label={t('common.selectLanguage')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en" className={i18n.language?.startsWith('en') ? 'font-semibold' : ''}>
              {t('language.en')}
            </SelectItem>
            <SelectItem value="id" className={i18n.language?.startsWith('id') ? 'font-semibold' : ''}>
              {t('language.id')}
            </SelectItem>
          </SelectContent>
        </Select>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 px-0 hover:bg-surface-hover transition-colors" aria-label={t('theme.toggleTheme')}>
                  <ActiveThemeIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              {t('theme.toggleTheme')}
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-40">
            {themes.map(({ value, icon: Icon, label }) => (
              <DropdownMenuItem
                key={value}
                onSelect={() => handleThemeChange(value)}
                className={`flex items-center gap-2 cursor-pointer ${
                  preferences.theme === value ? 'font-medium text-brand-primary bg-brand-primary/8' : ''
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{t(label)}</span>
                {preferences.theme === value && <Check className="ml-auto h-3.5 w-3.5" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
})
