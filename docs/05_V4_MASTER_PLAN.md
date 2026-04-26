# KOST48 V3 — Master Plan V4 Completion
**Versi:** 2026-04-24 | **Scope:** Dari posisi sekarang hingga V4 selesai penuh  
**Bahasa:** Bahasa Indonesia (operasional)  
**Status dokumen:** Rencana kerja aktif — wajib dibaca setiap buka sesi V4

---

## BAGIAN 0 — POSISI TERKINI & PETA JALAN

### 0.1 Apa yang Sudah Selesai

| Fase | Nama | Status |
|------|------|--------|
| 0–3.5 | Fondasi, stabilisasi, role nav, portal access, ticket redesign, backend audit | ✅ Selesai |
| 4.0 | Booking mandiri + RESERVED | ✅ Patch + UAT Gate 1 PASS |
| 4.1 | Admin approval + pelengkapan data | ✅ Patch + UAT Gate 2 PASS |
| 4.2 | Pembayaran mandiri + aktivasi otomatis | ✅ CORE PASS; P1 cleanup pending sebelum 4.3 |
| 4.3 | Notifikasi & reminder WhatsApp | ⬜ Belum dimulai |
| 4.4 | Marketing display & registrasi fleksibel | ⬜ Belum dimulai |
| 4.5 | Tenant self-service lanjutan | ⬜ Belum dimulai |

### 0.2 Kenapa UAT Harus Mendahului Kode Baru

Fase 4.0 dan 4.1 sudah dinyatakan PASS berdasarkan UAT 2026-04-26. UAT 4.2 core juga sudah PASS: happy path, reject path, wrong amount path, double approve prevention, dan expiry core telah ditutup. P0 tenant portal cache isolation juga sudah CLOSED. Sebelum membuka 4.3, proyek hanya perlu menutup P1 cleanup kecil agar tidak membawa UX/data orphan ke fase notifikasi.

1. **Fase 4.2 memperkenalkan aktivasi kamar `RESERVED → OCCUPIED`** — ini irreversible dalam konteks operasional. Bug di flow booking 4.0 yang belum diketahui bisa membuat data kamar korup setelah 4.2 aktif.
2. **Expiry booking 4.2 berinteraksi dengan** `expiresAt` yang dibuat di 4.0. Jika 4.0 mengisi `expiresAt` dengan cara yang salah, expiry job di 4.2 akan membatalkan booking yang seharusnya masih valid.

### 0.3 Urutan Kerja yang Tidak Boleh Dilangkahi

```
Gate 1: UAT 4.0 lolos ✅
    ↓
Gate 2: UAT 4.1 lolos ✅
    ↓
UAT 4.2 happy path lolos ✅
    ↓
ACT P1: Post-UAT 4.2 cleanup
    ↓
Targeted retest cleanup
    ↓
ACT 4.3: WhatsApp reminder (backend → frontend → UAT)
    ↓
ACT 4.4: Marketing + registrasi fleksibel (backend → frontend → UAT)
    ↓
ACT 4.5: Self-service tenant (backend → frontend → UAT)
    ↓
V4 Definition of Done
```

---

## BAGIAN 1 — GATE 1: UAT FASE 4.0

**Prasyarat sebelum mulai UAT:**  
- Backend dan frontend running lokal  
- `bootstrap.sql` sudah dijalankan ulang pasca reset DB dev  
- `npx prisma generate` sudah dijalankan di environment lokal  
- DB dev sudah memuat `RoomStatus.RESERVED` dan `Stay.expiresAt`  
- Setidaknya ada: 1 akun ADMIN, 1 akun TENANT, 1 kamar `AVAILABLE`  

---

### UAT 4.0 — Skenario 1: Katalog Kamar Publik

**Aktor:** Guest (tidak login)

**Langkah:**
1. Buka `/rooms` tanpa login
2. Sistem harus menampilkan katalog kamar publik (bukan workspace backoffice)
3. Filter pencarian, filter lantai, filter pricingTerm harus berfungsi
4. Card kamar menampilkan: kode/nama kamar, lantai, tarif utama, term tersedia, tombol **Pesan Sekarang**
5. Jika gambar belum ada, placeholder muncul (bukan broken image)

**Kriteria lolos:**
- [ ] Katalog muncul tanpa login
- [ ] Filter berfungsi dan tidak crash untuk query kosong
- [ ] Placeholder muncul bila gambar tidak ada
- [ ] Tombol Pesan Sekarang mengarah ke login (bukan langsung ke form booking)

**⚠️ Risk flag:** Resolver `/rooms` memutuskan surface berdasarkan role. Jika ada bug di resolver, backoffice rooms bisa tampil ke guest atau sebaliknya.

---

### UAT 4.0 — Skenario 2: Login sebagai OWNER/ADMIN/STAFF, Buka `/rooms`

**Aktor:** ADMIN yang sudah login

**Langkah:**
1. Login sebagai ADMIN
2. Buka `/rooms`
3. Sistem harus menampilkan **workspace backoffice rooms** (bukan katalog publik)

**Kriteria lolos:**
- [ ] Backoffice rooms muncul untuk ADMIN — bukan katalog publik
- [ ] CRUD room backoffice masih bisa diakses normal
- [ ] Route lama tidak rusak

---

### UAT 4.0 — Skenario 3: Tenant Membuat Booking

**Aktor:** TENANT yang sudah login dan belum punya stay aktif

**Langkah:**
1. Login sebagai TENANT
2. Buka `/rooms` → tampil katalog publik
3. Pilih kamar yang tersedia → klik **Pesan Sekarang**
4. Sistem redirect ke `/booking/:roomId`
5. Isi form: checkInDate, pricingTerm, plannedCheckOutDate (opsional), stayPurpose (opsional), notes (opsional)
6. Submit → sistem memanggil `POST /tenant/bookings`
7. Setelah sukses, redirect ke `/portal/bookings`

**Kriteria lolos:**
- [ ] Form booking memuat ringkasan kamar yang dipilih
- [ ] Submit berhasil → room status menjadi `RESERVED`
- [ ] `Stay.expiresAt` terisi dengan nilai yang masuk akal (tidak null, tidak di masa lalu)
- [ ] Tenant diarahkan ke halaman Pemesanan Saya
- [ ] Kamar yang sudah `RESERVED` tidak lagi muncul di katalog publik

**⚠️ Risk flag:** `expiresAt` dihitung dengan rule H-10 / H-1 / hari ini. Verifikasi bahwa nilai yang tersimpan di DB masuk akal untuk tanggal check-in yang diisi.

---

### UAT 4.0 — Skenario 4: Pemesanan Saya di Portal Tenant

**Aktor:** TENANT yang sudah punya booking aktif

**Langkah:**
1. Login sebagai TENANT
2. Buka `/portal/bookings`
3. Sistem menampilkan daftar booking tenant

**Kriteria lolos:**
- [ ] Booking muncul dengan: nama kamar, tanggal check-in, pricing term, tarif, expiresAt
- [ ] Badge masa berlaku jujur (masih berlaku / mendekati habis / berakhir hari ini / lewat)
- [ ] Empty state muncul bila tidak ada booking
- [ ] Tenant tidak diminta mengisi ID teknis apapun

---

### UAT 4.0 — Skenario 5: Backoffice Read-Only Booking Reserved

**Aktor:** ADMIN

**Langkah:**
1. Login sebagai ADMIN
2. Buka halaman **Stays**
3. Aktifkan mode/filter **Booking Reserved**
4. Sistem menampilkan daftar stay yang kamarnya berstatus `RESERVED`

**Kriteria lolos:**
- [ ] Booking reserved muncul dalam mode/filter yang tepat
- [ ] Informasi yang ditampilkan: tenant, kamar, check-in, pricing term, expiresAt, status approval
- [ ] Row booking reserved tidak membuka halaman operasional stay biasa
- [ ] Stay operasional (room OCCUPIED) tidak tercampur dengan booking reserved

---

### UAT 4.0 — Skenario 6: Tenant Mencoba Double Booking

**Aktor:** TENANT yang sudah punya stay ACTIVE atau booking RESERVED

**Langkah:**
1. TENANT yang sudah punya booking atau stay aktif mencoba membuat booking baru

**Kriteria lolos:**
- [ ] Backend menolak dengan error yang jelas (bukan 500)
- [ ] Frontend menampilkan pesan error yang operasional-friendly
- [ ] Data yang sudah ada tidak rusak

---

### UAT 4.0 — Skenario 7: Regression Baseline Stay

**Tujuan:** Pastikan booking mandiri tidak mematahkan check-in backoffice yang sudah ada

**Langkah:**
1. ADMIN membuat check-in baru via wizard (flow backoffice existing)
2. Stay ACTIVE terbentuk, room `OCCUPIED`, meter awal tersimpan, invoice DRAFT terbuat

**Kriteria lolos:**
- [ ] Check-in backoffice existing masih berjalan normal
- [ ] Room status sync benar setelah check-in
- [ ] Invoice DRAFT terbentuk dengan line RENT yang benar
- [ ] Meter tab di stay detail menampilkan meter awal

**Gate 1 sudah dinyatakan PASS pada 2026-04-26. Jangan ulang dari awal kecuali ada regresi pada file terkait.**

---

## BAGIAN 2 — GATE 2: UAT FASE 4.1

**Prasyarat:** Gate 1 sudah lolos

---

### UAT 4.1 — Skenario 1: Queue Approval di Backoffice

**Aktor:** ADMIN

**Langkah:**
1. Pastikan ada minimal 1 booking RESERVED yang belum diapprove (dari UAT 4.0)
2. Login sebagai ADMIN → buka halaman Stays → mode Booking Reserved
3. Identifikasi booking yang menunggu approval

