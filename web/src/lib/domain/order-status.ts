import type { OrderStatus, StatusPhase } from '@/lib/types'

// Peta transisi maju (TDD §7) ditambah jalur walk-in/drop-off dan ambil sendiri
// (spec §2). Urutan di dalam array menentukan urutan tombol di UI.
const FORWARD: Partial<Record<OrderStatus, OrderStatus[]>> = {
  DRAFT: ['REQUESTED', 'RECEIVED'],
  REQUESTED: ['PICKUP_ASSIGNED', 'RECEIVED'],
  PICKUP_ASSIGNED: ['PICKED_UP'],
  PICKED_UP: ['RECEIVED'],
  RECEIVED: ['INSPECTED'],
  INSPECTED: ['WEIGHED_OR_COUNTED'],
  WEIGHED_OR_COUNTED: ['IN_WASHING'],
  IN_WASHING: ['IN_DRYING'],
  IN_DRYING: ['IN_IRONING'],
  IN_IRONING: ['IN_FINISHING'],
  IN_FINISHING: ['QUALITY_CHECK'],
  QUALITY_CHECK: ['READY_FOR_PICKUP', 'IN_WASHING'],
  READY_FOR_PICKUP: ['OUT_FOR_DELIVERY', 'COMPLETED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['COMPLETED'],
}

const EXCEPTIONS: OrderStatus[] = ['ON_HOLD', 'ISSUE_REPORTED', 'CANCELLED']
const NO_EXCEPTION_FROM = new Set<OrderStatus>([
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'ON_HOLD',
  'ISSUE_REPORTED',
])

const PHASE: Record<OrderStatus, StatusPhase> = {
  DRAFT: 'intake',
  REQUESTED: 'intake',
  PICKUP_ASSIGNED: 'intake',
  PICKED_UP: 'intake',
  RECEIVED: 'intake',
  INSPECTED: 'intake',
  WEIGHED_OR_COUNTED: 'intake',
  IN_WASHING: 'production',
  IN_DRYING: 'production',
  IN_IRONING: 'production',
  IN_FINISHING: 'production',
  QUALITY_CHECK: 'qc',
  READY_FOR_PICKUP: 'ready',
  OUT_FOR_DELIVERY: 'ready',
  DELIVERED: 'done',
  COMPLETED: 'done',
  CANCELLED: 'exception',
  ON_HOLD: 'exception',
  ISSUE_REPORTED: 'exception',
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  DRAFT: 'Draf',
  REQUESTED: 'Permintaan masuk',
  PICKUP_ASSIGNED: 'Kurir ditugaskan',
  PICKED_UP: 'Sudah dijemput',
  RECEIVED: 'Diterima outlet',
  INSPECTED: 'Diperiksa',
  WEIGHED_OR_COUNTED: 'Ditimbang/dihitung',
  IN_WASHING: 'Dicuci',
  IN_DRYING: 'Dikeringkan',
  IN_IRONING: 'Disetrika',
  IN_FINISHING: 'Finishing',
  QUALITY_CHECK: 'Quality check',
  READY_FOR_PICKUP: 'Siap diambil',
  OUT_FOR_DELIVERY: 'Sedang diantar',
  DELIVERED: 'Sudah diantar',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
  ON_HOLD: 'Ditahan',
  ISSUE_REPORTED: 'Ada kendala',
}

export type TransitionContext = { qcPassed?: boolean; reason?: string; resumeTo?: OrderStatus }
export type TransitionCheck =
  | { ok: true }
  | { ok: false; reason: 'NOT_ALLOWED' | 'QC_REQUIRED' | 'REASON_REQUIRED' }

export function statusPhase(status: OrderStatus): StatusPhase {
  return PHASE[status]
}

export function isTerminal(status: OrderStatus): boolean {
  return status === 'COMPLETED' || status === 'CANCELLED'
}

export function requiresReason(to: OrderStatus): boolean {
  return EXCEPTIONS.includes(to)
}

export function nextStatuses(from: OrderStatus, resumeTo?: OrderStatus): OrderStatus[] {
  if (from === 'ON_HOLD' || from === 'ISSUE_REPORTED') {
    return resumeTo ? [resumeTo, 'CANCELLED'] : ['CANCELLED']
  }
  const forward = FORWARD[from] ?? []
  return NO_EXCEPTION_FROM.has(from) ? [...forward] : [...forward, ...EXCEPTIONS]
}

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  ctx: TransitionContext,
): TransitionCheck {
  if (!nextStatuses(from, ctx.resumeTo).includes(to)) return { ok: false, reason: 'NOT_ALLOWED' }
  if (requiresReason(to) && !ctx.reason?.trim()) return { ok: false, reason: 'REASON_REQUIRED' }
  if (from === 'QUALITY_CHECK' && to === 'READY_FOR_PICKUP' && !ctx.qcPassed) {
    return { ok: false, reason: 'QC_REQUIRED' }
  }
  return { ok: true }
}
