import AsyncStorage from '@react-native-async-storage/async-storage'
import { emptyDraft, orderInputFromDraft, summarizeDraft, type OrderDraft } from '@swarapos/core/cashier'
import { formatDateTime, formatRupiah } from '@swarapos/core/format'
import { addCustomer } from '@swarapos/core/store/actions-catalog'
import { createOrder } from '@swarapos/core/store/actions-order'
import { parseStoredJson } from '@swarapos/core/store/state'
import type { HandbackType, IntakeType } from '@swarapos/core/types'
import { router } from 'expo-router'
import { Camera, Check, Eraser, MapPin, TriangleAlert } from 'lucide-react-native'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { CustomerPicker, type NewCustomerInput } from '@/components/CustomerPicker'
import { OrderSummaryBar } from '@/components/OrderSummaryBar'
import { ServicePicker } from '@/components/ServicePicker'
import { useNow } from '@/lib/use-now'
import { act } from '@/store/act'
import { useDemo } from '@/store/demo-store'
import { useActiveOutlet, useActor } from '@/store/hooks'
import { color, font, radius, space, tone } from '@/theme'
import { Button } from '@/ui/Button'
import { Card } from '@/ui/Card'
import { Row, Segmented } from '@/ui/misc'
import { Screen } from '@/ui/Screen'
import { TextField } from '@/ui/TextField'

const DRAFT_KEY = 'swarapos-kasir-draft'
const CONDITIONS = ['Noda', 'Luntur', 'Bahan sensitif', 'Kancing/resleting rusak', 'Item kurang', 'Berbau']

async function readDraft(): Promise<OrderDraft> {
  try {
    const stored = parseStoredJson(await AsyncStorage.getItem(DRAFT_KEY))
    return stored && typeof stored === 'object' ? { ...emptyDraft(), ...(stored as Partial<OrderDraft>) } : emptyDraft()
  } catch {
    // Draf rusak atau penyimpanan gagal dibaca: mulai dari kosong.
    return emptyDraft()
  }
}

function Section({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <Card style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.step}>
          <Text style={styles.stepText}>{step}</Text>
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </Card>
  )
}

export function NewOrderScreen() {
  const [draft, setDraft] = useState<OrderDraft | null>(null)

  // Draf lokal (PRD: layar operasional tetap usable saat koneksi tidak stabil).
  useEffect(() => {
    let alive = true
    readDraft().then((d) => alive && setDraft(d))
    return () => {
      alive = false
    }
  }, [])

  if (!draft) {
    return (
      <Screen title="Order baru">
        <ActivityIndicator color={color.primary} style={{ marginTop: space(10) }} />
      </Screen>
    )
  }
  return <NewOrderForm draft={draft} setDraft={setDraft} />
}

