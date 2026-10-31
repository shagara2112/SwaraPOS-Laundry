'use client'

import { CalendarClock, CircleAlert, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDateTime, formatRupiah } from '@/lib/format'
import type { OrderTotals } from '@/lib/types'

export type SummaryLine = { label: string; detail: string; total: number }

export function OrderSummary({
  lines,
  totals,
  expressPct,
  dueAt,
  blockers,
  saving = false,
  onSave,
}: {
  lines: SummaryLine[]
  totals: OrderTotals
  expressPct: number
  dueAt: Date | null
  blockers: string[]
  saving?: boolean
  onSave: () => void
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface shadow-card">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold text-fg">Ringkasan order</h2>
      </div>
      <div className="space-y-4 px-5 py-4">
        {lines.length === 0 ? (
          <p className="text-sm text-fg-subtle">Belum ada layanan.</p>
        ) : (
          <ul className="space-y-2.5 text-sm">
            {lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-fg">{l.label}</span>
                  <span className="tabular text-xs text-fg-subtle">{l.detail}</span>
                </span>
                <span className="tabular shrink-0 font-medium text-fg">{formatRupiah(l.total)}</span>
              </li>
            ))}
          </ul>
        )}
        <dl className="space-y-1.5 border-t border-border pt-3 text-sm text-fg-muted">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd className="tabular">{formatRupiah(totals.subtotal)}</dd>
          </div>
          {totals.expressFee > 0 && (
            <div className="flex justify-between">
              <dt>Express (+{expressPct}%)</dt>
              <dd className="tabular">{formatRupiah(totals.expressFee)}</dd>
            </div>
          )}
          {totals.pickupFee > 0 && (
            <div className="flex justify-between">
              <dt>Biaya jemput</dt>
              <dd className="tabular">{formatRupiah(totals.pickupFee)}</dd>
            </div>
          )}
          {totals.deliveryFee > 0 && (
            <div className="flex justify-between">
              <dt>Biaya antar</dt>
              <dd className="tabular">{formatRupiah(totals.deliveryFee)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between pt-2 text-fg">
            <dt className="text-base font-semibold">Total</dt>
            <dd className="tabular text-2xl font-bold tracking-tight">{formatRupiah(totals.total)}</dd>
          </div>
        </dl>
        {dueAt && (
          <p className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-fg-muted">
            <CalendarClock className="size-4 text-primary" aria-hidden />
            Estimasi selesai <strong className="text-fg">{formatDateTime(dueAt.toISOString())}</strong>
          </p>
        )}
        {blockers.length > 0 && (
          <ul className="space-y-1 text-xs text-fg-subtle">
            {blockers.map((b) => (
              <li key={b} className="flex items-center gap-1.5">
                <CircleAlert className="size-3.5 text-phase-qc" aria-hidden />
                {b}
              </li>
            ))}
          </ul>
        )}
        <Button size="lg" className="w-full" disabled={blockers.length > 0 || saving} onClick={onSave}>
          <Save aria-hidden />
          Simpan order
          <kbd className="ml-1 hidden rounded bg-white/20 px-1.5 font-mono text-[11px] lg:inline">Ctrl ↵</kbd>
        </Button>
      </div>
    </div>
  )
}
