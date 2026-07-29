import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Menu } from 'lucide-react'
import { SiGithub } from '@icons-pack/react-simple-icons'
import { useToast } from '@/hooks/useToast'
import { AppLogo } from '@/components/common/AppLogo'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { ToggleTheme } from '@/components/ui/toggle-theme'

export const Header = memo(function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { t, i18n } = useTranslation()
  const { showToast } = useToast()

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    showToast('success', t('toast.languageChanged', { defaultValue: 'Language updated' }))
  }

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
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => window.open('https://github.com/pyforgedev/promptforge', '_blank', 'noopener,noreferrer')}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-app"
              aria-label="GitHub"
            >
              <SiGithub className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {t('common.github', { defaultValue: 'GitHub' })}
          </TooltipContent>
        </Tooltip>
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

        <ToggleTheme />
      </div>
    </header>
  )
})
