# Prototipe Aplikasi Android SwaraPOS (Expo) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplikasi Android (Expo) untuk owner, kasir, operator, QC, dan kurir dengan data contoh, memakai logika bisnis yang sama dengan web lewat paket bersama `@swarapos/core`.

**Architecture:** npm workspaces di root (`packages/core`, `web`, `mobile`). Logika murni dan reducer pindah dari `web/src/lib` ke `packages/core/src` tanpa perubahan perilaku; web dan mobile masing-masing punya store zustand sendiri (localStorage vs AsyncStorage) yang menjalankan reducer yang sama. Mobile memakai Expo Router dengan grup tab per peran.

**Tech Stack:** Expo SDK 58, Expo Router, React Native, TypeScript strict, zustand, AsyncStorage, expo-camera, react-native-svg, react-native-qrcode-svg, lucide-react-native, NetInfo, Vitest (core).

**Spec:** `docs/superpowers/specs/2026-10-31-android-app-prototype-design.md`

## Global Constraints

- Semua teks UI dalam Bahasa Indonesia; brand SwaraPOS Laundry; data contoh sama dengan web (`createSeed`).
- Logika bisnis hanya di `@swarapos/core`; web dan mobile tidak menyalin logika domain.
- Impor core memakai subpath: `@swarapos/core/<file>` (mis. `@swarapos/core/domain/order-status`), lewat `exports: { "./*": "./src/*.ts" }`.
- Uang integer rupiah; waktu ISO UTC, tampil Asia/Jakarta lewat `@swarapos/core/format`.
- Token warna mobile sama nilainya dengan `web/src/app/globals.css` (mode terang): primary `#2D5BFF`, violet `#7C3AED`, cyan `#06B6D4`, fase intake `#1D4ED8`/`#DBEAFE`, production `#6D28D9`/`#EDE9FE`, qc `#A16207`/`#FEF3C7`, ready `#0E7490`/`#CFFAFE`, done `#15803D`/`#DCFCE7`, exception `#C2410C`/`#FFEDD5`, danger `#DC2626`/`#FEE2E2`, bg `#F5F7FB`, surface `#FFFFFF`, border `#E2E8F0`, fg `#0F172A`, muted `#475569`, subtle `#64748B`.
- Tap target ≥ 44 dp; tombol produksi 56 dp. Status selalu ikon + label.
- Layar yang membaca store menunggu hidrasi AsyncStorage (skeleton) seperti web.
- Hak tombol mengikuti `can(role, action)` dari core (spec §3).
- Perintah per workspace: `npm run <script> -w @swarapos/core|web|mobile` dari root.

## Review Focus

- Izin kamera ditolak: layar Scan dan Foto bukti menampilkan penjelasan + tombol "Izinkan kamera"/input manual, bukan layar kosong atau crash (Task 9, Task 10 — cek manual).
- Expo web / perangkat tanpa kamera: Scan menyediakan input nomor order manual memakai `findOrderByScan` (Task 3 tes, Task 9).
- Data AsyncStorage versi lama/rusak: `migratePersisted` + `parseStoredJson` dari core dipakai di storage mobile (tes sudah ada di core; Task 5 memakai fungsi yang sama).
- Ganti peran di tengah alur: rute pindah ke grup tab peran baru, draf kasir tetap tersimpan per perangkat (Task 5, Task 8 — cek manual).
- Nama/alamat panjang di layar 360 dp: teks dipotong/dibungkus tanpa melebar keluar kartu (Task 6–10 — cek di Expo web 360 px).

---

### Task 1: Workspaces dan paket `@swarapos/core`

**Files:**
- Create: `package.json` (root), `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/vitest.config.ts`
- Move (git mv): `web/src/lib/{types,format,ids,labels,selectors,production}.ts` + tesnya, `web/src/lib/domain/*`, `web/src/lib/store/{state,seed,actions-order,actions-catalog,actions-platform}.ts` + tesnya → `packages/core/src/…` (struktur folder dipertahankan)
- Modify: semua impor di `web/src` yang menunjuk file yang dipindah; `web/next.config.ts` (`transpilePackages: ['@swarapos/core']`); `web/package.json` (dependensi `"@swarapos/core": "*"`, hapus `vitest` bila tak ada tes tersisa selain csv — pertahankan karena `csv.test.ts`); `web/src/components/ui/badge.tsx` (tipe nada dari core)
- Delete: `web/package-lock.json` (diganti lockfile root)