**Kriteria lolos:**
- [ ] Queue menampilkan informasi manusiawi: tenant, kamar, check-in, pricing term, expiresAt, status
- [ ] Booking yang sudah punya invoice DRAFT (sudah diapprove) tidak terlihat sebagai "menunggu approval"

---

### UAT 4.1 — Skenario 2: Admin Approve Booking

**Aktor:** ADMIN

**Langkah:**
1. Dari queue booking reserved, klik tombol approve pada satu booking
2. Form approval muncul dengan field: `agreedRentAmountRupiah`, `depositAmountRupiah`, `initialElectricityKwh`, `initialWaterM3`
3. Isi semua field dengan nilai valid
4. Submit → sistem memanggil `PATCH /admin/bookings/:stayId/approve`

**Kriteria lolos:**
- [ ] Form validation berjalan — field kosong atau nilai negatif ditolak di frontend
- [ ] Submit berhasil → invoice DRAFT terbentuk untuk stay tersebut
- [ ] Invoice DRAFT berisi line RENT yang benar
- [ ] Meter awal tersimpan sebagai MeterReading (ELECTRICITY + WATER)
- [ ] Room status tetap `RESERVED` (belum OCCUPIED — aktivasi nanti di 4.2)
- [ ] Queue approval ter-refresh setelah aksi sukses
- [ ] Dashboard stays/invoices/dashboard terkait ter-invalidasi

---

### UAT 4.1 — Skenario 3: Status Tenant Setelah Approval

**Aktor:** TENANT yang bookingnya sudah diapprove

**Langkah:**
1. Login sebagai TENANT setelah admin approve booking
2. Buka `/portal/bookings`

**Kriteria lolos:**
- [ ] Status berubah dari "Menunggu Approval" menjadi "Menunggu Pembayaran"
- [ ] Tenant tidak diarahkan ke form payment submission (belum dibuka di 4.1)
- [ ] Tenant tidak diberi kesan kamar sudah `OCCUPIED`

---

### UAT 4.1 — Skenario 4: Approval dengan Data Tidak Valid

**Aktor:** ADMIN

**Langkah:**
1. Coba approve booking dengan `agreedRentAmountRupiah = 0`
2. Coba approve dengan `initialElectricityKwh = -5`
3. Coba approve booking yang sudah punya invoice DRAFT (double approval)

**Kriteria lolos:**
- [ ] Nilai 0 / negatif ditolak di frontend dengan pesan yang jelas
- [ ] Double approval menghasilkan error yang tidak mematahkan data yang sudah ada
- [ ] Tidak ada InvoicePayment palsu yang terbentuk dari double approval

---

### UAT 4.1 — Skenario 5: Regression Stays Operasional

**Tujuan:** Pastikan stay backoffice existing tidak terdampak

**Langkah:**
1. Pastikan ada stay ACTIVE yang bukan dari booking mandiri (dibuat via wizard check-in)
2. Verifikasi halaman Stays menampilkan keduanya dengan benar (stay operasional vs booking reserved)
3. Checkout salah satu stay operasional existing
4. Deposit processing tetap berjalan

**Kriteria lolos:**
- [ ] Filter stays operasional terpisah dari booking reserved
- [ ] Checkout flow tidak terdampak
- [ ] Deposit processing tidak terdampak

**Gate 2 sudah dinyatakan PASS pada 2026-04-26. Jangan ulang dari awal kecuali ada regresi pada file terkait.**

---

## BAGIAN 3 — ACT FASE 4.2: PEMBAYARAN MANDIRI & AKTIVASI (COMBINED BOOKING PAYMENT / TANPA PARSIAL)

**Prasyarat:** Gate 2 sudah lolos  
**Durasi estimasi:** 4–6 sesi Cline (backend berat, frontend sedang)  
**File cap per sesi:** maksimal 3 file sesuai konvensi proyek, kecuali batch stabilisasi besar yang disetujui eksplisit.

---

### 3.1 Overview Arsitektur 4.2

Fase 4.2 memakai model **combined booking payment**. Tenant merasakan satu journey bernama **Pembayaran Awal** dan mengirim satu bukti bayar untuk total sewa + deposit. Backend tetap membagi efek pembayaran secara internal agar sewa masuk ke invoice dan deposit masuk ke tracking deposit awal pada stay.

```
Tenant membuka Pemesanan Saya
    → melihat section Pembayaran Awal
    → melihat total: sisa sewa + sisa deposit
    ↓
Tenant submit satu bukti pembayaran
    → POST /payment-submissions
    → amountRupiah = rentRemaining + depositRemaining
    → PaymentSubmission PENDING_REVIEW
    ↓
Admin review queue
    → GET /payment-submissions/review-queue
    → admin melihat total pembayaran awal, rent portion, deposit portion, proof
    ↓
Admin approve
    → POST /payment-submissions/:id/approve
    → [transaction atomik]:
        PaymentSubmission.status = APPROVED
        Rent portion:
          InvoicePayment dibuat untuk sisa sewa
          Invoice booking awal langsung PAID
        Deposit portion:
          Stay.depositPaidAmountRupiah diset penuh
          Stay.depositPaymentStatus = PAID
        Jika invoice PAID dan deposit PAID:
          Room RESERVED→OCCUPIED
        Audit log
    ↓
Admin reject
    → POST /payment-submissions/:id/reject
    → reviewNotes wajib disimpan
    → tenant dapat submit ulang combined payment
    ↓
Booking expired (job)
    → Cek expiresAt yang lewat
    → Stay di-expire, Room kembali AVAILABLE
    → PaymentSubmission pending → EXPIRED
```

---

### 3.2 Backend — ACT 4.2.A: Schema & Model PaymentSubmission

**Tambahan/kontrak utama:**
- `PaymentSubmissionStatus`: `PENDING_REVIEW | APPROVED | REJECTED | EXPIRED`
- `PaymentSubmission` wajib menyimpan: `stayId`, `invoiceId`, `tenantId`, `submittedById`, `amountRupiah`, `paidAt`, `paymentMethod`, proof metadata, optional sender/reference/notes, review metadata.
- `targetType` / `targetId` boleh tetap ada jika schema/source sudah memakainya, tetapi untuk booking initial payment field ini dibaca sebagai compatibility/internal metadata, bukan pilihan tenant.
- `Stay` perlu tracking deposit awal booking: `depositPaidAmountRupiah` dan `depositPaymentStatus (UNPAID | PAID)`.

**Catatan penting:** tracking deposit awal booking tidak menggantikan lifecycle refund/forfeit deposit setelah checkout.

**Acceptance criteria:**
- [ ] Schema mendukung payment submission untuk booking awal.
- [ ] Stay punya tracking deposit awal booking.
- [ ] Migration/db push, `prisma generate`, dan backend build sukses.

---

### 3.3 Backend — ACT 4.2.B: Module & DTO

**DTO create submission harus membawa:**
- `stayId`
- `invoiceId`
- `amountRupiah`
- `paidAt`
- `paymentMethod`
- optional sender/reference/notes
- proof metadata

**Acceptance criteria:**
- [ ] DTO tidak meminta tenant memilih target teknis sewa/deposit.
- [ ] Payload cukup untuk backend menghitung combined remaining dari stay + invoice + deposit tracking.
- [ ] Tenant tetap tidak menginput ID teknis mentah; context diisi UI dari booking.

---

### 3.4 Backend — ACT 4.2.C: Service Tenant Submit

**Method `createSubmission(userId, dto)`:**
1. Ambil user dari JWT dan validasi `tenantId`.
2. Ambil stay milik tenant dengan room `RESERVED`.
3. Validasi booking belum expired.
4. Validasi invoice booking awal milik stay yang sama dan belum `PAID/CANCELLED`.
5. Hitung ulang:
   - `rentRemaining = invoiceTotalAmountRupiah - invoicePaidAmountRupiah`
   - `depositRemaining = depositAmountRupiah - depositPaidAmountRupiah`
   - `combinedRemaining = rentRemaining + depositRemaining`
6. `amountRupiah` harus sama persis dengan `combinedRemaining`.
7. Jika nominal tidak sesuai, tolak dengan pesan Bahasa Indonesia yang jelas.
8. Jika sudah ada submission `PENDING_REVIEW` untuk booking yang sama, tolak.
9. Buat `PaymentSubmission` dengan status `PENDING_REVIEW`.

**Acceptance criteria:**
- [ ] Submit berhasil untuk booking valid.
- [ ] Ditolak jika booking bukan milik tenant.
- [ ] Ditolak jika nominal kurang/lebih.
- [ ] Ditolak jika sudah ada `PENDING_REVIEW` untuk booking sama.
- [ ] Tidak ada pembayaran parsial.

---

### 3.5 Backend — ACT 4.2.D: Service Admin Approve + Activation Sync

**Method `approveSubmission(adminUserId, submissionId)` wajib dalam `prisma.$transaction()`:**

```
1. Lock submission row
2. Guard: status harus PENDING_REVIEW
3. Fetch stay + room dan validasi room masih RESERVED
4. Re-query invoice paid amount terbaru
5. Re-query deposit paid amount terbaru
6. Hitung:
   rentRemaining = invoice total - fresh paid amount
   depositRemaining = deposit amount - deposit paid amount
   combinedRemaining = rentRemaining + depositRemaining
7. submission.amountRupiah harus sama persis dengan combinedRemaining
8. Rent portion:
   - jika rentRemaining > 0, buat InvoicePayment final sekali saja
   - update invoice booking awal langsung PAID
9. Deposit portion:
   - update Stay.depositPaidAmountRupiah = depositAmountRupiah
   - update Stay.depositPaymentStatus = PAID
10. Update PaymentSubmission menjadi APPROVED
11. Jika invoice sewa PAID dan deposit PAID → Room RESERVED -> OCCUPIED
12. Audit log, termasuk ringkasan rent portion dan deposit portion
```

