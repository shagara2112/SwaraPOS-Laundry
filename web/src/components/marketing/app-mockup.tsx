import { AlarmClock, ClipboardList, HandCoins, Wallet } from 'lucide-react'
import { StatusBadge } from '@/components/order/status-badge'
import type { OrderStatus } from '@/lib/types'

const KPIS = [
  { icon: ClipboardList, label: 'Order hari ini', value: '38' },
  { icon: Wallet, label: 'Omzet hari ini', value: 'Rp2,4 jt' },
  { icon: AlarmClock, label: 'Terlambat', value: '2' },
  { icon: HandCoins, label: 'Piutang', value: 'Rp640 rb' },
]

const COLUMNS: { title: string; cards: { no: string; name: string; status: OrderStatus; late?: boolean }[] }[] = [
  { title: 'Cuci', cards: [{ no: 'KMG-0031', name: 'Sari H.', status: 'IN_WASHING' }, { no: 'KMG-0029', name: 'Budi S.', status: 'IN_WASHING' }] },
  { title: 'Setrika', cards: [{ no: 'KMG-0024', name: 'Ayu L.', status: 'IN_IRONING', late: true }, { no: 'KMG-0027', name: 'Dimas P.', status: 'IN_IRONING' }] },
  { title: 'QC', cards: [{ no: 'KMG-0021', name: 'Maria G.', status: 'QUALITY_CHECK' }] },
  { title: 'Siap', cards: [{ no: 'KMG-0018', name: 'Nadia P.', status: 'READY_FOR_PICKUP' }, { no: 'KMG-0016', name: 'Hendra W.', status: 'READY_FOR_PICKUP' }] },
]

export function AppMockup() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-24">
      <div className="hero-glow pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-cyan">Dashboard operasional</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-fg sm:text-4xl">
            Padat informasi, tetap tenang dibaca
          </h2>
          <p className="mt-4 text-fg-muted">
            Warna status per fase, penanda terlambat, dan pintasan keyboard. Bisa dipakai di desktop maupun tablet
            di area kerja.
          </p>
        </div>

        <div className="gradient-border mt-12 rounded-3xl p-2 shadow-[0_40px_120px_-30px_rgb(124_58_237/0.45)]" aria-hidden>
          <div className="rounded-[1.25rem] bg-bg p-4 sm:p-6">
            <div className="flex items-center gap-2 pb-4">
              <span className="size-3 rounded-full bg-danger/70" />
              <span className="size-3 rounded-full bg-phase-qc/70" />
              <span className="size-3 rounded-full bg-phase-done/70" />
              <span className="ml-3 rounded-md bg-surface-2 px-3 py-1 font-mono text-[11px] text-fg-subtle">
                app.swarapos.id/produksi
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {KPIS.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl border border-border bg-surface p-3 sm:p-4">
                  <div className="flex items-center justify-between text-xs text-fg-subtle">
                    {label}
                    <Icon className="size-4" />
                  </div>
                  <p className="mt-2 text-lg font-bold text-fg sm:text-xl">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {COLUMNS.map((col) => (
                <div key={col.title} className="rounded-xl bg-surface-2/60 p-2.5">
                  <p className="px-1 pb-2 text-xs font-semibold text-fg-muted">
                    {col.title} <span className="text-fg-subtle">· {col.cards.length}</span>
                  </p>
                  <div className="space-y-2">
                    {col.cards.map((c) => (
                      <div key={c.no} className="rounded-lg border border-border bg-surface p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] font-semibold text-fg">{c.no}</span>
                          {c.late && <span className="text-[10px] font-semibold text-danger">Terlambat</span>}
                        </div>
                        <p className="mt-1 text-xs text-fg-muted">{c.name}</p>
                        <StatusBadge status={c.status} className="mt-2 scale-90 origin-left" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
