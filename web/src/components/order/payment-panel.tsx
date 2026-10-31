'use client'

import { HandCoins } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatDateTime, formatRupiah, parseRupiahID } from '@swarapos/core/format'
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS } from '@swarapos/core/labels'
import { amountDue, paidAmount } from '@swarapos/core/selectors'
import { act } from '@/lib/store/act'
import { recordPayment } from '@swarapos/core/store/actions-order'
import type { Order, OrderPaymentMethod } from '@swarapos/core/types'

function RecordPaymentDialog({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
  const [method, setMethod] = useState<OrderPaymentMethod>('CASH')
  const [amount, setAmount] = useState(String(amountDue(order)))
  const parsed = parseRupiahID(amount)
  const due = amountDue(order)
  const error = amount.trim() === '' ? undefined : parsed === null ? 'Isi nominal rupiah bulat, contoh 20000 atau 20.000.' : parsed > due ? `Melebihi sisa tagihan ${formatRupiah(due)}.` : undefined
  const value = parsed !== null && parsed <= due ? parsed : 0

  const save = () => {
    const r = act((s) => recordPayment(s, order.id, { method, amount: value }, s.tenantActor, new Date()), 'Pembayaran tercatat')
    if (r.ok) onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title="Catat pembayaran"
      description={`${order.orderNo} · sisa ${formatRupiah(amountDue(order))}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={save} disabled={!(value > 0)}>
            Simpan pembayaran
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Metode" htmlFor="pay-method">
          <Select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value as OrderPaymentMethod)}>
            {Object.entries(PAYMENT_METHOD_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Nominal (Rp)" htmlFor="pay-amount" error={error} hint="Transfer dan QRIS diverifikasi manual ke rekening/QRIS outlet.">
          <Input id="pay-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular" aria-invalid={!!error} />
        </Field>
      </div>
    </Dialog>
  )
}

export function PaymentPanel({ order }: { order: Order }) {
  const [open, setOpen] = useState(false)
  const status = PAYMENT_STATUS[order.paymentStatus]
  const due = amountDue(order)
  return (
    <Card>
      <CardHeader title="Pembayaran" action={<Badge tone={status.tone}>{status.label}</Badge>} />
      <CardBody className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-surface-2 p-3">
            <dt className="text-xs text-fg-subtle">Sudah dibayar</dt>
            <dd className="tabular mt-0.5 font-semibold text-fg">{formatRupiah(paidAmount(order))}</dd>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <dt className="text-xs text-fg-subtle">Sisa tagihan</dt>
            <dd className={`tabular mt-0.5 font-semibold ${due > 0 ? 'text-danger' : 'text-fg'}`}>{formatRupiah(due)}</dd>
          </div>
        </dl>
        {order.payments.length > 0 && (
          <ul className="space-y-2 text-sm">
            {order.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3">
                <span className="text-fg-muted">
                  {PAYMENT_METHOD_LABEL[p.method]} · {formatDateTime(p.at)}
                </span>
                <span className="tabular font-medium text-fg">{formatRupiah(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
        {due > 0 && order.status !== 'CANCELLED' && (
          <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}>
            <HandCoins aria-hidden />
            Catat pembayaran
          </Button>
        )}
      </CardBody>
      {open && <RecordPaymentDialog order={order} open onClose={() => setOpen(false)} />}
    </Card>
  )
}
