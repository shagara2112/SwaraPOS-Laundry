'use client'

import { RotateCcw, Store } from 'lucide-react'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { useDemo } from '@/lib/store/demo-store'
import { useHydrated } from '@/lib/store/use-hydrated'
import { BrandLogo } from './brand-mark'
import { OfflineIndicator } from './offline-indicator'
import { ThemeToggle } from './theme-toggle'

function OutletSwitcher() {
  const outlets = useDemo((s) => s.outlets)
  const activeOutletId = useDemo((s) => s.activeOutletId)
  return (
    <label className="relative flex items-center">
      <span className="sr-only">Outlet aktif</span>
      <Store className="pointer-events-none absolute left-3 size-4 text-fg-subtle" aria-hidden />
      <select
        value={activeOutletId}
        onChange={(e) => useDemo.setState({ activeOutletId: e.target.value })}
        className="h-10 max-w-[11rem] appearance-none truncate rounded-xl border border-border bg-surface pl-9 pr-3 text-sm font-medium text-fg hover:border-border-strong focus:border-primary focus:outline-none sm:max-w-none pointer-coarse:h-11"
      >
        {outlets.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name.replace('Laundry Bersih Kilat ', 'Outlet ')}
          </option>
        ))}
      </select>
    </label>
  )
}

function ResetDemoButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid size-10 place-items-center rounded-xl text-fg-muted hover:bg-surface-2 hover:text-fg pointer-coarse:size-11"
        aria-label="Reset data demo"
        title="Reset data demo"
      >
        <RotateCcw className="size-5" />
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title="Reset data demo?"
        description="Semua order, pembayaran, dan perubahan yang Anda buat di prototipe ini akan dikembalikan ke data contoh awal."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                useDemo.getState().reset()
                setOpen(false)
                toast('Data demo dikembalikan ke awal')
              }}
            >
              Reset data
            </Button>
          </>
        }
      />
    </>
  )
}

export function Topbar({ area, user }: { area: 'tenant' | 'admin'; user: ReactNode }) {
  const hydrated = useHydrated()
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-surface/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <Link href={area === 'tenant' ? '/app' : '/admin'} className="md:hidden" aria-label="Beranda dashboard">
        <BrandLogo className="size-8" />
      </Link>
      {area === 'tenant' && hydrated && <OutletSwitcher />}
      {area === 'admin' && (
        <span className="rounded-lg bg-phase-production-soft px-2.5 py-1 text-xs font-semibold text-phase-production">
          Super Admin
        </span>
      )}
      <div className="ml-auto flex items-center gap-1">
        <OfflineIndicator className="mr-1" />
        <ThemeToggle />
        <ResetDemoButton />
        <div className="ml-2 hidden items-center gap-2.5 border-l border-border pl-3 sm:flex">{user}</div>
      </div>
    </header>
  )
}

export function UserChip({ name, role }: { name: string; role: string }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
  return (
    <>
      <span className="grid size-9 place-items-center rounded-full bg-[image:var(--brand-gradient)] text-sm font-bold text-white">
        {initials}
      </span>
      <span className="hidden flex-col leading-tight lg:flex">
        <span className="text-sm font-semibold text-fg">{name}</span>
        <span className="text-xs text-fg-subtle">{role}</span>
      </span>
    </>
  )
}
