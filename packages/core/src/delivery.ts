import type { DemoState } from './store/state'
import type { DeliveryTask, Order } from './types'

/** Tugas kurir relevan selama order memang menunggu leg itu (bukan batal, ditahan, atau sudah lewat). */
export function isRelevantTask(task: DeliveryTask, order: Order | undefined): boolean {
  if (!order) return false
  return task.type === 'PICKUP'
    ? order.status === 'REQUESTED' || order.status === 'PICKUP_ASSIGNED'
    : order.status === 'OUT_FOR_DELIVERY'
}

/** Tugas milik satu kurir: aktif (masih berjalan dan relevan) dan riwayat (selesai/gagal, terbaru dulu). */
export function courierTasks(s: DemoState, courierId: string): { active: DeliveryTask[]; history: DeliveryTask[] } {
  const orderById = new Map(s.orders.map((o) => [o.id, o]))
  const mine = s.deliveryTasks.filter((t) => t.courierId === courierId)
  const done = (t: DeliveryTask) => t.status === 'DONE' || t.status === 'FAILED'
  return {
    active: mine.filter((t) => !done(t) && isRelevantTask(t, orderById.get(t.orderId))).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    history: mine.filter(done).sort((a, b) => (b.proof?.at ?? b.scheduledAt).localeCompare(a.proof?.at ?? a.scheduledAt)),
  }
}
