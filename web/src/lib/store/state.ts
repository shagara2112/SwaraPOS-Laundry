import { newId } from '@/lib/ids'
import type {
  Actor,
  AuditEntry,
  Customer,
  DeliveryTask,
  DeliveryZone,
  HealthCheck,
  Order,
  Outlet,
  PaymentInstruction,
  PaymentSubmission,
  Plan,
  PlatformTenant,
  Service,
  Staff,
  SubscriptionInvoice,
} from '@/lib/types'

export const DEMO_STATE_VERSION = 1

export interface OutletPaymentMethod {
  id: string
  type: 'TRANSFER' | 'QRIS' | 'CASH'
  label: string
  detail: string
}

export interface DemoState {
  /** Waktu seed dibuat. */
  now: string
  tenantActor: Actor
  adminActor: Actor
  tenant: { id: string; name: string; expressSurchargePct: number }
  outlets: Outlet[]
  activeOutletId: string
  customers: Customer[]
  services: Service[]
  staff: Staff[]
  orders: Order[]
  deliveryTasks: DeliveryTask[]
  zones: DeliveryZone[]
  outletPaymentMethods: OutletPaymentMethod[]
  platform: {
    tenants: PlatformTenant[]
    plans: Plan[]
    invoices: SubscriptionInvoice[]
    instructions: PaymentInstruction[]
    submissions: PaymentSubmission[]
    audit: AuditEntry[]
    health: HealthCheck[]
  }
}

export type ActionError =
  | 'NOT_FOUND'
  | 'NOT_ALLOWED'
  | 'QC_REQUIRED'
  | 'REASON_REQUIRED'
  | 'INVALID_TYPE'
  | 'TOO_LARGE'

export type ActionResult<T = undefined> =
  | { ok: true; state: DemoState; value: T }
  | { ok: false; error: ActionError }

export function fail(error: ActionError): { ok: false; error: ActionError } {
  return { ok: false, error }
}

export function appendAudit(state: DemoState, entry: Omit<AuditEntry, 'id'>): DemoState {
  return {
    ...state,
    platform: {
      ...state.platform,
      audit: [...state.platform.audit, { id: newId('aud'), ...entry }],
    },
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

/** Baca isi localStorage tanpa melempar error; JSON rusak dianggap kosong agar seed baru dipakai. */
export function parseStoredJson(raw: string | null): unknown {
  if (raw === null) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Kembalikan state tersimpan bila versinya cocok dan bentuknya masuk akal; selain itu `null`. */
export function migratePersisted(persisted: unknown, version: number): DemoState | null {
  if (version !== DEMO_STATE_VERSION || !isObject(persisted)) return null
  const p = persisted
  const arrays = ['outlets', 'customers', 'services', 'staff', 'orders', 'deliveryTasks', 'zones']
  if (!arrays.every((key) => Array.isArray(p[key]))) return null
  if (!isObject(p.tenant) || !isObject(p.platform)) return null
  const platform = p.platform
  const platformArrays = ['tenants', 'plans', 'invoices', 'instructions', 'submissions', 'audit', 'health']
  if (!platformArrays.every((key) => Array.isArray(platform[key]))) return null
  return persisted as unknown as DemoState
}
