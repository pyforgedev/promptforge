import { memo, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SiGithub } from '@icons-pack/react-simple-icons'
import { US, ID } from 'country-flag-icons/react/3x2'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { ToggleTheme } from '@/components/ui/toggle-theme'
import { SIDEBAR_TRANSITION_MS } from '@/hooks/useSidebarState'
import { MenuButton } from './MenuButton'

interface HeaderProps {
  onMobileMenuToggle: () => void
  /** True when the persistent desktop sidebar is collapsed/hidden. */
  isDesktopSidebarHidden: boolean
  onDesktopMenuToggle: () => void
}

export const Header = memo(function Header({
  onMobileMenuToggle,
  isDesktopSidebarHidden,
  onDesktopMenuToggle,
}: HeaderProps) {
  const { t, i18n } = useTranslation()
  const [showDesktopOpenButton, setShowDesktopOpenButton] = useState(isDesktopSidebarHidden)

  // The desktop open button must appear only *after* the sidebar has finished
  // closing — rendering it instantly while the collapse animation (200ms) is
  // still playing looks like a FOUC/glitch in the header.
  useEffect(() => {
    if (!isDesktopSidebarHidden) {
      setShowDesktopOpenButton(false)
      return
    }
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const delay = prefersReducedMotion ? 0 : SIDEBAR_TRANSITION_MS
    const timeoutId = window.setTimeout(() => setShowDesktopOpenButton(true), delay)
    return () => window.clearTimeout(timeoutId)
  }, [isDesktopSidebarHidden])

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
  }

  return (
    <header className="sticky top-0 z-sticky flex h-14 items-center justify-between border-b border-border-subtle bg-surface/80 px-4 md:px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <MenuButton
          onClick={onMobileMenuToggle}
          className="lg:hidden"
          label={t('common.openNavigation', { defaultValue: 'Open navigation' })}
          variant="open"
        />
        {isDesktopSidebarHidden && showDesktopOpenButton && (
          <MenuButton
            onClick={onDesktopMenuToggle}
            className="hidden lg:flex animate-in motion-reduce:animate-none"
            label={t('common.openNavigation', { defaultValue: 'Open navigation' })}
            variant="open"
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => window.open('https://github.com/pyforgedev/promptforge', '_blank', 'noopener,noreferrer')}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-app"
              aria-label="GitHub"
            >
              <SiGithub className="h-4 w-4" title="" />
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
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger className="flex h-9 w-11 items-center justify-center rounded-md border border-border-subtle bg-transparent p-1 text-muted transition-all duration-150 hover:bg-surface-hover hover:text-primary active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-app" aria-label={t('common.selectLanguage')}>
                <SelectValue>
                  {i18n.language?.startsWith('id') ? (
                    <ID className="h-3 w-5" />
                  ) : (
                    <US className="h-3 w-5" />
                  )}
                </SelectValue>
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {t('common.selectLanguage', { defaultValue: 'Select language' })}
            </TooltipContent>
          </Tooltip>
          <SelectContent>
            <SelectItem value="en" className={i18n.language?.startsWith('en') ? 'font-semibold' : ''}>
              <span className="flex items-center gap-2">
                <US className="h-3 w-5" />
                <span>{t('language.en')}</span>
              </span>
            </SelectItem>
            <SelectItem value="id" className={i18n.language?.startsWith('id') ? 'font-semibold' : ''}>
              <span className="flex items-center gap-2">
                <ID className="h-3 w-5" />
                <span>{t('language.id')}</span>
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        <ToggleTheme />
      </div>
    </header>
  )
})