import { useTranslation } from 'react-i18next'
import { useAppContext } from '@/hooks/useAppContext'

export default function Settings() {
  const { t, i18n } = useTranslation()
  const { preferences, setTheme, setLanguage } = useAppContext()

  return (
    <div className="mx-auto max-w-lg flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-foreground">
        {t('nav.settings')}
      </h2>

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">
              {t('theme.light')}
            </label>
            <select
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
              value={preferences.theme}
              onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
              aria-label={t('theme.light')}
            >
              <option value="light">{t('theme.light')}</option>
              <option value="dark">{t('theme.dark')}</option>
              <option value="system">{t('theme.system')}</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">
              {t('language.en')}
            </label>
            <select
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
              value={i18n.language}
              onChange={(e) => {
                setLanguage(e.target.value)
                i18n.changeLanguage(e.target.value)
              }}
              aria-label={t('common.selectLanguage')}
            >
              <option value="en">{t('language.en')}</option>
              <option value="es">{t('language.es')}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
