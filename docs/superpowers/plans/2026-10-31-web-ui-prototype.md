# Prototipe Tampilan Web SwaraPOS Laundry — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun seluruh tampilan web SwaraPOS Laundry (landing, onboarding, dashboard tenant, lacak pelanggan, Super Admin) sebagai prototipe yang dapat diklik dengan data contoh.

**Architecture:** Satu aplikasi Next.js App Router di `web/`. Logika domain murni di `src/lib/domain` (tanpa React, ber-unit-test). State demo di store zustand yang dipersist ke `localStorage`; semua mutasi lewat reducer murni di `src/lib/store/actions*.ts` yang juga ber-unit-test. Halaman hanya membaca store dan memanggil aksi.

**Tech Stack:** Next.js 15, React 19, TypeScript strict, Tailwind CSS v4, zustand, lucide-react, qrcode.react, clsx, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-31-web-ui-prototype-design.md`

## Global Constraints

- Semua perintah npm dijalankan dari folder `web/`.
- Next.js 15 App Router, React 19, TypeScript `strict: true`, Tailwind CSS v4; tidak memakai library komponen UI siap pakai.
- Seluruh teks UI dalam Bahasa Indonesia. Brand: **SwaraPOS Laundry**. Tenant contoh: **Laundry Bersih Kilat** (2 outlet: Kemang `KMG`, Tebet `TBT`).
- Uang disimpan sebagai integer rupiah. Waktu disimpan sebagai string ISO UTC dan ditampilkan di `Asia/Jakarta` hanya melalui `src/lib/format.ts`.
- Token warna: `--brand-blue #2D5BFF`, `--brand-violet #7C3AED`, `--brand-cyan #06B6D4`, netral slate. Kontras teks minimal WCAG AA.
- Warna status per fase: masuk = biru, produksi = violet, QC = amber, siap/antar = cyan, selesai = hijau, pengecualian = oranye/merah. Status selalu tampil dengan ikon + label, tidak hanya warna.
- Font: Plus Jakarta Sans (UI & judul), JetBrains Mono (nomor order, berat, angka tabel) via `next/font/google`.
- Tap target ≥ 44 px; tombol layar produksi ≥ 56 px. Animasi 120–300 ms; `prefers-reduced-motion: reduce` mematikan animasi dekoratif.
- Dashboard terang secara default dengan toggle mode gelap; landing page gelap.
- Bukti bayar hanya `image/jpeg`, `image/png`, `application/pdf` dengan ukuran `< 2 MB` (2.097.152 byte ditolak).
- Zona default: Zona 1 0–2 km Rp5.000/Rp5.000; Zona 2 >2–5 km Rp8.000/Rp8.000; Zona 3 >5–8 km Rp12.000/Rp12.000; Zona 4 >8–12 km Rp18.000/Rp18.000; >12 km `NEEDS_CONFIRMATION`.
- Halaman yang membaca store adalah client component dan merender skeleton sampai `useHydrated()` bernilai `true`, supaya tidak ada hydration mismatch.
- Komponen tidak menduplikasi logika yang sudah ada di `src/lib/domain`; selalu panggil fungsi domainnya.
- Sebelum menulis grafik apa pun (Task 14, Task 16), muat skill `dataviz`.

## Review Focus

- Berat diketik dengan koma (`3,5`) di kasir harus terbaca 3,5 kg, bukan ditolak atau jadi 35 — `parseDecimalID` (Task 1).
- Nomor telepon beragam format (`0812-…`, `+62 …`, spasi) harus jadi `628…`; nomor kosong/tidak valid membuat tombol WhatsApp nonaktif dengan penjelasan, bukan membuka `wa.me` rusak — `normalizePhoneID`/`buildWaUrl` (Task 4).
- Alasan berisi spasi saja untuk hold/batal/tolak/suspend harus ditolak — `canTransition` (Task 2), `reviewSubmission`/`setTenantStatus` (Task 6).
- `localStorage` dari versi lama atau rusak harus diganti seed baru, bukan crash — `migratePersisted` (Task 5).
- Token lacak tidak dikenal atau 4 digit telepon salah harus menampilkan pesan ramah — `verifyTrackingPhone` (Task 4) dan state "tidak ditemukan" (Task 13).

---

### Task 1: Scaffold aplikasi web, design token, dan format

**Files:**
- Create: `web/` (via create-next-app), `web/vitest.config.ts`, `web/src/lib/format.ts`, `web/src/lib/cn.ts`
- Modify: `web/package.json` (scripts), `web/src/app/globals.css`, `web/src/app/layout.tsx`, `web/src/app/page.tsx`
- Test: `web/src/lib/format.test.ts`

**Interfaces:**
- Produces:
  - `formatRupiah(amount: number): string`
  - `formatDateTime(iso: string): string` — contoh `"1 Nov 2026, 01.00"`
  - `formatDate(iso: string): string` — contoh `"1 Nov 2026"`
  - `formatWeight(kg: number): string`
  - `parseDecimalID(input: string): number | null`
  - `cn(...classes: ClassValue[]): string` (wrapper `clsx`)
  - CSS variables token di `globals.css`; font variable `--font-sans`, `--font-mono`

- [ ] **Step 1: Scaffold**

Run (dari root repo): `npx create-next-app@15 web --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --turbopack --yes`
Lalu di `web/`: `npm i zustand lucide-react qrcode.react clsx` dan `npm i -D vitest`.
Tambahkan scripts: `"test": "vitest run"`, `"typecheck": "tsc --noEmit"`. `vitest.config.ts`: environment `node`, alias `@` → `./src`.

- [ ] **Step 2: Write the failing test** `web/src/lib/format.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { formatRupiah, formatDateTime, formatDate, formatWeight, parseDecimalID } from './format'

describe('formatRupiah', () => {
  it('memakai titik ribuan tanpa spasi', () => {
    expect(formatRupiah(12500)).toBe('Rp12.500')
    expect(formatRupiah(0)).toBe('Rp0')
    expect(formatRupiah(1250000)).toBe('Rp1.250.000')
  })
})

describe('tanggal Asia/Jakarta', () => {
  it('menggeser UTC ke WIB', () => {
    expect(formatDate('2026-10-31T18:00:00Z')).toBe('1 Nov 2026')
    expect(formatDateTime('2026-10-31T03:30:00Z')).toContain('31 Okt 2026')
    expect(formatDateTime('2026-10-31T03:30:00Z')).toContain('10.30')
  })
})

describe('formatWeight', () => {
  it('memakai koma desimal', () => {
    expect(formatWeight(3.5)).toBe('3,5 kg')
    expect(formatWeight(4)).toBe('4 kg')
  })
})

describe('parseDecimalID', () => {
  it('menerima koma dan titik', () => {
    expect(parseDecimalID('3,5')).toBe(3.5)
    expect(parseDecimalID('3.5')).toBe(3.5)
    expect(parseDecimalID(' 2 ')).toBe(2)
  })
  it('menolak input kosong, huruf, dan negatif', () => {
    expect(parseDecimalID('')).toBeNull()
    expect(parseDecimalID('abc')).toBeNull()
    expect(parseDecimalID('-1')).toBeNull()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- src/lib/format.test.ts`
Expected: FAIL — `Cannot find module './format'`.

- [ ] **Step 4: Implement `src/lib/format.ts` dan `src/lib/cn.ts`**

`formatRupiah` = `'Rp' + amount.toLocaleString('id-ID')`. Tanggal memakai `Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', ... })`. `formatWeight` memakai `toLocaleString('id-ID', { maximumFractionDigits: 2 })`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- src/lib/format.test.ts`
Expected: PASS (6 test).

- [ ] **Step 6: Design token dan font**

`globals.css`: `@import "tailwindcss";` lalu `@theme` berisi warna brand, warna fase (`--color-phase-intake`, `-production`, `-qc`, `-ready`, `-done`, `-exception` beserta varian `-soft` untuk latar badge), `--font-sans`, `--font-mono`, radius, shadow. Mode gelap lewat `[data-theme="dark"]` yang menimpa variabel netral. Blok `@media (prefers-reduced-motion: reduce)` mematikan `animation`/`transition` dekoratif. `layout.tsx`: muat `Plus_Jakarta_Sans` dan `JetBrains_Mono` sebagai CSS variable, `lang="id"`, metadata default `title: { default: 'SwaraPOS Laundry', template: '%s · SwaraPOS Laundry' }`. `page.tsx` sementara berisi judul saja.

- [ ] **Step 7: Verify**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: ketiganya selesai tanpa error.

- [ ] **Step 8: Commit**

```bash
git add web
git commit -m "feat(web): scaffold Next.js app with tokens and format helpers"
```

---

### Task 2: Tipe domain dan mesin status order

**Files:**
- Create: `web/src/lib/types.ts`, `web/src/lib/domain/order-status.ts`
- Test: `web/src/lib/domain/order-status.test.ts`

**Interfaces:**
- Produces (`types.ts`) — dipakai semua task berikutnya:

```ts
export type OrderStatus =
  | 'DRAFT' | 'REQUESTED' | 'PICKUP_ASSIGNED' | 'PICKED_UP' | 'RECEIVED' | 'INSPECTED'
  | 'WEIGHED_OR_COUNTED' | 'IN_WASHING' | 'IN_DRYING' | 'IN_IRONING' | 'IN_FINISHING'
  | 'QUALITY_CHECK' | 'READY_FOR_PICKUP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'COMPLETED'
  | 'CANCELLED' | 'ON_HOLD' | 'ISSUE_REPORTED'
export type StatusPhase = 'intake' | 'production' | 'qc' | 'ready' | 'done' | 'exception'
export type PricingUnit = 'KG' | 'ITEM' | 'PAIR' | 'PACKAGE' | 'SQM' | 'ADDON'
export type IntakeType = 'WALK_IN' | 'DROP_OFF' | 'PICKUP'
export type HandbackType = 'SELF_PICKUP' | 'DELIVERY'
export type OrderChannel = 'CASHIER' | 'LANDING' | 'WHATSAPP'
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED' | 'FAILED'
export type OrderPaymentMethod = 'CASH' | 'TRANSFER' | 'QRIS' | 'COD'
export type WaEvent = 'ORDER_RECEIVED' | 'IN_PROCESS' | 'READY' | 'OUT_FOR_DELIVERY' | 'COMPLETED' | 'PAYMENT_DUE' | 'ISSUE'
export type WaState = 'NOT_SENT' | 'OPENED' | 'SENT'
export type StaffRole = 'OWNER' | 'CASHIER' | 'OPERATOR' | 'QC' | 'COURIER'
export type DeliveryTaskStatus = 'UNASSIGNED' | 'ASSIGNED' | 'ACCEPTED' | 'ON_THE_WAY' | 'ARRIVED' | 'DONE' | 'FAILED'
export type TenantStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED'
export type PlanCode = 'BASIC' | 'PRO'
export type InvoiceStatus = 'UNPAID' | 'UNDER_REVIEW' | 'PAID' | 'OVERDUE'
export type SubmissionStatus = 'UNDER_REVIEW' | 'AMOUNT_MISMATCH_REVIEW' | 'APPROVED' | 'REJECTED'
export type InstructionMethod = 'TRANSFER' | 'LINK' | 'QRIS'

