# SwaraPOS Laundry — Prototipe Aplikasi Android

Prototipe aplikasi staf (Expo / React Native) untuk lima peran: Owner, Kasir, Operator, QC, dan Kurir. Semua data adalah data contoh yang disimpan di perangkat; belum ada backend. Logika bisnis memakai paket yang sama dengan web, `@swarapos/core` (`../packages/core`).

Spec: [`../docs/superpowers/specs/2026-10-31-android-app-prototype-design.md`](../docs/superpowers/specs/2026-10-31-android-app-prototype-design.md)

## Menjalankan di HP Android (Expo Go)

1. Pasang **Expo Go** dari Play Store di HP.
2. Pastikan HP dan PC berada di jaringan Wi‑Fi yang sama.
3. Di PC:

   ```bash
   cd mobile
   npm install
   npx expo start
   ```

4. Buka Expo Go, pilih **Scan QR code**, lalu pindai QR yang muncul di terminal.

Kamera (scan QR label dan foto bukti serah-terima) hanya bisa diuji di HP. Bila Expo Go tidak bisa terhubung (jaringan kantor sering memblokir), jalankan `npx expo start --tunnel`.

Di browser untuk pengecekan cepat (tanpa kamera): `npm run web`.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npx expo start` | Server pengembangan untuk Expo Go |
| `npm run web` | Versi web untuk pengecekan tampilan |
| `npm run typecheck` | Pemeriksaan tipe TypeScript |
| `npm run lint` | ESLint (`expo lint`) |

Tes logika bisnis ada di paket core: `npm --prefix ../packages/core test`.

## Mode demo

- Layar **Masuk** memilih peran dan outlet; tidak ada kata sandi. Ganti peran lewat tab **Akun → Ganti peran**.
- **Akun → Reset data demo** mengembalikan data contoh ke awal.
- Data tersimpan di perangkat (AsyncStorage), terpisah dari data demo di web.
- Tombol WhatsApp membuka WhatsApp dengan pesan terisi; staf menekan kirim sendiri, lalu menandai terkirim di aplikasi.
- QR label berisi link lacak `https://swarapos.id/lacak/<token>`; pemindai menerima QR itu, token, atau nomor order yang diketik.

### Alur demo di satu HP

1. **Kasir** → order dijemput + diantar → simpan → label QR tampil.
2. **Owner** → Antar-jemput → tugaskan kurir untuk jemput.
3. **Kurir** → tugas jemput → terima → berangkat → tiba → foto/tanda tangan + nama → selesai.
4. **Operator** → Scan label (atau ketik nomor order) → terima di outlet → majukan sampai QC.
5. **QC** → checklist → Lulus → order terbaca "Siap diantar".
6. **Kasir** → detail order → Kirim WhatsApp → tandai terkirim → catat bayar.
7. **Kasir/Owner** → detail order → buat tugas antar → tugaskan kurir → **Kurir** catat COD bila ada sisa, lalu selesai dengan bukti.

## Hak per peran

| Peran | Tab |
|---|---|
| Owner | Ringkasan · Order · Antar-jemput · Akun |
| Kasir | Order baru · Order · Pelanggan · Akun |
| Operator | Produksi · Scan · Akun |
| QC | Antrean QC · Scan · Akun |
| Kurir | Tugas · Riwayat · Akun |

Tombol di detail order mengikuti matriks `can(role, action)` di `@swarapos/core/permissions`.

## Batasan prototipe

- Belum ada login, sinkronisasi, atau backend; tiap perangkat punya data sendiri.
- Foto bukti hanya tersimpan sebagai berkas sementara di HP; yang tercatat di tugas adalah nama penerima dan metode bukti.
- Cetak label ke printer thermal Bluetooth belum tersedia.
- Langganan, pengaturan, laporan lengkap, dan Super Admin tetap di web.
- Rilis Play Store memerlukan build Android (EAS Build) dan uji tertutup; Expo Go hanya untuk pengujian.

## Struktur

```text
src/
  app/          rute Expo Router: masuk, owner/, kasir/, operator/, qc/, kurir/ (tab per peran), order/[id], tugas/[id]
  screens/      layar per fitur (dipakai ulang oleh beberapa rute)
  components/   komponen domain: kartu order, checklist QC, lembar bayar, WhatsApp, label, tanda tangan, kamera
  ui/           komponen dasar: Button, Card, Sheet, TextField, Screen, Toast
  store/        zustand + AsyncStorage: data demo, sesi peran, hook turunan
  theme.ts      warna, font, jarak
```
