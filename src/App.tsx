import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router'
import { Toaster } from '@/components/ui/sonner'
import { useAIConfigStore } from '@/store/useAIConfigStore'

function App() {
  const loadConfigs = useAIConfigStore(state => state.loadConfigs)

  useEffect(() => {
    loadConfigs()
  }, [loadConfigs])

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  )
}

export default App
