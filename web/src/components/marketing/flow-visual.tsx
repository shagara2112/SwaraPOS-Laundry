import { Bike, PackageCheck, Scale, ShieldCheck, WashingMachine, type LucideIcon } from 'lucide-react'
import { StatusBadge } from '@/components/order/status-badge'
import type { OrderStatus } from '@/lib/types'

const STEPS: { icon: LucideIcon; title: string; text: string; status: OrderStatus }[] = [
  { icon: Bike, title: 'Pickup', text: 'Kurir menjemput sesuai slot, biaya dihitung dari zona radius.', status: 'PICKED_UP' },
  { icon: Scale, title: 'Terima & timbang', text: 'Kasir mencatat berat, item, kondisi, lalu label QR tercetak.', status: 'WEIGHED_OR_COUNTED' },
  { icon: WashingMachine, title: 'Cuci · kering · setrika', text: 'Operator memindahkan order per tahap di papan produksi.', status: 'IN_IRONING' },
  { icon: ShieldCheck, title: 'Quality check', text: 'Order tidak bisa siap sebelum QC lulus dan tercatat.', status: 'QUALITY_CHECK' },
  { icon: PackageCheck, title: 'Antar / ambil', text: 'Bukti serah-terima tersimpan, pelanggan dapat notifikasi.', status: 'OUT_FOR_DELIVERY' },
]

export function FlowVisual() {
  return (
    <section id="alur" className="relative scroll-mt-20 border-y border-white/5 bg-surface/40 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-cyan">Alur end-to-end</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-fg sm:text-4xl">
            Satu order, satu jejak digital dari jemput sampai diterima kembali
          </h2>
          <p className="mt-4 text-fg-muted">
            Setiap perpindahan status menyimpan siapa, kapan, dan catatannya. Pelanggan melihat timeline yang sama
            secara real-time.
          </p>
        </div>

        <ol className="relative mt-14 grid gap-6 lg:grid-cols-5 lg:gap-4">
          <svg
            className="pointer-events-none absolute left-[10%] right-[10%] top-7 hidden h-2 w-[80%] lg:block"
            viewBox="0 0 100 2"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="flow-g" x1="0" x2="1">
                <stop offset="0" stopColor="#2d5bff" />
                <stop offset="0.55" stopColor="#7c3aed" />
                <stop offset="1" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <line x1="0" y1="1" x2="100" y2="1" stroke="url(#flow-g)" strokeOpacity="0.25" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            <line
              x1="0"
              y1="1"
              x2="100"
              y2="1"
              stroke="url(#flow-g)"
              strokeWidth="2"
              strokeDasharray="8 16"
              vectorEffect="non-scaling-stroke"
              className="animate-flow"
            />
          </svg>
          <span className="absolute bottom-6 left-7 top-6 w-px bg-gradient-to-b from-brand-blue via-brand-violet to-brand-cyan opacity-40 lg:hidden" aria-hidden />

          {STEPS.map(({ icon: Icon, title, text, status }, i) => (
            <li key={title} className="relative flex gap-4 lg:flex-col lg:items-center lg:text-center">
              <span className="relative z-10 grid size-14 shrink-0 place-items-center rounded-2xl border border-white/10 bg-surface shadow-pop">
                <Icon className="size-6 text-fg" aria-hidden />
                <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-[image:var(--brand-gradient)] text-[10px] font-bold text-white">
                  {i + 1}
                </span>
              </span>
              <div className="pt-1 lg:pt-0">
                <h3 className="font-semibold text-fg">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-fg-muted">{text}</p>
                <StatusBadge status={status} className="mt-3" />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
