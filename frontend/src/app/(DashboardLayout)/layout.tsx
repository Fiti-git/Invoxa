'use client'

import Header from './layout/header/Header'
import Sidebar from './layout/sidebar/Sidebar'
import { useAuth } from '@/lib/auth'
import { SidebarStateProvider, useSidebarState } from '@/lib/sidebar-state'

function Shell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebarState()
  return (
    <div className='flex w-full min-h-screen bg-background'>
      {/* Desktop sidebar */}
      <aside
        data-collapsed={collapsed}
        className={`hidden xl:flex flex-col fixed inset-y-0 left-0 z-30 bg-background border-r border-border/60 transition-[width] duration-200 ease-out ${
          collapsed ? 'w-[80px]' : 'w-[260px]'
        }`}
      >
        <Sidebar />
      </aside>

      {/* Main column */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-[margin] duration-200 ease-out ${
          collapsed ? 'xl:ml-[80px]' : 'xl:ml-[260px]'
        }`}
      >
        <Header />
        <main className='flex-1 bg-lightgray dark:bg-dark'>
          <div className='container mx-auto px-6 py-8'>{children}</div>
        </main>
      </div>
    </div>
  )
}

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { me, loading } = useAuth()
  if (loading || !me) {
    return (
      <div className='min-h-screen flex items-center justify-center text-link'>
        Loading…
      </div>
    )
  }
  return (
    <SidebarStateProvider>
      <Shell>{children}</Shell>
    </SidebarStateProvider>
  )
}
