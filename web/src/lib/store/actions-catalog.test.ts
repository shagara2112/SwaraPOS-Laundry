import { describe, it, expect } from 'vitest'
import type { Actor } from '@/lib/types'
import { addCustomer } from './actions-catalog'
import { createSeed } from './seed'
import type { ActionResult, DemoState } from './state'

const now = new Date('2026-10-31T03:00:00Z')
const actor: Actor = { id: 'st-dewi', name: 'Dewi Anggraini' }
const s0 = createSeed(now)

function ok<T>(r: ActionResult<T>): { state: DemoState; value: T } {
  if (!r.ok) throw new Error(`expected ok, got ${r.error}`)
  return r
}

describe('addCustomer', () => {
  it('menambah pelanggan baru', () => {
    const { state, value } = ok(addCustomer(s0, { name: '  Budi Hartawan ', phone: '0813 1111 2222' }, actor, now))
    expect(value.name).toBe('Budi Hartawan')
    expect(value.phone).toBe('0813 1111 2222')
    expect(state.customers.length).toBe(s0.customers.length + 1)
  })

  it('telepon yang sama (beda format) mengembalikan pelanggan lama', () => {
    const first = ok(addCustomer(s0, { name: 'Budi', phone: '0813 1111 2222' }, actor, now))
    const again = ok(addCustomer(first.state, { name: 'Budi H', phone: '+62 813-1111-2222' }, actor, now))
    expect(again.value.id).toBe(first.value.id)
    expect(again.state.customers.length).toBe(first.state.customers.length)
  })

  it('nama kosong atau telepon tidak valid ditolak', () => {
    expect(addCustomer(s0, { name: ' ', phone: '081311112222' }, actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
    expect(addCustomer(s0, { name: 'Budi', phone: '12' }, actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
  })
})
