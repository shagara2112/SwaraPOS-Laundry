'use client'

import { ArrowRight, CirclePause, Clock, ExternalLink, ShieldCheck, Zap } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/order/status-badge'
import { cn } from '@/lib/cn'
import { STATUS_LABEL, statusPhase } from '@/lib/domain/order-status'
import { formatDueIn, formatQty } from '@/lib/labels'
import { primaryNext } from '@/lib/production'
import { isLate } from '@/lib/selectors'
import type { Customer, Order, OrderStatus } from '@/lib/types'

const THREE_HOURS = 3 * 60 * 60 * 1000

function actionLabel(order: Order, to: OrderStatus): string {
  if (order.status === 'ON_HOLD' || order.status === 'ISSUE_REPORTED') return `Lanjutkan ${STATUS_LABEL[to].toLowerCase()}`
  if (to === 'COMPLETED') return 'Diambil pelanggan'
  if (to === 'OUT_FOR_DELIVERY') return 'Serahkan ke kurir'
  return STATUS_LABEL[to]
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function OrderCard({
  order,
  customer,
  now,
  large,
  onAdvance,
  onHold,
  onQc,
}: {
  order: Order
  customer: Customer | undefined
  now: Date
  large: boolean
  onAdvance: (to: OrderStatus) => void
  onHold: () => void
  onQc: () => void
}) {
  const late = isLate(order, now)
  const soon = !late && new Date(order.dueAt).getTime() - now.getTime() < THREE_HOURS
  const next = primaryNext(order)
  const held = order.status === 'ON_HOLD' || order.status === 'ISSUE_REPORTED'
  const lastNote = held ? [...order.history].reverse().find((e) => e.to === order.status)?.note : undefined
  // Di kolom satu-status (Cuci, Kering, ...) nama kolom sudah menyebut statusnya.
  const showStatus = statusPhase(order.status) !== 'production'
  const iconButton = 'grid size-11 shrink-0 place-items-center rounded-xl text-fg-subtle hover:bg-surface-2 hover:text-fg'

  return (
    <article
      className={cn(
        'rounded-xl border bg-surface shadow-card transition-shadow hover:shadow-pop',
        late ? 'border-danger/50' : 'border-border',
        large ? 'p-4' : 'p-3',
      )}
    >
      <div className="-mr-1.5 -mt-1.5 flex items-start justify-between gap-1">
        <Link href={`/app/order/${order.id}`} className={cn('pt-2 font-mono font-bold text-fg hover:text-primary', large ? 'text-lg' : 'text-sm')}>
          {order.orderNo}
        </Link>
        <div className="flex">
          {!held && (
            <button type="button" onClick={onHold} className={iconButton} aria-label={`Tahan ${order.orderNo}`} title="Tahan">
              <CirclePause className="size-5" />
            </button>
          )}
          <Link href={`/app/order/${order.id}`} className={iconButton} aria-label={`Detail ${order.orderNo}`} title="Detail order">
            <ExternalLink className="size-[18px]" />
          </Link>
        </div>
      </div>
      <p className={cn('truncate font-medium text-fg', large ? 'text-base' : 'text-sm')}>{customer?.name}</p>
      <p className={cn('mt-0.5 text-fg-muted', large ? 'text-sm' : 'text-xs')}>
        {order.items
          .filter((i) => i.unit !== 'ADDON')
          .map((i) => `${i.name} · ${formatQty(i.unit, i.qty)}`)
          .join(', ')}
      </p>
      {(showStatus || order.express) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {showStatus && <StatusBadge status={order.status} />}
          {order.express && (
            <Badge tone="warning">
              <Zap aria-hidden />
              Express
            </Badge>
          )}
        </div>
      )}
      {lastNote && <p className="mt-2 rounded-lg bg-phase-exception-soft px-2.5 py-1.5 text-xs text-phase-exception">{lastNote}</p>}
      <p
        className={cn(
          'mt-2 flex items-center gap-1.5 font-medium',
          large ? 'text-sm' : 'text-xs',
          late ? 'text-danger' : soon ? 'text-phase-qc' : 'text-fg-subtle',
        )}
      >
        <Clock className="size-3.5" aria-hidden />
        {capitalize(formatDueIn(order.dueAt, now))}
      </p>

      <div className="mt-3">
        {order.status === 'QUALITY_CHECK' ? (
          <Button size={large ? 'xl' : 'md'} className="w-full" onClick={onQc}>
            <ShieldCheck aria-hidden />
            Periksa QC
          </Button>
        ) : (
          next && (
            <Button
              size={large ? 'xl' : 'md'}
              variant={held ? 'secondary' : 'primary'}
              className="w-full"
              onClick={() => onAdvance(next)}
              aria-label={`${order.orderNo}: ${actionLabel(order, next)}`}
            >
              <span className="truncate">{actionLabel(order, next)}</span>
              <ArrowRight aria-hidden />
            </Button>
          )
        )}
      </div>
    </article>
  )
}
