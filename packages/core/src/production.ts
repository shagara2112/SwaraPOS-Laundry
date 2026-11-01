import { nextStatuses, requiresReason } from './domain/order-status'
import { isLate } from './selectors'
import { resumeTarget } from './store/actions-order'
import type { Order, OrderStatus } from './types'

/** Kolom papan produksi; beberapa status penerimaan digabung ke satu kolom. */
export const PRODUCTION_COLUMNS: { id: string; label: string; statuses: OrderStatus[] }[] = [
  { id: 'received', label: 'Diterima', statuses: ['RECEIVED', 'INSPECTED', 'WEIGHED_OR_COUNTED'] },
  { id: 'washing', label: 'Cuci', statuses: ['IN_WASHING'] },
  { id: 'drying', label: 'Kering', statuses: ['IN_DRYING'] },
  { id: 'ironing', label: 'Setrika', statuses: ['IN_IRONING'] },
  { id: 'finishing', label: 'Finishing', statuses: ['IN_FINISHING'] },
  { id: 'qc', label: 'QC', statuses: ['QUALITY_CHECK'] },
  { id: 'ready', label: 'Siap', statuses: ['READY_FOR_PICKUP'] },
]

export const HOLD_STATUSES: OrderStatus[] = ['ON_HOLD', 'ISSUE_REPORTED']

/** Poin yang wajib dicentang sebelum QC lulus. */
export const QC_CHECKLIST = ['Bersih, noda tertangani', 'Kering sempurna', 'Wangi', 'Terlipat / tersetrika rapi', 'Jumlah item cocok']

/** Checklist QC untuk satu order; poin jumlah item menyebut jumlah potong saat diterima. */
export function qcChecklistFor(order: Order): string[] {
  return QC_CHECKLIST.map((label, i) => (i === QC_CHECKLIST.length - 1 && order.pieceCount ? `${label} (${order.pieceCount} pcs)` : label))
}

/** Status maju yang menjadi tombol utama. QC tidak punya tombol maju karena memakai checklist. */
export function primaryNext(order: Order): OrderStatus | undefined {
  if (order.status === 'QUALITY_CHECK') return undefined
  const forward = nextStatuses(order.status, resumeTarget(order)).filter((s) => !requiresReason(s))
  if (order.status === 'READY_FOR_PICKUP') {
    return order.handback === 'DELIVERY' ? 'OUT_FOR_DELIVERY' : 'COMPLETED'
  }
  return forward[0]
}

/** Urutan kartu produksi: terlambat dulu, lalu express, lalu jatuh tempo terdekat. */
export function sortForProduction(orders: Order[], now: Date): Order[] {
  return [...orders].sort((a, b) => {
    const late = Number(isLate(b, now)) - Number(isLate(a, now))
    if (late) return late
    const express = Number(b.express) - Number(a.express)
    if (express) return express
    return a.dueAt.localeCompare(b.dueAt)
  })
}
