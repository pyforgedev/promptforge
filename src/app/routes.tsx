import { Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { ROUTES } from './routePaths'
import {
  HomePage,
  Generator,
  History,
  Templates,
  SettingsPage,
  ErrorPage,
  FormatterPage,
} from './pages'

export const routes = [
  {
    path: ROUTES.home,
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: ROUTES.home,
        element: <HomePage />,
      },
      {
        path: ROUTES.dashboard,
        element: <Navigate to={ROUTES.templates} replace />,
      },
      {
        path: ROUTES.generator,
        element: <Generator />,
      },
      {
        path: ROUTES.history,
        element: <History />,
      },
      {
        path: ROUTES.templates,
        element: <Templates />,
      },
      {
        path: ROUTES.formatter,
        element: <FormatterPage />,
      },
      {
        path: ROUTES.settings,
        element: <SettingsPage />,
      },
    ],
  },
]
