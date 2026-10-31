import { describe, it, expect } from 'vitest'
import { can, ROLE_HOME, type Action, type Role } from './permissions'

// Spec Android §3: ✓ = boleh.
const MATRIX: Record<Action, Role[]> = {
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
}
const ROLES: Role[] = ['OWNER', 'CASHIER', 'OPERATOR', 'QC', 'COURIER']

describe('can', () => {
  const cases = (Object.keys(MATRIX) as Action[]).flatMap((action) =>
    ROLES.map((role) => [role, action, MATRIX[action].includes(role)] as const),
  )
  it.each(cases)('%s → %s = %s', (role, action, expected) => {
    expect(can(role, action)).toBe(expected)
  })
})

describe('ROLE_HOME', () => {
  it('setiap peran punya rute awal grup tabnya', () => {
    // Folder biasa (bukan grup) supaya setiap peran punya path unik dan tidak bentrok dengan "/".
    expect(ROLE_HOME).toEqual({
      OWNER: '/owner',
      CASHIER: '/kasir',
      OPERATOR: '/operator',
      QC: '/qc',
      COURIER: '/kurir',
    })
  })
})
