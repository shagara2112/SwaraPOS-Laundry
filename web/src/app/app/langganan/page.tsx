'use client'

import { CircleCheck, CreditCard, FileText, Info } from 'lucide-react'
import { useState } from 'react'
import { InstructionDetail } from '@/components/billing/instruction-detail'
import { ProofUploadForm } from '@/components/billing/proof-upload-form'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Table, Td, Th, Tr } from '@/components/ui/table'
import { Tabs } from '@/components/ui/tabs'
import { cn } from '@/lib/cn'
import { formatDate, formatDateTime, formatRupiah } from '@/lib/format'
import { INVOICE_STATUS, SUBMISSION_STATUS, TENANT_STATUS } from '@/lib/labels'
import { planUsage, type PlanUsageItem } from '@/lib/selectors'
import { useDemo } from '@/lib/store/demo-store'

function Meter({ item }: { item: PlanUsageItem }) {
  const high = item.pct >= 80
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-fg-muted">{item.label}</span>
        <span className="tabular font-semibold text-fg">
          {item.used.toLocaleString('id-ID')} / {item.limit.toLocaleString('id-ID')}
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-surface-2" role="meter" aria-valuenow={item.used} aria-valuemin={0} aria-valuemax={item.limit} aria-label={item.label}>
        <div className={cn('h-full rounded-full', high ? 'bg-phase-qc' : 'bg-primary')} style={{ width: `${item.pct}%` }} />
      </div>
      {item.reached ? (
        <p className="mt-1 text-xs font-medium text-phase-qc">Batas paket tercapai — upgrade untuk menambah {item.label.toLowerCase()}.</p>
      ) : (
        high && <p className="mt-1 text-xs font-medium text-phase-qc">{item.pct}% terpakai — pertimbangkan upgrade.</p>
      )}
    </div>
  )
}

