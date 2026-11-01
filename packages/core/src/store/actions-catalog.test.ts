import { describe, it, expect } from 'vitest'
import type { Actor } from '../types'
import { DEFAULT_ZONES } from '../domain/delivery-zone'
import {
  addCustomer,
  assignCourier,
  deleteCustomer,
  setReceiptPaper,
  setServiceActive,
  updateCustomer,
  updateDeliveryTask,
  updateServicePrice,
  updateZones,
  upsertOutletPaymentMethod,
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

describe('updateCustomer', () => {
  const target = () => s0.customers[0]

  it('mengubah nama, telepon, alamat, dan catatan (dirapikan) serta mencatat audit', () => {
    const { state, value } = ok(updateCustomer(s0, target().id, { name: '  Sari H. ', phone: '0812 9999 0000', address: ' Jl. Baru 1 ', notes: ' ' }, actor, now))
    expect(value).toMatchObject({ id: target().id, name: 'Sari H.', phone: '0812 9999 0000', address: 'Jl. Baru 1', notes: undefined })
    expect(state.customers.find((c) => c.id === target().id)?.name).toBe('Sari H.')
    expect(state.customers.length).toBe(s0.customers.length)
    expect(state.platform.audit.at(-1)).toMatchObject({ action: 'customer.updated', entityId: target().id })
  })

  it('order lama tetap menunjuk pelanggan yang sama', () => {
    const { state } = ok(updateCustomer(s0, target().id, { name: 'Nama Baru', phone: target().phone }, actor, now))
    expect(state.orders.filter((o) => o.customerId === target().id).length).toBe(s0.orders.filter((o) => o.customerId === target().id).length)
  })

  it('nomor WhatsApp milik pelanggan lain ditolak (beda format pun)', () => {
    const other = s0.customers[1]
    const digits = other.phone.replace(/\D/g, '')
    expect(updateCustomer(s0, target().id, { name: 'X', phone: `+62 ${digits.slice(1)}` }, actor, now)).toEqual({ ok: false, error: 'DUPLICATE' })
  })

  it('nama kosong, telepon tidak valid, atau pelanggan tidak ada ditolak', () => {
    expect(updateCustomer(s0, target().id, { name: ' ', phone: target().phone }, actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
    expect(updateCustomer(s0, target().id, { name: 'X', phone: '12' }, actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
    expect(updateCustomer(s0, 'cus-tidak-ada', { name: 'X', phone: '081311112222' }, actor, now)).toEqual({ ok: false, error: 'NOT_FOUND' })
  })
})

describe('deleteCustomer', () => {
  it('pelanggan tanpa order bisa dihapus dan tercatat di audit', () => {
    const added = ok(addCustomer(s0, { name: 'Salah Input', phone: '0813 7777 8888' }, actor, now))
    const { state } = ok(deleteCustomer(added.state, added.value.id, actor, now))
    expect(state.customers.some((c) => c.id === added.value.id)).toBe(false)
    expect(state.platform.audit.at(-1)).toMatchObject({ action: 'customer.deleted', entityId: added.value.id })
  })

  it('pelanggan yang punya order tidak bisa dihapus agar riwayat tetap utuh', () => {
    const withOrders = s0.customers.find((c) => s0.orders.some((o) => o.customerId === c.id))!
    expect(deleteCustomer(s0, withOrders.id, actor, now)).toEqual({ ok: false, error: 'IN_USE' })
  })

  it('pelanggan tidak ada ditolak', () => {
    expect(deleteCustomer(s0, 'cus-tidak-ada', actor, now)).toEqual({ ok: false, error: 'NOT_FOUND' })
  })
})

describe('setReceiptPaper', () => {
  it('mengatur ukuran kertas nota per outlet dan mencatat audit', () => {
    const outlet = s0.outlets[0]
    const { state, value } = ok(setReceiptPaper(s0, outlet.id, 80, actor, now))
    expect(value.receiptPaper).toBe(80)
    expect(state.outlets.find((o) => o.id === outlet.id)?.receiptPaper).toBe(80)
    expect(state.outlets.find((o) => o.id !== outlet.id)?.receiptPaper).toBeUndefined()
    expect(state.platform.audit.at(-1)).toMatchObject({ action: 'outlet.receipt_paper', entityId: outlet.id })
  })

  it('outlet tidak ada ditolak', () => {
    expect(setReceiptPaper(s0, 'o-tidak-ada', 58, actor, now)).toEqual({ ok: false, error: 'NOT_FOUND' })
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

describe('sinkron tugas antar-jemput dengan order (review final)', () => {
  const requested = s0.orders.find((o) => o.status === 'REQUESTED' && o.outletId === 'o-kmg')!
  const pickupTask = s0.deliveryTasks.find((t) => t.orderId === requested.id && t.type === 'PICKUP')!

  it('membatalkan order menutup tugas jemput yang masih terbuka', () => {
    const { state } = ok(transitionOrder(s0, requested.id, 'CANCELLED', { reason: 'Pelanggan batal' }, actor, now))
    const task = state.deliveryTasks.find((t) => t.id === pickupTask.id)!
    expect(task.status).toBe('FAILED')
    expect(task.failReason).toContain('dibatalkan')
  })

  it('pelanggan mengantar sendiri menutup tugas jemput', () => {
    const { state } = ok(transitionOrder(s0, requested.id, 'RECEIVED', {}, actor, now))
    expect(state.deliveryTasks.find((t) => t.id === pickupTask.id)!.status).toBe('FAILED')
  })

  it('kurir tidak bisa ditugaskan untuk order yang dibatalkan', () => {
    const cancelled = s0.orders.find((o) => o.status === 'CANCELLED')!
    const task = s0.deliveryTasks.find((t) => t.orderId === cancelled.id)!
    expect(assignCourier(s0, task.id, 'st-bayu', actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
  })

  it('tugas selesai ditolak bila order tidak bisa ikut berpindah', () => {
    const out = s0.orders.find((o) => o.status === 'OUT_FOR_DELIVERY')!
    const task = s0.deliveryTasks.find((t) => t.orderId === out.id && t.type === 'DELIVERY')!
    const held = ok(transitionOrder(s0, out.id, 'ON_HOLD', { reason: 'Alamat salah' }, actor, now)).state
    expect(updateDeliveryTask(held, task.id, 'DONE', { proof: { receiverName: 'Putri', method: 'PHOTO' } }, actor, now)).toEqual({
      ok: false,
      error: 'NOT_ALLOWED',
    })
  })
})

describe('metode bayar outlet', () => {
  const bri = {
    type: 'TRANSFER' as const,
    label: 'Transfer BRI',
    bankName: 'BRI',
    accountNumber: '0341 0100 0123 301',
    accountName: 'Rina Wulandari',
    instructions: 'Sertakan nomor order di berita transfer.',
    sortOrder: 9,
    active: true,
  }

  it('menambah rekening transfer baru dan mencatat audit', () => {
    const { state, value } = ok(upsertOutletPaymentMethod(s0, bri, actor, now))
    expect(state.outletPaymentMethods.length).toBe(s0.outletPaymentMethods.length + 1)
    expect(value).toMatchObject({ label: 'Transfer BRI', accountNumber: '0341 0100 0123 301' })
    expect(state.platform.audit.at(-1)).toMatchObject({ action: 'outlet_payment_method.created', tenantId: 't1' })
  })

  it('transfer wajib bank, nama pemilik, dan nomor rekening yang valid', () => {
    expect(upsertOutletPaymentMethod(s0, { ...bri, accountNumber: '12ab' }, actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
    expect(upsertOutletPaymentMethod(s0, { ...bri, accountNumber: '' }, actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
    expect(upsertOutletPaymentMethod(s0, { ...bri, bankName: ' ' }, actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
    expect(upsertOutletPaymentMethod(s0, { ...bri, accountName: '' }, actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
    expect(upsertOutletPaymentMethod(s0, { ...bri, label: '  ' }, actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
  })

  it('QRIS wajib nama merchant', () => {
    const qris = { type: 'QRIS' as const, label: 'QRIS baru', instructions: '', sortOrder: 9, active: true }
    expect(upsertOutletPaymentMethod(s0, qris, actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
    expect(upsertOutletPaymentMethod(s0, { ...qris, merchantName: 'LAUNDRY BERSIH KILAT' }, actor, now).ok).toBe(true)
  })

  it('mengubah metode yang ada tanpa menambah baris', () => {
    const existing = s0.outletPaymentMethods.find((m) => m.type === 'TRANSFER')!
    const { state, value } = ok(upsertOutletPaymentMethod(s0, { ...existing, accountNumber: '731 999 0000' }, actor, now))
    expect(value.accountNumber).toBe('731 999 0000')
    expect(state.outletPaymentMethods.length).toBe(s0.outletPaymentMethods.length)
    expect(state.platform.audit.at(-1)?.action).toBe('outlet_payment_method.updated')
  })

  it('metode dengan id tidak dikenal ditolak', () => {
    expect(upsertOutletPaymentMethod(s0, { ...bri, id: 'pm-tidak-ada' }, actor, now)).toEqual({ ok: false, error: 'NOT_FOUND' })
  })

  it('tidak boleh menonaktifkan metode aktif terakhir', () => {
    let state = s0
    const active = s0.outletPaymentMethods.filter((m) => m.active)
    for (const m of active.slice(0, -1)) state = ok(upsertOutletPaymentMethod(state, { ...m, active: false }, actor, now)).state
    const last = active.at(-1)!
    expect(upsertOutletPaymentMethod(state, { ...last, active: false }, actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
  })
})
