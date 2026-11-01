import { formatDateTime, formatRupiah, parseRupiahID } from '@swarapos/core/format'
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS } from '@swarapos/core/labels'
import { amountDue, paidAmount } from '@swarapos/core/selectors'
import { recordPayment, recordRefund } from '@swarapos/core/store/actions-order'
import type { Actor, Order, OrderPaymentMethod } from '@swarapos/core/types'
import { HandCoins, Undo2 } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { act } from '@/store/act'
import { color, font, radius, space } from '@/theme'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Card } from '@/ui/Card'
import { ChipRow } from '@/ui/misc'
import { Sheet } from '@/ui/Sheet'
import { TextField } from '@/ui/TextField'

const OUTLET_METHODS: OrderPaymentMethod[] = ['CASH', 'TRANSFER', 'QRIS']

/** Lembar catat pembayaran. Pasang hanya saat dibuka agar nominal awal = sisa tagihan terbaru. */
export function PaymentSheet({ order, actor, methods = OUTLET_METHODS, onClose }: { order: Order; actor: Actor; methods?: OrderPaymentMethod[]; onClose: () => void }) {
  const due = amountDue(order)
  const [method, setMethod] = useState<OrderPaymentMethod>(methods[0])
  const [amount, setAmount] = useState(String(due))
  const parsed = parseRupiahID(amount)
  const error = amount.trim() === '' ? undefined : parsed === null ? 'Isi nominal rupiah bulat, contoh 20000 atau 20.000.' : parsed > due ? `Melebihi sisa tagihan ${formatRupiah(due)}.` : undefined
  const value = parsed !== null && parsed <= due ? parsed : 0

  const save = () => {
    const r = act((s) => recordPayment(s, order.id, { method, amount: value }, actor, new Date()), 'Pembayaran tercatat')
    if (r.ok) onClose()
  }

  return (
    <Sheet visible onClose={onClose} title="Catat pembayaran" description={`${order.orderNo} · sisa ${formatRupiah(due)}`} footer={<Button title="Simpan pembayaran" size="lg" onPress={save} disabled={!(value > 0)} />}>
      {methods.length > 1 && (
        <View style={{ gap: space(2) }}>
          <Text style={styles.label}>Metode</Text>
          <ChipRow items={methods.map((m) => ({ id: m, label: PAYMENT_METHOD_LABEL[m] }))} value={method} onChange={setMethod} />
        </View>
      )}
      <TextField
        label="Nominal (Rp)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="number-pad"
        error={error}
        hint={method === 'CASH' || method === 'COD' ? undefined : 'Transfer dan QRIS diverifikasi manual ke rekening/QRIS outlet.'}
      />
    </Sheet>
  )
}