**Critical rules:**
- Jangan buat dua `InvoicePayment` dari satu submission.
- Jangan mencatat deposit sebagai pembayaran sewa.
- Jangan aktivasi kamar jika invoice atau deposit belum terbukti `PAID`.
- Tidak ada transisi `PARTIAL` dalam workflow booking payment 4.2.

**Reject:** `reviewNotes` wajib, status menjadi `REJECTED`, tidak membuat `InvoicePayment`, tidak mengubah deposit status, dan room tetap `RESERVED`.

**Acceptance criteria:**
- [ ] Approve valid membuat `InvoicePayment` untuk rent portion sekali saja dan invoice `PAID`.
- [ ] Approve valid mengubah deposit tracking menjadi `PAID`.
- [ ] Room menjadi `OCCUPIED` hanya jika sewa dan deposit sama-sama `PAID`.
- [ ] Double approve aman.

---

### 3.6 Backend — ACT 4.2.E: Controller + Expiry Job

**Controller routes:**
```
POST   /payment-submissions                → createSubmission (TENANT only)
GET    /payment-submissions/my             → findMine (TENANT only)
GET    /payment-submissions/review-queue   → findReviewQueue (ADMIN/OWNER only)
GET    /payment-submissions/:id            → findOne (role-safe)
POST   /payment-submissions/:id/approve    → approveSubmission (ADMIN/OWNER only)
POST   /payment-submissions/:id/reject     → rejectSubmission (ADMIN/OWNER only)
```

**Expiry job:**
- Cari stay `ACTIVE` + room `RESERVED` + `expiresAt < now()`.
- Dalam transaksi: pending submission menjadi `EXPIRED`, stay di-expire/cancel, room kembali `AVAILABLE`, invoice awal yang belum final boleh dibatalkan agar tidak orphan, audit log dibuat.
- Re-check state di dalam transaksi agar tidak race dengan approval admin.

---

### 3.7 Frontend — ACT 4.2.F: API Client + Types

Frontend types dan API client wajib mendukung:
- payment submission status
- proof metadata
- ringkasan stay/room
- ringkasan invoice awal
- ringkasan deposit
- total pembayaran awal / combined remaining bila tersedia

---

### 3.8 Frontend — ACT 4.2.G: Tenant Submit Bukti Bayar

**UX di `MyBookingsPage`:**
- Tampilkan satu section utama: **Pembayaran Awal**.
- Tampilkan breakdown informatif: **Sewa**, **Deposit**, dan **Total yang harus dibayar**.
- CTA tunggal: **Bayar Sewa & Deposit**.
- Status submission: `Belum Dibayar`, `Menunggu Review`, `Ditolak`, `Lunas`.
- Jika ada submission `PENDING_REVIEW`, jangan izinkan submit ulang sampai admin approve/reject.
- Jika sudah lunas, sembunyikan CTA bayar dan arahkan tenant ke status hunian aktif setelah room `OCCUPIED`.

**SubmitPaymentModal:**
- Judul: **Bayar Sewa & Deposit**.
- `amountRupiah` otomatis terisi dan dikunci ke total sisa pembayaran awal.
- Wajib: tanggal bayar, metode pembayaran, bukti pembayaran.
- Opsional: nama pengirim, bank pengirim, nomor referensi, catatan.
- Copy wajib:
  - `Pembayaran awal mencakup sewa pertama dan deposit.`
  - `Nominal harus sesuai dengan jumlah yang tertera. Jika nominal berbeda, admin akan menolak bukti pembayaran.`

---

### 3.9 Frontend — ACT 4.2.H: Admin Review Queue

**PaymentReviewPage:**
- Tabel submissions pending review.
- Row menampilkan proof, tenant, kamar, invoice, total pembayaran, rent portion, deposit portion, tanggal bayar, reference number.

**ReviewPaymentModal:**
- Tampilkan total pembayaran awal, nominal seharusnya, nominal dikirim, breakdown sewa/deposit, dan proof.
- Approve/reject dengan error handling jelas.
- Setelah sukses, invalidate review queue, stays, invoices, rooms, tenant bookings, dan dashboard terkait.

---

### 3.10 UAT Fase 4.2

**Happy path:**
1. Tenant melihat **Pembayaran Awal** dengan total Sewa + Deposit.
2. Tenant klik **Bayar Sewa & Deposit**.
3. Nominal otomatis terkunci ke total sisa pembayaran awal.
4. Tenant upload satu bukti bayar.
5. Admin approve submission.
6. Backend membuat `InvoicePayment` untuk rent portion, invoice sewa `PAID`, deposit `PAID`.
7. Karena sewa dan deposit sudah lunas, room berubah `OCCUPIED`.
8. Tenant masuk ke **Hunian Saya** sebagai hunian aktif.

**Reject path:** admin reject dengan alasan, tenant melihat alasan dan bisa submit ulang; tidak ada payment/deposit state berubah.

**Wrong amount path:** nominal berbeda ditolak frontend/backend; tidak ada partial payment.

**Expiry path:** booking expired mengembalikan room ke `AVAILABLE` dan pending submission menjadi `EXPIRED`.

**Double approve prevention:** hanya satu approval yang diproses; tidak ada `InvoicePayment` atau deposit update ganda.

**Acceptance criteria:**
- [ ] Tidak ada data korup (`InvoicePayment` ganda, deposit salah target, room status salah).
- [ ] Tenant tidak bisa submit untuk booking orang lain.
- [ ] Admin tidak bisa approve submission yang sudah selesai.
- [ ] Tidak ada jalur pembayaran parsial di workflow booking.

---
## BAGIAN 4 — ACT FASE 4.3## BAGIAN 4 — ACT FASE 4.3: NOTIFIKASI & REMINDER WHATSAPP

**Prasyarat:** UAT Fase 4.2 lolos  
**Durasi estimasi:** 3–4 sesi Cline  
**Catatan penting:** Fase ini memperkenalkan dependency eksternal (WhatsApp gateway). Pilih provider yang ada di environment Surabaya (Waha self-hosted atau Whapi cloud). Gateway harus injectable dan mockable untuk testing.

---

### 4.1 Pilihan Provider WhatsApp

| Provider | Model | Catatan |
|----------|-------|---------|
| Waha | Self-hosted Docker | Gratis, kontrol penuh, perlu server |
| Whapi | Cloud SaaS | Berbayar, mudah setup |
| Fonnte | Cloud SaaS Indonesia | Berbayar, populer di Indonesia |

**Rekomendasi untuk MVP:** Fonnte atau Whapi karena tidak perlu manage infra WhatsApp sendiri. Pastikan ada environment variable `WHATSAPP_GATEWAY_URL` dan `WHATSAPP_API_KEY` di `.env`.

---

### 4.2 Backend — ACT 4.3.A: WhatsApp Adapter

**Sesi:** 1 sesi Cline  
**File yang dibuat:**
- `src/modules/notifications/whatsapp.adapter.ts`
- `src/modules/notifications/notifications.module.ts`

**Interface adapter:**
```typescript
export interface IWhatsAppAdapter {
  sendMessage(phoneNumber: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
}
```

**Implementasi adapter:**
- Method `sendMessage` memanggil provider API
- Gagal tidak melempar exception — return `{ success: false, error: 'pesan error' }`
- Nomor HP di-normalize: `08xx...` → `628x...`
- Timeout yang wajar (5 detik)
- Log hasil kirim ke `NotificationLog` (model baru atau console.log untuk MVP)

**Model NotificationLog (opsional, tambahkan ke schema jika perlu audit trail):**
```prisma
model NotificationLog {
  id         String   @id @default(cuid())
  type       String   // 'BOOKING_EXPIRY_REMINDER' | 'INVOICE_DUE' | 'CHECKOUT'
  tenantId   String
  channel    String   // 'WHATSAPP' | 'EMAIL'
  payload    String   // ringkasan pesan
  status     String   // 'SENT' | 'FAILED'
  errorMsg   String?
  sentAt     DateTime @default(now())
}
```

---

### 4.3 Backend — ACT 4.3.B: Reminder Runner Service

**Sesi:** 1 sesi Cline  
**File yang dibuat:**
- `src/modules/notifications/reminder.service.ts`

**Method yang dibutuhkan:**

**A. `runBookingExpiryReminder()`:**
- Cari booking (stay ACTIVE, room RESERVED) yang `expiresAt` antara `now()` dan `now() + 24 jam`
- Cek NotificationLog: jika sudah ada log `BOOKING_EXPIRY_REMINDER` untuk stayId ini dalam 24 jam terakhir → skip (idempotency)
- Kirim pesan WhatsApp ke tenant: "Booking kamar [kode] Anda akan kadaluarsa dalam 24 jam. Segera lakukan pembayaran."
- Catat ke NotificationLog

**B. `runInvoiceDueReminder()`:**
- Cari invoice dengan status ISSUED atau PARTIAL yang `dueDate` antara:
  - H-3: `now()` + 2–4 hari
  - H-1: `now()` + 0–1 hari
- Idempotency: tidak spam tenant yang sama untuk invoice yang sama di hari yang sama
- Kirim pesan: "Tagihan [nomor invoice] senilai Rp [nominal] jatuh tempo pada [tanggal]. Segera lakukan pembayaran."
- Catat ke NotificationLog

**C. `runCheckoutReminder()`:**
- Cari stay ACTIVE dengan `plannedCheckOutDate` dalam:
  - H-10, H-7, H-3 dari sekarang
- Idempotency: cek log per kombinasi (stayId + hari reminder)
- Kirim pesan: "Masa sewa kamar [kode] Anda akan berakhir pada [tanggal]. Jika ingin memperpanjang, segera hubungi pengelola."
- Catat ke NotificationLog

