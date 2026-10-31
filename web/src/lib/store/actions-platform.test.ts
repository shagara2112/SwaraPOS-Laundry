import { describe, it, expect } from 'vitest'
import type { Actor } from '@/lib/types'
import {
  reviewSubmission,
  setTenantStatus,
  startSupportSession,
  submitSubscriptionProof,
  updatePlan,
  upsertInstruction,
} from './actions-platform'
import { createSeed } from './seed'
import type { ActionResult, DemoState } from './state'

const now = new Date('2026-10-31T03:00:00Z')
const owner: Actor = { id: 'st-rina', name: 'Rina Wulandari' }
const admin: Actor = { id: 'pa-1', name: 'Sinta (Finance)' }
const s0 = createSeed(now)
const inv = s0.platform.invoices.find((i) => i.tenantId === 't1' && i.status === 'UNPAID')!
const instr = s0.platform.instructions.find((i) => i.active)!
const pdf = { name: 'bukti.pdf', type: 'application/pdf', size: 300_000 }

function ok<T>(r: ActionResult<T>): { state: DemoState; value: T } {
  if (!r.ok) throw new Error(`expected ok, got ${r.error}`)
  return r
}

function submit(state: DemoState, amountClaimed = inv.amount) {
  return ok(submitSubscriptionProof(state, inv.id, { instructionId: instr.id, amountClaimed, file: pdf }, owner, now))
}

describe('submitSubscriptionProof', () => {
  it('unggah bukti membuat submission UNDER_REVIEW dan audit', () => {
    const { state, value } = submit(s0)
    expect(value.status).toBe('UNDER_REVIEW')
    expect(value.proof).toEqual({ fileName: 'bukti.pdf', fileType: 'application/pdf', fileSize: 300_000 })
    expect(state.platform.invoices.find((i) => i.id === inv.id)?.status).toBe('UNDER_REVIEW')
    expect(state.platform.audit.at(-1)?.action).toBe('subscription.proof_uploaded')
  })

  it('file tidak valid ditolak', () => {
    expect(
      submitSubscriptionProof(s0, inv.id, { instructionId: instr.id, amountClaimed: inv.amount, file: { ...pdf, type: 'image/gif' } }, owner, now),
    ).toEqual({ ok: false, error: 'INVALID_TYPE' })
    expect(
      submitSubscriptionProof(s0, inv.id, { instructionId: instr.id, amountClaimed: inv.amount, file: { ...pdf, size: 2 * 1024 * 1024 } }, owner, now),
    ).toEqual({ ok: false, error: 'TOO_LARGE' })
  })

  it('nominal berbeda masuk AMOUNT_MISMATCH_REVIEW', () => {
    expect(submit(s0, inv.amount - 1000).value.status).toBe('AMOUNT_MISMATCH_REVIEW')
  })

  it('invoice yang sudah lunas tidak menerima bukti baru', () => {
    const paid = s0.platform.invoices.find((i) => i.status === 'PAID')!
    expect(
      submitSubscriptionProof(s0, paid.id, { instructionId: instr.id, amountClaimed: paid.amount, file: pdf }, owner, now),
    ).toEqual({ ok: false, error: 'NOT_ALLOWED' })
  })
})

describe('reviewSubmission', () => {
  it('tolak wajib alasan non-spasi', () => {
    const s1 = submit(s0)
    expect(reviewSubmission(s1.state, s1.value.id, 'REJECTED', '  ', admin, now)).toEqual({
      ok: false,
      error: 'REASON_REQUIRED',
    })
  })

  it('setujui membuat invoice PAID dan tenant ACTIVE', () => {
    const t3inv = s0.platform.invoices.find((i) => i.tenantId === 't4')!
    const sub = s0.platform.submissions.find((x) => x.invoiceId === t3inv.id)!
    const { state, value } = ok(reviewSubmission(s0, sub.id, 'APPROVED', '', admin, now))
    expect(value).toMatchObject({ status: 'APPROVED', reviewedBy: admin, reviewedAt: now.toISOString() })
    expect(state.platform.invoices.find((i) => i.id === t3inv.id)).toMatchObject({ status: 'PAID', paidAt: now.toISOString() })
    expect(state.platform.audit.at(-1)?.action).toBe('subscription.payment_approved')
  })

  it('setujui pelunasan tenant PAST_DUE mengaktifkan kembali', () => {
    const sub = s0.platform.submissions.find((x) => x.status === 'AMOUNT_MISMATCH_REVIEW')!
    const { state } = ok(reviewSubmission(s0, sub.id, 'APPROVED', 'Selisih biaya admin, dianggap lunas', admin, now))
    expect(state.platform.tenants.find((t) => t.id === sub.tenantId)?.status).toBe('ACTIVE')
  })

  it('setujui selisih nominal wajib catatan', () => {
    const sub = s0.platform.submissions.find((x) => x.status === 'AMOUNT_MISMATCH_REVIEW')!
    expect(reviewSubmission(s0, sub.id, 'APPROVED', '', admin, now)).toEqual({ ok: false, error: 'REASON_REQUIRED' })
    expect(reviewSubmission(s0, sub.id, 'APPROVED', 'Kurang Rp4.000, dianggap lunas', admin, now).ok).toBe(true)
  })

  it('tolak mengembalikan invoice ke UNPAID dan tercatat', () => {
    const s1 = submit(s0)
    const { state } = ok(reviewSubmission(s1.state, s1.value.id, 'REJECTED', 'Bukti buram', admin, now))
    expect(state.platform.invoices.find((i) => i.id === inv.id)?.status).toBe('UNPAID')
    expect(state.platform.audit.at(-1)?.action).toBe('subscription.payment_rejected')
  })

  it('unggah ulang setelah ditolak menyimpan riwayat', () => {
    const s1 = submit(s0)
    const rejected = ok(reviewSubmission(s1.state, s1.value.id, 'REJECTED', 'Bukti buram', admin, now))
    const s2 = submit(rejected.state)
    const forInvoice = s2.state.platform.submissions.filter((x) => x.invoiceId === inv.id)
    expect(forInvoice.map((x) => x.status)).toEqual(['REJECTED', 'UNDER_REVIEW'])
  })

  it('submission yang sudah diputus tidak bisa diputus lagi', () => {
    const s1 = submit(s0)
    const approved = ok(reviewSubmission(s1.state, s1.value.id, 'APPROVED', '', admin, now))
    expect(reviewSubmission(approved.state, s1.value.id, 'APPROVED', '', admin, now)).toEqual({
      ok: false,
      error: 'NOT_ALLOWED',
    })
  })
})

