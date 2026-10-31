import { haversineKm, quoteDelivery, type ZoneQuote } from './domain/delivery-zone'
import { calculateTotals, estimateDueAt, lineTotal } from './domain/pricing'
import { parseDecimalID, parseRupiahID } from './format'
import { newId } from './ids'
import { formatLineDetail } from './labels'
import type { NewOrderInput } from './store/actions-order'
import type { Customer, DeliveryZone, HandbackType, IntakeType, OrderTotals, Outlet, Service } from './types'

export type DraftLine = { key: string; serviceId: string; qtyText: string }

/** Draf order kasir; disimpan lokal supaya tidak hilang saat koneksi/aplikasi terputus. */
export type OrderDraft = {
  customerId: string | null
  intake: IntakeType
  handback: HandbackType
  lines: DraftLine[]
  addons: string[]
  express: boolean
  conditions: string[]
  manualKm: string
  /** Kunci idempotensi draf: simpan ganda (double-tap, Ctrl+Enter) tetap satu order. */
  key: string
}

export function emptyDraft(): OrderDraft {
  return {
    customerId: null,
    intake: 'DROP_OFF',
    handback: 'SELF_PICKUP',
    lines: [],
    addons: [],
    express: false,
    conditions: [],
    manualKm: '',
    key: newId('draft'),
  }
}

export type DraftSummary = {
  valid: { svc: Service; qty: number }[]
  legs: { pickup: boolean; delivery: boolean }
  needsLogistics: boolean
  distanceKm: number | null
  quote: ZoneQuote | null
  totals: OrderTotals
  dueAt: Date | null
  blockers: string[]
  summaryLines: { label: string; detail: string; total: number }[]
}

/** Hitung harga, zona, estimasi, dan alasan yang masih memblokir simpan dari draf kasir. */
export function summarizeDraft(input: {
  draft: OrderDraft
  customer: Customer | undefined
  outlet: Outlet
  services: Service[]
  zones: DeliveryZone[]
  expressPct: number
  outsideZone: { confirmed: boolean; feeText: string }
  now: Date
}): DraftSummary {
  const { draft, customer, outlet, zones, outsideZone } = input
  const byId = new Map(input.services.map((svc) => [svc.id, svc]))

  const parsed = draft.lines.map((line) => ({ line, svc: byId.get(line.serviceId), qty: parseDecimalID(line.qtyText) }))
  const mainLines = parsed.filter((p): p is { line: DraftLine; svc: Service; qty: number } => !!p.svc && !!p.qty && p.qty > 0)
  const valid = [...mainLines.map(({ svc, qty }) => ({ svc, qty })), ...draft.addons.flatMap((id) => (byId.has(id) ? [{ svc: byId.get(id)!, qty: 1 }] : []))]
  const invalidLines = parsed.some((p) => !(p.qty && p.qty > 0))

  const legs = { pickup: draft.intake === 'PICKUP', delivery: draft.handback === 'DELIVERY' }
  const needsLogistics = legs.pickup || legs.delivery
  const distanceKm = customer?.location ? Math.round(haversineKm(outlet, customer.location) * 10) / 10 : parseDecimalID(draft.manualKm)
  const quote = needsLogistics && distanceKm !== null ? quoteDelivery(distanceKm, zones) : null
  const manualFee = parseRupiahID(outsideZone.feeText) ?? 0
  const legFee = (kind: 'pickupFee' | 'deliveryFee') => (quote?.status === 'OK' ? quote[kind] : quote?.status === 'NEEDS_CONFIRMATION' ? manualFee : 0)

  const price = (svc: Service) => svc.prices[outlet.id] ?? 0
  const totals = calculateTotals({
    lines: valid.map((v) => ({ unit: v.svc.unit, unitPrice: price(v.svc), qty: v.qty })),
    express: draft.express,
    expressSurchargePct: input.expressPct,
    pickupFee: legs.pickup ? legFee('pickupFee') : 0,
    deliveryFee: legs.delivery ? legFee('deliveryFee') : 0,
  })
  const dueAt = mainLines.length > 0 ? estimateDueAt(input.now, valid.map((v) => v.svc.durationHours), draft.express) : null

  const blockers: string[] = []
  if (!customer) blockers.push('Pilih atau tambah pelanggan')
  if (mainLines.length === 0) blockers.push('Tambah minimal satu layanan utama')
  if (invalidLines) blockers.push('Lengkapi berat/jumlah setiap layanan')
  if (customer && needsLogistics && !customer.address) blockers.push('Alamat pelanggan wajib untuk jemput/antar')
  if (needsLogistics && distanceKm === null) blockers.push('Isi jarak dari outlet')
  if (quote?.status === 'NEEDS_CONFIRMATION' && (!outsideZone.confirmed || !(manualFee > 0))) blockers.push('Konfirmasi area di luar zona & isi biaya')

  const summaryLines = valid.map((v) => ({
    label: v.svc.name,
    detail: formatLineDetail(v.svc.unit, v.qty, price(v.svc)),
    total: lineTotal({ unit: v.svc.unit, unitPrice: price(v.svc), qty: v.qty }),
  }))

  return { valid, legs, needsLogistics, distanceKm, quote, totals, dueAt, blockers, summaryLines }
}

/** Input createOrder dari draf yang sudah lolos `summarizeDraft` (blockers kosong). */
export function orderInputFromDraft(draft: OrderDraft, summary: DraftSummary, outletId: string): NewOrderInput {
  return {
    outletId,
    customerId: draft.customerId ?? '',
    intake: draft.intake,
    handback: draft.handback,
    express: draft.express,
    items: summary.valid.map((v) => ({ serviceId: v.svc.id, qty: v.qty })),
    conditionNotes: draft.conditions,
    pickupFee: summary.totals.pickupFee,
    deliveryFee: summary.totals.deliveryFee,
    distanceKm: summary.distanceKm ?? undefined,
    idempotencyKey: draft.key,
  }
}
