import { describe, it, expect } from 'vitest'
import { formatRupiah, formatDateTime, formatDate, formatWeight, parseDecimalID } from './format'

describe('formatRupiah', () => {
  it('memakai titik ribuan tanpa spasi', () => {
    expect(formatRupiah(12500)).toBe('Rp12.500')
    expect(formatRupiah(0)).toBe('Rp0')
    expect(formatRupiah(1250000)).toBe('Rp1.250.000')
  })
})

describe('tanggal Asia/Jakarta', () => {
  it('menggeser UTC ke WIB', () => {
    expect(formatDate('2026-10-31T18:00:00Z')).toBe('1 Nov 2026')
    expect(formatDateTime('2026-10-31T03:30:00Z')).toContain('31 Okt 2026')
    expect(formatDateTime('2026-10-31T03:30:00Z')).toContain('10.30')
  })
})

describe('formatWeight', () => {
  it('memakai koma desimal', () => {
    expect(formatWeight(3.5)).toBe('3,5 kg')
    expect(formatWeight(4)).toBe('4 kg')
  })
})

describe('parseDecimalID', () => {
  it('menerima koma dan titik', () => {
    expect(parseDecimalID('3,5')).toBe(3.5)
    expect(parseDecimalID('3.5')).toBe(3.5)
    expect(parseDecimalID(' 2 ')).toBe(2)
  })
  it('menolak input kosong, huruf, dan negatif', () => {
    expect(parseDecimalID('')).toBeNull()
    expect(parseDecimalID('abc')).toBeNull()
    expect(parseDecimalID('-1')).toBeNull()
  })
})
