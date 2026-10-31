import { isRelevantTask } from '@swarapos/core/delivery'
import { formatDateTime, formatRupiah } from '@swarapos/core/format'
import { DELIVERY_STATUS } from '@swarapos/core/labels'
import { assignCourier } from '@swarapos/core/store/actions-catalog'
import { transitionOrder } from '@swarapos/core/store/actions-order'
import type { DeliveryTask, DeliveryTaskStatus, Order } from '@swarapos/core/types'
import { router } from 'expo-router'
import { Bike, CalendarClock, MapPin, PackageCheck, Truck } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { act } from '@/store/act'
import { useDemo } from '@/store/demo-store'
import { useActiveOutlet, useCustomerMap, useOutletOrders } from '@/store/hooks'
import { color, font, radius, space, tone } from '@/theme'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Card, SectionTitle } from '@/ui/Card'
import { EmptyState, Segmented } from '@/ui/misc'
import { Screen } from '@/ui/Screen'
import { Sheet } from '@/ui/Sheet'

const GROUPS: { id: string; label: string; statuses: DeliveryTaskStatus[] }[] = [
  { id: 'todo', label: 'Perlu ditugaskan', statuses: ['UNASSIGNED', 'FAILED'] },
  { id: 'running', label: 'Berjalan', statuses: ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED'] },
  { id: 'done', label: 'Selesai', statuses: ['DONE'] },
]

export function DispatchScreen() {
  const orders = useOutletOrders()
  const customers = useCustomerMap()
  const outlet = useActiveOutlet()
  const allTasks = useDemo((s) => s.deliveryTasks)
  const staff = useDemo((s) => s.staff)
  const [type, setType] = useState<'PICKUP' | 'DELIVERY'>('PICKUP')
  const [assigning, setAssigning] = useState<DeliveryTask | null>(null)

  const orderMap = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders])
  const couriers = staff.filter((s) => s.role === 'COURIER' && s.outletId === outlet.id)
  const tasks = allTasks.filter((t) => t.type === type && orderMap.has(t.orderId)).sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
  const readyToDeliver = orders.filter((o) => o.status === 'READY_FOR_PICKUP' && o.handback === 'DELIVERY' && !allTasks.some((t) => t.orderId === o.id && t.type === 'DELIVERY'))
  const inGroup = (t: DeliveryTask, statuses: DeliveryTaskStatus[]) => statuses.includes(t.status) && (t.status === 'DONE' || isRelevantTask(t, orderMap.get(t.orderId)))

  return (
    <Screen title="Antar-jemput" subtitle="Tugaskan kurir untuk jemput dan antar">
      <Segmented
        items={[
          { id: 'PICKUP', label: 'Jemput' },
          { id: 'DELIVERY', label: 'Antar' },
        ]}
        value={type}
        onChange={setType}
      />

      {type === 'DELIVERY' && readyToDeliver.length > 0 && (
        <Card style={styles.ready}>
          <View style={styles.readyHead}>
            <PackageCheck size={20} color={tone.ready.fg} />
            <Text style={styles.readyTitle}>{readyToDeliver.length} order siap diantar</Text>
          </View>
          {readyToDeliver.map((o) => (
            <Button
              key={o.id}
              variant="secondary"
              icon={Truck}
              title={`Buat tugas · ${o.orderNo}`}
              onPress={() => act((s) => transitionOrder(s, o.id, 'OUT_FOR_DELIVERY', {}, s.tenantActor, new Date()), `Tugas antar dibuat untuk ${o.orderNo}`)}
            />
          ))}
        </Card>
      )}

      {GROUPS.map((g) => {
        const list = tasks.filter((t) => inGroup(t, g.statuses)).slice(0, g.id === 'done' ? 5 : undefined)
        return (
          <View key={g.id}>
            <SectionTitle title={`${g.label} · ${list.length}`} />
            {list.length === 0 ? (
              <Card>
                <EmptyState icon={type === 'PICKUP' ? Bike : Truck} title="Tidak ada tugas" />
              </Card>
            ) : (
              <View style={{ gap: space(2.5) }}>
                {list.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    order={orderMap.get(t.orderId)!}
                    customerName={customers.get(orderMap.get(t.orderId)!.customerId)?.name}
                    courierName={staff.find((s) => s.id === t.courierId)?.name}
                    onAssign={() => setAssigning(t)}
                  />
                ))}
              </View>
            )}
          </View>
        )
      })}

      <Sheet visible={!!assigning} onClose={() => setAssigning(null)} title="Pilih kurir" description={assigning ? orderMap.get(assigning.orderId)?.orderNo : undefined}>
        {couriers.map((c) => (
          <Pressable
            key={c.id}
            style={styles.courier}
            accessibilityRole="button"
            onPress={() => {
              if (!assigning) return
              const r = act((s) => assignCourier(s, assigning.id, c.id, s.tenantActor, new Date()), `Ditugaskan ke ${c.name}`)
              if (r.ok) setAssigning(null)
            }}
          >
            <Bike size={20} color={color.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.courierName}>{c.name}</Text>
              <Text style={styles.sub}>{c.phone}</Text>
            </View>
          </Pressable>
        ))}
      </Sheet>
    </Screen>
  )
}

