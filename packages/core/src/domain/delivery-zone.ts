import type { DeliveryZone, LatLng } from '../types'

export const DEFAULT_ZONES: DeliveryZone[] = [
  { id: 'z1', name: 'Zona 1', minKm: 0, maxKm: 2, pickupFee: 5000, deliveryFee: 5000 },
  { id: 'z2', name: 'Zona 2', minKm: 2, maxKm: 5, pickupFee: 8000, deliveryFee: 8000 },
  { id: 'z3', name: 'Zona 3', minKm: 5, maxKm: 8, pickupFee: 12000, deliveryFee: 12000 },
  { id: 'z4', name: 'Zona 4', minKm: 8, maxKm: 12, pickupFee: 18000, deliveryFee: 18000 },
]

export type ZoneQuote =
  | {
      status: 'OK'
      zoneId: string
      zoneName: string
      pickupFee: number
      deliveryFee: number
      distanceKm: number
    }
  | { status: 'NEEDS_CONFIRMATION'; distanceKm: number }

const EARTH_RADIUS_KM = 6371

/** Jarak garis lurus antar dua koordinat (PRD §5: MVP belum memakai rute jalan). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

export function quoteDelivery(distanceKm: number, zones: DeliveryZone[]): ZoneQuote {
  const zone = zones.find((z) =>
    (z.minKm === 0 ? distanceKm >= 0 : distanceKm > z.minKm) && distanceKm <= z.maxKm,
  )
  if (!zone) return { status: 'NEEDS_CONFIRMATION', distanceKm }
  return {
    status: 'OK',
    zoneId: zone.id,
    zoneName: zone.name,
    pickupFee: zone.pickupFee,
    deliveryFee: zone.deliveryFee,
    distanceKm,
  }
}
