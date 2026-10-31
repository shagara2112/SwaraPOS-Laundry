'use client'

import { AlarmClock, ArrowRight, ClipboardList, HandCoins, MessageCircle, Plus, Truck, Wallet, WashingMachine } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { StatusBadge } from '@/components/order/status-badge'
import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { KpiCard } from '@/components/ui/kpi-card'
import { WA_EVENT_LABEL } from '@/lib/domain/whatsapp'
import { cn } from '@/lib/cn'
import { formatDate, formatRupiah } from '@/lib/format'
import { formatDueIn } from '@/lib/labels'
import { PRODUCTION_COLUMNS } from '@/lib/production'
import { dashboardKpis, isLate } from '@/lib/selectors'
import { useDemo } from '@/lib/store/demo-store'
import { useActiveOutlet, useCustomerMap, useOutletOrders } from '@/lib/store/hooks'
import { useNow } from '@/lib/use-now'

function greeting(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false }).format(now))
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 18) return 'Selamat sore'
  return 'Selamat malam'
}

const SIX_HOURS = 6 * 60 * 60 * 1000

export default function RingkasanPage() {
  const now = useNow()
  const outlet = useActiveOutlet()
  const orders = useOutletOrders()
  const customers = useCustomerMap()
  const state = useDemo()
  const tasks = useDemo((s) => s.deliveryTasks)

  const kpi = useMemo(() => dashboardKpis({ ...state, orders }, now), [state, orders, now])

  const stageCounts = PRODUCTION_COLUMNS.map((col) => ({
    ...col,
    count: orders.filter((o) => col.statuses.includes(o.status)).length,
  }))
  const maxStage = Math.max(1, ...stageCounts.map((s) => s.count))

  const attention = orders
    .filter((o) => isLate(o, now) || (o.status !== 'CANCELLED' && !['DELIVERED', 'COMPLETED'].includes(o.status) && new Date(o.dueAt).getTime() - now.getTime() < SIX_HOURS))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .slice(0, 6)

  const waPending = orders
    .flatMap((o) => o.whatsapp.filter((l) => l.state !== 'SENT').map((l) => ({ order: o, log: l })))
    .slice(0, 6)

  const orderIds = new Set(orders.map((o) => o.id))
  const openTasks = tasks.filter((t) => orderIds.has(t.orderId) && t.status !== 'DONE' && t.status !== 'FAILED')

  return (
    <>
      <PageHeader
        title={`${greeting(now)}, Rina`}
        description={`${outlet.name} · ${formatDate(now.toISOString())}`}
        actions={
          <>
            <ButtonLink href="/app/produksi" variant="secondary">
              <WashingMachine aria-hidden />
              Papan produksi
            </ButtonLink>
            <ButtonLink href="/app/order/baru">
              <Plus aria-hidden />
              Order baru
              <kbd className="ml-1 hidden rounded bg-white/20 px-1.5 font-mono text-[11px] sm:inline">N</kbd>
            </ButtonLink>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard label="Order hari ini" value={kpi.ordersToday} icon={ClipboardList} hint="Masuk sejak 00.00 WIB" />
        <KpiCard label="Omzet hari ini" value={formatRupiah(kpi.revenueToday)} icon={Wallet} tone="success" hint="Pembayaran yang tercatat hari ini" />
        <KpiCard label="Order terlambat" value={kpi.lateCount} icon={AlarmClock} tone={kpi.lateCount > 0 ? 'danger' : 'success'} hint="Lewat estimasi selesai" />
        <KpiCard label="Piutang" value={formatRupiah(kpi.receivables)} icon={HandCoins} tone="warning" hint="Sisa tagihan order aktif" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader
            title="Antrean produksi"
            description="Jumlah order di tiap tahap saat ini"
            action={
              <Link href="/app/produksi" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                Buka papan <ArrowRight className="size-4" aria-hidden />
              </Link>
            }
          />
          <CardBody>
            <ul className="space-y-3">
              {stageCounts.map((s) => (
                <li key={s.id} className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-3 text-sm" title={`${s.label}: ${s.count} order`}>
                  <span className="text-fg-muted">{s.label}</span>
                  <span className="h-2.5 rounded-full bg-surface-2">
                    <span
                      className="block h-full rounded-full bg-primary transition-[width] duration-300"
                      style={{ width: `${(s.count / maxStage) * 100}%`, minWidth: s.count > 0 ? '0.625rem' : 0 }}
                    />
                  </span>
                  <span className="tabular text-right font-semibold text-fg">{s.count}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Perlu perhatian" description="Terlambat atau jatuh tempo dalam 6 jam" />
          <CardBody className="pt-3">
            {attention.length === 0 ? (
              <EmptyState icon={AlarmClock} title="Semua sesuai jadwal" className="py-6" />
            ) : (
              <ul className="divide-y divide-border">
                {attention.map((o) => (
                  <li key={o.id}>
                    <Link href={`/app/order/${o.id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-surface-2">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold text-fg">{o.orderNo}</p>
                        <p className="truncate text-xs text-fg-subtle">{customers.get(o.customerId)?.name}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge status={o.status} />
                        <span className={cn('text-xs font-medium', isLate(o, now) ? 'text-danger' : 'text-phase-qc')}>{formatDueIn(o.dueAt, now)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="WhatsApp belum dikirim" description="Notifikasi status yang menunggu staf" />
          <CardBody className="pt-3">
            {waPending.length === 0 ? (
              <EmptyState icon={MessageCircle} title="Semua notifikasi terkirim" className="py-6" />
            ) : (
              <ul className="divide-y divide-border">
                {waPending.map(({ order, log }) => (
                  <li key={log.id}>
                    <Link href={`/app/order/${order.id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-surface-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-fg">{customers.get(order.customerId)?.name}</p>
                        <p className="font-mono text-xs text-fg-subtle">{order.orderNo}</p>
                      </div>
                      <Badge tone={log.state === 'OPENED' ? 'primary' : 'warning'}>
                        <MessageCircle aria-hidden />
                        {WA_EVENT_LABEL[log.event]}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Antar-jemput aktif"
            description="Tugas kurir yang belum selesai"
            action={
              <Link href="/app/pengantaran" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                Kelola <ArrowRight className="size-4" aria-hidden />
              </Link>
            }
          />
          <CardBody className="grid grid-cols-3 gap-3">
            {[
              { label: 'Belum ditugaskan', value: openTasks.filter((t) => t.status === 'UNASSIGNED').length, tone: 'text-phase-qc' },
              { label: 'Jemput', value: openTasks.filter((t) => t.type === 'PICKUP').length, tone: 'text-phase-intake' },
              { label: 'Antar', value: openTasks.filter((t) => t.type === 'DELIVERY').length, tone: 'text-phase-ready' },
            ].map((x) => (
              <div key={x.label} className="rounded-xl bg-surface-2 p-3 text-center">
                <Truck className={cn('mx-auto size-5', x.tone)} aria-hidden />
                <p className="tabular mt-2 text-2xl font-bold text-fg">{x.value}</p>
                <p className="text-xs text-fg-subtle">{x.label}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </>
  )
}
