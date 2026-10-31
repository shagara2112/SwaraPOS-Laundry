'use client'

import { Check, MessageCircle } from 'lucide-react'
import { useOnline } from '@/components/layout/offline-indicator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { buildWaMessage, buildWaUrl, WA_EVENT_LABEL } from '@/lib/domain/whatsapp'
import { formatDateTime } from '@/lib/format'
import { WA_STATE } from '@/lib/labels'
import { amountDue, trackingUrl } from '@/lib/selectors'
import { act } from '@/lib/store/act'
import { markWhatsApp } from '@/lib/store/actions-order'
import type { Customer, Order, Outlet } from '@/lib/types'

/**
 * Notifikasi WhatsApp manual (PRD §F): tombol membuka wa.me dengan pesan terisi,
 * staf menekan kirim di WhatsApp, lalu menandai terkirim di sini.
 */
export function WhatsAppPanel({ order, customer, outlet }: { order: Order; customer: Customer; outlet: Outlet }) {
  const online = useOnline()
  const logs = [...order.whatsapp].reverse()

  const urlFor = (event: Order['whatsapp'][number]['event']) =>
    buildWaUrl(
      customer.phone,
      buildWaMessage(event, {
        customerName: customer.name,
        orderNo: order.orderNo,
        outletName: outlet.name,
        trackingUrl: trackingUrl(order.trackingToken, window.location.origin),
        amountDue: amountDue(order),
      }),
    )

  const invalidPhone = buildWaUrl(customer.phone, 'x') === null

  return (
    <Card>
      <CardHeader title="Notifikasi WhatsApp" description={`Ke ${customer.phone}`} />
      <CardBody className="space-y-3">
        {invalidPhone && (
          <p className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger" role="alert">
            Nomor WhatsApp pelanggan tidak valid. Perbarui nomor di data pelanggan untuk mengirim notifikasi.
          </p>
        )}
        {logs.length === 0 && <p className="text-sm text-fg-subtle">Belum ada notifikasi untuk status ini.</p>}
        {logs.map((log) => {
          const state = WA_STATE[log.state]
          return (
            <div key={log.id} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-fg">{WA_EVENT_LABEL[log.event]}</p>
                <Badge tone={state.tone}>{state.label}</Badge>
              </div>
              {log.updatedAt && (
                <p className="mt-1 text-xs text-fg-subtle">
                  {formatDateTime(log.updatedAt)}
                  {log.actor && ` · ${log.actor.name}`}
                </p>
              )}
              {log.state !== 'SENT' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="whatsapp"
                    size="sm"
                    disabled={invalidPhone || !online}
                    title={!online ? 'Butuh koneksi internet' : undefined}
                    onClick={() => {
                      const url = urlFor(log.event)
                      if (!url) return
                      window.open(url, '_blank', 'noopener,noreferrer')
                      act((s) => markWhatsApp(s, order.id, log.id, 'OPENED', s.tenantActor, new Date()))
                    }}
                  >
                    <MessageCircle aria-hidden />
                    Kirim WhatsApp
                  </Button>
                  {log.state === 'OPENED' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => act((s) => markWhatsApp(s, order.id, log.id, 'SENT', s.tenantActor, new Date()), 'Ditandai terkirim')}
                    >
                      <Check aria-hidden />
                      Tandai terkirim
                    </Button>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {!online && <p className="text-xs text-fg-subtle">Kirim WhatsApp menunggu koneksi agar link lacak menunjuk data yang sudah tersinkron.</p>}
      </CardBody>
    </Card>
  )
}
