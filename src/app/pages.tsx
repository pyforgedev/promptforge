import { lazy, Suspense } from 'react'
import { LazyFallback } from '@/components/common/LazyFallback'

const Home = lazy(() => import('@/pages/Home'))
const GeneratorPage = lazy(() => import('@/pages/GeneratorPage'))
const HistoryPage = lazy(() => import('@/pages/HistoryPage'))
const TemplatesPage = lazy(() => import('@/pages/TemplatesPage'))
const Settings = lazy(() => import('@/pages/Settings'))
const ErrorPageContent = lazy(() => import('@/pages/ErrorPage'))

export const HomePage = () => <Suspense fallback={<LazyFallback />}><Home /></Suspense>
export const Generator = () => <Suspense fallback={<LazyFallback />}><GeneratorPage /></Suspense>
export const History = () => <Suspense fallback={<LazyFallback />}><HistoryPage /></Suspense>
export const Templates = () => <Suspense fallback={<LazyFallback />}><TemplatesPage /></Suspense>
export const SettingsPage = () => <Suspense fallback={<LazyFallback />}><Settings /></Suspense>
export const ErrorPage = () => <Suspense fallback={<LazyFallback />}><ErrorPageContent /></Suspense>
