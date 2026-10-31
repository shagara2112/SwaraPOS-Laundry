'use client'

import { Activity, Building2, Landmark, LayoutDashboard, Package, Receipt, ScrollText } from 'lucide-react'
import type { ReactNode } from 'react'
import { AppShell } from './app-shell'
import type { NavItem } from './sidebar'
import { UserChip } from './topbar'

const NAV: NavItem[] = [
  { href: '/admin', label: 'Ringkasan', icon: LayoutDashboard },
  { href: '/admin/pembayaran', label: 'Review Pembayaran', icon: Receipt },
  { href: '/admin/tenant', label: 'Tenant', icon: Building2 },
  { href: '/admin/instruksi-bayar', label: 'Instruksi Bayar', icon: Landmark },
  { href: '/admin/paket', label: 'Paket', icon: Package },
  { href: '/admin/audit', label: 'Audit Log', icon: ScrollText },
  { href: '/admin/kesehatan', label: 'Kesehatan', icon: Activity },
]

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <AppShell
      nav={NAV}
      area="admin"
      areaLabel="Super Admin"
      user={<UserChip name="Sinta Maharani" role="Finance" />}
      sidebarFooter={
        <p className="rounded-xl bg-surface-2 p-3 text-xs text-fg-muted">
          Semua akses dan keputusan di area ini tercatat di audit log.
        </p>
      }
    >
      {children}
    </AppShell>
  )
}
