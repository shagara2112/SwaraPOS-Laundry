import { DEFAULT_ZONES, haversineKm, quoteDelivery } from '@/lib/domain/delivery-zone'
import { formatOrderNo, jakartaDateKey } from '@/lib/domain/order-number'
import { calculateTotals, estimateDueAt, lineTotal } from '@/lib/domain/pricing'
import { waEventForStatus } from '@/lib/domain/whatsapp'
import type {
  Actor,
  AuditEntry,
  Customer,
  DeliveryTask,
  HandbackType,
  IntakeType,
  Order,
  OrderPaymentMethod,
  OrderStatus,
  Outlet,
  PaymentInstruction,
  PaymentSubmission,
  Plan,
  PlatformTenant,
  Service,
  Staff,
  StatusEvent,
  SubscriptionInvoice,
  WaLog,
} from '@/lib/types'
import type { DemoState } from './state'

// Data contoh deterministik: `createSeed(now)` selalu menghasilkan state yang sama
// untuk `now` yang sama, sehingga bisa diuji. Jangan pakai Math.random atau newId di sini.

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

function prng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const OUTLETS: Outlet[] = [
  {
    id: 'o-kmg',
    code: 'KMG',
    name: 'Laundry Bersih Kilat Kemang',
    address: 'Jl. Kemang Raya No. 18, Mampang Prapatan, Jakarta Selatan',
    lat: -6.2615,
    lng: 106.8133,
    phone: '0811-2000-1801',
    hours: 'Setiap hari 07.00–21.00',
  },
  {
    id: 'o-tbt',
    code: 'TBT',
    name: 'Laundry Bersih Kilat Tebet',
    address: 'Jl. Tebet Raya No. 42, Tebet, Jakarta Selatan',
    lat: -6.2257,
    lng: 106.854,
    phone: '0811-2000-4202',
    hours: 'Senin–Sabtu 07.00–20.00',
  },
]

const SERVICES: Service[] = [
  { id: 's-kilo-reg', name: 'Cuci Kering Setrika Reguler', category: 'Kiloan', unit: 'KG', prices: { 'o-kmg': 7000, 'o-tbt': 7500 }, durationHours: 48, active: true },
  { id: 's-kilo-exp', name: 'Cuci Kering Setrika Express', category: 'Kiloan', unit: 'KG', prices: { 'o-kmg': 12000, 'o-tbt': 12500 }, durationHours: 24, active: true },
  { id: 's-setrika', name: 'Setrika Saja', category: 'Kiloan', unit: 'KG', prices: { 'o-kmg': 5000, 'o-tbt': 5500 }, durationHours: 24, active: true },
  { id: 's-kemeja', name: 'Kemeja / Blus', category: 'Satuan', unit: 'ITEM', prices: { 'o-kmg': 15000, 'o-tbt': 15000 }, durationHours: 48, active: true },
  { id: 's-bedcover', name: 'Bed Cover', category: 'Satuan', unit: 'ITEM', prices: { 'o-kmg': 35000, 'o-tbt': 37000 }, durationHours: 72, active: true },
  { id: 's-sepatu', name: 'Cuci Sepatu', category: 'Sepatu', unit: 'PAIR', prices: { 'o-kmg': 45000, 'o-tbt': 45000 }, durationHours: 72, active: true },
  { id: 's-karpet', name: 'Cuci Karpet', category: 'Karpet', unit: 'SQM', prices: { 'o-kmg': 15000, 'o-tbt': 15000 }, durationHours: 96, active: true },
  { id: 's-parfum', name: 'Parfum Premium', category: 'Add-on', unit: 'ADDON', prices: { 'o-kmg': 5000, 'o-tbt': 5000 }, durationHours: 0, active: true },
]

