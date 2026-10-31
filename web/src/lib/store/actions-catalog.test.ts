import { describe, it, expect } from 'vitest'
import type { Actor } from '@/lib/types'
import { DEFAULT_ZONES } from '@/lib/domain/delivery-zone'
import {
  addCustomer,
  assignCourier,
  setServiceActive,
  updateDeliveryTask,
  updateServicePrice,
  updateZones,
} from './actions-catalog'
import { transitionOrder } from './actions-order'
import { createSeed } from './seed'
import type { ActionResult, DemoState } from './state'

const now = new Date('2026-10-31T03:00:00Z')
const actor: Actor = { id: 'st-dewi', name: 'Dewi Anggraini' }
const s0 = createSeed(now)

function ok<T>(r: ActionResult<T>): { state: DemoState; value: T } {
  if (!r.ok) throw new Error(`expected ok, got ${r.error}`)
  return r
}

describe('addCustomer', () => {
  it('menambah pelanggan baru', () => {
    const { state, value } = ok(addCustomer(s0, { name: '  Budi Hartawan ', phone: '0813 1111 2222' }, actor, now))
    expect(value.name).toBe('Budi Hartawan')
    expect(value.phone).toBe('0813 1111 2222')
    expect(state.customers.length).toBe(s0.customers.length + 1)
  })

  it('telepon yang sama (beda format) mengembalikan pelanggan lama', () => {
    const first = ok(addCustomer(s0, { name: 'Budi', phone: '0813 1111 2222' }, actor, now))
    const again = ok(addCustomer(first.state, { name: 'Budi H', phone: '+62 813-1111-2222' }, actor, now))
    expect(again.value.id).toBe(first.value.id)
    expect(again.state.customers.length).toBe(first.state.customers.length)
  })

  it('nama kosong atau telepon tidak valid ditolak', () => {
    expect(addCustomer(s0, { name: ' ', phone: '081311112222' }, actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
    expect(addCustomer(s0, { name: 'Budi', phone: '12' }, actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
  })
})

describe('layanan & harga', () => {
  it('ubah harga tercatat di audit dan tidak menyentuh order lama', () => {
    const order = s0.orders.find((o) => o.items.some((i) => i.serviceId === 's-kilo-reg') && o.outletId === 'o-kmg')!
    const before = order.items.find((i) => i.serviceId === 's-kilo-reg')!.unitPrice
    const { state, value } = ok(updateServicePrice(s0, 's-kilo-reg', 'o-kmg', 8000, actor, now))
    expect(value.prices['o-kmg']).toBe(8000)
    expect(state.platform.audit.at(-1)).toMatchObject({ action: 'service.price_changed', entityId: 's-kilo-reg' })
    expect(state.orders.find((o) => o.id === order.id)!.items.find((i) => i.serviceId === 's-kilo-reg')!.unitPrice).toBe(before)
  })

  it('harga negatif atau pecahan ditolak', () => {
    expect(updateServicePrice(s0, 's-kilo-reg', 'o-kmg', -1, actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
    expect(updateServicePrice(s0, 's-kilo-reg', 'o-kmg', 7500.5, actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
  })

  it('layanan bisa dinonaktifkan', () => {
    expect(ok(setServiceActive(s0, 's-karpet', false, actor, now)).value.active).toBe(false)
  })
})

describe('zona pengantaran', () => {
  it('zona harus berurutan tanpa celah', () => {
    const gap = [
      { ...DEFAULT_ZONES[0], minKm: 0, maxKm: 2 },
      { ...DEFAULT_ZONES[1], minKm: 3, maxKm: 5 },
    ]
    expect(updateZones(s0, gap, actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
    expect(updateZones(s0, [{ ...DEFAULT_ZONES[0], minKm: 0, maxKm: 0 }], actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
    const saved = ok(updateZones(s0, DEFAULT_ZONES, actor, now))
    expect(saved.state.platform.audit.at(-1)?.action).toBe('delivery_zone.updated')
  })
})

describe('tugas antar-jemput', () => {
  const requested = s0.orders.find((o) => o.status === 'REQUESTED' && o.outletId === 'o-kmg')!
  const pickupTask = s0.deliveryTasks.find((t) => t.orderId === requested.id && t.type === 'PICKUP')!

  it('assign kurir memindahkan order REQUESTED ke PICKUP_ASSIGNED', () => {
    const { state, value } = ok(assignCourier(s0, pickupTask.id, 'st-bayu', actor, now))
    expect(value).toMatchObject({ courierId: 'st-bayu', status: 'ASSIGNED' })
    expect(state.orders.find((o) => o.id === requested.id)?.status).toBe('PICKUP_ASSIGNED')
  })

  it('selesai jemput wajib nama penerima dan memindahkan order ke PICKED_UP', () => {
    const assigned = ok(assignCourier(s0, pickupTask.id, 'st-bayu', actor, now)).state
    expect(updateDeliveryTask(assigned, pickupTask.id, 'DONE', {}, actor, now)).toEqual({ ok: false, error: 'REASON_REQUIRED' })
    expect(updateDeliveryTask(assigned, pickupTask.id, 'DONE', { proof: { receiverName: ' ', method: 'PHOTO' } }, actor, now)).toEqual({
      ok: false,
      error: 'REASON_REQUIRED',
    })
    const done = ok(updateDeliveryTask(assigned, pickupTask.id, 'DONE', { proof: { receiverName: 'Ayu', method: 'PHOTO' } }, actor, now))
    expect(done.value.proof).toMatchObject({ receiverName: 'Ayu', method: 'PHOTO', at: now.toISOString() })
    expect(done.state.orders.find((o) => o.id === requested.id)?.status).toBe('PICKED_UP')
  })

  it('gagal antar wajib alasan', () => {
    expect(updateDeliveryTask(s0, pickupTask.id, 'FAILED', { failReason: '  ' }, actor, now)).toEqual({ ok: false, error: 'REASON_REQUIRED' })
    expect(ok(updateDeliveryTask(s0, pickupTask.id, 'FAILED', { failReason: 'Rumah kosong' }, actor, now)).value.failReason).toBe('Rumah kosong')
  })

  it('selesai antar memindahkan order ke DELIVERED', () => {
    const ready = s0.orders.find((o) => o.status === 'READY_FOR_PICKUP' && o.handback === 'DELIVERY')!
    const out = ok(transitionOrder(s0, ready.id, 'OUT_FOR_DELIVERY', {}, actor, now)).state
    const task = out.deliveryTasks.find((t) => t.orderId === ready.id && t.type === 'DELIVERY')!
    const done = ok(updateDeliveryTask(out, task.id, 'DONE', { proof: { receiverName: 'Dimas', method: 'SIGNATURE' } }, actor, now))
    expect(done.state.orders.find((o) => o.id === ready.id)?.status).toBe('DELIVERED')
  })
})
