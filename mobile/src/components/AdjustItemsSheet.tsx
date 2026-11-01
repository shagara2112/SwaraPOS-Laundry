import { calculateTotals, lineTotal } from '@swarapos/core/domain/pricing'
import { formatRupiah, parseDecimalID } from '@swarapos/core/format'
import { newId } from '@swarapos/core/ids'
import { UNIT_SHORT } from '@swarapos/core/labels'
import { paidAmount } from '@swarapos/core/selectors'
import { adjustOrderItems } from '@swarapos/core/store/actions-order'
import type { Actor, Order } from '@swarapos/core/types'
import { Plus, Trash2 } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { act } from '@/store/act'
import { useDemo } from '@/store/demo-store'
import { color, font, radius, space } from '@/theme'
import { Button } from '@/ui/Button'
import { Row } from '@/ui/misc'
import { Sheet } from '@/ui/Sheet'
import { TextField } from '@/ui/TextField'

type Line = { key: string; itemId?: string; serviceId: string; qtyText: string }

/** Koreksi berat/jumlah item setelah timbang ulang; baris lama memakai harga terkunci. Pasang saat dibuka. */
export function AdjustItemsSheet({ order, actor, onClose }: { order: Order; actor: Actor; onClose: () => void }) {
  const services = useDemo((s) => s.services)
  const expressPct = useDemo((s) => s.tenant.expressSurchargePct)
  const [lines, setLines] = useState<Line[]>(() => order.items.map((i) => ({ key: i.id, itemId: i.id, serviceId: i.serviceId, qtyText: String(i.qty).replace('.', ',') })))
  const [reason, setReason] = useState('')
  const [adding, setAdding] = useState(false)

  const parsed = lines.map((l) => {
    const existing = order.items.find((i) => i.id === l.itemId)
    const svc = services.find((x) => x.id === l.serviceId)
    return {
      line: l,
      name: existing?.name ?? svc?.name ?? '-',
      unit: existing?.unit ?? svc?.unit ?? 'ITEM',
      unitPrice: existing?.unitPrice ?? svc?.prices[order.outletId] ?? 0,
      qty: parseDecimalID(l.qtyText),
    }
  })
  const totals = calculateTotals({
    lines: parsed.map((p) => ({ unit: p.unit, unitPrice: p.unitPrice, qty: p.qty && p.qty > 0 ? p.qty : 0 })),
    express: order.express,
    expressSurchargePct: expressPct,
    pickupFee: order.totals.pickupFee,
    deliveryFee: order.totals.deliveryFee,
  })
  const paid = paidAmount(order)
  const blockers = [
    parsed.some((p) => !(p.qty && p.qty > 0)) && 'isi berat/jumlah lebih dari 0',
    !parsed.some((p) => p.unit !== 'ADDON') && 'minimal satu layanan utama',
    totals.total < paid && `total di bawah yang sudah dibayar (${formatRupiah(paid)})`,
    !reason.trim() && 'alasan wajib',
  ].filter(Boolean) as string[]

  const save = () => {
    if (blockers.length) return
    const r = act(
      (s) => adjustOrderItems(s, order.id, { lines: parsed.map((p) => ({ itemId: p.line.itemId, serviceId: p.line.serviceId, qty: p.qty! })), reason }, actor, new Date()),
      'Item order dikoreksi',
    )
    if (r.ok) onClose()
  }

  return (
    <Sheet
      visible
      onClose={onClose}
      title="Koreksi item"
      description={`${order.orderNo} · harga baris lama tetap seperti saat order dibuat`}
      footer={
        <>
          {blockers.length > 0 && <Text style={styles.blockers}>Belum bisa disimpan: {blockers.join(' · ')}</Text>}
          <Button title="Simpan koreksi" size="lg" disabled={blockers.length > 0} onPress={save} />
        </>
      }
    >
      <View style={styles.lines}>
        {parsed.map((p, i) => (
          <View key={p.line.key} style={[styles.line, i > 0 && styles.divider]}>
            <View style={styles.lineHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{p.name}</Text>
                <Text style={styles.price}>
                  {formatRupiah(p.unitPrice)} / {UNIT_SHORT[p.unit]}
                  {!p.line.itemId ? ' · baru' : ''}
                </Text>
              </View>
              <Pressable onPress={() => setLines(lines.filter((l) => l.key !== p.line.key))} style={styles.remove} accessibilityRole="button" accessibilityLabel={`Hapus ${p.name}`}>
                <Trash2 size={18} color={color.subtle} />
              </Pressable>
            </View>
            <View style={styles.lineHead}>
              <TextInput
                value={p.line.qtyText}
                onChangeText={(qtyText) => setLines(lines.map((l) => (l.key === p.line.key ? { ...l, qtyText } : l)))}
                keyboardType="decimal-pad"
                style={[styles.qty, !(p.qty && p.qty > 0) && styles.invalid]}
                accessibilityLabel={`Jumlah ${p.name}`}
              />
              <Text style={styles.unit}>{UNIT_SHORT[p.unit]}</Text>
              <Text style={styles.total}>{p.qty && p.qty > 0 ? formatRupiah(lineTotal({ unit: p.unit, unitPrice: p.unitPrice, qty: p.qty })) : '—'}</Text>
            </View>
          </View>
        ))}
      </View>

      {adding ? (
        <View style={styles.chips}>
          {services
            .filter((s) => s.active)
            .map((s) => (
              <Pressable
                key={s.id}
                style={styles.chip}
                accessibilityRole="button"
                onPress={() => {
                  setLines([...lines, { key: newId('l'), serviceId: s.id, qtyText: s.unit === 'KG' ? '' : '1' }])
                  setAdding(false)
                }}
              >
                <Plus size={14} color={color.primary} />
                <Text style={styles.chipText}>{s.name}</Text>
              </Pressable>
            ))}
        </View>
      ) : (
        <Button title="Tambah layanan" icon={Plus} variant="ghost" onPress={() => setAdding(true)} />
      )}

      <View style={styles.summary}>
        <Row label="Total lama" value={formatRupiah(order.totals.total)} />
        <Row label="Total baru" value={formatRupiah(totals.total)} strong />
        <Row label="Sudah dibayar" value={formatRupiah(paid)} />
      </View>

      <TextField label="Alasan koreksi" required value={reason} onChangeText={setReason} placeholder="Contoh: timbang ulang di outlet" hint="Tercatat di riwayat order dan audit log." multiline />
    </Sheet>
  )
}

const styles = StyleSheet.create({
  lines: { borderRadius: radius.md, borderWidth: 1, borderColor: color.border },
  line: { padding: space(3), gap: space(2) },
  divider: { borderTopWidth: 1, borderTopColor: color.border },
  lineHead: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  name: { fontFamily: font.medium, fontSize: 15, color: color.fg },
  price: { fontFamily: font.regular, fontSize: 12, color: color.subtle },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  qty: { width: 96, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: color.border, paddingHorizontal: space(3), textAlign: 'right', fontFamily: font.mono, fontSize: 17, color: color.fg },
  invalid: { borderColor: color.danger },
  unit: { width: 40, fontFamily: font.regular, fontSize: 14, color: color.muted },
  total: { flex: 1, textAlign: 'right', fontFamily: font.semibold, fontSize: 15, color: color.fg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  chip: { flexDirection: 'row', alignItems: 'center', gap: space(1.5), minHeight: 44, paddingHorizontal: space(3), borderRadius: radius.md, borderWidth: 1, borderColor: color.border },
  chipText: { fontFamily: font.medium, fontSize: 14, color: color.fg },
  summary: { gap: space(1.5), padding: space(3), borderRadius: radius.md, backgroundColor: color.surface2 },
  blockers: { fontFamily: font.medium, fontSize: 12, color: color.muted },
})