const CUSTOMERS: Omit<Customer, 'id' | 'createdAt'>[] = [
  { name: 'Sari Hartono', phone: '0812-3456-7890', address: 'Jl. Bangka Raya No. 12, Mampang', location: { lat: -6.255, lng: 106.818 }, notes: 'Pakaian kerja dilipat, jangan digantung.' },
  { name: 'Budi Santoso', phone: '0813-1122-3344', address: 'Jl. Kemang Timur No. 5', location: { lat: -6.268, lng: 106.821 } },
  { name: 'Ayu Lestari', phone: '0857-2233-4455', address: 'Jl. Pejaten Barat No. 21', location: { lat: -6.278, lng: 106.83 }, notes: 'Alergi pewangi kuat.' },
  { name: 'Dimas Pratama', phone: '0821-9988-7766', address: 'Jl. Cilandak KKO No. 8', location: { lat: -6.29, lng: 106.815 } },
  { name: 'Nadia Putri', phone: '0812-7788-9900', address: 'Apartemen Kemang Village Tower B, Lt. 12', location: { lat: -6.26, lng: 106.808 } },
  { name: 'Hendra Wijaya', phone: '0811-5566-7788', address: 'Jl. RS Fatmawati No. 77', location: { lat: -6.295, lng: 106.796 } },
  { name: 'Putri Ramadhani', phone: '0838-4455-6677', address: 'Jl. Harsono RM No. 30, Ragunan', location: { lat: -6.305, lng: 106.82 } },
  { name: 'Fajar Nugroho', phone: '0819-2233-1122', address: 'Jl. Lebak Bulus Raya No. 3', location: { lat: -6.3, lng: 106.775 } },
  { name: 'Maria Gunawan', phone: '0812-6677-1234', address: 'Jl. Metro Pondok Indah No. 14', location: { lat: -6.27, lng: 106.784 } },
  { name: 'Rizal Hakim', phone: '0856-7788-2211', address: 'Jl. Tebet Barat Dalam No. 9', location: { lat: -6.231, lng: 106.847 } },
  { name: 'Lina Marlina', phone: '0813-4567-8901', address: 'Jl. Casablanca Kav. 88', location: { lat: -6.224, lng: 106.842 } },
  { name: 'Yoga Aditya', phone: '0822-3344-5566', address: 'Jl. Kalibata Raya No. 50', location: { lat: -6.256, lng: 106.854 } },
  { name: 'Indah Permata', phone: '0812-9090-8080', address: 'Jl. Bintaro Utama Sektor 3', location: { lat: -6.272, lng: 106.742 } },
  { name: 'Kevin Halim', phone: '0817-6543-2109', address: 'Jl. Raya Serpong KM 7', location: { lat: -6.26, lng: 106.68 } },
  { name: 'Bu Tini (Warung Tini)', phone: '0812-34', address: 'Jl. Kemang Selatan No. 2', notes: 'Nomor WhatsApp belum lengkap, konfirmasi saat ambil.' },
]

const STAFF: Staff[] = [
  { id: 'st-rina', name: 'Rina Wulandari', role: 'OWNER', outletId: 'o-kmg', phone: '0811-2000-0001' },
  { id: 'st-dewi', name: 'Dewi Anggraini', role: 'CASHIER', outletId: 'o-kmg', phone: '0812-1000-2001' },
  { id: 'st-tono', name: 'Tono Saputra', role: 'CASHIER', outletId: 'o-tbt', phone: '0812-1000-2002' },
  { id: 'st-agus', name: 'Agus Setiawan', role: 'OPERATOR', outletId: 'o-kmg', phone: '0812-1000-3001' },
  { id: 'st-joko', name: 'Joko Purnomo', role: 'OPERATOR', outletId: 'o-tbt', phone: '0812-1000-3002' },
  { id: 'st-maya', name: 'Maya Sari', role: 'QC', outletId: 'o-kmg', phone: '0812-1000-4001' },
  { id: 'st-bayu', name: 'Bayu Firmansyah', role: 'COURIER', outletId: 'o-kmg', phone: '0812-1000-5001' },
  { id: 'st-fajar', name: 'Fajar Ramadhan', role: 'COURIER', outletId: 'o-kmg', phone: '0812-1000-5002' },
  { id: 'st-rizky', name: 'Rizky Maulana', role: 'COURIER', outletId: 'o-tbt', phone: '0812-1000-5003' },
]

type PaySpec = 'none' | 'partial' | 'full'
interface OrderSpec {
  outlet: 'o-kmg' | 'o-tbt'
  customer: number
  intake: IntakeType
  handback: HandbackType
  express: boolean
  items: [string, number][]
  status: OrderStatus
  /** Untuk ON_HOLD/ISSUE_REPORTED/CANCELLED: status sebelum pengecualian. */
  base?: OrderStatus
  reason?: string
  hoursAgo: number
  pay: PaySpec
}

