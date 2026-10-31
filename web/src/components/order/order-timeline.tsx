import { NotebookPen } from 'lucide-react'
import { STATUS_LABEL, statusPhase } from '@/lib/domain/order-status'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/format'
import type { StatusEvent } from '@/lib/types'
import { statusIcon } from './status-badge'

const DOT: Record<string, string> = {
  intake: 'bg-phase-intake-soft text-phase-intake',
  production: 'bg-phase-production-soft text-phase-production',
  qc: 'bg-phase-qc-soft text-phase-qc',
  ready: 'bg-phase-ready-soft text-phase-ready',
  done: 'bg-phase-done-soft text-phase-done',
  exception: 'bg-phase-exception-soft text-phase-exception',
}

/** Riwayat terbaru di atas. Event tanpa perubahan status (mis. hasil QC) tampil sebagai catatan. */
export function OrderTimeline({ history, showActor = true }: { history: StatusEvent[]; showActor?: boolean }) {
  const events = [...history].reverse()
  return (
    <ol className="relative space-y-5">
      <span className="absolute bottom-2 left-[17px] top-2 w-px bg-border" aria-hidden />
      {events.map((e, i) => {
        const isNote = e.from === e.to
        const Icon = isNote ? NotebookPen : statusIcon(e.to)
        return (
          <li key={e.id} className="relative flex gap-3">
            <span
              className={cn(
                'relative z-10 grid size-9 shrink-0 place-items-center rounded-full ring-4 ring-surface',
                DOT[statusPhase(e.to)],
                i === 0 && !isNote && 'ring-primary-soft',
              )}
            >
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 pt-1.5">
              <p className="text-sm font-semibold text-fg">{isNote ? 'Catatan QC' : STATUS_LABEL[e.to]}</p>
              <p className="mt-0.5 text-xs text-fg-subtle">
                {formatDateTime(e.at)}
                {showActor && ` · ${e.actor.name}`}
              </p>
              {e.note && <p className="mt-1.5 rounded-lg bg-surface-2 px-3 py-2 text-sm text-fg-muted">{e.note}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
