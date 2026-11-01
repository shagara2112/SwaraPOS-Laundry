import qrcode from 'qrcode-generator'
import { formatDateTime, formatRupiah } from './format'
import { formatLineDetail, HANDBACK_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS } from './labels'
import { amountDue, paidAmount, trackingUrl } from './selectors'
import type { Customer, Order, Outlet, ReceiptPaper } from './types'

/** Isi nota order, siap dirender ke HTML untuk dicetak atau dibagikan sebagai PDF. */
export type Receipt = {
  businessName: string
  /** Nama, alamat, telepon, dan jam buka outlet. */
  outletLines: string[]
  orderNo: string
  createdAt: string
  dueAt: string
  customerName: string
  customerPhone: string
  cashier: string
  handback: string
  express: boolean
  pieceCount?: number
  lines: { name: string; detail: string; total: number }[]
  subtotal: number
  fees: { label: string; amount: number }[]
  total: number
  payments: { label: string; amount: number }[]
  paid: number
  due: number
  statusLabel: string
  trackingUrl: string
}

export function buildReceipt(input: { order: Order; outlet: Outlet; customer: Customer; businessName: string; trackingOrigin: string }): Receipt {
  const { order, outlet, customer } = input
  const { totals } = order
  const fees = [
    { label: 'Biaya express', amount: totals.expressFee },
    { label: order.discount ? `Diskon (${order.discount.reason})` : 'Diskon', amount: -(totals.discount ?? 0) },
    { label: 'Biaya jemput', amount: totals.pickupFee },
    { label: 'Biaya antar', amount: totals.deliveryFee },
  ].filter((f) => f.amount !== 0)

  return {
    businessName: input.businessName,
    outletLines: [outlet.name, outlet.address, `Telp ${outlet.phone}`, outlet.hours],
    orderNo: order.orderNo,
    createdAt: formatDateTime(order.createdAt),
    dueAt: formatDateTime(order.dueAt),
    customerName: customer.name,
    customerPhone: customer.phone,
    // Petugas yang membuat order (event riwayat pertama).
    cashier: order.history[0]?.actor.name ?? '-',
    handback: HANDBACK_LABEL[order.handback],
    express: order.express,
    pieceCount: order.pieceCount,
    lines: order.items.map((i) => ({ name: i.name, detail: formatLineDetail(i.unit, i.qty, i.unitPrice), total: i.total })),
    subtotal: totals.subtotal,
    fees,
    total: totals.total,
    payments: order.payments.map((p) => ({ label: `${p.refund ? 'Refund ' : ''}${PAYMENT_METHOD_LABEL[p.method]} · ${formatDateTime(p.at)}`, amount: p.amount })),
    paid: paidAmount(order),
    due: amountDue(order),
    statusLabel: PAYMENT_STATUS[order.paymentStatus].label,
    trackingUrl: trackingUrl(order.trackingToken, input.trackingOrigin),
  }
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const esc = (text: string) => text.replace(/[&<>"']/g, (c) => ESCAPES[c])

function qrSvg(url: string): string {
  const qr = qrcode(0, 'M')
  qr.addData(url)
  qr.make()
  return qr.createSvgTag({ cellSize: 2, margin: 2, scalable: true })
}

const row = (label: string, value: string, cls = '') => `<div class="row ${cls}"><span>${esc(label)}</span><span>${esc(value)}</span></div>`

/** HTML nota mandiri (CSS inline) untuk printer thermal 58/80 mm, dipakai web dan Android. */
export function receiptHtml(r: Receipt, paper: ReceiptPaper): string {
  const fontSize = paper === 58 ? 11 : 12
  const items = r.lines
    .map((l) => `<div class="item"><div>${esc(l.name)}</div>${row(l.detail, formatRupiah(l.total), 'sub')}</div>`)
    .join('')
  const fees = r.fees.map((f) => row(f.label, formatRupiah(f.amount))).join('')
  const payments = r.payments.length ? r.payments.map((p) => row(p.label, formatRupiah(p.amount), 'sub')).join('') : '<div class="sub">Belum ada pembayaran.</div>'

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nota ${esc(r.orderNo)}</title>
<style>
  @page { margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #fff; color: #000; font-family: 'Courier New', Courier, monospace; font-size: ${fontSize}px; line-height: 1.35; }
  .nota { width: ${paper}mm; padding: 3mm; }
  .c { text-align: center; }
  .b { font-weight: 700; }
  .big { font-size: ${fontSize + 3}px; }
  .row { display: flex; justify-content: space-between; gap: 6px; }
  .row span:last-child { text-align: right; white-space: nowrap; }
  .sub { font-size: ${fontSize - 1}px; }
  .item { margin-bottom: 3px; }
  hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
  .qr { width: ${paper === 58 ? 26 : 30}mm; margin: 4px auto 0; }
  .qr svg { width: 100%; height: auto; display: block; }
  .tag { display: inline-block; border: 1px solid #000; padding: 0 4px; font-weight: 700; }
</style>
</head>
<body>
<div class="nota">
  <div class="c b big">${esc(r.businessName)}</div>
  ${r.outletLines.map((l) => `<div class="c sub">${esc(l)}</div>`).join('')}
  <hr>
  <div class="c b big">${esc(r.orderNo)}</div>
  ${row('Masuk', r.createdAt)}
  ${row('Estimasi', r.dueAt, 'b')}
  ${row('Pelanggan', r.customerName)}
  ${row('WhatsApp', r.customerPhone)}
  ${row('Kasir', r.cashier)}
  ${row('Pengembalian', r.handback)}
  ${r.pieceCount ? row('Jumlah potong', `${r.pieceCount} pcs`) : ''}
  ${r.express ? '<div class="c"><span class="tag">EXPRESS</span></div>' : ''}
  <hr>
  ${items}
  <hr>
  ${row('Subtotal', formatRupiah(r.subtotal))}
  ${fees}
  ${row('Total', formatRupiah(r.total), 'b big')}
  <hr>
  ${payments}
  ${row('Sudah dibayar', formatRupiah(r.paid))}
  ${row('Sisa tagihan', formatRupiah(r.due), 'b')}
  <div class="c b">${esc(r.statusLabel)}</div>
  <hr>
  <div class="c sub">Lacak cucian:</div>
  <div class="qr">${qrSvg(r.trackingUrl)}</div>
  <div class="c sub">${esc(r.trackingUrl)}</div>
  <hr>
  <div class="c sub">Simpan nota ini untuk pengambilan cucian.</div>
  <div class="c b">Terima kasih</div>
</div>
</body>
</html>`
}
