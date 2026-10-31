import { it, expect } from 'vitest'
import { formatOrderNo } from './order-number'

it('memakai tanggal WIB dan seq 4 digit', () => {
  expect(formatOrderNo('KMG', new Date('2026-10-31T18:00:00Z'), 7)).toBe('KMG-261101-0007')
})