export default function LanggananPage() {
  const tenantId = useDemo((s) => s.tenant.id)
  const tenant = useDemo((s) => s.platform.tenants.find((t) => t.id === s.tenant.id))
  const plans = useDemo((s) => s.platform.plans)
  const allInvoices = useDemo((s) => s.platform.invoices)
  const allInstructions = useDemo((s) => s.platform.instructions)
  const allSubmissions = useDemo((s) => s.platform.submissions)
  const staffCount = useDemo((s) => s.staff.length)

  const invoices = allInvoices.filter((i) => i.tenantId === tenantId).sort((a, b) => b.dueAt.localeCompare(a.dueAt))
  const instructions = allInstructions.filter((i) => i.active).sort((a, b) => a.sortOrder - b.sortOrder)
  const defaultInvoice = invoices.find((i) => i.status !== 'PAID') ?? invoices[0]
  const [invoiceId, setInvoiceId] = useState(defaultInvoice?.id)
  const [instructionId, setInstructionId] = useState(instructions[0]?.id)

  if (!tenant) return null
  const plan = plans.find((p) => p.code === tenant.plan)!
  const invoice = invoices.find((i) => i.id === invoiceId) ?? defaultInvoice
  const instruction = instructions.find((i) => i.id === instructionId) ?? instructions[0]
  const history = allSubmissions.filter((s) => s.invoiceId === invoice?.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  const status = TENANT_STATUS[tenant.status]

  return (
    <>
      <PageHeader title="Langganan" description="Tagihan SwaraPOS terpisah dari pembayaran order pelanggan Anda." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={`Paket ${plan.name}`} action={<Badge tone={status.tone}>{status.label}</Badge>} />
          <CardBody className="space-y-4 pt-3">
            <p className="flex items-baseline gap-2">
              <span className="tabular text-3xl font-bold tracking-tight text-fg">{formatRupiah(plan.pricePerOutletMonth * tenant.outletCount)}</span>
              <span className="text-sm text-fg-subtle">
                / bulan · {tenant.outletCount} outlet × {formatRupiah(plan.pricePerOutletMonth)}
              </span>
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {plan.features.map((f) => (
                <li key={f}>
                  <Badge>{f}</Badge>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Pemakaian paket" description="Paket membatasi jumlah outlet dan karyawan. Order tidak dibatasi." />
          <CardBody className="space-y-5 pt-3">
            {planUsage(plan.limits, { outlets: tenant.outletCount, staff: staffCount }).map((item) => (
              <Meter key={item.key} item={item} />
            ))}
            <div className="flex items-baseline justify-between border-t border-border pt-4 text-sm">
              <span className="text-fg-muted">Order bulan ini</span>
              <span className="tabular font-semibold text-fg">
                {tenant.ordersThisMonth.toLocaleString('id-ID')} <span className="font-normal text-fg-subtle">· tanpa batas</span>
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_26rem]">
        <Card>
          <CardHeader title="Tagihan" description="Pilih tagihan untuk melihat cara bayar dan status review." />
          <Table className="mt-3">
            <thead>
              <tr>
                <Th>Nomor</Th>
                <Th>Periode</Th>
                <Th>Jatuh tempo</Th>
                <Th>Status</Th>
                <Th className="text-right">Nominal</Th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const st = INVOICE_STATUS[inv.status]
                const selected = inv.id === invoice?.id
                return (
                  <Tr key={inv.id} className={cn('cursor-pointer', selected ? 'bg-primary-soft/50' : 'hover:bg-surface-2/60')} onClick={() => setInvoiceId(inv.id)} aria-selected={selected}>
                    <Td>
                      <button type="button" className="font-mono text-sm font-semibold text-fg" onClick={() => setInvoiceId(inv.id)}>
                        {inv.number}
                      </button>
                    </Td>
                    <Td>{inv.period}</Td>
                    <Td className="text-fg-muted">{formatDate(inv.dueAt)}</Td>
                    <Td>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </Td>
                    <Td className="tabular text-right font-semibold">{formatRupiah(inv.amount)}</Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        </Card>

        {invoice && (
          <Card>
            <CardHeader title={invoice.number} description={`${invoice.period} · ${formatRupiah(invoice.amount)}`} action={<Badge tone={INVOICE_STATUS[invoice.status].tone}>{INVOICE_STATUS[invoice.status].label}</Badge>} />
            <CardBody className="space-y-5 pt-4">
              {invoice.status === 'PAID' ? (
                <p className="flex items-center gap-2 rounded-xl bg-phase-done-soft px-4 py-3 text-sm font-medium text-phase-done">
                  <CircleCheck className="size-5" aria-hidden />
                  Lunas {invoice.paidAt && formatDateTime(invoice.paidAt)}
                </p>
              ) : (
                <>
                  {invoice.status === 'UNDER_REVIEW' && (
                    <p className="flex gap-2 rounded-xl bg-primary-soft px-4 py-3 text-sm text-fg">
                      <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      Bukti sedang direview. Bukti salah? Unggah yang baru — bukti baru menggantikan yang sedang direview, dan riwayatnya tetap tersimpan.
                    </p>
                  )}
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
                      <CreditCard className="size-4" aria-hidden />
                      1. Bayar lewat
                    </h3>
                    <Tabs items={instructions.map((i) => ({ id: i.id, label: i.label }))} value={instruction?.id ?? ''} onChange={setInstructionId} className="mb-3" />
                    {instruction && <InstructionDetail instruction={instruction} />}
                  </div>
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
                      <FileText className="size-4" aria-hidden />
                      2. Unggah bukti
                    </h3>
                    {instruction && <ProofUploadForm key={`${invoice.id}-${instruction.id}`} invoice={invoice} instruction={instruction} />}
                  </div>
                  <p className="text-xs text-fg-subtle">Status lunas diperbarui setelah diverifikasi tim SwaraPOS. Tenant tidak dapat menandai lunas sendiri.</p>
                </>
              )}

              {history.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-fg">Riwayat bukti</h3>
                  <ul className="space-y-2">
                    {history.map((s) => {
                      const st = SUBMISSION_STATUS[s.status]
                      return (
                        <li key={s.id} className="rounded-xl border border-border p-3 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="truncate font-medium text-fg">{s.proof.fileName}</span>
                            <Badge tone={st.tone}>{st.label}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-fg-subtle">
                            {formatDateTime(s.submittedAt)} · klaim {formatRupiah(s.amountClaimed)}
                          </p>
                          {s.reviewNote && <p className="mt-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs text-fg-muted">Catatan reviewer: {s.reviewNote}</p>}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </>
  )
}
