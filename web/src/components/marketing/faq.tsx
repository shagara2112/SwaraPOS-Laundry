import { Plus } from 'lucide-react'

const FAQS = [
  {
    q: 'Apakah pelanggan harus install aplikasi?',
    a: 'Tidak. Pelanggan menerima link lacak lewat WhatsApp dan membukanya di browser HP. Untuk melihat detail, mereka cukup memasukkan 4 digit terakhir nomor WhatsApp.',
  },
  {
    q: 'Bagaimana notifikasi WhatsApp dikirim?',
    a: 'Staf menekan tombol "Kirim WhatsApp" di order. WhatsApp terbuka dengan nomor pelanggan, template pesan, dan link lacak yang sudah terisi, lalu staf menekan kirim. Setiap pengiriman tercatat.',
  },
  {
    q: 'Apakah SwaraPOS memproses pembayaran pelanggan saya?',
    a: 'Tidak. Pelanggan membayar ke rekening, QRIS, atau tunai milik Anda sendiri. SwaraPOS mencatat dan membantu verifikasi, tanpa memotong dana.',
  },
  {
    q: 'Bisa dipakai kalau internet outlet sering putus?',
    a: 'Bisa untuk pekerjaan inti. Draf order dan perubahan produksi disimpan sebagai pending sync, lalu dikirim otomatis saat koneksi kembali. Aksi seperti pembayaran dan WhatsApp menunggu online.',
  },
  {
    q: 'Harga layanan saya kan beda-beda per outlet?',
    a: 'Harga diatur per layanan per outlet: per kg, per item, per pasang, per paket, atau per m². Saat order dibuat, harga dikunci sehingga perubahan harga tidak mengubah nota lama.',
  },
  {
    q: 'Bagaimana cara membayar langganan?',
    a: 'Tagihan dibuat per outlet per bulan. Anda membayar lewat transfer, link pembayaran, atau QRIS, lalu mengunggah bukti. Tim Finance kami memverifikasi dan status langsung berubah.',
  },
]

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-cyan">FAQ</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-fg sm:text-4xl">Pertanyaan yang sering muncul</h2>
      </div>
      <div className="mt-10 divide-y divide-white/10 rounded-2xl border border-white/10 bg-surface/60">
        {FAQS.map((f) => (
          <details key={f.q} className="group px-5 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium text-fg">
              {f.q}
              <Plus className="size-5 shrink-0 text-fg-subtle transition-transform duration-200 group-open:rotate-45" aria-hidden />
            </summary>
            <p className="pb-5 text-sm leading-relaxed text-fg-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
