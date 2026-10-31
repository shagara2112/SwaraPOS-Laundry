import { STATUS_LABEL } from '@swarapos/core/domain/order-status'
import { formatDueIn, formatQty } from '@swarapos/core/labels'
import { HOLD_STATUSES, primaryNext } from '@swarapos/core/production'
import { isLate } from '@swarapos/core/selectors'
import type { Customer, Order, OrderStatus } from '@swarapos/core/types'
import { router } from 'expo-router'
import { ChevronRight, CirclePause, ShieldCheck, Zap } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { color, font, radius, space, tone } from '@/theme'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Card } from '@/ui/Card'
import { StatusBadge } from './StatusBadge'

function actionLabel(order: Order, to: OrderStatus): string {
  if (HOLD_STATUSES.includes(order.status)) return `Lanjutkan ${STATUS_LABEL[to].toLowerCase()}`
  return `Ubah ke ${STATUS_LABEL[to]}`
}

/** Kartu produksi untuk operator: tombol maju besar (56 dp) dan tahan. QC dan serah-terima bukan wewenang operator. */
export function ProductionCard({
  order,
  customer,
  now,
  showStatus,
  onAdvance,
  onHold,
}: {
  order: Order
  customer: Customer | undefined
  now: Date
  showStatus: boolean
  onAdvance?: (to: OrderStatus) => void
  onHold?: () => void
}) {
  const late = isLate(order, now)
  const held = HOLD_STATUSES.includes(order.status)
  const next = order.status === 'READY_FOR_PICKUP' ? undefined : primaryNext(order)
  const holdNote = held ? [...order.history].reverse().find((e) => e.to === order.status)?.note : undefined
  const items = order.items
    .filter((i) => i.unit !== 'ADDON')
    .map((i) => `${i.name} · ${formatQty(i.unit, i.qty)}`)
    .join(', ')

  return (
    <Card style={[styles.card, late && { borderColor: color.danger }]}>
      <Pressable onPress={() => router.push(`/order/${order.id}`)} style={{ gap: space(1.5) }} accessibilityRole="button" accessibilityLabel={`Detail ${order.orderNo}`}>
        <View style={styles.top}>
          <Text style={styles.no}>{order.orderNo}</Text>
          <ChevronRight size={18} color={color.subtle} />
        </View>
        <Text style={styles.customer} numberOfLines={1}>
          {customer?.name}
        </Text>
        <Text style={styles.items} numberOfLines={2}>
          {items}
        </Text>
        <View style={styles.badges}>
          {showStatus && <StatusBadge status={order.status} handback={order.handback} />}
          {order.express && <Badge tone="warning" label="Express" icon={Zap} />}
          <Text style={[styles.due, late && { color: color.danger }]}>{formatDueIn(order.dueAt, now)}</Text>
        </View>
        {holdNote && <Text style={styles.note}>{holdNote}</Text>}
      </Pressable>
      {order.status === 'QUALITY_CHECK' && (
        <View style={styles.info}>
          <ShieldCheck size={18} color={tone.qc.fg} />
          <Text style={[styles.infoText, { color: tone.qc.fg }]}>Menunggu QC</Text>
        </View>
      )}
      {order.status === 'READY_FOR_PICKUP' && (
        <View style={styles.info}>
          <Text style={styles.infoText}>Siap — diserahkan oleh kasir atau kurir</Text>
        </View>
      )}
      {next && onAdvance && <Button title={actionLabel(order, next)} size="xl" onPress={() => onAdvance(next)} />}
      {!held && onHold && order.status !== 'READY_FOR_PICKUP' && <Button title="Tahan / kendala" icon={CirclePause} variant="ghost" onPress={onHold} />}
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { gap: space(2.5) },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  no: { fontFamily: font.monoBold, fontSize: 16, color: color.fg },
  customer: { fontFamily: font.semibold, fontSize: 16, color: color.fg },
  items: { fontFamily: font.regular, fontSize: 13, color: color.muted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space(2) },
  due: { fontFamily: font.medium, fontSize: 13, color: color.subtle },
  note: { fontFamily: font.regular, fontSize: 13, color: color.muted, backgroundColor: tone.exception.bg, borderRadius: radius.sm, padding: space(2) },
  info: { flexDirection: 'row', alignItems: 'center', gap: space(2), minHeight: 48, paddingHorizontal: space(3), borderRadius: radius.md, backgroundColor: color.surface2 },
  infoText: { flex: 1, fontFamily: font.semibold, fontSize: 14, color: color.muted },
})
