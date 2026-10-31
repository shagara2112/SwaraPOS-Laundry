import { describe, it, expect } from 'vitest'
import { canTransition, nextStatuses, statusPhase, requiresReason } from './order-status'

describe('canTransition', () => {
  it('mengizinkan alur produksi linear', () => {
    expect(canTransition('IN_WASHING', 'IN_DRYING', {})).toEqual({ ok: true })
  })
  it('menolak lompat tahap', () => {
    expect(canTransition('RECEIVED', 'IN_WASHING', {})).toEqual({ ok: false, reason: 'NOT_ALLOWED' })
  })
  it('mengizinkan walk-in/drop-off dan ambil sendiri', () => {
    expect(canTransition('DRAFT', 'RECEIVED', {}).ok).toBe(true)
    expect(canTransition('REQUESTED', 'RECEIVED', {}).ok).toBe(true)
    expect(canTransition('READY_FOR_PICKUP', 'COMPLETED', {}).ok).toBe(true)
  })
  it('mewajibkan QC lulus sebelum siap', () => {
    expect(canTransition('QUALITY_CHECK', 'READY_FOR_PICKUP', { qcPassed: false }))
      .toEqual({ ok: false, reason: 'QC_REQUIRED' })
    expect(canTransition('QUALITY_CHECK', 'READY_FOR_PICKUP', { qcPassed: true }).ok).toBe(true)
  })
  it('mengizinkan cuci ulang dari QC', () => {
    expect(canTransition('QUALITY_CHECK', 'IN_WASHING', {}).ok).toBe(true)
  })
  it('menolak alasan kosong atau spasi saja', () => {
    expect(canTransition('IN_DRYING', 'ON_HOLD', { reason: '   ' }))
      .toEqual({ ok: false, reason: 'REASON_REQUIRED' })
    expect(canTransition('IN_DRYING', 'CANCELLED', {})).toEqual({ ok: false, reason: 'REASON_REQUIRED' })
    expect(canTransition('IN_DRYING', 'ON_HOLD', { reason: 'Mesin pengering rusak' }).ok).toBe(true)
  })
  it('melanjutkan dari hold hanya ke status sebelum hold', () => {
    expect(canTransition('ON_HOLD', 'IN_DRYING', { resumeTo: 'IN_DRYING' }).ok).toBe(true)
    expect(canTransition('ON_HOLD', 'IN_WASHING', { resumeTo: 'IN_DRYING' }).ok).toBe(false)
  })
})

describe('nextStatuses', () => {
  it('mengurutkan status maju lalu pengecualian', () => {
    expect(nextStatuses('IN_WASHING')).toEqual(['IN_DRYING', 'ON_HOLD', 'ISSUE_REPORTED', 'CANCELLED'])
  })
  it('status akhir tidak punya lanjutan', () => {
    expect(nextStatuses('COMPLETED')).toEqual([])
    expect(nextStatuses('CANCELLED')).toEqual([])
  })
  it('DELIVERED hanya bisa ke COMPLETED', () => {
    expect(nextStatuses('DELIVERED')).toEqual(['COMPLETED'])
  })
  it('ON_HOLD kembali ke status sebelumnya atau batal', () => {
    expect(nextStatuses('ON_HOLD', 'IN_DRYING')).toEqual(['IN_DRYING', 'CANCELLED'])
  })
})

describe('statusPhase & requiresReason', () => {
  it('memetakan fase', () => {
    expect(statusPhase('PICKED_UP')).toBe('intake')
    expect(statusPhase('IN_IRONING')).toBe('production')
    expect(statusPhase('QUALITY_CHECK')).toBe('qc')
    expect(statusPhase('OUT_FOR_DELIVERY')).toBe('ready')
    expect(statusPhase('DELIVERED')).toBe('done')
    expect(statusPhase('ON_HOLD')).toBe('exception')
  })
  it('alasan wajib untuk hold, kendala, batal', () => {
    expect(requiresReason('ON_HOLD')).toBe(true)
    expect(requiresReason('ISSUE_REPORTED')).toBe(true)
    expect(requiresReason('CANCELLED')).toBe(true)
    expect(requiresReason('IN_DRYING')).toBe(false)
  })
})
