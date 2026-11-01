'use client'

import { DATE_PRESETS, type DateFilterValue, type DatePreset } from '@swarapos/core/date-range'
import { jakartaDateKey } from '@swarapos/core/domain/order-number'
import { cn } from '@/lib/cn'
import { Input } from './input'
import { Select } from './select'

/** Pilihan rentang tanggal (batas hari WIB); "Pilih tanggal" membuka dua kolom kalender browser. */
export function DateFilter({
  value,
  onChange,
  now,
  presets = DATE_PRESETS,
  className,
}: {
  value: DateFilterValue
  onChange: (value: DateFilterValue) => void
  now: Date
  presets?: typeof DATE_PRESETS
  className?: string
}) {
  const today = jakartaDateKey(now)
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Select value={value.preset} onChange={(e) => onChange({ ...value, preset: e.target.value as DatePreset })} aria-label="Rentang tanggal" className="w-full sm:w-40">
        {presets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.id === 'all' ? 'Semua tanggal' : p.label}
          </option>
        ))}
      </Select>
      {value.preset === 'custom' && (
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Input type="date" value={value.from} max={today} onChange={(e) => onChange({ ...value, from: e.target.value })} aria-label="Dari tanggal" className="tabular min-w-0 flex-1 sm:w-40" />
          <span className="text-sm text-fg-subtle" aria-hidden>
            –
          </span>
          <Input type="date" value={value.to} max={today} onChange={(e) => onChange({ ...value, to: e.target.value })} aria-label="Sampai tanggal" className="tabular min-w-0 flex-1 sm:w-40" />
        </div>
      )}
    </div>
  )
}
