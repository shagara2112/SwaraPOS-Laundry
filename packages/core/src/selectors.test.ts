import { describe, it, expect } from 'vitest'
import { amountDue, dashboardKpis, isLate, planUsage, resolveStaff, resumeTarget, trackingUrl } from './selectors'
import { createSeed } from './store/seed'
import type { DemoState } from './store/state'
import type { Order } from './types'

const now = new Date('2026-10-31T03:00:00Z')
const s0 = createSeed(now)
const o: Order = s0.orders[0]

function withOrders(orders: Order[]): DemoState {
  return { ...s0, orders }
}

describe('isLate', () => {
  it('hanya untuk order aktif yang lewat jatuh tempo', () => {
    expect(isLate({ ...o, status: 'IN_WASHING', dueAt: '2026-10-31T02:00:00Z' }, now)).toBe(true)
    expect(isLate({ ...o, status: 'COMPLETED', dueAt: '2026-10-31T02:00:00Z' }, now)).toBe(false)
    expect(isLate({ ...o, status: 'CANCELLED', dueAt: '2026-10-31T02:00:00Z' }, now)).toBe(false)
    expect(isLate({ ...o, status: 'IN_WASHING', dueAt: '2026-10-31T05:00:00Z' }, now)).toBe(false)
  })
})

describe('amountDue', () => {
  it('sisa tagihan tidak pernah negatif', () => {
    const base = { ...o, totals: { ...o.totals, total: 50000 } }
    expect(amountDue({ ...base, payments: [] })).toBe(50000)
    expect(amountDue({ ...base, payments: [{ id: 'p', method: 'CASH', amount: 20000, at: now.toISOString(), actor: { id: 'a', name: 'A' } }] })).toBe(30000)
    expect(amountDue({ ...base, payments: [{ id: 'p', method: 'CASH', amount: 60000, at: now.toISOString(), actor: { id: 'a', name: 'A' } }] })).toBe(0)
  })
})

describe('dashboardKpis', () => {
  const actor = { id: 'a', name: 'A' }
  it('menghitung order hari ini menurut tanggal WIB', () => {
    const today = { ...o, id: 'x1', createdAt: '2026-10-30T18:00:00Z', payments: [] } // 31 Okt 01.00 WIB
    const yesterday = { ...o, id: 'x2', createdAt: '2026-10-30T16:00:00Z', payments: [] } // 30 Okt 23.00 WIB
    expect(dashboardKpis(withOrders([today, yesterday]), now).ordersToday).toBe(1)
  })

  it('omzet hari ini dari pembayaran yang masuk hari ini', () => {
    const paid = {
      ...o,
      payments: [
        { id: 'p1', method: 'CASH' as const, amount: 30000, at: '2026-10-31T01:00:00Z', actor },
        { id: 'p2', method: 'CASH' as const, amount: 99000, at: '2026-10-29T01:00:00Z', actor },
      ],
    }
    expect(dashboardKpis(withOrders([paid]), now).revenueToday).toBe(30000)
  })

  it('piutang mengabaikan order batal dan menghitung keterlambatan', () => {
    const open = { ...o, id: 'a', status: 'IN_IRONING' as const, dueAt: '2026-10-30T00:00:00Z', totals: { ...o.totals, total: 40000 }, payments: [] }
    const cancelled = { ...o, id: 'b', status: 'CANCELLED' as const, totals: { ...o.totals, total: 70000 }, payments: [] }
    const kpi = dashboardKpis(withOrders([open, cancelled]), now)
    expect(kpi.receivables).toBe(40000)
    expect(kpi.lateCount).toBe(1)
  })
})

describe('resumeTarget & trackingUrl', () => {
  it('mengambil status sebelum hold', () => {
    const held = s0.orders.find((x) => x.status === 'ON_HOLD')!
    expect(resumeTarget(held)).toBe('IN_DRYING')
  })

  it('membentuk URL lacak', () => {
    expect(trackingUrl('abc123', 'https://x.test')).toBe('https://x.test/lacak/abc123')
  })
})

describe('planUsage', () => {
  it('menghitung pemakaian outlet dan staf terhadap limit paket', () => {
    const usage = planUsage({ outlets: 10, staff: 25 }, { outlets: 2, staff: 9 })
    expect(usage).toEqual([
      { key: 'outlets', label: 'Outlet', used: 2, limit: 10, pct: 20, reached: false },
      { key: 'staff', label: 'Karyawan', used: 9, limit: 25, pct: 36, reached: false },
    ])
  })

  it('menandai limit tercapai dan tidak melewati 100%', () => {
    const [outlets, staff] = planUsage({ outlets: 1, staff: 5 }, { outlets: 1, staff: 7 })
    expect(outlets).toMatchObject({ reached: true, pct: 100 })
    expect(staff).toMatchObject({ reached: true, pct: 100 })
  })
})

describe('resolveStaff', () => {
  it('memakai staf pilihan sesi bila peran dan outlet cocok', () => {
    expect(resolveStaff(s0.staff, { role: 'COURIER', outletId: 'o-kmg', staffId: 'st-fajar' })?.id).toBe('st-fajar')
  })

  it('tanpa pilihan, memakai staf pertama peran itu di outlet', () => {
    expect(resolveStaff(s0.staff, { role: 'COURIER', outletId: 'o-kmg' })?.id).toBe('st-bayu')
  })

  it('pilihan sesi dari peran atau outlet lain diabaikan', () => {
    expect(resolveStaff(s0.staff, { role: 'COURIER', outletId: 'o-kmg', staffId: 'st-rizky' })?.id).toBe('st-bayu')
    expect(resolveStaff(s0.staff, { role: 'CASHIER', outletId: 'o-kmg', staffId: 'st-fajar' })?.role).toBe('CASHIER')
  })
})
