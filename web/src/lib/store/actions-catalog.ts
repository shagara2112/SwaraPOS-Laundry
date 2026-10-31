import { normalizePhoneID } from '@/lib/domain/whatsapp'
import { newId } from '@/lib/ids'
import type { Actor, Customer, LatLng } from '@/lib/types'
import { fail, type ActionResult, type DemoState } from './state'

export function addCustomer(
  s: DemoState,
  input: { name: string; phone: string; address?: string; location?: LatLng; notes?: string },
  _actor: Actor,
  now: Date,
): ActionResult<Customer> {
  const name = input.name.trim()
  const normalized = normalizePhoneID(input.phone)
  if (!name || !normalized) return fail('NOT_ALLOWED')

  // Satu nomor WhatsApp = satu pelanggan, apa pun format penulisannya.
  const existing = s.customers.find((c) => normalizePhoneID(c.phone) === normalized)
  if (existing) return { ok: true, state: s, value: existing }

  const customer: Customer = {
    id: newId('cus'),
    name,
    phone: input.phone.trim(),
    address: input.address?.trim() || undefined,
    location: input.location,
    notes: input.notes?.trim() || undefined,
    createdAt: now.toISOString(),
  }
  return { ok: true, value: customer, state: { ...s, customers: [...s.customers, customer] } }
}
