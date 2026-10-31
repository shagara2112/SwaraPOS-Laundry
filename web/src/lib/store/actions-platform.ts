import { submissionStatusFor, validateProofFile } from '@/lib/domain/proof-file'
import { formatRupiah } from '@/lib/format'
import { newId } from '@/lib/ids'
import type {
  Actor,
  PaymentInstruction,
  PaymentSubmission,
  Plan,
  PlanCode,
  PlatformTenant,
} from '@/lib/types'
import { appendAudit, fail, type ActionResult, type DemoState } from './state'

type Platform = DemoState['platform']

function withPlatform(state: DemoState, patch: Partial<Platform>): DemoState {
  return { ...state, platform: { ...state.platform, ...patch } }
}

export function submitSubscriptionProof(
  s: DemoState,
  invoiceId: string,
  input: {
    instructionId: string
    amountClaimed: number
    note?: string
    file: { name: string; type: string; size: number }
  },
  actor: Actor,
  now: Date,
): ActionResult<PaymentSubmission> {
  const invoice = s.platform.invoices.find((i) => i.id === invoiceId)
  const instruction = s.platform.instructions.find((i) => i.id === input.instructionId)
  if (!invoice || !instruction) return fail('NOT_FOUND')
  if (invoice.status === 'PAID' || !instruction.active) return fail('NOT_ALLOWED')
  if (!Number.isInteger(input.amountClaimed) || input.amountClaimed <= 0) return fail('NOT_ALLOWED')

  const fileCheck = validateProofFile(input.file)
  if (!fileCheck.ok) return fail(fileCheck.error)

  const at = now.toISOString()
  const submission: PaymentSubmission = {
    id: newId('sub'),
    invoiceId,
    tenantId: invoice.tenantId,
    instructionId: instruction.id,
    method: instruction.method,
    amountClaimed: input.amountClaimed,
    note: input.note?.trim() || undefined,
    status: submissionStatusFor(input.amountClaimed, invoice.amount),
    submittedAt: at,
    submittedBy: actor,
    proof: { fileName: input.file.name, fileType: input.file.type, fileSize: input.file.size },
  }

  // Bukti baru menggantikan bukti yang masih menunggu untuk tagihan yang sama (riwayat tetap tersimpan).
  const superseded = s.platform.submissions.map((x) =>
    x.invoiceId === invoiceId && (x.status === 'UNDER_REVIEW' || x.status === 'AMOUNT_MISMATCH_REVIEW')
      ? { ...x, status: 'REJECTED' as const, reviewedBy: actor, reviewedAt: at, reviewNote: 'Diganti bukti baru dari tenant.' }
      : x,
  )
  const state = withPlatform(s, {
    submissions: [...superseded, submission],
    invoices: s.platform.invoices.map((i) => (i.id === invoiceId ? { ...i, status: 'UNDER_REVIEW' } : i)),
  })
  return {
    ok: true,
    value: submission,
    state: appendAudit(state, {
      at,
      actor,
      action: 'subscription.proof_uploaded',
      tenantId: invoice.tenantId,
      entity: 'payment_submission',
      entityId: submission.id,
      detail: `${invoice.number}: klaim ${formatRupiah(input.amountClaimed)} (tagihan ${formatRupiah(invoice.amount)}).`,
    }),
  }
}

export function reviewSubmission(
  s: DemoState,
  submissionId: string,
  decision: 'APPROVED' | 'REJECTED',
  note: string,
  actor: Actor,
  now: Date,
): ActionResult<PaymentSubmission> {
  const submission = s.platform.submissions.find((x) => x.id === submissionId)
  const invoice = s.platform.invoices.find((i) => i.id === submission?.invoiceId)
  if (!submission || !invoice) return fail('NOT_FOUND')
  if (submission.status !== 'UNDER_REVIEW' && submission.status !== 'AMOUNT_MISMATCH_REVIEW') {
    return fail('NOT_ALLOWED')
  }
  // Tagihan yang sudah lunas tidak boleh diturunkan atau dicap ulang.
  if (invoice.status === 'PAID') return fail('NOT_ALLOWED')
  const reviewNote = note.trim()
  const needsNote = decision === 'REJECTED' || submission.status === 'AMOUNT_MISMATCH_REVIEW'
  if (needsNote && !reviewNote) return fail('REASON_REQUIRED')

  const at = now.toISOString()
  const reviewed: PaymentSubmission = {
    ...submission,
    status: decision,
    reviewedBy: actor,
    reviewedAt: at,
    reviewNote: reviewNote || undefined,
  }

  const approved = decision === 'APPROVED'
  const invoiceStatus = approved ? 'PAID' : new Date(invoice.dueAt) < now ? 'OVERDUE' : 'UNPAID'
  const state = withPlatform(s, {
    submissions: s.platform.submissions.map((x) => (x.id === submissionId ? reviewed : x)),
    invoices: s.platform.invoices.map((i) =>
      i.id === invoice.id ? { ...i, status: invoiceStatus, paidAt: approved ? at : i.paidAt } : i,
    ),
    tenants: approved
      ? s.platform.tenants.map((t) =>
          t.id === invoice.tenantId && (t.status === 'PAST_DUE' || t.status === 'TRIAL')
            ? { ...t, status: 'ACTIVE' }
            : t,
        )
      : s.platform.tenants,
  })

  return {
    ok: true,
    value: reviewed,
    state: appendAudit(state, {
      at,
      actor,
      action: approved ? 'subscription.payment_approved' : 'subscription.payment_rejected',
      tenantId: invoice.tenantId,
      entity: 'payment_submission',
      entityId: submission.id,
      detail: `${invoice.number} ${approved ? 'disetujui' : 'ditolak'}${reviewNote ? `. ${reviewNote}` : '.'}`,
    }),
  }
}

