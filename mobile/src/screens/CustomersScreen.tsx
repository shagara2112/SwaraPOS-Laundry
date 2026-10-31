import { normalizePhoneID } from '@swarapos/core/domain/whatsapp'
import { addCustomer } from '@swarapos/core/store/actions-catalog'
import { MapPin, Search, UserPlus, Users } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native'
import { CustomerFormSheet, searchCustomers } from '@/components/CustomerPicker'
import { act } from '@/store/act'
import { useDemo } from '@/store/demo-store'
import { useActor, useOutletOrders } from '@/store/hooks'
import { color, font, radius, space } from '@/theme'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Card } from '@/ui/Card'
import { EmptyState } from '@/ui/misc'
import { Screen } from '@/ui/Screen'

export function CustomersScreen() {
  const customers = useDemo((s) => s.customers)
  const orders = useOutletOrders()
  const actor = useActor()
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)

  const orderCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const o of orders) m.set(o.customerId, (m.get(o.customerId) ?? 0) + 1)
    return m
  }, [orders])
  const list = useMemo(() => searchCustomers(customers, query), [customers, query])

  return (
    <Screen title="Pelanggan" subtitle={`${customers.length} pelanggan`} scroll={false} right={<Button title="Tambah" icon={UserPlus} variant="ghost" onPress={() => setAdding(true)} />}>
      <FlatList
        data={list}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.search}>
            <Search size={18} color={color.subtle} />
            <TextInput value={query} onChangeText={setQuery} placeholder="Cari nama atau nomor WhatsApp" placeholderTextColor={color.subtle} style={styles.searchInput} accessibilityLabel="Cari pelanggan" />
          </View>
        }
        ListEmptyComponent={<EmptyState icon={Users} title="Pelanggan tidak ditemukan" description="Tambahkan sebagai pelanggan baru." />}
        ItemSeparatorComponent={() => <View style={{ height: space(2.5) }} />}
        renderItem={({ item: c }) => (
          <Card style={{ gap: space(1) }}>
            <View style={styles.top}>
              <Text style={styles.name} numberOfLines={1}>
                {c.name}
              </Text>
              <Text style={styles.count}>{orderCount.get(c.id) ?? 0} order</Text>
            </View>
            <View style={styles.top}>
              <Text style={styles.sub}>{c.phone}</Text>
              {!normalizePhoneID(c.phone) && <Badge tone="danger" label="Nomor tidak valid" />}
            </View>
            {c.address && (
              <View style={styles.meta}>
                <MapPin size={14} color={color.subtle} />
                <Text style={styles.sub} numberOfLines={1}>
                  {c.address}
                </Text>
              </View>
            )}
            {c.notes && <Text style={styles.note}>Catatan: {c.notes}</Text>}
          </Card>
        )}
      />
      <CustomerFormSheet
        visible={adding}
        onClose={() => setAdding(false)}
        onCreate={(input) => act((s) => addCustomer(s, { name: input.name, phone: input.phone, address: input.address }, actor, new Date()), 'Pelanggan ditambahkan').ok}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  list: { padding: space(4), paddingBottom: space(10) },
  search: { flexDirection: 'row', alignItems: 'center', gap: space(2), minHeight: 48, marginBottom: space(3), paddingHorizontal: space(3), borderRadius: radius.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  searchInput: { flex: 1, minHeight: 46, fontFamily: font.regular, fontSize: 15, color: color.fg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space(2) },
  name: { flex: 1, fontFamily: font.semibold, fontSize: 15, color: color.fg },
  count: { fontFamily: font.medium, fontSize: 12, color: color.subtle },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
  sub: { flexShrink: 1, fontFamily: font.regular, fontSize: 13, color: color.muted },
  note: { fontFamily: font.regular, fontSize: 12, color: color.subtle },
})
