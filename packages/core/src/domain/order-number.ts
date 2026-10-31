// WIB tetap UTC+7 tanpa musim panas; offset tetap menghindari format tanggal Intl yang
// berbeda antar data locale perangkat (Hermes di Android memakai ICU perangkat).
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000

/** Tanggal kalender di Asia/Jakarta dalam bentuk `YYYY-MM-DD`. */
export function jakartaDateKey(date: Date): string {
  return new Date(date.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10)
}

/** Nomor order unik per outlet per hari, contoh `KMG-261101-0007`. */
export function formatOrderNo(outletCode: string, date: Date, seq: number): string {
  const [year, month, day] = jakartaDateKey(date).split('-')
  return `${outletCode}-${year.slice(2)}${month}${day}-${String(seq).padStart(4, '0')}`
}
