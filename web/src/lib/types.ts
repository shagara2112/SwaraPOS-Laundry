// Tipe domain bersama untuk web. Bentuknya mengikuti model data TDD §6,
// disederhanakan untuk prototipe tampilan.

export type OrderStatus =
  | 'DRAFT'
  | 'REQUESTED'
  | 'PICKUP_ASSIGNED'
  | 'PICKED_UP'
  | 'RECEIVED'
  | 'INSPECTED'
  | 'WEIGHED_OR_COUNTED'
  | 'IN_WASHING'
  | 'IN_DRYING'
  | 'IN_IRONING'
  | 'IN_FINISHING'
  | 'QUALITY_CHECK'
  | 'READY_FOR_PICKUP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ON_HOLD'
  | 'ISSUE_REPORTED'

export type StatusPhase = 'intake' | 'production' | 'qc' | 'ready' | 'done' | 'exception'
export type PricingUnit = 'KG' | 'ITEM' | 'PAIR' | 'PACKAGE' | 'SQM' | 'ADDON'
export type IntakeType = 'WALK_IN' | 'DROP_OFF' | 'PICKUP'
export type HandbackType = 'SELF_PICKUP' | 'DELIVERY'
export type OrderChannel = 'CASHIER' | 'LANDING' | 'WHATSAPP'
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED' | 'FAILED'
export type OrderPaymentMethod = 'CASH' | 'TRANSFER' | 'QRIS' | 'COD'
export type WaEvent =
  | 'ORDER_RECEIVED'
  | 'IN_PROCESS'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'COMPLETED'
  | 'PAYMENT_DUE'
  | 'ISSUE'
export type WaState = 'NOT_SENT' | 'OPENED' | 'SENT'
export type StaffRole = 'OWNER' | 'CASHIER' | 'OPERATOR' | 'QC' | 'COURIER'
export type DeliveryTaskStatus =
  | 'UNASSIGNED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'ON_THE_WAY'
  | 'ARRIVED'
  | 'DONE'
  | 'FAILED'
export type TenantStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED'
export type PlanCode = 'BASIC' | 'PRO'
export type InvoiceStatus = 'UNPAID' | 'UNDER_REVIEW' | 'PAID' | 'OVERDUE'
export type SubmissionStatus = 'UNDER_REVIEW' | 'AMOUNT_MISMATCH_REVIEW' | 'APPROVED' | 'REJECTED'
export type InstructionMethod = 'TRANSFER' | 'LINK' | 'QRIS'

export interface Actor {
  id: string
  name: string
}

export interface LatLng {
  lat: number
  lng: number
}

export interface Outlet extends LatLng {
  id: string
  code: string
  name: string
  address: string
  phone: string
  hours: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  address?: string
  location?: LatLng
  notes?: string
  createdAt: string
}

export interface Service {
  id: string
  name: string
  category: string
  unit: PricingUnit
  /** Harga per outlet, key = outletId, nilai = rupiah integer. */
  prices: Record<string, number>
  durationHours: number
  active: boolean
}

export interface OrderItem {
  id: string
  serviceId: string
  name: string
  unit: PricingUnit
  qty: number
  unitPrice: number
  total: number
}

export interface OrderTotals {
  subtotal: number
  expressFee: number
  pickupFee: number
  deliveryFee: number
  total: number
}

export interface StatusEvent {
  id: string
  from: OrderStatus | null
  to: OrderStatus
  actor: Actor
  at: string
  note?: string
}

export interface OrderPayment {
  id: string
  method: OrderPaymentMethod
  amount: number
  at: string
  actor: Actor
}

export interface WaLog {
  id: string
  event: WaEvent
  state: WaState
  updatedAt?: string
  actor?: Actor
}

export interface Order {
  id: string
  orderNo: string
  trackingToken: string
  outletId: string
  customerId: string
  channel: OrderChannel
  intake: IntakeType
  handback: HandbackType
  express: boolean
  status: OrderStatus
  items: OrderItem[]
  totals: OrderTotals
  conditionNotes: string[]
  qcPassed: boolean
  paymentStatus: PaymentStatus
  payments: OrderPayment[]
  history: StatusEvent[]
  whatsapp: WaLog[]
  dueAt: string
  createdAt: string
  version: number
  /** Kunci draf kasir; retry/double-click dengan kunci sama tidak membuat order baru. */
  idempotencyKey?: string
}

export interface Staff {
  id: string
  name: string
  role: StaffRole
  outletId: string
  phone: string
}

export interface DeliveryZone {
  id: string
  name: string
  minKm: number
  maxKm: number
  pickupFee: number
  deliveryFee: number
}

export interface DeliveryTask {
  id: string
  orderId: string
  type: 'PICKUP' | 'DELIVERY'
  courierId?: string
  status: DeliveryTaskStatus
  scheduledAt: string
  address: string
  distanceKm: number
  fee: number
  proof?: { receiverName: string; method: 'PHOTO' | 'SIGNATURE' | 'PIN'; at: string }
  failReason?: string
}

export interface Plan {
  code: PlanCode
  name: string
  pricePerOutletMonth: number
  limits: { ordersPerMonth: number; staff: number }
  features: string[]
}

export interface PlatformTenant {
  id: string
  name: string
  slug: string
  ownerName: string
  ownerPhone: string
  city: string
  status: TenantStatus
  plan: PlanCode
  outletCount: number
  userCount: number
  ordersThisMonth: number
  createdAt: string
  trialEndsAt?: string
  supportNotes: string[]
}

export interface SubscriptionInvoice {
  id: string
  tenantId: string
  number: string
  period: string
  amount: number
  status: InvoiceStatus
  dueAt: string
  paidAt?: string
}

export interface PaymentInstruction {
  id: string
  method: InstructionMethod
  label: string
  bankName?: string
  accountName?: string
  accountNumber?: string
  paymentUrl?: string
  merchantName?: string
  instructions: string
  sortOrder: number
  active: boolean
}

export interface PaymentSubmission {
  id: string
  invoiceId: string
  tenantId: string
  instructionId: string
  method: InstructionMethod
  amountClaimed: number
  note?: string
  status: SubmissionStatus
  submittedAt: string
  submittedBy: Actor
  proof: { fileName: string; fileType: string; fileSize: number }
  reviewedBy?: Actor
  reviewedAt?: string
  reviewNote?: string
}

export interface AuditEntry {
  id: string
  at: string
  actor: Actor
  action: string
  tenantId?: string
  entity: string
  entityId: string
  detail: string
}

export interface HealthCheck {
  name: string
  status: 'UP' | 'DEGRADED' | 'DOWN'
  latencyMs: number
  note?: string
}
