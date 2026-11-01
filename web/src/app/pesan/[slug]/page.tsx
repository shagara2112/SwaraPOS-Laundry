'use client'

import { CalendarClock, CircleCheck, MapPin, SearchX, Truck } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Button, ButtonLink } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/cn'
import { formatDateTime, formatRupiah } from '@swarapos/core/format'
import { createPickupRequest, pickupSlots, tenantSlug } from '@swarapos/core/pickup-request'
import { normalizePhoneID } from '@swarapos/core/domain/whatsapp'
import type { HandbackType, Order } from '@swarapos/core/types'
import { ERROR_MESSAGE } from '@/lib/store/act'
import { useDemo } from '@/lib/store/demo-store'
import { useHydrated } from '@/lib/store/use-hydrated'

const SERVICES = ['Cuci kiloan', 'Express', 'Kemeja / satuan', 'Bed cover', 'Sepatu', 'Karpet']

/** Halaman publik pesan jemput (tanpa login), dibagikan laundry lewat WhatsApp/Instagram. */
export default function PesanJemputPage() {
  const { slug } = useParams<{ slug: string }>()
  const hydrated = useHydrated()
  const tenantName = useDemo((s) => s.tenant.name)
  const mySlug = useDemo((s) => tenantSlug(s))
  const outlets = useDemo((s) => s.outlets)
  const zones = useDemo((s) => s.zones)
  const [now] = useState(() => new Date())
  const slots = useMemo(() => pickupSlots(now), [now])

  const [outletId, setOutletId] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', address: '', locationNote: '', zoneId: '', slot: '', handback: 'DELIVERY' as HandbackType, note: '' })
  const [services, setServices] = useState<string[]>([])
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<Order | null>(null)

  // ?outlet=KMG memilih outlet dari link yang dibagikan outlet tersebut.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('outlet')
    const match = outlets.find((o) => o.code === code) ?? outlets[0]
    if (match && !outletId) setOutletId(match.id)
  }, [outlets, outletId])

  const zone = zones.find((z) => z.id === form.zoneId)
  const fees = zone ? zone.pickupFee + (form.handback === 'DELIVERY' ? zone.deliveryFee : 0) : 0
  const errors = {
    name: !form.name.trim() ? 'Nama wajib diisi.' : undefined,
    phone: !normalizePhoneID(form.phone) ? 'Nomor WhatsApp tidak valid.' : undefined,
    address: !form.address.trim() ? 'Alamat jemput wajib diisi.' : undefined,
    zoneId: !form.zoneId ? 'Pilih area.' : undefined,
    slot: !form.slot ? 'Pilih jadwal jemput.' : undefined,
  }
  const invalid = Object.values(errors).some(Boolean)

  const submit = () => {
    setTouched(true)
    setError(null)
    if (invalid) return
    const serviceNote = [services.join(', '), form.note.trim()].filter(Boolean).join(' · ')
    const result = useDemo.getState().run((s) =>
      createPickupRequest(s, { slug, outletId, name: form.name, phone: form.phone, address: form.address, locationNote: form.locationNote, zoneId: form.zoneId, pickupAt: form.slot, handback: form.handback, serviceNote }, new Date()),
    )
    if (result.ok) setDone(result.value)
    else setError(ERROR_MESSAGE[result.error])
  }

  const header = (
    <header className="flex items-center gap-3 py-5">
      <span className="grid size-10 place-items-center rounded-xl bg-primary text-base font-bold text-white">{tenantName.charAt(0)}</span>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-fg">{tenantName}</p>
        <p className="text-xs text-fg-subtle">Pesan jemput cucian</p>
      </div>
    </header>
  )

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-[30rem] px-4 pb-10">
        {header}
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    )
  }

  if (slug !== mySlug) {
    return (
      <div className="mx-auto max-w-[30rem] px-4 py-10">
        <Card>
          <EmptyState icon={SearchX} title="Link tidak ditemukan" description="Periksa kembali link dari laundry Anda." />
        </Card>
      </div>
    )
  }

  if (done) {
    return (
      <div className="mx-auto max-w-[30rem] px-4 pb-10">
        {header}
        <Card className="space-y-4 p-6 text-center">
          <CircleCheck className="mx-auto size-12 text-phase-done" aria-hidden />
          <div>
            <h1 className="text-xl font-bold text-fg">Permintaan terkirim</h1>
            <p className="mt-1 text-sm text-fg-muted">Laundry akan mengonfirmasi lewat WhatsApp sebelum kurir berangkat.</p>
          </div>
          <dl className="space-y-2 rounded-2xl bg-surface-2 p-4 text-left text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-fg-subtle">Nomor order</dt>
              <dd className="font-mono font-semibold text-fg">{done.orderNo}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-subtle">Jadwal jemput</dt>
              <dd className="font-medium text-fg">{formatDateTime(form.slot)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-subtle">Biaya jemput/antar</dt>
              <dd className="tabular font-medium text-fg">{formatRupiah(done.totals.total)}</dd>
            </div>
          </dl>
          <p className="text-xs text-fg-subtle">Biaya cucian dihitung setelah ditimbang di outlet.</p>
          <ButtonLink href={`/lacak/${done.trackingToken}`} className="w-full">
            Lacak cucian
          </ButtonLink>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[30rem] px-4 pb-10">
      {header}
      <Card className="space-y-5 p-5">
        <div>
          <h1 className="text-xl font-bold text-fg">Jemput cucian di rumah</h1>
          <p className="mt-1 text-sm text-fg-muted">Isi data di bawah. Kurir menjemput sesuai jadwal; biaya cucian dihitung setelah ditimbang.</p>
        </div>

        {outlets.length > 1 && (
          <Field label="Outlet" htmlFor="p-outlet">
            <Select id="p-outlet" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama" htmlFor="p-name" required error={touched ? errors.name : undefined}>
            <Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
          </Field>
          <Field label="WhatsApp" htmlFor="p-phone" required error={touched ? errors.phone : undefined}>
            <Input id="p-phone" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0812-3456-7890" autoComplete="tel" />
          </Field>
        </div>
        <Field label="Alamat jemput" htmlFor="p-address" required error={touched ? errors.address : undefined}>
          <Textarea id="p-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} autoComplete="street-address" />
        </Field>
        <Field label="Patokan lokasi (opsional)" htmlFor="p-note">
          <Input id="p-note" value={form.locationNote} onChange={(e) => setForm({ ...form, locationNote: e.target.value })} placeholder="Contoh: pagar hijau, sebelah warung" />
        </Field>

        <fieldset>
          <legend className="mb-2 flex items-center gap-2 text-sm font-medium text-fg">
            <MapPin className="size-4 text-primary" aria-hidden />
            Jarak dari outlet
          </legend>
          <div className="grid gap-2">
            {zones.map((z) => {
              const active = form.zoneId === z.id
              return (
                <button
                  key={z.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setForm({ ...form, zoneId: z.id })}
                  className={cn('flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors', active ? 'border-primary bg-primary-soft' : 'border-border hover:bg-surface-2')}
                >
                  <span className="font-medium text-fg">
                    {z.name} · {z.minKm}–{z.maxKm} km
                  </span>
                  <span className="tabular text-xs text-fg-muted">
                    jemput {formatRupiah(z.pickupFee)} · antar {formatRupiah(z.deliveryFee)}
                  </span>
                </button>
              )
            })}
          </div>
          {touched && errors.zoneId && <p className="mt-1 text-xs text-danger">{errors.zoneId}</p>}
          <p className="mt-1 text-xs text-fg-subtle">Lebih dari {zones.at(-1)?.maxKm} km? Hubungi outlet lewat WhatsApp.</p>
        </fieldset>

        <Field label="Jadwal jemput" htmlFor="p-slot" required error={touched ? errors.slot : undefined}>
          <Select id="p-slot" value={form.slot} onChange={(e) => setForm({ ...form, slot: e.target.value })}>
            <option value="">Pilih jadwal…</option>
            {(['Hari ini', 'Besok'] as const).map((day) => (
              <optgroup key={day} label={day}>
                {slots
                  .filter((s) => s.day === day)
                  .map((s) => (
                    <option key={s.start} value={s.start}>
                      {day}, {s.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </Select>
        </Field>

        <fieldset>
          <legend className="mb-2 flex items-center gap-2 text-sm font-medium text-fg">
            <Truck className="size-4 text-primary" aria-hidden />
            Setelah selesai
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {([
              ['DELIVERY', 'Diantar kembali'],
              ['SELF_PICKUP', 'Saya ambil di outlet'],
            ] as const).map(([v, label]) => (
              <button
                key={v}
                type="button"
                aria-pressed={form.handback === v}
                onClick={() => setForm({ ...form, handback: v })}
                className={cn('min-h-11 rounded-xl border px-3 text-sm font-medium', form.handback === v ? 'border-primary bg-primary-soft text-primary' : 'border-border text-fg')}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-fg">Layanan yang diinginkan (opsional)</legend>
          <div className="flex flex-wrap gap-2">
            {SERVICES.map((sv) => {
              const on = services.includes(sv)
              return (
                <button
                  key={sv}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setServices((cur) => (cur.includes(sv) ? cur.filter((x) => x !== sv) : [...cur, sv]))}
                  className={cn('min-h-10 rounded-full border px-3 text-sm', on ? 'border-primary bg-primary-soft text-primary' : 'border-border text-fg-muted')}
                >
                  {sv}
                </button>
              )
            })}
          </div>
          <Textarea className="mt-2" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Catatan untuk laundry, misalnya jumlah bed cover" aria-label="Catatan untuk laundry" />
        </fieldset>

        <div className="flex items-center justify-between rounded-2xl bg-surface-2 p-4">
          <span className="flex items-center gap-2 text-sm text-fg-muted">
            <CalendarClock className="size-4" aria-hidden />
            Biaya jemput/antar
          </span>
          <span className="tabular text-lg font-bold text-fg">{zone ? formatRupiah(fees) : '—'}</span>
        </div>

        {error && (
          <p className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <Button size="lg" className="w-full" onClick={submit}>
          Kirim permintaan jemput
        </Button>
        <p className="text-center text-xs text-fg-subtle">
          Data hanya dipakai {tenantName} untuk menjemput dan menghubungi Anda.{' '}
          <Link href="/" className="underline">
            SwaraPOS
          </Link>
        </p>
      </Card>
    </div>
  )
}
