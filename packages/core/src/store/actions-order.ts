import { haversineKm } from '../domain/delivery-zone'
import { formatOrderNo, jakartaDateKey } from '../domain/order-number'
import { canTransition } from '../domain/order-status'
import { calculateTotals, estimateDueAt, lineTotal } from '../domain/pricing'
import { createTrackingToken } from '../domain/tracking'
import { waEventForStatus } from '../domain/whatsapp'
import { formatRupiah } from '../format'
import { newId } from '../ids'
import { formatQty } from '../labels'
import type {
  Actor,
  DeliveryTask,
  HandbackType,
  IntakeType,
  Order,
  OrderChannel,
  OrderItem,
  OrderPaymentMethod,
  OrderStatus,
  StatusEvent,
  WaLog,
} from '../types'
import { appendAudit, fail, type ActionResult, type DemoState } from './state'

export type NewOrderInput = {
  outletId: string
  customerId: string
  intake: IntakeType
  handback: HandbackType
  express: boolean
  items: { serviceId: string; qty: number }[]
  conditionNotes: string[]
  pickupFee: number
  deliveryFee: number
  channel?: OrderChannel
  /** Jarak manual dari kasir bila pelanggan belum punya titik lokasi. */
  distanceKm?: number
  /** TDD §8: create order wajib idempoten terhadap retry dan double-click. */
  idempotencyKey?: string
}

const EXCEPTION_STATUSES: OrderStatus[] = ['ON_HOLD', 'ISSUE_REPORTED', 'CANCELLED']

/** Status sebelum order ditahan/dilaporkan kendala, untuk tombol "lanjutkan". */
export function resumeTarget(order: Order): OrderStatus | undefined {
  if (order.status !== 'ON_HOLD' && order.status !== 'ISSUE_REPORTED') return undefined
  const entered = [...order.history].reverse().find((e) => e.to === order.status && e.from !== e.to)
  return entered?.from ?? undefined
}

function replaceOrder(state: DemoState, order: Order): DemoState {
  return { ...state, orders: state.orders.map((o) => (o.id === order.id ? order : o)) }
}

function customerDistance(state: DemoState, order: Pick<Order, 'outletId' | 'customerId'>): number {
  const outlet = state.outlets.find((o) => o.id === order.outletId)
  const customer = state.customers.find((c) => c.id === order.customerId)
  if (!outlet || !customer?.location) return 0
  return Math.round(haversineKm(outlet, customer.location) * 10) / 10
}

function nextOrderNo(state: DemoState, outletId: string, outletCode: string, now: Date): string {
  const today = jakartaDateKey(now)
  const taken = new Set(state.orders.map((o) => o.orderNo))
  let seq =
    state.orders.filter((o) => o.outletId === outletId && jakartaDateKey(new Date(o.createdAt)) === today)
      .length + 1
  let orderNo = formatOrderNo(outletCode, now, seq)
  while (taken.has(orderNo)) {
    seq += 1
    orderNo = formatOrderNo(outletCode, now, seq)
  }
  return orderNo
}

