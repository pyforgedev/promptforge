import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Home, RefreshCw, AlertCircle } from 'lucide-react';
import { ROUTES } from '@/app/routePaths';

export default function ErrorPage() {
  const error = useRouteError();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isDev = import.meta.env.DEV;

  let errorMessage = t('errorPage.unexpectedError');
  let errorStatus = '500';
  let errorStack = '';

  if (isRouteErrorResponse(error)) {
    errorMessage = error.data?.message || error.statusText;
    errorStatus = error.status.toString();
  } else if (error instanceof Error) {
    errorMessage = error.message;
    errorStack = error.stack || '';
  }

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate(ROUTES.home);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-app p-4">
      <div className="max-w-2xl w-full overlay-glass border-l-[3px] border-l-brand-danger p-8 rounded-lg">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="p-4 bg-brand-danger/10 rounded-full">
            <AlertCircle className="w-12 h-12 text-brand-danger" />
          </div>

          <h1 className="text-6xl font-mono font-bold text-primary tracking-tighter">
            {errorStatus}
          </h1>

          <p className="text-body-ui text-secondary">
            {isDev ? errorMessage : t('errorPage.genericMessage')}
          </p>

          <div className="flex items-center gap-4 pt-4">
            <Button onClick={handleGoHome} className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              {t('errorPage.goHome')}
            </Button>
            <Button variant="ghost" onClick={handleReload} className="flex items-center gap-2 text-secondary hover:text-primary">
              <RefreshCw className="w-4 h-4" />
              {t('errorPage.reloadPage')}
            </Button>
          </div>

          {isDev && errorStack && (
            <div className="w-full mt-8 text-left">
              <p className="mb-2 text-caption-ui font-mono text-muted">{t('errorPage.stackTrace')}</p>
              <div className="bg-surface/50 p-4 rounded border border-border-subtle overflow-auto max-h-[400px]">
                <pre className="font-mono text-caption-ui text-brand-danger leading-relaxed whitespace-pre-wrap">
                  {errorStack}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
