import { describe, it, expect } from 'vitest'
import { formatRupiah, formatDateTime, formatDate, formatWeight, parseDecimalID, parseRupiahID } from './format'

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

describe('parseRupiahID (review final)', () => {
  it('menerima angka bulat dengan titik ribuan atau prefix Rp', () => {
    expect(parseRupiahID('7500')).toBe(7500)
    expect(parseRupiahID('7.500')).toBe(7500)
    expect(parseRupiahID('Rp 12.500')).toBe(12500)
    expect(parseRupiahID(' 1.234.567 ')).toBe(1234567)
  })
  it('menolak huruf, negatif, desimal, dan pengelompokan salah', () => {
    expect(parseRupiahID('abc')).toBeNull()
    expect(parseRupiahID('-1')).toBeNull()
    expect(parseRupiahID('7500,5')).toBeNull()
    expect(parseRupiahID('12.500,50')).toBeNull()
    expect(parseRupiahID('12.50')).toBeNull()
    expect(parseRupiahID('')).toBeNull()
  })
})

it('formatRupiah menaruh tanda minus di depan Rp', () => {
  expect(formatRupiah(-2000)).toBe('-Rp2.000')
  expect(formatRupiah(0)).toBe('Rp0')
})
