import type { DraftLine } from '@swarapos/core/cashier'
import { lineTotal } from '@swarapos/core/domain/pricing'
import { formatRupiah, parseDecimalID } from '@swarapos/core/format'
import { newId } from '@swarapos/core/ids'
import { UNIT_SHORT } from '@swarapos/core/labels'
import type { Service } from '@swarapos/core/types'
import { Plus, Trash2, Zap } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { color, font, radius, space, tone } from '@/theme'

/** Pilih layanan utama (baris berat/jumlah), add-on, dan express. */
export function ServicePicker({
  services,
  outletId,
  lines,
  addons,
  express,
  expressPct,
  onLines,
  onAddons,
  onExpress,
}: {
  services: Service[]
  outletId: string
  lines: DraftLine[]
  addons: string[]
  express: boolean
  expressPct: number
  onLines: (lines: DraftLine[]) => void
  onAddons: (ids: string[]) => void
  onExpress: (on: boolean) => void
}) {
  const main = services.filter((s) => s.active && s.unit !== 'ADDON')
  const addonServices = services.filter((s) => s.active && s.unit === 'ADDON')
  const byId = new Map(services.map((s) => [s.id, s]))
  const price = (s: Service) => s.prices[outletId] ?? 0

  return (
    <View style={{ gap: space(4) }}>
      <View style={styles.chips}>
        {main.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => onLines([...lines, { key: newId('l'), serviceId: s.id, qtyText: s.unit === 'KG' ? '' : '1' }])}
            style={styles.addChip}
            accessibilityRole="button"
            accessibilityLabel={`Tambah ${s.name}`}
          >
            <Plus size={16} color={color.primary} />
            <Text style={styles.addLabel}>{s.name}</Text>
            <Text style={styles.addPrice}>
              {formatRupiah(price(s))}/{UNIT_SHORT[s.unit]}
            </Text>
          </Pressable>
        ))}
      </View>

      {lines.length > 0 && (
        <View style={styles.lines}>
          {lines.map((line, i) => {
            const svc = byId.get(line.serviceId)
            if (!svc) return null
            const qty = parseDecimalID(line.qtyText)
            const invalid = line.qtyText.trim() !== '' && !(qty && qty > 0)
            const label = svc.unit === 'KG' ? 'Berat' : 'Jumlah'
            return (
              <View key={line.key} style={[styles.line, i > 0 && styles.divider]}>
                <View style={styles.lineRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lineName}>{svc.name}</Text>
                    <Text style={styles.linePrice}>
                      {formatRupiah(price(svc))} / {UNIT_SHORT[svc.unit]}
                    </Text>
                  </View>
                  <Pressable onPress={() => onLines(lines.filter((l) => l.key !== line.key))} style={styles.remove} accessibilityRole="button" accessibilityLabel={`Hapus ${svc.name}`}>
                    <Trash2 size={18} color={color.subtle} />
                  </Pressable>
                </View>
                <View style={styles.lineRow}>
                  <TextInput
                    value={line.qtyText}
                    onChangeText={(qtyText) => onLines(lines.map((l) => (l.key === line.key ? { ...l, qtyText } : l)))}
                    placeholder={label}
                    placeholderTextColor={color.subtle}
                    keyboardType="decimal-pad"
                    style={[styles.qty, invalid && styles.qtyInvalid]}
                    accessibilityLabel={`${label} ${svc.name}`}
                    autoFocus={svc.unit === 'KG' && line.qtyText === ''}
                  />
                  <Text style={styles.unit}>{UNIT_SHORT[svc.unit]}</Text>
                  <Text style={styles.lineTotal}>{qty && qty > 0 ? formatRupiah(lineTotal({ unit: svc.unit, unitPrice: price(svc), qty })) : '—'}</Text>
                </View>
                {invalid && <Text style={styles.error}>Isi angka lebih dari 0, contoh 3,5.</Text>}
              </View>
            )
          })}
        </View>
      )}

      <View style={styles.chips}>
        {addonServices.map((s) => {
          const on = addons.includes(s.id)
          return (
            <Pressable
              key={s.id}
              onPress={() => onAddons(on ? addons.filter((a) => a !== s.id) : [...addons, s.id])}
              style={[styles.toggle, on && { borderColor: tone.production.fg, backgroundColor: tone.production.bg }]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
            >
              <Text style={[styles.toggleLabel, on && { color: tone.production.fg }]}>
                + {s.name} · {formatRupiah(price(s))}
              </Text>
            </Pressable>
          )
        })}
        <Pressable
          onPress={() => onExpress(!express)}
          style={[styles.toggle, express && { borderColor: tone.qc.fg, backgroundColor: tone.qc.bg }]}
          accessibilityRole="switch"
          accessibilityState={{ checked: express }}
        >
          <Zap size={16} color={express ? tone.qc.fg : color.muted} />
          <Text style={[styles.toggleLabel, express && { color: tone.qc.fg }]}>Express +{expressPct}% · SLA separuh</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  addChip: { flexDirection: 'row', alignItems: 'center', gap: space(1.5), minHeight: 44, paddingHorizontal: space(3), borderRadius: radius.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  addLabel: { fontFamily: font.medium, fontSize: 14, color: color.fg },
  addPrice: { fontFamily: font.regular, fontSize: 12, color: color.subtle },
  lines: { borderRadius: radius.md, borderWidth: 1, borderColor: color.border },
  line: { padding: space(3), gap: space(2) },
  divider: { borderTopWidth: 1, borderTopColor: color.border },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  lineName: { fontFamily: font.medium, fontSize: 15, color: color.fg },
  linePrice: { fontFamily: font.regular, fontSize: 12, color: color.subtle },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  qty: { width: 96, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: color.border, paddingHorizontal: space(3), textAlign: 'right', fontFamily: font.mono, fontSize: 17, color: color.fg },
  qtyInvalid: { borderColor: color.danger },
  unit: { width: 40, fontFamily: font.regular, fontSize: 14, color: color.muted },
  lineTotal: { flex: 1, textAlign: 'right', fontFamily: font.semibold, fontSize: 15, color: color.fg },
  error: { fontFamily: font.medium, fontSize: 12, color: color.danger },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space(1.5), minHeight: 44, paddingHorizontal: space(4), borderRadius: radius.full, borderWidth: 1, borderColor: color.border },
  toggleLabel: { fontFamily: font.medium, fontSize: 14, color: color.muted },
})
