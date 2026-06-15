import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Sparkles, Database, Globe, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'

const features = [
  {
    icon: FileText,
    title: 'home.featurePrompts',
    description: 'home.featurePromptsDesc',
    to: '/dashboard',
  },
  {
    icon: Sparkles,
    title: 'home.featureGenerate',
    description: 'home.featureGenerateDesc',
    to: '/generate',
  },
  {
    icon: Database,
    title: 'home.featureStorage',
    description: 'home.featureStorageDesc',
    to: '/dashboard',
  },
  {
    icon: Globe,
    title: 'home.featureI18n',
    description: 'home.featureI18nDesc',
    to: '/settings',
  },
]

export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center gap-12 py-12 md:py-20">
      <div className="flex flex-col items-center gap-4 text-center max-w-2xl px-4">
        <div className="rounded-full bg-primary/10 p-3">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          {t('home.title')}
        </h2>
        <p className="text-lg text-muted-foreground max-w-md">
          {t('home.subtitle')}
        </p>
        <Button
          size="lg"
          className="mt-2 gap-2"
          onClick={() => navigate('/dashboard')}
        >
          {t('home.getStarted')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 w-full max-w-4xl px-4 sm:grid-cols-2">
        {features.map(({ icon: Icon, title, description, to }) => (
          <Card
            key={title}
            className="cursor-pointer transition-all duration-200 hover:border-primary/30 hover:shadow-md"
            onClick={() => navigate(to)}
          >
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{t(title)}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(description)}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
