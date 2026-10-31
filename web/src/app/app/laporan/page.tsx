'use client'

import { Download, Repeat, UserPlus, Users, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { ColumnChart, ChartCard, HBarChart } from '@/components/reports/bar-chart'
import { Button } from '@/components/ui/button'
import { KpiCard } from '@/components/ui/kpi-card'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { toCsv } from '@/lib/csv'
import { presetRange } from '@swarapos/core/date-range'
import { jakartaDateKey } from '@swarapos/core/domain/order-number'
import { STATUS_LABEL } from '@swarapos/core/domain/order-status'
import { formatDate, formatRupiah } from '@swarapos/core/format'
import { CHANNEL_LABEL, PAYMENT_STATUS } from '@swarapos/core/labels'
import { buildReport } from '@swarapos/core/report'
import { useDemo } from '@/lib/store/demo-store'
import { useNow } from '@/lib/use-now'

const DAY = 24 * 60 * 60 * 1000
const compact = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt` : n >= 1000 ? `${Math.round(n / 1000)} rb` : String(Math.round(n)))

export default function LaporanPage() {
  const now = useNow()
  const orders = useDemo((s) => s.orders)
  const services = useDemo((s) => s.services)
  const outlets = useDemo((s) => s.outlets)
  const customers = useDemo((s) => s.customers)
  const [range, setRange] = useState(7)
  const [outletId, setOutletId] = useState('all')

  const report = useMemo(() => {
    // Rentang hari WIB penuh: N hari terakhir termasuk hari ini.
    const today = presetRange('today', now)!
    return buildReport({ orders, services }, { range: { from: today.from - (range - 1) * DAY, to: today.to }, outletId, now })
  }, [orders, services, outletId, range, now])

  const exportCsv = () => {
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
    a.download = `order-${jakartaDateKey(now)}-${range}hari.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast(`${report.orders.length} order diekspor ke CSV`)
  }

  return (
    <>
      <PageHeader
        title="Laporan"
        description={`Nilai order (tidak termasuk batal) · ${range} hari terakhir`}
        actions={
          <>
            <Select value={String(range)} onChange={(e) => setRange(Number(e.target.value))} aria-label="Rentang waktu" className="w-40">
              <option value="7">7 hari</option>
              <option value="30">30 hari</option>
              <option value="90">90 hari</option>
            </Select>
            <Select value={outletId} onChange={(e) => setOutletId(e.target.value)} aria-label="Outlet" className="w-44">
              <option value="all">Semua outlet</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name.replace('Laundry Bersih Kilat ', 'Outlet ')}
                </option>
              ))}
            </Select>
            <Button variant="secondary" onClick={exportCsv} disabled={report.orders.length === 0}>
              <Download aria-hidden />
              Export CSV
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard label="Nilai order" value={formatRupiah(report.total)} icon={Wallet} hint={`${report.orders.length} order`} />
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
      </div>
    </>
  )
}
