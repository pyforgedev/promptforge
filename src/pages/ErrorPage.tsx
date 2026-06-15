import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, RefreshCw, AlertCircle } from 'lucide-react';

export default function ErrorPage() {
  const error = useRouteError();
  const isDev = import.meta.env.DEV;

  let errorMessage = 'Unexpected Error';
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
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-app p-4">
      <div className="max-w-2xl w-full bg-bg-surface border border-border-strong rounded-lg shadow-2xl p-8 backdrop-blur-md">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="p-4 bg-red-500/10 rounded-full">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          
          <h1 className="text-6xl font-mono font-bold text-text-primary tracking-tighter">
            {errorStatus}
          </h1>
          
          <p className="text-xl text-text-secondary">
            {isDev ? errorMessage : 'Oops! Something went wrong in the forge.'}
          </p>

          <div className="flex items-center gap-4 pt-4">
            <Button onClick={handleGoHome} className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Go Home
            </Button>
            <Button variant="ghost" onClick={handleReload} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </Button>
          </div>

          {isDev && errorStack && (
            <div className="w-full mt-8 text-left">
              <p className="text-xs font-mono text-text-muted mb-2 uppercase tracking-widest">Stack Trace</p>
              <div className="bg-black/50 p-4 rounded border border-border-subtle overflow-auto max-h-[400px]">
                <pre className="font-mono text-xs text-red-400 leading-relaxed whitespace-pre-wrap">
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
