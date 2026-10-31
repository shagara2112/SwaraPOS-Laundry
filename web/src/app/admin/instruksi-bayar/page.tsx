'use client'

import { ArrowDown, ArrowUp, Landmark, Link2, Pencil, Plus, QrCode } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
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
import { upsertInstruction } from '@/lib/store/actions-platform'
import { useDemo } from '@/lib/store/demo-store'
import type { InstructionMethod, PaymentInstruction } from '@/lib/types'

const METHOD = {
  TRANSFER: { label: 'Transfer bank', icon: Landmark },
  LINK: { label: 'Link pembayaran', icon: Link2 },
  QRIS: { label: 'QRIS', icon: QrCode },
}

type Draft = Omit<PaymentInstruction, 'id'> & { id?: string }

function InstructionForm({ initial, onClose }: { initial: Draft; onClose: () => void }) {
  const [d, setD] = useState<Draft>(initial)
  const set = (patch: Partial<Draft>) => setD({ ...d, ...patch })
  const save = () => {
    const r = act((s) => upsertInstruction(s, d, s.adminActor, new Date()), d.id ? 'Instruksi diperbarui' : 'Instruksi ditambahkan')
    if (r.ok) onClose()
  }
  const valid =
    d.label.trim() &&
    (d.method !== 'TRANSFER' || (d.bankName?.trim() && d.accountName?.trim() && d.accountNumber?.trim())) &&
    (d.method !== 'LINK' || /^https:\/\//.test(d.paymentUrl ?? '')) &&
    (d.method !== 'QRIS' || d.merchantName?.trim())
  return (
    <Dialog
      open
      onClose={onClose}
      title={d.id ? 'Ubah instruksi' : 'Instruksi baru'}
      description="Perubahan langsung tampil di halaman Langganan semua tenant dan tercatat di audit log."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={save} disabled={!valid}>
            Simpan
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Metode" htmlFor="ins-method">
          <Select id="ins-method" value={d.method} onChange={(e) => set({ method: e.target.value as InstructionMethod })} disabled={!!d.id}>
            {Object.entries(METHOD).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Label untuk tenant" htmlFor="ins-label" required>
          <Input id="ins-label" data-autofocus value={d.label} onChange={(e) => set({ label: e.target.value })} />
        </Field>
        {d.method === 'TRANSFER' && (
          <>
            <Field label="Bank" htmlFor="ins-bank" required>
              <Input id="ins-bank" value={d.bankName ?? ''} onChange={(e) => set({ bankName: e.target.value })} />
            </Field>
            <Field label="Nomor rekening" htmlFor="ins-acc" required>
              <Input id="ins-acc" inputMode="numeric" value={d.accountNumber ?? ''} onChange={(e) => set({ accountNumber: e.target.value })} />
            </Field>
            <Field label="Nama pemilik rekening" htmlFor="ins-name" required className="sm:col-span-2">
              <Input id="ins-name" value={d.accountName ?? ''} onChange={(e) => set({ accountName: e.target.value })} />
            </Field>
          </>
        )}
        {d.method === 'LINK' && (
          <Field label="URL pembayaran" htmlFor="ins-url" required hint="Harus diawali https://" className="sm:col-span-2">
            <Input id="ins-url" type="url" value={d.paymentUrl ?? ''} onChange={(e) => set({ paymentUrl: e.target.value })} />
          </Field>
        )}
        {d.method === 'QRIS' && (
          <>
            <Field label="Nama merchant" htmlFor="ins-merchant" required>
              <Input id="ins-merchant" value={d.merchantName ?? ''} onChange={(e) => set({ merchantName: e.target.value })} />
            </Field>
            <Field label="Gambar QRIS" htmlFor="ins-qris" hint="PNG/JPG; disimpan di object storage.">
              <Input id="ins-qris" type="file" accept="image/png,image/jpeg" className="py-2" />
            </Field>
          </>
        )}
        <Field label="Instruksi" htmlFor="ins-text" className="sm:col-span-2">
          <Textarea id="ins-text" value={d.instructions} onChange={(e) => set({ instructions: e.target.value })} />
        </Field>
      </div>
    </Dialog>
  )
}

export default function InstruksiBayarPage() {
  const instructions = useDemo((s) => s.platform.instructions)
  const sorted = [...instructions].sort((a, b) => a.sortOrder - b.sortOrder)
  const [editing, setEditing] = useState<Draft | null>(null)

  const swap = (i: number, j: number) => {
    const a = sorted[i]
    const b = sorted[j]
    act((s) => {
      const first = upsertInstruction(s, { ...a, sortOrder: b.sortOrder }, s.adminActor, new Date())
      return first.ok ? upsertInstruction(first.state, { ...b, sortOrder: a.sortOrder }, s.adminActor, new Date()) : first
    }, 'Urutan diperbarui')
  }

  return (
    <>
      <PageHeader
        title="Instruksi bayar"
        description="Cara tenant membayar langganan. Tidak ada pemrosesan otomatis; bukti direview manual."
        actions={
          <Button onClick={() => setEditing({ method: 'TRANSFER', label: '', instructions: '', sortOrder: sorted.length + 1, active: true })}>
            <Plus aria-hidden />
            Instruksi baru
          </Button>
        }
      />
      <ul className="space-y-3">
        {sorted.map((ins, i) => {
          const M = METHOD[ins.method]
          return (
            <li key={ins.id}>
              <Card className={cn('flex flex-wrap items-center gap-4 p-4', !ins.active && 'opacity-60')}>
                <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
                  <M.icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-fg">{ins.label}</p>
                    <Badge>{M.label}</Badge>
                    {!ins.active && <Badge tone="neutral">Nonaktif</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-fg-muted">
                    {ins.method === 'TRANSFER' && `${ins.bankName} ${ins.accountNumber} a.n. ${ins.accountName}`}
                    {ins.method === 'LINK' && ins.paymentUrl}
                    {ins.method === 'QRIS' && `Merchant ${ins.merchantName}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => swap(i, i - 1)} disabled={i === 0} aria-label={`Naikkan ${ins.label}`}>
                    <ArrowUp aria-hidden />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => swap(i, i + 1)} disabled={i === sorted.length - 1} aria-label={`Turunkan ${ins.label}`}>
                    <ArrowDown aria-hidden />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(ins)} aria-label={`Ubah ${ins.label}`}>
                    <Pencil aria-hidden />
                  </Button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={ins.active}
                    aria-label={`${ins.active ? 'Nonaktifkan' : 'Aktifkan'} ${ins.label}`}
                    onClick={() => act((s) => upsertInstruction(s, { ...ins, active: !ins.active }, s.adminActor, new Date()), ins.active ? 'Instruksi dinonaktifkan' : 'Instruksi diaktifkan')}
                    className={cn('ml-2 inline-flex h-7 w-12 items-center rounded-full p-1 transition-colors', ins.active ? 'bg-primary' : 'bg-border-strong')}
                  >
                    <span className={cn('size-5 rounded-full bg-white shadow transition-transform', ins.active && 'translate-x-5')} />
                  </button>
                </div>
              </Card>
            </li>
          )
        })}
      </ul>
      {editing && <InstructionForm initial={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
