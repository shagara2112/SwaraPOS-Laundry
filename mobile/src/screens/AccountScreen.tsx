import { ROLE_LABEL } from '@swarapos/core/labels'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { ExternalLink, LogOut, RotateCcw, Store, UserRound } from 'lucide-react-native'
import { useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'
import { WEB_DASHBOARD_URL } from '@/lib/config'
import { useDemo } from '@/store/demo-store'
import { useActiveOutlet, useCurrentStaff } from '@/store/hooks'
import { useSession } from '@/store/session-store'
import { color, font, radius, space } from '@/theme'
import { Button } from '@/ui/Button'
import { Card } from '@/ui/Card'
import { Screen } from '@/ui/Screen'
import { Sheet } from '@/ui/Sheet'
import { toast } from '@/ui/Toast'

export function AccountScreen() {
  const role = useSession((s) => s.role)
  const signOut = useSession((s) => s.signOut)
  const outlet = useActiveOutlet()
  const staff = useCurrentStaff()
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <Screen title="Akun">
      <Card style={styles.profile}>
        <View style={styles.avatar}>
          <UserRound size={28} color={color.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{staff?.name ?? 'Staf demo'}</Text>
          <Text style={styles.meta}>{role ? ROLE_LABEL[role] : '-'}</Text>
        </View>
      </Card>

      <Card style={styles.outlet}>
        <Store size={20} color={color.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.outletName}>{outlet.name}</Text>
          <Text style={styles.meta}>{outlet.address}</Text>
        </View>
      </Card>

      {role === 'OWNER' && (
        <Card style={styles.web}>
          <Text style={styles.outletName}>Dashboard web</Text>
          <Text style={styles.meta}>Langganan, pengaturan outlet & staf, katalog layanan, dan laporan lengkap ada di dashboard web.</Text>
          <Button
            title="Buka dashboard web"
            icon={ExternalLink}
            onPress={() => Linking.openURL(WEB_DASHBOARD_URL).catch(() => toast('Browser tidak bisa dibuka di perangkat ini.', 'error'))}
          />
        </Card>
      )}

      <View style={styles.actions}>
        <Button
          title="Ganti peran"
          variant="secondary"
          size="lg"
          icon={LogOut}
          onPress={() => {
            signOut()
            router.replace('/masuk')
          }}
        />
        <Button title="Reset data demo" variant="ghost" size="lg" icon={RotateCcw} onPress={() => setConfirmReset(true)} />
      </View>

      <Text style={styles.version}>SwaraPOS Laundry · prototipe v{Constants.expoConfig?.version ?? '1.0.0'}</Text>

      <Sheet
        visible={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset data demo?"
        description="Semua order, pembayaran, dan perubahan di HP ini dikembalikan ke data contoh awal."
        footer={
          <Button
            title="Reset data"
            variant="danger"
            size="lg"
            onPress={() => {
              useDemo.getState().reset()
              setConfirmReset(false)
              toast('Data demo dikembalikan ke awal')
            }}
          />
        }
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
  avatar: { width: 52, height: 52, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandViolet },
  name: { fontFamily: font.bold, fontSize: 17, color: color.fg },
  meta: { marginTop: 2, fontFamily: font.regular, fontSize: 13, color: color.muted },
  outlet: { flexDirection: 'row', alignItems: 'flex-start', gap: space(3), marginTop: space(3) },
  web: { gap: space(2), marginTop: space(3) },
  outletName: { fontFamily: font.semibold, fontSize: 15, color: color.fg },
  actions: { marginTop: space(6), gap: space(2) },
  version: { marginTop: space(8), textAlign: 'center', fontFamily: font.regular, fontSize: 12, color: color.subtle },
})
