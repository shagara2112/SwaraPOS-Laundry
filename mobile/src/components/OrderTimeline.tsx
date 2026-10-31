import { STATUS_LABEL, statusPhase } from '@swarapos/core/domain/order-status'
import { formatDateTime } from '@swarapos/core/format'
import type { StatusEvent } from '@swarapos/core/types'
import { NotebookPen } from 'lucide-react-native'
import { StyleSheet, Text, View } from 'react-native'
import { color, font, radius, space, tone } from '@/theme'
import { statusIcon } from './StatusBadge'

/** Riwayat terbaru di atas. Event tanpa perubahan status (mis. hasil QC) tampil sebagai catatan. */
export function OrderTimeline({ history }: { history: StatusEvent[] }) {
  const events = [...history].reverse()
  return (
    <View style={styles.list}>
      <View style={styles.rail} />
      {events.map((e, i) => {
        const isNote = e.from === e.to
        const Icon = isNote ? NotebookPen : statusIcon(e.to)
        const t = tone[statusPhase(e.to)]
        return (
          <View key={e.id} style={styles.item}>
            <View style={[styles.dot, { backgroundColor: t.bg }, i === 0 && !isNote && styles.dotLatest]}>
              <Icon size={16} color={t.fg} />
            </View>
            <View style={styles.body}>
              <Text style={styles.title}>{isNote ? 'Catatan QC' : STATUS_LABEL[e.to]}</Text>
              <Text style={styles.meta}>
                {formatDateTime(e.at)} · {e.actor.name}
              </Text>
              {e.note && <Text style={styles.note}>{e.note}</Text>}
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: space(4) },
  rail: { position: 'absolute', left: 17, top: 8, bottom: 8, width: 1, backgroundColor: color.border },
  item: { flexDirection: 'row', gap: space(3) },
  dot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: color.surface },
  dotLatest: { borderColor: color.primarySoft },
  body: { flex: 1, paddingTop: 6 },
  title: { fontFamily: font.semibold, fontSize: 14, color: color.fg },
  meta: { marginTop: 2, fontFamily: font.regular, fontSize: 12, color: color.subtle },
  note: { marginTop: space(1.5), fontFamily: font.regular, fontSize: 13, color: color.muted, backgroundColor: color.surface2, borderRadius: radius.sm, paddingHorizontal: space(3), paddingVertical: space(2) },
})
