import { expect, it, vi } from 'vitest'
import { formatOrderNo } from './order-number'

it('memakai tanggal WIB dan seq 4 digit', () => {
  expect(formatOrderNo('KMG', new Date('2026-10-31T18:00:00Z'), 7)).toBe('KMG-261101-0007')
})

it('tidak bergantung pada format tanggal locale perangkat (Hermes/ICU bisa memberi MM/DD/YYYY)', async () => {
  const RealDTF = Intl.DateTimeFormat
  class UsStyle {
    format(d: Date) {
      return new RealDTF('en-US', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
    }
  }
  vi.stubGlobal('Intl', { ...Intl, DateTimeFormat: UsStyle })
  vi.resetModules()
  try {
    const mod = await import('./order-number')
    expect(mod.jakartaDateKey(new Date('2026-10-31T17:30:00Z'))).toBe('2026-11-01')
    expect(mod.formatOrderNo('KMG', new Date('2026-10-31T03:00:00Z'), 7)).toBe('KMG-261031-0007')
  } finally {
    vi.unstubAllGlobals()
    vi.resetModules()
  }
})
