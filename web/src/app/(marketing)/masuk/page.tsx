'use client'

import { Building2, Crown, KeyRound, MessageSquareText } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { AuthFrame } from '@/components/marketing/auth-frame'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Tabs } from '@/components/ui/tabs'

function PasswordForm({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    if (!String(data.get('id')).trim() || !String(data.get('password'))) {
      setError('Isi email/nomor telepon dan password.')
      return
    }
    onDone()
  }
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Email atau nomor telepon" htmlFor="login-id">
        <Input id="login-id" name="id" autoComplete="username" placeholder="nama@laundry.id" />
      </Field>
      <Field label="Password" htmlFor="login-password" error={error}>
        <Input id="login-password" name="password" type="password" autoComplete="current-password" />
      </Field>
      <div className="flex justify-end">
        <span className="text-sm font-medium text-primary">Lupa password?</span>
      </div>
      <Button type="submit" size="lg" className="w-full">
        <KeyRound aria-hidden />
        Masuk
      </Button>
    </form>
  )
}

function OtpForm({ onDone }: { onDone: () => void }) {
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (seconds <= 0) return
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds])

  return (
    <div className="space-y-4">
      <Field label="Nomor WhatsApp" htmlFor="otp-phone">
        <Input id="otp-phone" inputMode="tel" placeholder="0812-3456-7890" disabled={sent} />
      </Field>
      {!sent ? (
        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            setSent(true)
            setSeconds(60)
          }}
        >
          <MessageSquareText aria-hidden />
          Kirim kode OTP
        </Button>
      ) : (
        <>
          <Field label="Kode 6 digit" htmlFor="otp-code" hint="Kode berlaku 5 menit. Mode demo: isi 6 angka apa saja.">
            <Input
              id="otp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="text-center font-mono text-lg tracking-[0.5em]"
            />
          </Field>
          <Button size="lg" className="w-full" disabled={code.length !== 6} onClick={onDone}>
            Verifikasi &amp; masuk
          </Button>
          <p className="text-center text-sm text-fg-subtle">
            {seconds > 0 ? (
              `Kirim ulang dalam ${seconds} detik`
            ) : (
              <button type="button" className="font-medium text-primary" onClick={() => setSeconds(60)}>
                Kirim ulang kode
              </button>
            )}
          </p>
        </>
      )}
    </div>
  )
}

export default function MasukPage() {
  const router = useRouter()
  const [tab, setTab] = useState('password')

  return (
    <AuthFrame
      title="Masuk ke SwaraPOS"
      subtitle="Kelola order, produksi, dan pelanggan laundry Anda."
      footer={
        <>
          Belum punya akun?{' '}
          <Link href="/daftar" className="font-semibold text-primary">
            Daftar gratis
          </Link>
        </>
      }
    >
      <Tabs
        items={[
          { id: 'password', label: 'Password' },
          { id: 'otp', label: 'Kode OTP' },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-5"
      />
      {tab === 'password' ? <PasswordForm onDone={() => router.push('/app')} /> : <OtpForm onDone={() => router.push('/app')} />}

      <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Mode demo</p>
        <div className="mt-3 grid gap-2">
          <Button variant="secondary" className="justify-start" onClick={() => router.push('/app')}>
            <Building2 aria-hidden />
            Masuk sebagai Owner Laundry
          </Button>
          <Button variant="secondary" className="justify-start" onClick={() => router.push('/admin')}>
            <Crown aria-hidden />
            Masuk sebagai Super Admin
          </Button>
        </div>
      </div>
    </AuthFrame>
  )
}
