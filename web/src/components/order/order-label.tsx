'use client'

import { Printer } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@swarapos/core/format'
import { formatQty } from '@swarapos/core/labels'
import { trackingUrl } from '@swarapos/core/selectors'
import type { Customer, Order, Outlet } from '@swarapos/core/types'

/** Label order ukuran printer thermal 58 mm. QR hanya berisi URL lacak opaque, tanpa data pribadi. */
export function OrderLabel({ order, outlet, customer }: { order: Order; outlet: Outlet; customer: Customer }) {
  return (
    <div className="space-y-4">
      <div className="print-area mx-auto w-[58mm] max-w-full rounded-lg border border-dashed border-border-strong bg-white p-3 font-sans text-black">
        <p className="text-center text-[10px] font-semibold uppercase tracking-wide">{outlet.name}</p>
        <p className="mt-1 text-center font-mono text-base font-bold">{order.orderNo}</p>
        <div className="mt-2 flex justify-center">
          <QRCodeSVG value={trackingUrl(order.trackingToken, window.location.origin)} size={128} level="M" marginSize={1} />
        </div>
        <p className="mt-2 text-center text-sm font-semibold">{customer.name}</p>
        <div className="mt-2 space-y-0.5 border-t border-dashed border-black/40 pt-2 text-[10px]">
          <p>Masuk: {formatDateTime(order.createdAt)}</p>
          <p className="font-semibold">Estimasi: {formatDateTime(order.dueAt)}</p>
          {order.items.map((i) => (
            <p key={i.id}>
              {i.name} — {formatQty(i.unit, i.qty)}
            </p>
          ))}
          {order.express && <p className="mt-1 inline-block bg-black px-1.5 py-0.5 font-bold text-white">EXPRESS</p>}
        </div>
      </div>
      <Button className="w-full" onClick={() => window.print()}>
        <Printer aria-hidden />
        Cetak label
      </Button>
    </div>
  )
}
