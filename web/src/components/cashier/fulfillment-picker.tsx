'use client'

import { Bike, Footprints, PackageOpen, Store, Truck, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { HandbackType, IntakeType } from '@swarapos/core/types'

function Segmented<T extends string>({
  legend,
  value,
  onChange,
  options,
}: {
  legend: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; hint: string; icon: LucideIcon }[]
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-fg">{legend}</legend>
      <div className={cn('grid gap-2', options.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
        {options.map(({ value: v, label, hint, icon: Icon }) => {
          const active = v === value
          return (
            <button
              key={v}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(v)}
              className={cn(
                'flex min-h-16 flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors',
                active ? 'border-primary bg-primary-soft text-primary' : 'border-border text-fg hover:bg-surface-2',
              )}
            >
              <Icon className="size-5" aria-hidden />
              <span className="text-sm font-semibold">{label}</span>
              <span className={cn('hidden text-xs sm:block', active ? 'text-primary/80' : 'text-fg-subtle')}>{hint}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export function FulfillmentPicker({
  intake,
  handback,
  onChange,
}: {
  intake: IntakeType
  handback: HandbackType
  /** Hanya bagian yang berubah, supaya dua klik cepat tidak saling menimpa. */
  onChange: (patch: { intake?: IntakeType; handback?: HandbackType }) => void
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <Segmented
        legend="Penerimaan"
        value={intake}
        onChange={(v) => onChange({ intake: v })}
        options={[
          { value: 'WALK_IN', label: 'Walk-in', hint: 'Pelanggan menunggu', icon: Footprints },
          { value: 'DROP_OFF', label: 'Drop-off', hint: 'Ditinggal di outlet', icon: PackageOpen },
          { value: 'PICKUP', label: 'Dijemput', hint: 'Kurir menjemput', icon: Bike },
        ]}
      />
      <Segmented
        legend="Pengembalian"
        value={handback}
        onChange={(v) => onChange({ handback: v })}
        options={[
          { value: 'SELF_PICKUP', label: 'Ambil sendiri', hint: 'Di outlet', icon: Store },
          { value: 'DELIVERY', label: 'Diantar', hint: 'Kurir mengantar', icon: Truck },
        ]}
      />
    </div>
  )
}