const ORDER_SPECS: OrderSpec[] = [
  { outlet: 'o-kmg', customer: 0, intake: 'DROP_OFF', handback: 'SELF_PICKUP', express: false, items: [['s-kilo-reg', 4.2], ['s-parfum', 1]], status: 'IN_WASHING', hoursAgo: 5, pay: 'none' },
  { outlet: 'o-kmg', customer: 1, intake: 'WALK_IN', handback: 'SELF_PICKUP', express: true, items: [['s-kilo-exp', 3]], status: 'IN_DRYING', hoursAgo: 6, pay: 'full' },
  { outlet: 'o-kmg', customer: 2, intake: 'PICKUP', handback: 'DELIVERY', express: false, items: [['s-kilo-reg', 6.5]], status: 'REQUESTED', hoursAgo: 1, pay: 'none' },
  { outlet: 'o-kmg', customer: 3, intake: 'PICKUP', handback: 'DELIVERY', express: false, items: [['s-kemeja', 5]], status: 'PICKUP_ASSIGNED', hoursAgo: 2, pay: 'none' },
  { outlet: 'o-kmg', customer: 4, intake: 'PICKUP', handback: 'SELF_PICKUP', express: false, items: [['s-bedcover', 2]], status: 'PICKED_UP', hoursAgo: 3, pay: 'none' },
  { outlet: 'o-kmg', customer: 5, intake: 'DROP_OFF', handback: 'SELF_PICKUP', express: false, items: [['s-kilo-reg', 3.8]], status: 'RECEIVED', hoursAgo: 0.5, pay: 'none' },
  { outlet: 'o-kmg', customer: 6, intake: 'WALK_IN', handback: 'DELIVERY', express: false, items: [['s-sepatu', 2]], status: 'INSPECTED', hoursAgo: 1.5, pay: 'partial' },
  { outlet: 'o-kmg', customer: 7, intake: 'DROP_OFF', handback: 'SELF_PICKUP', express: false, items: [['s-kilo-reg', 5.1]], status: 'WEIGHED_OR_COUNTED', hoursAgo: 2.5, pay: 'none' },
  { outlet: 'o-kmg', customer: 8, intake: 'DROP_OFF', handback: 'SELF_PICKUP', express: false, items: [['s-kilo-reg', 7], ['s-parfum', 1]], status: 'IN_WASHING', hoursAgo: 26, pay: 'full' },
  { outlet: 'o-kmg', customer: 0, intake: 'DROP_OFF', handback: 'SELF_PICKUP', express: false, items: [['s-kemeja', 8]], status: 'IN_IRONING', hoursAgo: 52, pay: 'none' },
  { outlet: 'o-kmg', customer: 1, intake: 'DROP_OFF', handback: 'DELIVERY', express: false, items: [['s-kilo-reg', 4]], status: 'IN_IRONING', hoursAgo: 30, pay: 'full' },
  { outlet: 'o-kmg', customer: 4, intake: 'WALK_IN', handback: 'SELF_PICKUP', express: true, items: [['s-kilo-reg', 2.5]], status: 'IN_FINISHING', hoursAgo: 20, pay: 'none' },
  { outlet: 'o-kmg', customer: 5, intake: 'DROP_OFF', handback: 'SELF_PICKUP', express: false, items: [['s-bedcover', 1], ['s-kilo-reg', 3]], status: 'QUALITY_CHECK', hoursAgo: 40, pay: 'none' },
  { outlet: 'o-kmg', customer: 8, intake: 'PICKUP', handback: 'DELIVERY', express: false, items: [['s-kilo-reg', 5.5]], status: 'QUALITY_CHECK', hoursAgo: 44, pay: 'full' },
  { outlet: 'o-kmg', customer: 2, intake: 'DROP_OFF', handback: 'SELF_PICKUP', express: false, items: [['s-kilo-reg', 3.2]], status: 'READY_FOR_PICKUP', hoursAgo: 47, pay: 'none' },
  { outlet: 'o-kmg', customer: 3, intake: 'WALK_IN', handback: 'DELIVERY', express: false, items: [['s-kemeja', 4], ['s-parfum', 1]], status: 'READY_FOR_PICKUP', hoursAgo: 50, pay: 'full' },
  { outlet: 'o-kmg', customer: 6, intake: 'PICKUP', handback: 'DELIVERY', express: false, items: [['s-kilo-reg', 6]], status: 'OUT_FOR_DELIVERY', hoursAgo: 49, pay: 'full' },
  { outlet: 'o-kmg', customer: 7, intake: 'DROP_OFF', handback: 'DELIVERY', express: false, items: [['s-sepatu', 1]], status: 'DELIVERED', hoursAgo: 75, pay: 'full' },
  { outlet: 'o-kmg', customer: 0, intake: 'DROP_OFF', handback: 'SELF_PICKUP', express: false, items: [['s-kilo-reg', 3.6]], status: 'COMPLETED', hoursAgo: 96, pay: 'full' },
  { outlet: 'o-kmg', customer: 12, intake: 'PICKUP', handback: 'DELIVERY', express: false, items: [['s-karpet', 6]], status: 'COMPLETED', hoursAgo: 140, pay: 'full' },
  { outlet: 'o-kmg', customer: 4, intake: 'WALK_IN', handback: 'SELF_PICKUP', express: false, items: [['s-kilo-reg', 4.4]], status: 'COMPLETED', hoursAgo: 72, pay: 'full' },
  { outlet: 'o-kmg', customer: 1, intake: 'DROP_OFF', handback: 'SELF_PICKUP', express: false, items: [['s-kilo-reg', 3]], status: 'ON_HOLD', base: 'IN_DRYING', reason: 'Mesin pengering 2 sedang diperbaiki teknisi.', hoursAgo: 28, pay: 'none' },
  { outlet: 'o-kmg', customer: 8, intake: 'DROP_OFF', handback: 'SELF_PICKUP', express: false, items: [['s-kemeja', 3]], status: 'ISSUE_REPORTED', base: 'QUALITY_CHECK', reason: 'Noda tinta di kemeja putih tidak hilang setelah dua kali cuci.', hoursAgo: 46, pay: 'none' },
  { outlet: 'o-kmg', customer: 5, intake: 'PICKUP', handback: 'SELF_PICKUP', express: false, items: [['s-kilo-reg', 4]], status: 'CANCELLED', base: 'REQUESTED', reason: 'Pelanggan membatalkan sebelum dijemput.', hoursAgo: 30, pay: 'none' },
  { outlet: 'o-tbt', customer: 9, intake: 'DROP_OFF', handback: 'SELF_PICKUP', express: false, items: [['s-kilo-reg', 5]], status: 'IN_WASHING', hoursAgo: 4, pay: 'none' },
  { outlet: 'o-tbt', customer: 10, intake: 'WALK_IN', handback: 'SELF_PICKUP', express: true, items: [['s-kilo-exp', 2.8]], status: 'READY_FOR_PICKUP', hoursAgo: 18, pay: 'partial' },
  { outlet: 'o-tbt', customer: 11, intake: 'PICKUP', handback: 'DELIVERY', express: false, items: [['s-kilo-reg', 7.2]], status: 'REQUESTED', hoursAgo: 0.7, pay: 'none' },
  { outlet: 'o-tbt', customer: 9, intake: 'DROP_OFF', handback: 'SELF_PICKUP', express: false, items: [['s-kemeja', 6]], status: 'RECEIVED', hoursAgo: 1, pay: 'none' },
  { outlet: 'o-tbt', customer: 10, intake: 'DROP_OFF', handback: 'SELF_PICKUP', express: false, items: [['s-bedcover', 1]], status: 'COMPLETED', hoursAgo: 120, pay: 'full' },
  { outlet: 'o-kmg', customer: 14, intake: 'WALK_IN', handback: 'SELF_PICKUP', express: false, items: [['s-kilo-reg', 2]], status: 'IN_DRYING', hoursAgo: 8, pay: 'none' },
]

