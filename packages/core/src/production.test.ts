import { it, expect } from 'vitest'
import { primaryNext } from './production'
import { createSeed } from './store/seed'
import type { Order } from './types'

const s0 = createSeed(new Date('2026-10-31T03:00:00Z'))
const base: Order = s0.orders[0]

it('maju satu tahap di alur produksi', () => {
  expect(primaryNext({ ...base, status: 'RECEIVED' })).toBe('INSPECTED')
  expect(primaryNext({ ...base, status: 'IN_IRONING' })).toBe('IN_FINISHING')
})

it('QC diputuskan lewat checklist, bukan tombol maju', () => {
  expect(primaryNext({ ...base, status: 'QUALITY_CHECK' })).toBeUndefined()
})

it('order siap: ambil sendiri selesai, diantar diserahkan ke kurir', () => {
  expect(primaryNext({ ...base, status: 'READY_FOR_PICKUP', handback: 'SELF_PICKUP' })).toBe('COMPLETED')
  expect(primaryNext({ ...base, status: 'READY_FOR_PICKUP', handback: 'DELIVERY' })).toBe('OUT_FOR_DELIVERY')
})

it('order ditahan dilanjutkan ke status sebelumnya; status akhir tidak punya aksi', () => {
  const held = s0.orders.find((o) => o.status === 'ON_HOLD')!
  expect(primaryNext(held)).toBe('IN_DRYING')
  expect(primaryNext({ ...base, status: 'COMPLETED' })).toBeUndefined()
})
