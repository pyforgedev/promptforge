import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n'
import { AppProvider } from '@/app/providers'
import { TooltipProvider } from '@/components/ui/tooltip'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <AppProvider>
        <TooltipProvider delayDuration={300}>
          <App />
        </TooltipProvider>
      </AppProvider>
    </I18nextProvider>
  </StrictMode>,
)
