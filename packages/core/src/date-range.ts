import { jakartaDateKey } from './domain/order-number'

export type DatePreset = 'all' | 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'custom'

/** Rentang waktu epoch ms, awal inklusif dan akhir eksklusif. */
export type DateRange = { from: number; to: number }

export const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'today', label: 'Hari ini' },
  { id: 'yesterday', label: 'Kemarin' },
  { id: '7d', label: '7 hari' },
  { id: '30d', label: '30 hari' },
  { id: 'month', label: 'Bulan ini' },
  { id: 'custom', label: 'Pilih tanggal' },
]

const DAY = 24 * 60 * 60 * 1000
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/

/** Awal hari WIB (00.00) untuk tanggal `YYYY-MM-DD`; NaN bila formatnya salah. */
export function wibDayStart(day: string): number {
  return DAY_KEY.test(day) ? Date.parse(`${day}T00:00:00+07:00`) : NaN
}

/** Rentang untuk preset tanggal menurut hari WIB; `null` berarti tanpa batas (atau pilihan tanggal belum valid). */
export function presetRange(preset: DatePreset, now: Date, custom?: { from: string; to: string }): DateRange | null {
  const todayKey = jakartaDateKey(now)
  const today = wibDayStart(todayKey)
  switch (preset) {
    case 'all':
      return null
    case 'today':
      return { from: today, to: today + DAY }
    case 'yesterday':
      return { from: today - DAY, to: today }
    case '7d':
      return { from: today - 6 * DAY, to: today + DAY }
    case '30d':
      return { from: today - 29 * DAY, to: today + DAY }
    case 'month':
      return { from: wibDayStart(`${todayKey.slice(0, 8)}01`), to: today + DAY }
    case 'custom': {
      const a = wibDayStart(custom?.from ?? '')
      const b = wibDayStart(custom?.to ?? '')
      if (Number.isNaN(a) || Number.isNaN(b)) return null
      return { from: Math.min(a, b), to: Math.max(a, b) + DAY }
    }
  }
}

export function inRange(iso: string, range: DateRange | null): boolean {
  if (!range) return true
  const t = new Date(iso).getTime()
  return t >= range.from && t < range.to
}

/** Pilihan filter tanggal di layar; `from`/`to` (`YYYY-MM-DD`) dipakai saat preset `custom`. */
export type DateFilterValue = { preset: DatePreset; from: string; to: string }

/** Nilai awal filter; "Pilih tanggal" dibuka dengan 7 hari terakhir. */
export function initialDateFilter(preset: DatePreset, now: Date): DateFilterValue {
  return { preset, from: jakartaDateKey(new Date(now.getTime() - 6 * DAY)), to: jakartaDateKey(now) }
}

export function dateFilterRange(value: DateFilterValue, now: Date): DateRange | null {
  return presetRange(value.preset, now, value)
}
