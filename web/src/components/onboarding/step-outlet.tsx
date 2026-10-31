'use client'

import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { StepProps } from './types'

export function StepOutlet({ value, onChange, errors }: StepProps<'outlet'>) {
  const setHours = (i: number, patch: Partial<(typeof value.hours)[number]>) =>
    onChange({ ...value, hours: value.hours.map((h, idx) => (idx === i ? { ...h, ...patch } : h)) })

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,1.1fr)]">
      <div className="space-y-5">
        <Field label="Nama outlet" htmlFor="ob-outlet" required error={errors.outletName}>
          <Input id="ob-outlet" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} aria-invalid={!!errors.outletName} />
        </Field>
        <Field label="Alamat lengkap" htmlFor="ob-address" required error={errors.address} hint="Titik outlet dipakai untuk menghitung zona antar-jemput.">
          <Textarea id="ob-address" value={value.address} onChange={(e) => onChange({ ...value, address: e.target.value })} aria-invalid={!!errors.address} />
        </Field>
        <Field label="Nomor WhatsApp outlet" htmlFor="ob-phone" hint="Pelanggan bisa chat nomor ini dari halaman lacak.">
          <Input id="ob-phone" inputMode="tel" value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value })} />
        </Field>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-fg">Jam operasional</legend>
        <div className="mt-2 divide-y divide-border rounded-xl border border-border">
          {value.hours.map((h, i) => (
            <div key={h.day} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
              <label className="flex w-24 items-center gap-2.5 text-sm font-medium text-fg">
                <input type="checkbox" checked={h.open} onChange={(e) => setHours(i, { open: e.target.checked })} className="size-5 accent-[var(--primary)]" />
                {h.day}
              </label>
              {h.open ? (
                <div className="flex min-w-0 items-center gap-1.5 text-sm text-fg-muted">
                  <Input type="time" value={h.from} onChange={(e) => setHours(i, { from: e.target.value })} className="h-10 w-[6.5rem] px-2" aria-label={`Buka ${h.day}`} />
                  –
                  <Input type="time" value={h.to} onChange={(e) => setHours(i, { to: e.target.value })} className="h-10 w-[6.5rem] px-2" aria-label={`Tutup ${h.day}`} />
                </div>
              ) : (
                <span className="text-sm text-fg-subtle">Tutup</span>
              )}
            </div>
          ))}
        </div>
      </fieldset>
    </div>
  )
}
