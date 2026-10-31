'use client'

import { CircleCheck, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { normalizePhoneID } from '@swarapos/core/domain/whatsapp'

type Errors = Partial<Record<'name' | 'business' | 'whatsapp' | 'city', string>>

export function DemoForm() {
  const [errors, setErrors] = useState<Errors>({})
  const [sentTo, setSentTo] = useState<string | null>(null)

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const value = (k: string) => String(data.get(k) ?? '').trim()
    const next: Errors = {}
    if (!value('name')) next.name = 'Nama wajib diisi.'
    if (!value('business')) next.business = 'Nama laundry wajib diisi.'
    if (!normalizePhoneID(value('whatsapp'))) next.whatsapp = 'Masukkan nomor WhatsApp yang valid, contoh 0812-3456-7890.'
    if (!value('city')) next.city = 'Kota wajib diisi.'
    setErrors(next)
    if (Object.keys(next).length === 0) setSentTo(value('name'))
  }

  return (
    <section id="demo" className="relative scroll-mt-20 overflow-hidden py-20 sm:py-24">
      <div className="hero-glow pointer-events-none absolute inset-0 opacity-70" aria-hidden />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-cyan">Demo 20 menit</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-fg sm:text-4xl">
            Lihat alurnya dengan data laundry Anda sendiri
          </h2>
          <p className="mt-4 max-w-lg text-fg-muted">
            Kami tunjukkan cara memindahkan katalog harga, membuat order pertama, dan mengirim link lacak ke
            pelanggan. Gratis, tanpa komitmen.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-surface/80 p-6 shadow-pop backdrop-blur sm:p-8">
          {sentTo ? (
            <div className="flex flex-col items-center py-10 text-center" role="status">
              <CircleCheck className="size-12 text-phase-done" aria-hidden />
              <h3 className="mt-4 text-xl font-semibold text-fg">Terima kasih, {sentTo}!</h3>
              <p className="mt-2 max-w-sm text-sm text-fg-muted">
                Tim kami akan menghubungi Anda lewat WhatsApp untuk menjadwalkan demo.
              </p>
              <Button variant="secondary" className="mt-6" onClick={() => setSentTo(null)}>
                Kirim permintaan lain
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama Anda" htmlFor="demo-name" required error={errors.name}>
                <Input id="demo-name" name="name" autoComplete="name" aria-invalid={!!errors.name} />
              </Field>
              <Field label="Nama laundry" htmlFor="demo-business" required error={errors.business}>
                <Input id="demo-business" name="business" aria-invalid={!!errors.business} />
              </Field>
              <Field label="Nomor WhatsApp" htmlFor="demo-wa" required error={errors.whatsapp}>
                <Input id="demo-wa" name="whatsapp" inputMode="tel" autoComplete="tel" placeholder="0812-3456-7890" aria-invalid={!!errors.whatsapp} />
              </Field>
              <Field label="Kota" htmlFor="demo-city" required error={errors.city}>
                <Input id="demo-city" name="city" autoComplete="address-level2" aria-invalid={!!errors.city} />
              </Field>
              <Field label="Jumlah outlet" htmlFor="demo-outlets" className="sm:col-span-2">
                <Select id="demo-outlets" name="outlets" defaultValue="1">
                  <option value="1">1 outlet</option>
                  <option value="2-3">2–3 outlet</option>
                  <option value="4+">4 outlet atau lebih</option>
                </Select>
              </Field>
              <Button type="submit" size="lg" className="sm:col-span-2">
                <Send aria-hidden />
                Minta jadwal demo
              </Button>
              <p className="text-xs text-fg-subtle sm:col-span-2">
                Data hanya dipakai untuk menghubungi Anda soal demo.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
