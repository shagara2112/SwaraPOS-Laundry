'use client'

import { Clock, MapPin, Phone, Save, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { PaymentMethodsTab } from '@/components/settings/payment-methods-tab'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Table, Td, Th, Tr } from '@/components/ui/table'
import { Tabs } from '@/components/ui/tabs'
import { toast } from '@/components/ui/toast'
import { buildWaMessage, WA_EVENT_LABEL } from '@/lib/domain/whatsapp'
import { ROLE_LABEL } from '@/lib/labels'
import { planUsage } from '@/lib/selectors'
import { act } from '@/lib/store/act'
import { updateZones } from '@/lib/store/actions-catalog'
import { useDemo } from '@/lib/store/demo-store'
import type { DeliveryZone, StaffRole, WaEvent } from '@/lib/types'

function OutletTab() {
  const outlets = useDemo((s) => s.outlets)
  const plan = useDemo((s) => s.platform.tenants.find((t) => t.id === s.tenant.id)?.plan)
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {outlets.map((o) => (
        <Card key={o.id}>
          <CardHeader title={o.name} action={<Badge tone="primary">{o.code}</Badge>} />
          <CardBody className="space-y-2 pt-3 text-sm text-fg-muted">
            <p className="flex gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              {o.address}
            </p>
            <p className="flex gap-2">
              <Phone className="mt-0.5 size-4 shrink-0" aria-hidden />
              {o.phone}
            </p>
            <p className="flex gap-2">
              <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
              {o.hours}
            </p>
            <p className="font-mono text-xs text-fg-subtle">
              Titik: {o.lat}, {o.lng}
            </p>
          </CardBody>
        </Card>
      ))}
      <p className="text-sm text-fg-subtle lg:col-span-2">
        Paket {plan === 'PRO' ? 'Pro' : 'Basic'} ditagih per outlet per bulan. Penambahan outlet dan edit titik lokasi dibuka bersama integrasi peta.
      </p>
    </div>
  )
}

type Invite = { name: string; phone: string; role: StaffRole }

