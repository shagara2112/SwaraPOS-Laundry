'use client'

import { Banknote, CalendarDays, Download, Repeat, UserPlus, Users, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { ColumnChart, ChartCard, HBarChart } from '@/components/reports/bar-chart'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { DateFilter } from '@/components/ui/date-filter'
import { EmptyState } from '@/components/ui/empty-state'
import { KpiCard } from '@/components/ui/kpi-card'
import { Select } from '@/components/ui/select'
import { Table, Td, Th, Tr } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { toCsv } from '@/lib/csv'
import { cashSummary } from '@swarapos/core/cash'
import { DATE_PRESETS, dateFilterRange, initialDateFilter } from '@swarapos/core/date-range'
import { jakartaDateKey } from '@swarapos/core/domain/order-number'
import { STATUS_LABEL } from '@swarapos/core/domain/order-status'
import { formatDate, formatRupiah } from '@swarapos/core/format'
import { CHANNEL_LABEL, PAYMENT_STATUS } from '@swarapos/core/labels'
import { buildReport } from '@swarapos/core/report'
import { useDemo } from '@/lib/store/demo-store'
import { useNow } from '@/lib/use-now'

// Laporan selalu punya rentang, jadi tanpa preset "Semua".
const REPORT_PRESETS = DATE_PRESETS.filter((p) => p.id !== 'all')
const compact = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt` : n >= 1000 ? `${Math.round(n / 1000)} rb` : String(Math.round(n)))

export default function LaporanPage() {
  const now = useNow()
  const orders = useDemo((s) => s.orders)
  const services = useDemo((s) => s.services)
  const outlets = useDemo((s) => s.outlets)
  const customers = useDemo((s) => s.customers)
  const [dates, setDates] = useState(() => initialDateFilter('7d', new Date()))
  const [outletId, setOutletId] = useState('all')

  const range = useMemo(() => dateFilterRange(dates, now), [dates, now])
  const report = useMemo(() => (range ? buildReport({ orders, services }, { range, outletId, now }) : null), [orders, services, outletId, range, now])
  const cash = useMemo(() => (range ? cashSummary(orders, { range, outletId }) : null), [orders, outletId, range])
  // Hari terakhir rentang = akhir eksklusif dikurangi 1 ms.
  const lastDay = range ? new Date(range.to - 1) : null
  const rangeLabel =
    range && dates.preset === 'custom' ? `${formatDate(new Date(range.from).toISOString())} – ${formatDate(lastDay!.toISOString())}` : (DATE_PRESETS.find((p) => p.id === dates.preset)?.label ?? '')

  const exportCsv = () => {
    if (!report || !range) return
    const name = (id: string) => customers.find((c) => c.id === id)?.name ?? ''
    const csv = toCsv(
      report.orders.map((o) => ({
        'No. order': o.orderNo,
        Tanggal: formatDate(o.createdAt),
        Pelanggan: name(o.customerId),
        Outlet: outlets.find((x) => x.id === o.outletId)?.code ?? '',
        Kanal: CHANNEL_LABEL[o.channel],
        Status: STATUS_LABEL[o.status],
        Pembayaran: PAYMENT_STATUS[o.paymentStatus].label,
        Total: o.totals.total,
      })),
    )
    // BOM agar Excel membaca karakter Indonesia dengan benar.
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `order-${jakartaDateKey(new Date(range.from))}_${jakartaDateKey(lastDay!)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast(`${report.orders.length} order diekspor ke CSV`)
  }

  return (
    <>
      <PageHeader
        title="Laporan"
        description={range ? `Nilai order (tidak termasuk batal) · ${rangeLabel}` : 'Pilih tanggal awal dan akhir'}
        actions={
          <>
            <DateFilter value={dates} onChange={setDates} now={now} presets={REPORT_PRESETS} />
            <Select value={outletId} onChange={(e) => setOutletId(e.target.value)} aria-label="Outlet" className="w-44">
              <option value="all">Semua outlet</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name.replace('Laundry Bersih Kilat ', 'Outlet ')}
                </option>
              ))}
            </Select>
            <Button variant="secondary" onClick={exportCsv} disabled={!report || report.orders.length === 0}>
              <Download aria-hidden />
              Export CSV
            </Button>
          </>
        }
      />

      {!report ? (
        <Card>
          <EmptyState icon={CalendarDays} title="Pilih tanggal awal dan akhir" description="Laporan muncul setelah kedua tanggal terisi." />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <KpiCard label="Nilai order" value={formatRupiah(report.total)} icon={Wallet} hint={`${report.orders.length} order${report.discount ? ` · diskon ${formatRupiah(report.discount)}` : ''}`} />
            <KpiCard label="Pelanggan aktif" value={report.active} icon={Users} tone="cyan" />
            <KpiCard label="Pelanggan baru" value={report.newCustomers} icon={UserPlus} tone="success" hint="Order pertama di rentang ini" />
            <KpiCard
              label="Pelanggan repeat"
              value={report.repeat}
              icon={Repeat}
              tone="violet"
              hint={report.active ? `${Math.round((report.repeat / report.active) * 100)}% dari pelanggan aktif` : undefined}
            />
          </div>

          <div className="mt-6 grid gap-6">
            <ChartCard title="Nilai order harian" description="Total order masuk per hari (WIB)" data={report.days} format={formatRupiah}>
              <ColumnChart data={report.days} format={formatRupiah} formatAxis={compact} />
            </ChartCard>
            <div className="grid gap-6 xl:grid-cols-2">
              <ChartCard title="Per layanan" data={report.byService} format={formatRupiah}>
                <HBarChart data={report.byService} format={formatRupiah} />
              </ChartCard>
              <ChartCard title="Per kanal" data={report.byChannel} format={formatRupiah}>
                <HBarChart data={report.byChannel} format={formatRupiah} />
              </ChartCard>
            </div>
            <ChartCard title="Produktivitas tahap" description="Jumlah order yang masuk ke tiap tahap pada rentang ini" data={report.byStage} format={(n) => `${n} order`}>
              <HBarChart data={report.byStage} format={(n) => `${n}`} />
            </ChartCard>
            {cash && (
              <Card>
                <CardHeader
                  title={
                    <span className="flex items-center gap-2">
                      <Banknote className="size-5 text-phase-done" aria-hidden />
                      Kas masuk
                    </span>
                  }
                  description="Pembayaran yang dicatat pada rentang ini, untuk dicocokkan dengan laci kas, rekening, dan QRIS."
                  action={<span className="tabular text-lg font-bold text-fg">{formatRupiah(cash.total)}</span>}
                />
                <CardBody className="space-y-5">
                  <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {cash.byMethod.map((m) => (
                      <div key={m.method} className="rounded-xl bg-surface-2 p-3">
                        <dt className="text-xs text-fg-subtle">{m.label}</dt>
                        <dd className="tabular mt-0.5 font-semibold text-fg">{formatRupiah(m.total)}</dd>
                        <dd className="text-xs text-fg-subtle">{m.count} transaksi</dd>
                      </div>
                    ))}
                  </dl>
                  {cash.refunds.count > 0 && (
                    <p className="text-sm text-fg-muted">
                      Termasuk {cash.refunds.count} refund senilai <span className="tabular font-semibold text-danger">{formatRupiah(-cash.refunds.total)}</span>.
                    </p>
                  )}
                  {cash.byActor.length === 0 ? (
                    <p className="text-sm text-fg-subtle">Belum ada pembayaran pada rentang ini.</p>
                  ) : (
                    <Table>
                      <thead>
                        <tr>
                          <Th>Dicatat oleh</Th>
                          <Th className="text-right">Transaksi</Th>
                          <Th className="text-right">Total</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {cash.byActor.map((a) => (
                          <Tr key={a.id}>
                            <Td className="font-medium text-fg">{a.name}</Td>
                            <Td className="tabular text-right">{a.count}</Td>
                            <Td className="tabular text-right font-semibold">{formatRupiah(a.total)}</Td>
                          </Tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </CardBody>
              </Card>
            )}
          </div>
        </>
      )}
    </>
  )
}
