'use client'

import {
  ChartColumn,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  ScanLine,
  Settings,
  Tags,
  Truck,
  Users,
  WashingMachine,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useDemo } from '@/lib/store/demo-store'
import { useHydrated } from '@/lib/store/use-hydrated'
import { AppShell } from './app-shell'
import type { NavItem } from './sidebar'
import { UserChip } from './topbar'

const NAV: NavItem[] = [
  { href: '/app', label: 'Ringkasan', icon: LayoutDashboard },
  { href: '/app/order', label: 'Order', icon: ClipboardList },
  { href: '/app/order/baru', label: 'Kasir', icon: ScanLine },
  { href: '/app/produksi', label: 'Produksi', icon: WashingMachine },
  { href: '/app/pengantaran', label: 'Pickup & Antar', icon: Truck },
  { href: '/app/pelanggan', label: 'Pelanggan', icon: Users },
  { href: '/app/layanan', label: 'Layanan', icon: Tags },
  { href: '/app/laporan', label: 'Laporan', icon: ChartColumn },
  { href: '/app/langganan', label: 'Langganan', icon: CreditCard },
  { href: '/app/pengaturan', label: 'Pengaturan', icon: Settings },
]

function TenantFooter() {
  const hydrated = useHydrated()
  const tenantName = useDemo((s) => s.tenant.name)
  const tenant = useDemo((s) => s.platform.tenants.find((t) => t.id === s.tenant.id))
  if (!hydrated) return null
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="truncate text-sm font-semibold text-fg">{tenantName}</p>
      <p className="mt-0.5 text-xs text-fg-subtle">
        Paket {tenant?.plan === 'PRO' ? 'Pro' : 'Basic'} · {tenant?.outletCount} outlet
      </p>
    </div>
  )
}

export function TenantShell({ children }: { children: ReactNode }) {
  return (
    <AppShell
      nav={NAV}
      area="tenant"
      areaLabel="Dashboard Laundry"
      user={<UserChip name="Rina Wulandari" role="Owner" />}
      sidebarFooter={<TenantFooter />}
    >
      {children}
    </AppShell>
  )
}
