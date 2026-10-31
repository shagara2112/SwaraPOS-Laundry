import { nextStatuses, requiresReason } from '@/lib/domain/order-status'
import { resumeTarget } from '@/lib/store/actions-order'
import type { Order, OrderStatus } from '@/lib/types'

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

/** Status maju yang menjadi tombol utama. QC tidak punya tombol maju karena memakai checklist. */
export function primaryNext(order: Order): OrderStatus | undefined {
  if (order.status === 'QUALITY_CHECK') return undefined
  const forward = nextStatuses(order.status, resumeTarget(order)).filter((s) => !requiresReason(s))
  if (order.status === 'READY_FOR_PICKUP') {
    return order.handback === 'DELIVERY' ? 'OUT_FOR_DELIVERY' : 'COMPLETED'
  }
  return forward[0]
}
