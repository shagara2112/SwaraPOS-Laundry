'use client'

import { MapPin, Phone, Search, UserPlus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { normalizePhoneID } from '@swarapos/core/domain/whatsapp'
import type { Customer } from '@swarapos/core/types'

export type NewCustomerInput = { name: string; phone: string; address: string; km: string }

export function CustomerPicker({
  customers,
  selected,
  onSelect,
  onCreate,
}: {
  customers: Customer[]
  selected: Customer | undefined
  onSelect: (id: string | null) => void
  onCreate: (input: NewCustomerInput) => boolean
}) {
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<NewCustomerInput>({ name: '', phone: '', address: '', km: '' })
  const [touched, setTouched] = useState(false)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    const digits = q.replace(/\D/g, '')
    const list = q
      ? customers.filter((c) => c.name.toLowerCase().includes(q) || (digits.length >= 3 && c.phone.replace(/\D/g, '').includes(digits)))
      : [...customers].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return list.slice(0, 6)
  }, [customers, query])

  if (selected) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-xl border border-primary/30 bg-primary-soft/50 p-4">
        <div className="min-w-0 space-y-1">
          <p className="font-semibold text-fg">{selected.name}</p>
          <p className="flex items-center gap-1.5 text-sm text-fg-muted">
            <Phone className="size-3.5" aria-hidden />
            {selected.phone}
            {!normalizePhoneID(selected.phone) && <span className="font-medium text-danger">· nomor tidak valid</span>}
          </p>
          {selected.address && (
            <p className="flex items-center gap-1.5 text-sm text-fg-muted">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{selected.address}</span>
            </p>
          )}
          {selected.notes && <p className="text-xs text-fg-subtle">Catatan: {selected.notes}</p>}
        </div>
        <Button variant="ghost" size="sm" onClick={() => onSelect(null)}>
          <X aria-hidden />
          Ganti
        </Button>
      </div>
    )
  }

  if (creating) {
    const nameError = touched && !draft.name.trim() ? 'Nama wajib diisi.' : undefined
    const phoneError = touched && !normalizePhoneID(draft.phone) ? 'Nomor WhatsApp tidak valid.' : undefined
    return (
      <div className="space-y-4 rounded-xl border border-border p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama" htmlFor="nc-name" required error={nameError}>
            <Input id="nc-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} aria-invalid={!!nameError} />
          </Field>
          <Field label="WhatsApp" htmlFor="nc-phone" required error={phoneError}>
            <Input id="nc-phone" inputMode="tel" placeholder="0812-3456-7890" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} aria-invalid={!!phoneError} />
          </Field>
          <Field label="Alamat" htmlFor="nc-address" className="sm:col-span-2" hint="Wajib untuk jemput/antar.">
            <Input id="nc-address" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
          </Field>
          <Field label="Perkiraan jarak dari outlet (km)" htmlFor="nc-km" hint="Titik peta menyusul; jarak dipakai untuk zona.">
            <Input id="nc-km" inputMode="decimal" placeholder="3,5" value={draft.km} onChange={(e) => setDraft({ ...draft, km: e.target.value })} />
          </Field>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setTouched(true)
              if (onCreate(draft)) {
                setCreating(false)
                setDraft({ name: '', phone: '', address: '', km: '' })
                setTouched(false)
              }
            }}
          >
            Simpan pelanggan
          </Button>
          <Button variant="ghost" onClick={() => setCreating(false)}>
            Batal
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <Input data-search value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama atau nomor WhatsApp" className="pl-9" aria-label="Cari pelanggan" />
        </div>
        <Button variant="secondary" onClick={() => setCreating(true)}>
          <UserPlus aria-hidden />
          <span className="hidden sm:inline">Pelanggan baru</span>
        </Button>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {matches.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              className="flex min-h-14 w-full flex-col items-start justify-center rounded-xl border border-border px-3 py-2 text-left hover:border-primary/40 hover:bg-primary-soft/40"
            >
              <span className="text-sm font-medium text-fg">{c.name}</span>
              <span className="text-xs text-fg-subtle">{c.phone}</span>
            </button>
          </li>
        ))}
        {matches.length === 0 && <li className="text-sm text-fg-subtle">Tidak ditemukan. Tambahkan sebagai pelanggan baru.</li>}
      </ul>
    </div>
  )
}
