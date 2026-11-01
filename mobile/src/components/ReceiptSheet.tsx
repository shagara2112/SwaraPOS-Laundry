import { formatRupiah } from '@swarapos/core/format'
import { buildReceipt, receiptHtml, type Receipt } from '@swarapos/core/receipt'
import type { Customer, Order, Outlet, ReceiptPaper } from '@swarapos/core/types'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { Printer, Share2 } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { TRACKING_ORIGIN } from '@/lib/config'
import { useDemo } from '@/store/demo-store'
import { color, font, radius, space } from '@/theme'
import { Button } from '@/ui/Button'
import { Row } from '@/ui/misc'
import { Sheet } from '@/ui/Sheet'
import { toast } from '@/ui/Toast'

const MM_TO_PT = 72 / 25.4

/** Ukuran halaman PDF (pt): lebar kertas, tinggi kira-kira panjang struk agar tidak ada sisa halaman A4. */
function pdfSize(r: Receipt, paper: ReceiptPaper) {
  const rows = 28 + r.lines.length * 2 + r.fees.length + Math.max(1, r.payments.length) + (r.express ? 1 : 0)
  return { width: Math.round(paper * MM_TO_PT), height: Math.round(rows * 16 + (paper === 58 ? 160 : 140)) }
}

/** Lembar nota: cetak lewat dialog cetak Android (ada pratinjaunya) atau bagikan sebagai PDF. */
export function ReceiptSheet({ visible, onClose, order, outlet, customer }: { visible: boolean; onClose: () => void; order: Order; outlet: Outlet; customer: Customer }) {
  const businessName = useDemo((s) => s.tenant.name)
  const paper = outlet.receiptPaper ?? 58
  const receipt = useMemo(() => buildReceipt({ order, outlet, customer, businessName, trackingOrigin: TRACKING_ORIGIN }), [order, outlet, customer, businessName])
  const html = useMemo(() => receiptHtml(receipt, paper), [receipt, paper])
  const [busy, setBusy] = useState<'print' | 'share' | null>(null)

  const print = async () => {
    setBusy('print')
    try {
      await Print.printAsync({ html })
    } catch {
      // Batal di dialog cetak juga berakhir di sini; dialog sistem sudah menampilkan kesalahan cetak sendiri.
    } finally {
      setBusy(null)
    }
  }

  const share = async () => {
    setBusy('share')
    try {
      if (!(await Sharing.isAvailableAsync())) {
        toast('Berbagi file tidak tersedia di perangkat ini.', 'error')
        return
      }
      const { uri } = await Print.printToFileAsync({ html, ...pdfSize(receipt, paper) })
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Nota ${order.orderNo}`, UTI: 'com.adobe.pdf' })
    } catch {
      toast('Nota gagal dibagikan. Coba lagi.', 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Nota order" description={`${order.orderNo} · kertas ${paper} mm`}>
      <View style={styles.summary}>
        <Row label="Pelanggan" value={customer.name} />
        <Row label="Total" value={formatRupiah(receipt.total)} />
        <Row label="Sudah dibayar" value={formatRupiah(receipt.paid)} />
        <Row label="Sisa tagihan" value={formatRupiah(receipt.due)} strong />
      </View>
      <Button title="Cetak nota" icon={Printer} size="lg" loading={busy === 'print'} disabled={!!busy} onPress={print} />
      <Button title="Bagikan PDF" icon={Share2} variant="secondary" size="lg" loading={busy === 'share'} disabled={!!busy} onPress={share} />
      <Text style={styles.hint}>
        Dialog cetak Android menampilkan pratinjau nota. Printer thermal Bluetooth biasanya bisa dipakai lewat aplikasi driver seperti RawBT. Ukuran kertas diatur Owner di tab Akun.
      </Text>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  summary: { gap: space(1.5), padding: space(3), borderRadius: radius.md, backgroundColor: color.surface2 },
  hint: { fontFamily: font.regular, fontSize: 12, color: color.subtle },
})
