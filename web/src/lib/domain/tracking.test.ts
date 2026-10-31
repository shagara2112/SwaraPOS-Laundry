import { it, expect } from 'vitest'
import { createTrackingToken, verifyTrackingPhone } from './tracking'

it('mencocokkan 4 digit terakhir telepon', () => {
  expect(verifyTrackingPhone('0812-3456-7890', '7890')).toBe(true)
  expect(verifyTrackingPhone('0812-3456-7890', '1234')).toBe(false)
  expect(verifyTrackingPhone('0812-3456-7890', '789')).toBe(false)
  expect(verifyTrackingPhone('0812-3456-7890', 'abcd')).toBe(false)
})

it('token lacak opaque 12 karakter', () => {
  const a = createTrackingToken()
  expect(a).toMatch(/^[a-z0-9]{12}$/)
  expect(createTrackingToken()).not.toBe(a)
})
