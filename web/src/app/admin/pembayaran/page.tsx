'use client'

import { CircleCheck, FileText, Inbox, TriangleAlert, XCircle } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { ReasonDialog } from '@/components/order/reason-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { Tabs } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/cn'
import { formatDateTime, formatRupiah } from '@/lib/format'
import { SUBMISSION_STATUS } from '@/lib/labels'
import { act } from '@/lib/store/act'
import { reviewSubmission } from '@/lib/store/actions-platform'
import { useDemo } from '@/lib/store/demo-store'
import type { PaymentSubmission, SubmissionStatus } from '@/lib/types'

const TAB_STATUSES: Record<string, SubmissionStatus[]> = {
  pending: ['UNDER_REVIEW', 'AMOUNT_MISMATCH_REVIEW'],
  approved: ['APPROVED'],
  rejected: ['REJECTED'],
}

function ReviewPanel({ submission }: { submission: PaymentSubmission }) {
  const invoice = useDemo((s) => s.platform.invoices.find((i) => i.id === submission.invoiceId))
  const tenant = useDemo((s) => s.platform.tenants.find((t) => t.id === submission.tenantId))
  const instruction = useDemo((s) => s.platform.instructions.find((i) => i.id === submission.instructionId))
  const all = useDemo((s) => s.platform.submissions)
  const [note, setNote] = useState('')
  const [rejecting, setRejecting] = useState(false)
  if (!invoice || !tenant) return null

  const mismatch = submission.status === 'AMOUNT_MISMATCH_REVIEW'
  const pending = TAB_STATUSES.pending.includes(submission.status)
  const diff = submission.amountClaimed - invoice.amount
  const previous = all.filter((s) => s.invoiceId === invoice.id && s.id !== submission.id)

  const approve = () => act((s) => reviewSubmission(s, submission.id, 'APPROVED', note, s.adminActor, new Date()), `${invoice.number} disetujui — invoice lunas`)

  return (
    <Card>
      <CardHeader title={tenant.name} description={`${invoice.number} · ${invoice.period}`} action={<Badge tone={SUBMISSION_STATUS[submission.status].tone}>{SUBMISSION_STATUS[submission.status].label}</Badge>} />
      <CardBody className="space-y-5 pt-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-surface-2 p-3">
            <dt className="text-xs text-fg-subtle">Tagihan</dt>
            <dd className="tabular mt-0.5 text-lg font-bold text-fg">{formatRupiah(invoice.amount)}</dd>
          </div>
          <div className={cn('rounded-xl p-3', mismatch ? 'bg-phase-qc-soft' : 'bg-surface-2')}>
            <dt className="text-xs text-fg-subtle">Klaim tenant</dt>
            <dd className={cn('tabular mt-0.5 text-lg font-bold', mismatch ? 'text-phase-qc' : 'text-fg')}>{formatRupiah(submission.amountClaimed)}</dd>
          </div>
        </dl>
        {mismatch && (
          <p className="flex gap-2 rounded-xl border border-phase-qc/40 bg-phase-qc-soft px-3 py-2.5 text-sm text-phase-qc">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            Selisih {formatRupiah(Math.abs(diff))} ({diff < 0 ? 'kurang' : 'lebih'}). Konfirmasi ke tenant dan tulis catatan keputusan.
          </p>
        )}
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p>
            <span className="block text-xs text-fg-subtle">Metode</span>
            {instruction?.label ?? submission.method}
          </p>
          <p>
            <span className="block text-xs text-fg-subtle">Diunggah</span>
            {formatDateTime(submission.submittedAt)} · {submission.submittedBy.name}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border p-3">
          <span className="grid size-12 place-items-center rounded-lg bg-surface-2 text-fg-subtle">
            <FileText className="size-6" aria-hidden />
          </span>
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium text-fg">{submission.proof.fileName}</p>
            <p className="text-xs text-fg-subtle">
              {submission.proof.fileType} · {Math.ceil(submission.proof.fileSize / 1024)} KB
            </p>
          </div>
          <span className="ml-auto text-xs text-fg-subtle">Pratinjau via signed URL</span>
        </div>
        {submission.note && <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-fg-muted">Catatan tenant: {submission.note}</p>}
        {submission.reviewNote && (
          <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-fg-muted">
            Keputusan {submission.reviewedBy?.name} ({submission.reviewedAt && formatDateTime(submission.reviewedAt)}): {submission.reviewNote}
          </p>
        )}
        {previous.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle">Bukti lain untuk tagihan ini</p>
            <ul className="space-y-1 text-sm text-fg-muted">
              {previous.map((p) => (
                <li key={p.id} className="flex justify-between gap-2">
                  <span className="truncate">{p.proof.fileName}</span>
                  <Badge tone={SUBMISSION_STATUS[p.status].tone}>{SUBMISSION_STATUS[p.status].label}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        {pending && (
          <>
            <Field label={mismatch ? 'Catatan konfirmasi (wajib)' : 'Catatan (opsional)'} htmlFor="review-note">
              <Textarea id="review-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: cocok dengan mutasi BCA 31/10" />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button onClick={approve} disabled={mismatch && !note.trim()}>
                <CircleCheck aria-hidden />
                Setujui & tandai lunas
              </Button>
              <Button variant="danger" onClick={() => setRejecting(true)}>
                <XCircle aria-hidden />
                Tolak
              </Button>
            </div>
          </>
        )}
      </CardBody>
      <ReasonDialog
        open={rejecting}
        title="Tolak bukti pembayaran"
        description="Tenant akan melihat alasan ini dan bisa mengunggah bukti baru."
        placeholder="Contoh: bukti buram, nominal tidak terbaca"
        confirmLabel="Tolak bukti"
        onClose={() => setRejecting(false)}
        onConfirm={(reason) => {
          const r = act((s) => reviewSubmission(s, submission.id, 'REJECTED', reason, s.adminActor, new Date()), 'Bukti ditolak')
          if (r.ok) setRejecting(false)
        }}
      />
    </Card>
  )
}

export default function ReviewPembayaranPage() {
  const submissions = useDemo((s) => s.platform.submissions)
  const tenants = useDemo((s) => s.platform.tenants)
  const [tab, setTab] = useState('pending')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const list = submissions.filter((s) => TAB_STATUSES[tab].includes(s.status)).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  const selected = list.find((s) => s.id === selectedId) ?? list[0]
  const tenantName = (id: string) => tenants.find((t) => t.id === id)?.name ?? id

  return (
    <>
      <PageHeader title="Review pembayaran" description="Cocokkan bukti dengan mutasi rekening atau dashboard kanal pembayaran sebelum memutuskan." />
      <Tabs
        className="mb-5 w-fit"
        value={tab}
        onChange={(t) => {
          setTab(t)
          setSelectedId(null)
        }}
        items={[
          { id: 'pending', label: 'Menunggu', count: submissions.filter((s) => TAB_STATUSES.pending.includes(s.status)).length },
          { id: 'approved', label: 'Disetujui' },
          { id: 'rejected', label: 'Ditolak' },
        ]}
      />
      {list.length === 0 ? (
        <Card>
          <EmptyState icon={Inbox} title="Tidak ada bukti di sini" description="Bukti baru dari tenant akan muncul di tab Menunggu." />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
          <ul className="space-y-2">
            {list.map((s) => {
              const active = s.id === selected?.id
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    aria-pressed={active}
                    className={cn(
                      'w-full rounded-2xl border p-4 text-left transition-colors',
                      active ? 'border-primary bg-primary-soft/50' : 'border-border bg-surface hover:bg-surface-2',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-fg">{tenantName(s.tenantId)}</span>
                      <Badge tone={SUBMISSION_STATUS[s.status].tone}>{SUBMISSION_STATUS[s.status].label}</Badge>
                    </div>
                    <p className="tabular mt-1 text-sm text-fg-muted">{formatRupiah(s.amountClaimed)}</p>
                    <p className="text-xs text-fg-subtle">{formatDateTime(s.submittedAt)}</p>
                  </button>
                </li>
              )
            })}
          </ul>
          {selected && <ReviewPanel key={selected.id} submission={selected} />}
        </div>
      )}
    </>
  )
}
