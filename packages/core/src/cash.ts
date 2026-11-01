import { inRange, type DateRange } from './date-range'
import { PAYMENT_METHOD_LABEL } from './labels'
import type { Order, OrderPaymentMethod } from './types'

export type CashSummary = {
  total: number
  count: number
  byMethod: { method: OrderPaymentMethod; label: string; total: number; count: number }[]
  byActor: { id: string; name: string; total: number; count: number }[]
  payments: { id: string; orderId: string; orderNo: string; customerId: string; method: OrderPaymentMethod; amount: number; at: string; actorId: string; actorName: string }[]
}

const METHODS: OrderPaymentMethod[] = ['CASH', 'TRANSFER', 'QRIS', 'COD']

/** Rekap kas masuk dari pembayaran order: per metode, per petugas, dan daftar transaksi (untuk dicocokkan dengan laci kas). */
export function cashSummary(orders: Order[], opts: { range: DateRange; outletId: string | 'all'; actorId?: string }): CashSummary {
  const payments = orders
    .filter((o) => opts.outletId === 'all' || o.outletId === opts.outletId)
    .flatMap((o) =>
      o.payments.map((p) => ({ id: p.id, orderId: o.id, orderNo: o.orderNo, customerId: o.customerId, method: p.method, amount: p.amount, at: p.at, actorId: p.actor.id, actorName: p.actor.name })),
    )
    .filter((p) => inRange(p.at, opts.range) && (!opts.actorId || p.actorId === opts.actorId))
    .sort((a, b) => b.at.localeCompare(a.at))

  const byActor = new Map<string, { id: string; name: string; total: number; count: number }>()
  for (const p of payments) {
    const a = byActor.get(p.actorId) ?? { id: p.actorId, name: p.actorName, total: 0, count: 0 }
    byActor.set(p.actorId, { ...a, total: a.total + p.amount, count: a.count + 1 })
  }

  return {
    total: payments.reduce((sum, p) => sum + p.amount, 0),
    count: payments.length,
    byMethod: METHODS.map((method) => {
      const list = payments.filter((p) => p.method === method)
      return { method, label: PAYMENT_METHOD_LABEL[method], total: list.reduce((sum, p) => sum + p.amount, 0), count: list.length }
    }),
    byActor: [...byActor.values()].sort((a, b) => b.total - a.total),
    payments,
  }
}
