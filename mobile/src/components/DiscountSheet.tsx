import { calculateTotals } from '@swarapos/core/domain/pricing'
import { formatRupiah, parseDecimalID, parseRupiahID } from '@swarapos/core/format'
import { paidAmount } from '@swarapos/core/selectors'
import { setOrderDiscount } from '@swarapos/core/store/actions-order'
import type { Actor, Discount, Order } from '@swarapos/core/types'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { act } from '@/store/act'
import { useDemo } from '@/store/demo-store'
import { color, font, radius, space } from '@/theme'
import { Button } from '@/ui/Button'
import { Row, Segmented } from '@/ui/misc'
import { Sheet } from '@/ui/Sheet'
import { TextField } from '@/ui/TextField'

export type DiscountInput = { type: Discount['type']; valueText: string; reason: string }

/** Isian diskon: Rupiah/Persen, nilai, dan alasan. Dipakai di Order baru dan lembar diskon. */
export function DiscountFields({ value, onChange }: { value: DiscountInput; onChange: (v: DiscountInput) => void }) {
  return (
    <View style={{ gap: space(2.5) }}>
      <Segmented<Discount['type']>
        items={[
          { id: 'AMOUNT', label: 'Rupiah' },
          { id: 'PERCENT', label: 'Persen' },
        ]}
        value={value.type}
        onChange={(type) => onChange({ ...value, type })}
      />
      <TextField
        label={value.type === 'PERCENT' ? 'Diskon (%)' : 'Diskon (Rp)'}
        value={value.valueText}
        onChangeText={(valueText) => onChange({ ...value, valueText })}
        keyboardType={value.type === 'PERCENT' ? 'decimal-pad' : 'number-pad'}
        placeholder={value.type === 'PERCENT' ? '10' : '5.000'}
        hint="Memotong nilai cucian, tidak termasuk biaya jemput/antar."
      />
      <TextField label="Alasan diskon" value={value.reason} onChangeText={(reason) => onChange({ ...value, reason })} placeholder="Contoh: pelanggan langganan" />
    </View>
  )
}

/** Beri, ubah, atau hapus diskon order dengan pratinjau total. Pasang saat dibuka. */
export function DiscountSheet({ order, actor, onClose }: { order: Order; actor: Actor; onClose: () => void }) {
  const expressPct = useDemo((s) => s.tenant.expressSurchargePct)
  const [input, setInput] = useState<DiscountInput>(() =>
    order.discount ? { type: order.discount.type, valueText: String(order.discount.value).replace('.', ','), reason: order.discount.reason } : { type: 'AMOUNT', valueText: '', reason: '' },
  )
  const value = input.type === 'PERCENT' ? parseDecimalID(input.valueText) : parseRupiahID(input.valueText)
  const valid = value !== null && value > 0 && (input.type !== 'PERCENT' || value <= 100)
  const totals = calculateTotals({
    lines: order.items,
    express: order.express,
    expressSurchargePct: expressPct,
    pickupFee: order.totals.pickupFee,
    deliveryFee: order.totals.deliveryFee,
    discount: valid ? { type: input.type, value: value! } : undefined,
  })
  const paid = paidAmount(order)
  const blockers = [
    input.valueText.trim() && !valid && 'diskon tidak valid',
    valid && !input.reason.trim() && 'alasan wajib',
    totals.total < paid && `total di bawah yang sudah dibayar (${formatRupiah(paid)}), refund dulu kelebihannya`,
  ].filter(Boolean) as string[]

  const save = (remove = false) => {
    const r = act((s) => setOrderDiscount(s, order.id, remove ? null : { type: input.type, value: value!, reason: input.reason }, actor, new Date()), remove ? 'Diskon dihapus' : 'Diskon tersimpan')
    if (r.ok) onClose()
  }

  return (
    <Sheet
      visible
      onClose={onClose}
      title="Diskon order"
      description={`${order.orderNo} · subtotal + express ${formatRupiah(order.totals.subtotal + order.totals.expressFee)}`}
      footer={
        <>
          {blockers.length > 0 && <Text style={styles.blockers}>Belum bisa disimpan: {blockers.join(' · ')}</Text>}
          <Button title="Simpan diskon" size="lg" disabled={!valid || blockers.length > 0} onPress={() => save()} />
          {order.discount && <Button title="Hapus diskon" variant="ghost" onPress={() => save(true)} />}
        </>
      }
    >
      <DiscountFields value={input} onChange={setInput} />
      <View style={styles.summary}>
        <Row label="Diskon" value={formatRupiah(-totals.discount)} />
        <Row label="Total baru" value={formatRupiah(totals.total)} strong />
        <Row label="Sudah dibayar" value={formatRupiah(paid)} />
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  summary: { gap: space(1.5), padding: space(3), borderRadius: radius.md, backgroundColor: color.surface2 },
  blockers: { fontFamily: font.medium, fontSize: 12, color: color.muted },
})
