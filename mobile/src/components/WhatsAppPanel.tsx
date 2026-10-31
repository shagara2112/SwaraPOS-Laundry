import { useNetInfo } from '@react-native-community/netinfo'
import { buildWaMessage, buildWaUrl, WA_EVENT_LABEL } from '@swarapos/core/domain/whatsapp'
import { formatDateTime } from '@swarapos/core/format'
import { WA_STATE } from '@swarapos/core/labels'
import { amountDue, trackingUrl } from '@swarapos/core/selectors'
import { markWhatsApp } from '@swarapos/core/store/actions-order'
import type { Actor, Customer, Order, Outlet } from '@swarapos/core/types'
import { Check, MessageCircle } from 'lucide-react-native'
import { Linking, StyleSheet, Text, View } from 'react-native'
import { TRACKING_ORIGIN } from '@/lib/config'
import { act } from '@/store/act'
import { color, font, radius, space } from '@/theme'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Card } from '@/ui/Card'
import { toast } from '@/ui/Toast'

/**
 * Notifikasi WhatsApp manual (PRD §F): tombol membuka WhatsApp dengan pesan terisi,
 * staf menekan kirim di WhatsApp, lalu menandai terkirim di sini.
 */
export function WhatsAppPanel({ order, customer, outlet, actor }: { order: Order; customer: Customer; outlet: Outlet; actor: Actor }) {
  const { isConnected } = useNetInfo()
  const online = isConnected !== false
  const logs = [...order.whatsapp].reverse()
  const invalidPhone = buildWaUrl(customer.phone, 'x') === null

  const open = async (log: Order['whatsapp'][number]) => {
    const url = buildWaUrl(
      customer.phone,
      buildWaMessage(log.event, {
        customerName: customer.name,
        orderNo: order.orderNo,
        outletName: outlet.name,
        trackingUrl: trackingUrl(order.trackingToken, TRACKING_ORIGIN),
        amountDue: amountDue(order),
        handback: order.handback,
      }),
    )
    if (!url) return
    try {
      await Linking.openURL(url)
      act((s) => markWhatsApp(s, order.id, log.id, 'OPENED', actor, new Date()))
    } catch {
      toast('WhatsApp tidak bisa dibuka di perangkat ini.', 'error')
    }
  }

  return (
    <Card style={{ gap: space(3) }}>
      <View>
        <Text style={styles.title}>Notifikasi WhatsApp</Text>
        <Text style={styles.sub}>Ke {customer.phone}</Text>
      </View>
      {invalidPhone && (
        <Text style={styles.alert} accessibilityRole="alert">
          Nomor WhatsApp pelanggan tidak valid. Perbarui nomor di data pelanggan untuk mengirim notifikasi.
        </Text>
      )}
      {logs.length === 0 && <Text style={styles.sub}>Belum ada notifikasi untuk status ini.</Text>}
      {logs.map((log) => {
        const state = WA_STATE[log.state]
        return (
          <View key={log.id} style={styles.log}>
            <View style={styles.logHead}>
              <Text style={styles.event}>{WA_EVENT_LABEL[log.event]}</Text>
              <Badge tone={state.tone} label={state.label} />
            </View>
            {log.updatedAt && (
              <Text style={styles.sub}>
                {formatDateTime(log.updatedAt)}
                {log.actor && ` · ${log.actor.name}`}
              </Text>
            )}
            {log.state !== 'SENT' && (
              <View style={{ gap: space(2), marginTop: space(1) }}>
                <Button title="Kirim WhatsApp" icon={MessageCircle} variant="whatsapp" disabled={invalidPhone || !online} onPress={() => open(log)} />
                {log.state === 'OPENED' && (
                  <Button
                    title="Tandai terkirim"
                    icon={Check}
                    variant="secondary"
                    onPress={() => act((s) => markWhatsApp(s, order.id, log.id, 'SENT', actor, new Date()), 'Ditandai terkirim')}
                  />
                )}
              </View>
            )}
          </View>
        )
      })}
      {!online && <Text style={styles.sub}>Kirim WhatsApp menunggu koneksi agar link lacak menunjuk data yang sudah tersinkron.</Text>}
    </Card>
  )
}

const styles = StyleSheet.create({
  title: { fontFamily: font.bold, fontSize: 16, color: color.fg },
  sub: { fontFamily: font.regular, fontSize: 12, color: color.subtle, marginTop: 2 },
  alert: { fontFamily: font.medium, fontSize: 13, color: color.danger, backgroundColor: color.dangerSoft, borderRadius: radius.md, padding: space(3) },
  log: { borderWidth: 1, borderColor: color.border, borderRadius: radius.md, padding: space(3) },
  logHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space(2) },
  event: { flex: 1, fontFamily: font.semibold, fontSize: 14, color: color.fg },
})
