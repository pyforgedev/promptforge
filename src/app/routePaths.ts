export const ROUTES = {
  home: '/',
  generator: '/generator',
  history: '/history',
  templates: '/templates',
  formatter: '/formatter',
  settings: '/settings',
  dashboard: '/dashboard',
  notFound: '*',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]