describe('tenant & konfigurasi platform', () => {
  it('suspend wajib alasan dan tercatat', () => {
    expect(setTenantStatus(s0, 't4', 'SUSPENDED', ' ', admin, now)).toEqual({ ok: false, error: 'REASON_REQUIRED' })
    const { state, value } = ok(setTenantStatus(s0, 't4', 'SUSPENDED', 'Tunggakan 2 bulan', admin, now))
    expect(value.status).toBe('SUSPENDED')
    expect(state.platform.audit.at(-1)).toMatchObject({ action: 'tenant.suspended', tenantId: 't4' })
  })

  it('aktifkan kembali tercatat', () => {
    const { state } = ok(setTenantStatus(s0, 't6', 'ACTIVE', 'Tunggakan sudah dilunasi', admin, now))
    expect(state.platform.audit.at(-1)?.action).toBe('tenant.reactivated')
  })

  it('sesi support wajib alasan', () => {
    expect(startSupportSession(s0, 't1', '', 30, admin, now)).toEqual({ ok: false, error: 'REASON_REQUIRED' })
    const { state, value } = ok(startSupportSession(s0, 't1', 'Tiket #812: order tidak muncul', 30, admin, now))
    expect(value.expiresAt).toBe(new Date(now.getTime() + 30 * 60 * 1000).toISOString())
    expect(state.platform.audit.at(-1)?.action).toBe('support.session_started')
  })

  it('upsertInstruction dan updatePlan tercatat di audit', () => {
    const created = ok(
      upsertInstruction(s0, { method: 'LINK', label: 'Link baru', paymentUrl: 'https://example.com/pay', instructions: 'Bayar lewat link.', sortOrder: 9, active: true }, admin, now),
    )
    expect(created.state.platform.instructions.length).toBe(s0.platform.instructions.length + 1)
    expect(created.state.platform.audit.at(-1)?.action).toBe('payment_instruction.created')

    const updated = ok(upsertInstruction(created.state, { ...created.value, active: false }, admin, now))
    expect(updated.state.platform.instructions.find((i) => i.id === created.value.id)?.active).toBe(false)
    expect(updated.state.platform.audit.at(-1)?.action).toBe('payment_instruction.updated')

    const plan = ok(updatePlan(s0, 'BASIC', { pricePerOutletMonth: 159000 }, admin, now))
    expect(plan.value.pricePerOutletMonth).toBe(159000)
    expect(plan.state.platform.audit.at(-1)?.action).toBe('plan.updated')
  })
})

describe('bukti ganda (review final)', () => {
  it('bukti baru menggantikan bukti yang masih menunggu review', () => {
    const first = submit(s0)
    const second = submit(first.state)
    const forInvoice = second.state.platform.submissions.filter((x) => x.invoiceId === inv.id)
    expect(forInvoice.map((x) => x.status)).toEqual(['REJECTED', 'UNDER_REVIEW'])
    expect(forInvoice[0].reviewNote).toContain('Diganti bukti baru')
  })

  it('review ditolak bila invoice sudah lunas', () => {
    const s1 = submit(s0)
    const paidState: DemoState = {
      ...s1.state,
      platform: { ...s1.state.platform, invoices: s1.state.platform.invoices.map((i) => (i.id === inv.id ? { ...i, status: 'PAID' as const } : i)) },
    }
    expect(reviewSubmission(paidState, s1.value.id, 'REJECTED', 'Duplikat', admin, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
    expect(reviewSubmission(paidState, s1.value.id, 'APPROVED', '', admin, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
  })
})

describe('limit paket (outlet & karyawan)', () => {
  it('limit outlet atau karyawan harus lebih dari 0', () => {
    expect(updatePlan(s0, 'BASIC', { limits: { outlets: 0, staff: 5 } }, admin, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
    expect(updatePlan(s0, 'BASIC', { limits: { outlets: 1, staff: 0 } }, admin, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
  })

  it('audit menyebut limit outlet dan karyawan, bukan order', () => {
    const { state, value } = ok(updatePlan(s0, 'PRO', { limits: { outlets: 12, staff: 30 } }, admin, now))
    expect(value.limits).toEqual({ outlets: 12, staff: 30 })
    const detail = state.platform.audit.at(-1)!.detail
    expect(detail).toContain('12 outlet')
    expect(detail).toContain('30 karyawan')
    expect(detail).not.toContain('order')
  })
})
