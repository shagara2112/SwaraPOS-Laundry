import type { LucideIcon } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { color, font, radius, shadow, space } from '@/theme'

export function KpiTile({ label, value, hint, icon: Icon, accent = color.primary }: { label: string; value: string; hint?: string; icon: LucideIcon; accent?: string }) {
  return (
    <View style={styles.kpi}>
      <View style={styles.kpiHead}>
        <Text style={styles.kpiLabel} numberOfLines={1}>
          {label}
        </Text>
        <Icon size={18} color={accent} />
      </View>
      <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {hint && (
        <Text style={styles.kpiHint} numberOfLines={1}>
          {hint}
        </Text>
      )}
    </View>
  )
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon size={26} color={color.subtle} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description && <Text style={styles.emptyDesc}>{description}</Text>}
      {action}
    </View>
  )
}

/** Baris chip yang bisa digeser, untuk filter fase/tahap. */
export function ChipRow<T extends string>({ items, value, onChange }: { items: { id: T; label: string; count?: number }[]; value: T; onChange: (id: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {items.map((it) => {
        const active = it.id === value
        return (
          <Pressable key={it.id} onPress={() => onChange(it.id)} accessibilityRole="tab" accessibilityState={{ selected: active }} style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{it.label}</Text>
            {it.count !== undefined && <Text style={[styles.chipCount, active && styles.chipTextActive]}>{it.count}</Text>}
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

/** Kontrol segmen 2–3 pilihan. */
export function Segmented<T extends string>({ items, value, onChange }: { items: { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return (
    <View style={styles.segment}>
      {items.map((it) => {
        const active = it.id === value
        return (
          <Pressable key={it.id} onPress={() => onChange(it.id)} accessibilityRole="tab" accessibilityState={{ selected: active }} style={[styles.segmentItem, active && styles.segmentActive]}>
            <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
              {it.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, strong && styles.rowStrong]}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowStrong]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  kpi: { flex: 1, minWidth: 150, backgroundColor: color.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: color.border, padding: space(3.5), ...shadow.card },
  kpiHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space(2) },
  kpiLabel: { flex: 1, fontFamily: font.medium, fontSize: 13, color: color.muted },
  kpiValue: { marginTop: space(2), fontFamily: font.extrabold, fontSize: 22, color: color.fg },
  kpiHint: { marginTop: 2, fontFamily: font.regular, fontSize: 11, color: color.subtle },
  empty: { alignItems: 'center', paddingVertical: space(10), paddingHorizontal: space(6), gap: space(2) },
  emptyIcon: { width: 52, height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface2 },
  emptyTitle: { marginTop: space(2), fontFamily: font.semibold, fontSize: 16, color: color.fg, textAlign: 'center' },
  emptyDesc: { fontFamily: font.regular, fontSize: 13, color: color.muted, textAlign: 'center' },
  chips: { gap: space(2), paddingVertical: space(1) },
  chip: { flexDirection: 'row', alignItems: 'center', gap: space(1.5), minHeight: 40, paddingHorizontal: space(3.5), borderRadius: radius.full, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  chipActive: { borderColor: color.primary, backgroundColor: color.primarySoft },
  chipText: { fontFamily: font.medium, fontSize: 14, color: color.muted },
  chipCount: { fontFamily: font.mono, fontSize: 12, color: color.subtle },
  chipTextActive: { color: color.primary },
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: radius.md, backgroundColor: color.surface2, borderWidth: 1, borderColor: color.border },
  segmentItem: { flex: 1, minHeight: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space(2) },
  segmentActive: { backgroundColor: color.surface, ...shadow.card },
  segmentText: { fontFamily: font.medium, fontSize: 14, color: color.muted },
  segmentTextActive: { color: color.fg, fontFamily: font.semibold },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space(3), paddingVertical: 3 },
  rowLabel: { flexShrink: 1, fontFamily: font.regular, fontSize: 14, color: color.muted },
  rowValue: { fontFamily: font.medium, fontSize: 14, color: color.fg },
  rowStrong: { fontFamily: font.bold, fontSize: 16, color: color.fg },
})
