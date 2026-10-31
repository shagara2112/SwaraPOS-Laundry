# PRD — Laundry SaaS Omnichannel

**Status:** Draft v0.1 — untuk diskusi produk  
**Bahasa produk awal:** Indonesia  
**Platform:** Android owner/staff/kurir app + web customer tracking + web dashboard + landing page  
**Model bisnis:** SaaS multi-tenant untuk pemilik usaha laundry

---

## 1. Ringkasan Produk

Laundry SaaS adalah platform operasional dan customer engagement untuk usaha laundry yang mengelola seluruh siklus pesanan: pemesanan, penjemputan, penerimaan dan penimbangan, produksi, quality control, pembayaran, pengantaran, hingga pelanggan mengetahui status cucian secara real-time.

Produk ditujukan untuk laundry kombinasi (kiloan, satuan, sepatu, karpet, dan layanan tambahan sesuai konfigurasi) dari skala rumahan sampai menengah, dengan dukungan satu outlet maupun jaringan multi-outlet. Setiap bisnis memiliki ruang data terisolasi (tenant), branding, harga, outlet, karyawan, pelanggan, dan konfigurasi operasional sendiri.

### Nilai utama

1. Pemilik dapat mengontrol operasional tanpa bergantung pada spreadsheet atau chat pribadi.
2. Staf mengetahui pekerjaan yang harus dikerjakan pada setiap tahap.
3. Pelanggan mendapat transparansi status, estimasi selesai, tagihan, notifikasi, dan riwayat.
4. Laundry dapat menjual layanan melalui landing page dan kanal digital.
5. Platform dapat berkembang dari satu outlet menjadi jaringan tanpa migrasi sistem.

---

## 2. Tujuan dan Indikator Keberhasilan

### Tujuan bisnis

- Meningkatkan jumlah order berulang dan retensi pelanggan.
- Mengurangi order hilang, salah status, salah harga, dan keterlambatan.
- Mempercepat proses penerimaan sampai order masuk produksi.
- Menyediakan pendapatan berulang melalui paket langganan SaaS.
- Menjadikan data operasional sebagai dasar keputusan pemilik usaha.

### KPI produk awal

| KPI | Target indikatif | Cara ukur |
|---|---:|---|
| Order tercatat digital | >= 90% order aktif | Order digital / total order |
| Akurasi status order | >= 98% | Audit perubahan status |
| Waktu input penerimaan | <= 3 menit/order | Timestamp penerimaan |
| Order terlambat | turun >= 30% | Perbandingan sebelum/sesudah |
| Pelanggan melihat status | >= 60% order | Event tracking |
| Repeat order 30 hari | naik >= 15% | Cohort pelanggan |
| Aktivasi tenant | < 30 menit | Signup sampai order pertama |

Target ini harus divalidasi melalui pilot 3–5 laundry.

---

## 3. Pengguna dan Peran

### Persona utama

1. **Pemilik/Admin bisnis** — mengatur harga, outlet, karyawan, laporan, paket SaaS, dan keputusan bisnis.
2. **Kasir/Penerima** — mencatat pelanggan, item, berat, layanan, pembayaran, label, dan serah-terima.
3. **Operator produksi** — memproses batch/individual order berdasarkan antrean dan SOP.
4. **Quality Control/Finishing** — memeriksa hasil, mencatat masalah, melipat/mengemas.
5. **Kurir** — menerima tugas pickup/delivery, navigasi, bukti serah-terima, dan status perjalanan.
6. **Pelanggan** — membuat order atau meminta pickup, melacak status, membayar, dan memberi feedback.
- **Platform Admin:** manajemen tenant, plan/subscription, invoice, support access, feature flags, audit, dan platform monitoring.
- **Support Read-only:** melihat data tenant terbatas untuk membantu tanpa mengubah transaksi.
- **Finance:** melihat dan memverifikasi invoice subscription, pembayaran, kredit, refund, dan laporan revenue.
- **Platform Owner:** seluruh akses dengan MFA dan audit log.

### Hak akses minimum

