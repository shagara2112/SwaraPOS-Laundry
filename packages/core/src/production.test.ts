import { it, expect } from 'vitest'
import { primaryNext, qcChecklistFor, sortForProduction } from './production'
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

it('urutan papan produksi: terlambat, lalu express, lalu jatuh tempo terdekat', () => {
  const now = new Date('2026-10-31T03:00:00Z')
  const at = (h: number) => new Date(now.getTime() + h * 3600_000).toISOString()
  const mk = (id: string, dueH: number, express = false): Order => ({ ...base, id, status: 'IN_WASHING', express, dueAt: at(dueH) })
  const sorted = sortForProduction([mk('later', 10), mk('express', 20, true), mk('late', -2), mk('soon', 3)], now)
  expect(sorted.map((o) => o.id)).toEqual(['late', 'express', 'soon', 'later'])
})

it('checklist QC menyebut jumlah potong bila dicatat', () => {
  expect(qcChecklistFor({ ...base, pieceCount: 15 }).at(-1)).toBe('Jumlah item cocok (15 pcs)')
  expect(qcChecklistFor({ ...base, pieceCount: undefined }).at(-1)).toBe('Jumlah item cocok')
})
