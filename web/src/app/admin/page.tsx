'use client'

import { ArrowRight, Building2, CircleAlert, Receipt, Store, Wallet } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { ChartCard, ColumnChart } from '@/components/reports/bar-chart'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { KpiCard } from '@/components/ui/kpi-card'
import { cn } from '@/lib/cn'
import { formatDateTime, formatRupiah } from '@/lib/format'
import { SUBMISSION_STATUS, TENANT_STATUS } from '@/lib/labels'
import { useDemo } from '@/lib/store/demo-store'
import type { TenantStatus } from '@/lib/types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const HEALTH_TONE = { UP: 'success', DEGRADED: 'warning', DOWN: 'danger' } as const
const HEALTH_LABEL = { UP: 'Normal', DEGRADED: 'Terganggu', DOWN: 'Mati' }

export default function AdminOverviewPage() {
  const tenants = useDemo((s) => s.platform.tenants)
  const plans = useDemo((s) => s.platform.plans)
  const submissions = useDemo((s) => s.platform.submissions)
  const health = useDemo((s) => s.platform.health)
  const now = useDemo((s) => s.now)

  const stats = useMemo(() => {
    const priceOf = (code: string) => plans.find((p) => p.code === code)?.pricePerOutletMonth ?? 0
    const active = tenants.filter((t) => t.status === 'ACTIVE')
    const base = new Date(now)
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth() - (5 - i), 1)
      return {
        label: `${MONTHS[d.getMonth()]}`,
        value: tenants.filter((t) => {
          const c = new Date(t.createdAt)
          return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth()
        }).length,
      }
    })
    return {
      mrr: active.reduce((sum, t) => sum + priceOf(t.plan) * t.outletCount, 0),
      outlets: active.reduce((sum, t) => sum + t.outletCount, 0),
      byStatus: (Object.keys(TENANT_STATUS) as TenantStatus[]).map((st) => ({ st, count: tenants.filter((t) => t.status === st).length })),
      months,
    }
  }, [tenants, plans, now])

  const pending = submissions.filter((s) => s.status === 'UNDER_REVIEW' || s.status === 'AMOUNT_MISMATCH_REVIEW')
  const tenantName = (id: string) => tenants.find((t) => t.id === id)?.name ?? id

  return (
    <>
      <PageHeader title="Ringkasan platform" description="Kesehatan bisnis SwaraPOS dan antrean kerja tim." />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard label="MRR" value={formatRupiah(stats.mrr)} icon={Wallet} tone="success" hint="Tenant aktif × harga paket × outlet" />
        <KpiCard label="Tenant" value={tenants.length} icon={Building2} hint={`${tenants.filter((t) => t.status === 'ACTIVE').length} aktif`} />
        <KpiCard label="Outlet aktif" value={stats.outlets} icon={Store} tone="cyan" />
        <KpiCard label="Menunggu review" value={pending.length} icon={Receipt} tone={pending.length ? 'warning' : 'success'} hint="Bukti bayar langganan" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <ChartCard title="Tenant baru" description="Pendaftaran per bulan, 6 bulan terakhir" data={stats.months} format={(n) => `${n} tenant`}>
          <ColumnChart data={stats.months} format={(n) => `${n} tenant`} formatAxis={(n) => (Number.isInteger(n) ? String(n) : '')} />
        </ChartCard>
        <Card>
          <CardHeader title="Status tenant" />
          <CardBody className="space-y-2 pt-3">
            {stats.byStatus.map(({ st, count }) => (
              <div key={st} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5">
                <Badge tone={TENANT_STATUS[st].tone}>{TENANT_STATUS[st].label}</Badge>
                <span className="tabular text-lg font-bold text-fg">{count}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Antrean review pembayaran"
            action={
              <Link href="/admin/pembayaran" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                Buka antrean <ArrowRight className="size-4" aria-hidden />
              </Link>
            }
          />
          <CardBody className="pt-3">
            {pending.length === 0 ? (
              <p className="py-6 text-center text-sm text-fg-subtle">Tidak ada bukti yang menunggu.</p>
            ) : (
              <ul className="divide-y divide-border">
                {pending.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg">{tenantName(s.tenantId)}</p>
                      <p className="text-xs text-fg-subtle">
                        {formatDateTime(s.submittedAt)} · {formatRupiah(s.amountClaimed)}
                      </p>
                    </div>
                    <Badge tone={SUBMISSION_STATUS[s.status].tone}>{SUBMISSION_STATUS[s.status].label}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Kesehatan layanan"
            action={
              <Link href="/admin/kesehatan" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                Detail <ArrowRight className="size-4" aria-hidden />
              </Link>
            }
          />
          <CardBody className="grid grid-cols-2 gap-2 pt-3">
            {health.map((h) => (
              <div key={h.name} className={cn('flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5', h.status === 'UP' ? 'border-border' : 'border-phase-qc/40')}>
                <span className="truncate text-sm text-fg">{h.name}</span>
                <Badge tone={HEALTH_TONE[h.status]}>
                  {h.status !== 'UP' && <CircleAlert aria-hidden />}
                  {HEALTH_LABEL[h.status]}
                </Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </>
  )
}
