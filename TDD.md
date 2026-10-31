# TDD — Technical Design Document

> Dalam dokumen ini, TDD berarti **Technical Design Document**, bukan Test-Driven Development. Strategi pengujian tetap dibahas pada bagian 14.

**Status:** Draft v0.1  
**Untuk:** Laundry SaaS multi-tenant  
**Target awal:** Android owner/staff/kurir + web customer tracking + web admin/operational dashboard + marketing landing page

---

## 1. Keputusan Arsitektur

Gunakan **modular monolith** sebagai fondasi MVP dengan boundary domain yang jelas, bukan microservices sejak hari pertama. Ini mengurangi kompleksitas deployment, transaksi, debugging, dan biaya, tetapi tetap memungkinkan pemisahan service ketika volume dan tim membesar.

### Komponen utama

- **Mobile app:** Flutter Android untuk owner, kasir, operator, dan kurir dengan role-based navigation.
- **Customer tracking:** Next.js/React responsive web atau PWA, dibuka dari link WhatsApp; customer app Android bukan dependency MVP.
- **Web app:** Next.js/React untuk landing page, admin tenant, dashboard produksi, customer tracking, dan super admin.
- **Backend API:** NestJS/TypeScript atau FastAPI/Python; rekomendasi awal NestJS bila tim kuat di TypeScript.
- **Database:** PostgreSQL dengan `tenant_id` pada seluruh tabel bisnis dan Row-Level Security sebagai defense-in-depth.
- **Cache/queue:** Redis untuk cache, rate limit, job queue, dan idempotency sementara.
- **Object storage:** S3-compatible storage untuk foto kondisi, bukti serah-terima, logo, dan invoice.
- **Notifications:** WhatsApp manual untuk pelanggan dan Telegram Bot untuk alert internal Platform Owner/Finance; tindakan tetap dieksekusi melalui Dashboard Super Admin.
- **Maps:** geocoding/pemilihan alamat dan perhitungan jarak garis lurus untuk menentukan zona; routing jalan ditunda dari MVP.
- **Payments:** pencatatan pembayaran owner-managed (QRIS/transfer/tunai), tanpa payment gateway terpusat pada MVP.
- **Observability:** OpenTelemetry-compatible tracing, structured log, metrics, dan error tracking.

---

## 2. Batasan Sistem dan Deployment

```text
[Landing Page / Web App] ─┐
[Flutter Android App] ────┼──> [API / Auth / RBAC]
[Admin Dashboard] ────────┘            │
                                       ├── PostgreSQL
                                       ├── Redis + Job Worker
                                       ├── Object Storage
                                       ├── Manual WhatsApp deep links
                                       ├── Telegram Bot internal alerts
                                       ├── Owner-managed payment records
                                       └── Maps / Routing
```

Environment minimum:

- `local`
- `staging`
- `production`

Setiap environment memiliki database, bucket, secret, dan konfigurasi integrasi yang terpisah. MVP tidak membutuhkan callback WhatsApp karena pengiriman dilakukan manual dari perangkat staf. Token Telegram Bot disimpan sebagai secret server-side dan tidak pernah dikirim ke client.

---

## 3. Modul Domain

1. **Identity & Access** — user, session, OTP, role, permission, device.
2. **Tenancy** — tenant, subscription, plan, usage, outlet, branding.
3. **CRM** — customer, address, consent, notes.
4. **Catalog & Pricing** — service, unit, price rule, add-on, SLA, delivery zone.
5. **Orders** — order, order item, pricing snapshot, attachment, status history.
6. **Production** — work queue, batch, checklist, QC, issue, rewash.
7. **Logistics** — pickup/delivery task, assignment, route metadata, proof of handover.
8. **Payments** — invoice, payment, refund, webhook event, reconciliation.
9. **Notifications** — template, preference, event, delivery attempt, provider response.
10. **Reporting** — read models/queries untuk dashboard dan export.
11. **Platform Admin** — tenant, plan, subscription billing, support access, feature flags, audit, security, dan platform monitoring.
12. **Super Admin Finance** — invoice subscription, pembayaran manual, kredit, refund, MRR, dan revenue.
13. **Super Admin Support** — read-only tenant support, incident notes, pengumuman, dan maintenance.

