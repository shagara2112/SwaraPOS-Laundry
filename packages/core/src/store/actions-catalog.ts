import { normalizePhoneID } from '../domain/whatsapp'
import { formatRupiah } from '../format'
import { newId } from '../ids'
import type { Actor, Customer, DeliveryTask, DeliveryTaskStatus, DeliveryZone, LatLng, Service } from '../types'
import { transitionOrder } from './actions-order'
import { appendAudit, fail, type ActionResult, type DemoState, type OutletPaymentMethod } from './state'

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

/** Ubah data pelanggan; satu nomor WhatsApp tetap milik satu pelanggan. Order lama tetap menunjuk pelanggan yang sama. */
export function updateCustomer(
  s: DemoState,
  customerId: string,
  input: { name: string; phone: string; address?: string; notes?: string },
  actor: Actor,
  now: Date,
): ActionResult<Customer> {
  const current = s.customers.find((c) => c.id === customerId)
  if (!current) return fail('NOT_FOUND')
  const name = input.name.trim()
  const normalized = normalizePhoneID(input.phone)
  if (!name || !normalized) return fail('NOT_ALLOWED')
  if (s.customers.some((c) => c.id !== customerId && normalizePhoneID(c.phone) === normalized)) return fail('DUPLICATE')

  const updated: Customer = {
    ...current,
    name,
    phone: input.phone.trim(),
    address: input.address?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
  }
  const state = { ...s, customers: s.customers.map((c) => (c.id === customerId ? updated : c)) }
  return { ok: true, value: updated, state: audited(state, actor, now, 'customer.updated', 'customer', customerId, name) }
}

/** Hapus pelanggan yang salah input atau dobel. Pelanggan yang punya order tidak bisa dihapus agar riwayat order dan pembayaran tetap utuh. */
export function deleteCustomer(s: DemoState, customerId: string, actor: Actor, now: Date): ActionResult {
  const current = s.customers.find((c) => c.id === customerId)
  if (!current) return fail('NOT_FOUND')
  if (s.orders.some((o) => o.customerId === customerId)) return fail('IN_USE')
  const state = { ...s, customers: s.customers.filter((c) => c.id !== customerId) }
  return { ok: true, value: undefined, state: audited(state, actor, now, 'customer.deleted', 'customer', customerId, current.name) }
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
  // Kurir hanya boleh dikirim bila order memang menunggu dijemput/diantar.
  const orderStatus = s.orders.find((o) => o.id === task.orderId)?.status
  const expected = task.type === 'PICKUP' ? ['REQUESTED', 'PICKUP_ASSIGNED'] : ['OUT_FOR_DELIVERY']
  if (!orderStatus || !expected.includes(orderStatus)) return fail('NOT_ALLOWED')

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
    // Serah-terima harus ikut memindahkan order; bila order sudah batal/ditahan, tugas tidak boleh selesai.
    const moved = transitionOrder(state, task.orderId, target, { note: `Diterima oleh ${updated.proof!.receiverName}` }, actor, now)
    if (!moved.ok) return fail('NOT_ALLOWED')
    state = moved.state
  }
  if (status === 'FAILED') {
    state = audited(state, actor, now, 'delivery.failed', 'delivery_task', task.id, extra.failReason!.trim())
  }
  return { ok: true, value: updated, state }
}

const METHOD_LABEL: Record<OutletPaymentMethod['type'], string> = { CASH: 'Tunai', TRANSFER: 'Transfer', QRIS: 'QRIS' }

function validMethod(m: Omit<OutletPaymentMethod, 'id'>): boolean {
  if (!m.label.trim()) return false
  if (m.type === 'TRANSFER') {
    const digits = (m.accountNumber ?? '').replace(/[\s-]/g, '')
    return !!m.bankName?.trim() && !!m.accountName?.trim() && /^\d{6,20}$/.test(digits)
  }
  if (m.type === 'QRIS') return !!m.merchantName?.trim()
  return true
}

/** Tambah atau ubah metode bayar outlet. Minimal satu metode harus tetap aktif agar pelanggan tahu cara membayar. */
export function upsertOutletPaymentMethod(
  s: DemoState,
  input: Omit<OutletPaymentMethod, 'id'> & { id?: string },
  actor: Actor,
  now: Date,
): ActionResult<OutletPaymentMethod> {
  const existing = input.id ? s.outletPaymentMethods.find((m) => m.id === input.id) : undefined
  if (input.id && !existing) return fail('NOT_FOUND')
  if (!validMethod(input)) return fail('NOT_ALLOWED')

  const saved: OutletPaymentMethod = {
    ...input,
    id: existing?.id ?? newId('pm'),
    label: input.label.trim(),
    bankName: input.bankName?.trim() || undefined,
    accountNumber: input.accountNumber?.trim() || undefined,
    accountName: input.accountName?.trim() || undefined,
    merchantName: input.merchantName?.trim() || undefined,
    instructions: input.instructions.trim(),
  }
  const methods = existing ? s.outletPaymentMethods.map((m) => (m.id === saved.id ? saved : m)) : [...s.outletPaymentMethods, saved]
  if (!methods.some((m) => m.active)) return fail('NOT_ALLOWED')

  const detail = [METHOD_LABEL[saved.type], saved.label, saved.bankName, saved.accountNumber, saved.merchantName, saved.active ? 'aktif' : 'nonaktif']
    .filter(Boolean)
    .join(' · ')
  return {
    ok: true,
    value: saved,
    state: audited(
      { ...s, outletPaymentMethods: methods },
      actor,
      now,
      existing ? 'outlet_payment_method.updated' : 'outlet_payment_method.created',
      'outlet_payment_method',
      saved.id,
      detail,
    ),
  }
}
