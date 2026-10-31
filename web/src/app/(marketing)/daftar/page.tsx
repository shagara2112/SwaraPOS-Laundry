'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { AuthFrame } from '@/components/marketing/auth-frame'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

type Errors = Partial<Record<'name' | 'contact' | 'password' | 'business' | 'agree', string>>

export default function DaftarPage() {
  const router = useRouter()
  const [errors, setErrors] = useState<Errors>({})

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const v = (k: string) => String(data.get(k) ?? '').trim()
    const next: Errors = {}
    if (!v('name')) next.name = 'Nama wajib diisi.'
    if (!v('contact')) next.contact = 'Email atau nomor telepon wajib diisi.'
    if (String(data.get('password') ?? '').length < 8) next.password = 'Password minimal 8 karakter.'
    if (!v('business')) next.business = 'Nama bisnis wajib diisi.'
    if (!data.get('agree')) next.agree = 'Setujui Syarat Layanan dan Kebijakan Privasi untuk melanjutkan.'
    setErrors(next)
    if (Object.keys(next).length === 0) router.push('/onboarding')
  }

  return (
    <AuthFrame
      title="Daftar gratis"
      subtitle="Trial tanpa kartu kredit. Setup bisnis Anda dalam beberapa langkah."
      footer={
        <>
          Sudah punya akun?{' '}
          <Link href="/masuk" className="font-semibold text-primary">
            Masuk
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Nama pemilik" htmlFor="reg-name" required error={errors.name}>
          <Input id="reg-name" name="name" autoComplete="name" aria-invalid={!!errors.name} />
        </Field>
        <Field label="Email atau nomor telepon" htmlFor="reg-contact" required error={errors.contact}>
          <Input id="reg-contact" name="contact" autoComplete="username" aria-invalid={!!errors.contact} />
        </Field>
        <Field label="Password" htmlFor="reg-password" required error={errors.password} hint="Minimal 8 karakter.">
          <Input id="reg-password" name="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} />
        </Field>
        <Field label="Nama bisnis laundry" htmlFor="reg-business" required error={errors.business}>
          <Input id="reg-business" name="business" placeholder="Contoh: Laundry Bersih Kilat" aria-invalid={!!errors.business} />
        </Field>
        <div>
          <label className="flex items-start gap-3 text-sm text-fg-muted">
            <input type="checkbox" name="agree" className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" />
            Saya setuju dengan Syarat Layanan dan Kebijakan Privasi SwaraPOS.
          </label>
          {errors.agree && (
            <p className="mt-1.5 text-xs font-medium text-danger" role="alert">
              {errors.agree}
            </p>
          )}
        </div>
        <Button type="submit" size="lg" className="w-full">
          Buat akun &amp; lanjut setup
          <ArrowRight aria-hidden />
        </Button>
      </form>
    </AuthFrame>
  )
}
