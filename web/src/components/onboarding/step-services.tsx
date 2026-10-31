'use client'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/cn'
import { UNIT_LABEL, type StepProps } from './types'

export function StepServices({ value, onChange }: StepProps<'services'>) {
  const set = (i: number, patch: Partial<(typeof value)[number]>) =>
    onChange(value.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  const enabled = value.filter((s) => s.enabled).length

  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-muted">
        Template untuk laundry kombinasi. Centang yang Anda jual dan sesuaikan harganya — semuanya bisa diubah lagi
        di menu Layanan. <strong className="text-fg">{enabled} layanan dipilih.</strong>
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {value.map((s, i) => (
          <li
            key={s.key}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
              s.enabled ? 'border-primary/40 bg-primary-soft/40' : 'border-border',
            )}
          >
            <input
              type="checkbox"
              checked={s.enabled}
              onChange={(e) => set(i, { enabled: e.target.checked })}
              className="size-5 shrink-0 accent-[var(--primary)]"
              aria-label={s.name}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">{s.name}</p>
              <p className="text-xs text-fg-subtle">{UNIT_LABEL[s.unit]}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-fg-subtle">Rp</span>
              <Input
                type="number"
                min={0}
                step={500}
                value={s.price}
                disabled={!s.enabled}
                onChange={(e) => set(i, { price: Number(e.target.value) })}
                className="tabular h-10 w-24"
                aria-label={`Harga ${s.name}`}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
