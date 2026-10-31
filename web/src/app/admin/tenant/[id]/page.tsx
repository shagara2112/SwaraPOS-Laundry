'use client'

import { ArrowLeft, Ban, Eye, Phone, PlayCircle, SearchX, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { ReasonDialog } from '@/components/order/reason-dialog'
import { StatusBadge } from '@/components/order/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button, ButtonLink } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { formatDate, formatDateTime, formatRupiah } from '@/lib/format'
import { INVOICE_STATUS, TENANT_STATUS } from '@/lib/labels'
import { planUsage } from '@/lib/selectors'
import { act } from '@/lib/store/act'
import { setTenantStatus, startSupportSession } from '@/lib/store/actions-platform'
import { useDemo } from '@/lib/store/demo-store'

function useCountdown(until: string | null) {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    if (!until) return
    const tick = () => setLeft(Math.max(0, new Date(until).getTime() - Date.now()))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [until])
  return left
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const tenant = useDemo((s) => s.platform.tenants.find((t) => t.id === id))
  const plans = useDemo((s) => s.platform.plans)
  const allInvoices = useDemo((s) => s.platform.invoices)
  const ownTenantId = useDemo((s) => s.tenant.id)
  const orders = useDemo((s) => s.orders)
  const [dialog, setDialog] = useState<'suspend' | 'activate' | 'support' | null>(null)
  const [minutes, setMinutes] = useState('30')
  const [supportUntil, setSupportUntil] = useState<string | null>(null)
  const left = useCountdown(supportUntil)
  const supportActive = !!supportUntil && left > 0

  if (!tenant) {
    return (
      <Card>
        <EmptyState icon={SearchX} title="Tenant tidak ditemukan" action={<ButtonLink href="/admin/tenant">Kembali</ButtonLink>} />
      </Card>
    )
  }

  const plan = plans.find((p) => p.code === tenant.plan)!
  const invoices = allInvoices.filter((i) => i.tenantId === tenant.id).sort((a, b) => b.dueAt.localeCompare(a.dueAt))
  const usage = planUsage(plan.limits, { outlets: tenant.outletCount, staff: tenant.userCount })
  const recentOrders = tenant.id === ownTenantId ? [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5) : []

  return (
    <>
      <Link href="/admin/tenant" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden />
        Semua tenant
      </Link>

      {supportActive && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-phase-production/40 bg-phase-production-soft px-4 py-3 text-sm text-phase-production" role="status">
          <Eye className="size-5" aria-hidden />
          <span className="font-semibold">Akses support read-only aktif</span>
          <span className="tabular">
            sisa {Math.floor(left / 60000)}:{String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}
          </span>
          <span className="text-xs">Semua aksi ubah dinonaktifkan dan akses tercatat di audit log.</span>
          <Button size="sm" variant="secondary" className="ml-auto" onClick={() => setSupportUntil(null)}>
            Akhiri sesi
          </Button>
        </div>
      )}

      <PageHeader
        title={tenant.name}
        description={`${tenant.city} · terdaftar ${formatDate(tenant.createdAt)}`}
        actions={
          <>
            <Badge tone={TENANT_STATUS[tenant.status].tone} className="px-3 py-1 text-sm">
              {TENANT_STATUS[tenant.status].label}
            </Badge>
            {!supportActive && (
              <Button variant="secondary" onClick={() => setDialog('support')}>
                <ShieldAlert aria-hidden />
                Akses support
              </Button>
            )}
            {tenant.status === 'SUSPENDED' ? (
              <Button onClick={() => setDialog('activate')} disabled={supportActive}>
                <PlayCircle aria-hidden />
                Aktifkan kembali
              </Button>
            ) : (
              <Button variant="danger" onClick={() => setDialog('suspend')} disabled={supportActive}>
                <Ban aria-hidden />
                Suspend
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Owner" />
          <CardBody className="space-y-2 pt-3 text-sm">
            <p className="font-semibold text-fg">{tenant.ownerName}</p>
            <p className="flex items-center gap-2 text-fg-muted">
              <Phone className="size-4" aria-hidden />
              {tenant.ownerPhone}
            </p>
            <p className="text-fg-muted">{tenant.userCount} pengguna · {tenant.outletCount} outlet</p>
            {tenant.trialEndsAt && <p className="text-fg-muted">Trial berakhir {formatDate(tenant.trialEndsAt)}</p>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={`Paket ${plan.name}`} description={`${formatRupiah(plan.pricePerOutletMonth)} / outlet / bulan`} />
          <CardBody className="space-y-3 pt-3 text-sm">
            {usage.map((u) => (
              <div key={u.key}>
                <div className="flex justify-between text-fg-muted">
                  <span>{u.label}</span>
                  <span className="tabular font-semibold text-fg">
                    {u.used} / {u.limit}
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-surface-2">
                  <div className={u.pct >= 80 ? 'h-full rounded-full bg-phase-qc' : 'h-full rounded-full bg-primary'} style={{ width: `${u.pct}%` }} />
                </div>
              </div>
            ))}
            <p className="flex justify-between border-t border-border pt-2 text-fg-muted">
              <span>Order bulan ini</span>
              <span className="tabular font-semibold text-fg">
                {tenant.ordersThisMonth.toLocaleString('id-ID')} <span className="font-normal text-fg-subtle">· tanpa batas</span>
              </span>
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Catatan support" />
          <CardBody className="pt-3">
            {tenant.supportNotes.length === 0 ? (
              <p className="text-sm text-fg-subtle">Belum ada catatan.</p>
            ) : (
              <ul className="space-y-2 text-sm text-fg-muted">
                {tenant.supportNotes.map((n) => (
                  <li key={n} className="rounded-xl bg-surface-2 px-3 py-2">
                    {n}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Tagihan langganan" />
          <CardBody className="pt-3">
            <ul className="divide-y divide-border">
              {invoices.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div>
                    <p className="font-mono font-semibold text-fg">{inv.number}</p>
                    <p className="text-xs text-fg-subtle">
                      {inv.period} · jatuh tempo {formatDate(inv.dueAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular font-medium">{formatRupiah(inv.amount)}</span>
                    <Badge tone={INVOICE_STATUS[inv.status].tone}>{INVOICE_STATUS[inv.status].label}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Order terbaru" description={supportActive ? 'Mode read-only' : 'Butuh akses support untuk melihat data operasional tenant'} />
          <CardBody className="pt-3">
            {!supportActive ? (
              <p className="py-6 text-center text-sm text-fg-subtle">Data order tenant tersembunyi tanpa sesi support yang beralasan.</p>
            ) : recentOrders.length === 0 ? (
              <p className="py-6 text-center text-sm text-fg-subtle">Tidak ada data order pada demo untuk tenant ini.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recentOrders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="font-mono text-sm font-semibold text-fg">{o.orderNo}</p>
                      <p className="text-xs text-fg-subtle">{formatDateTime(o.createdAt)}</p>
                    </div>
                    <StatusBadge status={o.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <ReasonDialog
        open={dialog === 'suspend' || dialog === 'activate'}
        title={dialog === 'suspend' ? `Suspend ${tenant.name}?` : `Aktifkan kembali ${tenant.name}?`}
        description={dialog === 'suspend' ? 'Fitur tenant dibatasi, data tidak dihapus.' : 'Tenant bisa memakai semua fitur paketnya lagi.'}
        confirmLabel={dialog === 'suspend' ? 'Suspend tenant' : 'Aktifkan'}
        confirmVariant={dialog === 'suspend' ? 'danger' : 'primary'}
        onClose={() => setDialog(null)}
        onConfirm={(reason) => {
          const r = act(
            (s) => setTenantStatus(s, tenant.id, dialog === 'suspend' ? 'SUSPENDED' : 'ACTIVE', reason, s.adminActor, new Date()),
            dialog === 'suspend' ? 'Tenant disuspend' : 'Tenant diaktifkan kembali',
          )
          if (r.ok) setDialog(null)
        }}
      />
      <ReasonDialog
        open={dialog === 'support'}
        title="Mulai akses support"
        description="Akses read-only ke data tenant, dibatasi waktu, dan tercatat di audit log."
        label="Alasan / nomor tiket"
        placeholder="Contoh: Tiket #812 — order tidak muncul di laporan"
        confirmLabel="Mulai sesi"
        confirmVariant="primary"
        onClose={() => setDialog(null)}
        onConfirm={(reason) => {
          const r = act((s) => startSupportSession(s, tenant.id, reason, Number(minutes), s.adminActor, new Date()), 'Sesi support dimulai')
          if (r.ok) {
            setSupportUntil(r.value.expiresAt)
            setDialog(null)
          }
        }}
      >
        <Field label="Durasi" htmlFor="support-minutes">
          <Select id="support-minutes" value={minutes} onChange={(e) => setMinutes(e.target.value)}>
            <option value="15">15 menit</option>
            <option value="30">30 menit</option>
            <option value="60">60 menit</option>
          </Select>
        </Field>
      </ReasonDialog>
    </>
  )
}
