'use client'

import { ArrowDown, ArrowUp, Banknote, ExternalLink, Landmark, Pencil, Plus, QrCode } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/cn'
import { act } from '@/lib/store/act'
import { upsertOutletPaymentMethod } from '@swarapos/core/store/actions-catalog'
import { useDemo } from '@/lib/store/demo-store'
import type { OutletPaymentMethod } from '@swarapos/core/store/state'

type Method = OutletPaymentMethod['type']
type Draft = Omit<OutletPaymentMethod, 'id'> & { id?: string }

const TYPE = {
  CASH: { label: 'Tunai', icon: Banknote },
  TRANSFER: { label: 'Transfer bank', icon: Landmark },
  QRIS: { label: 'QRIS', icon: QrCode },
} satisfies Record<Method, { label: string; icon: typeof Banknote }>

export function methodSummary(m: OutletPaymentMethod): string {
  if (m.type === 'TRANSFER') return `${m.bankName} ${m.accountNumber} a.n. ${m.accountName}`
  if (m.type === 'QRIS') return `Merchant ${m.merchantName}`
  return m.instructions
}

function MethodForm({ initial, onClose }: { initial: Draft; onClose: () => void }) {
  const [d, setD] = useState<Draft>(initial)
  const [touched, setTouched] = useState(false)
  const set = (patch: Partial<Draft>) => setD({ ...d, ...patch })

  const digits = (d.accountNumber ?? '').replace(/[\s-]/g, '')
  const errors = {
    label: !d.label.trim() ? 'Nama metode wajib diisi.' : undefined,
    bankName: d.type === 'TRANSFER' && !d.bankName?.trim() ? 'Nama bank wajib diisi.' : undefined,
    accountNumber: d.type === 'TRANSFER' && !/^\d{6,20}$/.test(digits) ? 'Nomor rekening 6–20 angka (spasi atau tanda hubung boleh).' : undefined,
    accountName: d.type === 'TRANSFER' && !d.accountName?.trim() ? 'Nama pemilik rekening wajib diisi.' : undefined,
    merchantName: d.type === 'QRIS' && !d.merchantName?.trim() ? 'Nama merchant QRIS wajib diisi.' : undefined,
  }
  const invalid = Object.values(errors).some(Boolean)
  const show = (key: keyof typeof errors) => (touched ? errors[key] : undefined)

  const save = () => {
    setTouched(true)
    if (invalid) return
    const r = act((s) => upsertOutletPaymentMethod(s, d, s.tenantActor, new Date()), d.id ? 'Metode bayar diperbarui' : 'Metode bayar ditambahkan')
    if (r.ok) onClose()
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={d.id ? 'Ubah metode bayar' : 'Metode bayar baru'}
      description="Tampil di halaman lacak pelanggan saat tagihan belum lunas. Perubahan tercatat di audit log."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={save}>Simpan</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Jenis" htmlFor="pm-type">
          <Select id="pm-type" value={d.type} onChange={(e) => set({ type: e.target.value as Method })} disabled={!!d.id}>
            {(Object.keys(TYPE) as Method[]).map((t) => (
              <option key={t} value={t}>
                {TYPE[t].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Nama yang tampil ke pelanggan" htmlFor="pm-label" required error={show('label')}>
          <Input id="pm-label" data-autofocus value={d.label} onChange={(e) => set({ label: e.target.value })} placeholder="Contoh: Transfer BRI" aria-invalid={!!show('label')} />
        </Field>
        {d.type === 'TRANSFER' && (
          <>
            <Field label="Bank" htmlFor="pm-bank" required error={show('bankName')}>
              <Input id="pm-bank" value={d.bankName ?? ''} onChange={(e) => set({ bankName: e.target.value })} placeholder="BCA, BRI, Mandiri…" aria-invalid={!!show('bankName')} />
            </Field>
            <Field label="Nomor rekening" htmlFor="pm-account" required error={show('accountNumber')}>
              <Input id="pm-account" inputMode="numeric" value={d.accountNumber ?? ''} onChange={(e) => set({ accountNumber: e.target.value })} className="font-mono" aria-invalid={!!show('accountNumber')} />
            </Field>
            <Field label="Atas nama" htmlFor="pm-owner" required error={show('accountName')} className="sm:col-span-2">
              <Input id="pm-owner" value={d.accountName ?? ''} onChange={(e) => set({ accountName: e.target.value })} aria-invalid={!!show('accountName')} />
            </Field>
          </>
        )}
        {d.type === 'QRIS' && (
          <>
            <Field label="Nama merchant" htmlFor="pm-merchant" required error={show('merchantName')}>
              <Input id="pm-merchant" value={d.merchantName ?? ''} onChange={(e) => set({ merchantName: e.target.value })} placeholder="Sesuai yang tertera di QRIS" aria-invalid={!!show('merchantName')} />
            </Field>
            <Field label="Gambar QRIS" htmlFor="pm-qris" hint="PNG/JPG; disimpan di object storage saat backend aktif.">
              <Input id="pm-qris" type="file" accept="image/png,image/jpeg" className="py-2" />
            </Field>
          </>
        )}
        <Field label="Instruksi untuk pelanggan" htmlFor="pm-instructions" className="sm:col-span-2" hint="Contoh: cantumkan nomor order di berita transfer.">
          <Textarea id="pm-instructions" rows={2} value={d.instructions} onChange={(e) => set({ instructions: e.target.value })} />
        </Field>
      </div>
    </Dialog>
  )
}

export function PaymentMethodsTab() {
  const methods = useDemo((s) => s.outletPaymentMethods)
  const sorted = [...methods].sort((a, b) => a.sortOrder - b.sortOrder)
  const activeCount = methods.filter((m) => m.active).length
  const [editing, setEditing] = useState<Draft | null>(null)

  const swap = (i: number, j: number) => {
    const a = sorted[i]
    const b = sorted[j]
    act((s) => {
      const first = upsertOutletPaymentMethod(s, { ...a, sortOrder: b.sortOrder }, s.tenantActor, new Date())
      return first.ok ? upsertOutletPaymentMethod(first.state, { ...b, sortOrder: a.sortOrder }, s.tenantActor, new Date()) : first
    }, 'Urutan diperbarui')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-fg-muted">
          Pembayaran pelanggan masuk langsung ke rekening/QRIS milik outlet. SwaraPOS hanya mencatat dan membantu verifikasi. Metode aktif tampil sesuai urutan di halaman lacak pelanggan.
        </p>
        <Button
          onClick={() => setEditing({ type: 'TRANSFER', label: '', instructions: '', sortOrder: Math.max(0, ...methods.map((m) => m.sortOrder)) + 1, active: true })}
        >
          <Plus aria-hidden />
          Tambah metode
        </Button>
      </div>

      <ul className="space-y-3">
        {sorted.map((m, i) => {
          const T = TYPE[m.type]
          const lastActive = m.active && activeCount === 1
          return (
            <li key={m.id}>
              <Card className={cn('flex flex-wrap items-center gap-4 p-4', !m.active && 'opacity-60')}>
                <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
                  <T.icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-fg">{m.label}</p>
                    <Badge>{T.label}</Badge>
                    {!m.active && <Badge tone="neutral">Nonaktif</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-fg-muted">{methodSummary(m)}</p>
                  {m.type !== 'CASH' && m.instructions && <p className="mt-0.5 truncate text-xs text-fg-subtle">{m.instructions}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => swap(i, i - 1)} disabled={i === 0} aria-label={`Naikkan ${m.label}`}>
                    <ArrowUp aria-hidden />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => swap(i, i + 1)} disabled={i === sorted.length - 1} aria-label={`Turunkan ${m.label}`}>
                    <ArrowDown aria-hidden />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(m)} aria-label={`Ubah ${m.label}`}>
                    <Pencil aria-hidden />
                  </Button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={m.active}
                    aria-label={`${m.active ? 'Nonaktifkan' : 'Aktifkan'} ${m.label}`}
                    title={lastActive ? 'Minimal satu metode harus aktif' : undefined}
                    disabled={lastActive}
                    onClick={() => act((s) => upsertOutletPaymentMethod(s, { ...m, active: !m.active }, s.tenantActor, new Date()), m.active ? `${m.label} dinonaktifkan` : `${m.label} diaktifkan`)}
                    className={cn(
                      'ml-2 inline-flex h-7 w-12 items-center rounded-full p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                      m.active ? 'bg-primary' : 'bg-border-strong',
                    )}
                  >
                    <span className={cn('size-5 rounded-full bg-white shadow transition-transform', m.active && 'translate-x-5')} />
                  </button>
                </div>
              </Card>
            </li>
          )
        })}
      </ul>
      <p className="flex items-center gap-1.5 text-xs text-fg-subtle">
        <ExternalLink className="size-3.5" aria-hidden />
        Lihat hasilnya dari tombol <span className="font-medium">Halaman lacak</span> di detail order mana pun, atau
        <Link href="/app/order" className="font-medium text-primary">
          buka daftar order
        </Link>
      </p>

      {editing && <MethodForm initial={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
