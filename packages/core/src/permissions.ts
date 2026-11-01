import type { StaffRole } from './types'

export type Role = StaffRole

export type Action =
  | 'order.create'
  | 'order.transition'
  | 'order.hold'
  | 'order.cancel'
  | 'order.qc'
  | 'order.payment'
  | 'order.whatsapp'
  | 'delivery.update'
  | 'delivery.assign'
  | 'customer.create'
  | 'customer.update'
  | 'customer.delete'
  | 'order.adjust'
  | 'order.credit'
  | 'order.discount'
  | 'order.refund'

// Spec Android §3. Dipakai UI untuk menampilkan/menyembunyikan aksi; backend nanti menegakkan hal yang sama.
const ALLOWED: Record<Action, Role[]> = {
  'order.create': ['OWNER', 'CASHIER'],
  'order.transition': ['OWNER', 'CASHIER', 'OPERATOR'],
  'order.hold': ['OWNER', 'CASHIER', 'OPERATOR', 'QC'],
  'order.cancel': ['OWNER', 'CASHIER'],
  'order.qc': ['OWNER', 'QC'],
  'order.payment': ['OWNER', 'CASHIER', 'COURIER'],
  'order.whatsapp': ['OWNER', 'CASHIER'],
  'delivery.update': ['OWNER', 'COURIER'],
  'delivery.assign': ['OWNER', 'CASHIER'],
  'customer.create': ['OWNER', 'CASHIER'],
  'customer.update': ['OWNER', 'CASHIER'],
  'customer.delete': ['OWNER', 'CASHIER'],
  'order.adjust': ['OWNER', 'CASHIER'],
  'order.credit': ['OWNER', 'CASHIER'],
  'order.discount': ['OWNER', 'CASHIER'],
  'order.refund': ['OWNER', 'CASHIER'],
}

export function can(role: Role, action: Action): boolean {
  return ALLOWED[action].includes(role)
}

/** Rute awal (folder tab Expo Router) untuk tiap peran. */
export const ROLE_HOME: Record<Role, string> = {
  OWNER: '/owner',
  CASHIER: '/kasir',
  OPERATOR: '/operator',
  QC: '/qc',
  COURIER: '/kurir',
}
