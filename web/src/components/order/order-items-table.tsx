import { formatRupiah } from '@/lib/format'
import { formatLineDetail } from '@/lib/labels'
import type { Order } from '@/lib/types'

export function OrderItemsTable({ order }: { order: Order }) {
  const { totals } = order
  const rows: [string, number][] = [
    ['Subtotal', totals.subtotal],
    ...(totals.expressFee ? ([['Biaya express', totals.expressFee]] as [string, number][]) : []),
    ...(totals.pickupFee ? ([['Biaya jemput', totals.pickupFee]] as [string, number][]) : []),
    ...(totals.deliveryFee ? ([['Biaya antar', totals.deliveryFee]] as [string, number][]) : []),
  ]
  return (
    <div>
      <ul className="divide-y divide-border">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg">{item.name}</p>
              <p className="tabular mt-0.5 text-xs text-fg-subtle">{formatLineDetail(item.unit, item.qty, item.unitPrice)}</p>
            </div>
            <p className="tabular text-sm font-medium text-fg">{formatRupiah(item.total)}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-2 space-y-1.5 border-t border-border pt-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between text-fg-muted">
            <dt>{label}</dt>
            <dd className="tabular">{formatRupiah(value)}</dd>
          </div>
        ))}
        <div className="flex justify-between pt-1.5 text-base font-bold text-fg">
          <dt>Total</dt>
          <dd className="tabular">{formatRupiah(totals.total)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-fg-subtle">Harga dikunci saat order dibuat; perubahan katalog tidak mengubah nota ini.</p>
    </div>
  )
}
