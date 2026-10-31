import { statusPhase } from '@swarapos/core/domain/order-status'
import { formatRupiah } from '@swarapos/core/format'
import { formatDueIn, PAYMENT_STATUS } from '@swarapos/core/labels'
import { isLate } from '@swarapos/core/selectors'
import type { Customer, Order } from '@swarapos/core/types'
import { router } from 'expo-router'
import { Zap } from 'lucide-react-native'
import { StyleSheet, Text, View } from 'react-native'
import { color, font, space } from '@/theme'
import { Badge } from '@/ui/Badge'
import { Card } from '@/ui/Card'
import { StatusBadge } from './StatusBadge'

export function itemSummary(o: Order) {
  const main = o.items.filter((i) => i.unit !== 'ADDON')
  const first = main[0]?.name ?? o.items[0]?.name ?? '-'
  return main.length > 1 ? `${first} +${main.length - 1}` : first
}

/** Kartu order di daftar; ketuk untuk membuka detail. */
export function OrderCard({ order, customer, now }: { order: Order; customer?: Customer; now: Date }) {
  const pay = PAYMENT_STATUS[order.paymentStatus]
  const late = isLate(order, now)
  const finished = statusPhase(order.status) === 'done' || order.status === 'CANCELLED'
  return (
    <Card onPress={() => router.push(`/order/${order.id}`)} style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.no}>{order.orderNo}</Text>
        <Text style={styles.total}>{formatRupiah(order.totals.total)}</Text>
      </View>
      <Text style={styles.customer} numberOfLines={1}>
        {customer?.name ?? '-'} · {itemSummary(order)}
      </Text>
      <View style={styles.badges}>
        <StatusBadge status={order.status} />
        <Badge tone={pay.tone} label={pay.label} />
        {order.express && <Badge tone="warning" label="Express" icon={Zap} />}
      </View>
      {!finished && <Text style={[styles.due, late && styles.late]}>{late ? '⚠ ' : ''}{formatDueIn(order.dueAt, now)}</Text>}
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { gap: space(1.5) },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: space(2) },
  no: { fontFamily: font.monoBold, fontSize: 14, color: color.fg },
  total: { fontFamily: font.bold, fontSize: 14, color: color.fg },
  customer: { fontFamily: font.regular, fontSize: 14, color: color.muted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1.5), marginTop: 2 },
  due: { fontFamily: font.medium, fontSize: 12, color: color.subtle },
  late: { color: color.danger },
})
