import { formatDueIn, formatQty } from '@swarapos/core/labels'
import { sortForProduction } from '@swarapos/core/production'
import { isLate } from '@swarapos/core/selectors'
import { router } from 'expo-router'
import { ChevronDown, ChevronUp, ExternalLink, ShieldCheck, Zap } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { QcChecklist } from '@/components/QcChecklist'
import { useNow } from '@/lib/use-now'
import { useActor, useCustomerMap, useOutletOrders } from '@/store/hooks'
import { color, font, space } from '@/theme'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Card } from '@/ui/Card'
import { EmptyState } from '@/ui/misc'
import { Screen } from '@/ui/Screen'

/** Antrean QC: ketuk kartu untuk membuka checklist di tempat. */
export function QcQueueScreen() {
  const now = useNow(30_000)
  const orders = useOutletOrders()
  const customers = useCustomerMap()
  const actor = useActor()
  const queue = useMemo(() => sortForProduction(orders.filter((o) => o.status === 'QUALITY_CHECK'), now), [orders, now])
  // '' = semua tertutup; id lain (atau order yang baru lulus QC) = buka antrean teratas.
  const [open, setOpen] = useState<string | null>(null)
  const expanded = open === '' ? undefined : (queue.find((o) => o.id === open) ?? queue[0])?.id

  return (
    <Screen title="Antrean QC" subtitle={`${queue.length} order menunggu pemeriksaan`} scroll={false}>
      <FlatList
        data={queue}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: space(4), paddingBottom: space(10) }}
        ListEmptyComponent={<EmptyState icon={ShieldCheck} title="Antrean QC kosong" description="Order yang selesai finishing akan muncul di sini." />}
        ItemSeparatorComponent={() => <View style={{ height: space(3) }} />}
        renderItem={({ item: o }) => {
          const isOpen = o.id === expanded
          const late = isLate(o, now)
          return (
            <View style={{ gap: space(2) }}>
              <Card style={[{ gap: space(1.5) }, late && { borderColor: color.danger }]}>
                <Pressable onPress={() => setOpen(isOpen ? '' : o.id)} style={{ gap: space(1.5) }} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}>
                  <View style={styles.top}>
                    <Text style={styles.no}>{o.orderNo}</Text>
                    {isOpen ? <ChevronUp size={20} color={color.subtle} /> : <ChevronDown size={20} color={color.subtle} />}
                  </View>
                  <Text style={styles.customer}>{customers.get(o.customerId)?.name}</Text>
                  <Text style={styles.items}>{o.items.map((i) => `${i.name} · ${formatQty(i.unit, i.qty)}`).join(', ')}</Text>
                  <View style={styles.meta}>
                    {o.express && <Badge tone="warning" label="Express" icon={Zap} />}
                    {o.conditionNotes.map((n) => (
                      <Badge key={n} tone="exception" label={n} />
                    ))}
                    <Text style={[styles.due, late && { color: color.danger }]}>{formatDueIn(o.dueAt, now)}</Text>
                  </View>
                </Pressable>
                {isOpen && <Button title="Buka detail order" icon={ExternalLink} variant="ghost" onPress={() => router.push(`/order/${o.id}`)} />}
              </Card>
              {isOpen && <QcChecklist key={o.version} order={o} actor={actor} size="xl" />}
            </View>
          )
        }}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  no: { fontFamily: font.monoBold, fontSize: 16, color: color.fg },
  customer: { fontFamily: font.semibold, fontSize: 16, color: color.fg },
  items: { fontFamily: font.regular, fontSize: 13, color: color.muted },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space(2) },
  due: { fontFamily: font.medium, fontSize: 13, color: color.subtle },
})