const PRODUCTION_PATH: OrderStatus[] = [
  'INSPECTED',
  'WEIGHED_OR_COUNTED',
  'IN_WASHING',
  'IN_DRYING',
  'IN_IRONING',
  'IN_FINISHING',
  'QUALITY_CHECK',
  'READY_FOR_PICKUP',
]

function fullPath(intake: IntakeType, handback: HandbackType): OrderStatus[] {
  const head: OrderStatus[] =
    intake === 'PICKUP' ? ['REQUESTED', 'PICKUP_ASSIGNED', 'PICKED_UP', 'RECEIVED'] : ['RECEIVED']
  const tail: OrderStatus[] =
    handback === 'DELIVERY' ? ['OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'] : ['COMPLETED']
  return [...head, ...PRODUCTION_PATH, ...tail]
}

function pathTo(spec: OrderSpec): OrderStatus[] {
  const path = fullPath(spec.intake, spec.handback)
  const target = spec.base ?? spec.status
  const steps = path.slice(0, path.indexOf(target) + 1)
  return spec.base ? [...steps, spec.status] : steps
}

function actorFor(status: OrderStatus, outlet: string, staff: Staff[]): Actor {
  const byRole = (role: Staff['role']) =>
    staff.find((s) => s.role === role && s.outletId === outlet) ?? staff.find((s) => s.role === role)!
  const pick = (s: Staff): Actor => ({ id: s.id, name: s.name })
  switch (status) {
    case 'PICKUP_ASSIGNED':
    case 'RECEIVED':
    case 'INSPECTED':
    case 'WEIGHED_OR_COUNTED':
    case 'REQUESTED':
    case 'CANCELLED':
    case 'COMPLETED':
      return pick(byRole('CASHIER'))
    case 'PICKED_UP':
    case 'OUT_FOR_DELIVERY':
    case 'DELIVERED':
      return pick(byRole('COURIER'))
    case 'QUALITY_CHECK':
    case 'READY_FOR_PICKUP':
    case 'ISSUE_REPORTED':
      return pick(byRole('QC'))
    default:
      return pick(byRole('OPERATOR'))
  }
}

const PAY_METHODS: OrderPaymentMethod[] = ['CASH', 'QRIS', 'TRANSFER']

