'use client'

import { Eraser } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ConditionNotes } from '@/components/cashier/condition-notes'
import { CustomerPicker, type NewCustomerInput } from '@/components/cashier/customer-picker'
import { DeliveryQuoteCard } from '@/components/cashier/delivery-quote-card'
import { FulfillmentPicker } from '@/components/cashier/fulfillment-picker'
import { ItemEditor, type DraftLine } from '@/components/cashier/item-editor'
import { OrderSummary } from '@/components/cashier/order-summary'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatRupiah, parseDecimalID } from '@/lib/format'
import { haversineKm, quoteDelivery } from '@/lib/domain/delivery-zone'
import { calculateTotals, estimateDueAt, lineTotal } from '@/lib/domain/pricing'
import { formatLineDetail } from '@/lib/labels'
import { act } from '@/lib/store/act'
import { addCustomer } from '@/lib/store/actions-catalog'
import { createOrder } from '@/lib/store/actions-order'
import { useDemo } from '@/lib/store/demo-store'
import { useActiveOutlet } from '@/lib/store/hooks'
import type { HandbackType, IntakeType, Service } from '@/lib/types'
import { useNow } from '@/lib/use-now'

const DRAFT_KEY = 'swarapos-kasir-draft'

type Draft = {
  customerId: string | null
  intake: IntakeType
  handback: HandbackType
  lines: DraftLine[]
  addons: string[]
  express: boolean
  conditions: string[]
  manualKm: string
}

const EMPTY: Draft = {
  customerId: null,
  intake: 'DROP_OFF',
  handback: 'SELF_PICKUP',
  lines: [],
  addons: [],
  express: false,
  conditions: [],
  manualKm: '',
}

function readDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY
  } catch {
    // Draf rusak atau penyimpanan diblokir: mulai dari kosong.
    return EMPTY
  }
}

function Section({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-fg">
        <span className="grid size-7 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary">{step}</span>
        {title}
      </h2>
      {children}
    </Card>
  )
}

