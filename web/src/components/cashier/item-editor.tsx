'use client'

import { Plus, Trash2, Zap } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/cn'
import { lineTotal } from '@swarapos/core/domain/pricing'
import { formatRupiah, parseDecimalID } from '@swarapos/core/format'
import { UNIT_SHORT } from '@swarapos/core/labels'
import type { Service } from '@swarapos/core/types'

export type DraftLine = { key: string; serviceId: string; qtyText: string }

export function ItemEditor({
  services,
  outletId,
  lines,
  addons,
  express,
  expressPct,
  onLines,
  onAddons,
  onExpress,
}: {
  services: Service[]
  outletId: string
  lines: DraftLine[]
  addons: string[]
  express: boolean
  expressPct: number
  onLines: (lines: DraftLine[]) => void
  onAddons: (ids: string[]) => void
  onExpress: (on: boolean) => void
}) {
  const main = services.filter((s) => s.active && s.unit !== 'ADDON')
  const addonServices = services.filter((s) => s.active && s.unit === 'ADDON')
  const byId = new Map(services.map((s) => [s.id, s]))

  const addLine = (serviceId: string) => {
    const key = `l${Date.now().toString(36)}${lines.length}`
    onLines([...lines, { key, serviceId, qtyText: byId.get(serviceId)?.unit === 'KG' ? '' : '1' }])
    // Fokus ke input jumlah baris baru setelah render.
    requestAnimationFrame(() => document.getElementById(`qty-${key}`)?.focus())
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-medium text-fg">Tambah layanan</p>
        <div className="flex flex-wrap gap-2">
          {main.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => addLine(s.id)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm font-medium text-fg hover:border-primary/40 hover:bg-primary-soft/40"
            >
              <Plus className="size-4 text-primary" aria-hidden />
              {s.name}
              <span className="tabular text-xs text-fg-subtle">
                {formatRupiah(s.prices[outletId] ?? 0)}/{UNIT_SHORT[s.unit]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {lines.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {lines.map((line) => {
            const svc = byId.get(line.serviceId)
            if (!svc) return null
            const qty = parseDecimalID(line.qtyText)
            const invalid = line.qtyText.trim() !== '' && !(qty && qty > 0)
            const price = svc.prices[outletId] ?? 0
            return (
              <li key={line.key} className="flex flex-wrap items-center gap-3 px-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fg">{svc.name}</p>
                  <p className="tabular text-xs text-fg-subtle">
                    {formatRupiah(price)} / {UNIT_SHORT[svc.unit]}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id={`qty-${line.key}`}
                    inputMode="decimal"
                    value={line.qtyText}
                    placeholder={svc.unit === 'KG' ? 'Berat' : 'Jumlah'}
                    onChange={(e) => onLines(lines.map((l) => (l.key === line.key ? { ...l, qtyText: e.target.value } : l)))}
                    className={cn('tabular h-11 w-24 text-right font-mono')}
                    aria-invalid={invalid}
                    aria-label={`${svc.unit === 'KG' ? 'Berat' : 'Jumlah'} ${svc.name}`}
                  />
                  <span className="w-12 text-sm text-fg-muted">{UNIT_SHORT[svc.unit]}</span>
                </div>
                <p className="tabular w-24 text-right text-sm font-semibold text-fg">
                  {qty && qty > 0 ? formatRupiah(lineTotal({ unit: svc.unit, unitPrice: price, qty })) : '—'}
                </p>
                <button
                  type="button"
                  onClick={() => onLines(lines.filter((l) => l.key !== line.key))}
                  className="grid size-11 place-items-center rounded-xl text-fg-subtle hover:bg-danger-soft hover:text-danger"
                  aria-label={`Hapus ${svc.name}`}
                >
                  <Trash2 className="size-4" />
                </button>
                {invalid && <p className="w-full text-xs font-medium text-danger">Isi angka lebih dari 0, contoh 3,5.</p>}
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {addonServices.map((s) => {
          const on = addons.includes(s.id)
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={on}
              onClick={() => onAddons(on ? addons.filter((a) => a !== s.id) : [...addons, s.id])}
              className={cn(
                'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors',
                on ? 'border-phase-production bg-phase-production-soft text-phase-production' : 'border-border text-fg-muted hover:text-fg',
              )}
            >
              + {s.name} <span className="tabular text-xs opacity-80">{formatRupiah(s.prices[outletId] ?? 0)}</span>
            </button>
          )
        })}
        <button
          type="button"
          role="switch"
          aria-checked={express}
          onClick={() => onExpress(!express)}
          className={cn(
            'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
            express ? 'border-phase-qc bg-phase-qc-soft text-phase-qc' : 'border-border text-fg-muted hover:text-fg',
          )}
        >
          <Zap className="size-4" aria-hidden />
          Express +{expressPct}% · SLA separuh
        </button>
      </div>
    </div>
  )
}
