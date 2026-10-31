import { Check, Crown, ScanLine, Smartphone, Truck, type LucideIcon } from 'lucide-react'

const ROLES: { icon: LucideIcon; role: string; tagline: string; points: string[]; tone: string }[] = [
  {
    icon: Crown,
    role: 'Pemilik',
    tagline: 'Kendali tanpa harus di outlet',
    points: ['Omzet, piutang, dan order terlambat hari ini', 'Harga per outlet, terkunci di setiap order', 'Laporan per layanan & kanal, export CSV', 'Audit log untuk harga, batal, dan refund'],
    tone: 'from-brand-blue/25',
  },
  {
    icon: ScanLine,
    role: 'Kasir & operator',
    tagline: 'Tahu persis apa yang harus dikerjakan',
    points: ['Input order di bawah 3 menit', 'Papan produksi per tahap, tombol besar', 'Scan label untuk membuka order', 'Tetap bisa dipakai saat sinyal putus-putus'],
    tone: 'from-brand-violet/25',
  },
  {
    icon: Truck,
    role: 'Kurir',
    tagline: 'Tugas jelas, bukti tersimpan',
    points: ['Daftar jemput & antar per hari', 'Biaya otomatis dari zona radius', 'Bukti foto, tanda tangan, atau PIN', 'Alasan gagal antar & jadwal ulang'],
    tone: 'from-brand-cyan/25',
  },
  {
    icon: Smartphone,
    role: 'Pelanggan',
    tagline: '"Cucian saya sudah sampai mana?"',
    points: ['Tanpa install aplikasi', 'Timeline status & estimasi selesai', 'Tagihan dan cara bayar outlet', 'Satu ketukan untuk chat outlet'],
    tone: 'from-phase-done/25',
  },
]

export function FeaturesByRole() {
  return (
    <section id="fitur" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-cyan">Untuk semua peran</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-fg sm:text-4xl">
          Setiap orang di laundry punya layar yang pas
        </h2>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ROLES.map(({ icon: Icon, role, tagline, points, tone }) => (
          <article
            key={role}
            className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b ${tone} to-surface/40 p-6`}
          >
            <span className="grid size-11 place-items-center rounded-xl border border-white/10 bg-surface">
              <Icon className="size-5 text-fg" aria-hidden />
            </span>
            <h3 className="mt-5 text-lg font-semibold text-fg">{role}</h3>
            <p className="mt-1 text-sm text-fg-muted">{tagline}</p>
            <ul className="mt-5 space-y-2.5">
              {points.map((p) => (
                <li key={p} className="flex gap-2 text-sm text-fg-muted">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