export function createOrder(
  s: DemoState,
  input: NewOrderInput,
  actor: Actor,
  now: Date,
): ActionResult<Order> {
  if (input.idempotencyKey) {
    const existing = s.orders.find((o) => o.idempotencyKey === input.idempotencyKey)
    if (existing) return { ok: true, state: s, value: existing }
  }
  const outlet = s.outlets.find((o) => o.id === input.outletId)
  const customer = s.customers.find((c) => c.id === input.customerId)
  if (!outlet || !customer) return fail('NOT_FOUND')
  if (input.items.length === 0) return fail('NOT_ALLOWED')

  const services = input.items.map((item) => s.services.find((svc) => svc.id === item.serviceId))
  if (services.some((svc) => !svc || !svc.active)) return fail('NOT_ALLOWED')
  if (input.items.some((item) => !(item.qty > 0))) return fail('NOT_ALLOWED')

  const items = input.items.map((item, i) => {
    const svc = services[i]!
    const unitPrice = svc.prices[outlet.id] ?? 0
    return {
      id: newId('itm'),
      serviceId: svc.id,
      name: svc.name,
      unit: svc.unit,
      qty: item.qty,
      unitPrice,
      total: lineTotal({ unit: svc.unit, unitPrice, qty: item.qty }),
    }
  })

  const status: OrderStatus = input.intake === 'PICKUP' ? 'REQUESTED' : 'RECEIVED'
  const at = now.toISOString()
  const event = waEventForStatus(status)
  const order: Order = {
    id: newId('ord'),
    orderNo: nextOrderNo(s, outlet.id, outlet.code, now),
    trackingToken: createTrackingToken(),
    outletId: outlet.id,
    customerId: customer.id,
    channel: input.channel ?? 'CASHIER',
    intake: input.intake,
    handback: input.handback,
    express: input.express,
    status,
    items,
    totals: calculateTotals({
      lines: items,
      express: input.express,
      expressSurchargePct: s.tenant.expressSurchargePct,
      pickupFee: input.pickupFee,
      deliveryFee: input.deliveryFee,
    }),
    conditionNotes: input.conditionNotes,
    qcPassed: false,
    paymentStatus: 'UNPAID',
    payments: [],
    history: [{ id: newId('evt'), from: null, to: status, actor, at, note: 'Order dibuat di kasir' }],
    whatsapp: event ? [{ id: newId('wa'), event, state: 'NOT_SENT' }] : [],
    dueAt: estimateDueAt(
      now,
      services.map((svc) => svc!.durationHours),
      input.express,
    ).toISOString(),
    createdAt: at,
    version: 1,
    idempotencyKey: input.idempotencyKey,
  }

  const tasks: DeliveryTask[] =
    input.intake === 'PICKUP'
      ? [
          {
            id: newId('task'),
            orderId: order.id,
            type: 'PICKUP',
            status: 'UNASSIGNED',
            scheduledAt: at,
            address: customer.address ?? '-',
            distanceKm: input.distanceKm ?? customerDistance(s, order),
            fee: input.pickupFee,
          },
        ]
      : []

  return {
    ok: true,
    value: order,
    state: { ...s, orders: [...s.orders, order], deliveryTasks: [...s.deliveryTasks, ...tasks] },
  }
}

export function transitionOrder(
  s: DemoState,
  orderId: string,
  to: OrderStatus,
  opts: { reason?: string; note?: string },
  actor: Actor,
  now: Date,
): ActionResult<Order> {
  const order = s.orders.find((o) => o.id === orderId)
  if (!order) return fail('NOT_FOUND')

  const check = canTransition(order.status, to, {
    qcPassed: order.qcPassed,
    reason: opts.reason,
    resumeTo: resumeTarget(order),
  })
  if (!check.ok) return fail(check.reason)

  // Cucian belum lunas hanya boleh diserahkan sebagai piutang dengan alasan.
  const due = order.totals.total - order.payments.reduce((sum, p) => sum + p.amount, 0)
  const credit = to === 'COMPLETED' && due > 0
  if (credit && !opts.reason?.trim()) return fail('UNPAID')

  const at = now.toISOString()
  const note = credit ? `Piutang ${formatRupiah(due)}: ${opts.reason!.trim()}` : opts.reason?.trim() || opts.note?.trim() || undefined
  const event = waEventForStatus(to)
  const whatsapp: WaLog[] =
    event && !order.whatsapp.some((l) => l.event === event)
      ? [...order.whatsapp, { id: newId('wa'), event, state: 'NOT_SENT' }]
      : order.whatsapp

  const updated: Order = {
    ...order,
    status: to,
    qcPassed: to === 'QUALITY_CHECK' || to === 'IN_WASHING' ? false : order.qcPassed,
    history: [...order.history, { id: newId('evt'), from: order.status, to, actor, at, note }],
    whatsapp,
    version: order.version + 1,
  }

  let state = replaceOrder(s, updated)

  if (to === 'OUT_FOR_DELIVERY' && !s.deliveryTasks.some((t) => t.orderId === order.id && t.type === 'DELIVERY')) {
    const customer = s.customers.find((c) => c.id === order.customerId)
    const task: DeliveryTask = {
      id: newId('task'),
      orderId: order.id,
      type: 'DELIVERY',
      status: 'UNASSIGNED',
      scheduledAt: at,
      address: customer?.address ?? '-',
      distanceKm: customerDistance(s, order),
      fee: order.totals.deliveryFee,
    }
    state = { ...state, deliveryTasks: [...state.deliveryTasks, task] }
  }

  // Tugas kurir yang tidak lagi relevan ditutup, supaya tidak muncul di daftar "Perlu ditugaskan".
  const closeReason =
    to === 'CANCELLED'
      ? 'Order dibatalkan'
      : to === 'RECEIVED' && (order.status === 'REQUESTED' || order.status === 'PICKUP_ASSIGNED')
        ? 'Pelanggan mengantar sendiri ke outlet'
        : undefined
  if (closeReason) {
    state = {
      ...state,
      deliveryTasks: state.deliveryTasks.map((t) =>
        t.orderId === order.id && t.status !== 'DONE' && t.status !== 'FAILED' && (to === 'CANCELLED' || t.type === 'PICKUP')
          ? { ...t, status: 'FAILED', failReason: closeReason }
          : t,
      ),
    }
  }

  if (credit) {
    state = appendAudit(state, { at, actor, action: 'order.credit', tenantId: s.tenant.id, entity: 'order', entityId: order.id, detail: `${order.orderNo}: ${note}` })
  }

  if (EXCEPTION_STATUSES.includes(to)) {
    state = appendAudit(state, {
      at,
      actor,
      action: `order.${to.toLowerCase()}`,
      tenantId: s.tenant.id,
      entity: 'order',
      entityId: order.id,
      detail: `${order.orderNo}: ${note}`,
    })
  }

  return { ok: true, state, value: updated }
}

