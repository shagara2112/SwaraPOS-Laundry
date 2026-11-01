import { nextStatuses, requiresReason, STATUS_LABEL } from '@swarapos/core/domain/order-status'
import { can, type Role } from '@swarapos/core/permissions'
import { formatRupiah } from '@swarapos/core/format'
import { amountDue, resumeTarget } from '@swarapos/core/selectors'
import { transitionOrder } from '@swarapos/core/store/actions-order'
import type { Actor, Order, OrderStatus } from '@swarapos/core/types'
import { router } from 'expo-router'
import { Ban, CirclePause, HandCoins, PackageCheck, TriangleAlert, Truck, type LucideIcon } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { act } from '@/store/act'
import { color, font, radius, space } from '@/theme'
import { Button } from '@/ui/Button'
import { ReasonSheet, Sheet } from '@/ui/Sheet'
import { TextField } from '@/ui/TextField'
import { PaymentSheet } from './PaymentSheet'

const EXCEPTION_META: Partial<Record<OrderStatus, { label: string; title: string; icon: LucideIcon; placeholder: string }>> = {
  ON_HOLD: { label: 'Tahan', title: 'Tahan order', icon: CirclePause, placeholder: 'Contoh: menunggu konfirmasi pelanggan soal noda' },
  ISSUE_REPORTED: { label: 'Laporkan kendala', title: 'Laporkan kendala', icon: TriangleAlert, placeholder: 'Contoh: kancing lepas saat dicuci' },
  CANCELLED: { label: 'Batalkan', title: 'Batalkan order', icon: Ban, placeholder: 'Contoh: pelanggan membatalkan' },
}

// Jemput dan serah-terima wajib lewat tugas kurir (dengan bukti), bukan tombol di detail order.
const COURIER_STATUSES: OrderStatus[] = ['PICKUP_ASSIGNED', 'PICKED_UP', 'DELIVERED']

function forwardLabel(order: Order, to: OrderStatus): string {
  if (order.status === 'ON_HOLD' || order.status === 'ISSUE_REPORTED') return `Lanjutkan: ${STATUS_LABEL[to]}`
  if (order.status === 'READY_FOR_PICKUP' && to === 'COMPLETED') return 'Diambil pelanggan'
  return `Ubah ke ${STATUS_LABEL[to]}`
}

/** Tombol transisi sesuai mesin status dan hak peran. Di tahap QC, keputusan lewat checklist QC. */
export function StatusActions({ order, role, actor, size = 'lg' }: { order: Order; role: Role; actor: Actor; size?: 'lg' | 'xl' }) {
  const [reasonFor, setReasonFor] = useState<OrderStatus | null>(null)
  const [handover, setHandover] = useState(false)
  const next = nextStatuses(order.status, resumeTarget(order))
  let forward = can(role, 'order.transition') ? next.filter((s) => !requiresReason(s)) : []
  const viaCourier = forward.filter((s) => COURIER_STATUSES.includes(s))
  forward = forward.filter((s) => !COURIER_STATUSES.includes(s))
  if (order.status === 'QUALITY_CHECK') forward = []
  if (order.status === 'READY_FOR_PICKUP' && order.handback === 'SELF_PICKUP') forward = [...forward].reverse()
  const exceptions = next.filter((s) => requiresReason(s) && can(role, s === 'CANCELLED' ? 'order.cancel' : 'order.hold'))

  const go = (to: OrderStatus, reason?: string) => act((s) => transitionOrder(s, order.id, to, { reason }, actor, new Date()), `Status: ${STATUS_LABEL[to]}`)
  const meta = reasonFor ? EXCEPTION_META[reasonFor] : undefined

  if (forward.length === 0 && viaCourier.length === 0 && exceptions.length === 0) return null

  return (
    <View style={styles.wrap}>
      {forward.map((to, i) => (
        <Button
          key={to}
          title={forwardLabel(order, to)}
          variant={i === 0 ? 'primary' : 'secondary'}
          size={size}
          // Cucian belum lunas: cek tagihan dulu sebelum diserahkan.
          onPress={() => (to === 'COMPLETED' && amountDue(order) > 0 ? setHandover(true) : go(to))}
        />
      ))}
      {viaCourier.length > 0 &&
        (role === 'OWNER' ? (
          <Button title={`${STATUS_LABEL[viaCourier[0]]} lewat tugas kurir`} icon={Truck} variant={forward.length === 0 ? 'primary' : 'secondary'} size={size} onPress={() => router.push('/owner/antar')} />
        ) : (
          <View style={styles.note}>
            <Truck size={18} color={color.muted} />
            <Text style={styles.noteText}>{STATUS_LABEL[viaCourier[0]]} lewat tugas kurir</Text>
          </View>
        ))}
      {exceptions.length > 0 && (
        <View style={styles.exceptions}>
          {exceptions.map((to) => {
            const m = EXCEPTION_META[to]!
            return <Button key={to} title={m.label} icon={m.icon} variant="ghost" onPress={() => setReasonFor(to)} style={styles.exception} />
          })}
        </View>
      )}
      {handover && (
        <HandoverSheet
          order={order}
          actor={actor}
          canCredit={can(role, 'order.credit')}
          onClose={() => setHandover(false)}
          onComplete={(reason) => {
            if (go('COMPLETED', reason).ok) setHandover(false)
          }}
        />
      )}
      <ReasonSheet
        visible={!!meta}
        title={meta?.title ?? ''}
        description={`${order.orderNo} · alasan tercatat di riwayat order dan audit log.`}
        placeholder={meta?.placeholder}
        confirmLabel={meta?.label ?? 'Simpan'}
        onClose={() => setReasonFor(null)}
        onConfirm={(reason) => {
          if (reasonFor && go(reasonFor, reason).ok) setReasonFor(null)
        }}
      />
    </View>
  )
}

