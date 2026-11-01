'use client'

import { ClipboardList, Plus, Search, Zap } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { PHASE_LABEL, StatusBadge } from '@/components/order/status-badge'
import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DateFilter } from '@/components/ui/date-filter'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Table, Td, Th, Tr } from '@/components/ui/table'
import { cn } from '@/lib/cn'
import { dateFilterRange, inRange, initialDateFilter } from '@swarapos/core/date-range'
import { statusPhase } from '@swarapos/core/domain/order-status'
import { formatRupiah } from '@swarapos/core/format'
import { formatDueIn, INTAKE_LABEL, PAYMENT_STATUS } from '@swarapos/core/labels'
import { isLate } from '@swarapos/core/selectors'
import { useCustomerMap, useOutletOrders } from '@/lib/store/hooks'
import type { Order, StatusPhase } from '@swarapos/core/types'
import { useNow } from '@/lib/use-now'

const PHASES: StatusPhase[] = ['intake', 'production', 'qc', 'ready', 'done', 'exception']

function itemSummary(o: Order) {
  const first = o.items[0]?.name ?? '-'
  return o.items.length > 1 ? `${first} +${o.items.length - 1}` : first
}

export default function OrderListPage() {
  const router = useRouter()
  const now = useNow()
  const orders = useOutletOrders()
  const customers = useCustomerMap()
  const [query, setQuery] = useState('')
  const [phase, setPhase] = useState<StatusPhase | 'all'>('all')
  const [payment, setPayment] = useState('all')
  const [intake, setIntake] = useState('all')
  const [dates, setDates] = useState(() => initialDateFilter('all', new Date()))

  const searched = useMemo(() => {
    // Tanggal order masuk, batas hari WIB.
    const range = dateFilterRange(dates, now)
    const q = query.trim().toLowerCase()
    const digits = q.replace(/\D/g, '')
    return [...orders]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter((o) => inRange(o.createdAt, range))
      .filter((o) => {
        if (!q) return true
        const c = customers.get(o.customerId)
        return (
          o.orderNo.toLowerCase().includes(q) ||
          c?.name.toLowerCase().includes(q) ||
          (digits.length >= 3 && c?.phone.replace(/\D/g, '').includes(digits))
        )
      })
      .filter((o) => (payment === 'all' ? true : o.paymentStatus === payment))
      .filter((o) => (intake === 'all' ? true : o.intake === intake))
  }, [orders, customers, query, payment, intake, dates, now])

  const visible = phase === 'all' ? searched : searched.filter((o) => statusPhase(o.status) === phase)
  const countFor = (p: StatusPhase) => searched.filter((o) => statusPhase(o.status) === p).length

  return (
    <>
      <PageHeader
        title="Order"
        description={dates.preset === 'all' ? `${orders.length} order di outlet ini` : `${searched.length} order pada tanggal terpilih`}
        actions={
          <ButtonLink href="/app/order/baru">
            <Plus aria-hidden />
            Order baru
          </ButtonLink>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <Input
              data-search
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nomor order, nama, atau telepon  ( / )"
              className="pl-9"
              aria-label="Cari order"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:flex lg:flex-wrap lg:items-center">
            <DateFilter value={dates} onChange={setDates} now={now} className="col-span-2 lg:col-span-1" />
            <Select value={payment} onChange={(e) => setPayment(e.target.value)} aria-label="Filter pembayaran" className="lg:w-44">
              <option value="all">Semua pembayaran</option>
              {Object.entries(PAYMENT_STATUS)
                .filter(([k]) => ['UNPAID', 'PARTIAL', 'PAID'].includes(k))
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
            </Select>
            <Select value={intake} onChange={(e) => setIntake(e.target.value)} aria-label="Filter penerimaan" className="lg:w-40">
              <option value="all">Semua penerimaan</option>
              {Object.entries(INTAKE_LABEL).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="scrollbar-thin flex gap-2 overflow-x-auto border-b border-border px-4 py-3">
          {(['all', ...PHASES] as const).map((p) => {
            const active = phase === p
            const count = p === 'all' ? searched.length : countFor(p)
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPhase(p)}
                aria-pressed={active}
                className={cn(
                  'inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors pointer-coarse:h-11',
                  active ? 'border-primary bg-primary-soft text-primary' : 'border-border text-fg-muted hover:text-fg',
                )}
              >
                {p === 'all' ? 'Semua' : PHASE_LABEL[p]}
                <span className="tabular text-xs opacity-80">{count}</span>
              </button>
            )
          })}
        </div>

        {visible.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Tidak ada order yang cocok" description="Ubah kata kunci atau filter untuk melihat order lain." />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <Th>No. order</Th>
                    <Th>Pelanggan</Th>
                    <Th>Layanan</Th>
                    <Th>Status</Th>
                    <Th>Pembayaran</Th>
                    <Th>Estimasi selesai</Th>
                    <Th className="text-right">Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((o) => {
                    const pay = PAYMENT_STATUS[o.paymentStatus]
                    const late = isLate(o, now)
                    return (
                      <Tr key={o.id} className="cursor-pointer hover:bg-surface-2/60" onClick={() => router.push(`/app/order/${o.id}`)}>
                        <Td>
                          <Link href={`/app/order/${o.id}`} className="font-mono text-sm font-semibold text-fg hover:text-primary" onClick={(e) => e.stopPropagation()}>
                            {o.orderNo}
                          </Link>
                          {o.express && (
                            <Badge tone="warning" className="ml-2">
                              <Zap aria-hidden />
                              Express
                            </Badge>
                          )}
                        </Td>
                        <Td className="font-medium">{customers.get(o.customerId)?.name}</Td>
                        <Td className="text-fg-muted">{itemSummary(o)}</Td>
                        <Td>
                          <StatusBadge status={o.status} />
                        </Td>
                        <Td>
                          <Badge tone={pay.tone}>{pay.label}</Badge>
                        </Td>
                        <Td className={cn('whitespace-nowrap text-sm', late ? 'font-semibold text-danger' : 'text-fg-muted')}>
                          {statusPhase(o.status) === 'done' || o.status === 'CANCELLED' ? '—' : formatDueIn(o.dueAt, now)}
                        </Td>
                        <Td className="tabular text-right font-semibold">{formatRupiah(o.totals.total)}</Td>
                      </Tr>
                    )
                  })}
                </tbody>
              </Table>
            </div>

            <ul className="divide-y divide-border md:hidden">
              {visible.map((o) => {
                const pay = PAYMENT_STATUS[o.paymentStatus]
                return (
                  <li key={o.id}>
                    <Link href={`/app/order/${o.id}`} className="flex flex-col gap-2 px-4 py-3.5 active:bg-surface-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-semibold text-fg">{o.orderNo}</span>
                        <span className="tabular text-sm font-semibold text-fg">{formatRupiah(o.totals.total)}</span>
                      </div>
                      <p className="text-sm text-fg-muted">
                        {customers.get(o.customerId)?.name} · {itemSummary(o)}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={o.status} />
                        <Badge tone={pay.tone}>{pay.label}</Badge>
                        {isLate(o, now) && <Badge tone="danger">{formatDueIn(o.dueAt, now)}</Badge>}
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </Card>
    </>
  )
}
