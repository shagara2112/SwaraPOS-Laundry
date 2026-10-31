import type { Actor } from '@swarapos/core/types'
import { useMemo } from 'react'
import { useDemo } from './demo-store'
import { useSession } from './session-store'

// Zustand v5: selector harus mengembalikan referensi stabil; turunan dihitung di useMemo.

export function useActiveOutlet() {
  const outlets = useDemo((s) => s.outlets)
  const outletId = useSession((s) => s.outletId)
  return useMemo(() => outlets.find((o) => o.id === outletId) ?? outlets[0], [outlets, outletId])
}

export function useOutletOrders() {
  const orders = useDemo((s) => s.orders)
  const outletId = useActiveOutlet().id
  return useMemo(() => orders.filter((o) => o.outletId === outletId), [orders, outletId])
}

export function useCustomerMap() {
  const customers = useDemo((s) => s.customers)
  return useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers])
}

/** Staf yang sedang memakai aplikasi: staf pertama dengan peran & outlet sesi (prototipe tanpa login). */
export function useCurrentStaff() {
  const staff = useDemo((s) => s.staff)
  const role = useSession((s) => s.role)
  const outletId = useSession((s) => s.outletId)
  return useMemo(
    () => staff.find((x) => x.role === role && x.outletId === outletId) ?? staff.find((x) => x.role === role),
    [staff, role, outletId],
  )
}

/** Petugas yang tercatat di riwayat order dan audit log untuk aksi dari aplikasi. */
export function useActor(): Actor {
  const staff = useCurrentStaff()
  const fallback = useDemo((s) => s.tenantActor)
  return useMemo(() => (staff ? { id: staff.id, name: staff.name } : fallback), [staff, fallback])
}