function TaskCard({ task, order, customerName, courierName, onAssign }: { task: DeliveryTask; order: Order; customerName?: string; courierName?: string; onAssign: () => void }) {
  const st = DELIVERY_STATUS[task.status]
  // Area info dan tombol tugaskan dipisah supaya tidak ada tombol di dalam tombol (web).
  return (
    <Card style={{ gap: space(1.5) }}>
      <Pressable onPress={() => router.push(`/order/${order.id}`)} style={{ gap: space(1.5) }} accessibilityRole="button">
        <View style={styles.top}>
          <Text style={styles.no}>{order.orderNo}</Text>
          <Badge tone={st.tone} label={st.label} />
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {customerName}
        </Text>
        <View style={styles.meta}>
          <MapPin size={14} color={color.subtle} />
          <Text style={styles.sub} numberOfLines={2}>
            {task.address} · {task.distanceKm.toLocaleString('id-ID')} km · {formatRupiah(task.fee)}
          </Text>
        </View>
        <View style={styles.meta}>
          <CalendarClock size={14} color={color.subtle} />
          <Text style={styles.sub}>
            {formatDateTime(task.scheduledAt)}
            {courierName ? ` · ${courierName}` : ''}
          </Text>
        </View>
        {task.failReason && <Text style={styles.fail}>Gagal: {task.failReason}</Text>}
      </Pressable>
      {(task.status === 'UNASSIGNED' || task.status === 'FAILED') && <Button title="Tugaskan kurir" icon={Bike} onPress={onAssign} style={{ marginTop: space(1) }} />}
    </Card>
  )
}

const styles = StyleSheet.create({
  ready: { marginTop: space(4), gap: space(2), borderColor: tone.ready.bg },
  readyHead: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  readyTitle: { fontFamily: font.semibold, fontSize: 15, color: color.fg },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space(2) },
  no: { fontFamily: font.monoBold, fontSize: 14, color: color.fg },
  name: { fontFamily: font.semibold, fontSize: 15, color: color.fg },
  meta: { flexDirection: 'row', alignItems: 'flex-start', gap: space(1.5) },
  sub: { flex: 1, fontFamily: font.regular, fontSize: 13, color: color.muted },
  fail: { fontFamily: font.medium, fontSize: 13, color: color.danger, backgroundColor: tone.danger.bg, borderRadius: radius.sm, padding: space(2) },
  courier: { flexDirection: 'row', alignItems: 'center', gap: space(3), minHeight: 56, paddingHorizontal: space(3), borderRadius: radius.md, borderWidth: 1, borderColor: color.border },
  courierName: { fontFamily: font.semibold, fontSize: 15, color: color.fg },
})