function StaffTab() {
  const staff = useDemo((s) => s.staff)
  const outlets = useDemo((s) => s.outlets)
  const plan = useDemo((s) => s.platform.plans.find((p) => p.code === s.platform.tenants.find((t) => t.id === s.tenant.id)?.plan))
  const [invites, setInvites] = useState<Invite[]>([])
  const staffUsage = plan ? planUsage(plan.limits, { outlets: outlets.length, staff: staff.length + invites.length })[1] : undefined
  const full = !!staffUsage?.reached
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Invite>({ name: '', phone: '', role: 'CASHIER' })
  return (
    <Card>
      <CardHeader
        title="Karyawan & peran"
        description={
          staffUsage
            ? `Akses dibatasi per peran dan outlet. ${staffUsage.used} dari ${staffUsage.limit} karyawan sesuai paket ${plan?.name}.`
            : 'Akses dibatasi per peran dan outlet.'
        }
        action={
          <Button size="sm" onClick={() => setOpen(true)} disabled={full} title={full ? 'Batas karyawan paket tercapai' : undefined}>
            <UserPlus aria-hidden />
            Undang
          </Button>
        }
      />
      {full && (
        <p className="mx-5 mt-3 rounded-xl bg-phase-qc-soft px-3 py-2 text-sm text-phase-qc">
          Batas karyawan paket {plan?.name} tercapai. Upgrade paket di menu Langganan untuk menambah karyawan.
        </p>
      )}
      <Table className="mt-3">
        <thead>
          <tr>
            <Th>Nama</Th>
            <Th>Peran</Th>
            <Th>Outlet</Th>
            <Th>Telepon</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {staff.map((s) => (
            <Tr key={s.id}>
              <Td className="font-medium">{s.name}</Td>
              <Td>{ROLE_LABEL[s.role]}</Td>
              <Td className="text-fg-muted">{outlets.find((o) => o.id === s.outletId)?.code}</Td>
              <Td className="tabular text-fg-muted">{s.phone}</Td>
              <Td>
                <Badge tone="success">Aktif</Badge>
              </Td>
            </Tr>
          ))}
          {invites.map((i) => (
            <Tr key={i.phone}>
              <Td className="font-medium">{i.name}</Td>
              <Td>{ROLE_LABEL[i.role]}</Td>
              <Td className="text-fg-muted">—</Td>
              <Td className="tabular text-fg-muted">{i.phone}</Td>
              <Td>
                <Badge tone="warning">Menunggu</Badge>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title="Undang karyawan"
        description="Undangan dikirim lewat WhatsApp berisi tautan aktivasi."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={!form.name.trim() || !form.phone.trim()}
              onClick={() => {
                setInvites([...invites, form])
                setForm({ name: '', phone: '', role: 'CASHIER' })
                setOpen(false)
                toast('Undangan dibuat (belum tersimpan di data demo)', 'info')
              }}
            >
              Buat undangan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nama" htmlFor="inv-name">
            <Input id="inv-name" data-autofocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="WhatsApp" htmlFor="inv-phone">
            <Input id="inv-phone" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Peran" htmlFor="inv-role">
            <Select id="inv-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}>
              {(['CASHIER', 'OPERATOR', 'QC', 'COURIER'] as StaffRole[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Dialog>
    </Card>
  )
}

const ZONE_FIELD_LABEL = { minKm: 'dari km', maxKm: 'sampai km', pickupFee: 'biaya jemput', deliveryFee: 'biaya antar' }

function ZonesTab() {
  const saved = useDemo((s) => s.zones)
  const [zones, setZones] = useState<DeliveryZone[]>(saved)
  const set = (i: number, patch: Partial<DeliveryZone>) => setZones(zones.map((z, idx) => (idx === i ? { ...z, ...patch } : z)))
  const gap = zones.some((z, i) => i > 0 && z.minKm !== zones[i - 1].maxKm) || zones.some((z) => z.minKm >= z.maxKm)

  return (
    <Card>
      <CardHeader title="Zona antar-jemput" description="Radius dari outlet. Batas bawah zona harus sama dengan batas atas zona sebelumnya." />
      <Table className="mt-3">
        <thead>
          <tr>
            <Th>Zona</Th>
            <Th>Dari (km)</Th>
            <Th>Sampai (km)</Th>
            <Th>Jemput (Rp)</Th>
            <Th>Antar (Rp)</Th>
          </tr>
        </thead>
        <tbody>
          {zones.map((z, i) => (
            <Tr key={z.id}>
              <Td className="font-medium">{z.name}</Td>
              {(['minKm', 'maxKm', 'pickupFee', 'deliveryFee'] as const).map((k) => (
                <Td key={k}>
                  <Input
                    type="number"
                    min={0}
                    value={z[k]}
                    onChange={(e) => set(i, { [k]: Number(e.target.value) })}
                    className="tabular h-10 w-28"
                    aria-label={`${z.name} ${ZONE_FIELD_LABEL[k]}`}
                    aria-invalid={(k === 'minKm' && i > 0 && z.minKm !== zones[i - 1].maxKm) || (k === 'maxKm' && z.minKm >= z.maxKm)}
                  />
                </Td>
              ))}
            </Tr>
          ))}
        </tbody>
      </Table>
      <CardBody className="flex flex-wrap items-center justify-between gap-3">
        <p className={gap ? 'text-sm font-medium text-danger' : 'text-sm text-fg-subtle'}>
          {gap ? 'Ada celah atau tumpang tindih antarzona. Perbaiki sel yang ditandai merah.' : 'Di atas zona terakhir: perlu konfirmasi staf.'}
        </p>
        <Button disabled={gap} onClick={() => act((s) => updateZones(s, zones, s.tenantActor, new Date()), 'Zona disimpan')}>
          <Save aria-hidden />
          Simpan zona
        </Button>
      </CardBody>
    </Card>
  )
}

function TemplatesTab() {
  const events = Object.keys(WA_EVENT_LABEL) as WaEvent[]
  const [event, setEvent] = useState<WaEvent>('ORDER_RECEIVED')
  const sample = buildWaMessage(event, {
    customerName: 'Sari Hartono',
    orderNo: 'KMG-261031-0012',
    outletName: 'Laundry Bersih Kilat Kemang',
    trackingUrl: 'https://swarapos.id/lacak/contoh',
    amountDue: event === 'PAYMENT_DUE' || event === 'READY' ? 52500 : undefined,
  })
  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <ul className="space-y-1">
        {events.map((e) => (
          <li key={e}>
            <button
              type="button"
              onClick={() => setEvent(e)}
              aria-pressed={e === event}
              className={`flex h-11 w-full items-center rounded-xl px-3 text-left text-sm font-medium ${e === event ? 'bg-primary-soft text-primary' : 'text-fg-muted hover:bg-surface-2'}`}
            >
              {WA_EVENT_LABEL[e]}
            </button>
          </li>
        ))}
      </ul>
      <div className="rounded-2xl bg-[#e5ddd5] p-6 dark:bg-[#0b141a]">
        <div className="ml-auto max-w-md whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-4 py-3 text-sm leading-relaxed text-[#111b21] shadow-sm dark:bg-[#005c4b] dark:text-[#e9edef]">
          {sample}
        </div>
        <p className="mt-4 text-center text-xs text-[#54656f] dark:text-[#8696a0]">Pratinjau dengan data contoh. Staf menekan kirim di WhatsApp.</p>
      </div>
    </div>
  )
}

const TABS = [
  { id: 'outlet', label: 'Outlet' },
  { id: 'staff', label: 'Karyawan & peran' },
  { id: 'zones', label: 'Zona antar' },
  { id: 'payments', label: 'Metode bayar' },
  { id: 'templates', label: 'Template WhatsApp' },
]

export default function PengaturanPage() {
  const [tab, setTab] = useState('outlet')
  return (
    <>
      <PageHeader title="Pengaturan" description="Konfigurasi bisnis, karyawan, zona, dan notifikasi." />
      <Tabs items={TABS} value={tab} onChange={setTab} className="mb-6 w-full sm:w-fit" />
      {tab === 'outlet' && <OutletTab />}
      {tab === 'staff' && <StaffTab />}
      {tab === 'zones' && <ZonesTab />}
      {tab === 'payments' && <PaymentMethodsTab />}
      {tab === 'templates' && <TemplatesTab />}
    </>
  )
}
