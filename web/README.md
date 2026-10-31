# SwaraPOS Laundry — Prototipe Tampilan Web

Prototipe yang dapat diklik untuk seluruh tampilan web SwaraPOS Laundry: landing page, onboarding, dashboard tenant, halaman lacak pelanggan, dan Super Admin. Semua data adalah data contoh; belum ada backend.

Spec: [`../docs/superpowers/specs/2026-10-31-web-ui-prototype-design.md`](../docs/superpowers/specs/2026-10-31-web-ui-prototype-design.md)

## Menjalankan

Repo ini memakai npm workspaces (`packages/core` dan `web`). Pasang dependensi dari root repo:

```bash
npm install              # di root repo
npm --prefix web run dev # http://localhost:3000
```

Perintah lain:

| Perintah | Fungsi |
|---|---|
| `npm run test` | Unit test Vitest untuk logika domain dan reducer store |
| `npm run typecheck` | Pemeriksaan tipe TypeScript |
| `npm run lint` | ESLint |
| `npm run build` | Build produksi |

## Mode demo

- Data contoh dibuat saat pertama dibuka (1 tenant, 2 outlet, ±30 order, 15 pelanggan, 6 tenant di Super Admin) dan disimpan di `localStorage` browser.
- Tombol **Reset data demo** (ikon putar di topbar) mengembalikan data ke awal.
- Link lacak pelanggan hanya bekerja di browser yang sama dengan dashboard, karena datanya ada di `localStorage`.
- Masuk: buka `/masuk` lalu pilih **Masuk sebagai Owner Laundry** atau **Masuk sebagai Super Admin**.
- Tombol **Kirim WhatsApp** membuka `wa.me` dengan pesan terisi; staf menekan kirim sendiri, lalu menandai terkirim.

## Rute

| Area | Rute |
|---|---|
| Publik | `/`, `/masuk`, `/daftar`, `/onboarding` |
| Pelanggan | `/lacak/[token]` (verifikasi 4 digit terakhir nomor WhatsApp) |
| Dashboard tenant | `/app`, `/app/order`, `/app/order/baru`, `/app/order/[id]`, `/app/produksi`, `/app/pengantaran`, `/app/pelanggan`, `/app/layanan`, `/app/laporan`, `/app/langganan`, `/app/pengaturan` |
| Super Admin | `/admin`, `/admin/tenant`, `/admin/tenant/[id]`, `/admin/pembayaran`, `/admin/instruksi-bayar`, `/admin/paket`, `/admin/audit`, `/admin/kesehatan` |

Pintasan di dashboard tenant: `N` membuka order baru, `/` memfokuskan pencarian, `Ctrl+Enter` menyimpan order di kasir.

## Struktur

```text
packages/core/src/     logika murni bersama web dan aplikasi Android (@swarapos/core)
  domain/              mesin status order, harga, zona, WhatsApp, bukti bayar, lacak
  store/               tipe state demo, data contoh, reducer murni per area
  cashier.ts           ringkasan draf kasir (harga, zona, alasan belum bisa simpan)
  permissions.ts       hak aksi per peran staf
  labels.ts            label dan nada warna untuk enum domain
  selectors.ts         KPI dan turunan data
web/src/
  app/                 rute Next.js App Router
  components/          ui/ (komponen dasar), layout/, order/, cashier/, production/, tracking/, billing/, reports/, marketing/, onboarding/
  lib/store/           store zustand + localStorage dan hook React
mobile/                aplikasi Android (Expo), lihat mobile/README.md
```

Web mengimpor core sebagai sumber TypeScript (`@swarapos/core/<modul>`, lewat `transpilePackages`). Logika di core tidak bergantung pada React, sehingga bisa dipindahkan ke backend saat API dibangun.
