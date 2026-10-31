import { describe, it, expect } from 'vitest'
import { courierTasks, isRelevantTask } from './delivery'
import { assignCourier } from './store/actions-catalog'
import { createSeed } from './store/seed'
import type { ActionResult, DemoState } from './store/state'

const now = new Date('2026-10-31T03:00:00Z')
const s0 = createSeed(now)
const actor = { id: 'st-rina', name: 'Rina Wulandari' }
const orderOf = (s: DemoState, id: string) => s.orders.find((o) => o.id === id)

function ok<T>(r: ActionResult<T>): DemoState {
  if (!r.ok) throw new Error(r.error)
  return r.state
}

describe('isRelevantTask', () => {
  it('tugas jemput order batal tidak relevan', () => {
    const cancelled = s0.orders.find((o) => o.status === 'CANCELLED')!
    const task = s0.deliveryTasks.find((t) => t.orderId === cancelled.id)!
    expect(isRelevantTask(task, cancelled)).toBe(false)
  })

  it('tugas antar order yang sedang diantar relevan, tugas jemput order menunggu jemput relevan', () => {
    const out = s0.orders.find((o) => o.status === 'OUT_FOR_DELIVERY')!
    expect(isRelevantTask(s0.deliveryTasks.find((t) => t.orderId === out.id && t.type === 'DELIVERY')!, out)).toBe(true)
    const requested = s0.orders.find((o) => o.status === 'REQUESTED')!
    expect(isRelevantTask(s0.deliveryTasks.find((t) => t.orderId === requested.id)!, requested)).toBe(true)
  })

  it('tanpa order tidak relevan', () => {
    expect(isRelevantTask(s0.deliveryTasks[0], undefined)).toBe(false)
  })
})

describe('courierTasks', () => {
  it('hanya tugas milik kurir itu, aktif dipisah dari riwayat', () => {
    const requested = s0.orders.find((o) => o.status === 'REQUESTED' && o.outletId === 'o-kmg')!
    const task = s0.deliveryTasks.find((t) => t.orderId === requested.id)!
    const s1 = ok(assignCourier(s0, task.id, 'st-bayu', actor, now))
    const { active, history } = courierTasks(s1, 'st-bayu')
    expect(active.some((t) => t.id === task.id)).toBe(true)
    expect(active.every((t) => t.courierId === 'st-bayu' && t.status !== 'DONE' && t.status !== 'FAILED')).toBe(true)
    expect(active.every((t) => isRelevantTask(t, orderOf(s1, t.orderId)))).toBe(true)
    expect(history.every((t) => t.courierId === 'st-bayu' && (t.status === 'DONE' || t.status === 'FAILED'))).toBe(true)
    expect(history.length).toBeGreaterThan(0)
    expect(courierTasks(s1, 'st-rizky').active.some((t) => t.id === task.id)).toBe(false)
  })
})
