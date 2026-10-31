const TIME_ZONE = 'Asia/Jakarta'

const dateFormat = new Intl.DateTimeFormat('id-ID', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const timeFormat = new Intl.DateTimeFormat('id-ID', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function formatRupiah(amount: number): string {
  return 'Rp' + Math.round(amount).toLocaleString('id-ID')
}

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${dateFormat.format(d)}, ${timeFormat.format(d)}`
}

export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso))
}

export function formatWeight(kg: number): string {
  return `${kg.toLocaleString('id-ID', { maximumFractionDigits: 2 })} kg`
}

/** Parse angka yang diketik pengguna Indonesia: "3,5" dan "3.5" sama-sama 3.5. */
export function parseDecimalID(input: string): number | null {
  const value = input.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(value)) return null
  return Number(value)
}
