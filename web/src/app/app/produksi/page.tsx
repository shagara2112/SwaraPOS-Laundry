'use client'

import { Maximize2, Minimize2, WashingMachine } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { QcPanel } from '@/components/order/qc-panel'
import { ReasonDialog } from '@/components/order/reason-dialog'
import { OrderCard } from '@/components/production/order-card'
import { ScanBox } from '@/components/production/scan-box'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/cn'
import { STATUS_LABEL } from '@swarapos/core/domain/order-status'
import { HOLD_STATUSES, PRODUCTION_COLUMNS } from '@swarapos/core/production'
import { isLate } from '@swarapos/core/selectors'
import { act } from '@/lib/store/act'
import { transitionOrder } from '@swarapos/core/store/actions-order'
import { useDemo } from '@/lib/store/demo-store'
import { useCustomerMap, useOutletOrders } from '@/lib/store/hooks'
import { useUi } from '@/lib/store/ui-store'
import type { Order, OrderStatus } from '@swarapos/core/types'
import { useNow } from '@/lib/use-now'

function Toggle({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn(
        'inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors',
        on ? 'border-primary bg-primary-soft text-primary' : 'border-border text-fg-muted hover:text-fg',
      )}
    >
      <span className={cn('h-4 w-7 rounded-full p-0.5 transition-colors', on ? 'bg-primary' : 'bg-border-strong')}>
        <span className={cn('block size-3 rounded-full bg-white transition-transform', on && 'translate-x-3')} />
      </span>
      {children}
    </button>
  )
}

export default function ProduksiPage() {
  const now = useNow(30_000)
  const orders = useOutletOrders()
  const customers = useCustomerMap()
  const services = useDemo((s) => s.services)
  const focusMode = useUi((s) => s.focusMode)
  const setFocusMode = useUi((s) => s.setFocusMode)

  const [serviceId, setServiceId] = useState('all')
  const [onlyLate, setOnlyLate] = useState(false)
  const [onlyExpress, setOnlyExpress] = useState(false)
  const [holdFor, setHoldFor] = useState<Order | null>(null)
  const [qcFor, setQcFor] = useState<string | null>(null)

  // Mode layar besar hanya berlaku di halaman ini.
  useEffect(() => () => setFocusMode(false), [setFocusMode])

  const filtered = useMemo(
    () =>
      orders
        .filter((o) => (serviceId === 'all' ? true : o.items.some((i) => i.serviceId === serviceId)))
        .filter((o) => (onlyLate ? isLate(o, now) : true))
        .filter((o) => (onlyExpress ? o.express : true))
        .sort((a, b) => {
          const late = Number(isLate(b, now)) - Number(isLate(a, now))
          if (late) return late
          const express = Number(b.express) - Number(a.express)
          if (express) return express
          return a.dueAt.localeCompare(b.dueAt)
        }),
    [orders, serviceId, onlyLate, onlyExpress, now],
  )

  const columns = PRODUCTION_COLUMNS.map((c) => ({ ...c, orders: filtered.filter((o) => c.statuses.includes(o.status)) }))
  const held = filtered.filter((o) => HOLD_STATUSES.includes(o.status))
  const lanes = held.length > 0 ? [...columns, { id: 'hold', label: 'Ditahan / kendala', statuses: HOLD_STATUSES, orders: held }] : columns
  const qcOrder = orders.find((o) => o.id === qcFor && o.status === 'QUALITY_CHECK')

  const advance = (order: Order, to: OrderStatus) =>
    act((s) => transitionOrder(s, order.id, to, {}, s.tenantActor, new Date()), `${order.orderNo} → ${STATUS_LABEL[to]}`)

  return (
    <div className={cn(focusMode && 'theme-dark -mx-4 -mt-5 min-h-dvh bg-bg px-4 pt-5 text-fg sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8')}>
      {focusMode ? (
        <div className="mb-5 flex items-center gap-3">
          <WashingMachine className="size-7 text-brand-cyan" aria-hidden />
          <h1 className="text-2xl font-bold">Papan produksi</h1>
          <div className="ml-auto flex w-full max-w-xl items-center gap-3">
            <div className="flex-1">
              <ScanBox large />
            </div>
            <Button size="lg" variant="secondary" onClick={() => setFocusMode(false)}>
              <Minimize2 aria-hidden />
              Keluar
            </Button>
          </div>
        </div>
      ) : (
        <>
          <PageHeader
            title="Papan produksi"
            description="Urutan kartu: terlambat, express, lalu jatuh tempo terdekat."
            actions={
              <Button variant="secondary" onClick={() => setFocusMode(true)}>
                <Maximize2 aria-hidden />
                Mode layar besar
              </Button>
            }
          />
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex-1">
              <ScanBox large={false} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)} aria-label="Filter layanan" className="w-56">
                <option value="all">Semua layanan</option>
                {services
                  .filter((s) => s.unit !== 'ADDON')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </Select>
              <Toggle on={onlyLate} onChange={setOnlyLate}>
                Hanya terlambat
              </Toggle>
              <Toggle on={onlyExpress} onChange={setOnlyExpress}>
                Hanya express
              </Toggle>
            </div>
          </div>
        </>
      )}

      <div className="scrollbar-thin -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {lanes.map((col) => (
          <section
            key={col.id}
            aria-label={`Kolom ${col.label}`}
            className={cn(
              'flex shrink-0 snap-start flex-col rounded-2xl bg-surface-2/70 p-2.5',
              focusMode ? 'w-[21rem]' : 'w-[17.5rem]',
              col.id === 'hold' && 'bg-phase-exception-soft/60',
            )}
          >
            <header className="flex items-center justify-between px-1.5 pb-2.5 pt-1">
              <h2 className={cn('font-semibold text-fg', focusMode ? 'text-lg' : 'text-sm')}>{col.label}</h2>
              <span className="tabular rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-fg-muted">{col.orders.length}</span>
            </header>
            <div className="flex flex-col gap-2.5">
              {col.orders.length === 0 && <p className="px-1.5 py-6 text-center text-xs text-fg-subtle">Kosong</p>}
              {col.orders.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  customer={customers.get(o.customerId)}
                  now={now}
                  large={focusMode}
                  onAdvance={(to) => advance(o, to)}
                  onHold={() => setHoldFor(o)}
                  onQc={() => setQcFor(o.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <ReasonDialog
        open={!!holdFor}
        title="Tahan order"
        description={holdFor ? `${holdFor.orderNo} keluar dari antrean sampai dilanjutkan.` : undefined}
        placeholder="Contoh: mesin pengering 2 rusak"
        confirmLabel="Tahan"
        onClose={() => setHoldFor(null)}
        onConfirm={(reason) => {
          if (!holdFor) return
          const r = act((s) => transitionOrder(s, holdFor.id, 'ON_HOLD', { reason }, s.tenantActor, new Date()), `${holdFor.orderNo} ditahan`)
          if (r.ok) setHoldFor(null)
        }}
      />

      <Dialog open={!!qcOrder} onClose={() => setQcFor(null)} title={qcOrder ? `QC · ${qcOrder.orderNo}` : 'QC'} size="lg">
        {qcOrder && <QcPanel key={qcOrder.version} order={qcOrder} size={focusMode ? 'xl' : 'md'} />}
      </Dialog>
    </div>
  )
}
