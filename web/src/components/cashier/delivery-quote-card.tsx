'use client'

import { MapPin, TriangleAlert } from 'lucide-react'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { ZoneQuote } from '@/lib/domain/delivery-zone'
import { formatRupiah } from '@/lib/format'

export function DeliveryQuoteCard({
  quote,
  fromLocation,
  manualKm,
  onManualKm,
  confirmed,
  onConfirmed,
  manualFee,
  onManualFee,
  legs,
}: {
  quote: ZoneQuote | null
  fromLocation: boolean
  manualKm: string
  onManualKm: (v: string) => void
  confirmed: boolean
  onConfirmed: (v: boolean) => void
  manualFee: string
  onManualFee: (v: string) => void
  legs: { pickup: boolean; delivery: boolean }
}) {
  return (
    <div className="space-y-4">
      {fromLocation ? (
        <p className="flex items-center gap-2 text-sm text-fg-muted">
          <MapPin className="size-4 text-primary" aria-hidden />
          Jarak garis lurus dari titik alamat pelanggan: <strong className="tabular text-fg">{quote?.distanceKm.toLocaleString('id-ID')} km</strong>
        </p>
      ) : (
        <Field label="Jarak dari outlet (km)" htmlFor="manual-km" hint="Pelanggan belum punya titik lokasi; isi perkiraan jarak.">
          <Input id="manual-km" inputMode="decimal" placeholder="3,5" value={manualKm} onChange={(e) => onManualKm(e.target.value)} className="max-w-40" />
        </Field>
      )}

      {quote?.status === 'OK' && (
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-xs text-fg-subtle">Zona</p>
            <p className="mt-0.5 font-semibold text-fg">{quote.zoneName}</p>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-xs text-fg-subtle">Jemput</p>
            <p className="tabular mt-0.5 font-semibold text-fg">{legs.pickup ? formatRupiah(quote.pickupFee) : '—'}</p>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-xs text-fg-subtle">Antar</p>
            <p className="tabular mt-0.5 font-semibold text-fg">{legs.delivery ? formatRupiah(quote.deliveryFee) : '—'}</p>
          </div>
        </div>
      )}

      {quote?.status === 'NEEDS_CONFIRMATION' && (
        <div className="space-y-3 rounded-xl border border-phase-qc/40 bg-phase-qc-soft p-4">
          <p className="flex gap-2 text-sm font-medium text-phase-qc">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {quote.distanceKm.toLocaleString('id-ID')} km berada di luar zona layanan. Konfirmasi dengan pelanggan dan tetapkan biaya manual.
          </p>
          <label className="flex items-center gap-2.5 text-sm text-fg">
            <input type="checkbox" checked={confirmed} onChange={(e) => onConfirmed(e.target.checked)} className="size-5 accent-[var(--primary)]" />
            Sudah dikonfirmasi staf
          </label>
          <Field label="Biaya per perjalanan (Rp)" htmlFor="manual-fee" hint="Override biaya tercatat di audit log saat backend aktif.">
            <Input id="manual-fee" inputMode="numeric" value={manualFee} onChange={(e) => onManualFee(e.target.value)} className="tabular max-w-40" />
          </Field>
        </div>
      )}
    </div>
  )
}
