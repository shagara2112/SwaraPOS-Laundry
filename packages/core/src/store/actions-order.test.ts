import { describe, it, expect } from 'vitest'
import type { Actor, Order, OrderStatus } from '../types'
import {
  adjustOrderItems,
  canAdjustItems,
  createOrder,
  markWhatsApp,
  recordPayment,
  recordRefund,
  setOrderDiscount,
  recordQc,
  transitionOrder,
  type NewOrderInput,
} from './actions-order'
import { createSeed } from './seed'
import type { ActionResult, DemoState } from './state'

const now = new Date('2026-10-31T03:00:00Z')
const actor: Actor = { id: 'u-test', name: 'Tester' }
const s0 = createSeed(now)
const kilo = s0.services.find((s) => s.id === 's-kilo-reg')!
const cust = s0.customers[0]

const walkIn: NewOrderInput = {
  outletId: 'o-kmg',
  customerId: cust.id,
  intake: 'WALK_IN',
  handback: 'SELF_PICKUP',
  express: false,
  items: [{ serviceId: kilo.id, qty: 3.5 }],
  conditionNotes: [],
  pickupFee: 0,
  deliveryFee: 0,
}

function ok<T>(r: ActionResult<T>): { state: DemoState; value: T } {
  if (!r.ok) throw new Error(`expected ok, got ${r.error}`)
  return r
}

function seedOrder(status: OrderStatus): Order {
  const order = s0.orders.find((o) => o.status === status)
  if (!order) throw new Error(`seed has no ${status} order`)
  return order
}