- Role-based access control (RBAC).
- Pembatasan berdasarkan tenant dan outlet.
- Audit log untuk aksi sensitif: ubah harga, diskon, void, refund, perubahan status, dan penghapusan data.

---

## 4. Ruang Lingkup MVP

### A. Registrasi dan onboarding tenant

- Landing page marketing dengan CTA daftar/demo.
- Registrasi pemilik menggunakan email/nomor telepon dan OTP atau password.
- Membuat workspace/tenant dan outlet pertama.
- Wizard konfigurasi: nama bisnis, alamat, jam operasional, zona layanan, logo, warna brand.
- Template katalog layanan dan harga awal yang dapat diedit.
- Owner dapat membuat, mengubah, menonaktifkan, dan mengatur harga semua layanan laundry sendiri per outlet.
- Harga tenant tidak boleh diubah oleh super admin tanpa akses support yang diaudit.
- Undang karyawan dengan role.
- Masa trial dan status langganan.

### B. Pelanggan dan order

- CRUD pelanggan, alamat, catatan, dan preferensi.
- Pembuatan order dari kasir, customer app, dan tautan/landing page.
- Pilihan pickup, drop-off, atau walk-in.
- Layanan berdasarkan berat, item, paket, express, dan add-on.
- Layanan dapat dihitung per kg, per item, per pasang, per paket, atau add-on sesuai konfigurasi owner.
- Price snapshot disimpan pada order agar perubahan harga owner tidak mengubah order lama.
- Staf hanya dapat mengubah harga melalui permission/approval yang ditentukan owner.
- Catatan noda, warna, bahan sensitif, kehilangan/kondisi awal, dan foto bukti.
- Nomor order unik dan QR/barcode label.
- Estimasi selesai berdasarkan SLA layanan dan kapasitas produksi.
- Kalkulasi subtotal, diskon, biaya pickup/delivery, pajak bila diaktifkan, total.

### C. Alur status end-to-end

Status default yang dapat dikonfigurasi tenant:

1. `DRAFT`
2. `REQUESTED` — permintaan order/pickup masuk
3. `PICKUP_ASSIGNED`
4. `PICKED_UP`
5. `RECEIVED` — diterima di outlet
6. `INSPECTED`
7. `WEIGHED_OR_COUNTED`
8. `IN_WASHING`
9. `IN_DRYING`
10. `IN_IRONING`
11. `IN_FINISHING`
12. `QUALITY_CHECK`
13. `READY_FOR_PICKUP`
14. `OUT_FOR_DELIVERY`
15. `DELIVERED` / `COMPLETED`
16. `CANCELLED`, `ON_HOLD`, atau `ISSUE_REPORTED`

Setiap perubahan status menyimpan actor, waktu, lokasi opsional, catatan, dan bukti.

### D. Produksi

- Papan antrean produksi per outlet dan per tahap.
- Filter berdasarkan SLA, prioritas, layanan, dan keterlambatan.
- Batch produksi untuk order yang dapat diproses bersama.
- Scan label untuk membuka order.
- Checklist SOP per tahap.
- Catatan kerusakan, noda tidak hilang, item kurang, atau rewash.
- QC wajib sebelum order siap diambil/diantar.
- Penanganan order parsial atau hold dengan persetujuan.

### E. Pickup dan delivery

- Permintaan pickup dengan alamat, slot waktu, dan catatan.
- Penugasan kurir manual pada MVP.
- Daftar tugas kurir dan detail rute.
- Status: assigned, accepted, on the way, arrived, picked up/delivered, failed.
- Bukti serah-terima: foto, tanda tangan, PIN/OTP, atau nama penerima.
- Biaya delivery berdasarkan zona atau radius yang dikonfigurasi.
- Alasan gagal antar dan penjadwalan ulang.

### F. Pelanggan mengetahui status

