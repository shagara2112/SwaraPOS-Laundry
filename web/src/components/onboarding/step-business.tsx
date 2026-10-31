'use client'

import { Check, ImagePlus } from 'lucide-react'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/cn'
import type { StepProps } from './types'

const SWATCHES = ['#2D5BFF', '#7C3AED', '#0891B2', '#16A34A', '#EA580C', '#DB2777']

export function StepBusiness({ value, onChange, errors }: StepProps<'business'>) {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_16rem]">
      <div className="space-y-5">
        <Field label="Nama bisnis" htmlFor="ob-name" required error={errors.name} hint="Tampil di nota, label, dan halaman lacak pelanggan.">
          <Input id="ob-name" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} aria-invalid={!!errors.name} />
        </Field>
        <Field label="Logo" htmlFor="ob-logo" hint="PNG atau JPG persegi, maks. 1 MB.">
          <label
            htmlFor="ob-logo"
            className="flex h-24 cursor-pointer items-center gap-4 rounded-xl border border-dashed border-border-strong px-4 hover:bg-surface-2"
          >
            {value.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value.logoUrl} alt="Pratinjau logo" className="size-16 rounded-xl object-cover" />
            ) : (
              <span className="grid size-16 place-items-center rounded-xl bg-surface-2 text-fg-subtle">
                <ImagePlus className="size-6" aria-hidden />
              </span>
            )}
            <span className="text-sm text-fg-muted">{value.logoUrl ? 'Ganti logo' : 'Pilih file logo'}</span>
          </label>
          <input
            id="ob-logo"
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onChange({ ...value, logoUrl: URL.createObjectURL(file) })
            }}
          />
        </Field>
        <fieldset>
          <legend className="text-sm font-medium text-fg">Warna brand</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChange({ ...value, color: c })}
                className={cn('grid size-11 place-items-center rounded-xl ring-offset-2 ring-offset-surface', value.color === c && 'ring-2 ring-fg')}
                style={{ backgroundColor: c }}
                aria-label={`Warna ${c}`}
                aria-pressed={value.color === c}
              >
                {value.color === c && <Check className="size-5 text-white" aria-hidden />}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div aria-label="Pratinjau halaman lacak" className="rounded-2xl border border-border bg-surface-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Pratinjau</p>
        <div className="mt-3 overflow-hidden rounded-xl bg-surface shadow-card">
          <div className="flex items-center gap-2 px-3 py-2.5" style={{ backgroundColor: value.color }}>
            {value.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value.logoUrl} alt="" className="size-7 rounded-lg object-cover" />
            ) : (
              <span className="grid size-7 place-items-center rounded-lg bg-white/25 text-xs font-bold text-white">
                {value.name.trim().charAt(0).toUpperCase() || 'L'}
              </span>
            )}
            <span className="truncate text-sm font-semibold text-white">{value.name || 'Nama laundry'}</span>
          </div>
          <div className="space-y-2 p-3">
            <p className="text-xs text-fg-subtle">Cucian Anda sedang</p>
            <p className="font-semibold text-fg">Dicuci</p>
            <div className="h-1.5 rounded-full bg-surface-2">
              <div className="h-full w-2/5 rounded-full" style={{ backgroundColor: value.color }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
