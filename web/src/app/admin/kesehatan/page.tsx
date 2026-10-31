'use client'

import { CircleAlert, CircleCheck, CircleX, Database, HardDrive, Layers, MessageCircle, RefreshCw, type LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/cn'
import { useDemo } from '@/lib/store/demo-store'

const STATUS = {
  UP: { label: 'Normal', tone: 'success', icon: CircleCheck },
  DEGRADED: { label: 'Terganggu', tone: 'warning', icon: CircleAlert },
  DOWN: { label: 'Mati', tone: 'danger', icon: CircleX },
} as const

function Counter({ icon: Icon, label, value, hint, warn }: { icon: LucideIcon; label: string; value: string | number; hint: string; warn?: boolean }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-fg-muted">{label}</p>
        <Icon className={cn('size-5', warn ? 'text-phase-qc' : 'text-fg-subtle')} aria-hidden />
      </div>
      <p className={cn('tabular mt-2 text-2xl font-bold', warn ? 'text-phase-qc' : 'text-fg')}>{value}</p>
      <p className="mt-1 text-xs text-fg-subtle">{hint}</p>
    </Card>
  )
}

export default function KesehatanPage() {
  const health = useDemo((s) => s.platform.health)
  const orders = useDemo((s) => s.orders)
  const backlog = Number(health.find((h) => h.note?.includes('outbox'))?.note?.match(/\d+/)?.[0] ?? 0)
  const waUnmarked = orders.flatMap((o) => o.whatsapp).filter((l) => l.state === 'OPENED').length
  const waUnsent = orders.flatMap((o) => o.whatsapp).filter((l) => l.state === 'NOT_SENT').length

  return (
    <>
      <PageHeader title="Kesehatan sistem" description="Health check layanan inti dan antrean. Data contoh, diperbarui tiap menit di produksi." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {health.map((h) => {
          const st = STATUS[h.status]
          return (
            <Card key={h.name} className={cn('p-5', h.status !== 'UP' && 'border-phase-qc/50')}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-fg">{h.name}</p>
                <Badge tone={st.tone}>
                  <st.icon aria-hidden />
                  {st.label}
                </Badge>
              </div>
              <p className="tabular mt-3 text-sm text-fg-muted">Latensi {h.latencyMs} ms</p>
              {h.note && <p className="mt-1 text-sm text-phase-qc">{h.note}</p>}
            </Card>
          )
        })}
      </div>
      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-fg-subtle">Antrean & sinkronisasi</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Counter icon={Layers} label="Backlog outbox" value={backlog} hint="Event domain menunggu worker" warn={backlog > 20} />
        <Counter icon={RefreshCw} label="Sinkronisasi offline gagal" value={0} hint="Perubahan Android yang ditolak server" />
        <Counter icon={MessageCircle} label="WhatsApp dibuka, belum ditandai" value={waUnmarked} hint={`${waUnsent} notifikasi belum dikirim sama sekali`} warn={waUnmarked > 0} />
        <Counter icon={HardDrive} label="Storage terpakai" value="18,4 GB" hint="Foto kondisi, bukti, logo" />
      </div>
      <p className="mt-6 flex items-center gap-2 text-xs text-fg-subtle">
        <Database className="size-4" aria-hidden />
        Error log dengan request ID dan tenant ID tersedia di observability stack (OpenTelemetry).
      </p>
    </>
  )
}