- Tracking publik berbasis nomor order + OTP/nomor telepon, tanpa wajib login untuk melihat satu order.
- Pelanggan tidak wajib menginstall aplikasi pada MVP. Pelanggan menerima link tracking melalui WhatsApp dan melihat order aktif, timeline status, estimasi selesai, invoice, dan riwayat terbatas melalui web mobile/PWA. Customer app Android menjadi fase berikutnya.
- WhatsApp menjadi kanal notifikasi utama MVP melalui tombol **Kirim WhatsApp** yang ditekan staf.
- Sistem menyediakan template pesan untuk order diterima, mulai diproses, siap, sedang diantar, selesai, pembayaran jatuh tempo, dan kendala.
- Tombol membuka WhatsApp dengan nomor pelanggan, template pesan, dan link tracking yang sudah terisi; staf tetap melakukan konfirmasi pengiriman.
- Sistem mencatat status `belum dikirim`, `dibuka`, atau `ditandai terkirim`, termasuk waktu dan user staf.
- WhatsApp Business API/provider resmi, push notification, dan SMS ditunda ke fase berikutnya. Telegram Bot digunakan khusus untuk notifikasi internal Platform Owner/Finance.

### Notifikasi internal platform melalui Telegram

- Bot Telegram mengirim notifikasi otomatis kepada Platform Owner/Finance saat tenant baru mendaftar.
- Bot Telegram mengirim notifikasi saat bukti pembayaran subscription/perpanjangan berhasil diunggah.
- Bot Telegram mengirim notifikasi saat ada pembayaran dengan nominal berbeda yang memerlukan konfirmasi.
- Pesan Telegram berisi ringkasan kejadian dan tombol/link menuju halaman review di Dashboard Super Admin.
- Telegram hanya sebagai kanal alert; approve, reject, konfirmasi nominal, suspend, dan tindakan sensitif tetap dilakukan di Dashboard Super Admin.
- Bot tidak menyimpan atau menerima kredensial pembayaran.
- Email bukan kanal wajib notifikasi internal pada MVP.

### G. Pembayaran

- Tunai, transfer manual, QRIS milik masing-masing owner, dan bayar saat delivery.
- SwaraPOS Laundry tidak menjadi payment gateway atau merchant of record pada MVP.
- Owner mengatur rekening, QRIS, instruksi transfer, dan konfirmasi pembayaran sendiri.
- Status pembayaran: unpaid, partial, paid, refunded, failed.
- Pelanggan dapat mengunggah/mengirim bukti pembayaran; staf melakukan verifikasi manual.
- Invoice/struk digital.
- Rekonsiliasi pembayaran manual untuk admin.
- Integrasi payment gateway ditunda sampai ada kebutuhan lintas tenant yang jelas.
- Diskon, voucher, deposit, dan membership ditunda sampai fase berikutnya kecuali dibutuhkan pilot.

### H. Dashboard dan laporan

- Order hari ini, omzet, order terlambat, kapasitas produksi, dan piutang.
- Pendapatan per layanan/outlet/kanal.
- Produktivitas tahap produksi.
- Pelanggan baru, aktif, repeat, dan churn.
- Export CSV.
- Filter rentang tanggal dan outlet.

### I. SaaS dan billing tenant

SwaraPOS Laundry menggunakan model **per outlet per bulan** dengan dua paket awal:

- **Basic:** fitur operasional inti untuk satu outlet, dengan batas penggunaan dan fitur sesuai paket.
- **Pro:** fitur operasional lebih lengkap, laporan lanjutan, automasi, dan kapasitas lebih tinggi.

**Batas paket (diputuskan):** jumlah order tidak dibatasi. Batas yang berlaku hanya jumlah outlet dan jumlah karyawan per paket (prototipe: Basic 1 outlet / 5 karyawan, Pro 10 outlet / 25 karyawan).

Harga nominal, angka batas outlet/karyawan final, masa trial, dan fitur detail tiap paket masih perlu ditentukan. Tagihan SaaS dipisahkan dari pembayaran order laundry pelanggan. Status subscription: trial, active, past_due, suspended, cancelled.

