import type { OrderTotals, PricingUnit } from '../types'

export type PriceLine = { unit: PricingUnit; unitPrice: number; qty: number }

const HOUR_MS = 60 * 60 * 1000

export function lineTotal(line: PriceLine): number {
  return Math.round(line.unitPrice * line.qty)
}

export function calculateTotals(input: {
  lines: PriceLine[]
  express: boolean
  expressSurchargePct: number
  pickupFee: number
  deliveryFee: number
  discount?: { type: 'AMOUNT' | 'PERCENT'; value: number }
}): OrderTotals & { discount: number } {
  const subtotal = input.lines.reduce((sum, line) => sum + lineTotal(line), 0)
  const expressFee = input.express ? Math.round((subtotal * input.expressSurchargePct) / 100) : 0
  // Diskon hanya memotong nilai cucian (subtotal + express), tidak biaya jemput/antar, dan tidak bisa membuat total minus.
  const base = subtotal + expressFee
  const raw = !input.discount ? 0 : input.discount.type === 'PERCENT' ? Math.round((base * input.discount.value) / 100) : Math.round(input.discount.value)
  const discount = Math.min(base, Math.max(0, raw))
  return {
    subtotal,
    expressFee,
    discount,
    pickupFee: input.pickupFee,
    deliveryFee: input.deliveryFee,
    total: base - discount + input.pickupFee + input.deliveryFee,
  }
}

/** Estimasi selesai dari SLA layanan terpanjang; express memotong separuh. */
export function estimateDueAt(createdAt: Date, durationsHours: number[], express: boolean): Date {
  const longest = Math.max(0, ...durationsHours)
  const hours = express ? Math.ceil(longest / 2) : longest
  return new Date(createdAt.getTime() + hours * HOUR_MS)
}