Setiap modul memiliki handler/controller, application service/use case, domain model/rules, repository interface, dan test sendiri.

---

## 4. Multi-Tenancy

### Model yang direkomendasikan untuk MVP

Shared database + shared schema dengan `tenant_id` wajib pada seluruh entitas tenant-scoped.

- Semua request terautentikasi membawa `tenant_id` dari membership aktif; jangan percaya `tenant_id` dari body request.
- Query repository wajib menerima tenant context.
- Middleware mengatur tenant context dan authorization.
- PostgreSQL RLS menjadi lapisan tambahan, bukan pengganti pemeriksaan aplikasi.
- Unique constraint menggunakan kombinasi `(tenant_id, business_key)`.
- Super admin memakai jalur akses terpisah dan seluruh impersonation/support access diaudit.

### Migrasi skala

Jika tenant enterprise membutuhkan isolasi khusus, sediakan abstraksi tenant resolver sehingga tenant dapat dipindah ke schema/database terpisah tanpa mengubah domain API.

---

## 5. Identity, Auth, dan Authorization

- Login email/nomor telepon + password atau OTP sesuai keputusan produk.
- Access token berumur pendek dan refresh token yang dapat dicabut per device.
- OTP: expiry, single-use, retry limit, IP/device throttling.
- Password reset, logout semua device, dan session list.
- RBAC permission granular, contoh: `order.create`, `order.discount.approve`, `production.update`, `report.view`.
- Authorization selalu memeriksa tenant, outlet scope, dan permission.
- Device/session metadata dapat dicabut per device dan tidak menyimpan token notifikasi yang tidak digunakan pada MVP.

---

## 6. Model Data Inti

Contoh tabel utama:

- `tenants(id, slug, name, status, timezone, created_at)`
- `subscriptions(id, tenant_id, plan_id, billing_period, status, trial_ends_at, current_period_start, current_period_end, price_snapshot)`
- `subscription_invoices(id, tenant_id, subscription_id, number, amount, status, due_at, paid_at, approved_by, approved_at, rejection_reason)`
- `subscription_plans(id, code, name, price_per_outlet_month, feature_flags, usage_limits, active)`
- `platform_payment_instructions(id, method, label, bank_name, account_name, account_number, payment_url, qris_object_key, instructions, sort_order, active, effective_from, effective_until)`
- `subscription_payment_submissions(id, invoice_id, instruction_id, method, amount_claimed, paid_at, note, status, submitted_by, reviewed_by, reviewed_at, rejection_reason)`
- `subscription_payment_proofs(id, submission_id, object_key, original_filename, mime_type, size_bytes, checksum, uploaded_by, created_at)`
- `outlets(id, tenant_id, name, address, lat, lng, operating_hours, status)`
- `users(id, name, phone, email, password_hash, status)`
- `memberships(id, tenant_id, user_id, role_id, outlet_id, status)`
- `roles(id, tenant_id_nullable, name)`
- `permissions(id, key)`
- `customers(id, tenant_id, name, phone, email, notes)`
- `customer_addresses(id, tenant_id, customer_id, label, address, lat, lng, is_default)`
- `services(id, tenant_id, name, pricing_unit, duration_hours, active)`
- `service_prices(id, tenant_id, service_id, outlet_id, amount, effective_from)`
- `orders(id, tenant_id, outlet_id, order_no, customer_id, channel, fulfillment_type, status, due_at, totals, version)`
- `order_items(id, tenant_id, order_id, service_id, description, qty, weight, unit_price, total)`
- `order_attachments(id, tenant_id, order_id, type, object_key, checksum)`
- `order_status_history(id, tenant_id, order_id, from_status, to_status, actor_id, note, metadata, created_at)`
- `production_batches(id, tenant_id, outlet_id, stage, status, started_at, completed_at)`
- `production_items(id, tenant_id, batch_id, order_id, checklist_result)`
- `quality_checks(id, tenant_id, order_id, result, notes, actor_id)`
- `delivery_zones(id, tenant_id, outlet_id, name, min_radius_km, max_radius_km, pickup_fee, delivery_fee, min_order_amount, status)`
- `delivery_quotes(id, tenant_id, order_id, address_id, outlet_id, zone_id, pickup_fee, delivery_fee, distance_km, requires_confirmation, expires_at)`
- `delivery_tasks(id, tenant_id, order_id, type, courier_id, zone_id, status, scheduled_at)`
- `handover_proofs(id, tenant_id, delivery_task_id, type, object_key, receiver_name, pin_verified_at)`
- `invoices(id, tenant_id, order_id, number, amount, status, due_at)`
- `payments(id, tenant_id, invoice_id, method, amount, status, provider_reference)`

