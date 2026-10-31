import { formatRupiah } from '@/lib/format'
import type { OrderStatus, WaEvent } from '@/lib/types'

export type WaContext = {
  customerName: string
  orderNo: string
  outletName: string
  trackingUrl: string
  /** Sisa tagihan; disebut di pesan bila lebih dari nol. */
  amountDue?: number
}

export const WA_EVENT_LABEL: Record<WaEvent, string> = {
  ORDER_RECEIVED: 'Order diterima',
  IN_PROCESS: 'Mulai diproses',
  READY: 'Siap diambil',
  OUT_FOR_DELIVERY: 'Sedang diantar',
  COMPLETED: 'Selesai',
  PAYMENT_DUE: 'Pengingat bayar',
  ISSUE: 'Kendala',
}

const STATUS_EVENT: Partial<Record<OrderStatus, WaEvent>> = {
  RECEIVED: 'ORDER_RECEIVED',
  IN_WASHING: 'IN_PROCESS',
  READY_FOR_PICKUP: 'READY',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'COMPLETED',
  COMPLETED: 'COMPLETED',
  ISSUE_REPORTED: 'ISSUE',
}

/** Ubah nomor lokal (`08…`, `+62 …`, `8…`) ke format `628…` untuk wa.me. */
export function normalizePhoneID(phone: string): string | null {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = '62' + digits.slice(1)
  else if (digits.startsWith('8')) digits = '62' + digits
  return /^628\d{7,11}$/.test(digits) ? digits : null
}

export function buildWaUrl(phone: string, text: string): string | null {
  const number = normalizePhoneID(phone)
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null
}

export function waEventForStatus(status: OrderStatus): WaEvent | null {
  return STATUS_EVENT[status] ?? null
}

export function buildWaMessage(event: WaEvent, ctx: WaContext): string {
  const { customerName: name, orderNo, outletName: outlet, trackingUrl: url } = ctx
  const total = ctx.amountDue ? ` Sisa tagihan ${formatRupiah(ctx.amountDue)}.` : ''
  switch (event) {
    case 'ORDER_RECEIVED':
      return `Halo ${name}, order laundry Anda ${orderNo} sudah kami terima di ${outlet}.${total} Pantau status cucian Anda di sini: ${url}\n\nTerima kasih.`
    case 'IN_PROCESS':
      return `Halo ${name}, cucian Anda (${orderNo}) mulai kami proses. Lihat perkembangannya di sini: ${url}`
    case 'READY':
      return `Halo ${name}, cucian Anda (${orderNo}) sudah selesai dan siap diambil di ${outlet}.${total} Detail dan tagihan: ${url}`
    case 'OUT_FOR_DELIVERY':
      return `Halo ${name}, cucian Anda (${orderNo}) sedang diantar kurir kami. Lacak pengantaran di sini: ${url}`
    case 'COMPLETED':
      return `Halo ${name}, order ${orderNo} sudah selesai. Terima kasih telah mempercayakan cucian Anda kepada ${outlet}. Riwayat order: ${url}`
    case 'PAYMENT_DUE':
      return `Halo ${name}, tagihan order ${orderNo} belum lunas.${total} Instruksi pembayaran ada di sini: ${url}`
    case 'ISSUE':
      return `Halo ${name}, ada kendala pada order ${orderNo}. Tim ${outlet} akan segera menghubungi Anda. Detail: ${url}`
  }
}
