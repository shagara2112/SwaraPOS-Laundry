import { normalizePhoneID } from '@swarapos/core/domain/whatsapp'
import type { Customer } from '@swarapos/core/types'
import { MapPin, Phone, Search, UserPlus, X } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { color, font, radius, space } from '@/theme'
import { Button } from '@/ui/Button'
import { Sheet } from '@/ui/Sheet'
import { TextField } from '@/ui/TextField'

export type NewCustomerInput = { name: string; phone: string; address: string; km: string }

const EMPTY: NewCustomerInput = { name: '', phone: '', address: '', km: '' }

/** Cari pelanggan dengan nama atau digit nomor WhatsApp (minimal 3 digit). */
export function searchCustomers(customers: Customer[], query: string): Customer[] {
  const q = query.trim().toLowerCase()
  const digits = q.replace(/\D/g, '')
  if (!q) return [...customers].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return customers.filter((c) => c.name.toLowerCase().includes(q) || (digits.length >= 3 && c.phone.replace(/\D/g, '').includes(digits)))
}

/** Lembar tambah pelanggan. `onCreate` mengembalikan `true` bila tersimpan. */
export function CustomerFormSheet({ visible, onClose, onCreate, withDistance }: { visible: boolean; onClose: () => void; onCreate: (input: NewCustomerInput) => boolean; withDistance?: boolean }) {
  const [draft, setDraft] = useState<NewCustomerInput>(EMPTY)
  const [touched, setTouched] = useState(false)
  const nameError = touched && !draft.name.trim() ? 'Nama wajib diisi.' : undefined
  const phoneError = touched && !normalizePhoneID(draft.phone) ? 'Nomor WhatsApp tidak valid.' : undefined
  const close = () => {
    setDraft(EMPTY)
    setTouched(false)
    onClose()
  }
  return (
    <Sheet
      visible={visible}
      onClose={close}
      title="Pelanggan baru"
      footer={
        <Button
          title="Simpan pelanggan"
          size="lg"
          onPress={() => {
            setTouched(true)
            if (draft.name.trim() && normalizePhoneID(draft.phone) && onCreate(draft)) close()
          }}
        />
      }
    >
      <TextField label="Nama" required value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} error={nameError} autoCapitalize="words" />
      <TextField label="WhatsApp" required value={draft.phone} onChangeText={(phone) => setDraft({ ...draft, phone })} error={phoneError} keyboardType="phone-pad" placeholder="0812-3456-7890" />
      <TextField label="Alamat" value={draft.address} onChangeText={(address) => setDraft({ ...draft, address })} hint="Wajib untuk jemput/antar." multiline />
      {withDistance && (
        <TextField label="Perkiraan jarak dari outlet (km)" value={draft.km} onChangeText={(km) => setDraft({ ...draft, km })} keyboardType="decimal-pad" placeholder="3,5" hint="Titik peta menyusul; jarak dipakai untuk zona." />
      )}
    </Sheet>
  )
}

export function CustomerPicker({
  customers,
  selected,
  onSelect,
  onCreate,
}: {
  customers: Customer[]
  selected: Customer | undefined
  onSelect: (id: string | null) => void
  onCreate: (input: NewCustomerInput) => boolean
}) {
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const matches = useMemo(() => searchCustomers(customers, query).slice(0, 6), [customers, query])

  if (selected) {
    return (
      <View style={styles.selected}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.name}>{selected.name}</Text>
          <View style={styles.meta}>
            <Phone size={14} color={color.muted} />
            <Text style={styles.metaText}>
              {selected.phone}
              {!normalizePhoneID(selected.phone) && <Text style={{ color: color.danger }}> · nomor tidak valid</Text>}
            </Text>
          </View>
          {selected.address && (
            <View style={styles.meta}>
              <MapPin size={14} color={color.muted} />
              <Text style={styles.metaText} numberOfLines={1}>
                {selected.address}
              </Text>
            </View>
          )}
          {selected.notes && <Text style={styles.note}>Catatan: {selected.notes}</Text>}
        </View>
        <Button title="Ganti" icon={X} variant="ghost" onPress={() => onSelect(null)} />
      </View>
    )
  }

  return (
    <View style={{ gap: space(2.5) }}>
      <View style={styles.search}>
        <Search size={18} color={color.subtle} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Cari nama atau nomor WhatsApp" placeholderTextColor={color.subtle} style={styles.searchInput} accessibilityLabel="Cari pelanggan" />
      </View>
      {matches.map((c) => (
        <Pressable key={c.id} onPress={() => onSelect(c.id)} style={styles.option} accessibilityRole="button">
          <Text style={styles.optionName}>{c.name}</Text>
          <Text style={styles.metaText}>{c.phone}</Text>
        </Pressable>
      ))}
      {matches.length === 0 && <Text style={styles.metaText}>Tidak ditemukan. Tambahkan sebagai pelanggan baru.</Text>}
      <Button title="Pelanggan baru" icon={UserPlus} variant="secondary" onPress={() => setCreating(true)} />
      <CustomerFormSheet visible={creating} onClose={() => setCreating(false)} onCreate={onCreate} withDistance />
    </View>
  )
}

const styles = StyleSheet.create({
  selected: { flexDirection: 'row', alignItems: 'flex-start', gap: space(2), padding: space(3.5), borderRadius: radius.md, borderWidth: 1, borderColor: color.primary, backgroundColor: color.primarySoft },
  name: { fontFamily: font.semibold, fontSize: 16, color: color.fg },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
  metaText: { flexShrink: 1, fontFamily: font.regular, fontSize: 13, color: color.muted },
  note: { fontFamily: font.regular, fontSize: 12, color: color.subtle },
  search: { flexDirection: 'row', alignItems: 'center', gap: space(2), minHeight: 48, paddingHorizontal: space(3), borderRadius: radius.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  searchInput: { flex: 1, minHeight: 46, fontFamily: font.regular, fontSize: 15, color: color.fg },
  option: { minHeight: 56, justifyContent: 'center', paddingHorizontal: space(3), paddingVertical: space(2), borderRadius: radius.md, borderWidth: 1, borderColor: color.border },
  optionName: { fontFamily: font.medium, fontSize: 15, color: color.fg },
})
