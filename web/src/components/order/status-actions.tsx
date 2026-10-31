'use client'

import { Ban, CirclePause, TriangleAlert, Truck, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Button, ButtonLink } from '@/components/ui/button'
import { nextStatuses, requiresReason, STATUS_LABEL } from '@/lib/domain/order-status'
import { resumeTarget } from '@/lib/selectors'
import { act } from '@/lib/store/act'
import { transitionOrder } from '@/lib/store/actions-order'
import type { Order, OrderStatus } from '@/lib/types'
import { ReasonDialog } from './reason-dialog'

const EXCEPTION_META: Partial<Record<OrderStatus, { label: string; title: string; icon: LucideIcon; placeholder: string }>> = {
  ON_HOLD: { label: 'Tahan', title: 'Tahan order', icon: CirclePause, placeholder: 'Contoh: menunggu konfirmasi pelanggan soal noda' },
  ISSUE_REPORTED: { label: 'Laporkan kendala', title: 'Laporkan kendala', icon: TriangleAlert, placeholder: 'Contoh: kancing lepas saat dicuci' },
  CANCELLED: { label: 'Batalkan', title: 'Batalkan order', icon: Ban, placeholder: 'Contoh: pelanggan membatalkan' },
}

const COURIER_STATUSES: OrderStatus[] = ['PICKUP_ASSIGNED', 'PICKED_UP', 'DELIVERED']

function forwardLabel(order: Order, to: OrderStatus): string {
  if (order.status === 'ON_HOLD' || order.status === 'ISSUE_REPORTED') return `Lanjutkan: ${STATUS_LABEL[to]}`
  if (order.status === 'READY_FOR_PICKUP' && to === 'COMPLETED') return 'Diambil pelanggan'
  return `Ubah ke ${STATUS_LABEL[to]}`
}

/** Tombol transisi sesuai mesin status. Di tahap QC, keputusan diambil lewat panel QC. */
export function StatusActions({ order }: { order: Order }) {
  const [reasonFor, setReasonFor] = useState<OrderStatus | null>(null)
  const next = nextStatuses(order.status, resumeTarget(order))
  let forward = next.filter((s) => !requiresReason(s))
  // Jemput dan serah-terima wajib lewat tugas kurir (dengan bukti), bukan tombol di sini.
  const viaCourier = forward.filter((s) => COURIER_STATUSES.includes(s))
  forward = forward.filter((s) => !COURIER_STATUSES.includes(s))
  if (order.status === 'QUALITY_CHECK') forward = []
  if (order.status === 'READY_FOR_PICKUP' && order.handback === 'SELF_PICKUP') forward = [...forward].reverse()
  const exceptions = next.filter(requiresReason)

  const go = (to: OrderStatus, reason?: string) =>
    act((s) => transitionOrder(s, order.id, to, { reason }, s.tenantActor, new Date()), `Status: ${STATUS_LABEL[to]}`)

  const meta = reasonFor ? EXCEPTION_META[reasonFor] : undefined

  return (
    <div className="flex flex-wrap items-center gap-2">
      {forward.map((to, i) => (
        <Button key={to} variant={i === 0 ? 'primary' : 'secondary'} onClick={() => go(to)}>
          {forwardLabel(order, to)}
        </Button>
      ))}
      {viaCourier.length > 0 && (
        <ButtonLink href="/app/pengantaran" variant={forward.length === 0 ? 'primary' : 'secondary'}>
          <Truck aria-hidden />
          {STATUS_LABEL[viaCourier[0]]} lewat Pickup & Antar
        </ButtonLink>
      )}
      {exceptions.map((to) => {
        const m = EXCEPTION_META[to]!
        return (
          <Button key={to} variant="ghost" onClick={() => setReasonFor(to)} className={to === 'CANCELLED' ? 'text-danger hover:text-danger' : undefined}>
            <m.icon aria-hidden />
            {m.label}
          </Button>
        )
      })}
      <ReasonDialog
        open={!!meta}
        title={meta?.title ?? ''}
        description={`${order.orderNo} · alasan tercatat di riwayat order dan audit log.`}
        placeholder={meta?.placeholder}
        confirmLabel={meta?.label ?? 'Simpan'}
        onClose={() => setReasonFor(null)}
        onConfirm={(reason) => {
          if (reasonFor && go(reasonFor, reason).ok) setReasonFor(null)
        }}
      />
    </div>
  )
}
