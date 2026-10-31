import { describe, it, expect } from 'vitest'
import { findOrderByScan } from './scan'
import { createSeed } from './store/seed'

const orders = createSeed(new Date('2026-10-31T03:00:00Z')).orders
const target = orders[3]

describe('findOrderByScan', () => {
  it('mencocokkan nomor order tanpa peka huruf besar/kecil', () => {
    expect(findOrderByScan(orders, target.orderNo)?.id).toBe(target.id)
    expect(findOrderByScan(orders, `  ${target.orderNo.toLowerCase()} `)?.id).toBe(target.id)
  })

  it('mencocokkan token lacak dan URL lacak', () => {
    expect(findOrderByScan(orders, target.trackingToken)?.id).toBe(target.id)
    expect(findOrderByScan(orders, `https://swarapos.id/lacak/${target.trackingToken}?utm=wa#atas`)?.id).toBe(target.id)
  })

  it('input kosong atau tidak dikenal tidak menemukan apa pun', () => {
    expect(findOrderByScan(orders, '')).toBeUndefined()
    expect(findOrderByScan(orders, '   ')).toBeUndefined()
    expect(findOrderByScan(orders, 'tidak-ada')).toBeUndefined()
  })
})
