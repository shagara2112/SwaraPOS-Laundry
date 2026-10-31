import { statusPhase } from '@swarapos/core/domain/order-status'
import type { StatusPhase } from '@swarapos/core/types'
import { ClipboardList, Search } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { FlatList, StyleSheet, TextInput, View } from 'react-native'
import { OrderCard } from '@/components/OrderCard'
import { useNow } from '@/lib/use-now'
import { useCustomerMap, useOutletOrders } from '@/store/hooks'
import { color, font, radius, space } from '@/theme'
import { ChipRow, EmptyState } from '@/ui/misc'
import { Screen } from '@/ui/Screen'

const PHASES: { id: StatusPhase | 'all'; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'intake', label: 'Masuk' },
  { id: 'production', label: 'Produksi' },
  { id: 'qc', label: 'QC' },
  { id: 'ready', label: 'Siap/antar' },
  { id: 'done', label: 'Selesai' },
  { id: 'exception', label: 'Pengecualian' },
]

export function OrderListScreen() {
  const now = useNow()
  const orders = useOutletOrders()
  const customers = useCustomerMap()
  const [query, setQuery] = useState('')
  const [phase, setPhase] = useState<StatusPhase | 'all'>('all')

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase()
    const digits = q.replace(/\D/g, '')
    return [...orders]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter((o) => {
        if (!q) return true
        const c = customers.get(o.customerId)
        return o.orderNo.toLowerCase().includes(q) || c?.name.toLowerCase().includes(q) || (digits.length >= 3 && c?.phone.replace(/\D/g, '').includes(digits))
      })
  }, [orders, customers, query])
  const visible = phase === 'all' ? searched : searched.filter((o) => statusPhase(o.status) === phase)

  return (
    <Screen title="Order" subtitle={`${orders.length} order di outlet ini`} scroll={false}>
      <FlatList
        data={visible}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: space(3), marginBottom: space(1) }}>
            <View style={styles.search}>
              <Search size={18} color={color.subtle} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Cari nomor order, nama, atau telepon"
                placeholderTextColor={color.subtle}
                style={styles.searchInput}
                accessibilityLabel="Cari order"
              />
            </View>
            <ChipRow
              items={PHASES.map((p) => ({ ...p, count: p.id === 'all' ? searched.length : searched.filter((o) => statusPhase(o.status) === p.id).length }))}
              value={phase}
              onChange={setPhase}
            />
          </View>
        }
        ListEmptyComponent={<EmptyState icon={ClipboardList} title="Tidak ada order yang cocok" description="Ubah kata kunci atau filter." />}
        ItemSeparatorComponent={() => <View style={{ height: space(2.5) }} />}
        renderItem={({ item }) => <OrderCard order={item} customer={customers.get(item.customerId)} now={now} />}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  list: { padding: space(4), paddingBottom: space(10) },
  search: { flexDirection: 'row', alignItems: 'center', gap: space(2), minHeight: 48, paddingHorizontal: space(3), borderRadius: radius.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  searchInput: { flex: 1, fontFamily: font.regular, fontSize: 15, color: color.fg, minHeight: 46 },
})
