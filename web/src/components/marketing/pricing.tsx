import { Check } from 'lucide-react'
import { ButtonLink } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { formatRupiah } from '@swarapos/core/format'

const PLANS = [
  {
    name: 'Basic',
    price: 149000,
    tagline: 'Untuk laundry satu outlet yang mulai digital.',
    features: ['Order & kasir dengan label QR', 'Papan produksi & QC wajib', 'Pickup & delivery zona radius', 'Link lacak pelanggan + WhatsApp', 'Laporan dasar', '1 outlet, hingga 5 karyawan', 'Order tanpa batas'],
    highlight: false,
  },
  {
    name: 'Pro',
    price: 299000,
    tagline: 'Untuk laundry yang berkembang ke banyak outlet.',
    features: ['Semua fitur Basic', 'Multi-outlet & harga per outlet', 'Laporan lanjutan & export CSV', 'Pengingat order terlambat', 'Hingga 10 outlet & 25 karyawan', 'Order tanpa batas'],
    highlight: true,
  },
]

export function Pricing() {
  return (
    <section id="harga" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-cyan">Harga</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-fg sm:text-4xl">Bayar per outlet, per bulan</h2>
        <p className="mt-4 text-fg-muted">Mulai dengan trial gratis. Upgrade atau tambah outlet kapan saja.</p>
      </div>
      <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
        {PLANS.map((p) => (
          <article
            key={p.name}
            className={cn(
              'relative flex flex-col rounded-3xl p-7',
              p.highlight ? 'gradient-border shadow-[0_30px_80px_-30px_rgb(45_91_255/0.6)]' : 'border border-white/10 bg-surface/60',
            )}
          >
            {p.highlight && (
              <span className="absolute -top-3 left-7 rounded-full bg-[image:var(--brand-gradient)] px-3 py-1 text-xs font-semibold text-white">
                Paling lengkap
              </span>
            )}
            <h3 className="text-lg font-semibold text-fg">{p.name}</h3>
            <p className="mt-1 text-sm text-fg-muted">{p.tagline}</p>
            <p className="mt-6 flex items-baseline gap-1.5">
              <span className="text-4xl font-extrabold tracking-tight text-fg">{formatRupiah(p.price)}</span>
              <span className="text-sm text-fg-subtle">/outlet/bulan</span>
            </p>
            <ul className="mt-6 flex-1 space-y-3">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2.5 text-sm text-fg-muted">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
            <ButtonLink href="/daftar" variant={p.highlight ? 'primary' : 'secondary'} size="lg" className="mt-8">
              Mulai trial {p.name}
            </ButtonLink>
          </article>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-fg-subtle">Harga contoh — nominal final menyusul setelah pilot.</p>
    </section>
  )
}
