const jakartaParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Tanggal kalender di Asia/Jakarta dalam bentuk `YYYY-MM-DD`. */
export function jakartaDateKey(date: Date): string {
  return jakartaParts.format(date)
}

/** Nomor order unik per outlet per hari, contoh `KMG-261101-0007`. */
export function formatOrderNo(outletCode: string, date: Date, seq: number): string {
  const [year, month, day] = jakartaDateKey(date).split('-')
  return `${outletCode}-${year.slice(2)}${month}${day}-${String(seq).padStart(4, '0')}`
}