---

### 4.4 Backend — ACT 4.3.C: Scheduler + Endpoint Internal

**Sesi:** 1 sesi Cline  
**File yang dibuat/diubah:**
- `src/modules/notifications/reminder.controller.ts`
- Konfigurasi `@nestjs/schedule` di `app.module.ts`

**Endpoint internal (untuk dev/manual trigger):**
```
POST /internal/reminders/booking-expiry    → runBookingExpiryReminder
POST /internal/reminders/invoice-due       → runInvoiceDueReminder
POST /internal/reminders/checkout          → runCheckoutReminder
```

Guard endpoint internal: IP whitelist atau secret header, bukan JWT publik.

**Scheduler (jika @nestjs/schedule tersedia):**
```typescript
@Cron('0 9 * * *') // jam 9 pagi setiap hari
async handleDailyReminders() {
  await this.reminderService.runBookingExpiryReminder();
  await this.reminderService.runInvoiceDueReminder();
  await this.reminderService.runCheckoutReminder();
}
```

**Aturan scheduler:**
- Kegagalan satu reminder tidak menghentikan reminder berikutnya (try-catch per method)
- Kegagalan gateway tidak melempar exception ke luar (sudah ditangani di adapter)
- Log semua reminder yang gagal untuk troubleshooting

---

### 4.5 Frontend — ACT 4.3.D: Badge Reminder di Portal Tenant

**Sesi:** 1 sesi Cline  
**File yang diubah:**
- `src/pages/portal/MyBookingsPage.tsx`
- `src/pages/portal/MyInvoicesPage.tsx`
- `src/pages/portal/MyStayPage.tsx`

**Badge yang harus ditambahkan:**
- `MyBookingsPage`: badge "Booking hampir kadaluarsa" jika `expiresAt` < 24 jam dari sekarang
- `MyInvoicesPage`: badge "Jatuh Tempo Besok" / "Jatuh Tempo H-3" pada invoice ISSUED/PARTIAL
- `MyStayPage`: badge "Checkout Mendekat" jika `plannedCheckOutDate` < 10 hari dari sekarang

Badge ini bersifat **computed dari data yang sudah ada** — tidak perlu endpoint baru. Ini konsisten dengan prinsip reminder ringan frontend-only yang sudah ada.

---

### 4.6 UAT Fase 4.3

**Skenario reminder booking:**
1. Buat booking dengan `expiresAt` mendekati sekarang (atur manual di dev)
2. Panggil `POST /internal/reminders/booking-expiry`
3. Pesan WhatsApp terkirim ke nomor tenant
4. Panggil sekali lagi → tidak ada pesan duplikat (idempotency)

**Skenario reminder invoice:**
1. Buat invoice dengan dueDate H-3 dari sekarang
2. Panggil `POST /internal/reminders/invoice-due`
3. Pesan terkirim
4. Panggil esok hari → tidak duplikat untuk invoice yang sama

**Skenario gateway gagal:**
1. Set env API key WhatsApp ke nilai salah
2. Panggil endpoint reminder
3. Log error tercatat, tidak ada exception yang melempar ke luar
4. Flow bisnis utama tidak terdampak

**Acceptance criteria fase 4.3 dianggap lolos jika:**
- [ ] Pesan terkirim ke nomor yang benar
- [ ] Idempotency bekerja (tidak spam)
- [ ] Gateway failure tidak menjatuhkan aplikasi
- [ ] Badge reminder muncul di portal tenant tanpa endpoint baru

---

## BAGIAN 5 — ACT FASE 4.4: MARKETING DISPLAY & REGISTRASI FLEKSIBEL

**Prasyarat:** UAT Fase 4.3 cukup stabil (atau bisa diparalelkan parsial dengan 4.3 jika gateway belum siap)  
**Durasi estimasi:** 3–4 sesi Cline  
**Scope:** Tiga sub-area yang relatif independen — bisa dikerjakan terpisah

---

### 5.1 Sub-Area A: Galeri Kamar & Public Detail

#### 5.1.1 Backend — ACT 4.4.A: Room Gallery

**File yang diubah:**
- `prisma/schema.prisma` — tambah field `images String[]` pada model `Room`
- `src/modules/rooms/dto/update-room.dto.ts` — tambah field `images`
- `src/modules/rooms/rooms.service.ts` — sertakan `images` dalam CRUD

**Catatan images:**
- Untuk MVP, `images` adalah array URL string (hosted di mana saja)
- Tidak perlu file upload server — tenant/admin mengisi URL dari storage eksternal (Google Drive, Cloudinary, dll)
- Urutan gambar ditentukan oleh urutan array

**Endpoint baru:**
```
GET /public/rooms/:id
```

**Response `GET /public/rooms/:id`:**
```json
{
  "id": "...",
  "code": "K-01",
  "name": "Kamar Lantai 1 — Type A",
  "floor": 1,
  "description": "Kamar bersih dengan AC dan kamar mandi dalam",
  "images": ["https://...", "https://..."],
  "pricingTerms": [...],
  "highlightedRateRupiah": 1200000,
  "highlightedPricingTerm": "MONTHLY",
  "availablePricingTerms": ["MONTHLY", "WEEKLY"],
  "isAvailable": true  // derived dari status AVAILABLE
}
```

#### 5.1.2 Frontend — ACT 4.4.B: Halaman Detail Kamar Publik

**File yang dibuat:**
- `src/pages/rooms/PublicRoomDetailPage.tsx`
- Route: `/rooms/:roomId/detail` (hanya public/tenant)

**Konten halaman:**
- Galeri gambar (carousel sederhana, atau stacked cards)
- Jika gambar kosong → placeholder yang jelas
- Info: kode/nama kamar, lantai, deskripsi
- Tarif per term (tabel atau card per term)
- Status ketersediaan: Tersedia / Sudah Dipesan
- CTA: **Pesan Sekarang** → `/booking/:roomId` (jika masih AVAILABLE)

**Integrasi ke katalog `/rooms`:**
- Card kamar di katalog mendapat link ke `/rooms/:roomId/detail`
- Tombol **Pesan Sekarang** tetap ada di card untuk shortcut cepat

#### 5.1.3 Backoffice — ACT 4.4.C: Input Images di Room Form

**File yang diubah:**
- Form edit room di backoffice — tambah field input images (URL per baris atau tag-input)
- Tampilkan preview thumbnail jika URL valid

---

### 5.2 Sub-Area B: Registrasi Fleksibel

#### 5.2.1 Backend — ACT 4.4.D: Register Endpoint Fleksibel

**File yang dibuat/diubah:**
- `src/modules/auth/dto/register-flex.dto.ts`
- `src/modules/auth/auth.service.ts` — tambah method `registerFlex`
- `src/modules/auth/auth.controller.ts` — tambah route `POST /auth/register`

**DTO registerFlex:**
```typescript
export class RegisterFlexDto {
  @IsString() @IsNotEmpty()
  name: string;

  @IsEmail() @IsOptional()
  email?: string;

  // nomor HP format Indonesia, minimal 10 digit
  @IsString() @IsOptional()
  @Matches(/^(\+62|62|0)[0-9]{8,13}$/)
  phone?: string;

  @IsString() @MinLength(8)
  password: string;
}
```

**Validasi bisnis:**
- Minimal satu dari `email` atau `phone` wajib ada
- Jika `email` diisi → uniqueness check
- Jika `phone` diisi → normalisasi ke format `628xx...` → uniqueness check
- Role hasil register: selalu `TENANT` (tidak bisa register sebagai OWNER/ADMIN)
- Tidak otomatis membuat `Tenant` record — calon tenant perlu diverifikasi dulu oleh admin

**Error messages:**
- "Email atau nomor HP wajib diisi"
- "Email sudah terdaftar"
- "Nomor HP sudah terdaftar"
- "Format nomor HP tidak valid"

#### 5.2.2 Frontend — ACT 4.4.E: Halaman Registrasi

**File yang dibuat:**
- `src/pages/auth/RegisterPage.tsx`
- Route: `/register`

**Form register:**
- Nama (wajib)
- Email (opsional) atau Nomor HP (opsional) — salah satu wajib
- Helper text: "Masukkan email atau nomor HP Anda. Minimal salah satu wajib diisi."
- Password (wajib, min 8 karakter)
- Konfirmasi password
- Submit → `POST /auth/register`
- Setelah sukses → redirect ke `/login` dengan notifikasi "Akun berhasil dibuat. Silakan login."

**Tambahan di login page:**
- Link "Belum punya akun? Daftar di sini" → `/register`

---

### 5.3 Sub-Area C: Soft Delete Akun Tenant

#### 5.3.1 Backend — ACT 4.4.F: Deactivate Endpoint

**File yang dibuat/diubah:**
- `src/modules/portal/profile.controller.ts` — tambah route
- `src/modules/portal/profile.service.ts` — tambah method `deactivateOwnAccount`

**Endpoint:**
```
POST /portal/profile/deactivate
```

**Guard:** Role TENANT + user harus punya akun aktif

**Logic:**
1. Ambil `userId` dari JWT
2. Cek: tidak ada stay ACTIVE milik tenant ini (jika ada, tolak dengan pesan jelas)
3. Update `User.isActive = false`
4. Update `Tenant.isActive = false` (jika tenant record ada)
5. Invalidate session (bisa dengan menandai `passwordChangedAt = now()` agar token lama tidak valid)
6. Audit log
7. Return `{ success: true, message: "Akun Anda telah dinonaktifkan" }`

**Catatan:** Histori stay, invoice, tiket tetap utuh di DB.

#### 5.3.2 Frontend — ACT 4.4.G: Opsi Hapus Akun di Profil

**File yang diubah:**
- `src/pages/portal/ProfilePage.tsx`

