import { STATUS_LABEL } from '@swarapos/core/domain/order-status'
import { can } from '@swarapos/core/permissions'
import { HOLD_STATUSES, PRODUCTION_COLUMNS, sortForProduction } from '@swarapos/core/production'
import { transitionOrder } from '@swarapos/core/store/actions-order'
import type { Order, OrderStatus } from '@swarapos/core/types'
import { WashingMachine } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { FlatList, View } from 'react-native'
import { ProductionCard } from '@/components/ProductionCard'
import { useNow } from '@/lib/use-now'
import { act } from '@/store/act'
import { useActor, useCustomerMap, useOutletOrders } from '@/store/hooks'
import { useSession } from '@/store/session-store'
import { space } from '@/theme'
import { ChipRow, EmptyState } from '@/ui/misc'
import { Screen } from '@/ui/Screen'
import { ReasonSheet } from '@/ui/Sheet'

const STAGES: { id: string; label: string; statuses: OrderStatus[] }[] = [
  { id: 'all', label: 'Semua', statuses: [...PRODUCTION_COLUMNS.flatMap((c) => c.statuses), ...HOLD_STATUSES] },
  ...PRODUCTION_COLUMNS,
  { id: 'hold', label: 'Ditahan', statuses: HOLD_STATUSES },
]

export function ProductionScreen() {
  const now = useNow(30_000)
  const orders = useOutletOrders()
  const customers = useCustomerMap()
  const actor = useActor()
  const role = useSession((s) => s.role)
  const [stage, setStage] = useState('all')
  const [holdFor, setHoldFor] = useState<Order | null>(null)

  const sorted = useMemo(() => sortForProduction(orders, now), [orders, now])
  const counts = STAGES.map((st) => ({ id: st.id, label: st.label, count: sorted.filter((o) => st.statuses.includes(o.status)).length }))
  const current = STAGES.find((st) => st.id === stage) ?? STAGES[0]
  const list = sorted.filter((o) => current.statuses.includes(o.status))
  // Kolom satu status (Cuci, Kering, ...) sudah menyebut statusnya.
  const showStatus = current.statuses.length > 1

  const canTransition = !!role && can(role, 'order.transition')
  const canHold = !!role && can(role, 'order.hold')
  const advance = (order: Order, to: OrderStatus) => act((s) => transitionOrder(s, order.id, to, {}, actor, new Date()), `${order.orderNo} → ${STATUS_LABEL[to]}`)

  return (
    <Screen title="Produksi" subtitle="Urutan: terlambat, express, lalu jatuh tempo" scroll={false}>
      <FlatList
        data={list}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: space(4), paddingBottom: space(10) }}
        ListHeaderComponent={
          <View style={{ marginBottom: space(3) }}>
            <ChipRow items={counts.filter((c) => c.id !== 'hold' || c.count > 0)} value={stage} onChange={setStage} />
          </View>
        }
        ListEmptyComponent={<EmptyState icon={WashingMachine} title="Tidak ada order di tahap ini" />}
        ItemSeparatorComponent={() => <View style={{ height: space(3) }} />}
        renderItem={({ item }) => (
          <ProductionCard
            order={item}
            customer={customers.get(item.customerId)}
            now={now}
            showStatus={showStatus}
            onAdvance={canTransition ? (to) => advance(item, to) : undefined}
            onHold={canHold ? () => setHoldFor(item) : undefined}
          />
        )}
      />
      <ReasonSheet
        visible={!!holdFor}
        title="Tahan order"
        description={holdFor ? `${holdFor.orderNo} · alasan tercatat di riwayat order dan audit log.` : undefined}
        placeholder="Contoh: mesin pengering 2 rusak"
        confirmLabel="Tahan"
        onClose={() => setHoldFor(null)}
        onConfirm={(reason) => {
          if (holdFor && act((s) => transitionOrder(s, holdFor.id, 'ON_HOLD', { reason }, actor, new Date()), `${holdFor.orderNo} ditahan`).ok) setHoldFor(null)
        }}
      />
    </Screen>
  )
}