describe('createOrder', () => {
  it('walk-in langsung RECEIVED dengan nomor order dan WA log', () => {
    const { value } = ok(createOrder(s0, walkIn, actor, now))
    expect(value.status).toBe('RECEIVED')
    expect(value.orderNo).toMatch(/^KMG-\d{6}-\d{4}$/)
    expect(value.items[0].unitPrice).toBe(kilo.prices['o-kmg'])
    expect(value.items[0].total).toBe(Math.round(kilo.prices['o-kmg'] * 3.5))
    expect(value.history[0]).toMatchObject({ from: null, to: 'RECEIVED' })
    expect(value.whatsapp).toEqual([expect.objectContaining({ event: 'ORDER_RECEIVED', state: 'NOT_SENT' })])
  })

  it('pickup mulai REQUESTED dan membuat tugas jemput', () => {
    const { state, value } = ok(createOrder(s0, { ...walkIn, intake: 'PICKUP', pickupFee: 5000 }, actor, now))
    expect(value.status).toBe('REQUESTED')
    expect(value.whatsapp).toEqual([])
    expect(state.deliveryTasks.length).toBe(s0.deliveryTasks.length + 1)
    expect(state.deliveryTasks.at(-1)).toMatchObject({
      orderId: value.id,
      type: 'PICKUP',
      status: 'UNASSIGNED',
      fee: 5000,
    })
  })

  it('dua order di hari yang sama mendapat nomor berbeda', () => {
    const first = ok(createOrder(s0, walkIn, actor, now))
    const second = ok(createOrder(first.state, walkIn, actor, now))
    expect(second.value.orderNo).not.toBe(first.value.orderNo)
  })

  it('price snapshot tidak berubah saat harga layanan diubah', () => {
    const { state, value } = ok(createOrder(s0, walkIn, actor, now))
    const repriced: DemoState = {
      ...state,
      services: state.services.map((s) =>
        s.id === kilo.id ? { ...s, prices: { ...s.prices, 'o-kmg': 99000 } } : s,
      ),
    }
    expect(repriced.orders.find((o) => o.id === value.id)!.items[0].unitPrice).toBe(kilo.prices['o-kmg'])
  })

  it('tanpa item ditolak', () => {
    expect(createOrder(s0, { ...walkIn, items: [] }, actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
  })
})

describe('transitionOrder', () => {
  it('transisi tidak sah tidak mengubah state', () => {
    const { state, value } = ok(createOrder(s0, walkIn, actor, now))
    expect(transitionOrder(state, value.id, 'IN_WASHING', {}, actor, now)).toEqual({
      ok: false,
      error: 'NOT_ALLOWED',
    })
  })

  it('transisi sah menambah history dan version', () => {
    const created = ok(createOrder(s0, walkIn, actor, now))
    const { value } = ok(transitionOrder(created.state, created.value.id, 'INSPECTED', {}, actor, now))
    expect(value.status).toBe('INSPECTED')
    expect(value.history.length).toBe(created.value.history.length + 1)
    expect(value.version).toBe(created.value.version + 1)
  })

  it('hold lalu lanjut kembali ke status sebelumnya', () => {
    const drying = seedOrder('IN_DRYING')
    const held = ok(transitionOrder(s0, drying.id, 'ON_HOLD', { reason: 'Mesin rusak' }, actor, now))
    expect(held.value.history.at(-1)?.note).toBe('Mesin rusak')
    expect(held.state.platform.audit.at(-1)?.action).toBe('order.on_hold')
    expect(transitionOrder(held.state, drying.id, 'IN_WASHING', {}, actor, now)).toEqual({
      ok: false,
      error: 'NOT_ALLOWED',
    })
    expect(ok(transitionOrder(held.state, drying.id, 'IN_DRYING', {}, actor, now)).value.status).toBe('IN_DRYING')
  })

  it('QC gagal memblokir siap, QC lulus membuka', () => {
    const qc = seedOrder('QUALITY_CHECK')
    const failed = ok(recordQc(s0, qc.id, { passed: false, notes: 'Masih ada noda' }, actor, now))
    expect(failed.value.status).toBe('QUALITY_CHECK')
    expect(transitionOrder(failed.state, qc.id, 'READY_FOR_PICKUP', {}, actor, now)).toEqual({
      ok: false,
      error: 'QC_REQUIRED',
    })
    const passed = ok(recordQc(failed.state, qc.id, { passed: true }, actor, now))
    expect(ok(transitionOrder(passed.state, qc.id, 'READY_FOR_PICKUP', {}, actor, now)).value.status).toBe(
      'READY_FOR_PICKUP',
    )
  })

  it('recordQc hanya saat QUALITY_CHECK', () => {
    expect(recordQc(s0, seedOrder('IN_DRYING').id, { passed: true }, actor, now)).toEqual({
      ok: false,
      error: 'NOT_ALLOWED',
    })
  })

  it('WA log idempoten per event', () => {
    const qc = seedOrder('QUALITY_CHECK')
    expect(qc.whatsapp.filter((l) => l.event === 'IN_PROCESS').length).toBe(1)
    const { value } = ok(transitionOrder(s0, qc.id, 'IN_WASHING', {}, actor, now))
    expect(value.whatsapp.filter((l) => l.event === 'IN_PROCESS').length).toBe(1)
    expect(value.qcPassed).toBe(false)
  })

  it('masuk OUT_FOR_DELIVERY membuat tugas antar', () => {
    const ready = s0.orders.find((o) => o.status === 'READY_FOR_PICKUP' && o.handback === 'DELIVERY')!
    const { state } = ok(transitionOrder(s0, ready.id, 'OUT_FOR_DELIVERY', {}, actor, now))
    expect(state.deliveryTasks.filter((t) => t.orderId === ready.id && t.type === 'DELIVERY').length).toBe(1)
  })
})

describe('recordPayment & markWhatsApp', () => {
  it('pembayaran sebagian lalu lunas', () => {
    const { state, value } = ok(createOrder(s0, walkIn, actor, now))
    const partial = ok(recordPayment(state, value.id, { method: 'CASH', amount: 10000 }, actor, now))
    expect(partial.value.paymentStatus).toBe('PARTIAL')
    const rest = value.totals.total - 10000
    const paid = ok(recordPayment(partial.state, value.id, { method: 'QRIS', amount: rest }, actor, now))
    expect(paid.value.paymentStatus).toBe('PAID')
    expect(paid.value.payments.length).toBe(2)
  })

  it('nominal nol atau pecahan ditolak', () => {
    const { state, value } = ok(createOrder(s0, walkIn, actor, now))
    expect(recordPayment(state, value.id, { method: 'CASH', amount: 0 }, actor, now)).toEqual({
      ok: false,
      error: 'NOT_ALLOWED',
    })
    expect(recordPayment(state, value.id, { method: 'CASH', amount: 100.5 }, actor, now)).toEqual({
      ok: false,
      error: 'NOT_ALLOWED',
    })
  })

  it('markWhatsApp mengubah state log', () => {
    const { state, value } = ok(createOrder(s0, walkIn, actor, now))
    const logId = value.whatsapp[0].id
    const opened = ok(markWhatsApp(state, value.id, logId, 'OPENED', actor, now))
    expect(opened.value.whatsapp[0]).toMatchObject({ state: 'OPENED', actor, updatedAt: now.toISOString() })
    const sent = ok(markWhatsApp(opened.state, value.id, logId, 'SENT', actor, now))
    expect(sent.value.whatsapp[0].state).toBe('SENT')
  })
})

describe('idempotensi createOrder (review final)', () => {
  it('idempotencyKey yang sama tidak membuat order ganda', () => {
    const first = ok(createOrder(s0, { ...walkIn, idempotencyKey: 'draft-1' }, actor, now))
    const again = ok(createOrder(first.state, { ...walkIn, idempotencyKey: 'draft-1' }, actor, now))
    expect(again.value.id).toBe(first.value.id)
    expect(again.state.orders.length).toBe(first.state.orders.length)
  })
})

describe('adjustOrderItems (koreksi berat/item)', () => {
  const parfum = s0.services.find((x) => x.id === 's-parfum')!
  const setup = () => {
    const created = ok(createOrder(s0, { ...walkIn, express: true, items: [{ serviceId: kilo.id, qty: 3.5 }, { serviceId: parfum.id, qty: 1 }] }, actor, now))
    return { state: created.state, order: created.value }
  }

  it('mengubah berat dengan harga terkunci, menghitung ulang total, dan mencatat riwayat + audit', () => {
    const { state, order } = setup()
    const [kiloItem, parfumItem] = order.items
    const { value, state: next } = ok(
      adjustOrderItems(state, order.id, { lines: [{ itemId: kiloItem.id, serviceId: kilo.id, qty: 4.2 }, { itemId: parfumItem.id, serviceId: parfum.id, qty: 1 }], reason: 'Timbang ulang di outlet' }, actor, now),
    )
    expect(value.items[0]).toMatchObject({ id: kiloItem.id, qty: 4.2, unitPrice: kiloItem.unitPrice, total: Math.round(kiloItem.unitPrice * 4.2) })
    const subtotal = Math.round(kiloItem.unitPrice * 4.2) + parfumItem.total
    expect(value.totals.subtotal).toBe(subtotal)
    expect(value.totals.expressFee).toBe(Math.round((subtotal * s0.tenant.expressSurchargePct) / 100))
    expect(value.totals.total).toBe(subtotal + value.totals.expressFee)
    const last = value.history.at(-1)!
    expect(last).toMatchObject({ from: order.status, to: order.status, label: 'Koreksi item' })
    expect(last.note).toContain('3,5 kg → 4,2 kg')
    expect(last.note).toContain('Timbang ulang di outlet')
    expect(next.platform.audit.at(-1)).toMatchObject({ action: 'order.items_adjusted', entityId: order.id })
  })

  it('baris bisa dihapus dan layanan baru memakai harga outlet saat ini', () => {
    const { state, order } = setup()
    const kemeja = s0.services.find((x) => x.id === 's-kemeja')!
    const { value } = ok(adjustOrderItems(state, order.id, { lines: [{ itemId: order.items[0].id, serviceId: kilo.id, qty: 3.5 }, { serviceId: kemeja.id, qty: 2 }], reason: 'Tambah kemeja' }, actor, now))
    expect(value.items.map((i) => i.serviceId)).toEqual([kilo.id, kemeja.id])
    expect(value.items[1]).toMatchObject({ qty: 2, unitPrice: kemeja.prices['o-kmg'] })
    expect(value.history.at(-1)?.note).toContain('Hapus Parfum Premium')
    expect(value.history.at(-1)?.note).toContain('Tambah Kemeja / Blus')
  })

  it('alasan wajib, minimal satu layanan utama, dan jumlah harus lebih dari 0', () => {
    const { state, order } = setup()
    const line = { itemId: order.items[0].id, serviceId: kilo.id, qty: 4 }
    expect(adjustOrderItems(state, order.id, { lines: [line], reason: ' ' }, actor, now)).toEqual({ ok: false, error: 'REASON_REQUIRED' })
    expect(adjustOrderItems(state, order.id, { lines: [{ serviceId: parfum.id, qty: 1 }], reason: 'x' }, actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
    expect(adjustOrderItems(state, order.id, { lines: [{ ...line, qty: 0 }], reason: 'x' }, actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
  })

  it('koreksi dibuka sampai QC, ditutup sejak siap', () => {
    expect(canAdjustItems('WEIGHED_OR_COUNTED')).toBe(true)
    expect(canAdjustItems('QUALITY_CHECK')).toBe(true)
    expect(canAdjustItems('READY_FOR_PICKUP')).toBe(false)
    expect(canAdjustItems('COMPLETED')).toBe(false)
  })

  it('order yang sudah siap atau selesai tidak bisa dikoreksi', () => {
    const ready = s0.orders.find((o) => o.status === 'READY_FOR_PICKUP')!
    const line = { itemId: ready.items[0].id, serviceId: ready.items[0].serviceId, qty: 9 }
    expect(adjustOrderItems(s0, ready.id, { lines: [line], reason: 'x' }, actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
  })

  it('total baru tidak boleh di bawah yang sudah dibayar', () => {
    const { state, order } = setup()
    const paid = ok(recordPayment(state, order.id, { method: 'CASH', amount: order.totals.total }, actor, now))
    const line = { itemId: order.items[0].id, serviceId: kilo.id, qty: 1 }
    expect(adjustOrderItems(paid.state, order.id, { lines: [line], reason: 'x' }, actor, now)).toEqual({ ok: false, error: 'OVERPAID' })
  })

  it('status bayar mengikuti total baru', () => {
    const { state, order } = setup()
    const paid = ok(recordPayment(state, order.id, { method: 'CASH', amount: order.totals.total }, actor, now))
    expect(paid.value.paymentStatus).toBe('PAID')
    const line = { itemId: order.items[0].id, serviceId: kilo.id, qty: 6 }
    const { value } = ok(adjustOrderItems(paid.state, order.id, { lines: [line, { itemId: order.items[1].id, serviceId: parfum.id, qty: 1 }], reason: 'Timbang ulang' }, actor, now))
    expect(value.paymentStatus).toBe('PARTIAL')
  })
})

describe('serah-terima dengan sisa tagihan (piutang)', () => {
  const readyUnpaid = () => {
    const o = s0.orders.find((x) => x.status === 'READY_FOR_PICKUP' && x.handback === 'SELF_PICKUP' && x.paymentStatus !== 'PAID')!
    return o
  }

  it('order belum lunas tidak bisa diambil tanpa alasan piutang', () => {
    expect(transitionOrder(s0, readyUnpaid().id, 'COMPLETED', {}, actor, now)).toEqual({ ok: false, error: 'UNPAID' })
  })

  it('dengan alasan, order selesai dan piutang tercatat di riwayat serta audit', () => {
    const o = readyUnpaid()
    const { value, state } = ok(transitionOrder(s0, o.id, 'COMPLETED', { reason: 'Pelanggan langganan, bayar akhir bulan' }, actor, now))
    expect(value.status).toBe('COMPLETED')
    expect(value.history.at(-1)?.note).toMatch(/^Piutang Rp[\d.]+: Pelanggan langganan, bayar akhir bulan$/)
    expect(state.platform.audit.at(-1)).toMatchObject({ action: 'order.credit', entityId: o.id })
  })

  it('order lunas diambil tanpa alasan', () => {
    const o = readyUnpaid()
    const paid = ok(recordPayment(s0, o.id, { method: 'CASH', amount: o.totals.total - o.payments.reduce((x, p) => x + p.amount, 0) }, actor, now))
    expect(ok(transitionOrder(paid.state, o.id, 'COMPLETED', {}, actor, now)).value.status).toBe('COMPLETED')
  })
})

describe('diskon order', () => {
  it('createOrder menyimpan diskon beserta alasannya', () => {
    const { value } = ok(createOrder(s0, { ...walkIn, discount: { type: 'AMOUNT', value: 4500, reason: 'Pelanggan langganan' } }, actor, now))
    expect(value.totals.discount).toBe(4500)
    expect(value.totals.total).toBe(value.totals.subtotal - 4500)
    expect(value.discount).toEqual({ type: 'AMOUNT', value: 4500, reason: 'Pelanggan langganan' })
  })

  it('setOrderDiscount menghitung ulang total, wajib alasan, dan tercatat', () => {
    const created = ok(createOrder(s0, walkIn, actor, now))
    const { value, state } = ok(setOrderDiscount(created.state, created.value.id, { type: 'PERCENT', value: 10, reason: 'Promo buka' }, actor, now))
    expect(value.totals.discount).toBe(Math.round(created.value.totals.subtotal * 0.1))
    expect(value.history.at(-1)).toMatchObject({ label: 'Diskon' })
    expect(value.history.at(-1)?.note).toContain('Promo buka')
    expect(state.platform.audit.at(-1)).toMatchObject({ action: 'order.discount', entityId: created.value.id })
    expect(setOrderDiscount(created.state, created.value.id, { type: 'AMOUNT', value: 1000, reason: ' ' }, actor, now)).toEqual({ ok: false, error: 'REASON_REQUIRED' })
  })

  it('diskon bisa dihapus, tidak boleh melewati yang sudah dibayar, dan tidak untuk order selesai', () => {
    const created = ok(createOrder(s0, { ...walkIn, discount: { type: 'AMOUNT', value: 4500, reason: 'x' } }, actor, now))
    const cleared = ok(setOrderDiscount(created.state, created.value.id, null, actor, now))
    expect(cleared.value.totals.discount).toBe(0)
    expect(cleared.value.discount).toBeUndefined()
    const paid = ok(recordPayment(created.state, created.value.id, { method: 'CASH', amount: created.value.totals.total }, actor, now))
    expect(setOrderDiscount(paid.state, created.value.id, { type: 'AMOUNT', value: 10000, reason: 'x' }, actor, now)).toEqual({ ok: false, error: 'OVERPAID' })
    const done = seedOrder('COMPLETED')
    expect(setOrderDiscount(s0, done.id, { type: 'AMOUNT', value: 1000, reason: 'x' }, actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
  })

  it('koreksi item mempertahankan diskon', () => {
    const created = ok(createOrder(s0, { ...walkIn, discount: { type: 'PERCENT', value: 10, reason: 'x' } }, actor, now))
    const line = { itemId: created.value.items[0].id, serviceId: kilo.id, qty: 5 }
    const { value } = ok(adjustOrderItems(created.state, created.value.id, { lines: [line], reason: 'Timbang ulang' }, actor, now))
    expect(value.totals.discount).toBe(Math.round(value.totals.subtotal * 0.1))
  })
})

describe('refund', () => {
  const paidOrder = () => {
    const created = ok(createOrder(s0, walkIn, actor, now))
    return ok(recordPayment(created.state, created.value.id, { method: 'CASH', amount: created.value.totals.total }, actor, now))
  }

  it('order batal yang sudah dibayar bisa direfund penuh dan berstatus REFUNDED', () => {
    const paid = paidOrder()
    const cancelled = ok(transitionOrder(paid.state, paid.value.id, 'CANCELLED', { reason: 'Pelanggan batal' }, actor, now))
    const { value, state } = ok(recordRefund(cancelled.state, paid.value.id, { method: 'CASH', amount: paid.value.totals.total, reason: 'Batal sebelum dicuci' }, actor, now))
    expect(value.payments.at(-1)).toMatchObject({ amount: -paid.value.totals.total, refund: true, method: 'CASH' })
    expect(value.paymentStatus).toBe('REFUNDED')
    expect(value.history.at(-1)).toMatchObject({ label: 'Refund' })
    expect(state.platform.audit.at(-1)).toMatchObject({ action: 'order.refund', entityId: paid.value.id })
  })

  it('refund dibatasi sebesar kelebihan bayar dan wajib alasan', () => {
    const paid = paidOrder()
    expect(recordRefund(paid.state, paid.value.id, { method: 'CASH', amount: 1000, reason: 'x' }, actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
    const discounted = { ...paid.state, orders: paid.state.orders }
    const cancelled = ok(transitionOrder(discounted, paid.value.id, 'CANCELLED', { reason: 'batal' }, actor, now))
    expect(recordRefund(cancelled.state, paid.value.id, { method: 'CASH', amount: paid.value.totals.total + 1, reason: 'x' }, actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
    expect(recordRefund(cancelled.state, paid.value.id, { method: 'CASH', amount: 1000, reason: ' ' }, actor, now)).toEqual({ ok: false, error: 'REASON_REQUIRED' })
  })

  it('refund sebagian kelebihan bayar pada order aktif mengembalikan status ke lunas', () => {
    const created = ok(createOrder(s0, walkIn, actor, now))
    const over = ok(recordPayment(created.state, created.value.id, { method: 'QRIS', amount: created.value.totals.total + 5000 }, actor, now))
    const { value } = ok(recordRefund(over.state, created.value.id, { method: 'QRIS', amount: 5000, reason: 'Kelebihan transfer' }, actor, now))
    expect(value.paymentStatus).toBe('PAID')
  })
})
