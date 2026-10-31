'use client'

import { SearchX } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BrandLogo } from '@/components/layout/brand-mark'
import { BillCard } from '@/components/tracking/bill-card'
import { CustomerTimeline } from '@/components/tracking/customer-timeline'
import { OutletContact } from '@/components/tracking/outlet-contact'
import { PhoneGate } from '@/components/tracking/phone-gate'
import { StatusHero } from '@/components/tracking/status-hero'
import { Skeleton } from '@/components/ui/skeleton'
import { useDemo } from '@/lib/store/demo-store'
import { useHydrated } from '@/lib/store/use-hydrated'

const verifiedKey = (token: string) => `swarapos-lacak-${token}`

export default function LacakPage() {
  const { token } = useParams<{ token: string }>()
  const hydrated = useHydrated()
  const order = useDemo((s) => s.orders.find((o) => o.trackingToken === token))
  const customer = useDemo((s) => s.customers.find((c) => c.id === order?.customerId))
  const outlet = useDemo((s) => s.outlets.find((o) => o.id === order?.outletId))
  const tenantName = useDemo((s) => s.tenant.name)
  const methods = useDemo((s) => s.outletPaymentMethods)
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    try {
      setVerified(sessionStorage.getItem(verifiedKey(token)) === '1')
    } catch {
      // sessionStorage diblokir: pelanggan cukup verifikasi ulang.
    }
  }, [token])

  const markVerified = () => {
    setVerified(true)
    try {
      sessionStorage.setItem(verifiedKey(token), '1')
    } catch {
      // Abaikan.
    }
  }

  return (
    <div className="mx-auto max-w-[30rem] px-4 pb-10">
      <header className="flex items-center gap-3 py-5">
        <span className="grid size-10 place-items-center rounded-xl bg-primary text-base font-bold text-white">{tenantName.charAt(0)}</span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-fg">{tenantName}</p>
          <p className="text-xs text-fg-subtle">{outlet?.name.replace(`${tenantName} `, 'Outlet ') ?? 'Pelacakan order'}</p>
        </div>
      </header>

      {!hydrated ? (
        <div className="space-y-4" role="status" aria-label="Memuat">
          <Skeleton className="h-52 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
        </div>
      ) : !order || !customer || !outlet ? (
        <div className="rounded-3xl border border-border bg-surface p-8 text-center shadow-card">
          <SearchX className="mx-auto size-10 text-fg-subtle" aria-hidden />
          <h1 className="mt-4 text-lg font-bold text-fg">Order tidak ditemukan</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Link ini mungkin salah atau sudah tidak berlaku. Buka link terbaru dari pesan WhatsApp outlet, atau hubungi
            outlet langsung.
          </p>
          <p className="mt-4 rounded-xl bg-surface-2 px-3 py-2 text-xs text-fg-subtle">
            Mode demo: data order tersimpan di browser yang sama dengan dashboard.
          </p>
        </div>
      ) : !verified ? (
        <PhoneGate orderNo={order.orderNo} phone={customer.phone} onVerified={markVerified} />
      ) : (
        <div className="space-y-4 animate-rise">
          <StatusHero order={order} />
          <p className="px-1 text-xs text-fg-subtle">
            Order <span className="font-mono font-semibold text-fg-muted">{order.orderNo}</span> atas nama {customer.name}
          </p>
          <BillCard order={order} outlet={outlet} methods={methods} />
          <CustomerTimeline order={order} />
          <OutletContact outlet={outlet} orderNo={order.orderNo} />
        </div>
      )}

      <footer className="mt-8 flex items-center justify-center gap-2 text-xs text-fg-subtle">
        <BrandLogo className="size-5" />
        Didukung SwaraPOS Laundry
      </footer>
    </div>
  )
}
