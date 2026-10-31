import { haversineKm } from '@/lib/domain/delivery-zone'
import { formatOrderNo, jakartaDateKey } from '@/lib/domain/order-number'
import { canTransition } from '@/lib/domain/order-status'
import { calculateTotals, estimateDueAt, lineTotal } from '@/lib/domain/pricing'
import { createTrackingToken } from '@/lib/domain/tracking'
import { waEventForStatus } from '@/lib/domain/whatsapp'
import { newId } from '@/lib/ids'
import type {
  Actor,
  DeliveryTask,
  HandbackType,
  IntakeType,
  Order,
  OrderChannel,
  OrderPaymentMethod,
  OrderStatus,
  StatusEvent,
  WaLog,
} from '@/lib/types'
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

  const at = now.toISOString()
  const note = opts.reason?.trim() || opts.note?.trim() || undefined
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
