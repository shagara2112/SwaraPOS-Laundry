import { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { DATE_PRESETS, dateFilterRange, wibDayStart, type DateFilterValue } from '@swarapos/core/date-range'
import { jakartaDateKey } from '@swarapos/core/domain/order-number'
import { formatDate } from '@swarapos/core/format'
import { CalendarDays } from 'lucide-react-native'
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { color, font, radius, space } from '@/theme'
import { ChipRow } from '@/ui/misc'

export { dateFilterRange, initialDateFilter, type DateFilterValue } from '@swarapos/core/date-range'

const pad = (n: number) => String(n).padStart(2, '0')

function DateField({ label, value, onChange, max }: { label: string; value: string; onChange: (day: string) => void; max: string }) {
  const valid = !Number.isNaN(wibDayStart(value))
  if (Platform.OS !== 'android') {
    // Kalender bawaan hanya ada di Android; web dan lainnya mengetik tanggal.
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TextInput value={value} onChangeText={onChange} placeholder="2026-10-31" placeholderTextColor={color.subtle} style={[styles.input, !valid && styles.invalid]} accessibilityLabel={label} autoCorrect={false} />
      </View>
    )
  }
  const open = () => {
    const [y, m, d] = (valid ? value : max).split('-').map(Number)
    const [my, mm, md] = max.split('-').map(Number)
    DateTimePickerAndroid.open({
      mode: 'date',
      value: new Date(y, m - 1, d),
      maximumDate: new Date(my, mm - 1, md),
      // Hari yang diketuk di kalender perangkat, tanpa geser zona waktu.
      onChange: (event, date) => {
        if (event.type === 'set' && date) onChange(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`)
      },
    })
  }
  return (
    <Pressable onPress={open} style={styles.field} accessibilityRole="button" accessibilityLabel={`${label}: ${valid ? formatDate(new Date(wibDayStart(value)).toISOString()) : 'belum dipilih'}`}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.input}>
        <CalendarDays size={16} color={color.primary} />
        <Text style={styles.inputText}>{valid ? formatDate(new Date(wibDayStart(value)).toISOString()) : 'Pilih'}</Text>
      </View>
    </Pressable>
  )
}

/** Chip preset tanggal (batas hari WIB) dengan pilihan rentang sendiri. */
export function DateFilter({ value, onChange, presets = DATE_PRESETS, now }: { value: DateFilterValue; onChange: (v: DateFilterValue) => void; presets?: typeof DATE_PRESETS; now: Date }) {
  const today = jakartaDateKey(now)
  const invalid = value.preset === 'custom' && !dateFilterRange(value, now)
  return (
    <View style={{ gap: space(2.5) }}>
      <ChipRow items={presets} value={value.preset} onChange={(preset) => onChange({ ...value, preset })} />
      {value.preset === 'custom' && (
        <View style={{ gap: space(1.5) }}>
          <View style={styles.row}>
            <DateField label="Dari" value={value.from} onChange={(from) => onChange({ ...value, from })} max={today} />
            <DateField label="Sampai" value={value.to} onChange={(to) => onChange({ ...value, to })} max={today} />
          </View>
          {invalid && <Text style={styles.error}>Isi tanggal dengan format 2026-10-31.</Text>}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space(2.5) },
  field: { flex: 1, gap: space(1) },
  fieldLabel: { fontFamily: font.medium, fontSize: 12, color: color.muted },
  input: { flexDirection: 'row', alignItems: 'center', gap: space(2), minHeight: 44, paddingHorizontal: space(3), borderRadius: radius.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, fontFamily: font.regular, fontSize: 15, color: color.fg },
  inputText: { fontFamily: font.medium, fontSize: 14, color: color.fg },
  invalid: { borderColor: color.danger },
  error: { fontFamily: font.medium, fontSize: 12, color: color.danger },
})
