import { formatRupiah } from '@swarapos/core/format'
import { StyleSheet, Text, View } from 'react-native'
import { color, font, space } from '@/theme'
import { Button } from '@/ui/Button'

/** Bar bawah layar order baru: total dan Simpan; selama belum lengkap, alasan ditampilkan di atas tombol. */
export function OrderSummaryBar({ total, blockers, onSave }: { total: number; blockers: string[]; onSave: () => void }) {
  return (
    <View style={{ gap: space(2) }}>
      {blockers.length > 0 && (
        <Text style={styles.blockers} accessibilityLiveRegion="polite">
          Belum bisa disimpan: {blockers.join(' · ')}
        </Text>
      )}
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Total</Text>
          <Text style={styles.total}>{formatRupiah(total)}</Text>
        </View>
        <Button title="Simpan order" size="lg" onPress={onSave} disabled={blockers.length > 0} style={{ minWidth: 160 }} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  blockers: { fontFamily: font.medium, fontSize: 12, color: color.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
  label: { fontFamily: font.regular, fontSize: 12, color: color.subtle },
  total: { fontFamily: font.extrabold, fontSize: 20, color: color.fg },
})