export function createSeed(now: Date): DemoState {
  const rand = prng(20261031)
  const nowMs = now.getTime()
  const iso = (ms: number) => new Date(ms).toISOString()
  const token = () =>
    Array.from({ length: 12 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(rand() * 36)]).join('')

  const customers: Customer[] = CUSTOMERS.map((c, i) => ({
    ...c,
    id: `cus-${String(i + 1).padStart(2, '0')}`,
    createdAt: iso(nowMs - (90 - i * 5) * DAY),
  }))

  const orders: Order[] = []
  const deliveryTasks: DeliveryTask[] = []
  const seqByDay = new Map<string, number>()

  // Nomor urut harian mengikuti waktu masuk, jadi proses dari yang paling lama.
  const specs = ORDER_SPECS.map((spec, i) => ({ spec, i })).sort((a, b) => b.spec.hoursAgo - a.spec.hoursAgo)

  for (const { spec, i } of specs) {
    const id = `ord-${String(i + 1).padStart(2, '0')}`
    const outlet = OUTLETS.find((o) => o.id === spec.outlet)!
    const customer = customers[spec.customer]
    const createdMs = nowMs - spec.hoursAgo * HOUR
    const created = new Date(createdMs)

    const dayKey = `${outlet.id}:${jakartaDateKey(created)}`
    const seq = (seqByDay.get(dayKey) ?? 0) + 1
    seqByDay.set(dayKey, seq)

    const distanceKm = customer.location
      ? Math.round(haversineKm(outlet, customer.location) * 10) / 10
      : 0
    const quote = quoteDelivery(distanceKm, DEFAULT_ZONES)
    const zoneFee = (kind: 'pickupFee' | 'deliveryFee') => (quote.status === 'OK' ? quote[kind] : 20000)

    const services = spec.items.map(([sid]) => SERVICES.find((s) => s.id === sid)!)
    const items = spec.items.map(([, qty], idx) => {
      const svc = services[idx]
      const unitPrice = svc.prices[outlet.id]
      return {
        id: `${id}-i${idx + 1}`,
        serviceId: svc.id,
        name: svc.name,
        unit: svc.unit,
        qty,
        unitPrice,
        total: lineTotal({ unit: svc.unit, unitPrice, qty }),
      }
    })
    const totals = calculateTotals({
      lines: items,
      express: spec.express,
      expressSurchargePct: 50,
      pickupFee: spec.intake === 'PICKUP' ? zoneFee('pickupFee') : 0,
      deliveryFee: spec.handback === 'DELIVERY' ? zoneFee('deliveryFee') : 0,
    })

    // Event tersebar dari waktu masuk sampai mendekati sekarang.
    const path = pathTo(spec)
    const span = spec.hoursAgo * HOUR * 0.85
    const history: StatusEvent[] = []
    const eventMs: number[] = []
    let qcPassed = false
    path.forEach((status, idx) => {
      const at = createdMs + (path.length > 1 ? (idx / (path.length - 1)) * span : 0)
      eventMs.push(at)
      if (status === 'READY_FOR_PICKUP') {
        history.push({
          id: `${id}-h${history.length + 1}`,
          from: 'QUALITY_CHECK',
          to: 'QUALITY_CHECK',
          actor: actorFor('QUALITY_CHECK', outlet.id, STAFF),
          at: iso(at - 10 * 60 * 1000),
          note: 'QC lulus: bersih, kering, wangi, lipat rapi, jumlah item cocok',
        })
        qcPassed = true
      }
      const isException = status === spec.status && spec.base !== undefined
      history.push({
        id: `${id}-h${history.length + 1}`,
        from: idx === 0 ? null : path[idx - 1],
        to: status,
        actor: actorFor(status, outlet.id, STAFF),
        at: iso(at),
        note: idx === 0 ? 'Order dibuat di kasir' : isException ? spec.reason : undefined,
      })
    })
    if (spec.status === 'QUALITY_CHECK') qcPassed = false

    const events: WaLog[] = []
    path.forEach((status, idx) => {
      const event = waEventForStatus(status)
      if (!event || events.some((l) => l.event === event)) return
      events.push({ id: `${id}-wa${events.length + 1}`, event, state: 'SENT', updatedAt: iso(eventMs[idx] + 5 * 60 * 1000), actor: actorFor('RECEIVED', outlet.id, STAFF) })
    })
    if (events.length > 0 && (i % 3 === 0 || spec.customer === 14)) {
      const last = events[events.length - 1]
      events[events.length - 1] = { id: last.id, event: last.event, state: 'NOT_SENT' }
    }

    const payments =
      spec.pay === 'none'
        ? []
        : [
            {
              id: `${id}-p1`,
              method: PAY_METHODS[i % PAY_METHODS.length],
              amount: spec.pay === 'full' ? totals.total : Math.round(totals.total / 2 / 1000) * 1000,
              at: iso(createdMs + 15 * 60 * 1000),
              actor: actorFor('RECEIVED', outlet.id, STAFF),
            },
          ]

    orders.push({
      id,
      orderNo: formatOrderNo(outlet.code, created, seq),
      trackingToken: token(),
      outletId: outlet.id,
      customerId: customer.id,
      channel: spec.intake === 'PICKUP' && i % 2 === 0 ? 'WHATSAPP' : 'CASHIER',
      intake: spec.intake,
      handback: spec.handback,
      express: spec.express,
      status: spec.status,
      items,
      totals,
      conditionNotes: i % 4 === 0 ? ['Noda'] : i % 5 === 0 ? ['Bahan sensitif'] : [],
      qcPassed,
      paymentStatus: spec.pay === 'full' ? 'PAID' : spec.pay === 'partial' ? 'PARTIAL' : 'UNPAID',
      payments,
      history,
      whatsapp: events,
      dueAt: estimateDueAt(created, services.map((s) => s.durationHours), spec.express).toISOString(),
      createdAt: iso(createdMs),
      version: history.length,
    })

    const couriers = STAFF.filter((s) => s.role === 'COURIER' && s.outletId === outlet.id)
    const courierId = couriers[i % couriers.length].id
    const reached = (status: OrderStatus) => path.includes(status)
    const timeOf = (status: OrderStatus) => eventMs[path.indexOf(status)]

    if (spec.intake === 'PICKUP') {
      const done = reached('PICKED_UP')
      deliveryTasks.push({
        id: `task-${id}-pu`,
        orderId: id,
        type: 'PICKUP',
        courierId: reached('PICKUP_ASSIGNED') ? courierId : undefined,
        status: spec.status === 'CANCELLED' ? 'FAILED' : done ? 'DONE' : reached('PICKUP_ASSIGNED') ? 'ASSIGNED' : 'UNASSIGNED',
        scheduledAt: iso(createdMs + HOUR),
        address: customer.address ?? '-',
        distanceKm,
        fee: totals.pickupFee,
        proof: done ? { receiverName: customer.name, method: 'PHOTO', at: iso(timeOf('PICKED_UP')) } : undefined,
        failReason: spec.status === 'CANCELLED' ? spec.reason : undefined,
      })
    }
    if (spec.handback === 'DELIVERY' && reached('OUT_FOR_DELIVERY')) {
      const done = reached('DELIVERED')
      deliveryTasks.push({
        id: `task-${id}-dl`,
        orderId: id,
        type: 'DELIVERY',
        courierId,
        status: done ? 'DONE' : 'ON_THE_WAY',
        scheduledAt: iso(timeOf('OUT_FOR_DELIVERY')),
        address: customer.address ?? '-',
        distanceKm,
        fee: totals.deliveryFee,
        proof: done ? { receiverName: customer.name, method: 'SIGNATURE', at: iso(timeOf('DELIVERED')) } : undefined,
      })
    }
  }

  orders.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  return {
    now: now.toISOString(),
    tenantActor: { id: 'st-rina', name: 'Rina Wulandari' },
    adminActor: { id: 'pa-1', name: 'Sinta (Finance)' },
    tenant: { id: 't1', name: 'Laundry Bersih Kilat', expressSurchargePct: 50 },
    outlets: OUTLETS,
    activeOutletId: 'o-kmg',
    customers,
    services: SERVICES,
    staff: STAFF,
    orders,
    deliveryTasks,
    zones: DEFAULT_ZONES,
    outletPaymentMethods: [
      { id: 'pm-cash', type: 'CASH', label: 'Tunai', detail: 'Bayar langsung di kasir outlet.' },
      { id: 'pm-bca', type: 'TRANSFER', label: 'Transfer BCA', detail: 'BCA 731 045 6789 a.n. Rina Wulandari' },
      { id: 'pm-qris', type: 'QRIS', label: 'QRIS Laundry Bersih Kilat', detail: 'Scan QRIS di kasir atau minta lewat WhatsApp outlet.' },
    ],
    platform: createPlatform(nowMs),
  }
}

