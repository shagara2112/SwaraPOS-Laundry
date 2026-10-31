'use client'

import { Banknote, Check, Copy, Landmark, QrCode, Send } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button'
import { buildWaUrl } from '@/lib/domain/whatsapp'
import { formatRupiah } from '@/lib/format'
import { formatQty, PAYMENT_STATUS } from '@/lib/labels'
import { amountDue, paidAmount } from '@/lib/selectors'
import type { OutletPaymentMethod } from '@/lib/store/state'
import type { Order, Outlet } from '@/lib/types'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
        } catch {
          // Clipboard diblokir: pengguna masih bisa menyalin manual.
        }
      }}
      className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium text-fg hover:bg-surface-2"
    >
      {copied ? <Check className="size-4 text-phase-done" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {copied ? 'Tersalin' : 'Salin'}
    </button>
  )
}

const METHOD_ICON = { CASH: Banknote, TRANSFER: Landmark, QRIS: QrCode }

export function BillCard({ order, outlet, methods }: { order: Order; outlet: Outlet; methods: OutletPaymentMethod[] }) {
  const due = amountDue(order)
  const status = PAYMENT_STATUS[order.paymentStatus]
  const proofUrl = buildWaUrl(outlet.phone, `Halo ${outlet.name}, saya kirim bukti pembayaran untuk order ${order.orderNo}.`)

  return (
    <section className="rounded-3xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-fg">Tagihan</h2>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {order.items.map((i) => (
          <li key={i.id} className="flex justify-between gap-3">
            <span className="text-fg-muted">
              {i.name} <span className="text-fg-subtle">· {formatQty(i.unit, i.qty)}</span>
            </span>
            <span className="tabular text-fg">{formatRupiah(i.total)}</span>
          </li>
        ))}
        {order.totals.expressFee > 0 && (
          <li className="flex justify-between text-fg-muted">
            <span>Express</span>
            <span className="tabular">{formatRupiah(order.totals.expressFee)}</span>
          </li>
        )}
        {order.totals.pickupFee + order.totals.deliveryFee > 0 && (
          <li className="flex justify-between text-fg-muted">
            <span>Antar-jemput</span>
            <span className="tabular">{formatRupiah(order.totals.pickupFee + order.totals.deliveryFee)}</span>
          </li>
        )}
      </ul>
      <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
        <div className="flex justify-between font-semibold text-fg">
          <dt>Total</dt>
          <dd className="tabular">{formatRupiah(order.totals.total)}</dd>
        </div>
        {paidAmount(order) > 0 && (
          <div className="flex justify-between text-fg-muted">
            <dt>Sudah dibayar</dt>
            <dd className="tabular">{formatRupiah(paidAmount(order))}</dd>
          </div>
        )}
        {due > 0 && (
          <div className="flex justify-between text-base font-bold text-danger">
            <dt>Sisa tagihan</dt>
            <dd className="tabular">{formatRupiah(due)}</dd>
          </div>
        )}
      </dl>

      {due > 0 && order.status !== 'CANCELLED' && (
        <div className="mt-5 space-y-3">
          <h3 className="text-sm font-semibold text-fg">Cara bayar</h3>
          {methods
            .filter((m) => m.active)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((m) => {
              const Icon = METHOD_ICON[m.type]
              return (
                <div key={m.id} className="flex items-start gap-3 rounded-2xl bg-surface-2 p-3">
                  <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg">{m.label}</p>
                    {m.type === 'TRANSFER' && (
                      <p className="text-sm text-fg">
                        {m.bankName}
                        <span className="block whitespace-nowrap font-mono font-semibold">{m.accountNumber}</span>
                        <span className="block text-fg-muted">a.n. {m.accountName}</span>
                      </p>
                    )}
                    {m.type === 'QRIS' && <p className="text-sm text-fg">Merchant {m.merchantName}</p>}
                    {m.instructions && <p className="mt-0.5 text-sm text-fg-muted">{m.instructions}</p>}
                  </div>
                  {m.type === 'TRANSFER' && m.accountNumber && <CopyButton text={m.accountNumber.replace(/[\s-]/g, '')} />}
                </div>
              )
            })}
          {proofUrl && (
            <a href={proofUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses('secondary', 'lg', 'w-full')}>
              <Send aria-hidden />
              Kirim bukti bayar ke outlet
            </a>
          )}
          <p className="text-xs text-fg-subtle">Pembayaran diverifikasi manual oleh staf outlet.</p>
        </div>
      )}
    </section>
  )
}