// Setelah siap/diserahkan, rincian order tidak boleh berubah lagi.
const LOCKED_FOR_ADJUST: OrderStatus[] = ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED']

export function canAdjustItems(status: OrderStatus): boolean {
  return !LOCKED_FOR_ADJUST.includes(status)
}

/**
 * Koreksi berat/jumlah item (mis. timbang ulang di outlet). Baris lama tetap memakai harga terkunci;
 * layanan baru memakai harga outlet saat ini. Total tidak boleh turun di bawah yang sudah dibayar.
 */
export function adjustOrderItems(
  s: DemoState,
  orderId: string,
  input: { lines: { itemId?: string; serviceId: string; qty: number }[]; reason: string },
  actor: Actor,
  now: Date,
): ActionResult<Order> {
  const order = s.orders.find((o) => o.id === orderId)
  if (!order) return fail('NOT_FOUND')
  if (!canAdjustItems(order.status)) return fail('NOT_ALLOWED')
  const reason = input.reason.trim()
  if (!reason) return fail('REASON_REQUIRED')
  if (input.lines.some((l) => !(l.qty > 0))) return fail('NOT_ALLOWED')

  const items: OrderItem[] = []
  for (const line of input.lines) {
    const existing = line.itemId ? order.items.find((i) => i.id === line.itemId) : undefined
    if (existing) {
      items.push({ ...existing, qty: line.qty, total: lineTotal({ unit: existing.unit, unitPrice: existing.unitPrice, qty: line.qty }) })
      continue
    }
    const svc = s.services.find((x) => x.id === line.serviceId)
    if (!svc || !svc.active) return fail('NOT_ALLOWED')
    const unitPrice = svc.prices[order.outletId] ?? 0
    items.push({ id: newId('itm'), serviceId: svc.id, name: svc.name, unit: svc.unit, qty: line.qty, unitPrice, total: lineTotal({ unit: svc.unit, unitPrice, qty: line.qty }) })
  }
  if (!items.some((i) => i.unit !== 'ADDON')) return fail('NOT_ALLOWED')

  const totals = calculateTotals({
    lines: items,
    express: order.express,
    expressSurchargePct: s.tenant.expressSurchargePct,
    pickupFee: order.totals.pickupFee,
    deliveryFee: order.totals.deliveryFee,
  })
  const paid = order.payments.reduce((sum, p) => sum + p.amount, 0)
  if (totals.total < paid) return fail('OVERPAID')

  const changes = [
    ...order.items.flatMap((old) => {
      const next = items.find((i) => i.id === old.id)
      if (!next) return [`Hapus ${old.name}`]
      return next.qty !== old.qty ? [`${old.name} ${formatQty(old.unit, old.qty)} → ${formatQty(next.unit, next.qty)}`] : []
    }),
    ...items.filter((i) => !order.items.some((old) => old.id === i.id)).map((i) => `Tambah ${i.name} ${formatQty(i.unit, i.qty)}`),
  ]
  const at = now.toISOString()
  const note = `${changes.join('; ') || 'Tanpa perubahan jumlah'}. Total ${formatRupiah(order.totals.total)} → ${formatRupiah(totals.total)}. Alasan: ${reason}`
  const updated: Order = {
    ...order,
    items,
    totals,
    paymentStatus: paid === 0 ? 'UNPAID' : paid >= totals.total ? 'PAID' : 'PARTIAL',
    history: [...order.history, { id: newId('evt'), from: order.status, to: order.status, actor, at, note, label: 'Koreksi item' }],
    version: order.version + 1,
  }
  const state = appendAudit(replaceOrder(s, updated), { at, actor, action: 'order.items_adjusted', tenantId: s.tenant.id, entity: 'order', entityId: order.id, detail: `${order.orderNo}: ${note}` })
  return { ok: true, state, value: updated }
}

