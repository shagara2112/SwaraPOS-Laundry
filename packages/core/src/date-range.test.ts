import { describe, expect, it } from 'vitest'
import { dateFilterRange, inRange, initialDateFilter, presetRange } from './date-range'

const wib = (day: string) => Date.parse(`${day}T00:00:00+07:00`)
const DAY = 24 * 60 * 60 * 1000
// 31 Okt 2026 pukul 10.00 WIB.
const now = new Date('2026-10-31T03:00:00Z')

describe('presetRange', () => {
  it('hari ini dan kemarin mengikuti batas hari WIB', () => {
    expect(presetRange('today', now)).toEqual({ from: wib('2026-10-31'), to: wib('2026-11-01') })
    expect(presetRange('yesterday', now)).toEqual({ from: wib('2026-10-30'), to: wib('2026-10-31') })
  })

  it('7 dan 30 hari termasuk hari ini', () => {
    expect(presetRange('7d', now)).toEqual({ from: wib('2026-10-25'), to: wib('2026-11-01') })
    expect(presetRange('30d', now)).toEqual({ from: wib('2026-10-02'), to: wib('2026-11-01') })
  })

  it('bulan ini dimulai tanggal 1 WIB', () => {
    expect(presetRange('month', now)).toEqual({ from: wib('2026-10-01'), to: wib('2026-11-01') })
  })

  it('lewat tengah malam WIB sudah dihitung hari berikutnya', () => {
    const afterMidnight = new Date('2026-10-31T17:30:00Z') // 1 Nov 00.30 WIB
    expect(presetRange('today', afterMidnight)).toEqual({ from: wib('2026-11-01'), to: wib('2026-11-02') })
    expect(presetRange('month', afterMidnight)).toEqual({ from: wib('2026-11-01'), to: wib('2026-11-02') })
  })

  it('pilih tanggal: inklusif kedua ujung, urutan terbalik ditukar, isian tidak valid diabaikan', () => {
    expect(presetRange('custom', now, { from: '2026-10-28', to: '2026-10-30' })).toEqual({ from: wib('2026-10-28'), to: wib('2026-10-31') })
    expect(presetRange('custom', now, { from: '2026-10-30', to: '2026-10-28' })).toEqual({ from: wib('2026-10-28'), to: wib('2026-10-31') })
    expect(presetRange('custom', now, { from: '30/10/2026', to: '2026-10-28' })).toBeNull()
    expect(presetRange('custom', now)).toBeNull()
  })

  it('semua tanggal = tanpa batas', () => {
    expect(presetRange('all', now)).toBeNull()
  })
})

describe('inRange', () => {
  const range = { from: wib('2026-10-31'), to: wib('2026-10-31') + DAY }
  it('awal inklusif, akhir eksklusif; tanpa rentang selalu masuk', () => {
    expect(inRange('2026-10-30T17:00:00.000Z', range)).toBe(true) // 31 Okt 00.00 WIB
    expect(inRange('2026-10-31T16:59:59.000Z', range)).toBe(true)
    expect(inRange('2026-10-31T17:00:00.000Z', range)).toBe(false) // 1 Nov 00.00 WIB
    expect(inRange('2020-01-01T00:00:00.000Z', null)).toBe(true)
  })
})

describe('initialDateFilter & dateFilterRange', () => {
  it('pilihan tanggal sendiri diawali 7 hari terakhir WIB', () => {
    expect(initialDateFilter('all', now)).toEqual({ preset: 'all', from: '2026-10-25', to: '2026-10-31' })
  })

  it('rentang mengikuti preset; preset custom memakai from/to', () => {
    expect(dateFilterRange({ preset: 'today', from: '', to: '' }, now)).toEqual(presetRange('today', now))
    expect(dateFilterRange({ preset: 'custom', from: '2026-10-28', to: '2026-10-30' }, now)).toEqual({ from: wib('2026-10-28'), to: wib('2026-10-31') })
    expect(dateFilterRange(initialDateFilter('all', now), now)).toBeNull()
  })
})