**Interfaces:**
- Produces: `@swarapos/core/<path>` untuk setiap file yang dipindah dengan ekspor identik; `Tone` (di `labels.ts`) = `'intake'|'production'|'qc'|'ready'|'done'|'exception'|'neutral'|'primary'|'success'|'warning'|'danger'`, `PAYMENT_STATUS` dkk. memakai `Tone`.

- [ ] **Step 1:** Root `package.json`: `{ "name": "swarapos", "private": true, "workspaces": ["packages/*", "web", "mobile"] }` (folder `mobile` belum ada; npm mengabaikan pola yang tidak cocok — bila error, tambahkan `mobile` di Task 4).
- [ ] **Step 2:** `packages/core/package.json`: name `@swarapos/core`, private, `"type": "module"`, `"exports": { "./*": "./src/*.ts" }`, scripts `test` (`vitest run`), `typecheck` (`tsc --noEmit`); devDeps `vitest`, `typescript`. `tsconfig.json` strict, `moduleResolution: bundler`, `noEmit`.
- [ ] **Step 3:** `git mv` file-file di atas. Ganti impor `@/lib/...` di dalam core menjadi relatif. `labels.ts`: definisikan `Tone` di core, hapus impor `BadgeTone` dari web.
- [ ] **Step 4:** Di `web/src`, ganti impor ke `@swarapos/core/...` (types, format, ids, labels, selectors, production, domain/*, store/state|seed|actions-*). `badge.tsx`: `export type BadgeTone = Tone`.
- [ ] **Step 5:** `npm install` di root (hapus `web/node_modules` + `web/package-lock.json` dulu bila hoisting bermasalah).
- [ ] **Step 6: Verify**
  Run: `npm test -w @swarapos/core` → Expected: 129 tes lulus (sama seperti sebelum pindah, minus tes csv yang tetap di web).
  Run: `npm run typecheck -w web && npm run lint -w web && npm test -w web && npm run build -w web` → Expected: semua lulus.
- [ ] **Step 7: Commit** `refactor: extract shared business logic into @swarapos/core`

---

### Task 2: Hak per peran (`permissions.ts`)

**Files:** Create `packages/core/src/permissions.ts`, Test `packages/core/src/permissions.test.ts`

**Interfaces:**
- Produces: `type Role = 'OWNER'|'CASHIER'|'OPERATOR'|'QC'|'COURIER'` (sama dengan `StaffRole`); `type Action = 'order.create'|'order.transition'|'order.hold'|'order.cancel'|'order.qc'|'order.payment'|'order.whatsapp'|'delivery.update'|'delivery.assign'|'customer.create'`; `can(role: Role, action: Action): boolean`; `ROLE_HOME: Record<Role, string>` (rute awal: OWNER `/(owner)`, CASHIER `/(kasir)`, OPERATOR `/(operator)`, QC `/(qc)`, COURIER `/(kurir)`).

- [ ] **Step 1: Failing test** — satu `it.each` berisi tabel spec §3 lengkap (setiap pasangan peran×aksi → boolean), plus `order.cancel` hanya OWNER & CASHIER.
- [ ] **Step 2:** Run `npm test -w @swarapos/core -- permissions` → FAIL (module tidak ada).
- [ ] **Step 3:** Implement sebagai `Record<Action, Role[]>`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(core): add role permissions`

---

### Task 3: Scan dan tugas kurir di core, dipakai web

**Files:** Create `packages/core/src/scan.ts`, `packages/core/src/delivery.ts` + tes; Modify `web/src/components/production/scan-box.tsx`, `web/src/app/app/pengantaran/page.tsx`

**Interfaces:**
- Produces:
  - `findOrderByScan(orders: Order[], raw: string): Order | undefined` — trim; cocok `orderNo` tanpa peka huruf, atau `trackingToken`, atau URL yang mengandung `/lacak/<token>` (abaikan `?`/`#` sesudahnya).
  - `isRelevantTask(task: DeliveryTask, order: Order | undefined): boolean` — PICKUP relevan bila order REQUESTED/PICKUP_ASSIGNED; DELIVERY bila OUT_FOR_DELIVERY.
  - `courierTasks(s: DemoState, courierId: string): { active: DeliveryTask[]; history: DeliveryTask[] }` — active = milik kurir, status bukan DONE/FAILED, relevan; history = milik kurir, DONE/FAILED, terbaru dulu.

- [ ] **Step 1: Failing tests**
  - scan: `'KMG-261031-0010'` dan `'kmg-261031-0010'` → order itu; token persis → order; `'https://x.test/lacak/<token>?a=1'` → order; `''`/`'   '` → undefined; `'tidak-ada'` → undefined.
  - delivery: tugas jemput order CANCELLED tidak relevan; tugas antar order OUT_FOR_DELIVERY relevan; `courierTasks` hanya mengembalikan tugas kurir itu dan memisahkan DONE ke history.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement; ganti logika setara di `scan-box.tsx` dan fungsi `relevant` di Pengantaran web dengan impor core.
- [ ] **Step 4:** Run core tests → PASS; web `typecheck` + `test` → lulus.
- [ ] **Step 5: Commit** `feat(core): share scan lookup and courier task filters`

---

### Task 4: Scaffold Expo, tema, font, dan store

**Files:**
- Create: `mobile/` via `npx create-expo-app@latest mobile --template default` lalu hapus contoh layar; `mobile/src/theme.ts`, `mobile/src/store/demo-store.ts`, `mobile/src/store/session-store.ts`, `mobile/src/store/use-hydrated.ts`, `mobile/src/store/act.ts`, `mobile/src/store/hooks.ts`, `mobile/app/_layout.tsx`, `mobile/app/index.tsx`, `mobile/app/masuk.tsx`
- Modify: `mobile/package.json` (dep `"@swarapos/core": "*"`, script `typecheck`), `mobile/app.json` (name "SwaraPOS Laundry", slug `swarapos-laundry`, scheme `swarapos`, android package `id.swarapos.laundry`, orientation portrait, userInterfaceStyle light)

**Interfaces:**
- Produces:
  - `theme` = `{ color: {...token Global Constraints}, radius: { md: 12, lg: 16, xl: 20 }, space: (n) => n*4, font: { sans, sansBold, mono } }`
  - `useDemo` (zustand, sama bentuk `DemoStore` web: `DemoState & { run, reset }`), persist key `swarapos-demo`, versi `DEMO_STATE_VERSION`, storage AsyncStorage dengan `parseStoredJson`, `migrate`/`merge` seperti web (termasuk `shiftDemoTime`).
  - `useSession` (zustand persist, key `swarapos-session`): `{ role: Role | null; outletId: string | null; signIn(role, outletId); signOut() }`
  - `useHydrated(): boolean` (menunggu kedua store)
  - `act(fn, success?)` — seperti web, toast lewat `Alert`/toast ringan mobile
  - hooks: `useOutletOrders()`, `useCustomerMap()`, `useActiveOutlet()` memakai `useSession().outletId`
- `app/index.tsx`: belum terhidrasi → splash; tanpa peran → redirect `/masuk`; ada peran → redirect `ROLE_HOME[role]`.
- `masuk.tsx`: kartu pilihan 5 peran (ikon + label + deskripsi singkat) dan pilihan outlet, tombol "Masuk".

- [ ] **Step 1:** Scaffold + `npx expo install expo-router zustand @react-native-async-storage/async-storage @react-native-community/netinfo react-native-svg react-native-qrcode-svg lucide-react-native expo-camera @expo-google-fonts/plus-jakarta-sans @expo-google-fonts/jetbrains-mono expo-font expo-linking`.
- [ ] **Step 2:** Tambah `mobile` ke workspaces bila belum; `npm install` di root; pastikan Metro membaca `@swarapos/core` (jalankan `npx expo export --platform web` sekali).
- [ ] **Step 3:** Implement tema, store, sesi, layout (font + hidrasi), index redirect, layar Masuk.
- [ ] **Step 4: Verify** `npm run typecheck -w mobile && npm run lint -w mobile`; `npx expo start --web` → buka di browser bawaan 375 px: layar Masuk tampil, memilih Kasir mengarah ke grup kasir (placeholder).
- [ ] **Step 5: Commit** `feat(mobile): scaffold Expo app with shared store and role sign-in`

---

### Task 5: Komponen UI mobile dan kerangka tab per peran

**Files:** Create `mobile/src/ui/{Button,Badge,Card,Field,TextField,Screen,Sheet,ReasonSheet,KpiTile,EmptyState,Skeleton,Toast,Chip,Switch}.tsx`, `mobile/src/components/{StatusBadge,OfflineBadge,TabIcon}.tsx`, `mobile/app/(owner)/_layout.tsx`, `(kasir)/_layout.tsx`, `(operator)/_layout.tsx`, `(qc)/_layout.tsx`, `(kurir)/_layout.tsx`, layar Akun bersama `mobile/src/screens/AccountScreen.tsx` + file rute `akun.tsx` di tiap grup

**Interfaces:**
- `Button` props `{ title, onPress, variant?: 'primary'|'secondary'|'ghost'|'danger'|'whatsapp', size?: 'md'|'lg'|'xl', icon?, disabled?, loading? }` — tinggi md 44, lg 48, xl 56.
- `Badge` `{ tone: Tone, label, icon? }`; `StatusBadge` `{ status }` memakai `STATUS_LABEL` + `statusPhase` + ikon per fase.
- `Sheet` = RN `Modal` bawah `{ visible, onClose, title, children, footer? }`; `ReasonSheet` `{ visible, title, confirmLabel, onConfirm(reason), onClose }` — tombol nonaktif sampai `reason.trim()`.
- `Screen` = SafeArea + header judul + scroll + `OfflineBadge` (NetInfo).
- Tab bar per peran sesuai spec §4 dengan ikon lucide; `AccountScreen`: info peran/outlet, ganti peran (`signOut` → `/masuk`), Reset data demo (konfirmasi `Alert`), versi aplikasi.

- [ ] **Step 1:** Implement komponen + layout tab (layar selain Akun berupa placeholder judul).
- [ ] **Step 2: Verify** typecheck + lint; Expo web 375 px: masuk sebagai tiap peran → tab bar sesuai spec; Akun → ganti peran kembali ke Masuk.
- [ ] **Step 3: Commit** `feat(mobile): add UI kit and role tab shells`

---

### Task 6: Owner — Ringkasan, daftar order, antar-jemput

**Files:** Create `mobile/src/screens/{OwnerHomeScreen,OrderListScreen,DispatchScreen}.tsx`; rute `app/(owner)/index.tsx`, `app/(owner)/order.tsx`, `app/(owner)/antar.tsx`, `app/(kasir)/order.tsx` (ekspor ulang `OrderListScreen`)

**Interfaces:**
- Consumes: `dashboardKpis`, `isLate`, `PRODUCTION_COLUMNS`, `formatDueIn`, `WA_EVENT_LABEL`, `isRelevantTask`, `assignCourier`, `transitionOrder` (buat tugas antar dari order siap diantar).
- `OrderListScreen`: cari (nama/nomor/telepon), chip fase dengan jumlah, kartu order (nomor mono, pelanggan, status, bayar, jatuh tempo merah bila terlambat) → `router.push('/order/<id>')`.
- `DispatchScreen`: segmen Jemput/Antar, strip "siap diantar" (buat tugas), kartu tugas relevan dengan pilihan kurir (sheet daftar kurir outlet) + tombol Tugaskan.

- [ ] **Step 1:** Implement.
- [ ] **Step 2: Verify** typecheck + lint; Expo web: KPI berangka, daftar order bisa dicari & difilter, menugaskan kurir mengubah status tugas.
- [ ] **Step 3: Commit** `feat(mobile): add owner home, order list, and dispatch`

---

### Task 7: Detail order bersama (izin per peran)

**Files:** Create `mobile/src/screens/OrderDetailScreen.tsx`, `mobile/src/components/{StatusActions,QcChecklist,PaymentSheet,WhatsAppPanel,LabelSheet,OrderTimeline}.tsx`; rute `app/order/[id].tsx`

**Interfaces:**
- Consumes: `can`, `nextStatuses`, `requiresReason`, `primaryNext`, `resumeTarget`, `transitionOrder`, `recordQc`, `recordPayment`, `markWhatsApp`, `buildWaMessage`, `buildWaUrl`, `amountDue`, `parseRupiahID`, `formatLineDetail`, `trackingUrl` (origin konstan `https://swarapos.id` untuk prototipe), `customerStatusLabel` tidak dipakai di sini.
- Tombol status: maju (kecuali status kurir PICKUP_ASSIGNED/PICKED_UP/DELIVERED → teks "Lewat tugas kurir"), Tahan/Kendala (`order.hold`), Batalkan (`order.cancel`) dengan `ReasonSheet`.
- QC checklist hanya bila `can(role,'order.qc')` dan status QUALITY_CHECK.
- Bayar: sheet metode + nominal (`parseRupiahID`, ≤ sisa).
- WhatsApp: `Linking.openURL(buildWaUrl(...))` → `markWhatsApp OPENED`, tombol Tandai terkirim; nonaktif + penjelasan bila nomor tidak valid.
- Label: sheet berisi `QRCode` (react-native-qrcode-svg) dengan URL lacak, nomor order, pelanggan, estimasi.

- [ ] **Step 1:** Implement.
- [ ] **Step 2: Verify** typecheck + lint; Expo web: sebagai Kasir tombol QC tidak tampil; sebagai QC tombol maju tidak tampil; hold → lanjutkan bekerja; bayar sebagian lalu lunas; WhatsApp membuka URL `wa.me` (cek lewat `Linking` di web = tab baru).
- [ ] **Step 3: Commit** `feat(mobile): add shared order detail with role-aware actions`

---

### Task 8: Kasir — Order baru dan Pelanggan

**Files:** Create `mobile/src/screens/{NewOrderScreen,CustomersScreen}.tsx`, `mobile/src/components/{CustomerPicker,ServicePicker,OrderSummaryBar}.tsx`; rute `app/(kasir)/index.tsx`, `app/(kasir)/pelanggan.tsx`

**Interfaces:**
- Consumes: `createOrder` (dengan `idempotencyKey` draf), `addCustomer`, `calculateTotals`, `lineTotal`, `estimateDueAt`, `haversineKm`, `quoteDelivery`, `parseDecimalID`, `parseRupiahID`, `formatLineDetail`, `newId`.
- Langkah dalam satu layar gulir: Pelanggan → Penerimaan/Pengembalian (segmen) → Kuota zona (km manual bila tanpa lokasi; luar zona butuh konfirmasi + biaya) → Layanan (chip tambah, baris qty "3,5", add-on, express) → bar ringkasan bawah (total + Simpan, nonaktif dengan daftar alasan saat belum lengkap).
- Draf disimpan di AsyncStorage key `swarapos-kasir-draft` (baca saat inisialisasi, hapus setelah simpan); simpan dijaga `savingRef`.
- Setelah simpan: `router.replace('/order/<id>?baru=1')` → detail membuka `LabelSheet`.
- `CustomersScreen`: cari + tambah (sheet nama/WA/alamat, validasi `normalizePhoneID`).

- [ ] **Step 1:** Implement.
- [ ] **Step 2: Verify** typecheck + lint; Expo web: order drop-off 3,5 kg + parfum + express + diantar ~6 km → total = subtotal + 50% + Rp12.000; dua kali tekan Simpan → satu order; draf kembali setelah reload.
- [ ] **Step 3: Commit** `feat(mobile): add cashier new-order and customers`

---

### Task 9: Operator & QC — Produksi, Scan, Antrean QC

**Files:** Create `mobile/src/screens/{ProductionScreen,QcQueueScreen,ScanScreen}.tsx`; rute `app/(operator)/index.tsx`, `app/(qc)/index.tsx`, `app/scan.tsx`, tab Scan di grup operator & qc mengarah ke `/scan`

**Interfaces:**
- Consumes: `PRODUCTION_COLUMNS`, `HOLD_STATUSES`, `primaryNext`, `isLate`, `transitionOrder`, `recordQc`, `findOrderByScan`.
- Produksi: chip tahap horizontal (jumlah per tahap) + daftar kartu (urut terlambat → express → jatuh tempo), tombol maju xl 56 dp, tombol tahan (ReasonSheet). Kolom QC menampilkan "Menunggu QC" (operator tidak meluluskan QC).
- QC: kartu order QUALITY_CHECK → buka detail (checklist) atau checklist inline.
- Scan: `CameraView` dengan `barcodeScannerSettings: { barcodeTypes: ['qr'] }`; hasil → `findOrderByScan` → `router.replace('/order/<id>')`, tidak ditemukan → pesan. Izin ditolak → penjelasan + tombol minta izin; selalu ada input manual nomor order (fallback web).

- [ ] **Step 1:** Implement.
- [ ] **Step 2: Verify** typecheck + lint; Expo web: majukan order sampai QC sebagai Operator; Lulus QC sebagai QC; input manual nomor order membuka detail.
- [ ] **Step 3: Commit** `feat(mobile): add production, QC queue, and scan`

---

### Task 10: Kurir — Tugas, bukti, riwayat

**Files:** Create `mobile/src/screens/{CourierTasksScreen,CourierTaskScreen,CourierHistoryScreen}.tsx`, `mobile/src/components/{SignaturePad,ProofCamera}.tsx`; rute `app/(kurir)/index.tsx`, `app/(kurir)/riwayat.tsx`, `app/tugas/[id].tsx`

**Interfaces:**
- Consumes: `courierTasks`, `updateDeliveryTask`, `recordPayment` (COD), `buildWaUrl`, `normalizePhoneID`.
- Kurir aktif = staf COURIER pertama di outlet sesi (prototipe).
- Detail tugas: alamat + tombol "Buka Maps" (`Linking` ke `https://www.google.com/maps/search/?api=1&query=<alamat>`), Telepon (`tel:`), WhatsApp; tahap ASSIGNED→ACCEPTED→ON_THE_WAY→ARRIVED; Selesai membuka sheet bukti: foto (`ProofCamera` dengan `takePictureAsync`, simpan URI lokal saja), `SignaturePad` (react-native-svg Path dari PanResponder, tombol Hapus), nama penerima → `updateDeliveryTask(DONE, { proof: { receiverName, method: foto ? 'PHOTO' : 'SIGNATURE' } })`; Gagal → ReasonSheet; tombol Catat COD bila sisa tagihan > 0 dan tugas DELIVERY.
- Riwayat: tugas selesai/gagal terbaru.

- [ ] **Step 1:** Implement.
- [ ] **Step 2: Verify** typecheck + lint; Expo web: tugas jemput yang ditugaskan Owner muncul; tahap sampai Selesai dengan tanda tangan + nama → order "Sudah dijemput"; gagal wajib alasan.
- [ ] **Step 3: Commit** `feat(mobile): add courier tasks with proof of handover`

---

### Task 11: Verifikasi akhir

**Files:** Create `mobile/README.md` (cara menjalankan dengan Expo Go, peran demo, batasan); Modify `web/README.md` (struktur workspace)

- [ ] **Step 1:** `npm test -w @swarapos/core`, `npm run typecheck -w web && npm run lint -w web && npm test -w web && npm run build -w web`, `npm run typecheck -w mobile && npm run lint -w mobile` → semua lulus.
- [ ] **Step 2:** Walkthrough spec §5 di Expo web lebar 375 px dan 360 px (kecuali kamera), console bersih.
- [ ] **Step 3:** Jalankan `npx expo start` dan berikan instruksi Expo Go ke pemilik (QR dari terminal) untuk uji kamera.
- [ ] **Step 4: Commit** `docs(mobile): add README`