/** Serah-terima cucian yang belum lunas: catat bayar dulu, atau serahkan sebagai piutang dengan alasan. */
function HandoverSheet({ order, actor, canCredit, onClose, onComplete }: { order: Order; actor: Actor; canCredit: boolean; onClose: () => void; onComplete: (reason?: string) => void }) {
  const [paying, setPaying] = useState(false)
  const [credit, setCredit] = useState(false)
  const [reason, setReason] = useState('')
  const due = amountDue(order)
  if (paying) return <PaymentSheet order={order} actor={actor} onClose={() => setPaying(false)} />
  return (
    <Sheet
      visible
      onClose={onClose}
      title={due > 0 ? 'Masih ada sisa tagihan' : 'Tagihan sudah lunas'}
      description={`${order.orderNo} · cek pembayaran sebelum cucian diserahkan`}
      footer={
        due <= 0 ? (
          <Button title="Serahkan ke pelanggan" icon={PackageCheck} size="lg" onPress={() => onComplete()} />
        ) : credit ? (
          <Button title="Serahkan sebagai piutang" size="lg" disabled={!reason.trim()} onPress={() => onComplete(reason)} />
        ) : (
          <>
            <Button title="Catat bayar dulu" icon={HandCoins} size="lg" onPress={() => setPaying(true)} />
            {canCredit && <Button title="Serahkan sebagai piutang" variant="secondary" size="lg" onPress={() => setCredit(true)} />}
          </>
        )
      }
    >
      <View style={styles.due}>
        <Text style={styles.dueLabel}>Sisa tagihan</Text>
        <Text style={[styles.dueValue, due > 0 && { color: color.danger }]}>{formatRupiah(due)}</Text>
      </View>
      {credit && <TextField label="Alasan piutang" required value={reason} onChangeText={setReason} placeholder="Contoh: pelanggan langganan, bayar akhir bulan" hint="Tercatat di riwayat order dan audit log." multiline />}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  due: { alignItems: 'center', gap: space(1), padding: space(4), borderRadius: radius.md, backgroundColor: color.surface2 },
  dueLabel: { fontFamily: font.regular, fontSize: 13, color: color.subtle },
  dueValue: { fontFamily: font.extrabold, fontSize: 26, color: color.fg },
  wrap: { gap: space(2.5) },
  note: { flexDirection: 'row', alignItems: 'center', gap: space(2), minHeight: 44, paddingHorizontal: space(3), borderRadius: radius.md, backgroundColor: color.surface2 },
  noteText: { flex: 1, fontFamily: font.medium, fontSize: 14, color: color.muted },
  exceptions: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  exception: { flexGrow: 1 },
})
