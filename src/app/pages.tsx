import { lazy, Suspense } from 'react'
import { LazyFallback } from '@/components/common/LazyFallback'
import { ErrorBoundary } from '@/components/ui/error-boundary'

const HomeLazy = lazy(() => import('@/pages/HomePage'))
const GeneratorLazy = lazy(() => import('@/pages/GeneratorPage'))
const HistoryLazy = lazy(() => import('@/pages/HistoryPage'))
const TemplatesLazy = lazy(() => import('@/pages/TemplatesPage'))
const SettingsLazy = lazy(() => import('@/pages/SettingsPage'))
const ErrorPageLazy = lazy(() => import('@/pages/ErrorPage'))
const FormatterPageLazy = lazy(() => import('@/pages/FormatterPage'))
const NotFoundPageLazy = lazy(() => import('@/pages/NotFoundPage'))

function withErrorBoundary(Component: React.LazyExoticComponent<React.ComponentType>) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LazyFallback />}>
        <Component />
      </Suspense>
    </ErrorBoundary>
  )
}

export const HomePage = () => withErrorBoundary(HomeLazy)
export const GeneratorPage = () => withErrorBoundary(GeneratorLazy)
export const HistoryPage = () => withErrorBoundary(HistoryLazy)
export const TemplatesPage = () => withErrorBoundary(TemplatesLazy)
export const SettingsPage = () => withErrorBoundary(SettingsLazy)
export const ErrorPage = () => withErrorBoundary(ErrorPageLazy)
export const FormatterPage = () => withErrorBoundary(FormatterPageLazy)
export const NotFoundPage = () => withErrorBoundary(NotFoundPageLazy)
