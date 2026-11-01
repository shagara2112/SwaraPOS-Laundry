import { describe, expect, it } from 'vitest'
import { cashSummary } from './cash'
import { presetRange } from './date-range'
import { createSeed } from './store/seed'

const now = new Date('2026-10-31T03:00:00Z')
const s = createSeed(now)
const week = presetRange('7d', now)!

describe('cashSummary', () => {
  const all = s.orders.flatMap((o) => o.payments.map((p) => ({ o, p }))).filter(({ o, p }) => o.outletId === 'o-kmg' && new Date(p.at).getTime() >= week.from && new Date(p.at).getTime() < week.to)
  const r = cashSummary(s.orders, { range: week, outletId: 'o-kmg' })

  it('menjumlah pembayaran di rentang dan outlet terpilih', () => {
    expect(r.count).toBe(all.length)
    expect(r.total).toBe(all.reduce((sum, { p }) => sum + p.amount, 0))
  })

  it('rincian per metode selalu memuat empat metode dan totalnya sama dengan kas masuk', () => {
    expect(r.byMethod.map((m) => m.method)).toEqual(['CASH', 'TRANSFER', 'QRIS', 'COD'])
    expect(r.byMethod.reduce((sum, m) => sum + m.total, 0)).toBe(r.total)
    expect(r.byMethod.find((m) => m.method === 'CASH')?.label).toBe('Tunai')
  })

  it('rincian per petugas urut dari terbesar', () => {
    expect(r.byActor.reduce((sum, a) => sum + a.total, 0)).toBe(r.total)
    expect(r.byActor.map((a) => a.total)).toEqual([...r.byActor.map((a) => a.total)].sort((a, b) => b - a))
  })

  it('daftar transaksi terbaru di atas dengan nomor order', () => {
    expect(r.payments).toHaveLength(r.count)
    expect(r.payments.map((p) => p.at)).toEqual([...r.payments.map((p) => p.at)].sort((a, b) => b.localeCompare(a)))
    expect(r.payments[0].orderNo).toMatch(/^KMG-/)
  })

  it('bisa dibatasi ke satu petugas (kas kasir)', () => {
    const actorId = r.byActor[0].id
    const mine = cashSummary(s.orders, { range: week, outletId: 'o-kmg', actorId })
    expect(mine.total).toBe(r.byActor[0].total)
    expect(mine.payments.every((p) => p.actorId === actorId)).toBe(true)
  })

  it('tanpa pembayaran menghasilkan nol', () => {
    const empty = cashSummary(s.orders, { range: presetRange('custom', now, { from: '2020-01-01', to: '2020-01-01' })!, outletId: 'all' })
    expect(empty).toMatchObject({ total: 0, count: 0, byActor: [], payments: [] })
    expect(empty.byMethod.every((m) => m.total === 0)).toBe(true)
  })
})

describe('cashSummary dengan refund', () => {
  it('refund mengurangi kas per metode dan dirangkum terpisah', () => {
    const order = s.orders.find((o) => o.outletId === 'o-kmg' && o.payments.length > 0)!
    const refund = { id: 'pay-r', method: 'CASH' as const, amount: -5000, at: now.toISOString(), actor: { id: 'st-rina', name: 'Rina' }, refund: true }
    const orders = s.orders.map((o) => (o.id === order.id ? { ...o, payments: [...o.payments, refund] } : o))
    const before = cashSummary(s.orders, { range: week, outletId: 'o-kmg' })
    const after = cashSummary(orders, { range: week, outletId: 'o-kmg' })
    expect(after.total).toBe(before.total - 5000)
    expect(after.byMethod.find((m) => m.method === 'CASH')!.total).toBe(before.byMethod.find((m) => m.method === 'CASH')!.total - 5000)
    expect(after.refunds).toEqual({ total: 5000, count: 1 })
    expect(before.refunds).toEqual({ total: 0, count: 0 })
  })
})