export interface Actor { id: string; name: string }
export interface LatLng { lat: number; lng: number }
export interface Outlet extends LatLng { id: string; code: string; name: string; address: string; phone: string; hours: string }
export interface Customer { id: string; name: string; phone: string; address?: string; location?: LatLng; notes?: string; createdAt: string }
export interface Service { id: string; name: string; category: string; unit: PricingUnit; prices: Record<string, number>; durationHours: number; active: boolean }
export interface OrderItem { id: string; serviceId: string; name: string; unit: PricingUnit; qty: number; unitPrice: number; total: number }
export interface OrderTotals { subtotal: number; expressFee: number; pickupFee: number; deliveryFee: number; total: number }
export interface StatusEvent { id: string; from: OrderStatus | null; to: OrderStatus; actor: Actor; at: string; note?: string }
export interface OrderPayment { id: string; method: OrderPaymentMethod; amount: number; at: string; actor: Actor }
export interface WaLog { id: string; event: WaEvent; state: WaState; updatedAt?: string; actor?: Actor }
export interface Order {
  id: string; orderNo: string; trackingToken: string; outletId: string; customerId: string
  channel: OrderChannel; intake: IntakeType; handback: HandbackType; express: boolean
  status: OrderStatus; items: OrderItem[]; totals: OrderTotals; conditionNotes: string[]
  qcPassed: boolean; paymentStatus: PaymentStatus; payments: OrderPayment[]
  history: StatusEvent[]; whatsapp: WaLog[]; dueAt: string; createdAt: string; version: number
}
export interface Staff { id: string; name: string; role: StaffRole; outletId: string; phone: string }
export interface DeliveryZone { id: string; name: string; minKm: number; maxKm: number; pickupFee: number; deliveryFee: number }
export interface DeliveryTask {
  id: string; orderId: string; type: 'PICKUP' | 'DELIVERY'; courierId?: string; status: DeliveryTaskStatus
  scheduledAt: string; address: string; distanceKm: number; fee: number
  proof?: { receiverName: string; method: 'PHOTO' | 'SIGNATURE' | 'PIN'; at: string }; failReason?: string
}
export interface Plan { code: PlanCode; name: string; pricePerOutletMonth: number; limits: { ordersPerMonth: number; staff: number }; features: string[] }
export interface PlatformTenant {
  id: string; name: string; slug: string; ownerName: string; ownerPhone: string; city: string
  status: TenantStatus; plan: PlanCode; outletCount: number; userCount: number; ordersThisMonth: number
  createdAt: string; trialEndsAt?: string; supportNotes: string[]
}
export interface SubscriptionInvoice { id: string; tenantId: string; number: string; period: string; amount: number; status: InvoiceStatus; dueAt: string; paidAt?: string }
export interface PaymentInstruction {
  id: string; method: InstructionMethod; label: string; bankName?: string; accountName?: string; accountNumber?: string
  paymentUrl?: string; merchantName?: string; instructions: string; sortOrder: number; active: boolean
}
export interface PaymentSubmission {
  id: string; invoiceId: string; tenantId: string; instructionId: string; method: InstructionMethod
  amountClaimed: number; note?: string; status: SubmissionStatus; submittedAt: string; submittedBy: Actor
  proof: { fileName: string; fileType: string; fileSize: number }
  reviewedBy?: Actor; reviewedAt?: string; reviewNote?: string
}
export interface AuditEntry { id: string; at: string; actor: Actor; action: string; tenantId?: string; entity: string; entityId: string; detail: string }
export interface HealthCheck { name: string; status: 'UP' | 'DEGRADED' | 'DOWN'; latencyMs: number; note?: string }
```

- Produces (`order-status.ts`):
  - `STATUS_LABEL: Record<OrderStatus, string>` (copy di Step 3)
  - `statusPhase(status: OrderStatus): StatusPhase`
  - `nextStatuses(from: OrderStatus, resumeTo?: OrderStatus): OrderStatus[]` — status maju dulu sesuai urutan peta, lalu `ON_HOLD`, `ISSUE_REPORTED`, `CANCELLED`
  - `requiresReason(to: OrderStatus): boolean` — `true` untuk `ON_HOLD`, `ISSUE_REPORTED`, `CANCELLED`
  - `type TransitionContext = { qcPassed?: boolean; reason?: string; resumeTo?: OrderStatus }`
  - `type TransitionCheck = { ok: true } | { ok: false; reason: 'NOT_ALLOWED' | 'QC_REQUIRED' | 'REASON_REQUIRED' }`
  - `canTransition(from: OrderStatus, to: OrderStatus, ctx: TransitionContext): TransitionCheck`
  - `isTerminal(status: OrderStatus): boolean` — `COMPLETED`, `CANCELLED`

- [ ] **Step 1: Write the failing test** `order-status.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { canTransition, nextStatuses, statusPhase, requiresReason } from './order-status'

describe('canTransition', () => {
  it('mengizinkan alur produksi linear', () => {
    expect(canTransition('IN_WASHING', 'IN_DRYING', {})).toEqual({ ok: true })
  })
  it('menolak lompat tahap', () => {
    expect(canTransition('RECEIVED', 'IN_WASHING', {})).toEqual({ ok: false, reason: 'NOT_ALLOWED' })
  })
  it('mengizinkan walk-in/drop-off dan ambil sendiri', () => {
    expect(canTransition('DRAFT', 'RECEIVED', {}).ok).toBe(true)
    expect(canTransition('REQUESTED', 'RECEIVED', {}).ok).toBe(true)
    expect(canTransition('READY_FOR_PICKUP', 'COMPLETED', {}).ok).toBe(true)
  })
  it('mewajibkan QC lulus sebelum siap', () => {
    expect(canTransition('QUALITY_CHECK', 'READY_FOR_PICKUP', { qcPassed: false }))
      .toEqual({ ok: false, reason: 'QC_REQUIRED' })
    expect(canTransition('QUALITY_CHECK', 'READY_FOR_PICKUP', { qcPassed: true }).ok).toBe(true)
  })
  it('mengizinkan cuci ulang dari QC', () => {
    expect(canTransition('QUALITY_CHECK', 'IN_WASHING', {}).ok).toBe(true)
  })
  it('menolak alasan kosong atau spasi saja', () => {
    expect(canTransition('IN_DRYING', 'ON_HOLD', { reason: '   ' }))
      .toEqual({ ok: false, reason: 'REASON_REQUIRED' })
    expect(canTransition('IN_DRYING', 'CANCELLED', {})).toEqual({ ok: false, reason: 'REASON_REQUIRED' })
    expect(canTransition('IN_DRYING', 'ON_HOLD', { reason: 'Mesin pengering rusak' }).ok).toBe(true)
  })
  it('melanjutkan dari hold hanya ke status sebelum hold', () => {
    expect(canTransition('ON_HOLD', 'IN_DRYING', { resumeTo: 'IN_DRYING' }).ok).toBe(true)
    expect(canTransition('ON_HOLD', 'IN_WASHING', { resumeTo: 'IN_DRYING' }).ok).toBe(false)
  })
})

describe('nextStatuses', () => {
  it('mengurutkan status maju lalu pengecualian', () => {
    expect(nextStatuses('IN_WASHING')).toEqual(['IN_DRYING', 'ON_HOLD', 'ISSUE_REPORTED', 'CANCELLED'])
  })
  it('status akhir tidak punya lanjutan', () => {
    expect(nextStatuses('COMPLETED')).toEqual([])
    expect(nextStatuses('CANCELLED')).toEqual([])
  })
  it('DELIVERED hanya bisa ke COMPLETED', () => {
    expect(nextStatuses('DELIVERED')).toEqual(['COMPLETED'])
  })
  it('ON_HOLD kembali ke status sebelumnya atau batal', () => {
    expect(nextStatuses('ON_HOLD', 'IN_DRYING')).toEqual(['IN_DRYING', 'CANCELLED'])
  })
})

