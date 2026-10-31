import { assignCourier } from '@swarapos/core/store/actions-catalog'
import type { DeliveryTask } from '@swarapos/core/types'
import { Bike } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { act } from '@/store/act'
import { useDemo } from '@/store/demo-store'
import { useActiveOutlet, useActor } from '@/store/hooks'
import { color, font, radius, space } from '@/theme'
import { Sheet } from '@/ui/Sheet'

/** Pilih kurir outlet untuk tugas jemput/antar yang belum ditugaskan atau gagal. */
export function CourierPickerSheet({ task, title, onClose }: { task: DeliveryTask | null; title?: string; onClose: () => void }) {
  const outlet = useActiveOutlet()
  const actor = useActor()
  const staff = useDemo((s) => s.staff)
  const couriers = staff.filter((s) => s.role === 'COURIER' && s.outletId === outlet.id)

  return (
    <Sheet visible={!!task} onClose={onClose} title="Pilih kurir" description={title}>
      {couriers.length === 0 && <Text style={styles.sub}>Belum ada kurir di outlet ini. Tambahkan kurir lewat web (Pengaturan → Staf).</Text>}
      {couriers.map((c) => (
        <Pressable
          key={c.id}
          style={styles.courier}
          accessibilityRole="button"
          onPress={() => {
            if (task && act((s) => assignCourier(s, task.id, c.id, actor, new Date()), `Ditugaskan ke ${c.name}`).ok) onClose()
          }}
        >
          <Bike size={20} color={color.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{c.name}</Text>
            <Text style={styles.sub}>{c.phone}</Text>
          </View>
        </Pressable>
      ))}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  courier: { flexDirection: 'row', alignItems: 'center', gap: space(3), minHeight: 56, paddingHorizontal: space(3), borderRadius: radius.md, borderWidth: 1, borderColor: color.border },
  name: { fontFamily: font.semibold, fontSize: 15, color: color.fg },
  sub: { fontFamily: font.regular, fontSize: 13, color: color.muted },
})
