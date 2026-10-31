'use client'

import { Eraser } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ConditionNotes } from '@/components/cashier/condition-notes'
import { CustomerPicker, type NewCustomerInput } from '@/components/cashier/customer-picker'
import { DeliveryQuoteCard } from '@/components/cashier/delivery-quote-card'
import { FulfillmentPicker } from '@/components/cashier/fulfillment-picker'
import { ItemEditor } from '@/components/cashier/item-editor'
import { OrderSummary } from '@/components/cashier/order-summary'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { emptyDraft, orderInputFromDraft, summarizeDraft, type OrderDraft } from '@swarapos/core/cashier'
import { formatRupiah } from '@swarapos/core/format'
import { act } from '@/lib/store/act'
import { addCustomer } from '@swarapos/core/store/actions-catalog'
import { createOrder } from '@swarapos/core/store/actions-order'
import { useDemo } from '@/lib/store/demo-store'
import { useActiveOutlet } from '@/lib/store/hooks'
import { useNow } from '@/lib/use-now'

const DRAFT_KEY = 'swarapos-kasir-draft'

function readDraft(): OrderDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? { ...emptyDraft(), ...JSON.parse(raw) } : emptyDraft()
  } catch {
    // Draf rusak atau penyimpanan diblokir: mulai dari kosong.
    return emptyDraft()
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
  const [draft, setDraft] = useState<OrderDraft>(readDraft)
  const [confirmed, setConfirmed] = useState(false)
  const [manualFee, setManualFee] = useState('')
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const update = (patch: Partial<OrderDraft>) => setDraft((d) => ({ ...d, ...patch }))

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // Abaikan.
    }
  }, [draft])

  const customer = customers.find((c) => c.id === draft.customerId)
  const summary = summarizeDraft({
    draft,
    customer,
    outlet,
    services,
    zones,
    expressPct,
    outsideZone: { confirmed, feeText: manualFee },
    now,
  })
  const { quote, legs, needsLogistics, totals, dueAt, blockers, summaryLines } = summary

  const save = () => {
    // Penahan double-click; kunci draf di createOrder menjaga idempotensi di level data.
    if (blockers.length > 0 || !customer || savingRef.current) return
    const result = act((s) => createOrder(s, orderInputFromDraft(draft, summary, outlet.id), s.tenantActor, new Date()), 'Order tersimpan')
    if (result.ok) {
      savingRef.current = true
      setSaving(true)
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

  return (
    <>
      <PageHeader
        title="Order baru"
        description={`Kasir · ${outlet.name}`}
        actions={
          <Button
            variant="ghost"
            onClick={() => {
              setDraft(emptyDraft())
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
          <OrderSummary lines={summaryLines} totals={totals} expressPct={expressPct} dueAt={dueAt} blockers={blockers} saving={saving} onSave={save} />
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 flex items-center justify-between gap-3 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-64 lg:hidden">
        <div>
          <p className="text-xs text-fg-subtle">Total</p>
          <p className="tabular text-lg font-bold text-fg">{formatRupiah(totals.total)}</p>
        </div>
        <Button size="lg" disabled={blockers.length > 0 || saving} onClick={save}>
          Simpan order
        </Button>
      </div>
    </>
  )
}
