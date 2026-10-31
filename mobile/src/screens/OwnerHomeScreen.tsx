import { WA_EVENT_LABEL } from '@swarapos/core/domain/whatsapp'
import { formatDate, formatRupiah } from '@swarapos/core/format'
import { formatDueIn } from '@swarapos/core/labels'
import { PRODUCTION_COLUMNS } from '@swarapos/core/production'
import { dashboardKpis, isLate } from '@swarapos/core/selectors'
import { router } from 'expo-router'
import { AlarmClock, ClipboardList, HandCoins, MessageCircle, Wallet } from 'lucide-react-native'
import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { StatusBadge } from '@/components/StatusBadge'
import { useNow } from '@/lib/use-now'
import { useDemo } from '@/store/demo-store'
import { useActiveOutlet, useCurrentStaff, useCustomerMap, useOutletOrders } from '@/store/hooks'
import { color, font, radius, space, tone } from '@/theme'
import { Card, SectionTitle } from '@/ui/Card'
import { KpiTile } from '@/ui/misc'
import { Screen } from '@/ui/Screen'

const SIX_HOURS = 6 * 60 * 60 * 1000

export function OwnerHomeScreen() {
  const now = useNow()
  const outlet = useActiveOutlet()
  const staff = useCurrentStaff()
  const orders = useOutletOrders()
  const customers = useCustomerMap()
  const state = useDemo()
  const kpi = useMemo(() => dashboardKpis({ ...state, orders }, now), [state, orders, now])

  const stages = PRODUCTION_COLUMNS.map((c) => ({ ...c, count: orders.filter((o) => c.statuses.includes(o.status)).length }))
  const maxStage = Math.max(1, ...stages.map((s) => s.count))
  const attention = orders
    .filter((o) => isLate(o, now) || (!['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(o.status) && new Date(o.dueAt).getTime() - now.getTime() < SIX_HOURS))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .slice(0, 5)
  const waPending = orders.flatMap((o) => o.whatsapp.filter((l) => l.state !== 'SENT').map((l) => ({ order: o, log: l }))).slice(0, 5)

  return (
    <Screen title={`Halo, ${staff?.name.split(' ')[0] ?? 'Owner'}`} subtitle={`${outlet.name.replace('Laundry Bersih Kilat ', 'Outlet ')} · ${formatDate(now.toISOString())}`}>
      <View style={styles.grid}>
        <KpiTile label="Order hari ini" value={String(kpi.ordersToday)} icon={ClipboardList} />
        <KpiTile label="Omzet hari ini" value={formatRupiah(kpi.revenueToday)} icon={Wallet} accent={tone.done.fg} />
      </View>
      <View style={[styles.grid, { marginTop: space(3) }]}>
        <KpiTile label="Terlambat" value={String(kpi.lateCount)} icon={AlarmClock} accent={kpi.lateCount ? color.danger : tone.done.fg} />
        <KpiTile label="Piutang" value={formatRupiah(kpi.receivables)} icon={HandCoins} accent={tone.qc.fg} />
      </View>

      <SectionTitle title="Antrean produksi" />
      <Card style={{ gap: space(3) }}>
        {stages.map((s) => (
          <View key={s.id} style={styles.stage} accessibilityLabel={`${s.label}: ${s.count} order`}>
            <Text style={styles.stageLabel}>{s.label}</Text>
            <View style={styles.track}>
              <View style={[styles.bar, { width: `${(s.count / maxStage) * 100}%`, minWidth: s.count ? 8 : 0 }]} />
            </View>
            <Text style={styles.stageCount}>{s.count}</Text>
          </View>
        ))}
      </Card>

      <SectionTitle title="Perlu perhatian" />
      <Card style={{ paddingVertical: space(1) }}>
        {attention.length === 0 ? (
          <Text style={styles.empty}>Semua order sesuai jadwal.</Text>
        ) : (
          attention.map((o, i) => (
            <Pressable key={o.id} onPress={() => router.push(`/order/${o.id}`)} style={[styles.listRow, i > 0 && styles.divider]} accessibilityRole="button">
              <View style={{ flex: 1 }}>
                <Text style={styles.no}>{o.orderNo}</Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {customers.get(o.customerId)?.name}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <StatusBadge status={o.status} />
                <Text style={[styles.sub, { color: isLate(o, now) ? color.danger : tone.qc.fg }]}>{formatDueIn(o.dueAt, now)}</Text>
              </View>
            </Pressable>
          ))
        )}
      </Card>

      <SectionTitle title="WhatsApp belum dikirim" />
      <Card style={{ paddingVertical: space(1) }}>
        {waPending.length === 0 ? (
          <Text style={styles.empty}>Semua notifikasi terkirim.</Text>
        ) : (
          waPending.map(({ order, log }, i) => (
            <Pressable key={log.id} onPress={() => router.push(`/order/${order.id}`)} style={[styles.listRow, i > 0 && styles.divider]} accessibilityRole="button">
              <MessageCircle size={18} color={color.whatsapp} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {customers.get(order.customerId)?.name}
                </Text>
                <Text style={styles.sub}>
                  {order.orderNo} · {WA_EVENT_LABEL[log.event]}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: space(3) },
  stage: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
  stageLabel: { width: 72, fontFamily: font.regular, fontSize: 13, color: color.muted },
  track: { flex: 1, height: 10, borderRadius: radius.full, backgroundColor: color.surface2, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: radius.full, backgroundColor: color.primary },
  stageCount: { width: 24, textAlign: 'right', fontFamily: font.bold, fontSize: 14, color: color.fg },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space(3), minHeight: 56, paddingVertical: space(2.5) },
  divider: { borderTopWidth: 1, borderTopColor: color.border },
  no: { fontFamily: font.monoBold, fontSize: 13, color: color.fg },
  name: { fontFamily: font.semibold, fontSize: 14, color: color.fg },
  sub: { fontFamily: font.regular, fontSize: 12, color: color.subtle },
  empty: { paddingVertical: space(4), textAlign: 'center', fontFamily: font.regular, fontSize: 14, color: color.subtle },
})
