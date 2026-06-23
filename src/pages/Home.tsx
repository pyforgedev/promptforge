import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Sparkles, Database, Globe, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuickStats } from '@/features/history/components/QuickStats'
import { RecentPrompts } from '@/features/history/components/RecentPrompts'
import { AppLogo } from '@/components/common/AppLogo'

const features = [
  {
    icon: Sparkles,
    title: 'home.featureGenerate',
    description: 'home.featureGenerateDesc',
    to: '/generator',
    accent: 'from-brand-primary/20 to-brand-primary/5',
    iconBg: 'bg-brand-primary/15 text-brand-primary',
  },
  {
    icon: FileText,
    title: 'home.featurePrompts',
    description: 'home.featurePromptsDesc',
    to: '/templates',
    accent: 'from-brand-success/20 to-brand-success/5',
    iconBg: 'bg-brand-success/15 text-brand-success',
  },
  {
    icon: Database,
    title: 'home.featureStorage',
    description: 'home.featureStorageDesc',
    to: '/history',
    accent: 'from-brand-warning/20 to-brand-warning/5',
    iconBg: 'bg-brand-warning/15 text-brand-warning',
  },
  {
    icon: Globe,
    title: 'home.featureI18n',
    description: 'home.featureI18nDesc',
    to: '/settings',
    accent: 'from-brand-primary/10 to-transparent',
    iconBg: 'bg-border-subtle text-secondary',
  },
]

export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-12 py-8 md:gap-16 md:py-14">
      <section className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 text-center">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-brand-primary/8 blur-[80px] pointer-events-none" />
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-[300px] h-[150px] rounded-full bg-brand-primary/5 blur-[40px] pointer-events-none" />

        <AppLogo size="lg" className="mb-2 h-16 md:h-24 relative z-10 animate-stagger-1" />

        <div className="relative z-10 flex flex-col items-center gap-4 animate-stagger-2">
          <h1 className="text-display text-balance">
            {t('home.title')}
          </h1>
          <p className="max-w-xl text-balance text-body-ui leading-relaxed text-secondary">
            {t('home.subtitle')}
          </p>
        </div>

        <div className="relative z-10 flex flex-col items-center gap-3 animate-stagger-3 sm:flex-row">
          <Button
            size="lg"
            className="gap-2"
            onClick={() => navigate('/generator')}
          >
            {t('home.getStarted')}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="gap-2 text-secondary"
            onClick={() => navigate('/history')}
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
        {features.map(({ icon: Icon, title, description, to, iconBg }, i) => (
          <button
            key={title}
            onClick={() => navigate(to)}
            className="group relative flex items-start gap-4 rounded-xl border border-border-subtle bg-surface p-5 text-left transition-all duration-200 hover:border-border-strong hover:bg-surface-hover card-spotlight cursor-pointer"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105 ${iconBg}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-label-ui font-semibold text-primary group-hover:text-brand-primary transition-colors duration-150">
                {t(title)}
              </span>
              <span className="text-caption-ui text-muted leading-relaxed">
                {t(description)}
              </span>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted opacity-0 group-hover:opacity-100 transition-all duration-150 translate-x-0 group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>
    </div>
  )
}
