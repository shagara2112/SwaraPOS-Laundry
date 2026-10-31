import { formatDateTime } from '@swarapos/core/format'
import { DELIVERY_STATUS } from '@swarapos/core/labels'
import type { Customer, DeliveryTask, Order } from '@swarapos/core/types'
import { router } from 'expo-router'
import { Bike, CalendarClock, MapPin, Truck } from 'lucide-react-native'
import { StyleSheet, Text, View } from 'react-native'
import { color, font, radius, space, tone } from '@/theme'
import { Badge } from '@/ui/Badge'
import { Card } from '@/ui/Card'

export const TASK_TYPE_LABEL = { PICKUP: 'Jemput', DELIVERY: 'Antar' } as const

/** Kartu tugas kurir; ketuk untuk membuka detail tugas. */
export function CourierTaskCard({ task, order, customer }: { task: DeliveryTask; order?: Order; customer?: Customer }) {
  const st = DELIVERY_STATUS[task.status]
  const Icon = task.type === 'PICKUP' ? Bike : Truck
  return (
    <Card onPress={() => router.push(`/tugas/${task.id}`)} style={{ gap: space(1.5) }}>
      <View style={styles.top}>
        <View style={styles.type}>
          <Icon size={16} color={color.primary} />
          <Text style={styles.typeText}>{TASK_TYPE_LABEL[task.type]}</Text>
        </View>
        <Badge tone={st.tone} label={st.label} />
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {customer?.name} · <Text style={styles.no}>{order?.orderNo}</Text>
      </Text>
      <View style={styles.meta}>
        <MapPin size={14} color={color.subtle} />
        <Text style={styles.sub} numberOfLines={2}>
          {task.address}
        </Text>
      </View>
      <View style={styles.meta}>
        <CalendarClock size={14} color={color.subtle} />
        <Text style={styles.sub}>
          {formatDateTime(task.scheduledAt)} · {task.distanceKm.toLocaleString('id-ID')} km
        </Text>
      </View>
      {task.status === 'DONE' && task.proof && <Text style={styles.done}>Diterima {task.proof.receiverName}</Text>}
      {task.status === 'FAILED' && task.failReason && <Text style={styles.fail}>Gagal: {task.failReason}</Text>}
    </Card>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space(2) },
  type: { flexDirection: 'row', alignItems: 'center', gap: space(1.5), backgroundColor: color.primarySoft, borderRadius: radius.full, paddingHorizontal: space(2.5), paddingVertical: 4 },
  typeText: { fontFamily: font.semibold, fontSize: 12, color: color.primary },
  name: { fontFamily: font.semibold, fontSize: 15, color: color.fg },
  no: { fontFamily: font.mono, fontSize: 13, color: color.muted },
  meta: { flexDirection: 'row', alignItems: 'flex-start', gap: space(1.5) },
  sub: { flex: 1, fontFamily: font.regular, fontSize: 13, color: color.muted },
  done: { fontFamily: font.medium, fontSize: 13, color: tone.done.fg },
  fail: { fontFamily: font.medium, fontSize: 13, color: color.danger },
})
