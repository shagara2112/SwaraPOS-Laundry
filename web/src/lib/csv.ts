function cell(value: string | number): string {
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** CSV RFC 4180 sederhana; header diambil dari key baris pertama. */
export function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  return [headers.map(cell).join(','), ...rows.map((r) => headers.map((h) => cell(r[h] ?? '')).join(','))].join('\n')
}