function NewOrderForm({ draft, setDraft }: { draft: OrderDraft; setDraft: (fn: (d: OrderDraft | null) => OrderDraft) => void }) {
  const now = useNow()
  const outlet = useActiveOutlet()
  const actor = useActor()
  const customers = useDemo((s) => s.customers)
  const services = useDemo((s) => s.services)
  const zones = useDemo((s) => s.zones)
  const expressPct = useDemo((s) => s.tenant.expressSurchargePct)
  const [confirmed, setConfirmed] = useState(false)
  const [manualFee, setManualFee] = useState('')
  const savingRef = useRef(false)
  const update = (patch: Partial<OrderDraft>) => setDraft((d) => ({ ...(d ?? emptyDraft()), ...patch }))

  useEffect(() => {
    AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft)).catch(() => {
      // Draf hanya kenyamanan; gagal simpan tidak menghentikan kasir.
    })
  }, [draft])

  const customer = customers.find((c) => c.id === draft.customerId)
  const summary = summarizeDraft({ draft, customer, outlet, services, zones, expressPct, outsideZone: { confirmed, feeText: manualFee }, now })
  const { quote, legs, needsLogistics, totals, dueAt, blockers, summaryLines } = summary

  const reset = () => {
    setDraft(() => emptyDraft())
    setConfirmed(false)
    setManualFee('')
  }

  const save = () => {
    // Penahan ketukan ganda; kunci draf di createOrder tetap menjaga idempotensi bila handler kedua sempat jalan.
    if (blockers.length > 0 || !customer || savingRef.current) return
    savingRef.current = true
    const result = act((s) => createOrder(s, orderInputFromDraft(draft, summary, outlet.id), actor, new Date()), 'Order tersimpan')
    if (result.ok) {
      AsyncStorage.removeItem(DRAFT_KEY).catch(() => {})
      reset()
      router.replace(`/order/${result.value.id}?baru=1`)
    }
    savingRef.current = false
  }

  const createCustomer = (input: NewCustomerInput): boolean => {
    const r = act((s) => addCustomer(s, { name: input.name, phone: input.phone, address: input.address }, actor, new Date()), 'Pelanggan ditambahkan')
    if (!r.ok) return false
    update({ customerId: r.value.id, manualKm: input.km })
    return true
  }

  return (
    <Screen
      title="Order baru"
      subtitle={outlet.name}
      right={<Button title="Kosongkan" icon={Eraser} variant="ghost" onPress={reset} accessibilityLabel="Kosongkan draf" />}
      footer={<OrderSummaryBar total={totals.total} blockers={blockers} onSave={save} />}
    >
      <View style={{ gap: space(4) }}>
        <Section step={1} title="Pelanggan">
          <CustomerPicker customers={customers} selected={customer} onSelect={(customerId) => update({ customerId })} onCreate={createCustomer} />
        </Section>

        <Section step={2} title="Penerimaan & pengembalian">
          <Text style={styles.label}>Penerimaan</Text>
          <Segmented<IntakeType>
            items={[
              { id: 'WALK_IN', label: 'Walk-in' },
              { id: 'DROP_OFF', label: 'Drop-off' },
              { id: 'PICKUP', label: 'Dijemput' },
            ]}
            value={draft.intake}
            onChange={(intake) => update({ intake })}
          />
          <Text style={[styles.label, { marginTop: space(2) }]}>Pengembalian</Text>
          <Segmented<HandbackType>
            items={[
              { id: 'SELF_PICKUP', label: 'Ambil sendiri' },
              { id: 'DELIVERY', label: 'Diantar' },
            ]}
            value={draft.handback}
            onChange={(handback) => update({ handback })}
          />
          {needsLogistics && (
            <View style={styles.logistics}>
              {customer?.location ? (
                <View style={styles.inline}>
                  <MapPin size={16} color={color.primary} />
                  <Text style={styles.muted}>
                    Jarak garis lurus dari titik pelanggan: <Text style={styles.strong}>{summary.distanceKm?.toLocaleString('id-ID')} km</Text>
                  </Text>
                </View>
              ) : (
                <TextField
                  label="Jarak dari outlet (km)"
                  value={draft.manualKm}
                  onChangeText={(manualKm) => update({ manualKm })}
                  keyboardType="decimal-pad"
                  placeholder="3,5"
                  hint="Pelanggan belum punya titik lokasi; isi perkiraan jarak."
                />
              )}
              {quote?.status === 'OK' && (
                <View style={styles.tiles}>
                  <Tile label="Zona" value={quote.zoneName} />
                  <Tile label="Jemput" value={legs.pickup ? formatRupiah(quote.pickupFee) : '—'} />
                  <Tile label="Antar" value={legs.delivery ? formatRupiah(quote.deliveryFee) : '—'} />
                </View>
              )}
              {quote?.status === 'NEEDS_CONFIRMATION' && (
                <View style={styles.outside}>
                  <View style={styles.inline}>
                    <TriangleAlert size={16} color={tone.qc.fg} />
                    <Text style={[styles.muted, { color: tone.qc.fg }]}>
                      {quote.distanceKm.toLocaleString('id-ID')} km di luar zona layanan. Konfirmasi dengan pelanggan dan tetapkan biaya manual.
                    </Text>
                  </View>
                  <Pressable onPress={() => setConfirmed(!confirmed)} style={styles.inline} accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }}>
                    <View style={[styles.box, confirmed && styles.boxOn]}>{confirmed && <Check size={14} color={color.white} strokeWidth={3} />}</View>
                    <Text style={styles.strong}>Sudah dikonfirmasi staf</Text>
                  </Pressable>
                  <TextField label="Biaya per perjalanan (Rp)" value={manualFee} onChangeText={setManualFee} keyboardType="number-pad" />
                </View>
              )}
            </View>
          )}
        </Section>

        <Section step={3} title="Layanan">
          <ServicePicker
            services={services}
            outletId={outlet.id}
            lines={draft.lines}
            addons={draft.addons}
            express={draft.express}
            expressPct={expressPct}
            onLines={(lines) => update({ lines })}
            onAddons={(addons) => update({ addons })}
            onExpress={(express) => update({ express })}
          />
        </Section>

        <Section step={4} title="Kondisi awal">
          <View style={styles.chips}>
            {CONDITIONS.map((n) => {
              const on = draft.conditions.includes(n)
              return (
                <Pressable
                  key={n}
                  onPress={() => update({ conditions: on ? draft.conditions.filter((x) => x !== n) : [...draft.conditions, n] })}
                  style={[styles.chip, on && { borderColor: tone.exception.fg, backgroundColor: tone.exception.bg }]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                >
                  <Text style={[styles.chipText, on && { color: tone.exception.fg }]}>{n}</Text>
                </Pressable>
              )
            })}
          </View>
          <View style={styles.photo}>
            <Camera size={18} color={color.subtle} />
            <Text style={styles.muted}>Foto kondisi awal menyusul di versi produksi.</Text>
          </View>
        </Section>

        {summaryLines.length > 0 && (
          <Card style={{ gap: space(2) }}>
            <Text style={styles.sectionTitle}>Ringkasan</Text>
            {summaryLines.map((l, i) => (
              <Row key={`${l.label}-${i}`} label={`${l.label} · ${l.detail}`} value={formatRupiah(l.total)} />
            ))}
            {totals.expressFee > 0 && <Row label={`Express +${expressPct}%`} value={formatRupiah(totals.expressFee)} />}
            {totals.pickupFee > 0 && <Row label="Biaya jemput" value={formatRupiah(totals.pickupFee)} />}
            {totals.deliveryFee > 0 && <Row label="Biaya antar" value={formatRupiah(totals.deliveryFee)} />}
            <Row label="Total" value={formatRupiah(totals.total)} strong />
            {dueAt && (
              <Text style={styles.muted}>
                Estimasi selesai <Text style={styles.strong}>{formatDateTime(dueAt.toISOString())}</Text>
              </Text>
            )}
          </Card>
        )}
      </View>
    </Screen>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: space(3) },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: space(2.5) },
  step: { width: 28, height: 28, borderRadius: 14, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontFamily: font.bold, fontSize: 13, color: color.primary },
  sectionTitle: { fontFamily: font.bold, fontSize: 16, color: color.fg },
  label: { fontFamily: font.semibold, fontSize: 14, color: color.fg },
  logistics: { marginTop: space(2), paddingTop: space(4), borderTopWidth: 1, borderTopColor: color.border, gap: space(3) },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  muted: { flexShrink: 1, fontFamily: font.regular, fontSize: 13, color: color.muted },
  strong: { fontFamily: font.semibold, color: color.fg },
  tiles: { flexDirection: 'row', gap: space(2) },
  tile: { flex: 1, borderRadius: radius.md, backgroundColor: color.surface2, padding: space(2.5) },
  tileLabel: { fontFamily: font.regular, fontSize: 11, color: color.subtle },
  tileValue: { marginTop: 2, fontFamily: font.semibold, fontSize: 14, color: color.fg },
  outside: { gap: space(3), borderRadius: radius.md, borderWidth: 1, borderColor: tone.qc.bg, backgroundColor: tone.qc.bg, padding: space(3) },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface },
  boxOn: { backgroundColor: color.primary, borderColor: color.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space(4), borderRadius: radius.full, borderWidth: 1, borderColor: color.border },
  chipText: { fontFamily: font.medium, fontSize: 14, color: color.muted },
  photo: { flexDirection: 'row', alignItems: 'center', gap: space(2), padding: space(3), borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: color.borderStrong },
})
