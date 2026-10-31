import { ROLE_HOME, type Role } from '@swarapos/core/permissions'
import { resolveStaff } from '@swarapos/core/selectors'
import { router, type Href } from 'expo-router'
import { Bike, Crown, ScanLine, ShieldCheck, Store, UserRound, WashingMachine, type LucideIcon } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BrandLogo } from '@/components/BrandLogo'
import { useDemo } from '@/store/demo-store'
import { useSession } from '@/store/session-store'
import { color, font, radius, shadow, space } from '@/theme'

const ROLES: { role: Role; label: string; desc: string; icon: LucideIcon }[] = [
  { role: 'OWNER', label: 'Owner', desc: 'Ringkasan, semua order, tugaskan kurir', icon: Crown },
  { role: 'CASHIER', label: 'Kasir', desc: 'Terima order, bayar, kirim WhatsApp', icon: ScanLine },
  { role: 'OPERATOR', label: 'Operator', desc: 'Papan produksi dan scan label', icon: WashingMachine },
  { role: 'QC', label: 'Quality control', desc: 'Checklist QC sebelum order siap', icon: ShieldCheck },
  { role: 'COURIER', label: 'Kurir', desc: 'Tugas jemput & antar dengan bukti', icon: Bike },
]

export default function MasukScreen() {
  const outlets = useDemo((s) => s.outlets)
  const staff = useDemo((s) => s.staff)
  const savedOutlet = useSession((s) => s.outletId)
  const savedStaff = useSession((s) => s.staffId)
  const signIn = useSession((s) => s.signIn)
  const [role, setRole] = useState<Role>('CASHIER')
  const [outletId, setOutletId] = useState(savedOutlet ?? outlets[0]?.id)
  const [staffId, setStaffId] = useState<string | null>(savedStaff)
  const selected = ROLES.find((r) => r.role === role)!
  // Peran dengan beberapa orang di outlet (mis. dua kurir) memilih orangnya; tugas kurir mengikuti staf ini.
  const people = staff.filter((x) => x.role === role && x.outletId === outletId)
  const person = outletId ? resolveStaff(staff, { role, outletId, staffId }) : undefined

  const masuk = () => {
    if (!outletId) return
    signIn(role, outletId, person?.id)
    router.replace(ROLE_HOME[role] as Href)
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brand}>
          <BrandLogo size={44} />
          <View>
            <Text style={styles.brandName}>SwaraPOS</Text>
            <Text style={styles.brandSub}>Laundry</Text>
          </View>
        </View>

        <Text style={styles.title}>Masuk</Text>
        <Text style={styles.subtitle}>Mode demo — pilih peran untuk mencoba aplikasi. Login dengan nomor & OTP menyusul bersama server.</Text>

        <Text style={styles.label}>Peran</Text>
        <View style={styles.list}>
          {ROLES.map(({ role: r, label, desc, icon: Icon }) => {
            const active = r === role
            return (
              <Pressable
                key={r}
                onPress={() => setRole(r)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[styles.roleCard, active && styles.roleCardActive]}
              >
                <View style={[styles.roleIcon, active && styles.roleIconActive]}>
                  <Icon size={22} color={active ? color.white : color.primary} />
                </View>
                <View style={styles.roleText}>
                  <Text style={styles.roleLabel}>{label}</Text>
                  <Text style={styles.roleDesc}>{desc}</Text>
                </View>
              </Pressable>
            )
          })}
        </View>

        <Text style={styles.label}>Outlet</Text>
        <View style={styles.outlets}>
          {outlets.map((o) => {
            const active = o.id === outletId
            return (
              <Pressable
                key={o.id}
                onPress={() => setOutletId(o.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[styles.outlet, active && styles.outletActive]}
              >
                <Store size={18} color={active ? color.primary : color.subtle} />
                <Text style={[styles.outletText, active && styles.outletTextActive]} numberOfLines={1}>
                  {o.name.replace('Laundry Bersih Kilat ', '')}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {people.length > 1 && (
          <>
            <Text style={styles.label}>Masuk sebagai</Text>
            <View style={styles.list}>
              {people.map((p) => {
                const active = p.id === person?.id
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setStaffId(p.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    style={[styles.outlet, active && styles.outletActive]}
                  >
                    <UserRound size={18} color={active ? color.primary : color.subtle} />
                    <Text style={[styles.outletText, active && styles.outletTextActive]} numberOfLines={1}>
                      {p.name}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={masuk} style={({ pressed }) => [styles.button, pressed && { backgroundColor: color.primaryPressed }]} accessibilityRole="button">
          <Text style={styles.buttonText}>Masuk sebagai {selected.label}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  content: { padding: space(5), paddingBottom: space(8) },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space(3), marginBottom: space(8) },
  brandName: { fontFamily: font.bold, fontSize: 18, color: color.fg },
  brandSub: { fontFamily: font.medium, fontSize: 13, color: color.subtle },
  title: { fontFamily: font.extrabold, fontSize: 28, color: color.fg },
  subtitle: { marginTop: space(1.5), fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.muted },
  label: { marginTop: space(6), marginBottom: space(2), fontFamily: font.semibold, fontSize: 13, color: color.fg },
  list: { gap: space(2) },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    minHeight: 64,
    padding: space(3),
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  roleCardActive: { borderColor: color.primary, backgroundColor: color.primarySoft },
  roleIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: color.primarySoft },
  roleIconActive: { backgroundColor: color.primary },
  roleText: { flex: 1 },
  roleLabel: { fontFamily: font.semibold, fontSize: 15, color: color.fg },
  roleDesc: { marginTop: 2, fontFamily: font.regular, fontSize: 13, color: color.muted },
  outlets: { flexDirection: 'row', gap: space(2) },
  outlet: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    minHeight: 48,
    paddingHorizontal: space(3),
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  outletActive: { borderColor: color.primary, backgroundColor: color.primarySoft },
  outletText: { flexShrink: 1, fontFamily: font.medium, fontSize: 14, color: color.muted },
  outletTextActive: { color: color.primary, fontFamily: font.semibold },
  footer: { padding: space(4), borderTopWidth: 1, borderTopColor: color.border, backgroundColor: color.surface },
  button: { height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: color.primary, ...shadow.card },
  buttonText: { fontFamily: font.bold, fontSize: 16, color: color.white },
})
