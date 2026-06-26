import { Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
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
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
      {
        path: '/dashboard',
        element: <Navigate to="/templates" replace />,
      },
      {
        path: '/generator',
        element: <Generator />,
      },
      {
        path: '/history',
        element: <History />,
      },
      {
        path: '/templates',
        element: <Templates />,
      },
      {
        path: '/formatter',
        element: <FormatterPage />,
      },
      {
        path: '/settings',
        element: <SettingsPage />,
      },
    ],
  },
]
