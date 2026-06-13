import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

const Home = lazy(() => import('@/pages/Home'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Generate = lazy(() => import('@/pages/Generate'))
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
        element: (
          <Suspense fallback={<LazyFallback />}>
            <Dashboard />
          </Suspense>
        ),
      },
      {
        path: '/generate',
        element: (
          <Suspense fallback={<LazyFallback />}>
            <Generate />
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
