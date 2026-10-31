import { ArrowRight, BookX, MessageCircleQuestion, Shuffle } from 'lucide-react'

const ITEMS = [
  {
    icon: BookX,
    problem: 'Order tercatat di buku dan chat pribadi',
    benefit: 'Semua order digital dengan nomor unik, label QR, dan harga yang terkunci saat order dibuat.',
  },
  {
    icon: MessageCircleQuestion,
    problem: 'Pelanggan terus bertanya "sudah selesai belum?"',
    benefit: 'Link lacak dikirim lewat WhatsApp. Pelanggan melihat status, estimasi, dan tagihan sendiri.',
  },
  {
    icon: Shuffle,
    problem: 'Cucian tertukar, terlambat, atau lolos tanpa dicek',
    benefit: 'Papan produksi menandai yang terlambat, dan QC wajib lulus sebelum order bisa diambil.',
  },
]

export function ProblemBenefit() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-cyan">Kenapa SwaraPOS</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-fg sm:text-4xl">
          Masalah harian laundry, diselesaikan di alur kerjanya
        </h2>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {ITEMS.map(({ icon: Icon, problem, benefit }) => (
          <article key={problem} className="rounded-2xl border border-white/10 bg-surface/60 p-6">
            <span className="grid size-11 place-items-center rounded-xl bg-danger-soft text-danger">
              <Icon className="size-5" aria-hidden />
            </span>
            <h3 className="mt-5 font-semibold text-fg">{problem}</h3>
            <p className="mt-3 flex gap-2 text-sm leading-relaxed text-fg-muted">
              <ArrowRight className="mt-0.5 size-4 shrink-0 text-phase-done" aria-hidden />
              {benefit}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