describe('statusPhase & requiresReason', () => {
  it('memetakan fase', () => {
    expect(statusPhase('PICKED_UP')).toBe('intake')
    expect(statusPhase('IN_IRONING')).toBe('production')
    expect(statusPhase('QUALITY_CHECK')).toBe('qc')
    expect(statusPhase('OUT_FOR_DELIVERY')).toBe('ready')
    expect(statusPhase('DELIVERED')).toBe('done')
    expect(statusPhase('ON_HOLD')).toBe('exception')
  })
  it('alasan wajib untuk hold, kendala, batal', () => {
    expect(requiresReason('ON_HOLD')).toBe(true)
    expect(requiresReason('ISSUE_REPORTED')).toBe(true)
    expect(requiresReason('CANCELLED')).toBe(true)
    expect(requiresReason('IN_DRYING')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/domain/order-status.test.ts`
Expected: FAIL — module tidak ditemukan.

- [ ] **Step 3: Implement `types.ts` dan `order-status.ts`**

Peta maju (`FORWARD: Partial<Record<OrderStatus, OrderStatus[]>>`):

```text
DRAFT -> REQUESTED, RECEIVED
REQUESTED -> PICKUP_ASSIGNED, RECEIVED
PICKUP_ASSIGNED -> PICKED_UP
PICKED_UP -> RECEIVED
RECEIVED -> INSPECTED
INSPECTED -> WEIGHED_OR_COUNTED
WEIGHED_OR_COUNTED -> IN_WASHING
IN_WASHING -> IN_DRYING
IN_DRYING -> IN_IRONING
IN_IRONING -> IN_FINISHING
IN_FINISHING -> QUALITY_CHECK
QUALITY_CHECK -> READY_FOR_PICKUP, IN_WASHING
READY_FOR_PICKUP -> OUT_FOR_DELIVERY, COMPLETED
OUT_FOR_DELIVERY -> DELIVERED
DELIVERED -> COMPLETED
```

Pengecualian (`ON_HOLD`, `ISSUE_REPORTED`, `CANCELLED`) boleh dari semua status kecuali `DELIVERED`, `COMPLETED`, `CANCELLED`, `ON_HOLD`, `ISSUE_REPORTED`. Dari `ON_HOLD`/`ISSUE_REPORTED`: `[resumeTo, 'CANCELLED']`, atau `['CANCELLED']` bila `resumeTo` kosong. Urutan cek di `canTransition`: `NOT_ALLOWED` → `REASON_REQUIRED` (pakai `reason?.trim()`) → `QC_REQUIRED` (hanya `QUALITY_CHECK → READY_FOR_PICKUP`).

`STATUS_LABEL`: DRAFT "Draf", REQUESTED "Permintaan masuk", PICKUP_ASSIGNED "Kurir ditugaskan", PICKED_UP "Sudah dijemput", RECEIVED "Diterima outlet", INSPECTED "Diperiksa", WEIGHED_OR_COUNTED "Ditimbang/dihitung", IN_WASHING "Dicuci", IN_DRYING "Dikeringkan", IN_IRONING "Disetrika", IN_FINISHING "Finishing", QUALITY_CHECK "Quality check", READY_FOR_PICKUP "Siap diambil", OUT_FOR_DELIVERY "Sedang diantar", DELIVERED "Sudah diantar", COMPLETED "Selesai", CANCELLED "Dibatalkan", ON_HOLD "Ditahan", ISSUE_REPORTED "Ada kendala".

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/domain/order-status.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/types.ts web/src/lib/domain/order-status.ts web/src/lib/domain/order-status.test.ts
git commit -m "feat(domain): add domain types and order status machine"
```

---

### Task 3: Nomor order, harga, estimasi selesai, dan zona pengantaran

**Files:**
- Create: `web/src/lib/domain/order-number.ts`, `web/src/lib/domain/pricing.ts`, `web/src/lib/domain/delivery-zone.ts`
- Test: `web/src/lib/domain/order-number.test.ts`, `web/src/lib/domain/pricing.test.ts`, `web/src/lib/domain/delivery-zone.test.ts`

**Interfaces:**
- Consumes: `PricingUnit`, `OrderTotals`, `DeliveryZone`, `LatLng` dari `types.ts`
- Produces:
  - `formatOrderNo(outletCode: string, date: Date, seq: number): string` — `KMG-261101-0007` (tanggal Asia/Jakarta, `yyMMdd`, seq 4 digit)
  - `type PriceLine = { unit: PricingUnit; unitPrice: number; qty: number }`
  - `lineTotal(line: PriceLine): number` — `Math.round(unitPrice * qty)`
  - `calculateTotals(input: { lines: PriceLine[]; express: boolean; expressSurchargePct: number; pickupFee: number; deliveryFee: number }): OrderTotals` — `expressFee = express ? Math.round(subtotal * pct / 100) : 0`
  - `estimateDueAt(createdAt: Date, durationsHours: number[], express: boolean): Date` — durasi terpanjang; express = `Math.ceil(durasi / 2)` jam
  - `DEFAULT_ZONES: DeliveryZone[]` — id `z1`–`z4`, nama `Zona 1`–`Zona 4`, nilai dari Global Constraints
  - `haversineKm(a: LatLng, b: LatLng): number`
  - `type ZoneQuote = { status: 'OK'; zoneId: string; zoneName: string; pickupFee: number; deliveryFee: number; distanceKm: number } | { status: 'NEEDS_CONFIRMATION'; distanceKm: number }`
  - `quoteDelivery(distanceKm: number, zones: DeliveryZone[]): ZoneQuote` — cocok bila `distanceKm > minKm` (atau `>= 0` untuk zona dengan `minKm === 0`) dan `distanceKm <= maxKm`

- [ ] **Step 1: Write the failing tests**

```ts
// order-number.test.ts
it('memakai tanggal WIB dan seq 4 digit', () => {
  expect(formatOrderNo('KMG', new Date('2026-10-31T18:00:00Z'), 7)).toBe('KMG-261101-0007')
})

// pricing.test.ts
it('menghitung per unit', () => {
  expect(lineTotal({ unit: 'KG', unitPrice: 7000, qty: 3.5 })).toBe(24500)
  expect(lineTotal({ unit: 'KG', unitPrice: 7000, qty: 2.37 })).toBe(16590)
  expect(lineTotal({ unit: 'ITEM', unitPrice: 15000, qty: 2 })).toBe(30000)
  expect(lineTotal({ unit: 'SQM', unitPrice: 12000, qty: 1.25 })).toBe(15000)
})
it('menjumlahkan express dan biaya antar-jemput', () => {
  expect(calculateTotals({
    lines: [{ unit: 'KG', unitPrice: 7000, qty: 3.5 }, { unit: 'ADDON', unitPrice: 5000, qty: 1 }],
    express: true, expressSurchargePct: 50, pickupFee: 5000, deliveryFee: 8000,
  })).toEqual({ subtotal: 29500, expressFee: 14750, pickupFee: 5000, deliveryFee: 8000, total: 57250 })
})
it('membulatkan biaya express ke rupiah terdekat', () => {
  const t = calculateTotals({ lines: [{ unit: 'ITEM', unitPrice: 7001, qty: 1 }], express: true, expressSurchargePct: 50, pickupFee: 0, deliveryFee: 0 })
  expect(t.expressFee).toBe(3501)
})
it('tanpa express biaya express nol', () => {
  const t = calculateTotals({ lines: [{ unit: 'ITEM', unitPrice: 10000, qty: 1 }], express: false, expressSurchargePct: 50, pickupFee: 0, deliveryFee: 0 })
  expect(t.expressFee).toBe(0)
  expect(t.total).toBe(10000)
})
it('estimasi memakai durasi terpanjang, express separuh', () => {
  const created = new Date('2026-10-31T03:00:00Z')
  expect(estimateDueAt(created, [48, 24], false).toISOString()).toBe('2026-11-02T03:00:00.000Z')
  expect(estimateDueAt(created, [48, 24], true).toISOString()).toBe('2026-11-01T03:00:00.000Z')
})

// delivery-zone.test.ts
it.each([
  [0.5, 'z1', 5000], [2, 'z1', 5000], [2.01, 'z2', 8000], [5, 'z2', 8000],
  [8, 'z3', 12000], [12, 'z4', 18000],
])('jarak %s km masuk %s', (km, zoneId, fee) => {
  expect(quoteDelivery(km, DEFAULT_ZONES)).toMatchObject({ status: 'OK', zoneId, pickupFee: fee, deliveryFee: fee })
})
it('di atas 12 km perlu konfirmasi', () => {
  expect(quoteDelivery(12.01, DEFAULT_ZONES)).toEqual({ status: 'NEEDS_CONFIRMATION', distanceKm: 12.01 })
})
it('haversine Monas → Bundaran HI sekitar 2,2 km', () => {
  const d = haversineKm({ lat: -6.1754, lng: 106.8272 }, { lat: -6.195, lng: 106.823 })
  expect(d).toBeGreaterThan(2.1)
  expect(d).toBeLessThan(2.4)
  expect(haversineKm({ lat: -6.2, lng: 106.8 }, { lat: -6.2, lng: 106.8 })).toBe(0)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/lib/domain`
Expected: FAIL pada tiga file baru (module tidak ditemukan); `order-status` tetap PASS.

- [ ] **Step 3: Implement ketiga modul sesuai Interfaces**

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/lib/domain`
Expected: PASS semua.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/domain
git commit -m "feat(domain): add order number, pricing, SLA estimate, and delivery zones"
```

---

### Task 4: Bukti bayar, WhatsApp, dan verifikasi lacak

**Files:**
- Create: `web/src/lib/domain/proof-file.ts`, `web/src/lib/domain/whatsapp.ts`, `web/src/lib/domain/tracking.ts`
- Test: `web/src/lib/domain/proof-file.test.ts`, `web/src/lib/domain/whatsapp.test.ts`, `web/src/lib/domain/tracking.test.ts`

**Interfaces:**
- Consumes: `OrderStatus`, `WaEvent`, `SubmissionStatus` dari `types.ts`
- Produces:
  - `MAX_PROOF_BYTES = 2 * 1024 * 1024`, `ACCEPTED_PROOF_TYPES = ['image/jpeg', 'image/png', 'application/pdf']`
  - `validateProofFile(file: { type: string; size: number }): { ok: true } | { ok: false; error: 'INVALID_TYPE' | 'TOO_LARGE' }`
  - `submissionStatusFor(amountClaimed: number, invoiceAmount: number): Extract<SubmissionStatus, 'UNDER_REVIEW' | 'AMOUNT_MISMATCH_REVIEW'>`
  - `normalizePhoneID(phone: string): string | null` — hasil harus cocok `/^628\d{7,11}$/`, selain itu `null`
  - `type WaContext = { customerName: string; orderNo: string; outletName: string; trackingUrl: string; total?: number }`
  - `buildWaMessage(event: WaEvent, ctx: WaContext): string` — copy bebas dalam Bahasa Indonesia, sopan, wajib memuat nama, nomor order, dan link lacak
  - `buildWaUrl(phone: string, text: string): string | null`
  - `waEventForStatus(status: OrderStatus): WaEvent | null`
  - `WA_EVENT_LABEL: Record<WaEvent, string>`
  - `verifyTrackingPhone(phone: string, last4: string): boolean`
  - `createTrackingToken(): string` — 12 karakter `[a-z0-9]` dari `crypto.getRandomValues`

- [ ] **Step 1: Write the failing tests**

```ts
// proof-file.test.ts
it('menerima JPG, PNG, PDF di bawah 2 MB', () => {
  expect(validateProofFile({ type: 'image/jpeg', size: 500_000 })).toEqual({ ok: true })
  expect(validateProofFile({ type: 'image/png', size: 1 })).toEqual({ ok: true })
  expect(validateProofFile({ type: 'application/pdf', size: 2 * 1024 * 1024 - 1 })).toEqual({ ok: true })
})
it('menolak jenis lain dan tepat 2 MB', () => {
  expect(validateProofFile({ type: 'image/webp', size: 1000 })).toEqual({ ok: false, error: 'INVALID_TYPE' })
  expect(validateProofFile({ type: 'application/pdf', size: 2 * 1024 * 1024 })).toEqual({ ok: false, error: 'TOO_LARGE' })
})
it('selisih nominal masuk review khusus', () => {
  expect(submissionStatusFor(150000, 150000)).toBe('UNDER_REVIEW')
  expect(submissionStatusFor(149000, 150000)).toBe('AMOUNT_MISMATCH_REVIEW')
})

// whatsapp.test.ts
it('menormalkan berbagai format nomor', () => {
  expect(normalizePhoneID('0812-3456-7890')).toBe('6281234567890')
  expect(normalizePhoneID('+62 812 3456 7890')).toBe('6281234567890')
  expect(normalizePhoneID('6281234567890')).toBe('6281234567890')
  expect(normalizePhoneID('812345678')).toBe('62812345678')
})
it('nomor kosong atau terlalu pendek tidak valid', () => {
  expect(normalizePhoneID('')).toBeNull()
  expect(normalizePhoneID('123')).toBeNull()
  expect(buildWaUrl('', 'Halo')).toBeNull()
})
it('membuat URL wa.me dengan teks ter-encode', () => {
  expect(buildWaUrl('0812-3456-7890', 'Halo Bu & Pak'))
    .toBe('https://wa.me/6281234567890?text=Halo%20Bu%20%26%20Pak')
})
it('pesan memuat nama, nomor order, dan link lacak', () => {
  const text = buildWaMessage('READY', { customerName: 'Sari', orderNo: 'KMG-261031-0007', outletName: 'Laundry Bersih Kilat Kemang', trackingUrl: 'https://x.test/lacak/abc' })
  expect(text).toContain('Sari')
  expect(text).toContain('KMG-261031-0007')
  expect(text).toContain('https://x.test/lacak/abc')
})
it('memetakan status ke event WhatsApp', () => {
  expect(waEventForStatus('RECEIVED')).toBe('ORDER_RECEIVED')
  expect(waEventForStatus('IN_WASHING')).toBe('IN_PROCESS')
  expect(waEventForStatus('IN_DRYING')).toBeNull()
  expect(waEventForStatus('READY_FOR_PICKUP')).toBe('READY')
  expect(waEventForStatus('OUT_FOR_DELIVERY')).toBe('OUT_FOR_DELIVERY')
  expect(waEventForStatus('DELIVERED')).toBe('COMPLETED')
  expect(waEventForStatus('COMPLETED')).toBe('COMPLETED')
  expect(waEventForStatus('ISSUE_REPORTED')).toBe('ISSUE')
})

// tracking.test.ts
it('mencocokkan 4 digit terakhir telepon', () => {
  expect(verifyTrackingPhone('0812-3456-7890', '7890')).toBe(true)
  expect(verifyTrackingPhone('0812-3456-7890', '1234')).toBe(false)
  expect(verifyTrackingPhone('0812-3456-7890', '789')).toBe(false)
  expect(verifyTrackingPhone('0812-3456-7890', 'abcd')).toBe(false)
})
it('token lacak opaque 12 karakter', () => {
  const a = createTrackingToken()
  expect(a).toMatch(/^[a-z0-9]{12}$/)
  expect(createTrackingToken()).not.toBe(a)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/lib/domain`
Expected: FAIL pada tiga file baru.

- [ ] **Step 3: Implement ketiga modul sesuai Interfaces**

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/lib/domain`
Expected: PASS semua.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/domain
git commit -m "feat(domain): add proof validation, WhatsApp links, and tracking checks"
```

---

### Task 5: Seed data, reducer order, dan store demo

**Files:**
- Create: `web/src/lib/store/state.ts`, `web/src/lib/store/seed.ts`, `web/src/lib/store/actions-order.ts`, `web/src/lib/store/demo-store.ts`, `web/src/lib/store/use-hydrated.ts`, `web/src/lib/ids.ts`
- Test: `web/src/lib/store/seed.test.ts`, `web/src/lib/store/actions-order.test.ts`

**Interfaces:**
- Consumes: semua tipe Task 2; `canTransition`, `nextStatuses` (Task 2); `formatOrderNo`, `calculateTotals`, `lineTotal`, `estimateDueAt`, `DEFAULT_ZONES` (Task 3); `createTrackingToken`, `waEventForStatus` (Task 4)
- Produces:
  - `state.ts`:

```ts
export const DEMO_STATE_VERSION = 1
export interface DemoState {
  now: string                      // waktu seed, untuk KPI "hari ini" yang konsisten
  tenantActor: Actor; adminActor: Actor
  tenant: { id: string; name: string; expressSurchargePct: number }
  outlets: Outlet[]; activeOutletId: string
  customers: Customer[]; services: Service[]; staff: Staff[]
  orders: Order[]; deliveryTasks: DeliveryTask[]; zones: DeliveryZone[]
  outletPaymentMethods: { id: string; type: 'TRANSFER' | 'QRIS' | 'CASH'; label: string; detail: string }[]
  platform: {
    tenants: PlatformTenant[]; plans: Plan[]; invoices: SubscriptionInvoice[]
    instructions: PaymentInstruction[]; submissions: PaymentSubmission[]
    audit: AuditEntry[]; health: HealthCheck[]
  }
}
export type ActionError = 'NOT_FOUND' | 'NOT_ALLOWED' | 'QC_REQUIRED' | 'REASON_REQUIRED' | 'INVALID_TYPE' | 'TOO_LARGE'
export type ActionResult<T = undefined> = { ok: true; state: DemoState; value: T } | { ok: false; error: ActionError }
export function appendAudit(state: DemoState, entry: Omit<AuditEntry, 'id'>): DemoState
export function migratePersisted(persisted: unknown, version: number): DemoState | null  // null bila versi beda atau bentuk tidak valid
```

  - `ids.ts`: `newId(prefix: string): string`
  - `seed.ts`: `createSeed(now: Date): DemoState` — deterministik untuk `now` yang sama (pakai PRNG ber-seed, bukan `Math.random`). Isi sesuai spec §8. ID tetap: tenant `t1` (juga ada di `platform.tenants`), outlet `o-kmg` (code `KMG`, Kemang) dan `o-tbt` (code `TBT`, Tebet), `activeOutletId = 'o-kmg'`, `expressSurchargePct = 50`. Order dibuat lewat jalur yang sama dengan reducer supaya history dan WA log konsisten.
  - `actions-order.ts`:
    - `type NewOrderInput = { outletId: string; customerId: string; intake: IntakeType; handback: HandbackType; express: boolean; items: { serviceId: string; qty: number }[]; conditionNotes: string[]; pickupFee: number; deliveryFee: number; channel?: OrderChannel }`
    - `createOrder(s: DemoState, input: NewOrderInput, actor: Actor, now: Date): ActionResult<Order>` — status awal `RECEIVED` untuk `WALK_IN`/`DROP_OFF`, `REQUESTED` untuk `PICKUP`; snapshot `unitPrice = service.prices[outletId]`; seq = jumlah order outlet itu di tanggal WIB yang sama + 1; WA log awal hanya bila `waEventForStatus(status)` tidak null; bila `intake === 'PICKUP'` buat `DeliveryTask` `PICKUP` `UNASSIGNED`
    - `transitionOrder(s: DemoState, orderId: string, to: OrderStatus, opts: { reason?: string; note?: string }, actor: Actor, now: Date): ActionResult<Order>` — `resumeTo` = `from` dari event terakhir yang masuk ke `ON_HOLD`/`ISSUE_REPORTED`; tambah history, `version + 1`; WA log baru hanya bila belum ada log untuk event yang sama (idempoten); masuk `OUT_FOR_DELIVERY` membuat `DeliveryTask` `DELIVERY` bila belum ada; status pengecualian masuk audit `order.<status_lowercase>`
    - `recordQc(s: DemoState, orderId: string, result: { passed: boolean; notes?: string }, actor: Actor, now: Date): ActionResult<Order>` — hanya saat `QUALITY_CHECK`; set `qcPassed`, catat di history sebagai note tanpa mengubah status
    - `recordPayment(s: DemoState, orderId: string, p: { method: OrderPaymentMethod; amount: number }, actor: Actor, now: Date): ActionResult<Order>` — `paymentStatus` jadi `PAID` bila total bayar ≥ total, `PARTIAL` bila > 0
    - `markWhatsApp(s: DemoState, orderId: string, logId: string, state: 'OPENED' | 'SENT', actor: Actor, now: Date): ActionResult<Order>`
  - `demo-store.ts`: `useDemo` = zustand `create<DemoStore>()(persist(..., { name: 'swarapos-demo', version: DEMO_STATE_VERSION, skipHydration: true, migrate: (p, v) => migratePersisted(p, v) ?? createSeed(new Date()) }))`. `DemoStore = DemoState & { run<T>(fn: (s: DemoState) => ActionResult<T>): ActionResult<T>; reset(): void }`. `run` memanggil reducer dengan state saat ini dan meng-`set` hanya bila `ok`. Halaman memanggil `useDemo.getState().run(s => createOrder(s, input, s.tenantActor, new Date()))`.
  - `use-hydrated.ts`: `useHydrated(): boolean` — memanggil `useDemo.persist.rehydrate()` sekali di `useEffect`, `true` setelah selesai.

- [ ] **Step 1: Write the failing tests**

```ts
// seed.test.ts
const now = new Date('2026-10-31T03:00:00Z')
it('deterministik dan konsisten', () => {
  const a = createSeed(now)
  expect(createSeed(now)).toEqual(a)
  expect(a.orders.length).toBeGreaterThanOrEqual(25)
  expect(new Set(a.orders.map(o => o.status)).size).toBeGreaterThanOrEqual(12)
  expect(a.orders.every(o => a.customers.some(c => c.id === o.customerId))).toBe(true)
  expect(new Set(a.orders.map(o => o.orderNo)).size).toBe(a.orders.length)
  expect(a.platform.submissions.some(s => s.status === 'AMOUNT_MISMATCH_REVIEW')).toBe(true)
})
it('migratePersisted menolak versi lama dan data rusak', () => {
  expect(migratePersisted(createSeed(now), 0)).toBeNull()
  expect(migratePersisted({ foo: 1 }, DEMO_STATE_VERSION)).toBeNull()
  expect(migratePersisted(null, DEMO_STATE_VERSION)).toBeNull()
})

// actions-order.test.ts — helper: s0 = createSeed(now); kilo = layanan unit KG di s0; cust = s0.customers[0]
it('walk-in langsung RECEIVED dengan nomor order dan WA log', () => {
  const r = createOrder(s0, { outletId: 'o-kmg', customerId: cust.id, intake: 'WALK_IN', handback: 'SELF_PICKUP', express: false, items: [{ serviceId: kilo.id, qty: 3.5 }], conditionNotes: [], pickupFee: 0, deliveryFee: 0 }, actor, now)
  if (!r.ok) throw new Error(r.error)
  expect(r.value.status).toBe('RECEIVED')
  expect(r.value.orderNo).toMatch(/^KMG-\d{6}-\d{4}$/)
  expect(r.value.items[0].unitPrice).toBe(kilo.prices['o-kmg'])
  expect(r.value.history[0]).toMatchObject({ from: null, to: 'RECEIVED' })
  expect(r.value.whatsapp).toEqual([expect.objectContaining({ event: 'ORDER_RECEIVED', state: 'NOT_SENT' })])
})
it('pickup mulai REQUESTED dan membuat tugas jemput', () => { /* intake PICKUP → status REQUESTED, deliveryTasks bertambah 1 bertipe PICKUP UNASSIGNED */ })
it('transisi tidak sah tidak mengubah state', () => {
  // order RECEIVED → IN_WASHING
  expect(transitionOrder(s, id, 'IN_WASHING', {}, actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
})
it('transisi sah menambah history dan version', () => { /* RECEIVED → INSPECTED: history.length +1, version +1 */ })
it('hold lalu lanjut kembali ke status sebelumnya', () => { /* IN_DRYING → ON_HOLD (reason) → nextStatuses berisi IN_DRYING → transisi IN_DRYING ok */ })
it('QC gagal memblokir siap, QC lulus membuka', () => {
  // order di QUALITY_CHECK: recordQc passed:false → transition READY_FOR_PICKUP error QC_REQUIRED
  // recordQc passed:true → transition READY_FOR_PICKUP ok
})
it('WA log idempoten per event', () => {
  // QUALITY_CHECK → IN_WASHING (cuci ulang) tidak menambah log IN_PROCESS kedua
})
it('price snapshot tidak berubah saat harga layanan diubah', () => {
  // ubah s.services harga kilo setelah createOrder → items[0].unitPrice tetap
})
it('pembayaran sebagian lalu lunas', () => { /* bayar 10000 → PARTIAL; bayar sisa → PAID */ })
it('markWhatsApp mengubah state log', () => { /* OPENED lalu SENT dengan actor & updatedAt */ })
```

Tulis badan test yang dikomentari sesuai komentar di atas, dengan nilai konkret dari seed.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/lib/store`
Expected: FAIL — module tidak ditemukan.

- [ ] **Step 3: Implement `state.ts`, `ids.ts`, `seed.ts`, `actions-order.ts`**

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/lib/store`
Expected: PASS.

- [ ] **Step 5: Implement `demo-store.ts` dan `use-hydrated.ts`**

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npm run test`
Expected: tanpa error, semua test PASS.

- [ ] **Step 7: Commit**

```bash
git add web/src/lib
git commit -m "feat(store): add demo seed, order reducers, and persisted store"
```

---

### Task 6: Reducer billing langganan dan platform

**Files:**
- Create: `web/src/lib/store/actions-platform.ts`
- Test: `web/src/lib/store/actions-platform.test.ts`

**Interfaces:**
- Consumes: `DemoState`, `ActionResult`, `appendAudit` (Task 5); `validateProofFile`, `submissionStatusFor` (Task 4)
- Produces:
  - `submitSubscriptionProof(s: DemoState, invoiceId: string, input: { instructionId: string; amountClaimed: number; note?: string; file: { name: string; type: string; size: number } }, actor: Actor, now: Date): ActionResult<PaymentSubmission>` — invoice jadi `UNDER_REVIEW`; audit `subscription.proof_uploaded`; submission lama tidak diubah
  - `reviewSubmission(s: DemoState, submissionId: string, decision: 'APPROVED' | 'REJECTED', note: string, actor: Actor, now: Date): ActionResult<PaymentSubmission>` — `note.trim()` wajib untuk `REJECTED` dan untuk submission `AMOUNT_MISMATCH_REVIEW`; `APPROVED` → invoice `PAID` + `paidAt`, tenant `PAST_DUE`/`TRIAL` jadi `ACTIVE`; `REJECTED` → invoice kembali `UNPAID` (atau `OVERDUE` bila lewat `dueAt`); audit `subscription.payment_approved` / `subscription.payment_rejected`; hanya submission berstatus review yang bisa diputus, selain itu `NOT_ALLOWED`
  - `setTenantStatus(s: DemoState, tenantId: string, status: 'ACTIVE' | 'SUSPENDED', reason: string, actor: Actor, now: Date): ActionResult<PlatformTenant>` — alasan wajib; audit `tenant.suspended` / `tenant.reactivated`
  - `startSupportSession(s: DemoState, tenantId: string, reason: string, minutes: number, actor: Actor, now: Date): ActionResult<{ expiresAt: string }>` — alasan wajib; audit `support.session_started`
  - `upsertInstruction(s: DemoState, instr: Omit<PaymentInstruction, 'id'> & { id?: string }, actor: Actor, now: Date): ActionResult<PaymentInstruction>` — audit `payment_instruction.created` / `.updated`
  - `updatePlan(s: DemoState, code: PlanCode, patch: Partial<Omit<Plan, 'code'>>, actor: Actor, now: Date): ActionResult<Plan>` — audit `plan.updated`

- [ ] **Step 1: Write the failing tests**

```ts
// s0 = createSeed(now); inv = invoice UNPAID milik t1; instr = instruksi aktif pertama
const pdf = { name: 'bukti.pdf', type: 'application/pdf', size: 300_000 }
it('unggah bukti membuat submission UNDER_REVIEW dan audit', () => {
  const r = submitSubscriptionProof(s0, inv.id, { instructionId: instr.id, amountClaimed: inv.amount, file: pdf }, actor, now)
  if (!r.ok) throw new Error(r.error)
  expect(r.value.status).toBe('UNDER_REVIEW')
  expect(r.state.platform.invoices.find(i => i.id === inv.id)?.status).toBe('UNDER_REVIEW')
  expect(r.state.platform.audit.at(-1)?.action).toBe('subscription.proof_uploaded')
})
it('file tidak valid ditolak', () => {
  expect(submitSubscriptionProof(s0, inv.id, { instructionId: instr.id, amountClaimed: inv.amount, file: { ...pdf, type: 'image/gif' } }, actor, now))
    .toEqual({ ok: false, error: 'INVALID_TYPE' })
})
it('nominal berbeda masuk AMOUNT_MISMATCH_REVIEW', () => { /* amountClaimed = inv.amount - 1000 */ })
it('tolak wajib alasan non-spasi', () => {
  expect(reviewSubmission(s1, subId, 'REJECTED', '  ', admin, now)).toEqual({ ok: false, error: 'REASON_REQUIRED' })
})
it('setujui membuat invoice PAID dan tenant ACTIVE', () => { /* invoice PAID + paidAt; tenant status ACTIVE; audit subscription.payment_approved */ })
it('setujui selisih nominal wajib catatan', () => { /* note '' → REASON_REQUIRED; note 'Kurang Rp1.000, dianggap lunas' → ok */ })
it('unggah ulang setelah ditolak menyimpan riwayat', () => { /* submissions untuk invoice = 2, yang pertama REJECTED */ })
it('submission yang sudah diputus tidak bisa diputus lagi', () => { /* review APPROVED dua kali → NOT_ALLOWED */ })
it('suspend wajib alasan dan tercatat', () => { /* '' → REASON_REQUIRED; 'Tunggakan 2 bulan' → SUSPENDED + audit tenant.suspended */ })
it('sesi support wajib alasan', () => { /* '' → REASON_REQUIRED; ok → expiresAt = now + minutes, audit support.session_started */ })
it('upsertInstruction dan updatePlan tercatat di audit', () => { /* action payment_instruction.created dan plan.updated */ })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/lib/store/actions-platform.test.ts`
Expected: FAIL — module tidak ditemukan.

- [ ] **Step 3: Implement `actions-platform.ts`**

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test`
Expected: PASS semua.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/store
git commit -m "feat(store): add subscription billing and platform admin reducers"
```

---

### Task 7: Komponen UI dasar dan kerangka layout

**Files:**
- Create: `web/src/components/ui/{button,badge,card,field,input,select,textarea,dialog,drawer,tabs,stepper,table,empty-state,kpi-card,skeleton,toast}.tsx`
- Create: `web/src/components/order/status-badge.tsx`, `web/src/components/order/reason-dialog.tsx`
- Create: `web/src/components/layout/{app-shell,sidebar,bottom-nav,topbar,theme-toggle,offline-indicator,brand-mark}.tsx`
- Create: `web/src/app/app/layout.tsx`, `web/src/app/admin/layout.tsx`, `web/src/app/app/page.tsx` (placeholder), `web/src/app/admin/page.tsx` (placeholder)

**Interfaces:**
- Consumes: `cn` (Task 1), `STATUS_LABEL`, `statusPhase` (Task 2), `useDemo`, `useHydrated` (Task 5)
- Produces:
  - `Button` props: `variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'whatsapp'`, `size: 'sm' | 'md' | 'lg' | 'xl'` (xl = 56 px untuk produksi), `asChild?` tidak dipakai; `ButtonLink` untuk `next/link`
  - `Badge` props: `tone: StatusPhase | 'neutral' | 'success' | 'warning' | 'danger'`
  - `Dialog` berbasis `<dialog>` native: `open`, `onClose`, `title`, `children`, `footer`
  - `Drawer` dari kanan: `open`, `onClose`, `title`, `children`
  - `Tabs`: `items: { id: string; label: string }[]`, `value`, `onChange`
  - `Stepper`: `steps: string[]`, `current: number`
  - `KpiCard`: `label`, `value`, `hint?`, `tone?`, `icon`
  - `StatusBadge({ status }: { status: OrderStatus })` — warna fase + ikon lucide per fase + `STATUS_LABEL`
  - `ReasonDialog({ open, title, confirmLabel, onConfirm(reason: string), onClose })` — tombol konfirmasi nonaktif sampai `reason.trim()` tidak kosong
  - `AppShell({ nav, area, children })` dengan `nav: { href: string; label: string; icon: LucideIcon }[]`, `area: 'tenant' | 'admin'`. Sidebar di ≥ 768 px, `BottomNav` (5 item pertama + "Lainnya") di < 768 px. Topbar: pemilih outlet (tenant), indikator offline (`navigator.onLine`, label "Offline — perubahan disimpan sebagai pending sync"), toggle tema (`data-theme` di `<html>`, disimpan di `localStorage` dalam try/catch), tombol "Reset data demo" (`useDemo.getState().reset()` dengan konfirmasi).
  - Pintasan keyboard di area tenant: `N` → `/app/order/baru`, `/` → fokus elemen `[data-search]`; diabaikan saat fokus di input/textarea/select.
  - Children layout dibungkus: bila `!useHydrated()` tampilkan `Skeleton` halaman.

Nav tenant: Ringkasan `/app`, Order `/app/order`, Kasir `/app/order/baru`, Produksi `/app/produksi`, Pickup & Antar `/app/pengantaran`, Pelanggan `/app/pelanggan`, Layanan `/app/layanan`, Laporan `/app/laporan`, Langganan `/app/langganan`, Pengaturan `/app/pengaturan`.
Nav admin: Ringkasan `/admin`, Tenant `/admin/tenant`, Review Pembayaran `/admin/pembayaran`, Instruksi Bayar `/admin/instruksi-bayar`, Paket `/admin/paket`, Audit Log `/admin/audit`, Kesehatan `/admin/kesehatan`.

- [ ] **Step 1: Buat komponen `ui/`, `order/`, `layout/` sesuai Interfaces**

- [ ] **Step 2: Buat layout `/app` dan `/admin` dengan placeholder halaman yang merender `StatusBadge` untuk keenam fase**

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: tanpa error.

- [ ] **Step 4: Cek di browser**

Jalankan `npm run dev`. Buka `/app` dan `/admin` di lebar 1280 px dan 375 px: sidebar ↔ bottom nav berganti, toggle tema mengubah warna, dialog alasan tidak bisa dikonfirmasi saat kosong, tidak ada error/hydration warning di console.

- [ ] **Step 5: Commit**

```bash
git add web/src
git commit -m "feat(ui): add UI kit, status badge, and app/admin shells"
```

---

### Task 8: Landing page

**Files:**
- Create: `web/src/app/(marketing)/layout.tsx`, `web/src/app/(marketing)/page.tsx`
- Create: `web/src/components/marketing/{navbar,hero,flow-visual,problem-benefit,features-by-role,app-mockup,pricing,testimonials,faq,demo-form,footer}.tsx`
- Delete: `web/src/app/page.tsx` (digantikan route group)

**Interfaces:**
- Consumes: komponen `ui/` (Task 7), `formatRupiah` (Task 1), `StatusBadge` (Task 7)
- Produces: route `/`

Keputusan isi:
- Tema gelap (latar slate-950) dengan gradien `--brand-blue → --brand-violet → --brand-cyan`.
- Hero: judul "Cucian pelanggan selalu terlacak, operasional laundry selalu terkendali." CTA utama "Daftar Gratis" → `/daftar`, sekunder "Minta Demo" → `#demo`.
- `flow-visual`: SVG garis beranimasi (stroke-dashoffset) melewati Pickup → Terima & Timbang → Cuci/Kering/Setrika → QC → Antar, dengan status badge kecil di setiap titik; statis bila reduced-motion.
- Fitur per peran: Pemilik, Kasir & Operator, Kurir, Pelanggan.
- Mockup: kartu dashboard tiruan berisi KPI dan kanban mini, plus HP berisi halaman lacak.
- Harga: Basic Rp149.000 dan Pro Rp299.000 per outlet per bulan, dengan catatan kecil "Harga contoh — final menyusul".
- Testimoni: 3 kutipan bertanda "ilustrasi pilot".
- FAQ: memakai `<details>`.
- Form demo: nama, nama laundry, WhatsApp, kota, jumlah outlet. Validasi di browser, lalu tampil pesan sukses tanpa kirim ke mana pun.
- Navbar: link Masuk dan Daftar.
- `metadata`: title, description, openGraph.

- [ ] **Step 1: Bangun komponen marketing dan halaman `/`**

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: tanpa error; `/` ter-prerender statis.

- [ ] **Step 3: Cek di browser**

Buka `/` di 1280 px dan 375 px: tidak ada scroll horizontal, CTA terlihat di layar pertama, form demo menolak WhatsApp kosong dan menampilkan sukses saat valid.

- [ ] **Step 4: Commit**

```bash
git add web/src
git commit -m "feat(web): add marketing landing page"
```

---

### Task 9: Masuk, Daftar, dan Onboarding

**Files:**
- Create: `web/src/app/(marketing)/masuk/page.tsx`, `web/src/app/(marketing)/daftar/page.tsx`, `web/src/app/onboarding/page.tsx`
- Create: `web/src/components/onboarding/{step-business,step-outlet,step-zones,step-services}.tsx`

**Interfaces:**
- Consumes: `Stepper`, `Tabs`, `Field`, `Input`, `Button` (Task 7); `DEFAULT_ZONES` (Task 3); `formatRupiah` (Task 1)
- Produces: route `/masuk`, `/daftar`, `/onboarding`

Keputusan isi:
- `/masuk`:
  - Tab "Password" dan "OTP". OTP menampilkan input 6 digit setelah "Kirim OTP".
  - Di bawahnya ada kotak "Mode demo" berisi dua tombol: "Masuk sebagai Owner Laundry" → `/app` dan "Masuk sebagai Super Admin" → `/admin`.
- `/daftar`: nama, email/telepon, password, nama bisnis, centang setuju Syarat & Kebijakan Privasi → `/onboarding`.
- `/onboarding`, 4 langkah:
  1. Bisnis: nama, logo (input file + pratinjau lokal), warna brand (6 pilihan swatch).
  2. Outlet: nama, alamat, jam operasional per hari.
  3. Zona: tabel `DEFAULT_ZONES` dengan radius dan tarif yang bisa diedit.
  4. Layanan: template 8 layanan dengan centang dan harga yang bisa diedit.

  Tombol "Selesai" → `/app`. Data wizard hanya state lokal.

- [ ] **Step 1: Bangun ketiga halaman**

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: tanpa error.

- [ ] **Step 3: Cek di browser**

`/masuk` → tombol demo menuju `/app` dan `/admin`; `/daftar` → `/onboarding`; wizard bisa maju/mundur dan nilai tidak hilang saat kembali.

- [ ] **Step 4: Commit**

```bash
git add web/src
git commit -m "feat(web): add sign-in, sign-up, and onboarding wizard"
```

---

### Task 10: Ringkasan, daftar order, dan detail order

**Files:**
- Create: `web/src/app/app/page.tsx` (ganti placeholder), `web/src/app/app/order/page.tsx`, `web/src/app/app/order/[id]/page.tsx`
- Create: `web/src/components/order/{order-table,order-filters,order-timeline,order-items-table,payment-panel,whatsapp-panel,qc-panel,status-actions,order-label}.tsx`
- Create: `web/src/lib/selectors.ts`
- Test: `web/src/lib/selectors.test.ts`

**Interfaces:**
- Consumes: `useDemo`, reducer `transitionOrder`, `recordQc`, `recordPayment`, `markWhatsApp` (Task 5); `nextStatuses`, `requiresReason`, `isTerminal` (Task 2); `buildWaMessage`, `buildWaUrl`, `WA_EVENT_LABEL` (Task 4); `ReasonDialog`, `StatusBadge` (Task 7)
- Produces:
  - `selectors.ts`:
    - `isLate(order: Order, now: Date): boolean` — `dueAt < now` dan fase bukan `done` dan bukan `CANCELLED`
    - `dashboardKpis(s: DemoState, now: Date): { ordersToday: number; revenueToday: number; lateCount: number; receivables: number }` — "hari ini" menurut tanggal WIB; omzet = jumlah `payments` hari ini; piutang = `total − dibayar` untuk order bukan `CANCELLED`
    - `trackingUrl(token: string, origin: string): string` — `${origin}/lacak/${token}`
    - `resumeTarget(order: Order): OrderStatus | undefined`
  - `OrderLabel({ order, outlet, customer })` — QR (`QRCodeSVG`, isi = URL lacak), nomor order mono besar, nama pelanggan, tanggal masuk/estimasi; tombol "Cetak label" memanggil `window.print()` dengan CSS `@media print` yang hanya menampilkan label

Keputusan isi:
- `/app`:
  - 4 `KpiCard` dari `dashboardKpis`.
  - Bar kapasitas per tahap produksi (jumlah order per status).
  - Daftar "Mendekati jatuh tempo" (6 jam ke depan + terlambat).
  - Daftar "WhatsApp belum dikirim".
- `/app/order`:
  - Cari (`data-search`) nomor order/nama/telepon.
  - Filter chip: status per fase, fulfillment, status bayar, outlet.
  - Tabel kolom: No. order (mono), pelanggan, layanan ringkas, status, bayar, jatuh tempo (merah bila `isLate`), total.
  - Baris bisa diklik.
- `/app/order/[id]`:
  - Header dengan `StatusBadge` + `status-actions`. Tombol maju = status maju pertama dari `nextStatuses`. Tombol lain dalam menu. Status yang `requiresReason` membuka `ReasonDialog`.
  - Di status `QUALITY_CHECK`, `qc-panel` menampilkan checklist (bersih, kering, wangi, lipat rapi, jumlah item cocok) dan tombol "Lulus QC" / "Gagal — cuci ulang".
  - Timeline terbaru di atas, berisi aktor, waktu WIB, dan catatan.
  - Tabel item dengan harga snapshot dan rincian total.
  - `payment-panel`: status bayar, riwayat, dan dialog "Catat pembayaran" (metode + nominal, default sisa).
  - `whatsapp-panel`: tiap log menampilkan event, state, dan waktu. Tombol "Kirim WhatsApp" membuka `buildWaUrl(...)` di tab baru lalu `markWhatsApp(... 'OPENED')`. Tombol "Tandai terkirim" → `SENT`. Bila `buildWaUrl` null, tombol nonaktif dengan teks "Nomor WhatsApp pelanggan tidak valid".
  - `OrderLabel` dibuka otomatis sebagai dialog bila query `?baru=1`.
  - Order tidak ditemukan → `EmptyState` dengan link kembali.

- [ ] **Step 1: Write the failing test** `selectors.test.ts`

```ts
const now = new Date('2026-10-31T03:00:00Z')
it('isLate hanya untuk order aktif lewat jatuh tempo', () => {
  expect(isLate({ ...o, status: 'IN_WASHING', dueAt: '2026-10-31T02:00:00Z' }, now)).toBe(true)
  expect(isLate({ ...o, status: 'COMPLETED', dueAt: '2026-10-31T02:00:00Z' }, now)).toBe(false)
  expect(isLate({ ...o, status: 'IN_WASHING', dueAt: '2026-10-31T05:00:00Z' }, now)).toBe(false)
})
it('KPI menghitung order hari ini menurut WIB', () => {
  // order createdAt '2026-10-30T18:00:00Z' (= 31 Okt 01.00 WIB) dihitung hari ini
})
it('piutang mengabaikan order batal', () => { /* order CANCELLED unpaid tidak masuk receivables */ })
it('resumeTarget mengambil status sebelum hold', () => { /* history ... IN_DRYING → ON_HOLD ⇒ 'IN_DRYING' */ })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/selectors.test.ts`
Expected: FAIL — module tidak ditemukan.

- [ ] **Step 3: Implement `selectors.ts`**

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/selectors.test.ts`
Expected: PASS.

- [ ] **Step 5: Bangun ketiga halaman dan komponen order**

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`
Expected: tanpa error.

- [ ] **Step 7: Cek di browser**

Dari `/app` klik order → detail; jalankan satu transisi maju, satu hold dengan alasan lalu lanjutkan, catat pembayaran sampai lunas, klik Kirim WhatsApp (tab `wa.me` terbuka dengan teks berisi link lacak) lalu tandai terkirim.

- [ ] **Step 8: Commit**

```bash
git add web/src
git commit -m "feat(web): add dashboard summary, order list, and order detail"
```

---

### Task 11: Kasir — Order Baru

**Files:**
- Create: `web/src/app/app/order/baru/page.tsx`
- Create: `web/src/components/cashier/{customer-picker,fulfillment-picker,item-editor,condition-notes,delivery-quote-card,order-summary}.tsx`
- Create: `web/src/lib/store/actions-catalog.ts` (hanya `addCustomer` di task ini)
- Test: `web/src/lib/store/actions-catalog.test.ts`

**Interfaces:**
- Consumes: `createOrder`, `NewOrderInput` (Task 5); `calculateTotals`, `lineTotal`, `estimateDueAt`, `haversineKm`, `quoteDelivery` (Task 3); `parseDecimalID`, `formatRupiah` (Task 1); `normalizePhoneID` (Task 4)
- Produces:
  - `addCustomer(s: DemoState, input: { name: string; phone: string; address?: string; location?: LatLng; notes?: string }, actor: Actor, now: Date): ActionResult<Customer>` — `name.trim()` wajib dan `normalizePhoneID(phone)` tidak null, selain itu `NOT_ALLOWED`; telepon yang sama (setelah normalisasi) mengembalikan pelanggan yang sudah ada

Keputusan isi:
- Layout dua kolom: form di kiri, `order-summary` sticky di kanan. Di < 1024 px ringkasan pindah ke bawah dengan bar total sticky.
- `customer-picker`:
  - Cari nama/telepon.
  - "Pelanggan baru" inline: nama, WhatsApp, alamat, dan titik lokasi berupa pilihan "Perkiraan jarak dari outlet (km)" karena belum ada peta.
- `fulfillment-picker`: penerimaan (Walk-in / Drop-off / Dijemput) dan pengembalian (Ambil sendiri / Diantar).
- `item-editor`:
  - Pilih layanan aktif. Qty memakai `parseDecimalID`, label unit (kg, pcs, pasang, paket, m²). Add-on berupa chip.
  - Toggle Express menampilkan biaya tambahan `expressSurchargePct`.
- `condition-notes`: chip Noda, Luntur, Bahan sensitif, Kancing/resleting rusak, Item kurang, plus kotak foto placeholder.
- `delivery-quote-card`: aktif bila Dijemput atau Diantar.
  - Jarak dari `haversineKm` (bila pelanggan punya lokasi) atau dari input km.
  - `quoteDelivery` menampilkan zona dan biaya.
  - `NEEDS_CONFIRMATION` menampilkan peringatan + centang "Sudah dikonfirmasi staf" + input biaya manual. Tombol simpan nonaktif sampai keduanya diisi.
- `order-summary`: baris item, subtotal, express, jemput, antar, total, estimasi selesai (`estimateDueAt`).
- "Simpan order" (atau `Ctrl+Enter`) → `createOrder` → `router.push('/app/order/<id>?baru=1')`.
- Draf form disimpan ke `localStorage` key `swarapos-kasir-draft` (try/catch) dan dibersihkan setelah simpan. Ada tombol "Kosongkan".

- [ ] **Step 1: Write the failing test** `actions-catalog.test.ts`

```ts
it('menambah pelanggan dengan telepon ternormalisasi', () => { /* phone '0813 1111 2222' → tersimpan, customers +1 */ })
it('telepon yang sama mengembalikan pelanggan lama', () => { /* '+62 813-1111-2222' setelahnya → id sama, customers tidak bertambah */ })
it('nama kosong atau telepon tidak valid ditolak', () => {
  expect(addCustomer(s0, { name: ' ', phone: '081311112222' }, actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
  expect(addCustomer(s0, { name: 'Budi', phone: '12' }, actor, now)).toEqual({ ok: false, error: 'NOT_ALLOWED' })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/store/actions-catalog.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `addCustomer`**

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/store/actions-catalog.test.ts`
Expected: PASS.

- [ ] **Step 5: Bangun halaman kasir dan komponennya**

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`
Expected: tanpa error.

- [ ] **Step 7: Cek di browser**

Buat order drop-off 3,5 kg kiloan + add-on parfum + express + diantar 6 km: total = subtotal + 50% express + Rp12.000; simpan → detail dengan label QR terbuka. Coba jarak 15 km: simpan terkunci sampai dikonfirmasi. Muat ulang halaman di tengah pengisian: draf kembali.

- [ ] **Step 8: Commit**

```bash
git add web/src
git commit -m "feat(web): add cashier new-order screen"
```

---

### Task 12: Papan produksi

**Files:**
- Create: `web/src/app/app/produksi/page.tsx`
- Create: `web/src/components/production/{board,column,order-card,board-filters,scan-box}.tsx`

**Interfaces:**
- Consumes: `transitionOrder`, `recordQc` (Task 5); `nextStatuses`, `STATUS_LABEL` (Task 2); `isLate` (Task 10); `ReasonDialog`, `StatusBadge`, `Button` size `xl` (Task 7)
- Produces: route `/app/produksi`

Keputusan isi:
- Kolom:
  - Diterima `[RECEIVED, INSPECTED, WEIGHED_OR_COUNTED]`
  - Cuci `[IN_WASHING]`
  - Kering `[IN_DRYING]`
  - Setrika `[IN_IRONING]`
  - Finishing `[IN_FINISHING]`
  - QC `[QUALITY_CHECK]`
  - Siap `[READY_FOR_PICKUP]`
  - Kolom "Ditahan / Kendala" `[ON_HOLD, ISSUE_REPORTED]` hanya muncul bila ada isinya.
- Kartu:
  - Nomor order (mono), nama pelanggan, ringkasan layanan + berat, sisa waktu ke `dueAt` (merah + ikon jam bila `isLate`), badge Express.
  - Tombol besar "Lanjut: <label status maju>". Di kolom Diterima, tombol ini maju satu sub-status sekaligus.
  - Menu "⋯": Tahan / Laporkan kendala (lewat `ReasonDialog`) dan Buka detail.
- Kartu di kolom QC: tombol "Lulus QC" (`recordQc` passed lalu `transitionOrder` ke `READY_FOR_PICKUP`) dan "Cuci ulang" (`recordQc` gagal dengan catatan lalu ke `IN_WASHING`).
- Urutan kartu: terlambat dulu, lalu express, lalu `dueAt` terdekat.
- Filter: outlet, layanan, hanya terlambat, hanya express.
- `scan-box`: input "Scan / ketik nomor order", Enter mencari `orderNo` atau `trackingToken` lalu membuka detail. Selalu fokus di mode layar besar.
- Toggle "Mode layar besar": sembunyikan sidebar, teks dan tombol lebih besar (≥ 56 px), kontras tinggi, kolom bisa digulir horizontal dengan snap.

- [ ] **Step 1: Bangun papan produksi**

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: tanpa error.

- [ ] **Step 3: Cek di browser**

Bawa order hasil Task 11 dari Diterima sampai Siap; pastikan tidak ada jalan ke Siap tanpa "Lulus QC"; tahan satu order dengan alasan lalu lanjutkan; mode layar besar terbaca di 1024 px.

- [ ] **Step 4: Commit**

```bash
git add web/src
git commit -m "feat(web): add production kanban board"
```

---

### Task 13: Halaman lacak pelanggan

**Files:**
- Create: `web/src/app/lacak/[token]/page.tsx`, `web/src/app/lacak/layout.tsx`
- Create: `web/src/components/tracking/{phone-gate,status-hero,customer-timeline,bill-card,outlet-contact}.tsx`

**Interfaces:**
- Consumes: `useDemo`, `useHydrated` (Task 5); `verifyTrackingPhone` (Task 4); `STATUS_LABEL`, `statusPhase` (Task 2); `formatRupiah`, `formatDateTime` (Task 1)
- Produces: route `/lacak/[token]`

Keputusan isi:
- Layout mobile-first tanpa navigasi dashboard, lebar maksimum 480 px di tengah. Logo tenant + nama outlet di atas.
- `phone-gate`:
  - Input 4 digit terakhir nomor WhatsApp, `inputMode="numeric"`.
  - Salah → "Nomor tidak cocok. Periksa 4 digit terakhir nomor WhatsApp Anda."
  - Berhasil disimpan di `sessionStorage` per token (try/catch).
- Token tidak ada → kartu "Order tidak ditemukan" dengan saran membuka link terbaru dari WhatsApp. Ada catatan kecil mode demo: data hanya tersedia di browser yang sama.
- `status-hero`:
  - Ikon fase besar, label status, dan teks "Cucian Anda sedang …".
  - Progres 5 langkah: Diterima → Diproses → QC → Siap → Selesai. Langkah aktif diturunkan dari fase.
  - Estimasi selesai.
- `customer-timeline`: label ramah pelanggan, waktu WIB, tanpa catatan internal atau nama staf.
- `bill-card`:
  - Item, total, status bayar.
  - Bila belum lunas: metode bayar outlet (`outletPaymentMethods`) dengan tombol salin nomor rekening.
- `outlet-contact`: alamat, jam buka, tombol "Chat outlet" (`wa.me` ke telepon outlet).

- [ ] **Step 1: Bangun halaman lacak**

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: tanpa error.

- [ ] **Step 3: Cek di browser (375 px)**

Buka link lacak dari pesan WhatsApp order Task 11: 4 digit salah ditolak, benar menampilkan status terbaru; ubah status di dashboard lalu muat ulang lacak → ikut berubah; token acak → "Order tidak ditemukan".

- [ ] **Step 4: Commit**

```bash
git add web/src
git commit -m "feat(web): add customer order tracking page"
```

---

### Task 14: Pickup & Antar, Pelanggan, Layanan, Laporan, Pengaturan

**Files:**
- Create: `web/src/app/app/{pengantaran,pelanggan,layanan,laporan,pengaturan}/page.tsx`
- Create: `web/src/components/delivery/{task-board,assign-courier,proof-dialog}.tsx`, `web/src/components/customers/customer-drawer.tsx`, `web/src/components/reports/{bar-chart,report-filters}.tsx`, `web/src/components/settings/{outlet-tab,staff-tab,zones-tab,payment-methods-tab,wa-templates-tab}.tsx`
- Create: `web/src/lib/csv.ts`
- Modify: `web/src/lib/store/actions-catalog.ts`
- Test: `web/src/lib/store/actions-catalog.test.ts`, `web/src/lib/csv.test.ts`

**Interfaces:**
- Consumes: `addCustomer` (Task 11), `transitionOrder` (Task 5), `appendAudit` (Task 5), `buildWaMessage` (Task 4), `formatRupiah`, `formatDate` (Task 1)
- Produces (`actions-catalog.ts`):
  - `updateServicePrice(s, serviceId: string, outletId: string, price: number, actor, now): ActionResult<Service>` — harga integer ≥ 0, selain itu `NOT_ALLOWED`; audit `service.price_changed`
  - `setServiceActive(s, serviceId: string, active: boolean, actor, now): ActionResult<Service>`
  - `updateZones(s, zones: DeliveryZone[], actor, now): ActionResult<DeliveryZone[]>` — zona harus berurutan tanpa celah (`zones[i].minKm === zones[i-1].maxKm`) dan `minKm < maxKm`, selain itu `NOT_ALLOWED`; audit `delivery_zone.updated`
  - `assignCourier(s, taskId: string, courierId: string, actor, now): ActionResult<DeliveryTask>` — tugas `PICKUP` yang di-assign memindahkan order `REQUESTED → PICKUP_ASSIGNED`
  - `updateDeliveryTask(s, taskId: string, status: DeliveryTaskStatus, extra: { proof?: { receiverName: string; method: 'PHOTO' | 'SIGNATURE' | 'PIN' }; failReason?: string }, actor, now): ActionResult<DeliveryTask>` — `DONE` wajib `proof.receiverName.trim()`; `FAILED` wajib `failReason.trim()` (else `REASON_REQUIRED`); `DONE` pada `PICKUP` → order `PICKED_UP`; `DONE` pada `DELIVERY` → order `DELIVERED`
- Produces (`csv.ts`): `toCsv(rows: Record<string, string | number>[]): string` — header dari key baris pertama, nilai dengan koma/kutip/baris baru di-quote dengan `"` ganda

Keputusan isi:
- `/app/pengantaran`:
  - Tab Jemput / Antar, kartu dikelompokkan per status tugas.
  - `assign-courier` berisi dropdown kurir (staf `COURIER` outlet aktif).
  - Tombol status berurutan: Diterima kurir → Berangkat → Tiba → Selesai/Gagal.
  - `proof-dialog`: nama penerima, metode bukti, placeholder foto/tanda tangan.
  - Gagal membuka `ReasonDialog`.
- `/app/pelanggan`:
  - Tabel dengan cari (`data-search`) + tombol tambah.
  - `customer-drawer`: kontak, alamat, catatan/preferensi, riwayat order (link ke detail), jumlah order, dan total belanja.
- `/app/layanan`:
  - Tabel layanan per kategori dengan kolom harga per outlet (edit inline, simpan per sel), unit, durasi, dan switch aktif.
  - Banner: "Perubahan harga tidak mengubah order lama."
- `/app/laporan`:
  - Muat skill `dataviz` dulu.
  - Filter rentang 7/30/90 hari dan outlet.
  - Bar chart pendapatan per layanan dan per kanal, produktivitas per tahap (jumlah transisi), serta pelanggan baru vs repeat.
  - Tombol "Export CSV" mengunduh `order-<tanggal>.csv` dari `toCsv` lewat `Blob` + `URL.createObjectURL`.
- `/app/pengaturan`, tab:
  - Outlet: data outlet, form edit lokal.
  - Karyawan & Peran: tabel staf + tombol "Undang" dengan dialog nama/telepon/peran (state lokal).
  - Zona Pengantaran: editor tabel → `updateZones`, error ditampilkan bila tidak berurutan.
  - Metode Bayar Outlet: rekening/QRIS/tunai.
  - Template WhatsApp: pratinjau `buildWaMessage` untuk setiap event dengan data contoh.

- [ ] **Step 1: Write the failing tests**

```ts
// actions-catalog.test.ts (tambahan)
it('ubah harga tercatat di audit dan tidak menyentuh order lama', () => { /* price 8000 → services updated, audit service.price_changed, order lama tetap */ })
it('harga negatif atau pecahan ditolak', () => { /* -1 dan 7500.5 → NOT_ALLOWED */ })
it('zona harus berurutan tanpa celah', () => { /* zona 0–2 lalu 3–5 → NOT_ALLOWED; DEFAULT_ZONES → ok */ })
it('assign kurir memindahkan order REQUESTED ke PICKUP_ASSIGNED', () => {})
it('selesai jemput wajib nama penerima dan memindahkan order ke PICKED_UP', () => { /* tanpa proof → REASON_REQUIRED */ })
it('gagal antar wajib alasan', () => { /* failReason '  ' → REASON_REQUIRED */ })
it('selesai antar memindahkan order ke DELIVERED', () => {})

// csv.test.ts
it('meng-quote koma, kutip, dan baris baru', () => {
  expect(toCsv([{ a: 'x,y', b: 'say "hi"', c: 3 }])).toBe('a,b,c\n"x,y","say ""hi""",3')
})
it('array kosong menghasilkan string kosong', () => { expect(toCsv([])).toBe('') })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/lib/store/actions-catalog.test.ts src/lib/csv.test.ts`
Expected: FAIL pada test baru.

- [ ] **Step 3: Implement reducer tambahan dan `csv.ts`**

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test`
Expected: PASS semua.

- [ ] **Step 5: Bangun kelima halaman**

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`
Expected: tanpa error.

- [ ] **Step 7: Cek di browser**

Assign kurir ke tugas jemput dan selesaikan dengan bukti; ubah harga layanan lalu pastikan order lama tetap; export CSV dari laporan menghasilkan file yang terbuka benar; simpan zona tidak berurutan menampilkan error.

- [ ] **Step 8: Commit**

```bash
git add web/src
git commit -m "feat(web): add delivery, customers, services, reports, and settings screens"
```

---

### Task 15: Langganan tenant

**Files:**
- Create: `web/src/app/app/langganan/page.tsx`
- Create: `web/src/components/billing/{plan-usage,invoice-table,instruction-tabs,proof-upload-form,submission-history}.tsx`

**Interfaces:**
- Consumes: `submitSubscriptionProof` (Task 6); `validateProofFile`, `MAX_PROOF_BYTES` (Task 4); `formatRupiah`, `formatDate` (Task 1)
- Produces: route `/app/langganan`

Keputusan isi:
- `plan-usage`: paket aktif, jumlah outlet × harga, status langganan (badge), bar pemakaian order/bulan dan staf terhadap limit. Peringatan bila ≥ 80%.
- `invoice-table`: nomor, periode, nominal, jatuh tempo, status. Pilih baris untuk membuka panel bayar.
- `instruction-tabs`: instruksi aktif urut `sortOrder`.
  - Transfer: bank, nama, nomor + tombol salin.
  - Link: tombol ke `paymentUrl` (tab baru).
  - QRIS: kotak QR placeholder + nama merchant.
- `proof-upload-form`:
  - Input file `accept=".jpg,.jpeg,.png,.pdf"`, divalidasi saat dipilih.
  - Pesan error: "Format harus JPG, PNG, atau PDF." / "Ukuran file harus di bawah 2 MB."
  - Field lain: metode (dari instruksi), nominal (default nominal invoice), catatan.
  - Peringatan lunak bila nominal berbeda: "Nominal berbeda dari tagihan — akan dikonfirmasi tim Finance."
  - Kirim → `submitSubscriptionProof`.
- `submission-history`: semua submission invoice itu dengan status, catatan reviewer, dan file.
- Tidak ada tombol untuk menandai lunas sendiri. Teks: "Status lunas diperbarui setelah diverifikasi tim SwaraPOS."

- [ ] **Step 1: Bangun halaman langganan**

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: tanpa error.

- [ ] **Step 3: Cek di browser**

Pilih file `.webp` → ditolak; PDF > 2 MB → ditolak; PDF kecil dengan nominal sesuai → invoice jadi "Menunggu review" dan muncul di riwayat.

- [ ] **Step 4: Commit**

```bash
git add web/src
git commit -m "feat(web): add tenant subscription billing screen"
```

---

### Task 16: Super Admin

**Files:**
- Create: `web/src/app/admin/page.tsx` (ganti placeholder), `web/src/app/admin/tenant/page.tsx`, `web/src/app/admin/tenant/[id]/page.tsx`, `web/src/app/admin/pembayaran/page.tsx`, `web/src/app/admin/instruksi-bayar/page.tsx`, `web/src/app/admin/paket/page.tsx`, `web/src/app/admin/audit/page.tsx`, `web/src/app/admin/kesehatan/page.tsx`
- Create: `web/src/components/admin/{tenant-table,tenant-status-badge,submission-review,instruction-form,plan-editor,audit-table,health-grid,support-banner}.tsx`

**Interfaces:**
- Consumes: `reviewSubmission`, `setTenantStatus`, `startSupportSession`, `upsertInstruction`, `updatePlan` (Task 6); `ReasonDialog`, `KpiCard`, `Tabs`, `Drawer` (Task 7); `formatRupiah`, `formatDateTime` (Task 1)
- Produces: route `/admin/*`

Keputusan isi:
- `/admin`:
  - Muat skill `dataviz` dulu.
  - KPI: jumlah tenant per status, outlet aktif, MRR (Σ harga paket × outlet untuk tenant `ACTIVE`), submission menunggu review (link ke antrean).
  - Grafik tenant baru 6 bulan dan ringkas kesehatan.
- `/admin/tenant`: tabel + cari + filter status. Kolom: nama, kota, paket, outlet, order bulan ini, status, tanggal daftar.
- `/admin/tenant/[id]`:
  - Profil owner, penggunaan kuota, invoice, catatan support.
  - Tombol "Suspend" / "Aktifkan kembali" lewat `ReasonDialog`.
  - "Mulai akses support (read-only)": dialog alasan + durasi 15/30/60 menit. Setelah aktif muncul `support-banner` dengan sisa waktu dan semua tombol ubah nonaktif.
- `/admin/pembayaran`:
  - Tab Menunggu (`UNDER_REVIEW` + `AMOUNT_MISMATCH_REVIEW`) / Disetujui / Ditolak.
  - `submission-review` berisi:
    - Tenant, invoice, instruksi yang dipakai.
    - Nominal klaim vs tagihan, dengan selisih disorot amber.
    - Pratinjau file placeholder (nama, jenis, ukuran).
    - Catatan tenant dan riwayat submission invoice yang sama.
  - Tombol "Setujui": untuk selisih nominal wajib catatan di textarea. Tombol "Tolak" lewat `ReasonDialog`.
- `/admin/instruksi-bayar`: daftar kartu per metode dengan switch aktif dan tombol naik/turun (`sortOrder`). `instruction-form` menampilkan field sesuai metode: transfer → bank/nama/nomor; link → URL + label tombol; QRIS → nama merchant + unggah gambar placeholder.
- `/admin/paket`: dua kartu Basic/Pro, edit harga per outlet, limit, dan daftar fitur (toggle) → `updatePlan`.
- `/admin/audit`: tabel aktor, aksi, tenant, entitas, detail, waktu WIB. Filter aksi dan tenant. Read-only.
- `/admin/kesehatan`: grid `HealthCheck` (UP/DEGRADED/DOWN dengan ikon + label), backlog outbox (angka seed), jumlah WhatsApp belum ditandai terkirim (dihitung dari order tenant).

- [ ] **Step 1: Bangun halaman dan komponen admin**

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: tanpa error.

- [ ] **Step 3: Cek di browser**

Setujui submission dari Task 15 → kembali ke `/app/langganan`, invoice "Lunas"; tolak submission selisih tanpa alasan → tombol terkunci; suspend tenant dengan alasan → tercatat di audit; ubah urutan instruksi → urutan di `/app/langganan` ikut berubah.

- [ ] **Step 4: Commit**

```bash
git add web/src
git commit -m "feat(web): add super admin dashboard"
```

---

### Task 17: Verifikasi akhir

**Files:**
- Create: `web/README.md` (cara menjalankan, daftar route, catatan mode demo)

- [ ] **Step 1: Quality gates**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`
Expected: semua lulus; catat jumlah test.

- [ ] **Step 2: Walkthrough alur spec §6 di browser**

Dari `/` → Daftar → Onboarding → `/app` → Kasir (order dijemput + diantar) → Pickup (assign + selesai) → Produksi sampai Siap lewat QC → Detail (Kirim WhatsApp, tandai terkirim, catat bayar) → Lacak (375 px) → Antar (selesai dengan bukti) → Langganan unggah bukti → Admin setujui → Audit. Periksa console bebas error di setiap halaman.

- [ ] **Step 3: Cek responsif**

`/`, `/lacak/[token]` di 375 px; `/app`, `/app/produksi`, `/admin/pembayaran` di 768 px dan 1280 px; mode gelap di `/app`.

- [ ] **Step 4: Tulis `web/README.md` dan commit**

```bash
git add web/README.md
git commit -m "docs(web): add prototype README"
```
