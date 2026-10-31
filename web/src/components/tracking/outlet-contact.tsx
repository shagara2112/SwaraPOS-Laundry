import { Clock, MapPin, MessageCircle } from 'lucide-react'
import { buttonClasses } from '@/components/ui/button'
import { buildWaUrl } from '@swarapos/core/domain/whatsapp'
import type { Outlet } from '@swarapos/core/types'

export function OutletContact({ outlet, orderNo }: { outlet: Outlet; orderNo: string }) {
  const chatUrl = buildWaUrl(outlet.phone, `Halo ${outlet.name}, saya ingin menanyakan order ${orderNo}.`)
  return (
    <section className="rounded-3xl border border-border bg-surface p-5 shadow-card">
      <h2 className="text-base font-semibold text-fg">{outlet.name}</h2>
      <p className="mt-3 flex gap-2 text-sm text-fg-muted">
        <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
        {outlet.address}
      </p>
      <p className="mt-2 flex gap-2 text-sm text-fg-muted">
        <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
        {outlet.hours}
      </p>
      {chatUrl && (
        <a href={chatUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses('whatsapp', 'lg', 'mt-4 w-full')}>
          <MessageCircle aria-hidden />
          Chat outlet
        </a>
      )}
    </section>
  )
}