Pada tahap awal, mekanisme pembayaran langganan menggunakan **konfirmasi manual**. Tenant memilih salah satu instruksi pembayaran aktif yang disediakan platform, melakukan pembayaran di luar SwaraPOS, lalu mengunggah bukti bayar untuk direview oleh Finance/Platform Owner. Metode yang dapat dikonfigurasi dari dashboard adalah transfer bank, link pembayaran seperti Lynk.id, dan QRIS. SwaraPOS tidak memproses atau mengonfirmasi pembayaran secara otomatis pada MVP.

Alur pembayaran subscription:

1. Sistem membuat invoice dan menampilkan status `UNPAID`.
2. Tenant membuka instruksi pembayaran aktif: transfer, link pembayaran, atau QRIS.
3. Tenant melakukan pembayaran melalui kanal yang dipilih.
4. Tenant mengunggah bukti pembayaran, nominal, metode, dan catatan opsional.
5. Status menjadi `UNDER_REVIEW`.
6. Finance/Platform Owner memeriksa bukti dan mencocokkan dengan mutasi/rekening atau dashboard kanal pembayaran.
7. Reviewer memilih `APPROVED` atau `REJECTED` dengan alasan wajib.
8. Jika disetujui, invoice menjadi `PAID`, subscription diperpanjang/diaktifkan, dan seluruh tindakan dicatat di audit log.

Tenant tidak boleh menandai invoice sebagai lunas sendiri. Bukti bayar yang ditolak dapat diganti dengan bukti baru, tetapi riwayat bukti dan keputusan sebelumnya tetap tersimpan.

Ketentuan bukti pembayaran subscription yang dipilih:

- Format yang diterima: JPEG/JPG, PNG, dan PDF.
- Ukuran maksimum: di bawah 2 MB per file.
- Tenant boleh mengunggah ulang bukti jika bukti sebelumnya salah atau ditolak.
- Bukti sebelumnya tetap tersimpan sebagai histori dan tidak ditimpa.
- Sistem mengirim notifikasi Telegram otomatis kepada Platform Owner/Finance ketika ada pendaftaran tenant baru atau bukti pembayaran subscription/perpanjangan yang baru diunggah.
- Jika nominal pembayaran berbeda dari nominal invoice, submission tidak otomatis ditolak; reviewer melakukan konfirmasi langsung dan mencatat keputusan/catatan penyesuaian.

Konfigurasi instruksi pembayaran platform dari Dashboard Super Admin:

- Nama metode dan label yang tampil ke tenant.
- Transfer: nama bank, nama pemilik rekening, nomor rekening, dan instruksi.
- Link pembayaran: URL tujuan seperti Lynk.id dan label tombol.
- QRIS: gambar QRIS, nama merchant, dan instruksi pembayaran.
- Status aktif/nonaktif, urutan tampilan, dan tanggal berlaku.
- Hanya Platform Owner/Finance yang boleh mengubahnya; perubahan wajib memiliki audit log.

- Halaman upgrade, invoice langganan, dan status penggunaan.
- Perubahan paket berlaku sesuai aturan prorata atau mulai periode berikutnya.

### Otomasi yang direncanakan

Otomasi dibagi menjadi dua kelompok agar MVP tetap realistis.

**Otomasi operasional laundry:**

- Pembuatan nomor order, QR/label, dan invoice otomatis.
- Perhitungan harga berdasarkan layanan, berat, item, paket, add-on, express, diskon, dan biaya pickup/delivery.
- Penentuan zona pickup/delivery dan pembuatan quote otomatis.
- Perubahan antrean produksi berdasarkan status order.
- Reminder order yang belum diproses, mendekati jatuh tempo, atau terlambat.
- Pembuatan timeline tracking pelanggan otomatis setiap status berubah.
- Pembuatan template pesan WhatsApp otomatis; pengiriman tetap manual melalui tombol staf pada MVP.
- Pengingat QC sebelum order dapat menjadi `READY_FOR_PICKUP`.
- Penandaan order yang tertahan, bermasalah, atau membutuhkan approval.

**Otomasi platform/SaaS:**