export function recordQc(
  s: DemoState,
  orderId: string,
  result: { passed: boolean; notes?: string },
  actor: Actor,
  now: Date,
): ActionResult<Order> {
  const order = s.orders.find((o) => o.id === orderId)
  if (!order) return fail('NOT_FOUND')
  if (order.status !== 'QUALITY_CHECK') return fail('NOT_ALLOWED')

  const notes = result.notes?.trim()
  const event: StatusEvent = {
    id: newId('evt'),
    from: 'QUALITY_CHECK',
    to: 'QUALITY_CHECK',
    actor,
    at: now.toISOString(),
    note: result.passed ? `QC lulus${notes ? `: ${notes}` : ''}` : `QC gagal${notes ? `: ${notes}` : ''}`,
  }
  const updated: Order = {
    ...order,
    qcPassed: result.passed,
    history: [...order.history, event],
    version: order.version + 1,
  }
  return { ok: true, state: replaceOrder(s, updated), value: updated }
}

export function recordPayment(
  s: DemoState,
  orderId: string,
  p: { method: OrderPaymentMethod; amount: number },
  actor: Actor,
  now: Date,
): ActionResult<Order> {
  const order = s.orders.find((o) => o.id === orderId)
  if (!order) return fail('NOT_FOUND')
  if (!Number.isInteger(p.amount) || p.amount <= 0) return fail('NOT_ALLOWED')

  const payments = [
    ...order.payments,
    { id: newId('pay'), method: p.method, amount: p.amount, at: now.toISOString(), actor },
  ]
  const paid = payments.reduce((sum, x) => sum + x.amount, 0)
  const updated: Order = {
    ...order,
    payments,
    paymentStatus: paid >= order.totals.total ? 'PAID' : 'PARTIAL',
  }
  return { ok: true, state: replaceOrder(s, updated), value: updated }
}

export function markWhatsApp(
  s: DemoState,
  orderId: string,
  logId: string,
  state: 'OPENED' | 'SENT',
  actor: Actor,
  now: Date,
): ActionResult<Order> {
  const order = s.orders.find((o) => o.id === orderId)
  const log = order?.whatsapp.find((l) => l.id === logId)
  if (!order || !log) return fail('NOT_FOUND')

  // Membuka ulang WhatsApp tidak menurunkan status yang sudah ditandai terkirim.
  const nextState = log.state === 'SENT' ? 'SENT' : state
  const updated: Order = {
    ...order,
    whatsapp: order.whatsapp.map((l) =>
      l.id === logId ? { ...l, state: nextState, updatedAt: now.toISOString(), actor } : l,
    ),
  }
  return { ok: true, state: replaceOrder(s, updated), value: updated }
}
