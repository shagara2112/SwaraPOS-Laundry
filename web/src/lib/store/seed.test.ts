import { describe, it, expect } from 'vitest'
import { canTransition } from '@/lib/domain/order-status'
import { createSeed } from './seed'
import { DEMO_STATE_VERSION, migratePersisted, parseStoredJson } from './state'

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
