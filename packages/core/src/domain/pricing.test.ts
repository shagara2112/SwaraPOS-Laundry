import { it, expect } from 'vitest'
import { calculateTotals, estimateDueAt, lineTotal } from './pricing'

it('menghitung per unit', () => {
  expect(lineTotal({ unit: 'KG', unitPrice: 7000, qty: 3.5 })).toBe(24500)
  expect(lineTotal({ unit: 'KG', unitPrice: 7000, qty: 2.37 })).toBe(16590)
  expect(lineTotal({ unit: 'ITEM', unitPrice: 15000, qty: 2 })).toBe(30000)
  expect(lineTotal({ unit: 'SQM', unitPrice: 12000, qty: 1.25 })).toBe(15000)
})

it('menjumlahkan express dan biaya antar-jemput', () => {
  expect(
    calculateTotals({
      lines: [
        { unit: 'KG', unitPrice: 7000, qty: 3.5 },
        { unit: 'ADDON', unitPrice: 5000, qty: 1 },
      ],
      express: true,
      expressSurchargePct: 50,
      pickupFee: 5000,
      deliveryFee: 8000,
    }),
  ).toEqual({ subtotal: 29500, expressFee: 14750, pickupFee: 5000, deliveryFee: 8000, total: 57250 })
})

it('membulatkan biaya express ke rupiah terdekat', () => {
  const t = calculateTotals({
    lines: [{ unit: 'ITEM', unitPrice: 7001, qty: 1 }],
    express: true,
    expressSurchargePct: 50,
    pickupFee: 0,
    deliveryFee: 0,
  })
  expect(t.expressFee).toBe(3501)
})

it('tanpa express biaya express nol', () => {
  const t = calculateTotals({
    lines: [{ unit: 'ITEM', unitPrice: 10000, qty: 1 }],
    express: false,
    expressSurchargePct: 50,
    pickupFee: 0,
    deliveryFee: 0,
  })
  expect(t.expressFee).toBe(0)
  expect(t.total).toBe(10000)
})

it('estimasi memakai durasi terpanjang, express separuh', () => {
  const created = new Date('2026-10-31T03:00:00Z')
  expect(estimateDueAt(created, [48, 24], false).toISOString()).toBe('2026-11-02T03:00:00.000Z')
  expect(estimateDueAt(created, [48, 24], true).toISOString()).toBe('2026-11-01T03:00:00.000Z')
})
