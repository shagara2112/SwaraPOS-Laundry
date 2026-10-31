import { it, expect } from 'vitest'
import { DEFAULT_ZONES, haversineKm, quoteDelivery } from './delivery-zone'

it.each([
  [0.5, 'z1', 5000],
  [2, 'z1', 5000],
  [2.01, 'z2', 8000],
  [5, 'z2', 8000],
  [8, 'z3', 12000],
  [12, 'z4', 18000],
])('jarak %s km masuk %s', (km, zoneId, fee) => {
  expect(quoteDelivery(km, DEFAULT_ZONES)).toMatchObject({
    status: 'OK',
    zoneId,
    pickupFee: fee,
    deliveryFee: fee,
  })
})

it('di atas 12 km perlu konfirmasi', () => {
  expect(quoteDelivery(12.01, DEFAULT_ZONES)).toEqual({ status: 'NEEDS_CONFIRMATION', distanceKm: 12.01 })
})

it('haversine Monas → Bundaran HI sekitar 2,2 km', () => {
  const d = haversineKm({ lat: -6.1754, lng: 106.8272 }, { lat: -6.195, lng: 106.823 })
  expect(d).toBeGreaterThan(2.1)
  expect(d).toBeLessThan(2.4)
  expect(haversineKm({ lat: -6.2, lng: 106.8 }, { lat: -6.2, lng: 106.8 })).toBe(0)
})