- Pembuatan invoice subscription bulanan per outlet.
- Notifikasi Telegram otomatis kepada Platform Owner saat tenant baru mendaftar.
- Notifikasi Telegram otomatis kepada Platform Owner saat tenant mengunggah bukti pembayaran/perpanjangan.
- Notifikasi internal kepada Finance/Platform Owner saat ada submission baru yang menunggu review.
- Reminder kepada tenant owner dapat dilakukan manual pada MVP; reminder otomatis ke tenant merupakan fitur lanjutan.
- Perubahan status invoice berdasarkan hasil review manual.
- Penghitungan kuota dan penggunaan tenant.
- Peringatan mendekati batas kuota.
- Penerapan grace period dan pembatasan fitur sesuai kebijakan.
- Rekap MRR, invoice overdue, dan pembayaran yang menunggu review.

Yang **tidak otomatis pada MVP**: reminder pembayaran kepada tenant owner, konfirmasi pembayaran, pengecekan mutasi bank, verifikasi QRIS, pengiriman WhatsApp, refund, dan keputusan pembayaran dengan nominal berbeda. Semua hal tersebut tetap memerlukan tindakan manusia yang tercatat, kecuali notifikasi internal ke Platform Owner atas pendaftaran dan upload bukti baru.

---

## 5. Pickup dan Delivery

Pickup dan delivery masuk MVP dengan perhitungan **zona berbasis radius dari outlet**. Jarak yang digunakan pada MVP adalah jarak garis lurus dari koordinat outlet ke alamat pelanggan; jarak berdasarkan rute jalan dan optimasi rute ditunda ke fase lanjutan.

### Konfigurasi zona default

- Zona 1: 0–2 km — pickup Rp5.000, delivery Rp5.000
- Zona 2: >2–5 km — pickup Rp8.000, delivery Rp8.000
- Zona 3: >5–8 km — pickup Rp12.000, delivery Rp12.000
- Zona 4: >8–12 km — pickup Rp18.000, delivery Rp18.000
- Di atas 12 km — perlu konfirmasi staf atau tidak tersedia

Setiap tenant dapat mengubah radius dan tarifnya sendiri. Pickup dan delivery dihitung terpisah agar pelanggan dapat memilih pickup saja, delivery saja, drop-off sendiri, atau ambil sendiri. Konfigurasi juga mendukung minimum order, gratis pickup/delivery, biaya area khusus, dan batas coverage.

Alamat di luar zona diberi status `NEEDS_CONFIRMATION`; staf dapat menyetujui atau menolak dengan alasan. Override biaya memerlukan permission dan masuk audit log.

## 6. Di Luar MVP / Fase Berikutnya

- Optimasi rute multi-kurir otomatis.
- Integrasi marketplace dan POS.
- WhatsApp Business API dua arah.
- Loyalty points, referral, voucher, membership, dan subscription laundry pelanggan.
- Inventori bahan kimia, packaging, dan stok.
- Payroll/komisi kurir dan staf.
- Multi-brand white-label penuh.
- Franchise royalty dan konsolidasi holding.
- AI untuk estimasi kapasitas, prediksi keterlambatan, dan klasifikasi foto noda.
- iOS customer app.
- Integrasi printer label thermal dan IoT mesin.

---

## 6. Prinsip UX dan Design

Arah visual: **futuristik, terpercaya, bersih, cepat, dan terasa premium** — bukan sekadar efek neon.

- Landing page: gaya premium SaaS dengan hero kuat, visual alur pakaian digital, gradient biru elektrik–violet–cyan, micro-interactions, dan CTA kontras.
- Dashboard operasional: padat informasi namun tidak ramai; gunakan status color, progress timeline, Kanban, shortcut keyboard, dan mode tablet.
- Customer app: fokus pada satu pertanyaan utama: “Cucian saya sudah sampai mana?”
- Produksi: tombol besar, scan-first, kontras tinggi, tetap terbaca di area kerja.
- Motion: gunakan animasi untuk feedback status, loading, onboarding, dan transisi; hindari animasi yang mengganggu pekerjaan.
- Accessibility: kontras WCAG AA, ukuran tap target minimal 44dp, dukungan font scaling, tidak hanya mengandalkan warna.
- Brand tenant: logo, warna utama, nama layanan, domain/subdomain opsional.

