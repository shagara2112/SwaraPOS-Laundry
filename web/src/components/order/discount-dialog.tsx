'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { calculateTotals } from '@swarapos/core/domain/pricing'
import { formatRupiah, parseDecimalID, parseRupiahID } from '@swarapos/core/format'
import { paidAmount } from '@swarapos/core/selectors'
import { act } from '@/lib/store/act'
import { setOrderDiscount } from '@swarapos/core/store/actions-order'
import { useDemo } from '@/lib/store/demo-store'
import type { Order } from '@swarapos/core/types'
import { DiscountFields, type DiscountInput } from './discount-fields'

/** Beri, ubah, atau hapus diskon order; pratinjau total sebelum disimpan. */
export function DiscountDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const expressPct = useDemo((s) => s.tenant.expressSurchargePct)
  const [input, setInput] = useState<DiscountInput>(() =>
    order.discount
      ? { type: order.discount.type, valueText: String(order.discount.value).replace('.', ','), reason: order.discount.reason }
      : { type: 'AMOUNT', valueText: '', reason: '' },
  )
  const value = input.type === 'PERCENT' ? parseDecimalID(input.valueText) : parseRupiahID(input.valueText)
  const valid = value !== null && value > 0 && (input.type !== 'PERCENT' || value <= 100)
  const totals = calculateTotals({
    lines: order.items,
    express: order.express,
    expressSurchargePct: expressPct,
    pickupFee: order.totals.pickupFee,
    deliveryFee: order.totals.deliveryFee,
    discount: valid ? { type: input.type, value: value! } : undefined,
  })
  const paid = paidAmount(order)
  const blockers = [
    input.valueText.trim() && !valid && 'Diskon tidak valid.',
    valid && !input.reason.trim() && 'Alasan diskon wajib diisi.',
    totals.total < paid && `Total di bawah yang sudah dibayar (${formatRupiah(paid)}); refund dulu kelebihannya.`,
  ].filter(Boolean) as string[]

  const save = (remove = false) => {
    const r = act(
      (s) => setOrderDiscount(s, order.id, remove ? null : { type: input.type, value: value!, reason: input.reason }, s.tenantActor, new Date()),
      remove ? 'Diskon dihapus' : 'Diskon tersimpan',
    )
    if (r.ok) onClose()
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title="Diskon order"
      description={`${order.orderNo} · subtotal + express ${formatRupiah(order.totals.subtotal + order.totals.expressFee)}`}
      footer={
        <>
          {order.discount && (
            <Button variant="ghost" className="mr-auto text-danger hover:text-danger" onClick={() => save(true)}>
              Hapus diskon
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={() => save()} disabled={!valid || blockers.length > 0}>
            Simpan diskon
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <DiscountFields idPrefix="order-discount" value={input} onChange={setInput} />
        <dl className="grid grid-cols-3 gap-2 text-center text-sm">
          {[
            ['Diskon', formatRupiah(-totals.discount)],
            ['Total baru', formatRupiah(totals.total)],
            ['Sudah dibayar', formatRupiah(paid)],
          ].map(([label, v]) => (
            <div key={label} className="rounded-xl bg-surface-2 p-2.5">
              <dt className="text-xs text-fg-subtle">{label}</dt>
              <dd className="tabular mt-0.5 font-semibold text-fg">{v}</dd>
            </div>
          ))}
        </dl>
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
