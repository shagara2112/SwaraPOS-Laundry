import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/format'
import { customerStatusLabel } from '@/lib/labels'
import type { Order } from '@/lib/types'

/** Timeline versi pelanggan: tanpa nama staf, catatan internal, atau catatan QC. */
export function CustomerTimeline({ order }: { order: Order }) {
  const events = order.history.filter((e) => e.from !== e.to).reverse()
  return (
    <section className="rounded-3xl border border-border bg-surface p-5 shadow-card">
      <h2 className="text-base font-semibold text-fg">Riwayat</h2>
      <ol className="relative mt-4 space-y-4">
        <span className="absolute bottom-1 left-[5px] top-1 w-px bg-border" aria-hidden />
        {events.map((e, i) => (
          <li key={e.id} className="relative flex gap-3 pl-0">
            <span className={cn('relative z-10 mt-1.5 size-[11px] shrink-0 rounded-full ring-4 ring-surface', i === 0 ? 'bg-primary' : 'bg-border-strong')} />
            <div>
              <p className={cn('text-sm', i === 0 ? 'font-semibold text-fg' : 'text-fg-muted')}>{customerStatusLabel(e.to, order.handback)}</p>
              <p className="text-xs text-fg-subtle">{formatDateTime(e.at)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
