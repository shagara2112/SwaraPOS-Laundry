import { findOrderByScan } from '@swarapos/core/scan'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { router, useIsFocused } from 'expo-router'
import { CameraOff, Search } from 'lucide-react-native'
import { useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useOutletOrders } from '@/store/hooks'
import { color, font, radius, space, tone } from '@/theme'
import { Button } from '@/ui/Button'
import { Card } from '@/ui/Card'
import { Screen } from '@/ui/Screen'
import { TextField } from '@/ui/TextField'

/** Scan QR label (atau ketik nomor order) untuk membuka detail order di outlet ini. */
export function ScanScreen() {
  const orders = useOutletOrders()
  const focused = useIsFocused()
  const [permission, requestPermission] = useCameraPermissions()
  const [manual, setManual] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  // Kamera memanggil onBarcodeScanned berulang untuk QR yang sama; proses sekali per tampilan.
  const lastScan = useRef<{ value: string; at: number } | null>(null)

  const open = (raw: string) => {
    const order = findOrderByScan(orders, raw)
    if (!order) {
      setMessage(`"${raw.trim()}" tidak cocok dengan order di outlet ini.`)
      return false
    }
    setMessage(null)
    router.push(`/order/${order.id}`)
    return true
  }

  const onScanned = ({ data }: { data: string }) => {
    const now = Date.now()
    if (lastScan.current && lastScan.current.value === data && now - lastScan.current.at < 3000) return
    lastScan.current = { value: data, at: now }
    open(data)
  }

  return (
    <Screen title="Scan label" subtitle="Arahkan kamera ke QR pada label order">
      <View style={styles.cameraBox}>
        {permission?.granted ? (
          focused && <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onScanned} />
        ) : (
          <View style={styles.denied}>
            <CameraOff size={32} color={color.subtle} />
            <Text style={styles.deniedTitle}>{permission && !permission.canAskAgain ? 'Izin kamera ditolak' : 'Izinkan kamera untuk scan QR'}</Text>
            <Text style={styles.deniedText}>
              {permission && !permission.canAskAgain
                ? 'Buka Pengaturan Android → Aplikasi → SwaraPOS Laundry → Izin, lalu aktifkan Kamera. Sementara itu, ketik nomor order di bawah.'
                : 'Kamera hanya dipakai untuk membaca QR label. Anda juga bisa mengetik nomor order di bawah.'}
            </Text>
            {(!permission || permission.canAskAgain) && <Button title="Izinkan kamera" onPress={requestPermission} />}
          </View>
        )}
      </View>

      <Card style={{ gap: space(3), marginTop: space(4) }}>
        <TextField
          label="Nomor order atau link lacak"
          value={manual}
          onChangeText={(v) => {
            setManual(v)
            setMessage(null)
          }}
          placeholder="KMG-261031-0001"
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => manual.trim() && open(manual) && setManual('')}
        />
        <Button title="Buka order" icon={Search} variant="secondary" disabled={!manual.trim()} onPress={() => open(manual) && setManual('')} />
        {message && (
          <Text style={styles.message} accessibilityRole="alert">
            {message}
          </Text>
        )}
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  cameraBox: { height: 300, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: color.surface2, borderWidth: 1, borderColor: color.border },
  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space(2), padding: space(5) },
  deniedTitle: { fontFamily: font.semibold, fontSize: 16, color: color.fg, textAlign: 'center' },
  deniedText: { fontFamily: font.regular, fontSize: 13, color: color.muted, textAlign: 'center' },
  message: { fontFamily: font.medium, fontSize: 13, color: tone.danger.fg, backgroundColor: tone.danger.bg, borderRadius: radius.md, padding: space(3) },
})
