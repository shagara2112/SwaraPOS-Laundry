import type { SubmissionStatus } from '../types'

export const MAX_PROOF_BYTES = 2 * 1024 * 1024
export const ACCEPTED_PROOF_TYPES = ['image/jpeg', 'image/png', 'application/pdf']

export function validateProofFile(file: {
  type: string
  size: number
}): { ok: true } | { ok: false; error: 'INVALID_TYPE' | 'TOO_LARGE' } {
  if (!ACCEPTED_PROOF_TYPES.includes(file.type)) return { ok: false, error: 'INVALID_TYPE' }
  if (file.size >= MAX_PROOF_BYTES) return { ok: false, error: 'TOO_LARGE' }
  return { ok: true }
}

/** Selisih nominal tidak ditolak otomatis; masuk review khusus (PRD §I). */
export function submissionStatusFor(
  amountClaimed: number,
  invoiceAmount: number,
): Extract<SubmissionStatus, 'UNDER_REVIEW' | 'AMOUNT_MISMATCH_REVIEW'> {
  return amountClaimed === invoiceAmount ? 'UNDER_REVIEW' : 'AMOUNT_MISMATCH_REVIEW'
}
