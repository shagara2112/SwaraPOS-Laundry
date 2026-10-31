import { courierTasks } from '@swarapos/core/delivery'
import { Bike, History } from 'lucide-react-native'
import { useMemo } from 'react'
import { FlatList, View } from 'react-native'
import { CourierTaskCard } from '@/components/TaskCard'
import { useDemo } from '@/store/demo-store'
import { useCurrentStaff, useCustomerMap } from '@/store/hooks'
import { space } from '@/theme'
import { EmptyState } from '@/ui/misc'
import { Screen } from '@/ui/Screen'

function useCourierTasks() {
  const staff = useCurrentStaff()
  const tasks = useDemo((s) => s.deliveryTasks)
  const orders = useDemo((s) => s.orders)
  const customers = useCustomerMap()
  const orderMap = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders])
  const lists = useMemo(() => courierTasks({ deliveryTasks: tasks, orders }, staff?.id ?? ''), [tasks, orders, staff])
  return { staff, lists, orderMap, customers }
}

/** Tugas aktif kurir yang sedang memakai aplikasi, urut jadwal. */
export function CourierTasksScreen() {
  const { staff, lists, orderMap, customers } = useCourierTasks()
  return (
    <Screen title="Tugas" subtitle={`${staff?.name ?? 'Kurir'} · ${lists.active.length} tugas aktif`} scroll={false}>
      <FlatList
        data={lists.active}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: space(4), paddingBottom: space(10) }}
        ListEmptyComponent={<EmptyState icon={Bike} title="Belum ada tugas" description="Tugas jemput dan antar dari outlet akan muncul di sini." />}
        ItemSeparatorComponent={() => <View style={{ height: space(3) }} />}
        renderItem={({ item }) => {
          const order = orderMap.get(item.orderId)
          return <CourierTaskCard task={item} order={order} customer={order ? customers.get(order.customerId) : undefined} />
        }}
      />
    </Screen>
  )
}

/** Tugas selesai dan gagal, terbaru di atas. */
export function CourierHistoryScreen() {
  const { lists, orderMap, customers } = useCourierTasks()
  return (
    <Screen title="Riwayat" subtitle={`${lists.history.length} tugas selesai/gagal`} scroll={false}>
      <FlatList
        data={lists.history}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: space(4), paddingBottom: space(10) }}
        ListEmptyComponent={<EmptyState icon={History} title="Belum ada riwayat" />}
        ItemSeparatorComponent={() => <View style={{ height: space(3) }} />}
        renderItem={({ item }) => {
          const order = orderMap.get(item.orderId)
          return <CourierTaskCard task={item} order={order} customer={order ? customers.get(order.customerId) : undefined} />
        }}
      />
    </Screen>
  )
}
