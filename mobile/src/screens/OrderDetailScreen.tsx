import { isRelevantTask } from '@swarapos/core/delivery'
import { isTerminal } from '@swarapos/core/domain/order-status'
import { formatDateTime, formatRupiah } from '@swarapos/core/format'
import { CHANNEL_LABEL, DELIVERY_STATUS, formatDueIn, formatLineDetail, HANDBACK_LABEL, INTAKE_LABEL } from '@swarapos/core/labels'
import { can } from '@swarapos/core/permissions'
import { isLate } from '@swarapos/core/selectors'
import type { DeliveryTask } from '@swarapos/core/types'
import { Redirect, useLocalSearchParams } from 'expo-router'
import { Bike, CalendarClock, Phone, QrCode, Receipt, SearchX, Store, Zap } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { CourierPickerSheet } from '@/components/CourierPickerSheet'
import { LabelSheet } from '@/components/LabelSheet'
import { OrderTimeline } from '@/components/OrderTimeline'
import { PaymentPanel } from '@/components/PaymentSheet'
import { QcChecklist } from '@/components/QcChecklist'
import { ReceiptSheet } from '@/components/ReceiptSheet'
import { StatusActions } from '@/components/StatusActions'
import { StatusBadge } from '@/components/StatusBadge'
import { TASK_TYPE_LABEL } from '@/components/TaskCard'
import { WhatsAppPanel } from '@/components/WhatsAppPanel'
import { useNow } from '@/lib/use-now'
import { useDemo } from '@/store/demo-store'
import { useActor } from '@/store/hooks'
import { useSession } from '@/store/session-store'
import { color, font, space } from '@/theme'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Card, SectionTitle } from '@/ui/Card'
import { EmptyState, Row } from '@/ui/misc'
import { Screen } from '@/ui/Screen'

