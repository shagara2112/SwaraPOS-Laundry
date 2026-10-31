'use client'

import { useMemo } from 'react'
import { useDemo } from './demo-store'

// Zustand v5 mewajibkan selector mengembalikan referensi stabil; filter turunan dihitung di useMemo.

export function useActiveOutlet() {
  const outlets = useDemo((s) => s.outlets)
  const activeOutletId = useDemo((s) => s.activeOutletId)
  return useMemo(() => outlets.find((o) => o.id === activeOutletId) ?? outlets[0], [outlets, activeOutletId])
}

export function useOutletOrders() {
  const orders = useDemo((s) => s.orders)
  const activeOutletId = useDemo((s) => s.activeOutletId)
  return useMemo(() => orders.filter((o) => o.outletId === activeOutletId), [orders, activeOutletId])
}

export function useCustomerMap() {
  const customers = useDemo((s) => s.customers)
  return useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers])
}
