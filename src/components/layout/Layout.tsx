import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { useFavicon } from '@/hooks/useFavicon'

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  useFavicon()

  return (
    <div className="relative flex min-h-dvh flex-col bg-app">
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="z-base flex-1 overflow-auto p-4 md:p-6 lg:ml-[260px] animate-fade-in">
          <div className="mx-auto w-full max-w-[1280px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
