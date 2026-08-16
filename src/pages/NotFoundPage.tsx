import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Home, Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/app/routePaths'

export default function NotFoundPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-svh items-center justify-center bg-app p-4">
      <div className="w-full max-w-2xl overlay-glass border-l-[3px] border-l-brand-warning p-8 rounded-lg">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="p-4 bg-brand-warning/10 rounded-full">
            <Compass className="h-12 w-12 text-brand-warning" />
          </div>

          <h1 className="text-6xl font-mono font-bold text-primary tracking-tighter">
            404
          </h1>

          <div className="flex flex-col gap-1.5">
            <p className="text-body-ui font-medium text-primary">
              {t('notFoundPage.title')}
            </p>
            <p className="text-body-ui text-secondary">
              {t('notFoundPage.message')}
            </p>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <Button onClick={() => navigate(ROUTES.home)} className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              {t('notFoundPage.goHome')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}