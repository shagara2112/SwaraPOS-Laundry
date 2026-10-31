import { Quote } from 'lucide-react'

const QUOTES = [
  {
    text: 'Dulu tiap sore saya balas puluhan chat "sudah jadi belum". Sekarang pelanggan cek sendiri dari link.',
    name: 'Pemilik laundry kiloan',
    place: 'Jakarta Selatan',
  },
  {
    text: 'Order yang lewat jam janji langsung kelihatan merah di papan. Tim jadi tahu mana yang harus didahulukan.',
    name: 'Kepala produksi',
    place: 'Bandung',
  },
  {
    text: 'Harga per outlet bisa beda, tapi nota lama tidak ikut berubah. Rekap akhir bulan jauh lebih cepat.',
    name: 'Pemilik 3 outlet',
    place: 'Yogyakarta',
  },
]

export function Testimonials() {
  return (
    <section className="border-y border-white/5 bg-surface/40 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-cyan">Cerita pilot</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-fg sm:text-4xl">Yang dirasakan di lapangan</h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {QUOTES.map((q) => (
            <figure key={q.text} className="flex flex-col rounded-2xl border border-white/10 bg-surface p-6">
              <Quote className="size-7 text-brand-violet" aria-hidden />
              <blockquote className="mt-4 flex-1 leading-relaxed text-fg">{q.text}</blockquote>
              <figcaption className="mt-6 text-sm">
                <span className="font-semibold text-fg">{q.name}</span>
                <span className="text-fg-subtle"> · {q.place}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-6 text-xs text-fg-subtle">Ilustrasi pilot — kutipan akan diganti testimoni pelanggan nyata.</p>
      </div>
    </section>
  )
}
