import { Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { ROUTES } from './routePaths'
import {
  HomePage,
  GeneratorPage,
  HistoryPage,
  TemplatesPage,
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
        element: <GeneratorPage />,
      },
      {
        path: ROUTES.history,
        element: <HistoryPage />,
      },
      {
        path: ROUTES.templates,
        element: <TemplatesPage />,
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