### Halaman landing page minimum

- Hero + CTA Daftar Gratis/Demo.
- Problem/benefit.
- Visual alur: pickup → produksi → delivery.
- Fitur untuk pemilik, staf, kurir, dan pelanggan.
- Screenshot/mockup aplikasi.
- Pricing.
- Testimoni/case study.
- FAQ.
- Form kontak/demo.
- Login dan daftar.
- SEO metadata, sitemap, analytics, dan cookie/consent sesuai kebutuhan.

---

## 7. Dashboard Super Admin SwaraPOS

Dashboard Super Admin digunakan oleh pengelola platform SwaraPOS, bukan oleh owner laundry sehari-hari. Data tenant harus tetap terisolasi dan seluruh akses support ke data tenant wajib tercatat.

### Ringkasan platform

- Total tenant: trial, aktif, overdue, suspended, cancelled.
- Total outlet aktif.
- Total user dan user aktif.
- Total order dan omzet yang tercatat di platform.
- Monthly recurring revenue (MRR) dan subscription baru.
- Churn tenant dan downgrade/upgrade paket.
- Tenant yang gagal onboarding.
- Status layanan, error rate, antrean sinkronisasi, dan notifikasi.

### Manajemen tenant

- Daftar, pencarian, filter, dan detail tenant.
- Status tenant dan subscription.
- Owner utama dan kontak.
- Jumlah outlet, user, order, dan penggunaan kuota.
- Tanggal signup, trial berakhir, invoice, dan riwayat pembayaran subscription.
- Suspend, aktifkan kembali, atau batasi tenant dengan alasan wajib.
- Catatan internal support.
- Export data tenant sesuai kebijakan.

### Manajemen paket dan billing

- Membuat dan mengubah paket Basic/Pro.
- Menentukan harga per outlet per bulan.
- Mengatur feature flag dan limit paket.
- Mengatur trial, grace period, jatuh tempo, dan aturan suspend.
- Membuat invoice subscription.
- Mengelola instruksi pembayaran platform: transfer, link pembayaran, dan QRIS.
- Melihat pembayaran subscription yang menunggu review.
- Melihat bukti bayar, nominal, metode, waktu upload, dan catatan tenant.
- Menyetujui atau menolak bukti bayar dengan alasan wajib.
- Mengganti atau menonaktifkan instruksi pembayaran.
- Upgrade, downgrade, prorata, kredit, dan refund subscription dengan audit log.
- Laporan MRR, ARR, invoice overdue, dan revenue per paket.

### Support dan akses terbatas

- Melihat ringkasan error tenant.
- Membuka detail order untuk membantu support dengan mode read-only.
- Impersonation/support access hanya dengan alasan, durasi, permission khusus, dan audit log.
- Tidak boleh mengubah harga, pembayaran, atau data produksi tenant tanpa approval dan jejak audit.
- Membuat pengumuman maintenance atau pesan platform.

### Monitoring operasional platform

- Health check API, database, worker, storage, dan service pihak ketiga.
- Error log dengan request ID dan tenant ID.
- Queue/outbox backlog.
- Sinkronisasi offline yang gagal.
- Pengiriman WhatsApp manual yang gagal dibuka atau belum ditandai staf.
- Penggunaan storage dan pertumbuhan database.
- Crash/error versi aplikasi Android.

### Keamanan dan kepatuhan

- Manajemen super admin dan MFA.
- Role super admin: platform owner, finance, support, operations, read-only auditor.
- Audit log immutable untuk login, akses tenant, perubahan paket, suspend, refund, dan support access.
- Pengelolaan incident keamanan.
- Permintaan export/delete data tenant.
- Pengelolaan Terms, Privacy Policy, dan versi persetujuan.

### Rekomendasi scope MVP Super Admin

Wajib pada MVP: daftar tenant, detail tenant, status subscription, paket Basic/Pro, invoice manual, instruksi pembayaran transfer/link/QRIS, upload bukti bayar, antrean review, approve/reject dengan alasan, suspend/aktifkan tenant, user super admin, audit log, support read-only, dan monitoring kesehatan platform dasar. Payment gateway, pengecekan mutasi otomatis, dan automation billing dapat menyusul.

