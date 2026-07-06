import { lazy, Suspense } from 'react'
import { LazyFallback } from '@/components/common/LazyFallback'
import { ErrorBoundary } from '@/components/ui/error-boundary'

const Home = lazy(() => import('@/pages/Home'))
const GeneratorPage = lazy(() => import('@/pages/GeneratorPage'))
const HistoryPage = lazy(() => import('@/pages/HistoryPage'))
const TemplatesPage = lazy(() => import('@/pages/TemplatesPage'))
const Settings = lazy(() => import('@/pages/Settings'))
const ErrorPageContent = lazy(() => import('@/pages/ErrorPage'))
const FormatterPageContent = lazy(() => import('@/pages/FormatterPage'))

function withErrorBoundary(Component: React.LazyExoticComponent<React.ComponentType>) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LazyFallback />}>
        <Component />
      </Suspense>
    </ErrorBoundary>
  )
}

export const HomePage = () => withErrorBoundary(Home)
export const Generator = () => withErrorBoundary(GeneratorPage)
export const History = () => withErrorBoundary(HistoryPage)
export const Templates = () => withErrorBoundary(TemplatesPage)
export const SettingsPage = () => withErrorBoundary(Settings)
export const ErrorPage = () => withErrorBoundary(ErrorPageContent)
export const FormatterPage = () => withErrorBoundary(FormatterPageContent)

