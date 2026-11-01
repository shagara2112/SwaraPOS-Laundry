import { formatDateTime } from '@swarapos/core/format'
import { formatQty } from '@swarapos/core/labels'
import { trackingUrl } from '@swarapos/core/selectors'
import type { Customer, Order, Outlet } from '@swarapos/core/types'
import { StyleSheet, Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { TRACKING_ORIGIN } from '@/lib/config'
import { color, font, radius, space } from '@/theme'
import { Sheet } from '@/ui/Sheet'

/** Label order (format thermal 58 mm). QR hanya berisi URL lacak opaque, tanpa data pribadi. */
export function LabelSheet({ visible, onClose, order, outlet, customer, justCreated }: { visible: boolean; onClose: () => void; order: Order; outlet: Outlet; customer: Customer; justCreated?: boolean }) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={justCreated ? 'Order tersimpan' : 'Label order'}
      description={justCreated ? 'Cetak label dan tempel pada kantong cucian.' : 'Tempel label pada kantong cucian.'}
    >
      <View style={styles.label} accessibilityLabel={`Label ${order.orderNo}`}>
        <Text style={styles.outlet}>{outlet.name}</Text>
        <Text style={styles.no}>{order.orderNo}</Text>
        <View style={styles.qr}>
          <QRCode value={trackingUrl(order.trackingToken, TRACKING_ORIGIN)} size={140} ecl="M" quietZone={4} />
        </View>
        <Text style={styles.customer}>{customer.name}</Text>
        <View style={styles.meta}>
          <Text style={styles.line}>Masuk: {formatDateTime(order.createdAt)}</Text>
          <Text style={[styles.line, { fontFamily: font.bold }]}>Estimasi: {formatDateTime(order.dueAt)}</Text>
          {order.pieceCount ? <Text style={[styles.line, { fontFamily: font.bold }]}>Jumlah: {order.pieceCount} pcs</Text> : null}
          {order.items.map((i) => (
            <Text key={i.id} style={styles.line}>
              {i.name} — {formatQty(i.unit, i.qty)}
            </Text>
          ))}
          {order.express && <Text style={styles.express}>EXPRESS</Text>}
        </View>
      </View>
      <Text style={styles.hint}>Cetak ke printer thermal Bluetooth tersedia di versi produksi.</Text>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  label: { alignSelf: 'center', width: 240, borderWidth: 1, borderStyle: 'dashed', borderColor: color.borderStrong, borderRadius: radius.sm, backgroundColor: '#FFFFFF', padding: space(3) },
  outlet: { textAlign: 'center', fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', color: '#000' },
  no: { marginTop: space(1), textAlign: 'center', fontFamily: font.monoBold, fontSize: 16, color: '#000' },
  qr: { marginTop: space(2), alignItems: 'center' },
  customer: { marginTop: space(2), textAlign: 'center', fontFamily: font.semibold, fontSize: 14, color: '#000' },
  meta: { marginTop: space(2), paddingTop: space(2), borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: 'rgba(0,0,0,0.4)', gap: 2 },
  line: { fontFamily: font.regular, fontSize: 10, color: '#000' },
  express: { alignSelf: 'flex-start', marginTop: space(1), paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#000', color: '#FFF', fontFamily: font.bold, fontSize: 10 },
  hint: { textAlign: 'center', fontFamily: font.regular, fontSize: 12, color: color.subtle },
})
