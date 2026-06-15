import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

const Home = lazy(() => import('@/pages/Home'))

const GeneratorPage = lazy(() => import('@/pages/GeneratorPage'))
const HistoryPage = lazy(() => import('@/pages/HistoryPage'))
const TemplatesPage = lazy(() => import('@/pages/TemplatesPage'))
const Settings = lazy(() => import('@/pages/Settings'))

function LazyFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <LoadingSpinner />
    </div>
  )
}

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: '/',
        element: (
          <Suspense fallback={<LazyFallback />}>
            <Home />
          </Suspense>
        ),
      },
      {
        path: '/dashboard',
        element: <Navigate to="/templates" replace />,
      },

      {
        path: '/generator',
        element: (
          <Suspense fallback={<LazyFallback />}>
            <GeneratorPage />
          </Suspense>
        ),
      },
      {
        path: '/history',
        element: (
          <Suspense fallback={<LazyFallback />}>
            <HistoryPage />
          </Suspense>
        ),
      },
      {
        path: '/templates',
        element: (
          <Suspense fallback={<LazyFallback />}>
            <TemplatesPage />
          </Suspense>
        ),
      },
      {
        path: '/settings',
        element: (
          <Suspense fallback={<LazyFallback />}>
            <Settings />
          </Suspense>
        ),
      },
    ],
  },
])