- `notification_events(id, tenant_id, order_id, type, channel, recipient, status)`
- `platform_notification_recipients(id, platform_admin_id, channel, chat_id, active)`
- `platform_notification_events(id, event_type, channel, recipient_id, entity_type, entity_id, status, sent_at, error_code)`
- `platform_admins(id, user_id, role, mfa_enabled, status)`
- `platform_audit_logs(id, actor_id, action, tenant_id_nullable, entity_type, entity_id, metadata, created_at)`
- `support_access_sessions(id, actor_id, tenant_id, reason, scope, started_at, expires_at, ended_at)`
- `platform_announcements(id, title, body, severity, starts_at, ends_at, status)`
- `platform_metrics_daily(id, metric_date, tenant_count, outlet_count, order_count, mrr_amount, storage_bytes)`

### Aturan data penting

- Jangan menghitung ulang harga historis dari catalog; simpan price snapshot di `order_items`.
- Nomor order harus unik per tenant/outlet sesuai format konfigurasi.
- Gunakan decimal/integer minor unit untuk uang, bukan floating point.
- Gunakan UTC di database; tampilkan timezone tenant/outlet di UI.
- Status order menggunakan optimistic locking (`version`) untuk mencegah overwrite.
- Soft delete untuk catalog/customer bila diperlukan; jangan menghapus audit dan transaksi.

---

## 6. SaaS Subscription Billing

Billing SwaraPOS dipisahkan dari pembayaran order laundry tenant. Model awal adalah per outlet per bulan dengan plan `BASIC` dan `PRO`. Tenant memiliki subscription aktif, periode tagihan, price snapshot, invoice langganan, dan status pembayaran.

- `BASIC` dan `PRO` disimpan sebagai konfigurasi plan, bukan hard-code di aplikasi.
- Harga dan feature flags disnapshot pada awal periode agar perubahan harga tidak mengubah invoice historis.
- Perubahan paket berlaku pada periode berikutnya atau menggunakan aturan prorata yang ditetapkan platform.
- Pada MVP, invoice langganan dibayar di luar SwaraPOS melalui instruksi platform berupa transfer bank, link pembayaran (misalnya Lynk.id), atau QRIS.
- Tenant mengunggah bukti bayar; status submission `UNDER_REVIEW` sampai diverifikasi oleh Finance/Platform Owner.
- Hanya reviewer berpermission yang dapat mengubah submission menjadi `APPROVED` atau `REJECTED`; keputusan reject wajib memiliki alasan.
- Approval mengubah invoice menjadi `PAID` dan memperbarui subscription dalam transaksi idempotent yang sama.
- Bukti, keputusan, instruksi yang dipakai, nominal, dan reviewer disimpan untuk audit. Bukti baru tidak menghapus riwayat bukti lama.
- Tidak ada webhook/payment gateway atau auto-verification pada MVP.
- File bukti hanya menerima `image/jpeg`, `image/png`, dan `application/pdf` dengan `size_bytes < 2 MB`; validasi dilakukan sebelum presigned upload dan diverifikasi ulang oleh backend.
- Upload ulang membuat record proof baru pada submission baru atau revision berikutnya; record lama bersifat immutable.
- Selisih antara `amount_claimed` dan nominal invoice menghasilkan status `AMOUNT_MISMATCH_REVIEW`, bukan auto-reject. Reviewer wajib memilih keputusan dan menulis catatan konfirmasi.
- Notifikasi Telegram otomatis MVP dikirim kepada Platform Owner/Finance ketika tenant baru mendaftar dan ketika submission bukti pembayaran subscription/perpanjangan berhasil dibuat. Pesan menyertakan deep link ke Dashboard Super Admin; approve/reject/konfirmasi tetap dilakukan di dashboard. Reminder kepada tenant owner tidak wajib pada MVP dan dapat dilakukan manual.
- Status overdue/suspended harus membatasi fitur sesuai kebijakan, tetapi tidak menghapus data tenant.

