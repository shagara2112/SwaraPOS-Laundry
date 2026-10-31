# Spec — Prototipe Tampilan Web SwaraPOS Laundry

**Tanggal:** 2026-10-31
**Status:** Disetujui secara lisan, menunggu review tertulis
**Sumber:** `PRD.md` v0.1, `TDD.md` v0.1

---

## 1. Tujuan

Membangun seluruh tampilan web SwaraPOS Laundry sebagai **prototipe yang dapat diklik dengan data contoh**, sebelum backend dibuat. Ini setara dengan Release 0 di PRD (landing page + prototype clickable) dan menjadi fondasi frontend Release 1.

### Kriteria berhasil

- Semua halaman di §4 dapat dibuka dan dinavigasi tanpa error.
- Alur demo di §6 berjalan dari awal sampai akhir dalam satu sesi browser.
- Logika inti (§7) lulus unit test.
- `typecheck`, `lint`, `test`, dan `build` lulus.
- Halaman lacak usable di lebar 375 px; dashboard usable di 768 px ke atas.

### Di luar cakupan

Backend/API, autentikasi sungguhan, Flutter Android, cetak label thermal, sinkronisasi offline sungguhan (indikator offline/pending sync hanya visual), notifikasi Telegram, upload file ke storage (file hanya divalidasi di browser).

---

## 2. Pemahaman dan Asumsi

**Dari dokumen:** SaaS multi-tenant untuk laundry kombinasi; web mencakup landing page, dashboard tenant, dashboard produksi, tracking pelanggan, dan Super Admin; WhatsApp manual melalui tombol staf; pembayaran owner-managed; billing langganan per outlet per bulan dengan bukti bayar manual.

**Asumsi:**

