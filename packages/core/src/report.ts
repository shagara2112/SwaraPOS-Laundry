import { inRange, type DateRange } from './date-range'
import { jakartaDateKey } from './domain/order-number'
import { formatDate } from './format'
import { CHANNEL_LABEL } from './labels'
import { PRODUCTION_COLUMNS } from './production'
import { amountDue } from './selectors'
import type { Order, Service } from './types'

export type Datum = { label: string; value: number; hint?: string }

export type Report = {
  /** Order di rentang dan outlet terpilih, tanpa yang batal. */
  orders: Order[]
  count: number
  total: number
  /** Total diskon order di rentang. */
  discount: number
  average: number
  unpaid: number
  days: Datum[]
  byService: Datum[]
  byChannel: Datum[]
  byStage: Datum[]
  active: number
  newCustomers: number
  repeat: number
}

const DAY = 24 * 60 * 60 * 1000

/** Laporan nilai order untuk web dan aplikasi Android: harian, per layanan, per kanal, tahap produksi, dan pelanggan. */
export function buildReport(
  s: { orders: Order[]; services: Service[] },
  opts: { range: DateRange; outletId: string | 'all'; now: Date },
): Report {
  const { range, outletId, now } = opts
  const scoped = s.orders.filter((o) => outletId === 'all' || o.outletId === outletId)
  const orders = scoped.filter((o) => o.status !== 'CANCELLED' && inRange(o.createdAt, range))
  const total = orders.reduce((sum, o) => sum + o.totals.total, 0)

  // Satu batang per hari WIB, berhenti di hari ini untuk rentang yang menjangkau masa depan.
  const lastDay = Math.min(range.to, now.getTime() + DAY)
  const days: Datum[] = []
  for (let t = range.from; t < lastDay; t += DAY) {
    const key = jakartaDateKey(new Date(t))
    days.push({
      label: formatDate(new Date(t).toISOString()).replace(/ \d{4}$/, ''),
      value: orders.filter((o) => jakartaDateKey(new Date(o.createdAt)) === key).reduce((sum, o) => sum + o.totals.total, 0),
    })
  }

  const byService: Datum[] = s.services
    .map((svc) => ({ label: svc.name, value: orders.flatMap((o) => o.items).filter((i) => i.serviceId === svc.id).reduce((sum, i) => sum + i.total, 0) }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  const byChannel: Datum[] = (Object.keys(CHANNEL_LABEL) as (keyof typeof CHANNEL_LABEL)[]).map((ch) => {
    const list = orders.filter((o) => o.channel === ch)
    return { label: CHANNEL_LABEL[ch], value: list.reduce((sum, o) => sum + o.totals.total, 0), hint: `${list.length} order` }
  })

  const stageEvents = scoped.flatMap((o) => o.history).filter((e) => e.from !== e.to && inRange(e.at, range))
  const byStage: Datum[] = PRODUCTION_COLUMNS.map((c) => ({ label: c.label, value: stageEvents.filter((e) => c.statuses.includes(e.to)).length }))

  const activeIds = new Set(orders.map((o) => o.customerId))
  const firstOrder = new Map<string, number>()
  const orderCount = new Map<string, number>()
  for (const o of scoped) {
    const t = new Date(o.createdAt).getTime()
    firstOrder.set(o.customerId, Math.min(firstOrder.get(o.customerId) ?? Infinity, t))
    orderCount.set(o.customerId, (orderCount.get(o.customerId) ?? 0) + 1)
  }

  return {
    orders,
    count: orders.length,
    total,
    discount: orders.reduce((sum, o) => sum + (o.totals.discount ?? 0), 0),
    average: orders.length ? Math.round(total / orders.length) : 0,
    unpaid: orders.reduce((sum, o) => sum + amountDue(o), 0),
    days,
    byService,
    byChannel,
    byStage,
    active: activeIds.size,
    newCustomers: [...activeIds].filter((id) => (firstOrder.get(id) ?? 0) >= range.from).length,
    repeat: [...activeIds].filter((id) => (orderCount.get(id) ?? 0) >= 2).length,
  }
}
