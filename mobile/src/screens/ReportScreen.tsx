import { DATE_PRESETS } from '@swarapos/core/date-range'
import { formatRupiah } from '@swarapos/core/format'
import { buildReport, type Datum } from '@swarapos/core/report'
import { ExternalLink, HandCoins, Receipt, Users, Wallet } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'
import { DateFilter, dateFilterRange, initialDateFilter } from '@/components/DateFilter'
import { WEB_DASHBOARD_URL } from '@/lib/config'
import { useNow } from '@/lib/use-now'
import { useDemo } from '@/store/demo-store'
import { useActiveOutlet } from '@/store/hooks'
import { color, font, radius, space, tone } from '@/theme'
import { Button } from '@/ui/Button'
import { Card, SectionTitle } from '@/ui/Card'
import { KpiTile } from '@/ui/misc'
import { Screen } from '@/ui/Screen'
import { toast } from '@/ui/Toast'

// Laporan selalu punya rentang, jadi tanpa preset "Semua".
const REPORT_PRESETS = DATE_PRESETS.filter((p) => p.id !== 'all')

const compact = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt` : n >= 1000 ? `${Math.round(n / 1000)} rb` : String(Math.round(n)))

/** Batang horizontal dengan angka di ujung, agar nilai terbaca tanpa bergantung pada panjang batang. */
function Bars({ data, format, empty }: { data: Datum[]; format: (n: number) => string; empty: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  if (data.every((d) => d.value === 0)) return <Text style={styles.empty}>{empty}</Text>
  return (
    <View style={{ gap: space(2.5) }}>
      {data.map((d) => (
        <View key={d.label} style={styles.bar} accessibilityLabel={`${d.label}: ${format(d.value)}${d.hint ? `, ${d.hint}` : ''}`}>
          <Text style={styles.barLabel} numberOfLines={1}>
            {d.label}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${(d.value / max) * 100}%`, minWidth: d.value ? 6 : 0 }]} />
          </View>
          <Text style={styles.barValue}>{format(d.value)}</Text>
        </View>
      ))}
    </View>
  )
}

/** Laporan outlet aktif untuk Owner: nilai order, harian, per layanan, per kanal, tahap, dan pelanggan. */
export function ReportScreen() {
  const now = useNow()
  const outlet = useActiveOutlet()
  const orders = useDemo((s) => s.orders)
  const services = useDemo((s) => s.services)
  const [dates, setDates] = useState(() => initialDateFilter('7d', new Date()))
  const report = useMemo(() => {
    const range = dateFilterRange(dates, now)
    return range ? buildReport({ orders, services }, { range, outletId: outlet.id, now }) : null
  }, [orders, services, dates, outlet.id, now])

  return (
    <Screen title="Laporan" subtitle={`${outlet.name.replace('Laundry Bersih Kilat ', 'Outlet ')} · nilai order tanpa yang batal`}>
      <DateFilter value={dates} onChange={setDates} presets={REPORT_PRESETS} now={now} />

      {report && (
        <>
          <View style={[styles.grid, { marginTop: space(4) }]}>
            <KpiTile label="Nilai order" value={formatRupiah(report.total)} hint={`${report.count} order`} icon={Wallet} accent={tone.done.fg} />
            <KpiTile label="Rata-rata/order" value={formatRupiah(report.average)} icon={Receipt} />
          </View>
          <View style={[styles.grid, { marginTop: space(3) }]}>
            <KpiTile label="Belum dibayar" value={formatRupiah(report.unpaid)} hint="dari order di rentang ini" icon={HandCoins} accent={tone.qc.fg} />
            <KpiTile label="Pelanggan aktif" value={String(report.active)} hint={`${report.newCustomers} baru · ${report.repeat} berulang`} icon={Users} accent={color.brandViolet} />
          </View>

          <SectionTitle title="Nilai order harian" />
          <Card>
            <Bars data={report.days} format={compact} empty="Belum ada order di rentang ini." />
          </Card>

          <SectionTitle title="Per layanan" />
          <Card>
            <Bars data={report.byService} format={compact} empty="Belum ada layanan terjual." />
          </Card>

          <SectionTitle title="Per kanal" />
          <Card>
            <Bars data={report.byChannel} format={compact} empty="Belum ada order." />
          </Card>

          <SectionTitle title="Produktivitas tahap" />
          <Card>
            <Bars data={report.byStage} format={(n) => `${n}`} empty="Belum ada pergerakan produksi." />
          </Card>
        </>
      )}

      <Card style={{ gap: space(2), marginTop: space(4) }}>
        <Text style={styles.muted}>Ekspor CSV dan laporan semua outlet ada di dashboard web.</Text>
        <Button
          title="Buka laporan di web"
          icon={ExternalLink}
          variant="secondary"
          onPress={() => Linking.openURL(`${WEB_DASHBOARD_URL}/laporan`).catch(() => toast('Browser tidak bisa dibuka di perangkat ini.', 'error'))}
        />
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: space(3) },
  bar: { flexDirection: 'row', alignItems: 'center', gap: space(2.5) },
  barLabel: { width: 92, fontFamily: font.regular, fontSize: 13, color: color.muted },
  track: { flex: 1, height: 10, borderRadius: radius.full, backgroundColor: color.surface2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full, backgroundColor: color.primary },
  barValue: { minWidth: 48, textAlign: 'right', fontFamily: font.semibold, fontSize: 13, color: color.fg },
  empty: { paddingVertical: space(3), textAlign: 'center', fontFamily: font.regular, fontSize: 14, color: color.subtle },
  muted: { fontFamily: font.regular, fontSize: 13, color: color.muted },
})