function createPlatform(nowMs: number): DemoState['platform'] {
  const iso = (ms: number) => new Date(ms).toISOString()
  const owner: Actor = { id: 'pa-0', name: 'Arif (Platform Owner)' }
  const finance: Actor = { id: 'pa-1', name: 'Sinta (Finance)' }

  const plans: Plan[] = [
    {
      code: 'BASIC',
      name: 'Basic',
      pricePerOutletMonth: 149000,
      limits: { ordersPerMonth: 1500, staff: 5 },
      features: ['Order & kasir', 'Produksi & QC', 'Pickup & delivery', 'Lacak pelanggan', 'WhatsApp manual', 'Laporan dasar'],
    },
    {
      code: 'PRO',
      name: 'Pro',
      pricePerOutletMonth: 299000,
      limits: { ordersPerMonth: 6000, staff: 25 },
      features: ['Order & kasir', 'Produksi & QC', 'Pickup & delivery', 'Lacak pelanggan', 'WhatsApp manual', 'Laporan dasar', 'Laporan lanjutan & export', 'Multi-outlet', 'Pengingat otomatis'],
    },
  ]

  const tenants: PlatformTenant[] = [
    { id: 't1', name: 'Laundry Bersih Kilat', slug: 'bersih-kilat', ownerName: 'Rina Wulandari', ownerPhone: '0811-2000-0001', city: 'Jakarta Selatan', status: 'ACTIVE', plan: 'PRO', outletCount: 2, userCount: 9, ordersThisMonth: 412, createdAt: iso(nowMs - 160 * DAY), supportNotes: ['Pilot batch 1. Minta template WA versi bahasa santai.'] },
    { id: 't2', name: 'Wangi Express Laundry', slug: 'wangi-express', ownerName: 'Asep Kurniawan', ownerPhone: '0822-7000-1122', city: 'Bandung', status: 'TRIAL', plan: 'BASIC', outletCount: 1, userCount: 3, ordersThisMonth: 58, createdAt: iso(nowMs - 5 * DAY), trialEndsAt: iso(nowMs + 9 * DAY), supportNotes: [] },
    { id: 't3', name: 'Kucek Kilat', slug: 'kucek-kilat', ownerName: 'Wahyu Hidayat', ownerPhone: '0813-8800-4455', city: 'Surabaya', status: 'PAST_DUE', plan: 'BASIC', outletCount: 1, userCount: 4, ordersThisMonth: 201, createdAt: iso(nowMs - 98 * DAY), supportNotes: ['Bayar via QRIS, sering selisih biaya admin.'] },
    { id: 't4', name: 'Rumah Cuci Ibu Ani', slug: 'rumah-cuci-ani', ownerName: 'Ani Suryani', ownerPhone: '0857-1200-3344', city: 'Depok', status: 'ACTIVE', plan: 'BASIC', outletCount: 1, userCount: 2, ordersThisMonth: 133, createdAt: iso(nowMs - 64 * DAY), supportNotes: [] },
    { id: 't5', name: 'Clean & Go Laundry', slug: 'clean-and-go', ownerName: 'Bagas Prasetyo', ownerPhone: '0812-5500-6677', city: 'Yogyakarta', status: 'ACTIVE', plan: 'PRO', outletCount: 3, userCount: 14, ordersThisMonth: 988, createdAt: iso(nowMs - 210 * DAY), supportNotes: ['Rencana tambah outlet ke-4 bulan depan.'] },
    { id: 't6', name: 'Laundry Sahabat', slug: 'laundry-sahabat', ownerName: 'Rudi Siregar', ownerPhone: '0821-3300-9988', city: 'Medan', status: 'SUSPENDED', plan: 'BASIC', outletCount: 1, userCount: 3, ordersThisMonth: 0, createdAt: iso(nowMs - 150 * DAY), supportNotes: ['Disuspend karena tunggakan 2 periode.'] },
  ]

  const invoices: SubscriptionInvoice[] = [
    { id: 'inv-t1-10', tenantId: 't1', number: 'INV-2026-10-0001', period: 'Oktober 2026', amount: 598000, status: 'PAID', dueAt: iso(nowMs - 25 * DAY), paidAt: iso(nowMs - 27 * DAY) },
    { id: 'inv-t1-11', tenantId: 't1', number: 'INV-2026-11-0001', period: 'November 2026', amount: 598000, status: 'UNPAID', dueAt: iso(nowMs + 5 * DAY) },
    { id: 'inv-t3-10', tenantId: 't3', number: 'INV-2026-10-0003', period: 'Oktober 2026', amount: 149000, status: 'UNDER_REVIEW', dueAt: iso(nowMs - 6 * DAY) },
    { id: 'inv-t4-11', tenantId: 't4', number: 'INV-2026-11-0004', period: 'November 2026', amount: 149000, status: 'UNDER_REVIEW', dueAt: iso(nowMs + 5 * DAY) },
    { id: 'inv-t5-10', tenantId: 't5', number: 'INV-2026-10-0005', period: 'Oktober 2026', amount: 897000, status: 'PAID', dueAt: iso(nowMs - 25 * DAY), paidAt: iso(nowMs - 26 * DAY) },
    { id: 'inv-t5-11', tenantId: 't5', number: 'INV-2026-11-0005', period: 'November 2026', amount: 897000, status: 'UNPAID', dueAt: iso(nowMs + 5 * DAY) },
    { id: 'inv-t6-09', tenantId: 't6', number: 'INV-2026-09-0006', period: 'September 2026', amount: 149000, status: 'OVERDUE', dueAt: iso(nowMs - 55 * DAY) },
  ]

  const instructions: PaymentInstruction[] = [
    { id: 'pi-bca', method: 'TRANSFER', label: 'Transfer BCA', bankName: 'BCA', accountName: 'SwaraPOS Indonesia (contoh)', accountNumber: '527 088 1234', instructions: 'Transfer sesuai nominal tagihan, lalu unggah bukti transfer di halaman ini.', sortOrder: 1, active: true },
    { id: 'pi-mandiri', method: 'TRANSFER', label: 'Transfer Mandiri', bankName: 'Mandiri', accountName: 'SwaraPOS Indonesia (contoh)', accountNumber: '124 000 9876 543', instructions: 'Cantumkan nomor invoice di berita transfer.', sortOrder: 2, active: true },
    { id: 'pi-link', method: 'LINK', label: 'Bayar lewat link pembayaran', paymentUrl: 'https://example.com/bayar/swarapos', instructions: 'Buka link, selesaikan pembayaran, lalu unggah bukti dari email konfirmasi.', sortOrder: 3, active: true },
    { id: 'pi-qris', method: 'QRIS', label: 'QRIS SwaraPOS', merchantName: 'SWARAPOS LAUNDRY', instructions: 'Scan QRIS dengan aplikasi bank atau e-wallet, lalu unggah tangkapan layar bukti bayar.', sortOrder: 4, active: true },
    { id: 'pi-bri', method: 'TRANSFER', label: 'Transfer BRI', bankName: 'BRI', accountName: 'SwaraPOS Indonesia (contoh)', accountNumber: '0341 01 000123 30 1', instructions: 'Rekening lama, tidak dipakai lagi.', sortOrder: 5, active: false },
  ]

  const submissions: PaymentSubmission[] = [
    { id: 'sub-t5-10', invoiceId: 'inv-t5-10', tenantId: 't5', instructionId: 'pi-bca', method: 'TRANSFER', amountClaimed: 897000, status: 'APPROVED', submittedAt: iso(nowMs - 27 * DAY), submittedBy: { id: 'u-bagas', name: 'Bagas Prasetyo' }, proof: { fileName: 'transfer-bca-oktober.jpg', fileType: 'image/jpeg', fileSize: 412_000 }, reviewedBy: finance, reviewedAt: iso(nowMs - 26 * DAY), reviewNote: 'Cocok dengan mutasi BCA.' },
    { id: 'sub-t3-10', invoiceId: 'inv-t3-10', tenantId: 't3', instructionId: 'pi-qris', method: 'QRIS', amountClaimed: 145000, note: 'Dipotong biaya admin e-wallet.', status: 'AMOUNT_MISMATCH_REVIEW', submittedAt: iso(nowMs - 1 * DAY), submittedBy: { id: 'u-wahyu', name: 'Wahyu Hidayat' }, proof: { fileName: 'qris-kucek-kilat.png', fileType: 'image/png', fileSize: 256_000 } },
    { id: 'sub-t4-11', invoiceId: 'inv-t4-11', tenantId: 't4', instructionId: 'pi-mandiri', method: 'TRANSFER', amountClaimed: 149000, status: 'UNDER_REVIEW', submittedAt: iso(nowMs - 3 * HOUR), submittedBy: { id: 'u-ani', name: 'Ani Suryani' }, proof: { fileName: 'bukti-transfer-mandiri.pdf', fileType: 'application/pdf', fileSize: 188_000 } },
  ]

  const audit: AuditEntry[] = [
    { id: 'aud-seed-1', at: iso(nowMs - 40 * DAY), actor: owner, action: 'plan.updated', entity: 'plan', entityId: 'PRO', detail: 'Limit order Pro dinaikkan menjadi 6.000/bulan.' },
    { id: 'aud-seed-2', at: iso(nowMs - 26 * DAY), actor: finance, action: 'subscription.payment_approved', tenantId: 't5', entity: 'payment_submission', entityId: 'sub-t5-10', detail: 'INV-2026-10-0005 disetujui. Cocok dengan mutasi BCA.' },
    { id: 'aud-seed-3', at: iso(nowMs - 20 * DAY), actor: owner, action: 'tenant.suspended', tenantId: 't6', entity: 'tenant', entityId: 't6', detail: 'Tunggakan 2 periode tanpa respons.' },
    { id: 'aud-seed-4', at: iso(nowMs - 9 * DAY), actor: { id: 'st-rina', name: 'Rina Wulandari' }, action: 'service.price_changed', tenantId: 't1', entity: 'service', entityId: 's-kilo-reg', detail: 'Kemang: Rp6.500 → Rp7.000 per kg.' },
    { id: 'aud-seed-5', at: iso(nowMs - 1 * DAY), actor: { id: 'u-wahyu', name: 'Wahyu Hidayat' }, action: 'subscription.proof_uploaded', tenantId: 't3', entity: 'payment_submission', entityId: 'sub-t3-10', detail: 'INV-2026-10-0003: klaim Rp145.000 (tagihan Rp149.000).' },
    { id: 'aud-seed-6', at: iso(nowMs - 3 * HOUR), actor: { id: 'u-ani', name: 'Ani Suryani' }, action: 'subscription.proof_uploaded', tenantId: 't4', entity: 'payment_submission', entityId: 'sub-t4-11', detail: 'INV-2026-11-0004: klaim Rp149.000.' },
  ]

  return {
    tenants,
    plans,
    invoices,
    instructions,
    submissions,
    audit,
    health: [
      { name: 'API', status: 'UP', latencyMs: 118 },
      { name: 'Database', status: 'UP', latencyMs: 17 },
      { name: 'Worker & antrean', status: 'DEGRADED', latencyMs: 342, note: 'Backlog outbox 42 event' },
      { name: 'Object storage', status: 'UP', latencyMs: 94 },
      { name: 'Telegram Bot', status: 'UP', latencyMs: 211 },
      { name: 'Geocoding', status: 'UP', latencyMs: 163 },
    ],
  }
}
