import { normalizePhoneID } from '@/lib/domain/whatsapp'
import { formatRupiah } from '@/lib/format'
import { newId } from '@/lib/ids'
import type { Actor, Customer, DeliveryTask, DeliveryTaskStatus, DeliveryZone, LatLng, Service } from '@/lib/types'
import { transitionOrder } from './actions-order'
import { appendAudit, fail, type ActionResult, type DemoState } from './state'

export function addCustomer(
  s: DemoState,
  input: { name: string; phone: string; address?: string; location?: LatLng; notes?: string },
  _actor: Actor,
  now: Date,
): ActionResult<Customer> {
  const name = input.name.trim()
  const normalized = normalizePhoneID(input.phone)
  if (!name || !normalized) return fail('NOT_ALLOWED')

  // Satu nomor WhatsApp = satu pelanggan, apa pun format penulisannya.
  const existing = s.customers.find((c) => normalizePhoneID(c.phone) === normalized)
  if (existing) return { ok: true, state: s, value: existing }

  const customer: Customer = {
    id: newId('cus'),
    name,
    phone: input.phone.trim(),
    address: input.address?.trim() || undefined,
    location: input.location,
    notes: input.notes?.trim() || undefined,
    createdAt: now.toISOString(),
  }
  return { ok: true, value: customer, state: { ...s, customers: [...s.customers, customer] } }
}

function audited(s: DemoState, actor: Actor, now: Date, action: string, entity: string, entityId: string, detail: string): DemoState {
  return appendAudit(s, { at: now.toISOString(), actor, action, tenantId: s.tenant.id, entity, entityId, detail })
}

export function updateServicePrice(
  s: DemoState,
  serviceId: string,
  outletId: string,
  price: number,
  actor: Actor,
  now: Date,
): ActionResult<Service> {
  const service = s.services.find((x) => x.id === serviceId)
  const outlet = s.outlets.find((o) => o.id === outletId)
  if (!service || !outlet) return fail('NOT_FOUND')
  if (!Number.isInteger(price) || price < 0) return fail('NOT_ALLOWED')

  const before = service.prices[outletId] ?? 0
  const updated: Service = { ...service, prices: { ...service.prices, [outletId]: price } }
  const state = { ...s, services: s.services.map((x) => (x.id === serviceId ? updated : x)) }
  return {
    ok: true,
    value: updated,
    state: audited(state, actor, now, 'service.price_changed', 'service', serviceId, `${service.name} · ${outlet.code}: ${formatRupiah(before)} → ${formatRupiah(price)}`),
  }
}

export function setServiceActive(s: DemoState, serviceId: string, active: boolean, actor: Actor, now: Date): ActionResult<Service> {
  const service = s.services.find((x) => x.id === serviceId)
  if (!service) return fail('NOT_FOUND')
  const updated: Service = { ...service, active }
  const state = { ...s, services: s.services.map((x) => (x.id === serviceId ? updated : x)) }
  return {
    ok: true,
    value: updated,
    state: audited(state, actor, now, active ? 'service.activated' : 'service.deactivated', 'service', serviceId, service.name),
  }
}

/** Zona harus menyambung: batas bawah zona = batas atas zona sebelumnya, dan setiap zona punya lebar. */
export function updateZones(s: DemoState, zones: DeliveryZone[], actor: Actor, now: Date): ActionResult<DeliveryZone[]> {
  if (zones.length === 0) return fail('NOT_ALLOWED')
  const valid = zones.every(
    (z, i) =>
      z.minKm < z.maxKm &&
      (i === 0 ? z.minKm === 0 : z.minKm === zones[i - 1].maxKm) &&
      Number.isInteger(z.pickupFee) &&
      Number.isInteger(z.deliveryFee) &&
      z.pickupFee >= 0 &&
      z.deliveryFee >= 0,
  )
  if (!valid) return fail('NOT_ALLOWED')
  const detail = zones.map((z) => `${z.name} ≤${z.maxKm} km ${formatRupiah(z.pickupFee)}/${formatRupiah(z.deliveryFee)}`).join('; ')
  return {
    ok: true,
    value: zones,
    state: audited({ ...s, zones }, actor, now, 'delivery_zone.updated', 'delivery_zone', s.activeOutletId, detail),
  }
}

function replaceTask(s: DemoState, task: DeliveryTask): DemoState {
  return { ...s, deliveryTasks: s.deliveryTasks.map((t) => (t.id === task.id ? task : t)) }
}

export function assignCourier(s: DemoState, taskId: string, courierId: string, actor: Actor, now: Date): ActionResult<DeliveryTask> {
  const task = s.deliveryTasks.find((t) => t.id === taskId)
  const courier = s.staff.find((x) => x.id === courierId && x.role === 'COURIER')
  if (!task || !courier) return fail('NOT_FOUND')
  if (task.status === 'DONE') return fail('NOT_ALLOWED')

  const updated: DeliveryTask = { ...task, courierId, status: 'ASSIGNED', failReason: undefined }
  let state = replaceTask(s, updated)
  const order = state.orders.find((o) => o.id === task.orderId)
  if (task.type === 'PICKUP' && order?.status === 'REQUESTED') {
    const moved = transitionOrder(state, order.id, 'PICKUP_ASSIGNED', { note: `Kurir: ${courier.name}` }, actor, now)
    if (moved.ok) state = moved.state
  }
  return { ok: true, value: updated, state }
}

export function updateDeliveryTask(
  s: DemoState,
  taskId: string,
  status: DeliveryTaskStatus,
  extra: { proof?: { receiverName: string; method: 'PHOTO' | 'SIGNATURE' | 'PIN' }; failReason?: string },
  actor: Actor,
  now: Date,
): ActionResult<DeliveryTask> {
  const task = s.deliveryTasks.find((t) => t.id === taskId)
  if (!task) return fail('NOT_FOUND')
  if (task.status === 'DONE') return fail('NOT_ALLOWED')
  if (status === 'DONE' && !extra.proof?.receiverName.trim()) return fail('REASON_REQUIRED')
  if (status === 'FAILED' && !extra.failReason?.trim()) return fail('REASON_REQUIRED')

  const updated: DeliveryTask = {
    ...task,
    status,
    proof: status === 'DONE' && extra.proof ? { ...extra.proof, receiverName: extra.proof.receiverName.trim(), at: now.toISOString() } : task.proof,
    failReason: status === 'FAILED' ? extra.failReason?.trim() : task.failReason,
  }
  let state = replaceTask(s, updated)

  if (status === 'DONE') {
    const target = task.type === 'PICKUP' ? 'PICKED_UP' : 'DELIVERED'
    const moved = transitionOrder(state, task.orderId, target, { note: `Diterima oleh ${updated.proof!.receiverName}` }, actor, now)
    if (moved.ok) state = moved.state
  }
  if (status === 'FAILED') {
    state = audited(state, actor, now, 'delivery.failed', 'delivery_task', task.id, extra.failReason!.trim())
  }
  return { ok: true, value: updated, state }
}
