# Spec — Prototipe Aplikasi Android SwaraPOS Laundry (Expo)

**Tanggal:** 2026-10-31
**Status:** Disetujui secara lisan, menunggu review tertulis
**Sumber:** `PRD.md`, `TDD.md`, spec web `2026-10-31-web-ui-prototype-design.md`

---

## 1. Tujuan

Membangun aplikasi Android untuk owner, kasir, operator, QC, dan kurir sebagai **prototipe yang dapat dicoba di HP lewat Expo Go dengan data contoh**, memakai logika bisnis yang sama dengan web. Backend menyusul; aplikasi disambungkan ke API pada tahap berikutnya.

### Keputusan yang sudah diambil

- Teknologi: **React Native + Expo** (menggantikan Flutter di TDD §1/§13; menjawab ADR #3 "Flutter vs native Android"). Alasan: satu bahasa (TypeScript) dengan web dan backend NestJS, dan logika bisnis ber-unit-test dapat dipakai bersama.
- Server produksi nantinya di PC owner platform, diakses lewat domain + HTTPS (Cloudflare Tunnel). Tidak memengaruhi prototipe ini.
- Distribusi akhir: Google Play Store (closed testing ≥12 tester × 14 hari untuk akun pribadi; target Android 16/API 36). Tidak termasuk tahap ini.

### Kriteria berhasil

- Semua layar di §4 dapat dibuka di Expo Go tanpa error, untuk kelima peran.
- Alur demo §5 berjalan di satu perangkat.
- Seluruh tes logika yang sudah ada (129) lulus dari paket bersama, ditambah tes logika baru §6.
- Web tetap lulus `typecheck`, `lint`, `test`, `build` setelah pindah ke paket bersama.
- Aplikasi lulus `typecheck` dan `lint`; tampilan diperiksa lewat Expo web pada lebar 375 px.

### Di luar cakupan

Backend dan login sungguhan; sinkron data antar perangkat; printer thermal Bluetooth (butuh development build); push notification; iOS; build dan upload Play Store; sinkronisasi offline sungguhan (indikator offline/pending sync hanya visual).

---

## 2. Arsitektur dan Struktur Repo

npm workspaces di root repo:

```text
laundry-app/
  package.json            workspaces: ["packages/*", "web", "mobile"]
  packages/core/          @swarapos/core — logika bisnis murni + tes (Vitest)
  web/                    Next.js (sudah ada), impor logika dari @swarapos/core
  mobile/                 Expo SDK 58, Expo Router, TypeScript
```

### `@swarapos/core`

Dipindahkan dari `web/src/lib` tanpa mengubah perilaku:

| Dari web | Ke core |
|---|---|
| `lib/types.ts`, `lib/format.ts`, `lib/ids.ts` | `src/types.ts`, `src/format.ts`, `src/ids.ts` |
| `lib/domain/*` | `src/domain/*` |
| `lib/store/state.ts`, `seed.ts`, `actions-*.ts` | `src/store/*` |
| `lib/selectors.ts`, `lib/production.ts`, `lib/labels.ts` | `src/*` |

- Impor internal memakai path relatif (alias `@/` milik web tidak berlaku di paket).
- `labels.ts` tidak lagi mengimpor tipe dari komponen web; tipe nada warna (`Tone`) didefinisikan di core dan dipakai `Badge` web.
- Paket dikonsumsi sebagai sumber TypeScript (`"main": "src/index.ts"`); web memakai `transpilePackages`, Metro (Expo) membaca workspace secara bawaan.
- Tetap di web (bergantung pada browser/React web): `demo-store.ts` (localStorage), `use-hydrated.ts`, `act.ts`, `hooks.ts`, `ui-store.ts`, `use-now.ts`, `csv.ts`, `cn.ts`.

### `mobile/`

- **Navigasi:** Expo Router. `app/masuk.tsx` (pilih peran + outlet), grup tab per peran `app/(owner)`, `app/(kasir)`, `app/(operator)`, `app/(qc)`, `app/(kurir)`, dan layar stack bersama `app/order/[id].tsx`, `app/tugas/[id].tsx`, `app/scan.tsx`.
- **State:** zustand + `persist` dengan AsyncStorage, memakai `createSeed`, reducer, dan `migratePersisted` dari core (pola sama dengan web: `run(fn)` + skeleton sampai terhidrasi). Sesi demo (peran, outlet) di store kecil terpisah.
- **Tampilan:** `StyleSheet` + token di `src/theme.ts` dengan nilai warna yang sama dengan web (brand blue/violet/cyan, warna fase status, mode terang). Tanpa NativeWind.
- **Library:** `expo-router`, `zustand`, `@react-native-async-storage/async-storage`, `expo-camera` (scan QR + foto bukti), `react-native-svg` (tanda tangan), `react-native-qrcode-svg` (label), `lucide-react-native`, `@react-native-community/netinfo`, font `@expo-google-fonts/plus-jakarta-sans` dan `jetbrains-mono`.
- Layar yang dipakai beberapa peran (daftar order, detail order) ditulis sekali di `src/screens/` dan diekspor ulang oleh file rute.

---

## 3. Hak per Peran

Matriks di core (`src/permissions.ts`), dipakai untuk menampilkan atau menyembunyikan tombol:

| Aksi | Owner | Kasir | Operator | QC | Kurir |
|---|:-:|:-:|:-:|:-:|:-:|
| `order.create` | ✓ | ✓ | | | |
| `order.transition` (produksi & status) | ✓ | ✓ | ✓ | | |
| `order.hold` (tahan/kendala/batal) | ✓ | ✓ | ✓ | ✓ | |
| `order.qc` | ✓ | | | ✓ | |
| `order.payment` | ✓ | ✓ | | | ✓ |
| `order.whatsapp` | ✓ | ✓ | | | |
| `delivery.update` (tahap tugas, bukti, gagal) | ✓ | | | | ✓ |
| `delivery.assign` | ✓ | ✓ | | | |
| `customer.create` | ✓ | ✓ | | | |

`order.cancel` hanya Owner dan Kasir. Kurir mencatat pembayaran untuk bayar-saat-antar (COD).

---

## 4. Layar

| Peran | Tab bawah | Isi |
|---|---|---|
| Semua | — | **Masuk (demo):** pilih peran dan outlet. **Akun:** nama/peran/outlet, ganti peran, indikator koneksi, Reset data demo |
| Owner | Ringkasan · Order · Antar-jemput · Akun | KPI hari ini, antrean per tahap, perlu perhatian, WhatsApp belum dikirim; daftar + detail order; tugas kurir (assign) |
| Kasir | Order baru · Order · Pelanggan · Akun | Alur kasir: pelanggan (cari/tambah), penerimaan & pengembalian, layanan + berat/jumlah ("3,5"), add-on, express, kuota zona/konfirmasi luar zona, ringkasan, simpan (kunci idempotensi) → layar label QR; detail order (status, bayar, Kirim WhatsApp + tandai terkirim); daftar + tambah pelanggan |
| Operator | Produksi · Scan · Akun | Chip tahap (Diterima, Cuci, Kering, Setrika, Finishing, QC, Siap, Ditahan) + daftar kartu urut terlambat/express/jatuh tempo, tombol maju 56 px, tahan dengan alasan; Scan QR → detail order |
| QC | Antrean QC · Scan · Akun | Kartu order di tahap QC → checklist 5 poin → Lulus (siap) / Cuci ulang (alasan wajib) |
| Kurir | Tugas · Riwayat · Akun | Tugas jemput/antar yang relevan (sama aturannya dengan web); detail tugas: alamat + buka Google Maps, telepon/WhatsApp pelanggan, tahap terima → berangkat → tiba, Selesai dengan foto (kamera) + tanda tangan + nama penerima, atau Gagal + alasan; catat COD; riwayat tugas selesai/gagal |

Detail order sama untuk semua peran; tombol mengikuti §3. Langganan, Pengaturan, Laporan lengkap, dan Super Admin tetap di web.

---

## 5. Alur Demo di Satu Perangkat

1. Masuk sebagai **Kasir** → order dijemput + diantar → simpan → label QR tampil.
2. Ganti ke **Owner** → Antar-jemput → tugaskan kurir untuk jemput.
3. Ganti ke **Kurir** → tugas jemput → terima → berangkat → tiba → foto + tanda tangan + nama → selesai (order "Sudah dijemput").
4. Ganti ke **Operator** → Scan QR label (atau pilih kartu) → majukan sampai QC.
5. Ganti ke **QC** → checklist → Lulus → "Siap diantar".
6. Ganti ke **Kasir** → detail order → Kirim WhatsApp → tandai terkirim → catat bayar.
7. Ganti ke **Owner/Kasir** → buat tugas antar → **Kurir** menyelesaikan dengan bukti → order "Sudah diantar".

---

## 6. Logika Baru dan Tes

| Modul (core) | Tanggung jawab | Tes minimum |
|---|---|---|
| `permissions.ts` | `can(role, action): boolean`, `ROLE_TABS` (urutan tab per peran) | setiap peran di §3, aksi yang dilarang |
| `scan.ts` | `findOrderByScan(orders, raw)`: nomor order (tanpa peka huruf), token, atau URL `/lacak/<token>` | tiga bentuk input, input kosong, tidak ditemukan |
| `delivery.ts` | `relevantTask(task, order)` dan `courierTasks(state, courierId)` (dipindah dari logika halaman Pengantaran web) | tugas order batal/selesai tidak muncul; hanya tugas kurir itu |

Halaman Pengantaran dan kotak scan web ikut memakai fungsi ini (menghapus duplikasi).

---

## 7. Verifikasi

- `npm test -w @swarapos/core` lulus (≥129 + tes baru).
- `web`: `typecheck`, `lint`, `test` (sisa tes web seperti CSV), `build` lulus.
- `mobile`: `typecheck`, `lint`; `npx expo start --web` diperiksa di browser bawaan lebar 375 px untuk setiap peran dan alur §5 (kecuali kamera).
- Uji manual pemilik di HP Android dengan Expo Go: scan label dan foto bukti dengan kamera sungguhan.