---

## 7. Order Workflow

Transisi didefinisikan eksplisit dalam domain service, bukan bebas mengubah kolom status.

```text
DRAFT -> REQUESTED -> PICKUP_ASSIGNED -> PICKED_UP -> RECEIVED
RECEIVED -> INSPECTED -> WEIGHED_OR_COUNTED -> IN_WASHING
IN_WASHING -> IN_DRYING -> IN_IRONING -> IN_FINISHING
IN_FINISHING -> QUALITY_CHECK -> READY_FOR_PICKUP
READY_FOR_PICKUP -> OUT_FOR_DELIVERY -> DELIVERED -> COMPLETED
```

Aturan:

- `QUALITY_CHECK` harus sukses sebelum `READY_FOR_PICKUP`.
- `DELIVERED` membutuhkan bukti serah-terima atau override berpermission.
- `CANCELLED`, `ON_HOLD`, dan `ISSUE_REPORTED` memiliki alasan wajib.
- Perubahan status menghasilkan domain event dan audit log dalam transaksi yang sama.
- Retry request yang sama tidak boleh menggandakan status history atau notifikasi.

---

## 8. API dan Event

### REST API awal

- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/otp/verify`
- `GET /v1/me`
- `POST /v1/tenants`
- `GET/POST/PATCH /v1/outlets`
- `GET/POST/PATCH /v1/services`
- `GET/POST/PATCH /v1/customers`
- `POST /v1/orders`
- `GET /v1/orders/{id}`
- `POST /v1/orders/{id}/transition`
- `GET /v1/orders/{id}/timeline`
- `GET /v1/production/queue`
- `POST /v1/production/{id}/complete-stage`
- `POST /v1/orders/{id}/quality-check`
- `GET/POST/PATCH /v1/delivery-zones`
- `POST /v1/delivery/quote`
- `POST /v1/delivery/coverage-check`
- `GET/POST /v1/delivery/tasks`
- `POST /v1/delivery/tasks/{id}/proof`
- `POST /v1/payments/record`
- `POST /v1/payments/{id}/verify`
- `POST /v1/payments/{id}/proof`
- `GET /v1/payment-instructions`
- `PATCH /v1/payment-instructions`
- `GET /v1/subscription/invoices`
- `GET /v1/subscription/invoices/{id}`
- `GET /v1/subscription/payment-instructions`
- `POST /v1/subscription/invoices/{id}/payment-submissions`
- `POST /v1/subscription/payment-submissions/{id}/proof`
- `POST /v1/subscription/invoices/{id}/payment-submissions/{submission_id}/resubmit`
- `GET /v1/platform/subscription-payment-submissions?status=UNDER_REVIEW`
- `POST /v1/platform/subscription-payment-submissions/{id}/approve`
- `POST /v1/platform/subscription-payment-submissions/{id}/reject`
- `GET/POST/PATCH /v1/platform/payment-instructions`
- `POST /v1/notifications/whatsapp/prepare`
- `POST /v1/notifications/{id}/mark-sent`
- `GET /v1/notifications?order_id={id}`
- `GET /v1/platform/overview`
- `GET/POST/PATCH /v1/platform/tenants`
- `GET/POST/PATCH /v1/platform/plans`
- `GET/POST /v1/platform/subscription-invoices`
- `POST /v1/platform/tenants/{id}/suspend`
- `POST /v1/platform/support-sessions`
- `GET /v1/platform/audit-logs`
- `GET /v1/platform/health`
- `GET/PATCH /v1/platform/notification-settings`
- `POST /v1/platform/notifications/telegram/test`
- `GET /v1/reports/summary`
- `GET /v1/public/order-tracking/{tracking_token}`

### API rules

- Prefix versi (`/v1`).
- OpenAPI sebagai kontrak.
- Pagination cursor untuk daftar besar.
- Idempotency key wajib pada create order, transition, payment submission, upload proof, approval, dan rejection.
- Error format konsisten: `code`, `message`, `details`, `request_id`.
- Jangan mengembalikan PII yang tidak dibutuhkan.

### Domain events

Contoh: `OrderCreated`, `OrderStatusChanged`, `QualityCheckPassed`, `DeliveryAssigned`, `PaymentSucceeded`, `NotificationRequested`.

Untuk MVP, event dapat diproses melalui transactional outbox + worker. Jangan mengandalkan publish langsung setelah commit tanpa outbox karena event dapat hilang.

---

## 9. File, Foto, dan QR/Barcode

- Upload langsung ke object storage dengan presigned URL.
- Backend melakukan validasi MIME, ukuran, extension, dan virus scan bila tersedia.
- Simpan metadata, checksum, uploader, tenant, dan entity reference.
- URL akses bersifat signed dan berumur pendek.
- Thumbnail untuk foto kondisi agar dashboard cepat.
- QR/barcode hanya berisi opaque token/order ID yang tidak membocorkan PII.
- Kebijakan retensi foto dan penghapusan harus mengikuti keputusan legal/operasional.

### Offline dan Reliability

Aplikasi Android owner/staf/kurir mendukung offline terbatas. Data yang sudah tersinkron dapat dibaca tanpa koneksi; user dapat membuat draft order, mencatat penerimaan sederhana, memperbarui aktivitas produksi yang diizinkan, serta mencatat pickup/delivery untuk disinkronkan kemudian. Fitur yang membutuhkan data server terbaru, perubahan harga/master data, pembayaran, pengiriman WhatsApp, dan validasi lintas perangkat ditunda sampai online.

- Local database terenkripsi atau protected storage untuk data operasional minimum.
- Outbox lokal dengan idempotency key per mutation.
- Retry exponential backoff saat koneksi kembali.
- Indikator `offline`, `pending sync`, `synced`, dan `sync conflict` yang terlihat jelas.
- Sinkronisasi bertahap dan dapat dilanjutkan setelah aplikasi restart.
- Conflict resolution server-side berdasarkan version/state machine; tidak boleh silent overwrite.
- Data lokal memiliki TTL dan dihapus/ditandai setelah sinkronisasi berhasil.
- Aksi sensitif seperti perubahan harga, refund, approval diskon, dan perubahan role wajib online.
- Pengiriman WhatsApp dilakukan setelah data order tersinkron, agar link tracking tidak menunjuk data yang belum tersedia di server.

MVP tidak menjanjikan semua fitur tersedia offline; UI harus menjelaskan alasan sebuah aksi membutuhkan koneksi.

---

## 11. Notification Pipeline

1. Domain event masuk outbox.
2. Worker atau application service memilih template pesan berdasarkan event dan preferensi tenant.
3. API membuat payload deep link WhatsApp: nomor tujuan, teks terisi, dan tracking URL.
4. Aplikasi staf membuka WhatsApp melalui deep link; staf menekan kirim.
5. Staf menandai pesan terkirim; sistem menyimpan waktu, user, event, dan status pengiriman manual.
6. Pesan yang belum dikirim tetap muncul sebagai task/reminder di order.

Notifikasi harus idempotent per `(tenant_id, order_id, event_type, recipient, version)` agar status tidak mengirim duplikat.

---

## 12. Security dan Compliance

- TLS penuh; secret hanya dari secret manager/environment secure.
- CORS allowlist; CSRF protection untuk web session jika cookie digunakan.
- Rate limit auth, tracking public, upload, dan webhook.
- Validasi input dengan schema; parameterized query/ORM aman.
- Tidak ada webhook/payment gateway subscription pada MVP; integrasi otomatis dapat ditambahkan melalui adapter setelah alur manual stabil.
- Audit action sensitif dan akses support.
- PII masking pada log; jangan log OTP, token, password, atau payment secret.
- Least privilege untuk service account dan storage.
- Dependency scanning, SAST, secret scanning, dan image scanning di CI.
- Backup terenkripsi; lakukan restore drill minimal per kuartal.
- Siapkan Privacy Policy, Terms, consent marketing, prosedur incident response, dan data deletion/export.

---

## 13. Frontend Architecture

### Flutter

- Feature-first modules: `auth`, `orders`, `production`, `delivery`, `customer`, `payments`, `profile`.
- Customer tracking pada MVP berada di web/PWA melalui link WhatsApp; modul customer Flutter disiapkan sebagai fase lanjutan.
- State management konsisten (Riverpod/BLoC; pilih satu).
- Repository layer untuk API/local cache.
- Design tokens bersama: color, typography, spacing, radius, elevation, motion.
- Accessibility labels dan semantic tree.
- Analytics event tidak menyimpan PII.

### Web

- Next.js App Router untuk SEO landing page dan dashboard terproteksi.
- TanStack Query untuk server state; form validation schema bersama API.
- Route guard berdasarkan session, tenant, role, dan outlet scope.
- Dashboard responsif untuk desktop/tablet; operator tidak dipaksa memakai layout mobile.

### Motion system

- Durasi standar 120–300 ms untuk UI feedback.
- Animasi status boleh lebih menonjol, tetapi harus bisa dikurangi melalui reduced-motion preference.
- Hindari parallax berat dan video autoplay pada perangkat low-end.

---

## 14. Strategi Testing dan Quality Gates

Ikuti pola **Red → Green → Refactor** untuk logika baru: tulis test gagal, jalankan untuk memastikan gagal karena perilaku belum ada, implementasi minimal, lalu refactor setelah hijau.

### Unit test

- State transition dan aturan role.
- Perhitungan harga, diskon, biaya delivery, pembulatan.
- SLA dan estimasi selesai.
- Idempotency dan retry policy.
- Permission dan tenant scoping.

### Integration test

- Repository dengan PostgreSQL test container.
- RLS/tenant isolation.
- Transactional outbox.
- Payment webhook signature dan duplicate event.
- Object storage presigned flow.

### API contract test

- OpenAPI schema.
- Error response, pagination, auth, dan backward compatibility.
- Consumer test untuk mobile/web terhadap API staging.

### E2E test

Skenario minimum:

1. Tenant signup → onboarding → membuat layanan.
2. Kasir membuat order → label → pembayaran.
3. Operator menyelesaikan tahap → QC → ready.
4. Customer membuka tracking dan menerima notifikasi.
5. Kurir mengambil order → upload proof → delivered.
6. Tenant A mencoba membaca order Tenant B dan ditolak.
7. Payment webhook duplicate diproses satu kali.
8. Request timeout/retry tidak menggandakan order.

### Non-functional test

- Load test endpoint order, queue produksi, tracking publik, dan webhook.
- Security test: OWASP baseline, auth abuse, IDOR, upload abuse, SQLi/XSS.
- Mobile test: Android versi target, low bandwidth, app restart saat sync pending.
- Accessibility dan visual regression untuk komponen penting.

### CI quality gates

- Format/lint/typecheck.
- Unit + integration test.
- Coverage minimum untuk domain kritis, bukan coverage angka semata.
- SAST, dependency scan, secret scan.
- Build web dan Android debug/release candidate.
- Migration check dan smoke test staging.

---

## 15. Observability dan Operasional

Dashboard operasional harus memantau:

- API latency/error rate per route.
- Queue depth, retry, dead-letter.
- Order creation failure dan duplicate attempt.
- Notification delivery rate.
- Payment webhook lag/failure.
- Database CPU, connection pool, slow query.
- Storage upload failure.
- Crash-free sessions mobile.

Setiap request memiliki `request_id`; event bisnis memiliki `correlation_id`. Alert dibedakan antara critical (order/payment), warning (notifikasi), dan informational.

---

## 16. Deployment dan Disaster Recovery

- CI/CD: build → test → security scan → deploy staging → smoke test → approval → production.
- Database migration backward-compatible; hindari migration yang mengunci tabel besar saat jam sibuk.
- Blue/green atau rolling deployment sesuai platform.
- Feature flag untuk fitur berisiko.
- RPO/RTO awal harus diputuskan; rekomendasi awal RPO <= 15 menit dan RTO <= 2 jam.
- Backup otomatis, encrypted, dan diuji restore.
- Runbook untuk payment outage, notification outage, database outage, dan data incident.

---

## 17. Estimasi Tahapan Teknis

Estimasi berikut hanya untuk perencanaan awal dan perlu disesuaikan dengan ukuran tim.

### Sprint 0 — Discovery/architecture

- Finalisasi proses bisnis pilot.
- Wireframe dan design system.
- ADR untuk auth, payment, multi-tenancy, notification.
- Setup repo, CI, environments, observability dasar.

### Sprint 1–2 — Foundation

- Auth, tenant, outlet, role, service catalog.
- Database migration, API conventions, Flutter/web shell.

### Sprint 3–5 — Core order

- Customer, order, pricing snapshot, status machine, label/QR, audit.

### Sprint 6–7 — Production/QC

- Queue, batch, checklist, QC, issue/hold, dashboard operasional.

### Sprint 8–9 — Customer/logistics

- Tracking, push notification, pickup/delivery task, proof.

### Sprint 10 — Billing and hardening

- Subscription SaaS, payment order, reports, load/security/E2E test, pilot readiness.

---

## 18. Architecture Decision Records yang Harus Dibuat

1. Mengapa modular monolith, bukan microservices.
2. Shared schema vs schema-per-tenant.
3. Flutter vs native Android.
4. OTP vs password vs kombinasi.
5. Owner-managed payment records vs payment gateway terpusat.
6. WhatsApp Business API/provider resmi vs tombol kirim manual pada pilot.
7. Offline scope MVP.
8. Retensi foto dan PII.
9. State machine dan aturan order parsial.
10. Pricing SaaS dan metering usage.

---

## 19. Risiko Teknis

- Variasi pricing unit dan proses produksi membuat domain model terlalu generik.
- Integrasi provider pihak ketiga dapat menghambat pilot; siapkan adapter dan fake provider.
- Shared schema tanpa disiplin tenant scoping berisiko kebocoran data; gunakan RLS + integration test.
- Offline penuh memperbesar kompleksitas conflict resolution; batasi MVP pada draft/outbox yang paling bernilai.
- Animasi dan image asset dapat memperburuk performa Android low-end; lakukan performance budget.
- Review pembayaran manual dapat terlambat atau salah cocok; wajibkan antrean review, alasan keputusan, audit log immutable, idempotency pada approval, dan rekonsiliasi berkala.

---

## 20. Definition of Done untuk MVP

- Acceptance criteria PRD terpenuhi.
- Unit, integration, API contract, dan E2E critical path lulus.
- Tidak ada high/critical security finding terbuka.
- Tenant isolation dibuktikan dengan automated test.
- Backup dan restore staging tervalidasi.
- Monitoring, alert, runbook, dan rollback tersedia.
- Dokumentasi onboarding tenant dan SOP operasional tersedia.
- Pilot dapat menjalankan minimal satu order lengkap dari request sampai completed tanpa intervensi database manual.