**Tambahan di halaman profil:**
- Section "Zona Bahaya" di bagian bawah
- Tombol **Nonaktifkan Akun Saya** (warna merah, tidak mencolok di atas)
- Modal konfirmasi dua langkah:
  - Step 1: "Apakah Anda yakin? Akun yang dinonaktifkan tidak dapat digunakan untuk login. Data hunian dan riwayat pembayaran tetap tersimpan."
  - Step 2: Ketik "NONAKTIFKAN" untuk konfirmasi
- Setelah sukses → logout otomatis → redirect ke halaman publik

---

### 5.4 UAT Fase 4.4

**Skenario galeri:**
1. Admin menambahkan URL gambar di form edit room
2. Katalog publik `/rooms` menampilkan thumbnail pertama
3. Halaman detail kamar `/rooms/:id/detail` menampilkan semua gambar

**Skenario registrasi fleksibel:**
1. Register dengan hanya email → berhasil
2. Register dengan hanya HP → berhasil
3. Register tanpa keduanya → error yang jelas
4. Register dengan email yang sudah ada → error yang jelas
5. Login dengan akun baru → berhasil masuk sebagai TENANT

**Skenario soft delete:**
1. Tenant yang tidak punya stay aktif → bisa nonaktifkan akun
2. Tenant yang punya stay aktif → ditolak dengan pesan jelas
3. Setelah nonaktif → login gagal dengan pesan "Akun ini tidak aktif"
4. Data histori stay dan invoice tetap ada di DB

**Acceptance criteria fase 4.4 dianggap lolos jika:**
- [ ] Galeri muncul di halaman detail publik
- [ ] Register fleksibel berjalan tanpa mematahkan auth existing
- [ ] Soft delete tidak menghapus histori
- [ ] Tenant aktif tidak bisa hapus akun jika masih ada stay aktif

---

## BAGIAN 6 — ACT FASE 4.5: TENANT SELF-SERVICE LANJUTAN

**Prasyarat:** UAT Fase 4.4 lolos  
**Durasi estimasi:** 3–4 sesi Cline  
**Dua sub-area utama:** Renew request tenant + Forgot/reset password

---

### 6.1 Sub-Area A: Pengajuan Perpanjangan Stay oleh Tenant

#### 6.1.1 Backend — ACT 4.5.A: Schema + Endpoint Renew Request

**Tambahan ke schema.prisma:**
```prisma
enum StayRenewRequestStatus {
  PENDING
  APPROVED
  REJECTED
}

model StayRenewRequest {
  id                    String   @id @default(cuid())
  stayId                String
  tenantId              String
  requestedPricingTerm  String   // enum PricingTerm
  requestedNewEndDate   DateTime?
  notes                 String?
  status                StayRenewRequestStatus @default(PENDING)
  reviewedById          String?
  reviewedAt            DateTime?
  reviewNotes           String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  stay                  Stay     @relation(...)
  reviewedBy            User?    @relation(...)

  @@index([stayId])
  @@index([status])
}
```

**Endpoints:**
```
POST /tenant/stays/renew           → tenant ajukan request
GET  /tenant/stays/renew/my-requests → tenant lihat request miliknya
GET  /admin/stay-renew-requests    → admin lihat semua request pending
POST /admin/stay-renew-requests/:id/approve → admin approve
POST /admin/stay-renew-requests/:id/reject  → admin reject
```

**Logic `POST /tenant/stays/renew`:**
1. Ambil tenantId dari JWT
2. Validasi stay milik tenant dan berstatus ACTIVE
3. Pastikan tidak ada request PENDING lain untuk stay yang sama
4. Buat `StayRenewRequest` dengan status PENDING
5. Return request yang dibuat

**Logic `POST /admin/stay-renew-requests/:id/approve`:**
1. Fetch request → validasi status PENDING
2. Jalankan `renewStay` existing logic (extend stay + buat invoice renewal DRAFT)
3. Update request → APPROVED
4. Audit log
5. Return

**Logic `POST /admin/stay-renew-requests/:id/reject`:**
1. Fetch request → validasi status PENDING
2. Update request → REJECTED + simpan reviewNotes
3. Audit log

#### 6.1.2 Frontend — ACT 4.5.B: Portal Tenant Renew Request

**File yang dibuat/diubah:**
- `src/pages/portal/MyStayPage.tsx` — tambah tombol Perpanjang Stay
- `src/components/portal/RenewRequestModal.tsx` — baru

**RenewRequestModal — field:**
- `requestedPricingTerm`: select dari pilihan yang tersedia
- `requestedNewEndDate`: date picker, opsional
- `notes`: textarea, opsional
- Submit → `POST /tenant/stays/renew`
- Setelah sukses: tampilkan "Pengajuan perpanjangan berhasil dikirim. Menunggu persetujuan pengelola."

**Halaman status request:**
- Tambah section di `MyStayPage` atau tab terpisah
- Menampilkan request terbaru: status (Menunggu / Disetujui / Ditolak), tanggal, alasan penolakan jika ada

**Backoffice:**
- Tambah badge notifikasi di menu Stays atau halaman tersendiri untuk admin melihat request pending
- Modal approve/reject sederhana

---

### 6.2 Sub-Area B: Forgot Password & Reset Password Self-Service

#### 6.2.1 Backend — ACT 4.5.C: Forgot Password

**Tambahan ke schema (jika pakai token DB):**
```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String   @unique
  token     String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  user      User     @relation(...)
}
```

**Endpoint:**
```
POST /auth/forgot-password
```

**Payload:** `{ "identifier": "email atau nomor HP" }`

**Logic:**
1. Cari user berdasarkan email atau HP
2. **Response selalu sama terlepas dari hasil pencarian:** `{ message: "Jika akun ditemukan, instruksi reset password telah dikirim." }` — ini mencegah account enumeration
3. Jika user ditemukan dan aktif:
   - Generate token acak (32 byte hex)
   - Simpan ke `PasswordResetToken` dengan `expiresAt = now() + 1 jam`
   - Kirim via WhatsApp / email sesuai kanal: "Kode reset password Anda: [TOKEN]. Berlaku 1 jam."
4. Jika user tidak ditemukan → tidak ada aksi, response sama

**Catatan keamanan:**
- Token harus one-time (tandai `usedAt` saat dipakai)
- Jangan kirimkan link langsung dengan token di query param — kirimkan kode saja, user ketik di form
- Atau jika pakai link: pastikan HTTPS dan token expire

#### 6.2.2 Backend — ACT 4.5.D: Reset Password

**Endpoint:**
```
POST /auth/reset-password
```

**Payload:** `{ "token": "...", "newPassword": "..." }`

**Logic:**
1. Cari `PasswordResetToken` berdasarkan token
2. Validasi: token ada, `expiresAt` belum lewat, `usedAt` null
3. Validasi `newPassword`: minimal 8 karakter
4. Update `User.passwordHash` dengan hash baru
5. Update `User.passwordChangedAt = now()` (invalidate token JWT lama)
6. Tandai `PasswordResetToken.usedAt = now()`
7. Return `{ message: "Password berhasil diperbarui. Silakan login dengan password baru Anda." }`

#### 6.2.3 Frontend — ACT 4.5.E: Halaman Forgot & Reset Password

**File yang dibuat:**
- `src/pages/auth/ForgotPasswordPage.tsx`
- `src/pages/auth/ResetPasswordPage.tsx`
- Routes: `/forgot-password`, `/reset-password`

**ForgotPasswordPage:**
- Input: email atau nomor HP
- Submit → `POST /auth/forgot-password`
- Setelah submit: tampilkan pesan sama terlepas hasil → "Jika akun ditemukan, instruksi reset password telah dikirim."
- Link kembali ke login

**ResetPasswordPage:**
- Input: token (user ketik atau dari link)
- Input: password baru
- Input: konfirmasi password baru
- Submit → `POST /auth/reset-password`
- Setelah sukses: redirect ke login dengan pesan sukses

**Tambahan di login page:**
- Link "Lupa password?" → `/forgot-password`

---

### 6.3 UAT Fase 4.5

**Skenario renew request:**
1. Tenant buka Hunian Saya → klik Perpanjang Stay → isi form → submit
2. Status "Menunggu Persetujuan" muncul di portal
3. Admin melihat request di backoffice → approve
4. Stay diperpanjang, invoice renewal DRAFT terbuat
5. Tenant melihat status "Disetujui"

**Skenario renew reject:**
1. Admin reject dengan alasan
2. Tenant melihat status "Ditolak" + alasan

**Skenario forgot password:**
1. User ketuk "Lupa password?" → masukkan email/HP
2. Pesan WhatsApp/email masuk dengan token
3. User buka `/reset-password` → masukkan token + password baru
4. Login dengan password baru → berhasil
5. Login dengan password lama → gagal

**Skenario token expired:**
1. Tunggu token expire (atau set expiresAt di masa lalu di dev)
2. Coba reset dengan token expired → error yang jelas

**Skenario account enumeration:**
1. Submit forgot password dengan email yang tidak ada
2. Response harus sama dengan email yang ada → tidak bocorkan eksistensi akun

**Acceptance criteria fase 4.5 dianggap lolos jika:**
- [ ] Renew request end-to-end berjalan
- [ ] Admin tetap punya kontrol persetujuan — tidak ada renewal otomatis
- [ ] Forgot/reset password aman dari account enumeration
- [ ] Token one-time use bekerja
- [ ] Password lama tidak valid setelah reset

---

## BAGIAN 7 — FITUR TAMBAHAN YANG DIREKOMENDASIKAN

Fitur-fitur berikut tidak ada di roadmap resmi V4, tetapi memiliki nilai operasional tinggi dan relatif kecil scope-nya. Bisa dikerjakan secara paralel di sela fase utama atau sebagai "polishing pass" sebelum V4 dinyatakan selesai.

