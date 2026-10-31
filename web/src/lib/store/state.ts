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

// Naikkan versi setiap kali bentuk DemoState berubah: migratePersisted hanya memeriksa kerangka atas.
// v2: metode bayar outlet terstruktur (bank, rekening, merchant QRIS, aktif, urutan).
// v3: limit paket = outlet + karyawan (tanpa limit order).
export const DEMO_STATE_VERSION = 3

/** Cara pelanggan membayar ke outlet; dana masuk langsung ke rekening/QRIS milik owner (PRD §G). */
export interface OutletPaymentMethod {
  id: string
  type: 'TRANSFER' | 'QRIS' | 'CASH'
  label: string
  bankName?: string
  accountNumber?: string
  accountName?: string
  merchantName?: string
  instructions: string
  sortOrder: number
  active: boolean
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

const STALE_AFTER_MS = 12 * 60 * 60 * 1000
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/

/** Data demo tersimpan dianggap basi bila dibuat lebih dari 12 jam lalu. */
export function isDemoStale(state: DemoState, now: Date): boolean {
  return now.getTime() - new Date(state.now).getTime() > STALE_AFTER_MS
}

/**
 * Geser semua waktu ISO di state sejauh selisih `state.now` ke `now`, supaya pengunjung yang kembali
 * tidak melihat KPI "hari ini" kosong dan semua order terlambat. Nomor order (berisi tanggal) tidak diubah.
 */
export function shiftDemoTime(state: DemoState, now: Date): DemoState {
  const delta = now.getTime() - new Date(state.now).getTime()
  const shift = (value: unknown): unknown => {
    if (typeof value === 'string') return ISO_DATETIME.test(value) ? new Date(new Date(value).getTime() + delta).toISOString() : value
    if (Array.isArray(value)) return value.map(shift)
    if (isObject(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shift(v)]))
    return value
  }
  return { ...(shift(state) as DemoState), now: now.toISOString() }
}

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
