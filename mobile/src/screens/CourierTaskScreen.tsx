import { buildWaUrl, normalizePhoneID } from '@swarapos/core/domain/whatsapp'
import { formatDateTime, formatRupiah } from '@swarapos/core/format'
import { DELIVERY_STATUS, formatQty } from '@swarapos/core/labels'
import { can } from '@swarapos/core/permissions'
import { amountDue } from '@swarapos/core/selectors'
import { updateDeliveryTask } from '@swarapos/core/store/actions-catalog'
import type { DeliveryTaskStatus } from '@swarapos/core/types'
import { Redirect, useLocalSearchParams } from 'expo-router'
import { CalendarClock, CircleCheck, HandCoins, MapPin, MessageCircle, Navigation, Phone, SearchX, XCircle } from 'lucide-react-native'
import { useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'
import { PaymentSheet } from '@/components/PaymentSheet'
import { ProofCamera } from '@/components/ProofCamera'
import { SignaturePad } from '@/components/SignaturePad'
import { TASK_TYPE_LABEL } from '@/components/TaskCard'
import { act } from '@/store/act'
import { useDemo } from '@/store/demo-store'
import { useActiveOutlet, useActor } from '@/store/hooks'
import { useSession } from '@/store/session-store'
import { color, font, radius, space } from '@/theme'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Card, SectionTitle } from '@/ui/Card'
import { EmptyState, Row } from '@/ui/misc'
import { Screen } from '@/ui/Screen'
import { ReasonSheet, Sheet } from '@/ui/Sheet'
import { TextField } from '@/ui/TextField'
import { toast } from '@/ui/Toast'

const NEXT_STEP: Partial<Record<DeliveryTaskStatus, { to: DeliveryTaskStatus; label: string }>> = {
  ASSIGNED: { to: 'ACCEPTED', label: 'Terima tugas' },
  ACCEPTED: { to: 'ON_THE_WAY', label: 'Berangkat' },
  ON_THE_WAY: { to: 'ARRIVED', label: 'Tiba di lokasi' },
}

async function openUrl(url: string) {
  try {
    await Linking.openURL(url)
  } catch {
    toast('Aplikasi untuk membuka tautan ini tidak tersedia.', 'error')
  }
}