export default function KasirPage() {
  const router = useRouter()
  const now = useNow()
  const outlet = useActiveOutlet()
  const customers = useDemo((s) => s.customers)
  const services = useDemo((s) => s.services)
  const zones = useDemo((s) => s.zones)
  const expressPct = useDemo((s) => s.tenant.expressSurchargePct)

  // Draf lokal (PRD: layar operasional tetap usable saat koneksi tidak stabil). Halaman ini
  // baru dirender setelah hidrasi store, jadi aman membaca localStorage saat inisialisasi.
  const [draft, setDraft] = useState<Draft>(readDraft)
  const [confirmed, setConfirmed] = useState(false)
  const [manualFee, setManualFee] = useState('')
  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // Abaikan.
    }
  }, [draft])

  const customer = customers.find((c) => c.id === draft.customerId)
  const byId = useMemo(() => new Map(services.map((s) => [s.id, s])), [services])

  const parsed = draft.lines.map((l) => ({ line: l, svc: byId.get(l.serviceId), qty: parseDecimalID(l.qtyText) }))
  const valid: { svc: Service; qty: number }[] = [
    ...parsed.filter((p): p is { line: DraftLine; svc: Service; qty: number } => !!p.svc && !!p.qty && p.qty > 0),
    ...draft.addons.map((id) => ({ svc: byId.get(id)!, qty: 1 })).filter((p) => p.svc),
  ]
  const invalidLines = parsed.some((p) => p.line.qtyText.trim() !== '' && !(p.qty && p.qty > 0)) || parsed.some((p) => p.line.qtyText.trim() === '')

  const legs = { pickup: draft.intake === 'PICKUP', delivery: draft.handback === 'DELIVERY' }
  const needsLogistics = legs.pickup || legs.delivery
  const distanceKm = customer?.location
    ? Math.round(haversineKm(outlet, customer.location) * 10) / 10
    : parseDecimalID(draft.manualKm)
  const quote = needsLogistics && distanceKm !== null ? quoteDelivery(distanceKm, zones) : null
  const manualFeeValue = Number(manualFee.replace(/\D/g, ''))
  const legFee = (kind: 'pickupFee' | 'deliveryFee') =>
    quote?.status === 'OK' ? quote[kind] : quote?.status === 'NEEDS_CONFIRMATION' ? manualFeeValue : 0

  const totals = calculateTotals({
    lines: valid.map((v) => ({ unit: v.svc.unit, unitPrice: v.svc.prices[outlet.id] ?? 0, qty: v.qty })),
    express: draft.express,
    expressSurchargePct: expressPct,
    pickupFee: legs.pickup ? legFee('pickupFee') : 0,
    deliveryFee: legs.delivery ? legFee('deliveryFee') : 0,
  })
  const dueAt = valid.length > 0 ? estimateDueAt(now, valid.map((v) => v.svc.durationHours), draft.express) : null

  const blockers: string[] = []
  if (!customer) blockers.push('Pilih atau tambah pelanggan')
  if (valid.length === 0 || !draft.lines.length) blockers.push('Tambah minimal satu layanan utama')
  if (invalidLines) blockers.push('Lengkapi berat/jumlah setiap layanan')
  if (needsLogistics && !customer?.address) blockers.push('Alamat pelanggan wajib untuk jemput/antar')
  if (needsLogistics && distanceKm === null) blockers.push('Isi jarak dari outlet')
  if (quote?.status === 'NEEDS_CONFIRMATION' && (!confirmed || !(manualFeeValue > 0))) blockers.push('Konfirmasi area di luar zona & isi biaya')

  const save = () => {
    if (blockers.length > 0 || !customer) return
    const result = act(
      (s) =>
        createOrder(
          s,
          {
            outletId: outlet.id,
            customerId: customer.id,
            intake: draft.intake,
            handback: draft.handback,
            express: draft.express,
            items: valid.map((v) => ({ serviceId: v.svc.id, qty: v.qty })),
            conditionNotes: draft.conditions,
            pickupFee: totals.pickupFee,
            deliveryFee: totals.deliveryFee,
            distanceKm: distanceKm ?? undefined,
          },
          s.tenantActor,
          new Date(),
        ),
      'Order tersimpan',
    )
    if (result.ok) {
      try {
        localStorage.removeItem(DRAFT_KEY)
      } catch {
        // Abaikan.
      }
      router.push(`/app/order/${result.value.id}?baru=1`)
    }
  }

  const saveRef = useRef(save)
  saveRef.current = save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        saveRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const createCustomer = (input: NewCustomerInput): boolean => {
    const r = act(
      (s) => addCustomer(s, { name: input.name, phone: input.phone, address: input.address }, s.tenantActor, new Date()),
      'Pelanggan ditambahkan',
    )
    if (!r.ok) return false
    update({ customerId: r.value.id, manualKm: input.km })
    return true
  }

  const summaryLines = valid.map((v) => {
    const price = v.svc.prices[outlet.id] ?? 0
    return { label: v.svc.name, detail: formatLineDetail(v.svc.unit, v.qty, price), total: lineTotal({ unit: v.svc.unit, unitPrice: price, qty: v.qty }) }
  })

  return (
    <>
      <PageHeader
        title="Order baru"
        description={`Kasir · ${outlet.name}`}
        actions={
          <Button
            variant="ghost"
            onClick={() => {
              setDraft(EMPTY)
              setConfirmed(false)
              setManualFee('')
            }}
          >
            <Eraser aria-hidden />
            Kosongkan
          </Button>
        }
      />

      <div className="grid gap-6 pb-24 lg:grid-cols-[1fr_22rem] lg:pb-0">
        <div className="min-w-0 space-y-5">
          <Section step={1} title="Pelanggan">
            <CustomerPicker customers={customers} selected={customer} onSelect={(id) => update({ customerId: id })} onCreate={createCustomer} />
          </Section>

          <Section step={2} title="Penerimaan & pengembalian">
            <FulfillmentPicker intake={draft.intake} handback={draft.handback} onChange={update} />
            {needsLogistics && (
              <div className="mt-5 border-t border-border pt-5">
                <DeliveryQuoteCard
                  quote={quote}
                  fromLocation={!!customer?.location}
                  manualKm={draft.manualKm}
                  onManualKm={(manualKm) => update({ manualKm })}
                  confirmed={confirmed}
                  onConfirmed={setConfirmed}
                  manualFee={manualFee}
                  onManualFee={setManualFee}
                  legs={legs}
                />
              </div>
            )}
          </Section>

          <Section step={3} title="Layanan">
            <ItemEditor
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
            <ConditionNotes value={draft.conditions} onChange={(conditions) => update({ conditions })} />
          </Section>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <OrderSummary lines={summaryLines} totals={totals} expressPct={expressPct} dueAt={dueAt} blockers={blockers} onSave={save} />
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 flex items-center justify-between gap-3 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-64 lg:hidden">
        <div>
          <p className="text-xs text-fg-subtle">Total</p>
          <p className="tabular text-lg font-bold text-fg">{formatRupiah(totals.total)}</p>
        </div>
        <Button size="lg" disabled={blockers.length > 0} onClick={save}>
          Simpan order
        </Button>
      </div>
    </>
  )
}