- Nama brand sementara **SwaraPOS Laundry** (Open Question #11 PRD masih terbuka).
- "Tampilan dahulu" = frontend dengan data contoh, tanpa backend.
- Harga paket Basic/Pro belum diputuskan; prototipe memakai angka contoh yang ditandai sebagai contoh.

### Temuan dokumen yang ditangani di prototipe

1. TDD belum punya transisi walk-in/drop-off dan ambil sendiri. Prototipe menambahkan:
   - `DRAFT -> RECEIVED` (walk-in/drop-off)
   - `REQUESTED -> RECEIVED` (pelanggan mengantar sendiri setelah request)
   - `READY_FOR_PICKUP -> COMPLETED` (pelanggan ambil sendiri)
2. Status `NEEDS_CONFIRMATION` (zona) dan `AMOUNT_MISMATCH_REVIEW` (bukti bayar) dipakai di UI meski tidak ada di daftar status utama.

Temuan lain (push notification dan payment webhook di TDD, penomoran bagian ganda) tidak memengaruhi tampilan dan dicatat untuk revisi dokumen.

---

## 3. Arsitektur

- **Framework:** Next.js 15 App Router, TypeScript strict, React 19.
- **Styling:** Tailwind CSS v4 dengan design token di CSS variables; komponen dibuat sendiri (tanpa library UI siap pakai).
- **Ikon:** `lucide-react`. **QR:** `qrcode.react`.
- **State demo:** `zustand` dengan `persist` ke `localStorage`; tombol "Reset data demo" mengembalikan seed.
- **Test:** Vitest untuk logika murni di `src/lib/domain`.
- **Lokasi:** folder `web/` di root repo; `api/` dan `mobile/` disisakan untuk fase berikutnya.

### Struktur folder

```text
web/
  src/
    app/
      (marketing)/        landing, masuk, daftar
      onboarding/         wizard 4 langkah
      lacak/[token]/      tracking pelanggan
      app/                dashboard tenant (layout + sidebar)
      admin/              Super Admin (layout + sidebar)
    components/
      ui/                 button, badge, card, input, dialog, drawer, table, tabs, stepper
      order/              status badge, timeline, item editor, label QR, tombol WhatsApp
      layout/             sidebar, topbar, menu bawah mobile
    lib/
      domain/             order-status, pricing, delivery-zone, proof-file, whatsapp (+ *.test.ts)
      store/              zustand store + seed data
      types.ts            tipe domain bersama
      format.ts           format rupiah, tanggal (Asia/Jakarta), berat
```

Domain di `src/lib/domain` tidak bergantung pada React atau store, sehingga dapat dipindah ke backend nanti.

---

## 4. Daftar Halaman

### Publik

| Route | Isi |
|---|---|
| `/` | Hero + CTA Daftar Gratis/Demo, masalah & manfaat, visual alur pickup → produksi → delivery, fitur per peran (pemilik, staf, kurir, pelanggan), mockup aplikasi, harga Basic/Pro, testimoni, FAQ, form demo |
| `/masuk` | Form email/telepon + password atau OTP (visual) → masuk ke `/app` atau `/admin` (pilihan peran demo) |
| `/daftar` | Form pemilik → lanjut ke `/onboarding` |
| `/onboarding` | Wizard: (1) bisnis & logo/warna, (2) outlet, alamat, jam operasional, (3) zona radius & tarif, (4) template layanan & harga |

### Pelanggan

| Route | Isi |
|---|---|
| `/lacak/[token]` | Mobile-first: nomor order, status besar + progres, estimasi selesai, timeline, ringkasan item & tagihan, status bayar + instruksi bayar outlet, kontak outlet. Verifikasi 4 digit terakhir nomor telepon sebelum detail tampil |

### Dashboard tenant `/app`

| Route | Isi |
|---|---|
| `/app` | KPI hari ini (order, omzet, terlambat, piutang), kapasitas produksi per tahap, order mendekati jatuh tempo, WhatsApp belum dikirim |
| `/app/order` | Tabel order: cari, filter status/fulfillment/bayar/outlet, badge status, jatuh tempo |
| `/app/order/baru` | Kasir: pelanggan, fulfillment, item editor, catatan kondisi & foto (placeholder), quote zona, ringkasan harga, simpan → label QR |
| `/app/order/[id]` | Header status + aksi transisi yang diizinkan, timeline, item & price snapshot, pembayaran (catat/verifikasi), log WhatsApp + tombol Kirim WhatsApp, label QR |
| `/app/produksi` | Kanban per tahap, filter SLA/prioritas/layanan, kartu dengan indikator terlambat; mode layar besar (tombol besar, kontras tinggi); gerbang QC |
| `/app/pengantaran` | Tugas pickup/delivery: status kurir, penugasan manual, bukti serah-terima, alasan gagal |
| `/app/pelanggan` | Daftar pelanggan + drawer detail (alamat, preferensi, riwayat order) |
| `/app/layanan` | Katalog layanan: unit harga, harga per outlet, durasi SLA, aktif/nonaktif |
| `/app/laporan` | Pendapatan per layanan/kanal, produktivitas tahap, pelanggan baru/repeat, filter tanggal, tombol Export CSV |
| `/app/langganan` | Paket aktif & penggunaan, daftar invoice, instruksi bayar platform, unggah bukti, riwayat submission |
| `/app/pengaturan` | Tab: outlet, karyawan & peran, zona pengantaran, metode bayar outlet (rekening/QRIS), template WhatsApp |

### Super Admin `/admin`

| Route | Isi |
|---|---|
| `/admin` | Tenant per status, outlet aktif, MRR, submission menunggu review, kesehatan layanan ringkas |
| `/admin/tenant` | Tabel tenant + filter status |
| `/admin/tenant/[id]` | Detail: owner, outlet, penggunaan kuota, invoice, catatan support, suspend/aktifkan (alasan wajib), akses support read-only |
| `/admin/pembayaran` | Antrean review: bukti, nominal klaim vs invoice, metode; setujui / tolak (alasan wajib); tanda selisih nominal |
| `/admin/instruksi-bayar` | CRUD instruksi transfer/link/QRIS, aktif/nonaktif, urutan |
| `/admin/paket` | Paket Basic/Pro: harga per outlet, limit, feature flag |
| `/admin/audit` | Audit log immutable dengan filter aktor/aksi/tenant |
| `/admin/kesehatan` | Status API, DB, worker, storage, antrean outbox, WhatsApp belum ditandai |

---

## 5. Sistem Visual

- **Karakter:** kokpit operasional yang tenang. Landing gelap dengan gradien biru elektrik → violet → cyan dan animasi garis alur pakaian. Dashboard terang secara default dengan aksen gradien tipis; mode gelap tersedia.
- **Warna token:** `--brand-blue #2D5BFF`, `--brand-violet #7C3AED`, `--brand-cyan #06B6D4`, netral slate. Kontras teks minimal WCAG AA.
- **Warna status per fase** (selalu disertai ikon + label):

| Fase | Status | Warna |
|---|---|---|
| Masuk | DRAFT, REQUESTED, PICKUP_ASSIGNED, PICKED_UP, RECEIVED, INSPECTED, WEIGHED_OR_COUNTED | biru |
| Produksi | IN_WASHING, IN_DRYING, IN_IRONING, IN_FINISHING | violet |
| QC | QUALITY_CHECK | amber |
| Siap/antar | READY_FOR_PICKUP, OUT_FOR_DELIVERY | cyan |
| Selesai | DELIVERED, COMPLETED | hijau |
| Pengecualian | ON_HOLD, ISSUE_REPORTED, CANCELLED | oranye/merah |

- **Tipografi:** Plus Jakarta Sans (UI & judul), JetBrains Mono (nomor order, berat, angka tabel).
- **Ukuran:** tap target ≥ 44 px; layar produksi ≥ 56 px.
- **Motion:** 120–300 ms; `prefers-reduced-motion` menonaktifkan animasi dekoratif.
- **Keyboard:** `N` order baru, `/` fokus pencarian.
- **Responsif:** sidebar dashboard menjadi menu bawah di < 768 px.

---

## 6. Alur Demo End-to-End

1. **Kasir** membuat order walk-in/drop-off/pickup → item dengan unit kg/item/pasang/paket + add-on + express → biaya zona dari jarak → total → simpan → nomor order + label QR.
2. **Produksi:** order muncul di kanban → dipindah per tahap → tidak bisa ke `READY_FOR_PICKUP` tanpa QC lulus → hold/kendala/batal wajib alasan.
3. **Detail order:** timeline (aktor, waktu, catatan), catat pembayaran, tombol Kirim WhatsApp membuka `https://wa.me/<nomor>?text=<template+link lacak>` dan log berubah `belum dikirim → dibuka → ditandai terkirim`.
4. **Lacak:** link membuka `/lacak/[token]` dan menampilkan status terbaru order yang sama.
5. **Langganan → Super Admin:** tenant unggah bukti (JPG/PNG/PDF < 2 MB) → `UNDER_REVIEW` → admin setujui (`PAID`) atau tolak dengan alasan → nominal berbeda ditandai `AMOUNT_MISMATCH_REVIEW` → semua tercatat di audit log; unggah ulang tidak menghapus riwayat.

---

## 7. Logika Domain dan Test

| Modul | Tanggung jawab | Test minimum |
|---|---|---|
| `order-status.ts` | Peta transisi, `canTransition`, `nextStatuses`, status yang wajib alasan, gerbang QC | transisi sah/tidak sah, jalur walk-in & ambil sendiri, QC wajib, alasan wajib |
| `pricing.ts` | Subtotal per unit (kg/item/pasang/paket), add-on, express, biaya pickup/delivery, total dalam rupiah integer | tiap unit, pembulatan, kombinasi biaya |
| `delivery-zone.ts` | Jarak garis lurus (haversine), pilih zona, `NEEDS_CONFIRMATION` > 12 km | batas zona 2/5/8/12 km, di luar coverage |
| `proof-file.ts` | Validasi MIME & ukuran bukti bayar | jenis diterima/ditolak, tepat 2 MB ditolak |
| `whatsapp.ts` | Template pesan per event + URL `wa.me` | normalisasi nomor `08…` → `628…`, encoding teks |

Uang disimpan sebagai integer rupiah; waktu disimpan ISO UTC dan ditampilkan di Asia/Jakarta.

---

## 8. Data Contoh

Satu tenant contoh ("Laundry Bersih Kilat", 2 outlet), ±30 order tersebar di semua status, 15 pelanggan, 8 layanan (kiloan reguler, kiloan express, satuan kemeja, bed cover, sepatu, karpet per m², add-on parfum, add-on setrika saja), 3 kurir, zona default PRD, 6 tenant di Super Admin dengan status beragam, 3 submission bukti bayar (satu dengan selisih nominal), dan audit log awal.

---

## 9. Verifikasi

- `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` lulus.
- Cek manual di browser bawaan: setiap area di lebar desktop; `/lacak` dan landing di lebar 375 px; alur §6 dijalankan sekali penuh.