export function setTenantStatus(
  s: DemoState,
  tenantId: string,
  status: 'ACTIVE' | 'SUSPENDED',
  reason: string,
  actor: Actor,
  now: Date,
): ActionResult<PlatformTenant> {
  const tenant = s.platform.tenants.find((t) => t.id === tenantId)
  if (!tenant) return fail('NOT_FOUND')
  if (!reason.trim()) return fail('REASON_REQUIRED')

  const updated: PlatformTenant = { ...tenant, status }
  const state = withPlatform(s, {
    tenants: s.platform.tenants.map((t) => (t.id === tenantId ? updated : t)),
  })
  return {
    ok: true,
    value: updated,
    state: appendAudit(state, {
      at: now.toISOString(),
      actor,
      action: status === 'SUSPENDED' ? 'tenant.suspended' : 'tenant.reactivated',
      tenantId,
      entity: 'tenant',
      entityId: tenantId,
      detail: reason.trim(),
    }),
  }
}

export function startSupportSession(
  s: DemoState,
  tenantId: string,
  reason: string,
  minutes: number,
  actor: Actor,
  now: Date,
): ActionResult<{ expiresAt: string }> {
  if (!s.platform.tenants.some((t) => t.id === tenantId)) return fail('NOT_FOUND')
  if (!reason.trim()) return fail('REASON_REQUIRED')
  if (!(minutes > 0)) return fail('NOT_ALLOWED')

  const expiresAt = new Date(now.getTime() + minutes * 60 * 1000).toISOString()
  return {
    ok: true,
    value: { expiresAt },
    state: appendAudit(s, {
      at: now.toISOString(),
      actor,
      action: 'support.session_started',
      tenantId,
      entity: 'support_session',
      entityId: tenantId,
      detail: `Read-only ${minutes} menit. Alasan: ${reason.trim()}`,
    }),
  }
}

export function upsertInstruction(
  s: DemoState,
  instr: Omit<PaymentInstruction, 'id'> & { id?: string },
  actor: Actor,
  now: Date,
): ActionResult<PaymentInstruction> {
  if (!instr.label.trim()) return fail('NOT_ALLOWED')
  const existing = instr.id ? s.platform.instructions.find((i) => i.id === instr.id) : undefined
  if (instr.id && !existing) return fail('NOT_FOUND')

  const saved: PaymentInstruction = { ...instr, id: existing?.id ?? newId('pi') }
  const instructions = existing
    ? s.platform.instructions.map((i) => (i.id === saved.id ? saved : i))
    : [...s.platform.instructions, saved]

  return {
    ok: true,
    value: saved,
    state: appendAudit(withPlatform(s, { instructions }), {
      at: now.toISOString(),
      actor,
      action: existing ? 'payment_instruction.updated' : 'payment_instruction.created',
      entity: 'payment_instruction',
      entityId: saved.id,
      detail: `${saved.label} (${saved.active ? 'aktif' : 'nonaktif'})`,
    }),
  }
}

export function updatePlan(
  s: DemoState,
  code: PlanCode,
  patch: Partial<Omit<Plan, 'code'>>,
  actor: Actor,
  now: Date,
): ActionResult<Plan> {
  const plan = s.platform.plans.find((p) => p.code === code)
  if (!plan) return fail('NOT_FOUND')
  if (patch.pricePerOutletMonth !== undefined && !(Number.isInteger(patch.pricePerOutletMonth) && patch.pricePerOutletMonth >= 0)) {
    return fail('NOT_ALLOWED')
  }
  const positive = (n: number) => Number.isInteger(n) && n > 0
  if (patch.limits && !(positive(patch.limits.outlets) && positive(patch.limits.staff))) return fail('NOT_ALLOWED')

  const updated: Plan = { ...plan, ...patch }
  return {
    ok: true,
    value: updated,
    state: appendAudit(withPlatform(s, { plans: s.platform.plans.map((p) => (p.code === code ? updated : p)) }), {
      at: now.toISOString(),
      actor,
      action: 'plan.updated',
      entity: 'plan',
      entityId: code,
      detail: `${updated.name}: ${formatRupiah(updated.pricePerOutletMonth)}/outlet/bulan, maks. ${updated.limits.outlets} outlet, ${updated.limits.staff} karyawan.`,
    }),
  }
}
