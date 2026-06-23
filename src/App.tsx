import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router'
import { Toaster } from '@/components/ui/sonner'
import { useAIConfigStore } from '@/store/useAIConfigStore'
import { Analytics } from '@vercel/analytics/react'
import { useSpotlightBorder } from '@/hooks/useSpotlightBorder'

function App() {
  const loadConfigs = useAIConfigStore(state => state.loadConfigs)
  useSpotlightBorder()

  useEffect(() => {
    loadConfigs()
  }, [loadConfigs])

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
      <Analytics />
    </>
  )
}

export default App
