import type { Order } from './types'

/**
 * Cari order dari hasil scan label atau ketikan: nomor order (tanpa peka huruf),
 * token lacak, atau URL lacak `/lacak/<token>` (query/hash diabaikan).
 */
export function findOrderByScan(orders: Order[], raw: string): Order | undefined {
  const value = raw.trim()
  if (!value) return undefined
  const token = value.includes('/lacak/') ? value.split('/lacak/')[1].split(/[?#/]/)[0] : value
  const upper = value.toUpperCase()
  return orders.find((o) => o.orderNo.toUpperCase() === upper || o.trackingToken === token)
}
