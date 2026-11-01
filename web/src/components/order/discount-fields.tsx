'use client'

import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { Discount } from '@swarapos/core/types'

export type DiscountInput = { type: Discount['type']; valueText: string; reason: string }

/** Isian diskon: nominal (Rp) atau persen, dengan alasan wajib. Dipakai di kasir dan detail order. */
export function DiscountFields({ value, onChange, idPrefix }: { value: DiscountInput; onChange: (v: DiscountInput) => void; idPrefix: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
      <Field label="Jenis" htmlFor={`${idPrefix}-type`}>
        <Select id={`${idPrefix}-type`} value={value.type} onChange={(e) => onChange({ ...value, type: e.target.value as Discount['type'] })}>
          <option value="AMOUNT">Rupiah</option>
          <option value="PERCENT">Persen</option>
        </Select>
      </Field>
      <Field label={value.type === 'PERCENT' ? 'Diskon (%)' : 'Diskon (Rp)'} htmlFor={`${idPrefix}-value`} hint="Memotong nilai cucian, tidak termasuk biaya jemput/antar.">
        <Input
          id={`${idPrefix}-value`}
          inputMode={value.type === 'PERCENT' ? 'decimal' : 'numeric'}
          value={value.valueText}
          onChange={(e) => onChange({ ...value, valueText: e.target.value })}
          placeholder={value.type === 'PERCENT' ? '10' : '5.000'}
          className="tabular"
        />
      </Field>
      <Field label="Alasan diskon" htmlFor={`${idPrefix}-reason`} className="sm:col-span-2" hint="Tercatat di riwayat order dan audit log.">
        <Input id={`${idPrefix}-reason`} value={value.reason} onChange={(e) => onChange({ ...value, reason: e.target.value })} placeholder="Contoh: pelanggan langganan" />
      </Field>
    </div>
  )
}
