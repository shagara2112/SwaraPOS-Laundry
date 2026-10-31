'use client'

import { Bike, CalendarClock, MapPin, PackageCheck, Truck } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { ReasonDialog } from '@/components/order/reason-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Tabs } from '@/components/ui/tabs'
import { formatDateTime, formatRupiah } from '@swarapos/core/format'
import { DELIVERY_STATUS } from '@swarapos/core/labels'
import { act } from '@/lib/store/act'
import { assignCourier, updateDeliveryTask } from '@swarapos/core/store/actions-catalog'
import { transitionOrder } from '@swarapos/core/store/actions-order'
import { useDemo } from '@/lib/store/demo-store'
import { useCustomerMap, useOutletOrders } from '@/lib/store/hooks'
import type { DeliveryTask, DeliveryTaskStatus } from '@swarapos/core/types'

const NEXT_STEP: Partial<Record<DeliveryTaskStatus, { to: DeliveryTaskStatus; label: string }>> = {
  ASSIGNED: { to: 'ACCEPTED', label: 'Diterima kurir' },
  ACCEPTED: { to: 'ON_THE_WAY', label: 'Berangkat' },
  ON_THE_WAY: { to: 'ARRIVED', label: 'Tiba di lokasi' },
}

const GROUPS: { id: string; label: string; statuses: DeliveryTaskStatus[] }[] = [
  { id: 'todo', label: 'Perlu ditugaskan', statuses: ['UNASSIGNED', 'FAILED'] },
  { id: 'running', label: 'Berjalan', statuses: ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED'] },
  { id: 'done', label: 'Selesai', statuses: ['DONE'] },
]

function ProofDialog({ task, onClose }: { task: DeliveryTask; onClose: () => void }) {
  const [receiver, setReceiver] = useState('')
  const [method, setMethod] = useState<'PHOTO' | 'SIGNATURE' | 'PIN'>('PHOTO')
  const save = () => {
    const r = act(
      (s) => updateDeliveryTask(s, task.id, 'DONE', { proof: { receiverName: receiver, method } }, s.tenantActor, new Date()),
      task.type === 'PICKUP' ? 'Cucian dijemput' : 'Cucian diterima pelanggan',
    )
    if (r.ok) onClose()
  }
  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title={task.type === 'PICKUP' ? 'Bukti jemput' : 'Bukti serah-terima'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={save} disabled={!receiver.trim()}>
            Simpan bukti
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={task.type === 'PICKUP' ? 'Diserahkan oleh' : 'Nama penerima'} htmlFor="receiver" required>
          <Input id="receiver" data-autofocus value={receiver} onChange={(e) => setReceiver(e.target.value)} />
        </Field>
        <Field label="Jenis bukti" htmlFor="proof-method">
          <Select id="proof-method" value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
            <option value="PHOTO">Foto</option>
            <option value="SIGNATURE">Tanda tangan</option>
            <option value="PIN">PIN / OTP pelanggan</option>
          </Select>
        </Field>
        <div className="grid h-28 place-items-center rounded-xl border border-dashed border-border-strong text-center text-xs text-fg-subtle">
          {method === 'PHOTO' ? 'Foto diambil dari aplikasi kurir (Android)' : method === 'SIGNATURE' ? 'Area tanda tangan di aplikasi kurir' : 'Pelanggan menyebutkan PIN dari WhatsApp'}
        </div>
      </div>
    </Dialog>
  )
}

export default function PengantaranPage() {
  const orders = useOutletOrders()
  const customers = useCustomerMap()
  const allTasks = useDemo((s) => s.deliveryTasks)
  const staff = useDemo((s) => s.staff)
  const activeOutletId = useDemo((s) => s.activeOutletId)
  const [tab, setTab] = useState<'PICKUP' | 'DELIVERY'>('PICKUP')
  const [courierPick, setCourierPick] = useState<Record<string, string>>({})
  const [proofFor, setProofFor] = useState<DeliveryTask | null>(null)
  const [failFor, setFailFor] = useState<DeliveryTask | null>(null)

  const orderMap = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders])
  const tasks = allTasks.filter((t) => orderMap.has(t.orderId))
  // Tugas terbuka hanya relevan selama order memang menunggu dijemput/diantar (bukan batal, ditahan, atau sudah lewat).
  const relevant = (t: DeliveryTask) => {
    const status = orderMap.get(t.orderId)?.status
    return t.type === 'PICKUP' ? status === 'REQUESTED' || status === 'PICKUP_ASSIGNED' : status === 'OUT_FOR_DELIVERY'
  }
  const inGroup = (t: DeliveryTask, statuses: DeliveryTaskStatus[]) => statuses.includes(t.status) && (t.status === 'DONE' || relevant(t))
  const couriers = staff.filter((s) => s.role === 'COURIER' && s.outletId === activeOutletId)
  const courierName = (id?: string) => staff.find((s) => s.id === id)?.name
  const readyToDeliver = orders.filter(
    (o) => o.status === 'READY_FOR_PICKUP' && o.handback === 'DELIVERY' && !tasks.some((t) => t.orderId === o.id && t.type === 'DELIVERY'),
  )
  const ofType = tasks.filter((t) => t.type === tab).sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))

  const step = (task: DeliveryTask, to: DeliveryTaskStatus, label: string) =>
    act((s) => updateDeliveryTask(s, task.id, to, {}, s.tenantActor, new Date()), label)

  return (
    <>
      <PageHeader title="Pickup & antar" description="Penugasan kurir manual. Biaya dihitung dari zona radius outlet." />

      {tab === 'DELIVERY' && readyToDeliver.length > 0 && (
        <Card className="mb-5 border-phase-ready/40 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-fg">
            <PackageCheck className="size-5 text-phase-ready" aria-hidden />
            {readyToDeliver.length} order siap diantar
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {readyToDeliver.map((o) => (
              <li key={o.id}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    act((s) => transitionOrder(s, o.id, 'OUT_FOR_DELIVERY', {}, s.tenantActor, new Date()), `Tugas antar dibuat untuk ${o.orderNo}`)
                  }
                >
                  <Truck aria-hidden />
                  {o.orderNo} · {customers.get(o.customerId)?.name}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Tabs
        className="mb-5 w-fit"
        value={tab}
        onChange={(v) => setTab(v as 'PICKUP' | 'DELIVERY')}
        items={[
          { id: 'PICKUP', label: 'Jemput', count: tasks.filter((t) => t.type === 'PICKUP' && t.status !== 'DONE' && relevant(t)).length },
          { id: 'DELIVERY', label: 'Antar', count: tasks.filter((t) => t.type === 'DELIVERY' && t.status !== 'DONE' && relevant(t)).length },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        {GROUPS.map((group) => {
          const list = ofType.filter((t) => inGroup(t, group.statuses))
          return (
            <section key={group.id} aria-label={group.label}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg-muted">
                {group.label}
                <span className="tabular rounded-full bg-surface-2 px-2 text-xs">{list.length}</span>
              </h2>
              {list.length === 0 ? (
                <Card>
                  <EmptyState icon={tab === 'PICKUP' ? Bike : Truck} title="Tidak ada tugas" className="py-8" />
                </Card>
              ) : (
                <ul className="space-y-3">
                  {list.map((task) => {
                    const order = orderMap.get(task.orderId)!
                    const customer = customers.get(order.customerId)
                    const st = DELIVERY_STATUS[task.status]
                    const next = NEXT_STEP[task.status]
                    return (
                      <li key={task.id}>
                        <Card className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <Link href={`/app/order/${order.id}`} className="font-mono text-sm font-semibold text-fg hover:text-primary">
                                {order.orderNo}
                              </Link>
                              <p className="truncate text-sm font-medium text-fg">{customer?.name}</p>
                            </div>
                            <Badge tone={st.tone}>{st.label}</Badge>
                          </div>
                          <p className="mt-2 flex gap-1.5 text-xs text-fg-muted">
                            <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                            {task.address} · {task.distanceKm.toLocaleString('id-ID')} km · {formatRupiah(task.fee)}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-fg-subtle">
                            <CalendarClock className="size-3.5" aria-hidden />
                            {formatDateTime(task.scheduledAt)}
                            {task.courierId && ` · ${courierName(task.courierId)}`}
                          </p>
                          {task.failReason && <p className="mt-2 rounded-lg bg-danger-soft px-2.5 py-1.5 text-xs text-danger">Gagal: {task.failReason}</p>}
                          {task.proof && (
                            <p className="mt-2 text-xs text-phase-done">
                              Bukti: {task.proof.receiverName} · {formatDateTime(task.proof.at)}
                            </p>
                          )}

                          {(task.status === 'UNASSIGNED' || task.status === 'FAILED') && (
                            <div className="mt-3 flex gap-2">
                              <Select
                                aria-label="Pilih kurir"
                                value={courierPick[task.id] ?? couriers[0]?.id ?? ''}
                                onChange={(e) => setCourierPick({ ...courierPick, [task.id]: e.target.value })}
                                className="flex-1"
                              >
                                {couriers.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </Select>
                              <Button
                                onClick={() => {
                                  const courierId = courierPick[task.id] ?? couriers[0]?.id
                                  if (courierId) act((s) => assignCourier(s, task.id, courierId, s.tenantActor, new Date()), 'Kurir ditugaskan')
                                }}
                                disabled={couriers.length === 0}
                              >
                                Tugaskan
                              </Button>
                            </div>
                          )}
                          {next && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button size="sm" onClick={() => step(task, next.to, next.label)}>
                                {next.label}
                              </Button>
                              {task.status === 'ON_THE_WAY' && (
                                <Button size="sm" variant="ghost" className="text-danger hover:text-danger" onClick={() => setFailFor(task)}>
                                  Gagal
                                </Button>
                              )}
                            </div>
                          )}
                          {task.status === 'ARRIVED' && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button size="sm" onClick={() => setProofFor(task)}>
                                Selesai + bukti
                              </Button>
                              <Button size="sm" variant="ghost" className="text-danger hover:text-danger" onClick={() => setFailFor(task)}>
                                Gagal
                              </Button>
                            </div>
                          )}
                        </Card>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )
        })}
      </div>

      {proofFor && <ProofDialog task={proofFor} onClose={() => setProofFor(null)} />}
      <ReasonDialog
        open={!!failFor}
        title={failFor?.type === 'PICKUP' ? 'Jemput gagal' : 'Antar gagal'}
        description="Tugas kembali ke daftar 'Perlu ditugaskan' untuk dijadwalkan ulang."
        placeholder="Contoh: rumah kosong, pelanggan minta besok pagi"
        confirmLabel="Tandai gagal"
        onClose={() => setFailFor(null)}
        onConfirm={(reason) => {
          if (!failFor) return
          const r = act((s) => updateDeliveryTask(s, failFor.id, 'FAILED', { failReason: reason }, s.tenantActor, new Date()), 'Tugas ditandai gagal')
          if (r.ok) setFailFor(null)
        }}
      />
    </>
  )
}
