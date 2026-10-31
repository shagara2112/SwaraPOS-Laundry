import type { BadgeTone } from '@/components/ui/badge'
import { formatRupiah } from '@/lib/format'
import type {
  DeliveryTaskStatus,
  HandbackType,
  IntakeType,
  InvoiceStatus,
  OrderChannel,
  OrderPaymentMethod,
  OrderStatus,
  PaymentStatus,
  PricingUnit,
  StaffRole,
  SubmissionStatus,
  TenantStatus,
  WaState,
} from '@/lib/types'

// Label dan nada warna untuk enum domain. Satu tempat supaya teks UI konsisten.

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: BadgeTone }> = {
  UNPAID: { label: 'Belum bayar', tone: 'danger' },
  PARTIAL: { label: 'Bayar sebagian', tone: 'warning' },
  PAID: { label: 'Lunas', tone: 'success' },
  REFUNDED: { label: 'Refund', tone: 'neutral' },
  FAILED: { label: 'Gagal', tone: 'danger' },
}

export const PAYMENT_METHOD_LABEL: Record<OrderPaymentMethod, string> = {
  CASH: 'Tunai',
  TRANSFER: 'Transfer',
  QRIS: 'QRIS',
  COD: 'Bayar saat antar',
}

export const INTAKE_LABEL: Record<IntakeType, string> = {
  WALK_IN: 'Walk-in',
  DROP_OFF: 'Drop-off',
  PICKUP: 'Dijemput',
}

export const HANDBACK_LABEL: Record<HandbackType, string> = {
  SELF_PICKUP: 'Ambil sendiri',
  DELIVERY: 'Diantar',
}

export const CHANNEL_LABEL: Record<OrderChannel, string> = {
  CASHIER: 'Kasir',
  LANDING: 'Landing page',
  WHATSAPP: 'WhatsApp',
}

export const WA_STATE: Record<WaState, { label: string; tone: BadgeTone }> = {
  NOT_SENT: { label: 'Belum dikirim', tone: 'warning' },
  OPENED: { label: 'Dibuka', tone: 'primary' },
  SENT: { label: 'Ditandai terkirim', tone: 'success' },
}

export const ROLE_LABEL: Record<StaffRole, string> = {
  OWNER: 'Owner',
  CASHIER: 'Kasir',
  OPERATOR: 'Operator',
  QC: 'Quality control',
  COURIER: 'Kurir',
}

export const DELIVERY_STATUS: Record<DeliveryTaskStatus, { label: string; tone: BadgeTone }> = {
  UNASSIGNED: { label: 'Belum ditugaskan', tone: 'warning' },
  ASSIGNED: { label: 'Ditugaskan', tone: 'intake' },
  ACCEPTED: { label: 'Diterima kurir', tone: 'intake' },
  ON_THE_WAY: { label: 'Dalam perjalanan', tone: 'ready' },
  ARRIVED: { label: 'Tiba di lokasi', tone: 'ready' },
  DONE: { label: 'Selesai', tone: 'success' },
  FAILED: { label: 'Gagal', tone: 'danger' },
}

export const TENANT_STATUS: Record<TenantStatus, { label: string; tone: BadgeTone }> = {
  TRIAL: { label: 'Trial', tone: 'primary' },
  ACTIVE: { label: 'Aktif', tone: 'success' },
  PAST_DUE: { label: 'Menunggak', tone: 'warning' },
  SUSPENDED: { label: 'Suspended', tone: 'danger' },
  CANCELLED: { label: 'Berhenti', tone: 'neutral' },
}

export const INVOICE_STATUS: Record<InvoiceStatus, { label: string; tone: BadgeTone }> = {
  UNPAID: { label: 'Belum dibayar', tone: 'warning' },
  UNDER_REVIEW: { label: 'Menunggu review', tone: 'primary' },
  PAID: { label: 'Lunas', tone: 'success' },
  OVERDUE: { label: 'Lewat jatuh tempo', tone: 'danger' },
}

export const SUBMISSION_STATUS: Record<SubmissionStatus, { label: string; tone: BadgeTone }> = {
  UNDER_REVIEW: { label: 'Menunggu review', tone: 'primary' },
  AMOUNT_MISMATCH_REVIEW: { label: 'Nominal berbeda', tone: 'warning' },
  APPROVED: { label: 'Disetujui', tone: 'success' },
  REJECTED: { label: 'Ditolak', tone: 'danger' },
}

const CUSTOMER_STATUS: Record<OrderStatus, string> = {
  DRAFT: 'Permintaan diterima',
  REQUESTED: 'Permintaan jemput diterima',
  PICKUP_ASSIGNED: 'Kurir menuju lokasi Anda',
  PICKED_UP: 'Cucian sudah dijemput',
  RECEIVED: 'Diterima di outlet',
  INSPECTED: 'Sedang diperiksa',
  WEIGHED_OR_COUNTED: 'Sudah ditimbang',
  IN_WASHING: 'Sedang dicuci',
  IN_DRYING: 'Sedang dikeringkan',
  IN_IRONING: 'Sedang disetrika',
  IN_FINISHING: 'Sedang dilipat & dikemas',
  QUALITY_CHECK: 'Pemeriksaan kualitas',
  READY_FOR_PICKUP: 'Siap diambil di outlet',
  OUT_FOR_DELIVERY: 'Sedang diantar kurir',
  DELIVERED: 'Sudah diterima',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
  ON_HOLD: 'Ditunda sementara',
  ISSUE_REPORTED: 'Perlu konfirmasi',
}

/** Label status untuk halaman lacak pelanggan (tanpa istilah internal). */
export function customerStatusLabel(status: OrderStatus, handback: HandbackType): string {
  if (status === 'READY_FOR_PICKUP' && handback === 'DELIVERY') return 'Siap diantar'
  return CUSTOMER_STATUS[status]
}

export const UNIT_SHORT: Record<PricingUnit, string> = {
  KG: 'kg',
  ITEM: 'pcs',
  PAIR: 'pasang',
  PACKAGE: 'paket',
  SQM: 'm²',
  ADDON: '×',
}

export function formatQty(unit: PricingUnit, qty: number): string {
  const n = qty.toLocaleString('id-ID', { maximumFractionDigits: 2 })
  return unit === 'ADDON' ? `${n}×` : `${n} ${UNIT_SHORT[unit]}`
}

/** Rincian baris nota: "3,5 kg × Rp7.000", atau "Add-on Rp5.000" untuk add-on. */
export function formatLineDetail(unit: PricingUnit, qty: number, unitPrice: number): string {
  if (unit === 'ADDON') return qty === 1 ? `Add-on ${formatRupiah(unitPrice)}` : `${qty}× add-on ${formatRupiah(unitPrice)}`
  return `${formatQty(unit, qty)} × ${formatRupiah(unitPrice)}`
}

function span(minutes: number): string {
  const days = Math.floor(minutes / (24 * 60))
  const hours = Math.floor((minutes % (24 * 60)) / 60)
  const mins = minutes % 60
  if (days > 0) return hours > 0 ? `${days} hari ${hours} jam` : `${days} hari`
  if (hours > 0) return mins > 0 ? `${hours} jam ${mins} mnt` : `${hours} jam`
  return `${mins} mnt`
}

/** "1 jam 30 mnt lagi" atau "terlambat 3 jam" relatif terhadap `now`. */
export function formatDueIn(dueIso: string, now: Date): string {
  const minutes = Math.round((new Date(dueIso).getTime() - now.getTime()) / 60_000)
  return minutes >= 0 ? `${span(minutes)} lagi` : `terlambat ${span(-minutes)}`
}
