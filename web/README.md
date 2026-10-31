# SwaraPOS Laundry — Prototipe Tampilan Web

Prototipe yang dapat diklik untuk seluruh tampilan web SwaraPOS Laundry: landing page, onboarding, dashboard tenant, halaman lacak pelanggan, dan Super Admin. Semua data adalah data contoh; belum ada backend.

Spec: [`../docs/superpowers/specs/2026-10-31-web-ui-prototype-design.md`](../docs/superpowers/specs/2026-10-31-web-ui-prototype-design.md)

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:3000
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
src/
  app/                 rute Next.js App Router
  components/          ui/ (komponen dasar), layout/, order/, cashier/, production/, tracking/, billing/, reports/, marketing/, onboarding/
  lib/
    domain/            logika murni tanpa React: mesin status order, harga, zona, WhatsApp, bukti bayar, lacak
    store/             state demo (zustand + localStorage) dan reducer murni per area
    labels.ts          label dan nada warna untuk enum domain
    selectors.ts       KPI dan turunan data
```

Logika di `src/lib/domain` dan reducer di `src/lib/store/actions-*.ts` tidak bergantung pada React, sehingga bisa dipindahkan ke backend saat API dibangun.
