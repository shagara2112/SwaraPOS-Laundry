'use client'

import { LockKeyhole } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { verifyTrackingPhone } from '@swarapos/core/domain/tracking'

/** Pelanggan membuka detail order dengan 4 digit terakhir nomor WhatsApp-nya (PRD §F). */
export function PhoneGate({ orderNo, phone, onVerified }: { orderNo: string; phone: string; onVerified: () => void }) {
  const [digits, setDigits] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (verifyTrackingPhone(phone, digits)) onVerified()
    else setError('Nomor tidak cocok. Periksa 4 digit terakhir nomor WhatsApp Anda.')
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-border bg-surface p-6 shadow-card">
      <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
        <LockKeyhole className="size-6" aria-hidden />
      </span>
      <h1 className="mt-4 text-xl font-bold text-fg">Lacak cucian Anda</h1>
      <p className="mt-1.5 text-sm text-fg-muted">
        Order <span className="font-mono font-semibold text-fg">{orderNo}</span>. Masukkan 4 digit terakhir nomor
        WhatsApp yang terdaftar untuk melihat detail.
      </p>
      <label htmlFor="last4" className="mt-5 block text-sm font-medium text-fg">
        4 digit terakhir
      </label>
      <Input
        id="last4"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        value={digits}
        onChange={(e) => {
          setDigits(e.target.value.replace(/\D/g, ''))
          setError(null)
        }}
        className="mt-1.5 h-14 text-center font-mono text-2xl tracking-[0.6em]"
        aria-invalid={!!error}
        aria-describedby={error ? 'last4-error' : undefined}
      />
      {error && (
        <p id="last4-error" className="mt-2 text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="mt-5 w-full" disabled={digits.length !== 4}>
        Lihat status
      </Button>
    </form>
  )
}
