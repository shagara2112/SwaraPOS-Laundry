import { describe, it, expect } from 'vitest'
import type { Actor, Order, OrderStatus } from '../types'
import {
  createOrder,
  markWhatsApp,
  recordPayment,
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
