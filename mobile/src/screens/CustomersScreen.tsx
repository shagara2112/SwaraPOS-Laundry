import { normalizePhoneID } from '@swarapos/core/domain/whatsapp'
import { formatDate } from '@swarapos/core/format'
import { can } from '@swarapos/core/permissions'
import { addCustomer, deleteCustomer, updateCustomer } from '@swarapos/core/store/actions-catalog'
import type { Customer } from '@swarapos/core/types'
import { MapPin, Pencil, Search, Trash2, UserPlus, Users } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native'
import { CustomerFormSheet, searchCustomers } from '@/components/CustomerPicker'
import { act } from '@/store/act'
import { useDemo } from '@/store/demo-store'
import { useActor } from '@/store/hooks'
import { useSession } from '@/store/session-store'
import { color, font, radius, space } from '@/theme'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Card } from '@/ui/Card'
import { EmptyState, Row } from '@/ui/misc'
import { Screen } from '@/ui/Screen'
import { Sheet } from '@/ui/Sheet'

export function CustomersScreen() {
  const customers = useDemo((s) => s.customers)
  // Pelanggan berlaku untuk semua outlet, jadi jumlah order dihitung dari semua outlet.
  const orders = useDemo((s) => s.orders)
  const actor = useActor()
  const role = useSession((s) => s.role)
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState<Customer | null>(null)

  const orderCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const o of orders) m.set(o.customerId, (m.get(o.customerId) ?? 0) + 1)
    return m
  }, [orders])
  const list = useMemo(() => searchCustomers(customers, query), [customers, query])
  const open = customers.find((c) => c.id === openId)
  const canUpdate = !!role && can(role, 'customer.update')
  const canDelete = !!role && can(role, 'customer.delete')

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
          <Card onPress={() => setOpenId(c.id)} style={{ gap: space(1) }}>
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
        onCreate={(input) => act((s) => addCustomer(s, { name: input.name, phone: input.phone, address: input.address, notes: input.notes }, actor, new Date()), 'Pelanggan ditambahkan').ok}
      />

      <Sheet visible={!!open} onClose={() => setOpenId(null)} title={open?.name ?? ''} description={open ? `Pelanggan sejak ${formatDate(open.createdAt)}` : undefined}>
        {open && (
          <>
            <View style={{ gap: space(2) }}>
              <Row label="WhatsApp" value={open.phone} />
              <Row label="Alamat" value={open.address ?? '—'} />
              <Row label="Catatan" value={open.notes ?? '—'} />
              <Row label="Jumlah order" value={String(orderCount.get(open.id) ?? 0)} />
            </View>
            {canUpdate && (
              <Button
                title="Ubah data"
                icon={Pencil}
                variant="secondary"
                onPress={() => {
                  setEditing(open)
                  setOpenId(null)
                }}
              />
            )}
            {canDelete && (
              <View style={{ gap: space(1.5) }}>
                <Button
                  title="Hapus pelanggan"
                  icon={Trash2}
                  variant="ghost"
                  disabled={(orderCount.get(open.id) ?? 0) > 0}
                  onPress={() => {
                    setDeleting(open)
                    setOpenId(null)
                  }}
                />
                {(orderCount.get(open.id) ?? 0) > 0 && (
                  <Text style={styles.hint}>Punya {orderCount.get(open.id)} order, jadi tidak bisa dihapus agar riwayat order dan pembayaran tetap utuh.</Text>
                )}
              </View>
            )}
          </>
        )}
      </Sheet>

      {editing && (
        <CustomerFormSheet
          visible
          initial={{ name: editing.name, phone: editing.phone, address: editing.address ?? '', notes: editing.notes ?? '', km: '' }}
          onClose={() => setEditing(null)}
          onCreate={(input) =>
            act((s) => updateCustomer(s, editing.id, { name: input.name, phone: input.phone, address: input.address, notes: input.notes }, actor, new Date()), 'Data pelanggan diperbarui').ok
          }
        />
      )}

      <Sheet
        visible={!!deleting}
        onClose={() => setDeleting(null)}
        title="Hapus pelanggan?"
        description={deleting ? `${deleting.name} · ${deleting.phone}` : undefined}
        footer={
          <Button
            title="Hapus"
            icon={Trash2}
            variant="danger"
            size="lg"
            onPress={() => {
              if (deleting && act((s) => deleteCustomer(s, deleting.id, actor, new Date()), 'Pelanggan dihapus').ok) setDeleting(null)
            }}
          />
        }
      >
        <Text style={styles.sub}>Data pelanggan ini akan dihapus permanen dari data demo. Tindakan tercatat di audit log.</Text>
      </Sheet>
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
  hint: { fontFamily: font.regular, fontSize: 12, color: color.subtle, textAlign: 'center' },
})