---

### 7.1 Invoice PDF / Kwitansi Download

**Nilai:** Sangat tinggi. Tenant sering butuh kwitansi untuk reimburse kantor atau laporan keuangan pribadi.

**Scope:**
- Backend: endpoint `GET /invoices/:id/pdf`
  - Generate PDF dari data invoice + line items + payment history
  - Tidak perlu template mewah — tabel sederhana cukup untuk MVP
  - Library: `pdfmake` atau `puppeteer` (jika tersedia di environment)
- Frontend: tombol **Download Kwitansi** di detail invoice (untuk tenant portal dan backoffice)

**Catatan:** Ini tidak memerlukan fase baru — bisa diselipkan di antara 4.2 dan 4.3.

---

### 7.2 Owner Finance Report Ringkas

**Nilai:** Tinggi untuk operasional. Owner saat ini hanya punya dashboard KPI kasar.

**Scope:**
- Backend: endpoint `GET /reports/finance-summary?month=YYYY-MM`
  - Total invoice terbit bulan ini
  - Total terkumpul (paid)
  - Total overdue
  - Total pengeluaran (dari Expenses)
  - Net operasional kasar
- Frontend: halaman Reports (hanya OWNER) dengan filter bulan

**Catatan:** Ini tidak memerlukan akuntansi formal — hanya aggregate query sederhana.

---

### 7.3 Room Condition Report saat Checkout

**Nilai:** Tinggi untuk proteksi deposit. Saat ini tidak ada dokumentasi kondisi kamar saat tenant keluar.

**Scope:**
- Backend: endpoint `POST /stays/:id/checkout-condition-report`
  - Field: daftar checklist (kebersihan, kerusakan, kelengkapan), catatan, foto URL
  - Tersimpan sebagai record baru terkait stay
- Frontend: tambah step di modal checkout — sebelum submit checkout, staff mengisi checklist kondisi kamar
- Portal tenant: bisa melihat laporan kondisi kamar sebagai referensi keputusan deposit

---

### 7.4 Blacklist / Flag Tenant Bermasalah

**Nilai:** Menengah. Relevan untuk operator yang pernah mengalami masalah dengan tenant.

**Scope:**
- Tambah field `riskFlag` atau `notes` pada `Tenant` yang visible hanya untuk OWNER/ADMIN
- Badge "Perhatian" di detail tenant jika flag aktif
- Tidak ada automation — hanya informasi manual

---

## BAGIAN 8 — V4 DEFINITION OF DONE

V4 dinyatakan **selesai** jika seluruh kriteria berikut terpenuhi:

### 8.1 Fungsionalitas

| Item | Kriteria |
|------|---------|
| Booking mandiri | Tenant bisa booking kamar dari katalog publik |
| Approval admin | Admin bisa approve/reject booking dengan data kontrak |
| Pembayaran mandiri | Tenant bisa submit bukti bayar, admin bisa approve/reject |
| Aktivasi kamar | Room berubah OCCUPIED setelah combined payment melunasi sewa dan deposit |
| Expiry booking | Booking expired otomatis release kamar |
| Reminder WhatsApp | Booking expiry, invoice due, checkout terkirim |
| Reminder idempotent | Tidak ada spam reminder untuk event yang sama |
| Room gallery | Gambar kamar muncul di katalog publik dan detail |
| Register fleksibel | Bisa register dengan email atau HP |
| Soft delete | Tenant bisa nonaktifkan akun sendiri |
| Renew request | Tenant bisa ajukan perpanjangan, admin approve/reject |
| Forgot password | Token OTP terkirim via WhatsApp/email |
| Reset password | Token one-time, expired, invalidate token lama |

### 8.2 Kualitas & Keamanan

| Item | Kriteria |
|------|---------|
| Role isolation | Tenant tidak bisa akses data tenant lain |
| Overpay prevention | Backend dan frontend sama-sama tolak overpay |
| Idempotency | Approve submission tidak bisa double |
| Account enumeration | Forgot password tidak bocorkan eksistensi akun |
| Audit trail | Semua aksi kritis tercatat di audit log |
| Error messages | Bahasa Indonesia, operasional-friendly, tidak expose internal |

### 8.3 Teknis

| Item | Kriteria |
|------|---------|
| Build backend | `npm run build` sukses tanpa error |
| Build frontend | `npm run build` sukses tanpa error |
| Prisma migrate | Migration dev bersih, tidak ada drift |
| UAT end-to-end | Semua Gate dan UAT per fase dinyatakan lolos |
| Regression | Baseline existing (check-in, checkout, deposit, invoice) tidak rusak |

---

## BAGIAN 9 — PANDUAN SESI CLINE

### 9.1 Template Prompt untuk Setiap ACT

Gunakan template ini sebagai pembuka setiap sesi Cline:

```
Konteks: KOST48 V3 — [nama ACT, contoh: ACT 4.2.C — Service Tenant Submit]
Stack: NestJS + Prisma + PostgreSQL (backend), React + Vite + TypeScript + React-Bootstrap + TanStack Query (frontend)
Constraint: Maksimal 3 file per sesi. Tidak membuka scope di luar ACT ini.

Dokumen acuan: 05_V4_MASTER_PLAN.md, 01_CONTRACTS.md

Yang harus dikerjakan:
[salin isi ACT yang relevan dari dokumen ini]

Selesaikan dengan:
1. Buat/edit file sesuai scope
2. Pastikan `npm run build` tetap sukses
3. Berikan summary file yang diubah beserta hal yang perlu diverifikasi
```

### 9.2 Checklist Akhir Sesi

Setelah setiap sesi Cline selesai, verifikasi:
- [ ] `npm run build` sukses (backend dan/atau frontend sesuai sesi)
- [ ] File yang diubah tidak lebih dari 3
- [ ] Scope tidak melebar ke area di luar ACT
- [ ] Tidak ada `console.log` debug yang tertinggal di production path
- [ ] Error messages Bahasa Indonesia

### 9.3 Urutan Sesi yang Disarankan

| No | Sesi | ACT | File Utama |
|----|------|-----|-----------|
| 1 | Gate 1 UAT | Verifikasi manual | — |
| 2 | Gate 2 UAT | Verifikasi manual | — |
| 3 | BE | 4.2.A Schema | schema.prisma, app.enums.ts |
| 4 | BE | 4.2.B Module + DTO | 3 file DTO + module |
| 5 | BE | 4.2.C Service Tenant Submit | service (bagian tenant) |
| 6 | BE | 4.2.D Service Admin Approve | service (bagian admin) — kritis |
| 7 | BE | 4.2.E Controller + Expiry Job | controller + expiry service |
| 8 | FE | 4.2.F API Client + Types | api/paymentSubmissions.ts, types/index.ts |
| 9 | FE | 4.2.G Tenant Submit Modal | MyBookingsPage + SubmitPaymentModal |
| 10 | FE | 4.2.H Admin Review Queue | PaymentReviewPage + ReviewPaymentModal |
| 11 | UAT | 4.2 UAT manual | — |
| 12 | BE | 4.3.A WhatsApp Adapter | whatsapp.adapter.ts + notifications.module.ts |
| 13 | BE | 4.3.B Reminder Service | reminder.service.ts |
| 14 | BE | 4.3.C Scheduler + Endpoint | reminder.controller.ts + scheduler setup |
| 15 | FE | 4.3.D Badge Portal | MyBookingsPage + MyInvoicesPage + MyStayPage |
| 16 | UAT | 4.3 UAT manual | — |
| 17 | BE | 4.4.A Room Gallery + Public Detail | schema.prisma + rooms.service.ts + controller |
| 18 | FE | 4.4.B Public Room Detail Page | PublicRoomDetailPage.tsx |
| 19 | BE | 4.4.D Register Fleksibel | register-flex.dto.ts + auth.service.ts |
| 20 | FE | 4.4.E Halaman Register | RegisterPage.tsx |
| 21 | BE | 4.4.F Soft Delete | profile.service.ts + controller |
| 22 | FE | 4.4.G Hapus Akun | ProfilePage.tsx |
| 23 | UAT | 4.4 UAT manual | — |
| 24 | BE | 4.5.A Schema + Renew Request | schema.prisma + renew endpoints |
| 25 | FE | 4.5.B Portal Renew Request | MyStayPage + RenewRequestModal |
| 26 | BE | 4.5.C Forgot Password | forgot-password endpoint + PasswordResetToken |
| 27 | BE | 4.5.D Reset Password | reset-password endpoint |
| 28 | FE | 4.5.E Forgot + Reset Pages | ForgotPasswordPage + ResetPasswordPage |
| 29 | UAT | 4.5 UAT manual | — |
| 30 | Final | V4 Regression Pass | — |

**Total estimasi sesi coding:** 26 sesi Cline (tidak termasuk UAT manual)  
**Estimasi kalender:** 6–10 minggu tergantung intensitas pengerjaan

---

## BAGIAN 10 — RISK REGISTER & MITIGASI

