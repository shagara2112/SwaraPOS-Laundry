import { jakartaDateKey } from './domain/order-number'
import { normalizePhoneID } from './domain/whatsapp'
import { wibDayStart } from './date-range'
import { addCustomer } from './store/actions-catalog'
import { createOrder } from './store/actions-order'
import { fail, type ActionResult, type DemoState } from './store/state'
import type { Actor, HandbackType, Order } from './types'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
/** Jam mulai slot jemput (WIB), masing-masing 2 jam. */
const SLOT_HOURS = [8, 10, 13, 15, 17]
const MAX_ACTIVE_REQUESTS = 3
const PUBLIC_ACTOR: Actor = { id: 'public-link', name: 'Pelanggan (link)' }

const pad = (h: number) => `${String(h).padStart(2, '0')}.00`

export type PickupSlot = { day: 'Hari ini' | 'Besok'; label: string; start: string }

/** Slot jemput hari ini (yang mulai minimal 1 jam lagi) dan besok, menurut jam WIB. */
export function pickupSlots(now: Date): PickupSlot[] {
  const today = wibDayStart(jakartaDateKey(now))
  return (['Hari ini', 'Besok'] as const).flatMap((day, d) =>
    SLOT_HOURS.map((h) => ({ day, label: `${pad(h)}–${pad(h + 2)}`, startMs: today + d * DAY + h * HOUR }))
      .filter((s) => s.startMs >= now.getTime() + HOUR)
      .map(({ day: dd, label, startMs }) => ({ day: dd, label, start: new Date(startMs).toISOString() })),
  )
}

/** Slug laundry untuk link publik (mis. `bersih-kilat`). */
export function tenantSlug(s: DemoState): string | undefined {
  return s.platform.tenants.find((t) => t.id === s.tenant.id)?.slug
}

export type PickupRequestInput = {
  slug: string
  outletId: string
  name: string
  phone: string
  address: string
  locationNote?: string
  zoneId: string
  pickupAt: string
  handback: HandbackType
  serviceNote?: string
}

/**
 * Permintaan jemput dari link publik pelanggan: pelanggan dibuat/dipakai ulang berdasarkan nomor WhatsApp,
 * order tercatat sebagai "Permintaan masuk" tanpa item (diisi saat ditimbang), biaya jemput/antar dari zona pilihan.
 */
export function createPickupRequest(s: DemoState, input: PickupRequestInput, now: Date): ActionResult<Order> {
  if (input.slug !== tenantSlug(s)) return fail('NOT_FOUND')
  const outlet = s.outlets.find((o) => o.id === input.outletId)
  if (!outlet) return fail('NOT_FOUND')
  const zone = s.zones.find((z) => z.id === input.zoneId)
  const phone = normalizePhoneID(input.phone)
  const name = input.name.trim()
  const address = input.address.trim()
  if (!zone || !phone || !name || !address) return fail('NOT_ALLOWED')
  if (!(new Date(input.pickupAt).getTime() >= now.getTime())) return fail('NOT_ALLOWED')

  // Pengaman dasar terhadap spam: batasi permintaan yang belum dijemput per nomor.
  const active = s.orders.filter((o) => {
    const c = s.customers.find((x) => x.id === o.customerId)
    return o.channel === 'LANDING' && (o.status === 'REQUESTED' || o.status === 'PICKUP_ASSIGNED') && c && normalizePhoneID(c.phone) === phone
  })
  if (active.length >= MAX_ACTIVE_REQUESTS) return fail('TOO_MANY')

  const added = addCustomer(s, { name, phone: input.phone, address }, PUBLIC_ACTOR, now)
  if (!added.ok) return added
  const locationNote = input.locationNote?.trim()
  const serviceNote = input.serviceNote?.trim()
  return createOrder(
    added.state,
    {
      outletId: outlet.id,
      customerId: added.value.id,
      intake: 'PICKUP',
      handback: input.handback,
      express: false,
      items: [],
      conditionNotes: [],
      pickupFee: zone.pickupFee,
      deliveryFee: input.handback === 'DELIVERY' ? zone.deliveryFee : 0,
      channel: 'LANDING',
      distanceKm: zone.maxKm,
      scheduledAt: input.pickupAt,
      pickupAddress: locationNote ? `${address} (${locationNote})` : address,
      note: `Permintaan jemput dari link pelanggan${serviceNote ? `: ${serviceNote}` : ''}`,
    },
    PUBLIC_ACTOR,
    now,
  )
}
