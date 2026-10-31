import { describe, it, expect } from 'vitest'
import { canTransition } from '@/lib/domain/order-status'
import { createSeed } from './seed'
import { DEMO_STATE_VERSION, isDemoStale, migratePersisted, parseStoredJson, shiftDemoTime } from './state'

const now = new Date('2026-10-31T03:00:00Z')

describe('createSeed', () => {
  it('deterministik dan konsisten', () => {
    const a = createSeed(now)
    expect(createSeed(now)).toEqual(a)
    expect(a.orders.length).toBeGreaterThanOrEqual(25)
    expect(new Set(a.orders.map((o) => o.status)).size).toBeGreaterThanOrEqual(12)
    expect(a.orders.every((o) => a.customers.some((c) => c.id === o.customerId))).toBe(true)
    expect(new Set(a.orders.map((o) => o.orderNo)).size).toBe(a.orders.length)
    expect(a.platform.submissions.some((s) => s.status === 'AMOUNT_MISMATCH_REVIEW')).toBe(true)
  })

  it('riwayat status setiap order mengikuti transisi yang sah', () => {
    for (const order of createSeed(now).orders) {
      const statusEvents = order.history.filter((e) => e.from !== e.to)
      for (const [i, e] of statusEvents.entries()) {
        if (i === 0) continue
        const resumeTo = statusEvents[i - 1].from ?? undefined
        const check = canTransition(e.from!, e.to, { qcPassed: true, reason: e.note, resumeTo })
        expect(check, `${order.orderNo}: ${e.from} -> ${e.to}`).toEqual({ ok: true })
      }
      expect(statusEvents.at(-1)?.to).toBe(order.status)
    }
  })
})

describe('migratePersisted', () => {
  it('menolak versi lama dan data rusak', () => {
    expect(migratePersisted(createSeed(now), 0)).toBeNull()
    expect(migratePersisted({ foo: 1 }, DEMO_STATE_VERSION)).toBeNull()
    expect(migratePersisted(null, DEMO_STATE_VERSION)).toBeNull()
  })

  it('JSON rusak di localStorage dibaca sebagai kosong, bukan error', () => {
    expect(parseStoredJson('{"state":')).toBeNull()
    expect(parseStoredJson(null)).toBeNull()
    expect(parseStoredJson('{"state":{"a":1},"version":1}')).toEqual({ state: { a: 1 }, version: 1 })
  })

  it('menerima state versi sekarang', () => {
    const s = createSeed(now)
    expect(migratePersisted(s, DEMO_STATE_VERSION)).toEqual(s)
  })
})

describe('shiftDemoTime (review final)', () => {
  it('menggeser semua waktu ISO dan now tanpa mengubah data lain', () => {
    const s = createSeed(now)
    const later = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const shifted = shiftDemoTime(s, later)
    const delta = later.getTime() - now.getTime()
    expect(shifted.now).toBe(later.toISOString())
    expect(new Date(shifted.orders[0].createdAt).getTime() - new Date(s.orders[0].createdAt).getTime()).toBe(delta)
    expect(new Date(shifted.platform.audit[0].at).getTime() - new Date(s.platform.audit[0].at).getTime()).toBe(delta)
    expect(shifted.orders[0].orderNo).toBe(s.orders[0].orderNo)
    expect(shifted.customers[0].name).toBe(s.customers[0].name)
  })

  it('isDemoStale setelah lebih dari 12 jam', () => {
    const s = createSeed(now)
    expect(isDemoStale(s, new Date(now.getTime() + 11 * 3600_000))).toBe(false)
    expect(isDemoStale(s, new Date(now.getTime() + 13 * 3600_000))).toBe(true)
  })
})
