import { Check, TriangleAlert } from 'lucide-react'
import { statusIcon } from '@/components/order/status-badge'
import { cn } from '@/lib/cn'
import { statusPhase } from '@swarapos/core/domain/order-status'
import { formatDateTime } from '@swarapos/core/format'
import { customerStatusLabel } from '@swarapos/core/labels'
import type { Order, StatusPhase } from '@swarapos/core/types'

const STEPS = ['Diterima', 'Diproses', 'Cek kualitas', 'Siap', 'Selesai']
const STEP_OF: Record<Exclude<StatusPhase, 'exception'>, number> = { intake: 0, production: 1, qc: 2, ready: 3, done: 4 }

/** Status sebelum order ditahan/dibatalkan, supaya progres tetap menunjukkan posisi terakhir. */
function lastRegularPhase(order: Order): Exclude<StatusPhase, 'exception'> {
  for (const e of [...order.history].reverse()) {
    const phase = statusPhase(e.to)
    if (phase !== 'exception') return phase
  }
  return 'intake'
}

export function StatusHero({ order }: { order: Order }) {
  const phase = statusPhase(order.status)
  const step = STEP_OF[phase === 'exception' ? lastRegularPhase(order) : phase]
  const Icon = statusIcon(order.status)
  const done = phase === 'done'
  const finishedAt = done ? order.history.at(-1)?.at : undefined

  return (
    <section className="overflow-hidden rounded-3xl bg-surface shadow-card" aria-live="polite">
      <div className={cn('p-6 text-white', phase === 'exception' ? 'bg-phase-exception' : 'bg-[image:var(--brand-gradient)]')}>
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-white/20">
            <Icon className="size-6" aria-hidden />
          </span>
          <div>
            <p className="text-sm text-white/80">{done ? 'Cucian Anda' : 'Cucian Anda saat ini'}</p>
            <h1 className="text-2xl font-bold leading-tight">{customerStatusLabel(order.status, order.handback)}</h1>
          </div>
        </div>
        <p className="mt-4 text-sm text-white/90">
          {done && finishedAt
            ? `Selesai ${formatDateTime(finishedAt)}`
            : order.status === 'CANCELLED'
              ? 'Order ini dibatalkan. Hubungi outlet bila ada pertanyaan.'
              : `Estimasi selesai ${formatDateTime(order.dueAt)}`}
        </p>
      </div>

      {(order.status === 'ON_HOLD' || order.status === 'ISSUE_REPORTED') && (
        <p className="flex gap-2 border-b border-border bg-phase-exception-soft px-6 py-3 text-sm text-phase-exception">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          Ada hal yang perlu dikonfirmasi. Tim outlet akan menghubungi Anda lewat WhatsApp.
        </p>
      )}

      {order.status !== 'CANCELLED' && (
        <ol className="grid grid-cols-5 gap-1 px-4 py-5" aria-label="Progres cucian">
          {STEPS.map((label, i) => {
            const reached = i < step || (i === step && done)
            const current = i === step && !done
            return (
              <li key={label} className="flex flex-col items-center gap-2 text-center" aria-current={current ? 'step' : undefined}>
                <div className="flex w-full items-center">
                  <span className={cn('h-0.5 flex-1', i === 0 ? 'opacity-0' : i <= step ? 'bg-primary' : 'bg-border')} />
                  <span
                    className={cn(
                      'grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold',
                      reached && 'bg-primary text-primary-fg',
                      current && 'bg-primary-soft text-primary ring-2 ring-primary',
                      !reached && !current && 'bg-surface-2 text-fg-subtle',
                    )}
                  >
                    {reached ? <Check className="size-4" aria-hidden /> : current ? <span className="size-2 animate-pulse-dot rounded-full bg-primary" /> : i + 1}
                  </span>
                  <span className={cn('h-0.5 flex-1', i === STEPS.length - 1 ? 'opacity-0' : i < step ? 'bg-primary' : 'bg-border')} />
                </div>
                <span className={cn('text-[11px] font-medium leading-tight', reached || current ? 'text-fg' : 'text-fg-subtle')}>{label}</span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
