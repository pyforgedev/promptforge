import { useState, useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router'
import { Toaster } from '@/components/ui/sonner'
import { useAIConfigStore } from '@/store/useAIConfigStore'
import { ensureMasterKey } from '@/lib/crypto'
import { migrateFromSessionStorageKey } from '@/lib/migrateCryptoKey'
import { Analytics } from '@vercel/analytics/react'
import { useSpotlightBorder } from '@/hooks/useSpotlightBorder'

import '@/lib/axiosSetup'

function App() {
  const loadConfigs = useAIConfigStore(state => state.loadConfigs)
  const [cryptoReady, setCryptoReady] = useState(false)
  useSpotlightBorder()

  // Crypto must be ready (persistent master key created/migrated) before the
  // AI config store tries to decrypt saved settings.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await ensureMasterKey()
      } catch {
        // Never block startup — loadConfigs will surface a recovery state.
      }
      try {
        await migrateFromSessionStorageKey()
      } catch {
        // Migration failures must not block startup either.
      }
      if (!cancelled) setCryptoReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (cryptoReady) loadConfigs()
  }, [cryptoReady, loadConfigs])

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
      <Analytics />
    </>
  )
}

export default App