---

## 8. Acceptance Criteria MVP

- Admin dapat membuat tenant, outlet, layanan, harga, dan user staf.
- Kasir dapat membuat order sampai menghasilkan nomor order dan label.
- Order dapat berpindah status hanya sesuai transisi yang diizinkan.
- Operator dapat melihat antrean dan menyelesaikan tahap produksi.
- QC wajib tercatat sebelum status ready.
- Kurir dapat menerima tugas dan mengunggah bukti serah-terima.
- Pelanggan dapat melihat timeline tanpa membuka dashboard internal.
- Notifikasi status terkirim dan tercatat di notification log.
- Semua data tenant terisolasi; user tenant A tidak dapat membaca data tenant B.
- Admin dapat melihat laporan dasar dan export CSV.
- Sistem memiliki audit log untuk aksi penting.
- Tenant dapat melihat invoice subscription, instruksi pembayaran aktif, mengunggah bukti bayar, dan melihat status review.
- Finance/Platform Owner dapat menyetujui atau menolak bukti bayar dengan alasan wajib; invoice hanya menjadi `PAID` setelah approval.
- Instruksi transfer, link pembayaran, dan QRIS yang aktif dapat diatur dari Dashboard Super Admin tanpa mengubah kode aplikasi.
- Perubahan instruksi pembayaran, upload bukti, approval, rejection, dan penggantian bukti tercatat dalam audit log.
- Sistem hanya menerima bukti JPEG/JPG, PNG, atau PDF dengan ukuran di bawah 2 MB per file.
- Tenant dapat mengunggah ulang bukti pembayaran, sedangkan bukti dan keputusan sebelumnya tetap tersimpan.
- Sistem mengirim notifikasi Telegram otomatis kepada Platform Owner/Finance untuk pendaftaran tenant baru dan upload bukti pembayaran/perpanjangan.
- Reminder kepada tenant owner dapat dikirim manual pada MVP.
- Perbedaan nominal pembayaran masuk ke review manual dan tidak diputuskan otomatis oleh sistem.
- Aplikasi tetap usable saat koneksi tidak stabil, minimal dengan retry dan draft lokal pada layar operasional.
- Saat offline, user dapat melihat data tersinkron dan menjalankan fitur operasional terbatas; setiap perubahan lokal memiliki status `pending_sync`.
- Saat koneksi kembali, perubahan disinkronkan otomatis tanpa duplikasi dan konflik ditampilkan kepada staf.
- Aksi WhatsApp hanya dapat dikirim setelah order berhasil tersinkron ke server.

---

## 8. Non-Functional Requirements

- Availability target MVP: 99,5% per bulan, tidak termasuk maintenance terjadwal.
- API p95 read < 500 ms pada beban normal; p95 write < 800 ms.
- Tidak ada kehilangan order akibat retry ganda atau timeout.
- Enkripsi in-transit TLS dan encryption-at-rest dari provider database/storage.
- Password di-hash dengan algoritma modern; OTP memiliki expiry dan rate limit.
- Backup database otomatis dan uji restore berkala.
- Observability: structured logs, metrics, tracing untuk endpoint penting, dan error tracking.
- Audit log tidak boleh diedit oleh tenant.
- Retensi data, penghapusan akun, dan export data harus terdokumentasi.
- Aplikasi Android menyimpan antrean sinkronisasi offline secara aman, dengan retry, idempotency, indikator status, dan conflict handling.
- Data offline dibatasi pada data operasional minimum, memiliki TTL, dan tidak boleh dianggap tersinkron sebelum server mengonfirmasi.
- Data lokal yang belum tersinkron harus tetap dapat dipulihkan setelah aplikasi restart.
- PII pelanggan diminimalkan dan aksesnya dicatat.
- Android: dukung minimal Android 8/API 26 pada MVP, keputusan final mengikuti perangkat target pilot.

---

## 9. Open Questions — Yang Masih Kurang dan Wajib Diputuskan

### Wajib sebelum desain final dan coding

