import { QC_CHECKLIST } from '@swarapos/core/production'
import { recordQc, transitionOrder } from '@swarapos/core/store/actions-order'
import type { Actor, Order } from '@swarapos/core/types'
import { Check, RotateCcw, ShieldCheck } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { act } from '@/store/act'
import { color, font, radius, space, tone } from '@/theme'
import { Button } from '@/ui/Button'
import { Card } from '@/ui/Card'
import { ReasonSheet } from '@/ui/Sheet'

/** Checklist QC: lulus membuka status siap, gagal mengirim kembali ke cuci ulang. Beri `key={order.version}` agar centang direset. */
export function QcChecklist({ order, actor, size = 'lg' }: { order: Order; actor: Actor; size?: 'lg' | 'xl' }) {
  const [checked, setChecked] = useState<boolean[]>(QC_CHECKLIST.map(() => false))
  const [failOpen, setFailOpen] = useState(false)
  const allChecked = checked.every(Boolean)

  const pass = () => {
    const qc = act((s) => recordQc(s, order.id, { passed: true, notes: 'checklist lengkap' }, actor, new Date()))
    if (qc.ok) act((s) => transitionOrder(s, order.id, 'READY_FOR_PICKUP', {}, actor, new Date()), 'QC lulus — order siap')
  }

  const fail = (reason: string) => {
    const qc = act((s) => recordQc(s, order.id, { passed: false, notes: reason }, actor, new Date()))
    if (qc.ok) {
      act((s) => transitionOrder(s, order.id, 'IN_WASHING', { note: `Cuci ulang: ${reason}` }, actor, new Date()), 'Dikirim ke cuci ulang')
      setFailOpen(false)
    }
  }

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <ShieldCheck size={20} color={tone.qc.fg} />
        <Text style={styles.title}>Quality check</Text>
      </View>
      <Text style={styles.desc}>Centang semua poin sebelum order bisa ditandai siap.</Text>
      {QC_CHECKLIST.map((label, i) => (
        <Pressable
          key={label}
          onPress={() => setChecked(checked.map((c, idx) => (idx === i ? !c : c)))}
          style={[styles.item, checked[i] && styles.itemOn]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: checked[i] }}
          accessibilityLabel={label}
        >
          <View style={[styles.box, checked[i] && styles.boxOn]}>{checked[i] && <Check size={16} color={color.white} strokeWidth={3} />}</View>
          <Text style={styles.label}>{label}</Text>
        </Pressable>
      ))}
      <Button title="Lulus QC" icon={ShieldCheck} size={size} onPress={pass} disabled={!allChecked} style={{ marginTop: space(1) }} />
      <Button title="Gagal — cuci ulang" icon={RotateCcw} variant="secondary" size={size} onPress={() => setFailOpen(true)} />
      <ReasonSheet
        visible={failOpen}
        title="QC gagal"
        description={`${order.orderNo} akan kembali ke tahap cuci.`}
        label="Temuan QC"
        placeholder="Contoh: noda kerah masih terlihat"
        confirmLabel="Kirim ke cuci ulang"
        confirmVariant="primary"
        onClose={() => setFailOpen(false)}
        onConfirm={fail}
      />
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { gap: space(2.5), borderColor: tone.qc.bg },
  head: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  title: { fontFamily: font.bold, fontSize: 16, color: color.fg },
  desc: { fontFamily: font.regular, fontSize: 13, color: color.muted },
  item: { flexDirection: 'row', alignItems: 'center', gap: space(3), minHeight: 52, paddingHorizontal: space(3), borderRadius: radius.md, borderWidth: 1, borderColor: color.border },
  itemOn: { borderColor: tone.done.fg, backgroundColor: tone.done.bg },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: tone.done.fg, borderColor: tone.done.fg },
  label: { flex: 1, fontFamily: font.medium, fontSize: 15, color: color.fg },
})
