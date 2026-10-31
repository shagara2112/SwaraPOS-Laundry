import { jakartaDateKey } from '@/lib/domain/order-number'
import { statusPhase } from '@/lib/domain/order-status'
import type { DemoState } from '@/lib/store/state'
import type { Order } from '@/lib/types'

export { resumeTarget } from '@/lib/store/actions-order'

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
