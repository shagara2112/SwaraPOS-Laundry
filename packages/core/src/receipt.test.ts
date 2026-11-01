import { describe, expect, it } from 'vitest'
import { buildReceipt, receiptHtml } from './receipt'
import { amountDue, paidAmount } from './selectors'
import { createSeed } from './store/seed'
import type { Order } from './types'

const now = new Date('2026-10-31T03:00:00Z')
const s = createSeed(now)
const outlet = s.outlets[0]
const partial = s.orders.find((o) => o.paymentStatus === 'PARTIAL')!
const customerOf = (o: Order) => s.customers.find((c) => c.id === o.customerId)!
const build = (order: Order, customer = customerOf(order)) =>
  buildReceipt({ order, outlet: s.outlets.find((x) => x.id === order.outletId)!, customer, businessName: s.tenant.name, trackingOrigin: 'https://swarapos.id' })

describe('buildReceipt', () => {
  const r = build(partial)

  it('kepala nota memuat bisnis, outlet, dan data order', () => {
    expect(r).toMatchObject({ businessName: s.tenant.name, orderNo: partial.orderNo, customerName: customerOf(partial).name })
    expect(r.outletLines).toContain(s.outlets.find((x) => x.id === partial.outletId)!.address)
    expect(r.cashier).toBe(partial.history[0].actor.name)
  })

  it('rincian item, biaya, total, pembayaran, dan sisa tagihan sesuai order', () => {
    expect(r.lines).toHaveLength(partial.items.length)
    expect(r.subtotal).toBe(partial.totals.subtotal)
    expect(r.total).toBe(partial.totals.total)
    expect(r.payments).toHaveLength(partial.payments.length)
    expect(r.paid).toBe(paidAmount(partial))
    expect(r.due).toBe(amountDue(partial))
    expect(r.statusLabel).toBe('Bayar sebagian')
  })

  it('hanya biaya yang dikenakan yang tampil', () => {
    const withFees: Order = { ...partial, totals: { ...partial.totals, expressFee: 10000, pickupFee: 5000, deliveryFee: 0 } }
    expect(build(withFees).fees.map((f) => f.label)).toEqual(['Biaya express', 'Biaya jemput'])
  })

  it('link lacak memakai token order', () => {
    expect(r.trackingUrl).toBe(`https://swarapos.id/lacak/${partial.trackingToken}`)
  })
})

describe('receiptHtml', () => {
  const r = build(partial)

  it('lebar kertas 58 atau 80 mm', () => {
    expect(receiptHtml(r, 58)).toContain('width: 58mm')
    expect(receiptHtml(r, 80)).toContain('width: 80mm')
  })

  it('memuat nomor order, total, sisa tagihan, dan QR lacak', () => {
    const html = receiptHtml(r, 58)
    expect(html).toContain(partial.orderNo)
    expect(html).toContain('Rp' + partial.totals.total.toLocaleString('id-ID'))
    expect(html).toContain('Sisa tagihan')
    expect(html).toMatch(/<svg[\s\S]*<\/svg>/)
  })

  it('teks dari pelanggan di-escape agar tidak merusak nota', () => {
    const evil = { ...customerOf(partial), name: '<b>Budi</b> & "Ani"' }
    const html = receiptHtml(build(partial, evil), 58)
    expect(html).toContain('&lt;b&gt;Budi&lt;/b&gt; &amp; &quot;Ani&quot;')
    expect(html).not.toContain('<b>Budi</b>')
  })
})

describe('nota dengan diskon dan refund', () => {
  it('menampilkan baris diskon beserta alasan, dan refund sebagai pembayaran minus', () => {
    const withDisc: Order = { ...partial, totals: { ...partial.totals, discount: 2000 }, discount: { type: 'AMOUNT', value: 2000, reason: 'Langganan' }, payments: [...partial.payments, { id: 'r1', method: 'CASH', amount: -1000, at: now.toISOString(), actor: { id: 'a', name: 'A' }, refund: true }] }
    const r = build(withDisc)
    expect(r.fees).toContainEqual({ label: 'Diskon (Langganan)', amount: -2000 })
    expect(r.payments.at(-1)?.label.startsWith('Refund Tunai')).toBe(true)
    expect(receiptHtml(r, 58)).toContain('-Rp2.000')
  })
})

describe('nota dengan jumlah potong', () => {
  it('menampilkan jumlah potong bila dicatat', () => {
    expect(build({ ...partial, pieceCount: 15 }).pieceCount).toBe(15)
    expect(receiptHtml(build({ ...partial, pieceCount: 15 }), 58)).toContain('15 pcs')
  })
})