/** Detail order bersama semua peran; tombol mengikuti hak peran (spec §3). */
export function OrderDetailScreen() {
  const { id, baru } = useLocalSearchParams<{ id: string; baru?: string }>()
  const now = useNow()
  const role = useSession((s) => s.role)
  const actor = useActor()
  const order = useDemo((s) => s.orders.find((o) => o.id === id))
  const customer = useDemo((s) => s.customers.find((c) => c.id === order?.customerId))
  const outlet = useDemo((s) => s.outlets.find((o) => o.id === order?.outletId))
  const allTasks = useDemo((s) => s.deliveryTasks)
  const staff = useDemo((s) => s.staff)
  const tasks = useMemo(() => allTasks.filter((t) => t.orderId === id), [allTasks, id])
  const [assigning, setAssigning] = useState<DeliveryTask | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)
  // Order baru dari kasir membuka label otomatis (?baru=1).
  const [labelOpen, setLabelOpen] = useState(!!baru)

  if (!role) return <Redirect href="/masuk" />
  if (!order || !customer || !outlet) {
    return (
      <Screen title="Order" back>
        <EmptyState icon={SearchX} title="Order tidak ditemukan" description="Order mungkin sudah dihapus dari data demo atau tautannya salah." />
      </Screen>
    )
  }

  const late = isLate(order, now)
  const { totals } = order
  const fees: [string, number][] = [
    ['Subtotal', totals.subtotal],
    ...(totals.expressFee ? ([['Biaya express', totals.expressFee]] as [string, number][]) : []),
    ...(totals.pickupFee ? ([['Biaya jemput', totals.pickupFee]] as [string, number][]) : []),
    ...(totals.deliveryFee ? ([['Biaya antar', totals.deliveryFee]] as [string, number][]) : []),
  ]

  return (
    <Screen title={order.orderNo} subtitle={customer.name} back>
      <Card style={{ gap: space(3) }}>
        <View style={styles.badges}>
          <StatusBadge status={order.status} handback={order.handback} />
          {order.express && <Badge tone="warning" label="Express" icon={Zap} />}
          {late && <Badge tone="danger" label={formatDueIn(order.dueAt, now)} />}
        </View>
        <View style={{ gap: space(1.5) }}>
          <Text style={styles.customer}>{customer.name}</Text>
          <Meta icon={Phone} text={customer.phone} />
          <Meta icon={Store} text={outlet.name} />
          <Meta icon={CalendarClock} text={`Estimasi ${formatDateTime(order.dueAt)}`} />
        </View>
        <View style={styles.badges}>
          <Badge tone="neutral" label={INTAKE_LABEL[order.intake]} />
          <Badge tone="neutral" label={HANDBACK_LABEL[order.handback]} />
          <Badge tone="neutral" label={`Kanal: ${CHANNEL_LABEL[order.channel]}`} />
        </View>
        {!isTerminal(order.status) && <StatusActions order={order} role={role} actor={actor} />}
      </Card>

      {order.status === 'QUALITY_CHECK' && can(role, 'order.qc') && (
        <View style={{ marginTop: space(4) }}>
          <QcChecklist key={order.version} order={order} actor={actor} />
        </View>
      )}

      <SectionTitle title="Item & harga" />
      <Card style={{ gap: space(3) }}>
        {order.items.map((item) => (
          <View key={item.id} style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemDetail}>{formatLineDetail(item.unit, item.qty, item.unitPrice)}</Text>
            </View>
            <Text style={styles.itemTotal}>{formatRupiah(item.total)}</Text>
          </View>
        ))}
        <View style={styles.totals}>
          {fees.map(([label, value]) => (
            <Row key={label} label={label} value={formatRupiah(value)} />
          ))}
          <Row label="Total" value={formatRupiah(totals.total)} strong />
        </View>
      </Card>

      {(order.conditionNotes.length > 0 || customer.notes) && (
        <>
          <SectionTitle title="Catatan kondisi & preferensi" />
          <Card style={{ gap: space(2.5) }}>
            {order.conditionNotes.length > 0 && (
              <View style={styles.badges}>
                {order.conditionNotes.map((n) => (
                  <Badge key={n} tone="exception" label={n} />
                ))}
              </View>
            )}
            {customer.notes && <Text style={styles.notes}>{customer.notes}</Text>}
          </Card>
        </>
      )}

      {tasks.length > 0 && (
        <>
          <SectionTitle title="Antar-jemput" />
          <Card style={{ gap: space(3) }}>
            {tasks.map((t) => {
              const st = DELIVERY_STATUS[t.status]
              const courier = staff.find((x) => x.id === t.courierId)
              const assignable = (t.status === 'UNASSIGNED' || t.status === 'FAILED') && isRelevantTask(t, order) && can(role, 'delivery.assign')
              return (
                <View key={t.id} style={{ gap: space(2) }}>
                  <View style={styles.taskRow}>
                    <Bike size={18} color={color.primary} />
                    <Text style={styles.taskType}>{TASK_TYPE_LABEL[t.type]}</Text>
                    <Badge tone={st.tone} label={st.label} />
                  </View>
                  <Text style={styles.metaText}>
                    {formatDateTime(t.scheduledAt)}
                    {courier ? ` · ${courier.name}` : ''}
                    {t.failReason ? ` · gagal: ${t.failReason}` : ''}
                  </Text>
                  {assignable && <Button title="Tugaskan kurir" icon={Bike} onPress={() => setAssigning(t)} />}
                </View>
              )
            })}
          </Card>
        </>
      )}

      <SectionTitle title="Pembayaran & notifikasi" />
      <View style={{ gap: space(3) }}>
        <PaymentPanel order={order} actor={actor} canRecord={can(role, 'order.payment')} />
        {can(role, 'order.whatsapp') && <WhatsAppPanel order={order} customer={customer} outlet={outlet} actor={actor} />}
        {can(role, 'order.payment') && <Button title="Nota" icon={Receipt} variant="secondary" onPress={() => setReceiptOpen(true)} />}
        <Button title="Lihat label & QR lacak" icon={QrCode} variant="secondary" onPress={() => setLabelOpen(true)} />
      </View>

      <SectionTitle title="Riwayat status" />
      <Card>
        <OrderTimeline history={order.history} />
      </Card>

      <CourierPickerSheet task={assigning} title={order.orderNo} onClose={() => setAssigning(null)} />
      {receiptOpen && <ReceiptSheet visible onClose={() => setReceiptOpen(false)} order={order} outlet={outlet} customer={customer} />}
      <LabelSheet visible={labelOpen} onClose={() => setLabelOpen(false)} order={order} outlet={outlet} customer={customer} justCreated={!!baru} />
    </Screen>
  )
}

function Meta({ icon: Icon, text }: { icon: typeof Phone; text: string }) {
  return (
    <View style={styles.meta}>
      <Icon size={16} color={color.subtle} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1.5) },
  customer: { fontFamily: font.bold, fontSize: 17, color: color.fg },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  metaText: { flex: 1, fontFamily: font.regular, fontSize: 14, color: color.muted },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: space(3) },
  itemName: { fontFamily: font.medium, fontSize: 14, color: color.fg },
  itemDetail: { marginTop: 2, fontFamily: font.regular, fontSize: 12, color: color.subtle },
  itemTotal: { fontFamily: font.semibold, fontSize: 14, color: color.fg },
  totals: { gap: space(1.5), borderTopWidth: 1, borderTopColor: color.border, paddingTop: space(3) },
  notes: { fontFamily: font.regular, fontSize: 14, color: color.muted },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  taskType: { flex: 1, fontFamily: font.semibold, fontSize: 15, color: color.fg },
})