| # | Risiko | Level | Mitigasi |
|---|--------|-------|---------|
| R1 | Prisma generate gagal di container saat ACT 4.2.A | Tinggi | Jalankan `npx prisma generate` dan `npx prisma db push` di mesin lokal setelah download ZIP |
| R2 | Race condition saat approve payment submission | Tinggi | Wajib `prisma.$transaction()` + guard status dalam transaksi |
| R3 | WhatsApp gateway tidak tersedia atau rate limited | Menengah | Adapter fail-safe, log error, tidak melempar ke flow utama |
| R4 | Token forgot password bocor via log | Menengah | Jangan log token di console production, hanya log request ID |
| R5 | Registrasi fleksibel mematahkan auth existing | Menengah | Test regression login existing setelah deploy 4.4.D |
| R6 | Expiry job membatalkan booking yang sedang diproses admin | Tinggi | Expiry job harus cek apakah ada submission APPROVED dalam 1 menit terakhir sebelum expire |
| R7 | Double invoice DRAFT dari approval yang dipanggil dua kali | Tinggi | Guard di dalam transaksi — cek dulu apakah invoice DRAFT untuk stay ini sudah ada |
| R8 | Soft delete memutus relasi yang masih aktif | Menengah | Guard: tidak bisa deactivate jika ada stay ACTIVE |
| R9 | Reminder spam akibat scheduler error / timezone | Menengah | Idempotency per (eventType + entityId + tanggal) + pastikan timezone server = WIB |
| R10 | Route `/rooms` resolver salah redirect | Menengah | Pastikan resolver dicek dengan semua kombinasi role + guest di UAT 4.0 |

---

## PENUTUP

Dokumen ini adalah **satu-satunya acuan eksekusi** dari sesi saat ini hingga V4 selesai. Setiap ACT yang dikerjakan harus merujuk ke sini sebelum membuka file apapun.

**Prinsip yang tidak boleh dilupakan:**
1. UAT adalah gate — bukan formalitas
2. Build must pass — bukan hanya "kira-kira jalan"
3. Scope harus kecil — 1 ACT = 1 sesi Cline = maks 3 file
4. Kode nyata menang atas rencana yang belum dieksekusi
5. Tenant tidak boleh melihat ID teknis mentah apapun di portal
6. Admin tetap memegang approval akhir untuk semua aksi kritis

**Akhir dokumen — 2026-04-23**


---

## ADDENDUM — 2026-04-23 (Kejujuran Status Pasca UAT Parsial + Refactor)

### 1. Status nyata yang perlu dicatat
- UAT parsial sudah mulai berjalan dan memberikan sinyal positif pada:
  - katalog publik `/rooms`
  - route `/rooms` untuk ADMIN
  - create booking tenant
- Namun gate tetap **belum lulus penuh** karena masih ada temuan integrasi yang harus ditutup sampai tuntas

### 2. Temuan penting pasca UAT parsial
- `check-in` / `expiresAt` sempat tampil `-` pada surface
- approval booking sempat terasa gagal karena expiry terlalu agresif / data tanggal tidak jujur
- modal approval/review frontend sempat tidak close setelah aksi sukses
- prototype approval payment sempat menabrak constraint invoice terkait `issuedAt`

### 3. Implikasi terhadap roadmap
- Temuan di atas memperkuat alasan kenapa Gate 1 dan Gate 2 tidak boleh dilompati
- Eksperimen/prototype 4.2 yang sempat masuk source untuk debugging **tidak mengubah** urutan kerja resmi pada dokumen ini
- 4.2 baru boleh dianggap dibuka resmi setelah stabilitas 4.0 dan 4.1 cukup aman secara UAT

### 4. Catatan refactor
- Backend dan frontend telah mulai direfactor agar file source manual besar lebih rapi dan lebih mudah dipatch
- Refactor bukan milestone bisnis baru; refactor hanya memperbaiki maintainability selama V4 diselesaikan


# KOST48 V4 — Pricing Engine Plan (Smart Pricing System)

**Versi:** 2026-04-23
**Status:** Draft Perencanaan (BELUM DIIMPLEMENT)
**Scope:** Evolusi sistem pricing dari manual → otomatis berbasis atribut kamar

---

## BAGIAN 0 — TUJUAN & PRINSIP

### 0.1 Tujuan Utama

Mengubah sistem dari:

* ❌ Harga manual statis per kamar
  menjadi:
* ✅ Harga dinamis berbasis atribut nyata kamar

---

### 0.2 Prinsip Sistem

1. Harga harus **dapat dijelaskan secara logis ke tenant**
2. Harga harus **konsisten antar kamar**
3. Sistem harus **fleksibel (manual override tetap ada)**
4. Harga harus **terkunci saat booking dibuat**
5. Tidak boleh mematahkan flow booking, approval, dan payment

---

### 0.3 Status Saat Ini

Saat ini model `Room`:

* Menyimpan harga langsung (`monthlyRateRupiah`, dll)
* Tidak memiliki atribut yang menjelaskan perbedaan harga

Implikasi:

* Harga tidak transparan
* Filter tidak meaningful
* Sulit scaling

---

## BAGIAN 1 — ROOM ATTRIBUTES FOUNDATION

### 1.1 Tujuan

Menambahkan atribut yang menjadi dasar perhitungan harga.

---

### 1.2 Tambahan Field pada Model Room

```prisma
model Room {
  ...

  // Ukuran
  roomSizeM2          Float?
  bathroomSizeM2      Float?

  // Fasilitas
  hasAC               Boolean @default(false)
  hasPrivateBathroom  Boolean @default(false)
  hasWindow           Boolean @default(true)

  // Furnitur
  furnitureLevel      String? // BASIC | STANDARD | FULL

  // Posisi
  position            String? // DEPAN | TENGAH | BELAKANG

  // Tipe kamar
  roomType            String? // STANDARD | LARGE | DELUXE

  ...
}
```

---

### 1.3 Tujuan Field

| Field              | Fungsi                  |
| ------------------ | ----------------------- |
| roomSizeM2         | menentukan harga dasar  |
| bathroomSizeM2     | premium tambahan        |
| hasAC              | faktor harga signifikan |
| hasPrivateBathroom | faktor kenyamanan       |
| furnitureLevel     | diferensiasi kelas      |
| position           | penyesuaian lokasi      |
| roomType           | segmentasi produk       |

---

## BAGIAN 2 — PRICING RULE ENGINE

### 2.1 Tujuan

Menghasilkan harga otomatis berdasarkan atribut kamar.

---

### 2.2 Formula Dasar

```ts
price =
  baseRatePerM2 * roomSizeM2 +
  bathroomRatePerM2 * bathroomSizeM2 +
  acPremium +
  furniturePremium +
  positionAdjustment
```

---

### 2.3 Contoh Konfigurasi

```ts
const pricingConfig = {
  baseRatePerM2: 20000,
  bathroomRatePerM2: 15000,

  acPremium: 300000,

  furniturePremium: {
    BASIC: 0,
    STANDARD: 200000,
    FULL: 500000
  },

  positionAdjustment: {
    DEPAN: 100000,
    TENGAH: 50000,
    BELAKANG: 0
  }
}
```

---

### 2.4 Catatan Penting

* Config harus bisa diubah tanpa deploy ulang (future)
* Harus ada fallback jika data tidak lengkap
* Semua kalkulasi harus bisa di-log untuk debugging

---

## BAGIAN 3 — TERM PRICING STRATEGY

### 3.1 Tujuan

Menentukan harga harian, mingguan, bulanan secara fleksibel.

---

### 3.2 Formula

```ts
monthly = basePrice
weekly  = monthly / 4 * 1.1
daily   = monthly / 30 * 1.25
```

---

### 3.3 Penjelasan

| Term     | Strategi              |
| -------- | --------------------- |
| Bulanan  | harga utama           |
| Mingguan | sedikit lebih mahal   |
| Harian   | paling mahal per unit |

---

## BAGIAN 4 — HYBRID PRICING SYSTEM

### 4.1 Tujuan

Menjaga fleksibilitas admin.

---

### 4.2 Logic

```ts
if (manualPrice exists) {
  use manualPrice
} else {
  use calculatedPrice
}
```

---

### 4.3 Kapan Digunakan

| Kondisi   | Sistem          |
| --------- | --------------- |
| Normal    | Auto pricing    |
| Promo     | Manual override |
| Exception | Manual override |

---

## BAGIAN 5 — PRICE LOCKING (KRITIS)

### 5.1 Tujuan

Mencegah perubahan harga setelah booking.

---

### 5.2 Implementasi

Saat booking dibuat:

```ts
Stay.agreedRentAmountRupiah = calculatedPrice
```

---

### 5.3 Dampak

* Harga tenant tidak berubah
* Aman dari perubahan config
* Audit tetap valid

---

## BAGIAN 6 — RISK & MITIGASI

| Risiko                       | Dampak            | Solusi            |
| ---------------------------- | ----------------- | ----------------- |
| Harga berubah terlalu sering | tenant bingung    | lock saat booking |
| Formula salah                | semua harga salah | logging + audit   |
| Admin kehilangan kontrol     | tidak fleksibel   | hybrid system     |
| Data atribut tidak lengkap   | kalkulasi salah   | fallback logic    |

---

## BAGIAN 7 — URUTAN IMPLEMENTASI (WAJIB)

### ⚠️ KRITIS

**TIDAK BOLEH dilakukan sebelum:**

* Gate 1 (UAT 4.0) selesai
* Gate 2 (UAT 4.1) selesai

---

### Urutan yang benar:

```
1. Selesaikan UAT 4.0
2. Selesaikan UAT 4.1
3. Tambah Room Attributes
4. Tambah Pricing Engine (read-only dulu)
5. Integrasi ke booking
6. Tambah manual override
7. Full migration ke smart pricing
```

---

## BAGIAN 8 — INTEGRASI DENGAN SISTEM EXISTING

### 8.1 Tidak boleh mematahkan:

* Booking flow (4.0)
* Approval (4.1)
* Payment (4.2)
* Invoice generation

---

### 8.2 Prinsip Integrasi

* Pricing engine hanya **menghasilkan nilai**
* Sistem lain tetap membaca dari:

  * `Stay.agreedRentAmountRupiah`

---

## BAGIAN 9 — STATUS IMPLEMENTASI

