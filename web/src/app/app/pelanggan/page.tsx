'use client'

import { MapPin, Phone, Search, StickyNote, UserPlus, Users } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { StatusBadge } from '@/components/order/status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, Drawer } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Table, Td, Th, Tr } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { normalizePhoneID } from '@swarapos/core/domain/whatsapp'
import { formatDate, formatRupiah } from '@swarapos/core/format'
import { act } from '@/lib/store/act'
import { addCustomer } from '@swarapos/core/store/actions-catalog'
import { useDemo } from '@/lib/store/demo-store'
import type { Customer, Order } from '@swarapos/core/types'

type Row = { customer: Customer; orders: Order[]; spent: number; lastAt?: string }

function AddCustomerDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' })
  const [touched, setTouched] = useState(false)
  const nameError = touched && !form.name.trim() ? 'Nama wajib diisi.' : undefined
  const phoneError = touched && !normalizePhoneID(form.phone) ? 'Nomor WhatsApp tidak valid.' : undefined
  const save = () => {
    setTouched(true)
    const r = act((s) => addCustomer(s, form, s.tenantActor, new Date()), 'Pelanggan ditambahkan')
    if (r.ok) onClose()
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title="Pelanggan baru"
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
        <Field label="Nama" htmlFor="c-name" required error={nameError}>
          <Input id="c-name" data-autofocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!nameError} />
        </Field>
        <Field label="WhatsApp" htmlFor="c-phone" required error={phoneError} hint="Nomor yang sama tidak akan dibuat dobel.">
          <Input id="c-phone" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} aria-invalid={!!phoneError} />
        </Field>
        <Field label="Alamat" htmlFor="c-address" className="sm:col-span-2">
          <Input id="c-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </Field>
        <Field label="Catatan & preferensi" htmlFor="c-notes" className="sm:col-span-2">
          <Textarea id="c-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Contoh: tanpa pewangi, lipat kemeja" />
        </Field>
      </div>
    </Dialog>
  )
}

export default function PelangganPage() {
  const customers = useDemo((s) => s.customers)
  const orders = useDemo((s) => s.orders)
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const rows: Row[] = useMemo(
    () =>
      customers
        .map((customer) => {
          const own = orders.filter((o) => o.customerId === customer.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          return {
            customer,
            orders: own,
            spent: own.filter((o) => o.status !== 'CANCELLED').reduce((sum, o) => sum + o.totals.total, 0),
            lastAt: own[0]?.createdAt,
          }
        })
        .sort((a, b) => (b.lastAt ?? b.customer.createdAt).localeCompare(a.lastAt ?? a.customer.createdAt)),
    [customers, orders],
  )

  const q = query.trim().toLowerCase()
  const digits = q.replace(/\D/g, '')
  const visible = rows.filter(
    (r) => !q || r.customer.name.toLowerCase().includes(q) || (digits.length >= 3 && r.customer.phone.replace(/\D/g, '').includes(digits)),
  )
  const open = rows.find((r) => r.customer.id === openId)

  return (
    <>
      <PageHeader
        title="Pelanggan"
        description={`${customers.length} pelanggan tercatat`}
        actions={
          <Button onClick={() => setAdding(true)}>
            <UserPlus aria-hidden />
            Pelanggan baru
          </Button>
        }
      />
      <Card>
        <div className="border-b border-border p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <Input data-search value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama atau nomor WhatsApp  ( / )" className="pl-9" aria-label="Cari pelanggan" />
          </div>
        </div>
        {visible.length === 0 ? (
          <EmptyState icon={Users} title="Pelanggan tidak ditemukan" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Nama</Th>
                <Th>WhatsApp</Th>
                <Th className="hidden lg:table-cell">Alamat</Th>
                <Th className="text-right">Order</Th>
                <Th className="text-right">Total belanja</Th>
                <Th className="hidden md:table-cell">Terakhir</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <Tr key={r.customer.id} className="cursor-pointer hover:bg-surface-2/60" onClick={() => setOpenId(r.customer.id)}>
                  <Td>
                    <button type="button" className="text-left font-medium text-fg hover:text-primary" onClick={() => setOpenId(r.customer.id)}>
                      {r.customer.name}
                    </button>
                  </Td>
                  <Td className={normalizePhoneID(r.customer.phone) ? 'tabular text-fg-muted' : 'tabular text-danger'}>{r.customer.phone}</Td>
                  <Td className="hidden max-w-xs truncate text-fg-muted lg:table-cell">{r.customer.address ?? '—'}</Td>
                  <Td className="tabular text-right">{r.orders.length}</Td>
                  <Td className="tabular text-right font-semibold">{formatRupiah(r.spent)}</Td>
                  <Td className="hidden text-fg-muted md:table-cell">{r.lastAt ? formatDate(r.lastAt) : '—'}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {adding && <AddCustomerDialog onClose={() => setAdding(false)} />}

      <Drawer open={!!open} onClose={() => setOpenId(null)} title={open?.customer.name ?? ''}>
        {open && (
          <div className="space-y-5">
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 text-fg">
                <Phone className="size-4 text-fg-subtle" aria-hidden />
                {open.customer.phone}
              </p>
              <p className="flex gap-2 text-fg-muted">
                <MapPin className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden />
                {open.customer.address ?? 'Belum ada alamat'}
              </p>
              {open.customer.notes && (
                <p className="flex gap-2 rounded-xl bg-surface-2 p-3 text-fg-muted">
                  <StickyNote className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden />
                  {open.customer.notes}
                </p>
              )}
            </div>
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[
                ['Order', open.orders.length],
                ['Belanja', formatRupiah(open.spent)],
                ['Sejak', formatDate(open.customer.createdAt)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-surface-2 p-3">
                  <dt className="text-xs text-fg-subtle">{label}</dt>
                  <dd className="tabular mt-1 text-sm font-semibold text-fg">{value}</dd>
                </div>
              ))}
            </dl>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-fg">Riwayat order</h3>
              {open.orders.length === 0 ? (
                <p className="text-sm text-fg-subtle">Belum ada order.</p>
              ) : (
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {open.orders.map((o) => (
                    <li key={o.id}>
                      <Link href={`/app/order/${o.id}`} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-surface-2">
                        <div>
                          <p className="font-mono text-sm font-semibold text-fg">{o.orderNo}</p>
                          <p className="text-xs text-fg-subtle">
                            {formatDate(o.createdAt)} · {formatRupiah(o.totals.total)}
                          </p>
                        </div>
                        <StatusBadge status={o.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </>
  )
}
