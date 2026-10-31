'use client'

import { useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { PageSkeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/toast'
import { cn } from '@/lib/cn'
import { useUi } from '@/lib/store/ui-store'
import { useHydrated } from '@/lib/store/use-hydrated'
import { BottomNav } from './bottom-nav'
import { OfflineBanner } from './offline-indicator'
import { Sidebar, type NavItem } from './sidebar'
import { Topbar } from './topbar'

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/** Pintasan: N = order baru, / = fokus pencarian. Tidak aktif saat sedang mengetik. */
function useTenantShortcuts(enabled: boolean) {
  const router = useRouter()
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        router.push('/app/order/baru')
      } else if (e.key === '/') {
        const search = document.querySelector<HTMLElement>('[data-search]')
        if (search) {
          e.preventDefault()
          search.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled, router])
}

export function AppShell({
  nav,
  area,
  areaLabel,
  user,
  sidebarFooter,
  banner,
  children,
}: {
  nav: NavItem[]
  area: 'tenant' | 'admin'
  areaLabel: string
  user: ReactNode
  sidebarFooter?: ReactNode
  banner?: ReactNode
  children: ReactNode
}) {
  const hydrated = useHydrated()
  const focusMode = useUi((s) => s.focusMode)
  useTenantShortcuts(area === 'tenant')

  return (
    <div className={cn('min-h-dvh', !focusMode && 'md:pl-64')}>
      {!focusMode && (
        <Sidebar
          items={nav}
          areaLabel={areaLabel}
          footer={sidebarFooter}
          className="fixed inset-y-0 left-0 z-40 hidden w-64 md:flex"
        />
      )}
      <div className="flex min-h-dvh flex-col">
        <OfflineBanner />
        {!focusMode && <Topbar area={area} user={user} />}
        {banner}
        <main className={cn('flex-1 px-4 pt-5 sm:px-6 lg:px-8', focusMode ? 'pb-6' : 'pb-28 md:pb-10')}>
          <div className={cn('mx-auto', focusMode ? 'max-w-none' : 'max-w-[1400px]')}>
            {hydrated ? children : <PageSkeleton />}
          </div>
        </main>
      </div>
      {!focusMode && <BottomNav items={nav} className="md:hidden" />}
      <Toaster />
    </div>
  )
}