1. **Model operasi:** laundry kombinasi sudah dipilih; tetap perlu menentukan layanan dan aturan harga yang wajib tersedia pada pilot.
2. **Wilayah pilot:** kota/area awal; pickup dan delivery MVP memakai zona berbasis radius dari outlet, dengan tarif pickup dan delivery terpisah. Jarak rute jalan dan optimasi rute ditunda.
3. **Peran platform:** rekomendasi awal hanya software untuk laundry existing, bukan marketplace multi-laundry.
4. **Model harga SaaS:** per outlet, per transaksi, per user, atau kombinasi; harga trial dan batas kuota.
5. **Metode pembayaran:** owner menggunakan QRIS, transfer, tunai, atau metode milik masing-masing; SwaraPOS hanya mencatat dan memverifikasi pembayaran secara manual pada MVP. Untuk subscription platform, notifikasi Telegram otomatis dikirim ke Platform Owner/Finance saat tenant baru mendaftar dan saat bukti pembayaran/perpanjangan diunggah; reminder kepada tenant owner dapat dilakukan manual.
6. **Kanal notifikasi:** WhatsApp manual melalui tombol **Kirim WhatsApp** oleh staf sudah dipilih untuk MVP; API resmi ditunda.
7. **Aturan produksi:** apakah setiap tahap wajib discan, bagaimana order batch, dan bagaimana menangani item campuran/parsial.
8. **Kebijakan komplain:** SLA, foto kondisi awal, rewash, refund, dan kompensasi kehilangan/kerusakan.
9. **Data dan legal:** badan usaha, Terms of Service, Privacy Policy, persetujuan pemasaran, retensi foto dan alamat.
10. **Hardware:** printer label, barcode scanner, timbangan digital, dan perangkat Android yang tersedia.
11. **Brand:** nama produk, positioning, tone, warna, dan apakah tenant dapat white-label.
12. **Tim dan timeline:** jumlah engineer/designer/QA, target pilot, serta budget cloud dan third-party services.

### Sangat disarankan

- Mode offline yang lebih kuat untuk kasir/kurir.
- Forecast kapasitas dan cutoff time per outlet.
- Manajemen shift dan approval diskon/refund.
- Import pelanggan/order dari Excel.
- Pusat bantuan dan SOP onboarding.
- Feature flag untuk rollout bertahap.
- Data export dan tenant offboarding yang jelas.

---

## 10. Prioritas Rilis

### Release 0 — Validasi
Landing page, form lead, prototype clickable, wawancara 5–10 pemilik laundry, dan service blueprint.

### Release 1 — MVP pilot
Tenant onboarding, outlet, user/role, customer, order, pricing, status workflow, produksi dasar, QC, tracking pelanggan, notifikasi WhatsApp, pembayaran manual, dashboard dasar.

### Release 2 — Operasional komersial
WhatsApp Business API/provider resmi, printer label, laporan lebih lengkap, review billing yang lebih efisien, audit dan observability production-grade. Payment gateway, pengecekan mutasi otomatis, dan automation billing tetap bukan prioritas awal karena subscription menggunakan upload bukti bayar manual.

### Release 3 — Scale
Multi-outlet lanjutan, optimasi rute, loyalty, inventory, white-label, integrasi, automation, dan analytics lanjutan.

---

## 11. Risiko Produk

- Scope terlalu besar karena variasi aturan laundry sangat tinggi.
- Status digital tidak dipercaya jika staf tidak melakukan scan/checklist.
- Notifikasi WhatsApp mahal atau terkendala template/approval.
- Konflik pembayaran order dengan billing SaaS.
- Data order dan foto pelanggan memiliki risiko privasi.
- Aplikasi futuristik tetapi memperlambat operasional akan ditolak staf.
- Marketplace dan SaaS memiliki unit economics serta operasional berbeda; jangan dicampur di MVP.

**Keputusan yang disarankan:** mulai sebagai **B2B SaaS untuk operasional laundry existing**, dengan customer tracking dan landing page sebagai acquisition/retention layer; tunda marketplace multi-laundry.
