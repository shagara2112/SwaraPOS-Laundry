import { ArrowRight, CircleCheck, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { ButtonLink } from '@/components/ui/button'

function TrackingPhone() {
  const steps = ['Diterima', 'Dicuci', 'Disetrika', 'QC', 'Siap']
  const active = 2
  return (
    <div className="relative mx-auto w-[17.5rem] rounded-[2.4rem] border border-white/10 bg-[#0d1428] p-2.5 shadow-[0_40px_80px_-20px_rgb(45_91_255/0.45)]">
      <div className="overflow-hidden rounded-[1.9rem] bg-surface">
        <div className="flex items-center justify-between px-5 pb-2 pt-3 text-[10px] font-semibold text-fg-subtle">
          <span>09.41</span>
          <span className="h-4 w-16 rounded-full bg-black/60" aria-hidden />
          <span>5G</span>
        </div>
        <div className="px-5 pb-6">
          <p className="text-[11px] font-medium text-fg-subtle">Laundry Bersih Kilat · Kemang</p>
          <p className="mt-0.5 font-mono text-xs text-fg-muted">KMG-261031-0012</p>
          <div className="mt-4 rounded-2xl bg-[image:var(--brand-gradient)] p-4 text-white">
            <p className="text-[11px] font-medium opacity-80">Cucian Anda sedang</p>
            <p className="mt-0.5 text-xl font-bold">Disetrika</p>
            <p className="mt-2 text-[11px] opacity-90">Estimasi selesai hari ini, 17.00</p>
          </div>
          <ol className="mt-5 space-y-3">
            {steps.map((s, i) => (
              <li key={s} className="flex items-center gap-3 text-xs">
                <span
                  className={
                    i < active
                      ? 'grid size-5 place-items-center rounded-full bg-phase-done text-[10px] text-bg'
                      : i === active
                        ? 'relative grid size-5 place-items-center rounded-full bg-primary'
                        : 'size-5 rounded-full border border-border'
                  }
                >
                  {i < active && '✓'}
                  {i === active && <span className="size-2 animate-pulse-dot rounded-full bg-white" />}
                </span>
                <span className={i <= active ? 'font-semibold text-fg' : 'text-fg-subtle'}>{s}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 text-xs">
            <span className="text-fg-muted">Tagihan</span>
            <span className="font-semibold text-fg">Rp52.500 · Lunas</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function FloatingCard({ className, icon, title, text }: { className: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className={`absolute flex items-center gap-3 rounded-2xl border border-white/10 bg-surface/90 px-4 py-3 shadow-pop backdrop-blur ${className}`}>
      {icon}
      <div className="leading-tight">
        <p className="text-xs font-semibold text-fg">{title}</p>
        <p className="mt-0.5 text-[11px] text-fg-subtle">{text}</p>
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="grid-lines pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:pb-28 lg:pt-20">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-fg-muted">
            <Sparkles className="size-3.5 text-brand-cyan" aria-hidden />
            Untuk laundry kiloan, satuan, sepatu &amp; karpet
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-fg sm:text-5xl lg:text-[3.6rem]">
            Cucian pelanggan selalu <span className="text-gradient">terlacak</span>, operasional laundry selalu
            terkendali.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-fg-muted sm:text-lg">
            SwaraPOS menyatukan kasir, produksi, QC, antar-jemput, dan pembayaran dalam satu alur. Pelanggan cukup
            membuka link WhatsApp untuk tahu cuciannya sudah sampai mana.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/daftar" size="lg">
              Daftar Gratis
              <ArrowRight aria-hidden />
            </ButtonLink>
            <ButtonLink href="/#demo" size="lg" variant="secondary">
              Minta Demo
            </ButtonLink>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-muted">
            {['Trial gratis', 'Tanpa kartu kredit', 'Setup sekitar 30 menit'].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <CircleCheck className="size-4 text-phase-done" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-md py-6 lg:py-0" aria-hidden>
          <div className="animate-float">
            <TrackingPhone />
          </div>
          <FloatingCard
            className="animate-float-delayed -left-2 top-10 sm:left-0"
            icon={<MessageCircle className="size-8 rounded-lg bg-whatsapp p-1.5 text-white" />}
            title="WhatsApp terkirim"
            text="Link lacak ke Sari H."
          />
          <FloatingCard
            className="animate-float -right-2 bottom-16 sm:right-0"
            icon={<ShieldCheck className="size-8 rounded-lg bg-phase-qc-soft p-1.5 text-phase-qc" />}
            title="QC lulus"
            text="5 poin cek · oleh Maya"
          />
        </div>
      </div>
    </section>
  )
}