/** Detail tugas kurir: kontak, tahap perjalanan, bukti serah-terima, gagal, dan COD. */
export function CourierTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const role = useSession((s) => s.role)
  const actor = useActor()
  const outlet = useActiveOutlet()
  const task = useDemo((s) => s.deliveryTasks.find((t) => t.id === id))
  const order = useDemo((s) => s.orders.find((o) => o.id === task?.orderId))
  const customer = useDemo((s) => s.customers.find((c) => c.id === order?.customerId))
  const [proofOpen, setProofOpen] = useState(false)
  const [failOpen, setFailOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  if (!role) return <Redirect href="/masuk" />
  if (!task || !order || !customer) {
    return (
      <Screen title="Tugas" back>
        <EmptyState icon={SearchX} title="Tugas tidak ditemukan" />
      </Screen>
    )
  }

  const canUpdate = can(role, 'delivery.update') && (role !== 'COURIER' || task.courierId === actor.id)
  const st = DELIVERY_STATUS[task.status]
  const next = NEXT_STEP[task.status]
  const due = amountDue(order)
  const active = task.status !== 'DONE' && task.status !== 'FAILED'
  const query = customer.location ? `${customer.location.lat},${customer.location.lng}` : task.address
  const waUrl = buildWaUrl(
    customer.phone,
    `Halo ${customer.name}, saya ${actor.name}, kurir ${outlet.name}. Saya sedang menuju untuk ${task.type === 'PICKUP' ? 'menjemput' : 'mengantar'} cucian ${order.orderNo}.`,
  )
  const phone = normalizePhoneID(customer.phone)

  const step = (to: DeliveryTaskStatus, label: string) => act((s) => updateDeliveryTask(s, task.id, to, {}, actor, new Date()), label)

  return (
    <Screen title={`${TASK_TYPE_LABEL[task.type]} · ${order.orderNo}`} subtitle={customer.name} back>
      <Card style={{ gap: space(3) }}>
        <View style={styles.top}>
          <Text style={styles.name}>{customer.name}</Text>
          <Badge tone={st.tone} label={st.label} />
        </View>
        <View style={styles.meta}>
          <MapPin size={16} color={color.subtle} />
          <Text style={styles.metaText}>{task.address}</Text>
        </View>
        <View style={styles.meta}>
          <CalendarClock size={16} color={color.subtle} />
          <Text style={styles.metaText}>
            {formatDateTime(task.scheduledAt)} · {task.distanceKm.toLocaleString('id-ID')} km · ongkos {formatRupiah(task.fee)}
          </Text>
        </View>
        <Button title="Buka Maps" icon={Navigation} size="lg" onPress={() => openUrl(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`)} />
        <View style={styles.contact}>
          <Button title="Telepon" icon={Phone} variant="secondary" disabled={!phone} onPress={() => openUrl(`tel:+${phone}`)} style={{ flex: 1 }} />
          <Button title="WhatsApp" icon={MessageCircle} variant="whatsapp" disabled={!waUrl} onPress={() => waUrl && openUrl(waUrl)} style={{ flex: 1 }} />
        </View>
        {!phone && <Text style={styles.warn}>Nomor pelanggan tidak valid; hubungi outlet.</Text>}
      </Card>

      {canUpdate && active && (
        <View style={{ gap: space(2.5), marginTop: space(4) }}>
          {next && <Button title={next.label} size="xl" onPress={() => step(next.to, next.label)} />}
          {task.status === 'ARRIVED' && <Button title={task.type === 'PICKUP' ? 'Sudah dijemput + bukti' : 'Sudah diterima + bukti'} icon={CircleCheck} size="xl" onPress={() => setProofOpen(true)} />}
          {(task.status === 'ON_THE_WAY' || task.status === 'ARRIVED') && <Button title="Gagal" icon={XCircle} variant="ghost" onPress={() => setFailOpen(true)} />}
        </View>
      )}

      <SectionTitle title="Cucian & tagihan" />
      <Card style={{ gap: space(2) }}>
        {order.items.map((i) => (
          <Row key={i.id} label={`${i.name} · ${formatQty(i.unit, i.qty)}`} value={formatRupiah(i.total)} />
        ))}
        <Row label="Total" value={formatRupiah(order.totals.total)} strong />
        <Row label="Sisa tagihan" value={formatRupiah(due)} strong />
        {task.type === 'DELIVERY' && due > 0 && order.status !== 'CANCELLED' && can(role, 'order.payment') && (
          <Button title="Catat bayar di tempat (COD)" icon={HandCoins} variant="secondary" onPress={() => setPayOpen(true)} style={{ marginTop: space(1) }} />
        )}
      </Card>

      {task.proof && (
        <>
          <SectionTitle title="Bukti serah-terima" />
          <Card>
            <Text style={styles.metaText}>
              Diterima {task.proof.receiverName} · {task.proof.method === 'PHOTO' ? 'foto' : 'tanda tangan'} · {formatDateTime(task.proof.at)}
            </Text>
          </Card>
        </>
      )}
      {task.failReason && task.status === 'FAILED' && (
        <>
          <SectionTitle title="Gagal" />
          <Card>
            <Text style={styles.warn}>{task.failReason}</Text>
          </Card>
        </>
      )}

      {proofOpen && <ProofSheet taskType={task.type} due={task.type === 'DELIVERY' ? due : 0} onClose={() => setProofOpen(false)} onConfirm={(proof) => act((s) => updateDeliveryTask(s, task.id, 'DONE', { proof }, actor, new Date()), 'Serah-terima tercatat').ok} />}
      <ReasonSheet
        visible={failOpen}
        title={task.type === 'PICKUP' ? 'Jemput gagal' : 'Antar gagal'}
        description="Tugas kembali ke outlet untuk dijadwalkan ulang."
        placeholder="Contoh: rumah kosong, pelanggan minta besok pagi"
        confirmLabel="Tandai gagal"
        onClose={() => setFailOpen(false)}
        onConfirm={(reason) => {
          if (act((s) => updateDeliveryTask(s, task.id, 'FAILED', { failReason: reason }, actor, new Date()), 'Tugas ditandai gagal').ok) setFailOpen(false)
        }}
      />
      {payOpen && <PaymentSheet order={order} actor={actor} methods={['COD']} onClose={() => setPayOpen(false)} />}
    </Screen>
  )
}

/** Bukti serah-terima: nama penerima wajib, plus foto atau tanda tangan. */
function ProofSheet({ taskType, due, onClose, onConfirm }: { taskType: 'PICKUP' | 'DELIVERY'; due: number; onClose: () => void; onConfirm: (proof: { receiverName: string; method: 'PHOTO' | 'SIGNATURE' }) => boolean }) {
  const [receiver, setReceiver] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [signed, setSigned] = useState(false)
  const missing = [!receiver.trim() && 'nama penerima', !photo && !signed && 'foto atau tanda tangan'].filter(Boolean)

  return (
    <Sheet
      visible
      onClose={onClose}
      title={taskType === 'PICKUP' ? 'Bukti jemput' : 'Bukti antar'}
      description="Nama penerima wajib, ditambah foto atau tanda tangan."
      footer={
        <>
          {missing.length > 0 && <Text style={styles.missing}>Lengkapi {missing.join(' dan ')}.</Text>}
          <Button
            title="Simpan bukti"
            size="lg"
            disabled={missing.length > 0}
            onPress={() => {
              if (onConfirm({ receiverName: receiver, method: photo ? 'PHOTO' : 'SIGNATURE' })) onClose()
            }}
          />
        </>
      }
    >
      {due > 0 && <Text style={styles.warn}>Sisa tagihan {formatRupiah(due)}. Bila pelanggan membayar, catat COD dulu sebelum menyimpan bukti.</Text>}
      <TextField label={taskType === 'PICKUP' ? 'Diserahkan oleh' : 'Diterima oleh'} required value={receiver} onChangeText={setReceiver} placeholder="Nama orang yang menyerahkan/menerima" autoCapitalize="words" />
      <View style={{ gap: space(2) }}>
        <Text style={styles.label}>Foto</Text>
        <ProofCamera uri={photo} onChange={setPhoto} />
      </View>
      <View style={{ gap: space(2) }}>
        <Text style={styles.label}>Tanda tangan</Text>
        <SignaturePad onChange={setSigned} />
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space(2) },
  name: { flex: 1, fontFamily: font.bold, fontSize: 17, color: color.fg },
  meta: { flexDirection: 'row', alignItems: 'flex-start', gap: space(2) },
  metaText: { flex: 1, fontFamily: font.regular, fontSize: 14, color: color.muted },
  contact: { flexDirection: 'row', gap: space(2.5) },
  warn: { fontFamily: font.medium, fontSize: 13, color: color.danger },
  label: { fontFamily: font.semibold, fontSize: 14, color: color.fg },
  missing: { fontFamily: font.medium, fontSize: 12, color: color.muted, borderRadius: radius.sm },
})
