'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { calculateTotals, lineTotal } from '@swarapos/core/domain/pricing'
import { formatRupiah, parseDecimalID } from '@swarapos/core/format'
import { UNIT_SHORT } from '@swarapos/core/labels'
import { paidAmount } from '@swarapos/core/selectors'
import { act } from '@/lib/store/act'
import { adjustOrderItems } from '@swarapos/core/store/actions-order'
import { useDemo } from '@/lib/store/demo-store'
import type { Order } from '@swarapos/core/types'

type Line = { key: string; itemId?: string; serviceId: string; qtyText: string }

/** Koreksi berat/jumlah item setelah timbang ulang; baris lama memakai harga terkunci. */
export function AdjustItemsDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const services = useDemo((s) => s.services)
  const expressPct = useDemo((s) => s.tenant.expressSurchargePct)
  const [lines, setLines] = useState<Line[]>(() => order.items.map((i) => ({ key: i.id, itemId: i.id, serviceId: i.serviceId, qtyText: String(i.qty).replace('.', ',') })))
  const [addId, setAddId] = useState('')
  const [reason, setReason] = useState('')
  const [pieceText, setPieceText] = useState(order.pieceCount ? String(order.pieceCount) : '')
  const pieceCount = /^\d+$/.test(pieceText.trim()) && Number(pieceText) > 0 ? Number(pieceText) : null

  const priceOf = (l: Line) => {
    const existing = order.items.find((i) => i.id === l.itemId)
    const svc = services.find((x) => x.id === l.serviceId)
    return { name: existing?.name ?? svc?.name ?? '-', unit: existing?.unit ?? svc?.unit ?? 'ITEM', unitPrice: existing?.unitPrice ?? svc?.prices[order.outletId] ?? 0 }
  }
  const parsed = lines.map((l) => ({ line: l, ...priceOf(l), qty: parseDecimalID(l.qtyText) }))
  const invalid = parsed.some((p) => !(p.qty && p.qty > 0))
  const hasMain = parsed.some((p) => p.unit !== 'ADDON')
  const totals = calculateTotals({
    lines: parsed.map((p) => ({ unit: p.unit, unitPrice: p.unitPrice, qty: p.qty && p.qty > 0 ? p.qty : 0 })),
    express: order.express,
    expressSurchargePct: expressPct,
    pickupFee: order.totals.pickupFee,
    deliveryFee: order.totals.deliveryFee,
  })
  const paid = paidAmount(order)
  const blockers = [
    invalid && 'Isi berat/jumlah lebih dari 0 di setiap baris.',
    !hasMain && 'Minimal satu layanan utama.',
    totals.total < paid && `Total baru di bawah yang sudah dibayar (${formatRupiah(paid)}).`,
    !reason.trim() && 'Alasan koreksi wajib diisi.',
    pieceText.trim() !== '' && pieceCount === null && 'Jumlah potong harus bilangan bulat.',
  ].filter(Boolean) as string[]

  const save = () => {
    if (blockers.length) return
    const r = act(
      (s) => adjustOrderItems(s, order.id, { lines: parsed.map((p) => ({ itemId: p.line.itemId, serviceId: p.line.serviceId, qty: p.qty! })), pieceCount, reason }, s.tenantActor, new Date()),
      'Item order dikoreksi',
    )
    if (r.ok) onClose()
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Koreksi item"
      description={`${order.orderNo} · harga baris lama tetap seperti saat order dibuat.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={save} disabled={blockers.length > 0}>
            Simpan koreksi
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <ul className="divide-y divide-border rounded-xl border border-border">
          {parsed.map((p) => (
            <li key={p.line.key} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg">{p.name}</p>
                <p className="tabular text-xs text-fg-subtle">
                  {formatRupiah(p.unitPrice)} / {UNIT_SHORT[p.unit]}
                  {!p.line.itemId && ' · baru'}
                </p>
              </div>
              <Input
                inputMode="decimal"
                value={p.line.qtyText}
                onChange={(e) => setLines(lines.map((l) => (l.key === p.line.key ? { ...l, qtyText: e.target.value } : l)))}
                className="tabular h-10 w-24 text-right font-mono"
                aria-label={`Jumlah ${p.name}`}
                aria-invalid={!(p.qty && p.qty > 0)}
              />
              <span className="w-12 text-sm text-fg-muted">{UNIT_SHORT[p.unit]}</span>
              <span className="tabular w-24 text-right text-sm font-semibold text-fg">{p.qty && p.qty > 0 ? formatRupiah(lineTotal({ unit: p.unit, unitPrice: p.unitPrice, qty: p.qty })) : '—'}</span>
              <button
                type="button"
                onClick={() => setLines(lines.filter((l) => l.key !== p.line.key))}
                className="grid size-10 place-items-center rounded-xl text-fg-subtle hover:bg-danger-soft hover:text-danger"
                aria-label={`Hapus ${p.name}`}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <Select value={addId} onChange={(e) => setAddId(e.target.value)} aria-label="Tambah layanan" className="flex-1">
            <option value="">Tambah layanan…</option>
            {services
              .filter((s) => s.active)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {formatRupiah(s.prices[order.outletId] ?? 0)}/{UNIT_SHORT[s.unit]}
                </option>
              ))}
          </Select>
          <Button
            variant="secondary"
            disabled={!addId}
            onClick={() => {
              const svc = services.find((s) => s.id === addId)
              if (!svc) return
              setLines([...lines, { key: `new-${Date.now()}`, serviceId: svc.id, qtyText: svc.unit === 'KG' ? '' : '1' }])
              setAddId('')
            }}
          >
            <Plus aria-hidden />
            Tambah
          </Button>
        </div>

        <dl className="grid grid-cols-3 gap-2 text-center text-sm">
          {[
            ['Total lama', formatRupiah(order.totals.total)],
            ['Total baru', formatRupiah(totals.total)],
            ['Sudah dibayar', formatRupiah(paid)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-surface-2 p-2.5">
              <dt className="text-xs text-fg-subtle">{label}</dt>
              <dd className="tabular mt-0.5 font-semibold text-fg">{value}</dd>
            </div>
          ))}
        </dl>

        <Field label="Jumlah potong" htmlFor="adj-pieces" hint="Kosongkan bila tidak dihitung.">
          <Input id="adj-pieces" inputMode="numeric" value={pieceText} onChange={(e) => setPieceText(e.target.value)} placeholder="15" className="tabular max-w-32" />
        </Field>

        <Field label="Alasan koreksi" htmlFor="adj-reason" required hint="Tercatat di riwayat order dan audit log.">
          <Textarea id="adj-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: timbang ulang di outlet" />
        </Field>

        {blockers.length > 0 && (
          <ul className="space-y-1 text-xs text-fg-subtle">
            {blockers.map((b) => (
              <li key={b}>• {b}</li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  )
}