| Komponen           | Status               |
| ------------------ | -------------------- |
| Room attributes    | ⬜ Belum              |
| Pricing formula    | ⬜ Belum              |
| Term pricing logic | ⬜ Belum              |
| Hybrid system      | ⬜ Belum              |
| Price locking      | ⬜ Sudah ada sebagian |
| Integration        | ⬜ Belum              |

---

## BAGIAN 10 — KESIMPULAN

Pricing Engine adalah:

* 🔥 Fitur advanced
* 🚀 Pembeda utama produk
* ⚠️ High risk jika dilakukan terlalu cepat

---

### Keputusan Final

* ✔️ Disetujui untuk roadmap
* ❌ Ditunda sampai UAT selesai
* ✅ Akan diimplementasikan bertahap

---

**Akhir dokumen — Pricing Engine Plan**

---

## ADDENDUM — 2026-04-24 (Sinkronisasi Pasca Deep Patch 4.2)

### 1. Pembacaan status 4.2 yang terbaru
Dokumen ini sekarang harus dibaca dengan nuansa berikut:
- 4.2 **tidak lagi nol mutlak**
- pada source/artifact kerja terbaru sudah ada patch lanjutan yang menyentuh:
  - combined booking payment submission
  - deposit payment tracking
  - activation sync yang lebih jujur
  - expiry cleanup yang lebih bersih
- namun 4.2 **tetap belum boleh dianggap resmi/live penuh** sampai:
  - sinkronisasi schema Prisma selesai di lokal
  - build lokal backend/frontend lolos
  - UAT 4.2 ditutup

### 2. Penyesuaian pemahaman terhadap urutan kerja
Urutan kerja tetap:
1. stabilkan dan verifikasi slice 4.0–4.1
2. sinkronkan patch 4.2 di lokal
3. tutup UAT 4.2
4. baru melangkah ke 4.3+

Dengan kata lain, addendum ini **tidak** melompati gate, tetapi mengakui bahwa pekerjaan source untuk 4.2 sudah bergerak lebih jauh daripada dokumen lama.

### 3. Catatan khusus soal invoice
Karena pagar integritas DB melarang perubahan detail invoice saat status bukan `DRAFT`, maka implementasi 4.2 harus selalu menghormati:
- invoice / detail dibentuk saat masih `DRAFT`
- baru kemudian status invoice bergerak sesuai event bisnis
- setiap shortcut yang menulis `InvoiceLine` ke invoice berstatus `ISSUED` dianggap tidak valid

### 4. Catatan khusus soal deposit
Deposit awal booking kini harus diperlakukan sebagai kewajiban yang dapat dilacak secara terpisah, tetapi:
- tidak membatalkan keputusan lama bahwa proses refund/forfeit deposit setelah checkout tetap hidup di flow existing
- yang berubah adalah **tracking pembayaran deposit awal untuk aktivasi booking**


## ADDENDUM — 2026-04-24 (Sinkronisasi Pasca Combined Payment 4.2)

### 1. Pembacaan status 4.2 yang terbaru
Dokumen ini sekarang harus dibaca dengan nuansa berikut:
- 4.2 **tidak lagi nol mutlak**
- pada source/artifact kerja terbaru sudah ada patch lanjutan yang menyentuh:
  - combined booking payment submission
  - deposit payment tracking
  - activation sync yang lebih jujur
  - expiry cleanup yang lebih bersih
- namun 4.2 **tetap belum boleh dianggap resmi/live penuh** sampai:
  - sinkronisasi schema Prisma selesai di lokal
  - build lokal backend/frontend lolos
  - UAT 4.2 ditutup

### 2. Penyesuaian pemahaman terhadap urutan kerja
Urutan kerja tetap:
1. stabilkan dan verifikasi slice 4.0–4.1
2. sinkronkan patch 4.2 di lokal
3. tutup UAT 4.2
4. baru melangkah ke 4.3+

### 3. Catatan khusus soal invoice
Karena pagar integritas DB melarang perubahan detail invoice saat status bukan `DRAFT`, maka implementasi 4.2 harus selalu menghormati:
- invoice / detail dibentuk saat masih `DRAFT`
- baru kemudian status invoice bergerak sesuai event bisnis
- setiap shortcut yang menulis `InvoiceLine` ke invoice berstatus `ISSUED` dianggap tidak valid

### 4. Catatan khusus soal deposit dan combined payment
Deposit awal booking diperlakukan sebagai kewajiban yang dilunasi melalui satu pembayaran awal gabungan bersama sewa, tetapi:
- tidak membatalkan keputusan lama bahwa proses refund/forfeit deposit setelah checkout tetap hidup di flow existing
- yang berubah adalah **tracking pembayaran deposit awal untuk aktivasi booking**
- tenant tidak perlu memilih target deposit/sewa; backend membagi pembayaran secara internal


---

## ADDENDUM — 2026-04-26 (Status UAT Terkini & Instruksi Tidak Mengulang UAT)

### 1. Status UAT yang sudah diterima
- **Gate 1 / UAT 4.0: PASS**
  - katalog publik aman,
  - fallback image aman,
  - booking tenant sukses,
  - booking reserved tidak tercampur stay occupied,
  - CheckInWizard tidak diblok oleh RESERVED booking.
- **Gate 2 / UAT 4.1: PASS**
  - admin approve booking sukses,
  - invoice awal terbentuk,
  - meter awal tersimpan,
  - tenant melihat `Menunggu Pembayaran`,
  - room tetap `RESERVED`.
- **UAT 4.2 happy path: PASS**
  - tenant submit bukti pembayaran awal,
  - admin approve,
  - `InvoicePayment` terbentuk,
  - invoice `PAID`,
  - room `RESERVED -> OCCUPIED`,
  - tenant melihat hunian aktif.

### 2. P0 aktif sebelum lanjut
Temuan P0: data tenant portal bisa stale lintas login. Tenant baru tanpa stay aktif sempat melihat data stay tenant sebelumnya walau `/stays/me/current` 404.

Patch wajib:
- clear TanStack Query cache saat logout/login,
- scope query key tenant portal berdasarkan user/tenant,
- 404 current stay harus menjadi empty state,
- no `keepPreviousData` untuk tenant-sensitive current stay,
- clear/namespace session storage message,
- guard tenant mismatch di MyStayPage.

### 3. Instruksi UAT
- Jangan ulang Gate 1, Gate 2, atau 4.2 happy path dari awal.
- Setelah patch P0, lakukan targeted retest cache isolation saja.
- Lalu lanjut sisa UAT 4.2: reject, wrong amount, expiry, double approve prevention.

---

## 2026-04-26 — Update Terbaru: UAT 4.2 CORE PASS + P1 Cleanup Sebelum 4.3

### Status resmi terbaru
- **Gate 1 / UAT 4.0: PASS** — tidak perlu diulang dari awal.
- **Gate 2 / UAT 4.1: PASS** — tidak perlu diulang dari awal.
- **P0 tenant portal cache isolation: CLOSED / PASS** setelah query cache dibersihkan saat login/logout, query tenant di-scope berdasarkan user/tenant, dan `/stays/me/current` 404 dirender sebagai empty state.
- **UAT 4.2 happy path: PASS** — tenant submit pembayaran awal, admin approve, `InvoicePayment` terbentuk, invoice `PAID`, room `RESERVED -> OCCUPIED`, tenant melihat hunian aktif.
- **UAT 4.2 reject path: PASS** — admin reject dengan alasan, tenant melihat alasan dan bisa upload ulang, room tetap `RESERVED`, invoice belum `PAID`.
- **UAT 4.2 wrong amount path: PASS** — backend menolak nominal tidak tepat dengan pesan operasional-friendly; tidak ada partial payment.
- **UAT 4.2 double approve prevention: PASS** — approval kedua ditolak dan tidak ada `InvoicePayment` ganda.
- **UAT 4.2 expiry core: PASS** — booking expired berubah `CANCELLED`, room kembali `AVAILABLE`, pending submission menjadi `EXPIRED` bila ada, dan invoice tidak mengaktifkan room.

### Pembacaan status 4.2
Fase 4.2 sekarang dibaca sebagai **CORE PASS / operationally accepted**, dengan catatan P1 cleanup sebelum membuka 4.3. Ini bukan berarti semua polish selesai, tetapi flow inti booking → approval → payment → activation → reject/wrong amount/double approve/expiry sudah terbukti.

### P1 cleanup sebelum 4.3
- **P1.1 Expiry invoice cleanup:** saat booking expired, invoice awal yang masih `DRAFT` / `ISSUED` dan belum `PAID` sebaiknya ikut `CANCELLED` agar tidak orphan.
- **P1.2 Label room RESERVED:** backoffice rooms harus menampilkan `Pemesan` / `Booking oleh`, bukan `Penghuni`, untuk kamar `RESERVED`.
- **P1.3 Pricing term honesty:** jangan tampilkan `Semester` / `Tahunan` di public room / booking form jika room tidak punya rate nyata untuk term tersebut; jangan fallback ke monthly.
- **P1.4 Production-safe error response:** stack trace boleh muncul di development, tetapi tidak boleh dikirim ke client di production.
- **P1.5 Phase 3A verification:** verifikasi code-level bahwa backoffice create stay tetap mewajibkan meter awal listrik/air dan membuat 2 `MeterReading` atomik.

### Urutan kerja berikutnya
1. Tunggu / selesaikan ACT Cline P1 cleanup kecil.
2. Retest targeted saja untuk item P1 yang disentuh.
3. Jika cleanup build dan targeted retest PASS, baru buka **Phase 4.3 — WhatsApp Reminder**.

### Instruksi penting
- Jangan ulang Gate 1, Gate 2, atau UAT 4.2 happy/reject/wrong/double/expiry dari awal kecuali patch baru menyentuh flow terkait secara langsung.
- Jangan buka Phase 4.3 sebelum P1 cleanup selesai dan build backend/frontend PASS.
