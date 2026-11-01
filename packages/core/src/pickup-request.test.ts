import { describe, expect, it } from 'vitest'
import { createPickupRequest, pickupSlots, tenantSlug } from './pickup-request'
import { createSeed } from './store/seed'
import type { ActionResult, DemoState } from './store/state'

// 31 Okt 2026 pukul 10.00 WIB.
const now = new Date('2026-10-31T03:00:00Z')
const s0 = createSeed(now)
const zone2 = s0.zones.find((z) => z.name === 'Zona 2')!
const wib = (day: string, h: number) => new Date(Date.parse(`${day}T00:00:00+07:00`) + h * 3600_000).toISOString()

function ok<T>(r: ActionResult<T>): { state: DemoState; value: T } {
  if (!r.ok) throw new Error(`expected ok, got ${r.error}`)
  return r
}

const request = {
  slug: 'bersih-kilat',
  outletId: 'o-kmg',
  name: 'Lestari Pelanggan Baru',
  phone: '0812-7000-1234',
  address: 'Jl. Melati No. 5, Mampang',
  locationNote: 'Pagar hijau',
  zoneId: zone2.id,
  pickupAt: wib('2026-10-31', 13),
  handback: 'DELIVERY' as const,
  serviceNote: 'Kiloan reguler, ada 2 bed cover',
}

describe('pickupSlots', () => {
  it('hari ini hanya slot yang mulai minimal 1 jam lagi; besok semua slot', () => {
    const slots = pickupSlots(now)
    expect(slots.filter((s) => s.day === 'Hari ini').map((s) => s.label)).toEqual(['13.00–15.00', '15.00–17.00', '17.00–19.00'])
    expect(slots.filter((s) => s.day === 'Besok')).toHaveLength(5)
    expect(slots[0].start).toBe(wib('2026-10-31', 13))
  })
})

describe('createPickupRequest', () => {
  it('membuat pelanggan dan permintaan jemput dari link dengan biaya zona', () => {
    const { value, state } = ok(createPickupRequest(s0, request, now))
    const order = state.orders.find((o) => o.id === value.id)!
    expect(order).toMatchObject({ status: 'REQUESTED', channel: 'LANDING', intake: 'PICKUP', handback: 'DELIVERY', items: [] })
    expect(order.totals).toMatchObject({ subtotal: 0, pickupFee: zone2.pickupFee, deliveryFee: zone2.deliveryFee, total: zone2.pickupFee + zone2.deliveryFee })
    expect(state.customers.find((c) => c.id === order.customerId)).toMatchObject({ name: request.name, address: request.address })
    const task = state.deliveryTasks.find((t) => t.orderId === order.id)!
    expect(task).toMatchObject({ type: 'PICKUP', status: 'UNASSIGNED', scheduledAt: request.pickupAt, address: `${request.address} (${request.locationNote})`, fee: zone2.pickupFee })
    expect(order.history[0].note).toContain('Kiloan reguler, ada 2 bed cover')
    expect(new Date(order.dueAt).getTime()).toBeGreaterThan(new Date(request.pickupAt).getTime())
  })

  it('nomor yang sudah terdaftar memakai pelanggan lama', () => {
    const existing = s0.customers[0]
    const { value, state } = ok(createPickupRequest(s0, { ...request, phone: existing.phone }, now))
    expect(state.orders.find((o) => o.id === value.id)!.customerId).toBe(existing.id)
    expect(state.customers).toHaveLength(s0.customers.length)
  })

  it('isian tidak lengkap atau tidak valid ditolak', () => {
    expect(createPickupRequest(s0, { ...request, phone: '12' }, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
    expect(createPickupRequest(s0, { ...request, name: ' ' }, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
    expect(createPickupRequest(s0, { ...request, address: '' }, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
    expect(createPickupRequest(s0, { ...request, zoneId: 'z-tidak-ada' }, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
    expect(createPickupRequest(s0, { ...request, slug: 'laundry-lain' }, now)).toEqual({ ok: false, error: 'NOT_FOUND' })
    expect(createPickupRequest(s0, { ...request, pickupAt: wib('2026-10-30', 13) }, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
  })

  it('maksimal 3 permintaan aktif per nomor WhatsApp', () => {
    let state = s0
    for (let i = 0; i < 3; i++) state = ok(createPickupRequest(state, request, now)).state
    expect(createPickupRequest(state, request, now)).toEqual({ ok: false, error: 'TOO_MANY' })
  })
})

describe('tenantSlug', () => {
  it('slug laundry dari data platform', () => {
    expect(tenantSlug(s0)).toBe('bersih-kilat')
  })
})
