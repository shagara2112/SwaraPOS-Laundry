'use client'

import { ArrowLeft, ArrowRight, PartyPopper } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { BrandMark } from '@/components/layout/brand-mark'
import { StepBusiness } from '@/components/onboarding/step-business'
import { StepOutlet } from '@/components/onboarding/step-outlet'
import { StepServices } from '@/components/onboarding/step-services'
import { StepZones } from '@/components/onboarding/step-zones'
import type { WizardState } from '@/components/onboarding/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Stepper } from '@/components/ui/stepper'
import { DEFAULT_ZONES } from '@/lib/domain/delivery-zone'

const STEPS = [
  { label: 'Bisnis', title: 'Kenalkan bisnis Anda', description: 'Nama dan warna ini tampil di nota, label, dan halaman lacak pelanggan.' },
  { label: 'Outlet', title: 'Outlet pertama', description: 'Outlet lain bisa ditambahkan nanti dari Pengaturan.' },
  { label: 'Zona antar', title: 'Zona antar-jemput', description: 'Tarif default dari radius outlet. Sesuaikan dengan area layanan Anda.' },
  { label: 'Layanan', title: 'Layanan & harga', description: 'Mulai dari template, lalu sesuaikan.' },
]

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

const INITIAL: WizardState = {
  business: { name: '', color: '#2D5BFF' },
  outlet: {
    name: '',
    address: '',
    phone: '',
    hours: DAYS.map((day) => ({ day, open: day !== 'Minggu', from: '07:00', to: '21:00' })),
  },
  zones: DEFAULT_ZONES,
  services: [
    { key: 'kilo', name: 'Cuci Kering Setrika Reguler', unit: 'KG', price: 7000, enabled: true },
    { key: 'kilo-exp', name: 'Cuci Kering Setrika Express', unit: 'KG', price: 12000, enabled: true },
    { key: 'setrika', name: 'Setrika Saja', unit: 'KG', price: 5000, enabled: true },
    { key: 'kemeja', name: 'Kemeja / Blus', unit: 'ITEM', price: 15000, enabled: true },
    { key: 'bedcover', name: 'Bed Cover', unit: 'ITEM', price: 35000, enabled: true },
    { key: 'sepatu', name: 'Cuci Sepatu', unit: 'PAIR', price: 45000, enabled: false },
    { key: 'karpet', name: 'Cuci Karpet', unit: 'SQM', price: 15000, enabled: false },
    { key: 'parfum', name: 'Parfum Premium', unit: 'ADDON', price: 5000, enabled: true },
  ],
}

function validate(step: number, s: WizardState): Record<string, string> {
  const errors: Record<string, string> = {}
  if (step === 0 && !s.business.name.trim()) errors.name = 'Nama bisnis wajib diisi.'
  if (step === 1) {
    if (!s.outlet.name.trim()) errors.outletName = 'Nama outlet wajib diisi.'
    if (!s.outlet.address.trim()) errors.address = 'Alamat wajib diisi.'
  }
  return errors
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [state, setState] = useState<WizardState>(INITIAL)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const last = step === STEPS.length - 1

  const next = () => {
    const found = validate(step, state)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    if (last) router.push('/app')
    else setStep(step + 1)
  }

  const meta = STEPS[step]

  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Beranda">
            <BrandMark subtitle="Setup bisnis" />
          </Link>
          <span className="text-sm text-fg-subtle">
            Langkah {step + 1} dari {STEPS.length}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Stepper steps={STEPS.map((s) => s.label)} current={step} />
        <Card className="mt-8 p-5 sm:p-8">
          <h1 className="text-xl font-bold tracking-tight text-fg">{meta.title}</h1>
          <p className="mt-1 text-sm text-fg-muted">{meta.description}</p>
          <div className="mt-6" key={step}>
            {step === 0 && <StepBusiness value={state.business} onChange={(business) => setState({ ...state, business })} errors={errors} />}
            {step === 1 && <StepOutlet value={state.outlet} onChange={(outlet) => setState({ ...state, outlet })} errors={errors} />}
            {step === 2 && <StepZones value={state.zones} onChange={(zones) => setState({ ...state, zones })} errors={errors} />}
            {step === 3 && <StepServices value={state.services} onChange={(services) => setState({ ...state, services })} errors={errors} />}
          </div>
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6">
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 0}>
              <ArrowLeft aria-hidden />
              Kembali
            </Button>
            <Button size="lg" onClick={next}>
              {last ? (
                <>
                  <PartyPopper aria-hidden />
                  Selesai, buka dashboard
                </>
              ) : (
                <>
                  Lanjut
                  <ArrowRight aria-hidden />
                </>
              )}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  )
}
