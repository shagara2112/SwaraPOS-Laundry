import { describe, expect, it } from 'vitest'
import { inRange, presetRange } from './date-range'
import { buildReport } from './report'
import { amountDue } from './selectors'
import { createSeed } from './store/seed'

const now = new Date('2026-10-31T03:00:00Z')
const s = createSeed(now)
const week = presetRange('7d', now)!

describe('buildReport', () => {
  const r = buildReport(s, { range: week, outletId: 'o-kmg', now })
  const expected = s.orders.filter((o) => o.outletId === 'o-kmg' && o.status !== 'CANCELLED' && inRange(o.createdAt, week))

  it('hanya order outlet & rentang terpilih, tanpa yang batal', () => {
    expect(r.orders.map((o) => o.id).sort()).toEqual(expected.map((o) => o.id).sort())
    expect(r.count).toBe(expected.length)
    expect(r.orders.some((o) => o.status === 'CANCELLED')).toBe(false)
  })

  it('nilai order, rata-rata, dan sisa tagihan', () => {
    const total = expected.reduce((sum, o) => sum + o.totals.total, 0)
    expect(r.total).toBe(total)
    expect(r.average).toBe(Math.round(total / expected.length))
    expect(r.unpaid).toBe(expected.reduce((sum, o) => sum + amountDue(o), 0))
  })

  it('satu batang per hari WIB sampai hari ini, totalnya sama dengan nilai order', () => {
    expect(r.days).toHaveLength(7)
    expect(r.days.at(-1)?.label).toBe('31 Okt')
    expect(r.days.reduce((sum, d) => sum + d.value, 0)).toBe(r.total)
  })

  it('per layanan menjumlah item, urut terbesar, tanpa layanan bernilai nol', () => {
    const itemSum = expected.flatMap((o) => o.items).reduce((sum, i) => sum + i.total, 0)
    expect(r.byService.reduce((sum, d) => sum + d.value, 0)).toBe(itemSum)
    expect(r.byService.every((d) => d.value > 0)).toBe(true)
    expect(r.byService.map((d) => d.value)).toEqual([...r.byService.map((d) => d.value)].sort((a, b) => b - a))
  })

  it('per kanal menjumlah nilai order dengan jumlah order sebagai keterangan', () => {
    expect(r.byChannel.reduce((sum, d) => sum + d.value, 0)).toBe(r.total)
    expect(r.byChannel.find((d) => d.label === 'Kasir')?.hint).toMatch(/order$/)
  })

  it('pelanggan aktif, baru, dan berulang', () => {
    expect(r.active).toBe(new Set(expected.map((o) => o.customerId)).size)
    expect(r.newCustomers).toBeLessThanOrEqual(r.active)
    expect(r.repeat).toBeLessThanOrEqual(r.active)
  })

  it('semua outlet mencakup order dari kedua outlet', () => {
    const all = buildReport(s, { range: week, outletId: 'all', now })
    expect(new Set(all.orders.map((o) => o.outletId))).toEqual(new Set(['o-kmg', 'o-tbt']))
  })

  it('rentang tanpa order menghasilkan nol, bukan NaN', () => {
    const empty = buildReport(s, { range: presetRange('custom', now, { from: '2020-01-01', to: '2020-01-02' })!, outletId: 'all', now })
    expect(empty).toMatchObject({ count: 0, total: 0, average: 0, unpaid: 0, active: 0, newCustomers: 0, repeat: 0 })
    expect(empty.days).toHaveLength(2)
  })
})

describe('buildReport diskon', () => {
  it('menjumlah diskon order di rentang', () => {
    const order = s.orders.find((o) => o.outletId === 'o-kmg' && o.status !== 'CANCELLED' && inRange(o.createdAt, week))!
    const orders = s.orders.map((o) => (o.id === order.id ? { ...o, totals: { ...o.totals, discount: 3000 } } : o))
    expect(buildReport({ orders, services: s.services }, { range: week, outletId: 'o-kmg', now }).discount).toBe(3000)
  })
})
