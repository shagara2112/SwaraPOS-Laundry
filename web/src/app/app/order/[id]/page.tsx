'use client'

import { ArrowLeft, CalendarClock, MapPin, Pencil, Phone, QrCode, Receipt, SearchX, Store, Zap } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdjustItemsDialog } from '@/components/order/adjust-items-dialog'
import { OrderItemsTable } from '@/components/order/order-items-table'
import { OrderLabel } from '@/components/order/order-label'
import { OrderTimeline } from '@/components/order/order-timeline'
import { PaymentPanel } from '@/components/order/payment-panel'
import { QcPanel } from '@/components/order/qc-panel'
import { ReceiptDialog } from '@/components/order/receipt-dialog'
import { StatusActions } from '@/components/order/status-actions'
import { StatusBadge } from '@/components/order/status-badge'
import { WhatsAppPanel } from '@/components/order/whatsapp-panel'
import { Badge } from '@/components/ui/badge'
import { Button, ButtonLink } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { isTerminal } from '@swarapos/core/domain/order-status'
import { formatDateTime } from '@swarapos/core/format'
import { CHANNEL_LABEL, formatDueIn, HANDBACK_LABEL, INTAKE_LABEL } from '@swarapos/core/labels'
import { isLate } from '@swarapos/core/selectors'
import { canAdjustItems } from '@swarapos/core/store/actions-order'
import { useDemo } from '@/lib/store/demo-store'
import { useNow } from '@/lib/use-now'

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const now = useNow()
  const order = useDemo((s) => s.orders.find((o) => o.id === id))
  const customer = useDemo((s) => s.customers.find((c) => c.id === order?.customerId))
  const outlet = useDemo((s) => s.outlets.find((o) => o.id === order?.outletId))
  const [labelOpen, setLabelOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [adjusting, setAdjusting] = useState(false)
  const [justCreated, setJustCreated] = useState(false)

  // Order baru dari kasir membuka label otomatis (?baru=1).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('baru')) {
      setJustCreated(true)
      setLabelOpen(true)
    }
  }, [])

  if (!order || !customer || !outlet) {
    return (
      <Card>
        <EmptyState
          icon={SearchX}
          title="Order tidak ditemukan"
          description="Order mungkin sudah dihapus dari data demo atau tautannya salah."
          action={<ButtonLink href="/app/order">Kembali ke daftar order</ButtonLink>}
        />
      </Card>
    )
  }

  const late = isLate(order, now)

  return (
    <>
      <Link href="/app/order" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden />
        Semua order
      </Link>

      <Card className="mb-6">
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-2xl font-bold tracking-tight text-fg">{order.orderNo}</h1>
              <StatusBadge status={order.status} />
              {order.express && (
                <Badge tone="warning">
                  <Zap aria-hidden />
                  Express
                </Badge>
              )}
              {late && <Badge tone="danger">{formatDueIn(order.dueAt, now)}</Badge>}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-fg-muted">
              <span className="font-semibold text-fg">{customer.name}</span>
              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-4" aria-hidden />
                {customer.phone}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Store className="size-4" aria-hidden />
                {outlet.name}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="size-4" aria-hidden />
                Estimasi {formatDateTime(order.dueAt)}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge>{INTAKE_LABEL[order.intake]}</Badge>
              <Badge>{HANDBACK_LABEL[order.handback]}</Badge>
              <Badge>Kanal: {CHANNEL_LABEL[order.channel]}</Badge>
            </div>
          </div>
          {!isTerminal(order.status) && (
            <div className="shrink-0 lg:max-w-md lg:text-right">
              <StatusActions order={order} />
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="min-w-0 space-y-6">
          {order.status === 'QUALITY_CHECK' && <QcPanel key={order.version} order={order} />}

          <Card>
            <CardHeader
              title="Item & harga"
              action={
                canAdjustItems(order.status) && (
                  <Button variant="secondary" size="sm" onClick={() => setAdjusting(true)}>
                    <Pencil aria-hidden />
                    Koreksi item
                  </Button>
                )
              }
            />
            <CardBody className="pt-2">
              <OrderItemsTable order={order} />
            </CardBody>
          </Card>

          {(order.conditionNotes.length > 0 || customer.notes) && (
            <Card>
              <CardHeader title="Catatan kondisi & preferensi" />
              <CardBody className="space-y-3 pt-3">
                {order.conditionNotes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {order.conditionNotes.map((n) => (
                      <Badge key={n} tone="exception">
                        {n}
                      </Badge>
                    ))}
                  </div>
                )}
                {customer.notes && <p className="text-sm text-fg-muted">{customer.notes}</p>}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Riwayat status" description="Setiap perubahan mencatat petugas, waktu, dan catatan." />
            <CardBody>
              <OrderTimeline history={order.history} />
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-6">
          <PaymentPanel order={order} />
          <WhatsAppPanel order={order} customer={customer} outlet={outlet} />
          <Card>
            <CardHeader title="Nota, label & lacak" />
            <CardBody className="space-y-3 pt-3">
              <p className="text-sm text-fg-muted">Nota untuk pelanggan; QR di nota dan label membuka halaman lacak order ini.</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setReceiptOpen(true)}>
                  <Receipt aria-hidden />
                  Cetak nota
                </Button>
                <Button variant="secondary" onClick={() => setLabelOpen(true)}>
                  <QrCode aria-hidden />
                  Lihat label
                </Button>
                <ButtonLink href={`/lacak/${order.trackingToken}`} variant="ghost" target="_blank">
                  <MapPin aria-hidden />
                  Halaman lacak
                </ButtonLink>
              </div>
            </CardBody>
          </Card>
        </aside>
      </div>

      {adjusting && <AdjustItemsDialog order={order} onClose={() => setAdjusting(false)} />}
      {receiptOpen && <ReceiptDialog open onClose={() => setReceiptOpen(false)} order={order} outlet={outlet} customer={customer} />}

      <Dialog
        open={labelOpen}
        onClose={() => setLabelOpen(false)}
        size="sm"
        title={justCreated ? 'Order tersimpan' : 'Label order'}
        description={justCreated ? 'Cetak label dan tempel pada kantong cucian.' : 'Tempel label pada kantong cucian.'}
      >
        <OrderLabel order={order} outlet={outlet} customer={customer} />
      </Dialog>
    </>
  )
}
