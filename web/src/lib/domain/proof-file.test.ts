import { it, expect } from 'vitest'
import { submissionStatusFor, validateProofFile } from './proof-file'

it('menerima JPG, PNG, PDF di bawah 2 MB', () => {
  expect(validateProofFile({ type: 'image/jpeg', size: 500_000 })).toEqual({ ok: true })
  expect(validateProofFile({ type: 'image/png', size: 1 })).toEqual({ ok: true })
  expect(validateProofFile({ type: 'application/pdf', size: 2 * 1024 * 1024 - 1 })).toEqual({ ok: true })
})

it('menolak jenis lain dan tepat 2 MB', () => {
  expect(validateProofFile({ type: 'image/webp', size: 1000 })).toEqual({ ok: false, error: 'INVALID_TYPE' })
  expect(validateProofFile({ type: 'application/pdf', size: 2 * 1024 * 1024 })).toEqual({
    ok: false,
    error: 'TOO_LARGE',
  })
})

it('selisih nominal masuk review khusus', () => {
  expect(submissionStatusFor(150000, 150000)).toBe('UNDER_REVIEW')
  expect(submissionStatusFor(149000, 150000)).toBe('AMOUNT_MISMATCH_REVIEW')
})
