import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Sparkles, Database, Globe, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuickStats } from '@/features/history/components/QuickStats'
import { RecentPrompts } from '@/features/history/components/RecentPrompts'
import { AppLogo } from '@/components/common/AppLogo'
import Aurora from '@/components/animations/Aurora'
import RotatingText from '@/components/animations/RotatingText'
import SpotlightCard from '@/components/animations/SpotlightCard'
import { ROUTES } from '@/app/routePaths'
import { useAppContext } from '@/hooks/useAppContext'
import { useEffectiveTheme } from '@/hooks/useEffectiveTheme'

const features = [
  {
    icon: Sparkles,
    title: 'home.featureGenerate',
    description: 'home.featureGenerateDesc',
    to: ROUTES.generator,
    accent: 'from-brand-primary/20 to-brand-primary/5',
    iconBg: 'bg-brand-primary/15 text-brand-primary',
  },
  {
    icon: FileText,
    title: 'home.featurePrompts',
    description: 'home.featurePromptsDesc',
    to: ROUTES.templates,
    accent: 'from-brand-success/20 to-brand-success/5',
    iconBg: 'bg-brand-success/15 text-brand-success',
  },
  {
    icon: Database,
    title: 'home.featureStorage',
    description: 'home.featureStorageDesc',
    to: ROUTES.history,
    accent: 'from-brand-warning/20 to-brand-warning/5',
    iconBg: 'bg-brand-warning/15 text-brand-warning',
  },
  {
    icon: Globe,
    title: 'home.featureI18n',
    description: 'home.featureI18nDesc',
    to: ROUTES.settings,
    accent: 'from-brand-primary/10 to-transparent',
    iconBg: 'bg-border-subtle text-secondary',
  },
]

export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { preferences } = useAppContext()
  const effectiveTheme = useEffectiveTheme(preferences.theme)
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const auroraStops =
    effectiveTheme === 'dark'
      ? ['#0B0D10', '#5B8DF8', '#0B0D10']
      : ['#FAFAFA', '#2F6FE0', '#FAFAFA']
  const spotlightColor =
    effectiveTheme === 'dark'
      ? 'rgba(91, 141, 248, 0.08)'
      : 'rgba(47, 111, 224, 0.08)'
  const rotatingStyles = t('home.rotatingStyles', { returnObjects: true }) as string[]

  return (
    <div className="flex flex-col gap-12 py-8 md:gap-16 md:py-14">
      <section className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 text-center">
        {!prefersReducedMotion && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <Aurora colorStops={auroraStops} amplitude={0.8} blend={0.35} />
          </div>
        )}

        <AppLogo size="lg" className="mb-2 h-16 md:h-24 relative z-10 animate-stagger-1" />

        <div className="relative z-10 flex flex-col items-center gap-4 animate-stagger-2">
          <h1 className="text-display text-balance">
            {t('home.title')}
          </h1>
          <p className="max-w-xl text-balance text-body-ui leading-relaxed text-secondary">
            {t('home.subtitle')}
          </p>
        </div>

        {!prefersReducedMotion && (
          <div className="relative z-10 flex items-center justify-center gap-2 text-body-mono text-muted">
            <span className="shrink-0">--style</span>
            <span className="inline-block min-w-[7rem] text-left">
              <RotatingText
                texts={rotatingStyles}
                rotationInterval={2600}
                mainClassName="flex justify-center font-medium text-brand-primary"
              />
            </span>
          </div>
        )}

        <div className="relative z-10 flex flex-col items-center gap-3 animate-stagger-3 sm:flex-row">
          <Button
            size="lg"
            className="gap-2"
            onClick={() => navigate(ROUTES.generator)}
          >
            {t('home.getStarted')}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="gap-2 text-secondary"
            onClick={() => navigate(ROUTES.history)}
          >
            {t('nav.history')}
          </Button>
        </div>
      </section>

      <div className="animate-stagger-3">
        <QuickStats />
      </div>

      <div className="animate-stagger-4">
        <RecentPrompts />
      </div>

      <div className="mx-auto grid w-full max-w-4xl gap-3 px-4 sm:grid-cols-2">
        {features.map(({ icon: Icon, title, description, to, iconBg }) => (
          <SpotlightCard
            key={title}
            spotlightColor={spotlightColor}
            className="group transition-all duration-200 hover:border-border-strong hover:bg-surface-hover"
          >
            <button
              onClick={() => navigate(to)}
              className="flex w-full cursor-pointer items-start gap-4 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105 ${iconBg}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-label-ui font-semibold text-primary transition-colors duration-150 group-hover:text-brand-primary">
                  {t(title)}
                </span>
                <span className="text-caption-ui text-muted leading-relaxed">
                  {t(description)}
                </span>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted opacity-0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-100" />
            </button>
          </SpotlightCard>
        ))}
      </div>
    </div>
  )
}