/** Ringkasan pembayaran order dan tombol catat bila peran boleh. */
export function PaymentPanel({ order, actor, canRecord, canRefund = false }: { order: Order; actor: Actor; canRecord: boolean; canRefund?: boolean }) {
  const [open, setOpen] = useState(false)
  const [refunding, setRefunding] = useState(false)
  const status = PAYMENT_STATUS[order.paymentStatus]
  // Kelebihan bayar yang bisa dikembalikan; order batal: seluruh pembayaran.
  const refundable = paidAmount(order) - (order.status === 'CANCELLED' ? 0 : order.totals.total)
  const due = amountDue(order)
  return (
    <Card style={{ gap: space(3) }}>
      <View style={styles.head}>
        <Text style={styles.title}>Pembayaran</Text>
        <Badge tone={status.tone} label={status.label} />
      </View>
      <View style={styles.grid}>
        <View style={styles.tile}>
          <Text style={styles.tileLabel}>Sudah dibayar</Text>
          <Text style={styles.tileValue}>{formatRupiah(paidAmount(order))}</Text>
        </View>
        <View style={styles.tile}>
          <Text style={styles.tileLabel}>Sisa tagihan</Text>
          <Text style={[styles.tileValue, due > 0 && { color: color.danger }]}>{formatRupiah(due)}</Text>
        </View>
      </View>
      {order.payments.map((p) => (
        <View key={p.id} style={styles.payment}>
          <Text style={styles.paymentMeta}>
            {p.refund ? 'Refund ' : ''}
            {PAYMENT_METHOD_LABEL[p.method]} · {formatDateTime(p.at)}
            {p.note ? `\n${p.note}` : ''}
          </Text>
          <Text style={[styles.paymentAmount, p.refund && { color: color.danger }]}>{formatRupiah(p.amount)}</Text>
        </View>
      ))}
      {canRecord && due > 0 && order.status !== 'CANCELLED' && <Button title="Catat pembayaran" icon={HandCoins} variant="secondary" onPress={() => setOpen(true)} />}
      {canRefund && refundable > 0 && <Button title={`Refund ${formatRupiah(refundable)}`} icon={Undo2} variant="secondary" onPress={() => setRefunding(true)} />}
      {open && <PaymentSheet order={order} actor={actor} onClose={() => setOpen(false)} />}
      {refunding && <RefundSheet order={order} actor={actor} max={refundable} onClose={() => setRefunding(false)} />}
    </Card>
  )
}

/** Kembalikan uang pelanggan, maksimal kelebihan bayar; alasan wajib. */
function RefundSheet({ order, actor, max, onClose }: { order: Order; actor: Actor; max: number; onClose: () => void }) {
  const [method, setMethod] = useState<OrderPaymentMethod>('CASH')
  const [amount, setAmount] = useState(String(max))
  const [reason, setReason] = useState('')
  const parsed = parseRupiahID(amount)
  const error = amount.trim() === '' ? undefined : parsed === null ? 'Isi nominal rupiah bulat.' : parsed > max ? `Maksimal ${formatRupiah(max)}.` : undefined
  const valid = parsed !== null && parsed > 0 && parsed <= max && reason.trim() !== ''
  const save = () => {
    if (!valid) return
    if (act((s) => recordRefund(s, order.id, { method, amount: parsed!, reason }, actor, new Date()), 'Refund tercatat').ok) onClose()
  }
  return (
    <Sheet visible onClose={onClose} title="Refund" description={`${order.orderNo} · maksimal ${formatRupiah(max)}`} footer={<Button title="Catat refund" variant="danger" size="lg" disabled={!valid} onPress={save} />}>
      <View style={{ gap: space(2) }}>
        <Text style={styles.label}>Metode pengembalian</Text>
        <ChipRow items={OUTLET_METHODS.map((m) => ({ id: m, label: PAYMENT_METHOD_LABEL[m] }))} value={method} onChange={setMethod} />
      </View>
      <TextField label="Nominal (Rp)" value={amount} onChangeText={setAmount} keyboardType="number-pad" error={error} />
      <TextField label="Alasan refund" required value={reason} onChangeText={setReason} placeholder="Contoh: order dibatalkan sebelum dicuci" hint="Tercatat di riwayat order, audit log, dan kas masuk." />
    </Sheet>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space(2) },
  title: { fontFamily: font.bold, fontSize: 16, color: color.fg },
  grid: { flexDirection: 'row', gap: space(2.5) },
  tile: { flex: 1, borderRadius: radius.md, backgroundColor: color.surface2, padding: space(3) },
  tileLabel: { fontFamily: font.regular, fontSize: 12, color: color.subtle },
  tileValue: { marginTop: 2, fontFamily: font.bold, fontSize: 16, color: color.fg },
  payment: { flexDirection: 'row', justifyContent: 'space-between', gap: space(3) },
  paymentMeta: { flex: 1, fontFamily: font.regular, fontSize: 13, color: color.muted },
  paymentAmount: { fontFamily: font.semibold, fontSize: 13, color: color.fg },
  label: { fontFamily: font.semibold, fontSize: 14, color: color.fg },
})
