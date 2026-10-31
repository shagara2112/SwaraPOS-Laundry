import { jakartaDateKey } from './domain/order-number'
import { statusPhase } from './domain/order-status'
import type { DemoState } from './store/state'
import type { Order, Plan, Staff, StaffRole } from './types'

export { resumeTarget } from './store/actions-order'

export function isLate(order: Order, now: Date): boolean {
  if (order.status === 'CANCELLED' || statusPhase(order.status) === 'done') return false
  return new Date(order.dueAt) < now
}

export function paidAmount(order: Order): number {
  return order.payments.reduce((sum, p) => sum + p.amount, 0)
}

export function amountDue(order: Order): number {
  return Math.max(0, order.totals.total - paidAmount(order))
}

export function dashboardKpis(
  s: DemoState,
  now: Date,
): { ordersToday: number; revenueToday: number; lateCount: number; receivables: number } {
  const today = jakartaDateKey(now)
  const isToday = (iso: string) => jakartaDateKey(new Date(iso)) === today
  return {
    ordersToday: s.orders.filter((o) => isToday(o.createdAt)).length,
    revenueToday: s.orders.reduce(
      (sum, o) => sum + o.payments.filter((p) => isToday(p.at)).reduce((x, p) => x + p.amount, 0),
      0,
    ),
    lateCount: s.orders.filter((o) => isLate(o, now)).length,
    receivables: s.orders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + amountDue(o), 0),
  }
}

export function trackingUrl(token: string, origin: string): string {
  return `${origin}/lacak/${token}`
}

export type PlanUsageItem = { key: 'outlets' | 'staff'; label: string; used: number; limit: number; pct: number; reached: boolean }

/** Pemakaian paket terhadap limitnya. Hanya outlet dan karyawan yang dibatasi; order tidak. */
export function planUsage(limits: Plan['limits'], used: { outlets: number; staff: number }): PlanUsageItem[] {
  const item = (key: PlanUsageItem['key'], label: string, n: number, limit: number): PlanUsageItem => ({
    key,
    label,
    used: n,
    limit,
    pct: Math.min(100, Math.round((n / limit) * 100)),
    reached: n >= limit,
  })
  return [item('outlets', 'Outlet', used.outlets, limits.outlets), item('staff', 'Karyawan', used.staff, limits.staff)]
}

/** Staf yang memakai aplikasi: pilihan sesi bila peran dan outlet cocok, selain itu staf pertama peran itu di outlet. */
export function resolveStaff(staff: Staff[], session: { role: StaffRole; outletId: string; staffId?: string | null }): Staff | undefined {
  const mine = staff.filter((s) => s.role === session.role && s.outletId === session.outletId)
  return mine.find((s) => s.id === session.staffId) ?? mine[0] ?? staff.find((s) => s.role === session.role)
}
