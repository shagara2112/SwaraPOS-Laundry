import { useNetInfo } from '@react-native-community/netinfo'
import { WifiOff } from 'lucide-react-native'
import { StyleSheet, Text, View } from 'react-native'
import { font, radius, space, tone } from '@/theme'

/** Status koneksi di header. Saat offline, perubahan nantinya disimpan sebagai pending sync. */
export function OfflineBadge() {
  const { isConnected } = useNetInfo()
  if (isConnected === false) {
    return (
      <View style={[styles.pill, { backgroundColor: tone.qc.bg }]} accessibilityRole="text" accessibilityLabel="Offline">
        <WifiOff size={14} color={tone.qc.fg} />
        <Text style={[styles.text, { color: tone.qc.fg }]}>Offline</Text>
      </View>
    )
  }
  return <View style={styles.dot} accessibilityLabel="Online" />
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.full, paddingHorizontal: space(2.5), paddingVertical: 4 },
  text: { fontFamily: font.semibold, fontSize: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: tone.done.fg },
})
