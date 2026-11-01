import { ROLE_LABEL } from '@swarapos/core/labels'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { cashSummary } from '@swarapos/core/cash'
import { presetRange } from '@swarapos/core/date-range'
import { formatRupiah } from '@swarapos/core/format'
import { tenantSlug } from '@swarapos/core/pickup-request'
import { setReceiptPaper } from '@swarapos/core/store/actions-catalog'
import type { ReceiptPaper } from '@swarapos/core/types'
import { Banknote, ExternalLink, Link2, LogOut, Receipt, RotateCcw, Share2, Store, UserRound } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Linking, Share, StyleSheet, Text, View } from 'react-native'
import { WEB_DASHBOARD_URL, WEB_ORIGIN } from '@/lib/config'
import { useDemo } from '@/store/demo-store'
import { useNow } from '@/lib/use-now'
import { act } from '@/store/act'
import { useActiveOutlet, useActor, useCurrentStaff } from '@/store/hooks'
import { useSession } from '@/store/session-store'
import { color, font, radius, space } from '@/theme'
import { Button } from '@/ui/Button'
import { Card } from '@/ui/Card'
import { Row, Segmented } from '@/ui/misc'
import { Screen } from '@/ui/Screen'
import { Sheet } from '@/ui/Sheet'
import { toast } from '@/ui/Toast'

export function AccountScreen() {
  const role = useSession((s) => s.role)
  const signOut = useSession((s) => s.signOut)
  const outlet = useActiveOutlet()
  const staff = useCurrentStaff()
  const actor = useActor()
  const orders = useDemo((s) => s.orders)
  const slug = useDemo((s) => tenantSlug(s))
  const tenantName = useDemo((s) => s.tenant.name)
  const pickupLink = `${WEB_ORIGIN}/pesan/${slug}?outlet=${outlet.code}`
  const now = useNow()
  // Pembayaran yang dicatat kasir ini hari ini (WIB), untuk dicocokkan dengan laci saat tutup kasir.
  const myCash = useMemo(
    () => (role === 'CASHIER' ? cashSummary(orders, { range: presetRange('today', now)!, outletId: outlet.id, actorId: actor.id }) : null),
    [role, orders, now, outlet.id, actor.id],
  )
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

      {myCash && (
        <Card style={styles.web}>
          <View style={styles.paperHead}>
            <Banknote size={18} color={color.primary} />
            <Text style={[styles.outletName, { flex: 1 }]}>Kas saya hari ini</Text>
            <Text style={styles.outletName}>{formatRupiah(myCash.total)}</Text>
          </View>
          <Text style={styles.meta}>{myCash.count} pembayaran yang Anda catat. Cocokkan tunai dengan laci saat tutup kasir.</Text>
          {myCash.byMethod.map((m) => (
            <Row key={m.method} label={m.label} value={formatRupiah(m.total)} />
          ))}
        </Card>
      )}

      {role === 'OWNER' && (
        <Card style={styles.web}>
          <View style={styles.paperHead}>
            <Link2 size={18} color={color.primary} />
            <Text style={styles.outletName}>Link pesan jemput</Text>
          </View>
          <Text style={styles.link} selectable>
            {pickupLink}
          </Text>
          <Text style={styles.meta}>Bagikan di WhatsApp atau Instagram; permintaan masuk ke Antar-jemput.</Text>
          <Button
            title="Bagikan link"
            icon={Share2}
            variant="secondary"
            onPress={() => Share.share({ message: `Pesan jemput cucian di ${tenantName}: ${pickupLink}` }).catch(() => toast('Link tidak bisa dibagikan dari perangkat ini.', 'error'))}
          />
        </Card>
      )}

      {role === 'OWNER' && (
        <Card style={styles.web}>
          <View style={styles.paperHead}>
            <Receipt size={18} color={color.primary} />
            <Text style={styles.outletName}>Kertas nota</Text>
          </View>
          <Text style={styles.meta}>Lebar printer thermal untuk nota outlet ini.</Text>
          <Segmented
            items={[
              { id: '58', label: '58 mm' },
              { id: '80', label: '80 mm' },
            ]}
            value={String(outlet.receiptPaper ?? 58)}
            onChange={(id) => {
              const paper = Number(id) as ReceiptPaper
              act((s) => setReceiptPaper(s, outlet.id, paper, actor, new Date()), `Kertas nota: ${paper} mm`)
            }}
          />
        </Card>
      )}

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
  paperHead: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  link: { fontFamily: font.mono, fontSize: 12, color: color.muted, backgroundColor: color.surface2, borderRadius: radius.sm, padding: space(2) },
  outletName: { fontFamily: font.semibold, fontSize: 15, color: color.fg },
  actions: { marginTop: space(6), gap: space(2) },
  version: { marginTop: space(8), textAlign: 'center', fontFamily: font.regular, fontSize: 12, color: color.subtle },
})
