# KOST48 V3 — Master Plan V4 Completion
**Versi:** 2026-04-27 | **Scope:** Dari posisi sekarang hingga V4 selesai penuh  
**Bahasa:** Bahasa Indonesia (operasional)  
**Status dokumen:** Rencana kerja aktif — wajib dibaca setiap buka sesi V4

---

## BAGIAN 0 — POSISI TERKINI & PETA JALAN

### 0.1 Apa yang Sudah Selesai

| Fase | Nama | Status |
|------|------|--------|
| 0–3.5 | Fondasi, stabilisasi, role nav, portal access, ticket redesign, backend audit | ✅ Selesai |
| 4.0 | Booking mandiri + RESERVED — patch kode | ✅ Patch selesai |
| 4.1 | Admin approval + pelengkapan data — patch kode | ✅ Patch selesai |
| 4.2 | Pembayaran mandiri + aktivasi otomatis | ⚠️ Source patch lanjutan sudah tersedia di artifact kerja, tetapi verifikasi lokal/UAT belum tuntas |
| 4.3 | Notifikasi & reminder | 🟡 4.3-A/B/C selesai; 4.3-D Payment Urgency Chip next; real WhatsApp/scheduler/push deferred |
| 4.4 | Marketing display & registrasi fleksibel | ⬜ Belum dimulai |
| 4.5 | Tenant self-service lanjutan | ⬜ Belum dimulai |

### 0.2 Kenapa UAT Harus Mendahului Kode Baru

Fase 4.0 dan 4.1 sudah terpatch di level kode, **tetapi belum ada satu pun skenario UAT yang dinyatakan lolos**. Membuka 4.2 sebelum UAT ini selesai akan membuat debugging lebih sulit karena dua alasan nyata:

1. **Fase 4.2 memperkenalkan aktivasi kamar `RESERVED → OCCUPIED`** — ini irreversible dalam konteks operasional. Bug di flow booking 4.0 yang belum diketahui bisa membuat data kamar korup setelah 4.2 aktif.
2. **Expiry booking 4.2 berinteraksi dengan** `expiresAt` yang dibuat di 4.0. Jika 4.0 mengisi `expiresAt` dengan cara yang salah, expiry job di 4.2 akan membatalkan booking yang seharusnya masih valid.

### 0.3 Urutan Kerja yang Tidak Boleh Dilangkahi

```
Gate 1: UAT 4.0 lolos
    ↓
Gate 2: UAT 4.1 lolos
    ↓
ACT 4.2: Payment submission (backend → frontend → UAT)
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

**Gate 1 dinyatakan lolos jika seluruh 7 skenario di atas centang semua.**

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

**Gate 2 dinyatakan lolos jika seluruh 5 skenario di atas centang semua.**

---

## BAGIAN 3 — ACT FASE 4.2: PEMBAYARAN MANDIRI & AKTIVASI

**Prasyarat:** Gate 2 sudah lolos  
**Durasi estimasi:** 4–6 sesi Cline (backend berat, frontend sedang)  
**File cap per sesi:** maksimal 3 file sesuai konvensi proyek

---

### 3.1 Overview Arsitektur 4.2

```
Tenant submit bukti bayar
    → POST /payment-submissions (buat PaymentSubmission PENDING_REVIEW)
    ↓
Admin review queue
    → GET /payment-submissions/review-queue
    ↓
Admin approve
    → POST /payment-submissions/:id/approve
    → [transaction atomik]:
        PaymentSubmission.status = APPROVED
        InvoicePayment dibuat
        Invoice status disinkronkan
        Jika invoice lunas → Room RESERVED→OCCUPIED, Stay menjadi operasional
        Audit log
    ↓
Admin reject
    → POST /payment-submissions/:id/reject (simpan reviewNotes)
    ↓
Booking expired (job)
    → Cek expiresAt yang lewat
    → Stay di-expire, Room kembali AVAILABLE
    → PaymentSubmission pending → EXPIRED
```

---

### 3.2 Backend — ACT 4.2.A: Schema & Model PaymentSubmission

**Sesi:** 1 sesi Cline  
**File yang dibuat/diubah:**
- `prisma/schema.prisma`
- `src/common/enums/app.enums.ts`
- (jalankan `npx prisma migrate dev` atau `db push` setelah)

**Tambahan ke schema.prisma:**
```prisma
enum PaymentSubmissionStatus {
  PENDING_REVIEW
  APPROVED
  REJECTED
  EXPIRED
}

model PaymentSubmission {
  id              String   @id @default(cuid())
  stayId          String
  invoiceId       String
  tenantId        String
  submittedById   String   // user.id tenant

  amountRupiah    Int
  paidAt          DateTime
  paymentMethod   String   // TRANSFER | CASH | dll
  senderName      String?
  senderBankName  String?
  referenceNumber String?
  notes           String?

  // proof metadata
  fileKey         String?
  fileUrl         String?
  originalFilename String?
  mimeType        String?
  fileSizeBytes   Int?

  status          PaymentSubmissionStatus @default(PENDING_REVIEW)
  reviewedById    String?
  reviewedAt      DateTime?
  reviewNotes     String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  stay            Stay     @relation(fields: [stayId], references: [id])
  invoice         Invoice  @relation(fields: [invoiceId], references: [id])
  submittedBy     User     @relation("submittedBy", fields: [submittedById], references: [id])
  reviewedBy      User?    @relation("reviewedBy", fields: [reviewedById], references: [id])

  @@index([stayId])
  @@index([invoiceId])
  @@index([status])
  @@index([tenantId])
}
```

**Tambahan enum:**
```typescript
// di app.enums.ts
export enum PaymentSubmissionStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED       = 'APPROVED',
  REJECTED       = 'REJECTED',
  EXPIRED        = 'EXPIRED',
}
```

**Tambahan relasi di model yang ada:**
- `Stay` → `paymentSubmissions PaymentSubmission[]`
- `Invoice` → `paymentSubmissions PaymentSubmission[]`
- `User` → dua sisi relasi (submittedBy + reviewedBy)

**Acceptance criteria ACT 4.2.A:**
- [ ] Migration berhasil dijalankan
- [ ] `npx prisma generate` berhasil
- [ ] `npm run build` backend tetap sukses

---

### 3.3 Backend — ACT 4.2.B: Module & DTO

**Sesi:** 1 sesi Cline  
**File yang dibuat:**
- `src/modules/payment-submissions/payment-submissions.module.ts`
- `src/modules/payment-submissions/dto/create-payment-submission.dto.ts`
- `src/modules/payment-submissions/dto/review-queue-query.dto.ts`
- Perbarui `src/app.module.ts`

**DTO create-payment-submission.dto.ts:**
```typescript
export class CreatePaymentSubmissionDto {
  @IsString() @IsNotEmpty()
  invoiceId: string;

  @IsInt() @Min(1)
  amountRupiah: number;

  @IsDateString()
  paidAt: string;

  @IsString() @IsNotEmpty()
  paymentMethod: string;

  @IsString() @IsOptional()
  senderName?: string;

  @IsString() @IsOptional()
  senderBankName?: string;

  @IsString() @IsOptional()
  referenceNumber?: string;

  @IsString() @IsOptional()
  notes?: string;

  // proof metadata — dikirim setelah upload selesai di storage
  @IsString() @IsOptional()
  fileKey?: string;

  @IsString() @IsOptional()
  fileUrl?: string;

  @IsString() @IsOptional()
  originalFilename?: string;

  @IsString() @IsOptional()
  mimeType?: string;

  @IsInt() @Min(0) @IsOptional()
  fileSizeBytes?: number;
}
```

**DTO review-queue-query.dto.ts:**
```typescript
export class ReviewQueueQueryDto {
  @IsOptional() @IsEnum(PaymentSubmissionStatus)
  status?: PaymentSubmissionStatus;

  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @IsString()
  paymentMethod?: string;

  @IsOptional() @IsString()
  roomId?: string;

  @IsOptional() @IsString()
  tenantId?: string;

  @IsOptional() @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @IsInt() @Min(1) @Max(50)
  limit?: number = 20;
}
```

---

### 3.4 Backend — ACT 4.2.C: Service Tenant Submit

**Sesi:** 1 sesi Cline  
**File yang dibuat:**
- `src/modules/payment-submissions/payment-submissions.service.ts` (bagian tenant)

**Method `createSubmission(userId, dto)`:**
1. Ambil user → validasi `tenantId` ada
2. Ambil stay milik tenant: `Stay.status = ACTIVE`, room berstatus `RESERVED`
3. Validasi invoice: milik stay yang sama, bukan PAID/CANCELLED
4. Guard: cek apakah ada submission `PENDING_REVIEW` lain untuk invoice yang sama — tolak jika ada (tidak boleh spam submission)
5. Validasi `amountRupiah`: tidak boleh melebihi `remainingAmountRupiah` invoice (overpay prevention)
6. Buat `PaymentSubmission` dengan status `PENDING_REVIEW`
7. Return data submission yang dibuat

**Method `findMine(userId, query)`:**
1. Ambil tenantId dari user
2. Filter: `tenantId = user.tenantId`
3. Populate: stay.room, invoice ringkasan
4. Pagination via `page + limit`
5. Sort default: terbaru dulu

**Acceptance criteria ACT 4.2.C:**
- [ ] Submit berhasil untuk booking yang valid
- [ ] Ditolak jika stay bukan konteks RESERVED
- [ ] Ditolak jika invoice bukan milik stay tenant
- [ ] Ditolak jika sudah ada PENDING_REVIEW untuk invoice yang sama
- [ ] Overpay ditolak

---

### 3.5 Backend — ACT 4.2.D: Service Admin Approve + Activation Sync

**Sesi:** 1 sesi Cline (paling kritis — tulis dengan hati-hati)  
**File yang diubah:**
- `src/modules/payment-submissions/payment-submissions.service.ts` (bagian admin)

**Method `approveSubmission(adminUserId, submissionId)` — dalam `prisma.$transaction()`:**

```
BEGIN TRANSACTION

1. Fetch submission WITH lock (findUnique + select for update via raw)
2. Guard: status harus PENDING_REVIEW — jika sudah APPROVED/REJECTED → throw error
3. Fetch invoice → validasi tidak PAID/CANCELLED
4. Fetch stay → validasi ACTIVE + room RESERVED
5. Hitung remaining invoice setelah payment ini
6. Buat InvoicePayment:
   - amountRupiah = submission.amountRupiah
   - paidAt = submission.paidAt
   - paymentMethod = submission.paymentMethod
   - reference dari submission
   - paidById = adminUserId (operator yang approve)
7. Update invoice status:
   - 0 paid sebelumnya + payment ini → PARTIAL atau PAID sesuai sisa
8. Update PaymentSubmission:
   - status = APPROVED
   - reviewedById = adminUserId
   - reviewedAt = now()
9. JIKA invoice menjadi PAID (lunas penuh):
   - Update Room.status = OCCUPIED
   - (Stay sudah ACTIVE sejak booking, tidak perlu ubah status Stay)
   - Tandai stay sebagai "sudah aktif operasional" — bisa via field atau lewat Room.status saja
10. Buat audit log:
    - type: APPROVE_PAYMENT_SUBMISSION
    - actorId: adminUserId
    - entityId: submissionId
    - notes ringkas
11. COMMIT

Return: submission yang ter-update + ringkasan invoice + status room
```

**⚠️ Critical rules untuk method ini:**
- Wajib gunakan `prisma.$transaction()`
- Idempotency guard harus ada di dalam transaksi (bukan sebelumnya)
- Jangan buat dua InvoicePayment dari satu submission
- Overpay tetap dilarang — hitung ulang sebelum insert InvoicePayment

**Method `rejectSubmission(adminUserId, submissionId, reviewNotes)`:**
```
1. Fetch submission
2. Guard: status harus PENDING_REVIEW
3. Update status = REJECTED
4. reviewedById = adminUserId
5. reviewedAt = now()
6. reviewNotes = reviewNotes (wajib ada)
7. Audit log
8. Return submission ter-update
```

**Acceptance criteria ACT 4.2.D:**
- [ ] Approve berhasil untuk submission valid
- [ ] InvoicePayment terbuat sekali saja
- [ ] Invoice status ter-update benar
- [ ] Jika invoice lunas → Room OCCUPIED
- [ ] Double approve pada submission yang sama menghasilkan error
- [ ] Reject tersimpan dengan reviewNotes
- [ ] Semua dalam satu transaksi

---

### 3.6 Backend — ACT 4.2.E: Controller + Expiry Job

**Sesi:** 1 sesi Cline  
**File yang dibuat/diubah:**
- `src/modules/payment-submissions/payment-submissions.controller.ts`
- `src/modules/payment-submissions/booking-expiry.service.ts`

**Controller routes:**
```
POST   /payment-submissions          → createSubmission (TENANT only)
GET    /payment-submissions/my       → findMine (TENANT only)
GET    /payment-submissions/review-queue → findReviewQueue (ADMIN/OWNER only)
POST   /payment-submissions/:id/approve → approveSubmission (ADMIN/OWNER only)
POST   /payment-submissions/:id/reject  → rejectSubmission (ADMIN/OWNER only)
```

**Booking Expiry Job (booking-expiry.service.ts):**
```typescript
// Bisa dipanggil via scheduler (@Cron) atau endpoint internal manual
// Untuk dev: endpoint manual dulu — scheduler penuh bisa dibuka di 4.3

async runExpiryCheck() {
  // 1. Cari semua stay ACTIVE yang room-nya RESERVED dan expiresAt < now()
  const expiredBookings = await prisma.stay.findMany({
    where: {
      status: 'ACTIVE',
      room: { status: 'RESERVED' },
      expiresAt: { lt: new Date() }
    },
    include: { room: true }
  });

  for (const stay of expiredBookings) {
    await prisma.$transaction(async (tx) => {
      // Update PaymentSubmission yang masih PENDING_REVIEW → EXPIRED
      await tx.paymentSubmission.updateMany({
        where: { stayId: stay.id, status: 'PENDING_REVIEW' },
        data: { status: 'EXPIRED' }
      });

      // Cancel stay booking
      await tx.stay.update({
        where: { id: stay.id },
        data: { status: 'CANCELLED', cancelReason: 'Booking kadaluarsa otomatis' }
      });

      // Release room
      await tx.room.update({
        where: { id: stay.roomId },
        data: { status: 'AVAILABLE' }
      });

      // Audit log
      await tx.auditLog.create({ ... });
    });
  }

  return { expired: expiredBookings.length };
}
```

**Acceptance criteria ACT 4.2.E:**
- [ ] Endpoint controller semua route terdaftar
- [ ] Guard role benar (TENANT vs ADMIN)
- [ ] Expiry job berjalan dan hanya menyentuh booking yang benar-benar expired
- [ ] Room kembali AVAILABLE setelah expiry
- [ ] Submission PENDING_REVIEW menjadi EXPIRED
- [ ] `npm run build` tetap sukses

---

### 3.7 Frontend — ACT 4.2.F: API Client + Types

**Sesi:** 1 sesi Cline  
**File yang dibuat/diubah:**
- `src/api/paymentSubmissions.ts`
- `src/types/index.ts`

**Tambahan types:**
```typescript
export type PaymentSubmissionStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED';

export interface PaymentSubmission {
  id: string;
  stayId: string;
  invoiceId: string;
  tenantId: string;
  amountRupiah: number;
  paidAt: string;
  paymentMethod: string;
  senderName?: string;
  senderBankName?: string;
  referenceNumber?: string;
  notes?: string;
  fileUrl?: string;
  originalFilename?: string;
  status: PaymentSubmissionStatus;
  reviewedAt?: string;
  reviewNotes?: string;
  reviewedBy?: { id: string; name: string };
  createdAt: string;
  stay?: { id: string; room: { code: string; name: string } };
  invoice?: { id: string; totalAmountRupiah: number; paidAmountRupiah: number };
}

export interface CreatePaymentSubmissionPayload {
  invoiceId: string;
  amountRupiah: number;
  paidAt: string;
  paymentMethod: string;
  senderName?: string;
  senderBankName?: string;
  referenceNumber?: string;
  notes?: string;
  fileKey?: string;
  fileUrl?: string;
  originalFilename?: string;
  mimeType?: string;
  fileSizeBytes?: number;
}
```

**API functions:**
```typescript
export const createPaymentSubmission = (data: CreatePaymentSubmissionPayload) =>
  apiClient.post<PaymentSubmission>('/payment-submissions', data);

export const listMyPaymentSubmissions = (params?: { page?: number; limit?: number; status?: string }) =>
  apiClient.get<PaginatedResponse<PaymentSubmission>>('/payment-submissions/my', { params });

export const listReviewQueue = (params?: ReviewQueueQuery) =>
  apiClient.get<PaginatedResponse<PaymentSubmission>>('/payment-submissions/review-queue', { params });

export const approvePaymentSubmission = (id: string) =>
  apiClient.post<PaymentSubmission>(`/payment-submissions/${id}/approve`);

export const rejectPaymentSubmission = (id: string, reviewNotes: string) =>
  apiClient.post<PaymentSubmission>(`/payment-submissions/${id}/reject`, { reviewNotes });
```

---

### 3.8 Frontend — ACT 4.2.G: Tenant Submit Bukti Bayar

**Sesi:** 1 sesi Cline  
**File yang dibuat/diubah:**
- `src/pages/portal/MyBookingsPage.tsx` (tambah CTA + form)
- `src/components/portal/SubmitPaymentModal.tsx` (baru)

**SubmitPaymentModal — field:**
- `amountRupiah`: number input, wajib, min 1, max = remaining invoice
- `paidAt`: date input, wajib, tidak boleh di masa depan
- `paymentMethod`: select (TRANSFER | CASH | dll)
- `senderName`, `senderBankName`, `referenceNumber`: text, opsional
- `notes`: textarea, opsional
- Upload bukti (opsional untuk sekarang — bisa URL atau placeholder file metadata)

**Logic di MyBookingsPage:**
- Jika booking status `Menunggu Pembayaran` → tampilkan tombol **Upload Bukti Bayar**
- Jika sudah ada submission → tampilkan riwayat submission (status badge, tanggal, nominal)
- Badge status submission:
  - `PENDING_REVIEW` → Menunggu Review (kuning)
  - `APPROVED` → Disetujui (hijau)
  - `REJECTED` → Ditolak (merah) + tampilkan reviewNotes
  - `EXPIRED` → Kadaluarsa (abu-abu)

**Catatan file upload:**
Untuk MVP 4.2, file upload bisa berupa input URL (tenant memasukkan link bukti transfer dari Google Drive / share link). File storage sesungguhnya bisa dibuka di iterasi berikutnya tanpa mengubah kontrak backend.

---

### 3.9 Frontend — ACT 4.2.H: Admin Review Queue

**Sesi:** 1 sesi Cline  
**File yang dibuat:**
- `src/pages/payments/PaymentReviewPage.tsx`
- `src/components/payments/ReviewPaymentModal.tsx`

**PaymentReviewPage:**
- Tabel submissions pending review
- Filter: status, paymentMethod, search
- Per row: thumbnail/link bukti, tenant, kamar, invoice, nominal, tanggal bayar, reference number
- Tombol **Approve** dan **Reject**

**ReviewPaymentModal — untuk approve:**
- Tampilkan ringkasan submission
- Konfirmasi nominal
- Tombol **Approve** → panggil `approvePaymentSubmission(id)`
- Setelah sukses: invalidate query review queue, stays, invoices, dashboard

**ReviewPaymentModal — untuk reject:**
- Field `reviewNotes` wajib diisi
- Tombol **Tolak** → panggil `rejectPaymentSubmission(id, reviewNotes)`
- Setelah sukses: invalidate query review queue

**Tambah menu di navigation:** "Verifikasi Bayar" untuk ADMIN dan OWNER

---

### 3.10 UAT Fase 4.2

**Skenario happy path:**
1. Tenant submit bukti bayar → submission PENDING_REVIEW terbentuk
2. Admin buka review queue → submission muncul
3. Admin approve → InvoicePayment terbuat, invoice lunas, room OCCUPIED
4. Tenant buka Pemesanan Saya → status berubah (booking aktif operasional)

**Skenario reject:**
1. Admin reject dengan reviewNotes → submission REJECTED
2. Tenant melihat status REJECTED + alasan penolakan
3. Tenant bisa submit ulang (submission baru)

**Skenario partial payment:**
1. Tenant submit nominal di bawah total invoice
2. Admin approve → invoice menjadi PARTIAL, room tetap RESERVED
3. Tenant submit kembali untuk sisa
4. Admin approve → invoice PAID, room OCCUPIED

**Skenario expiry:**
1. Panggil expiry job (endpoint internal manual atau tunggu expiresAt lewat)
2. Stay di-cancel, room kembali AVAILABLE
3. Submission PENDING_REVIEW menjadi EXPIRED

**Skenario double approve prevention:**
1. Submit approval dua kali dalam waktu berdekatan (simulasi race condition)
2. Sistem hanya membuat satu InvoicePayment

**Acceptance criteria fase 4.2 dianggap lolos jika:**
- [ ] Semua 5 skenario di atas berjalan
- [ ] Tidak ada data korup (InvoicePayment ganda, Room status salah)
- [ ] Tenant tidak bisa submit untuk booking orang lain
- [ ] Admin tidak bisa approve submission yang sudah APPROVED/REJECTED

---

## BAGIAN 4 — ACT FASE 4.3: NOTIFIKASI & REMINDER WHATSAPP

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



---

## BAGIAN 4A — UPDATE 2026-04-27: 4.3 Notification Center dan Urgency Chip

### 4A.1 Status 4.3 saat ini

| Subfase | Status | Catatan |
|---|---|---|
| 4.3-A Reminder Preview | ✅ PASS | Preview kandidat reminder tanpa send asli |
| 4.3-B Mock Send | ✅ PASS | Simulasi kirim, tidak real WhatsApp |
| 4.3-C1a Backend AppNotification | ✅ UAT PASS | `AppNotification`, endpoint `/me/notifications`, mark read/all read |
| 4.3-C1b Frontend Notification Center | ✅ Build + visual PASS | Bell, dropdown, `/notifications`, menu tenant Notifikasi |
| 4.3-D Tenant Payment Urgency Header Chip | 🟡 NEXT | Persistent countdown/urgency untuk kewajiban keuangan |
| Real WhatsApp provider | ⬜ Deferred | Bukan batch berikutnya |
| Scheduler/cron reminder | ⬜ Deferred | Jangan buka sebelum urgency chip stabil |
| PWA push/service worker | ⬜ Deferred | Channel nanti, bukan foundation sekarang |

### 4A.2 Arsitektur Notification

```
Announcement = konten pengumuman utama
AppNotification = inbox/read-unread per user
Payment Urgency Chip = indikator bisnis aktif sampai kewajiban selesai
PWA Push = channel kirim ke device/browser
WhatsApp = channel eksternal untuk reminder kritis
```

### 4A.3 ACT 4.3-D — Tenant Payment Urgency Header Chip

**Tujuan:** tenant tidak lupa bayar karena reminder keuangan tidak hilang hanya karena notifikasi dibaca.

Scope MVP:
- Frontend-first.
- Tenant only.
- Chip di header/topbar, di sebelah notification bell.
- Tidak membuka backend baru kecuali data existing tidak cukup.
- Tidak membuka WhatsApp/scheduler/push/service worker/SSE/websocket.

Data kandidat:
1. Invoice due/overdue dari endpoint tenant invoice.
2. Booking/payment deadline dari endpoint tenant booking.
3. Stay/contract ending dari endpoint current stay.

Prioritas chip:
1. `Terlambat X hari` untuk invoice overdue.
2. `Bayar sebelum X jam` untuk booking payment deadline.
3. `Tagihan H-X` / `Jatuh tempo hari ini` untuk invoice due soon.
4. `Kontrak H-X` untuk stay/contract ending soon.

Acceptance criteria:
- Chip tidak muncul bila tidak ada urgency.
- Chip tetap muncul walau notification sudah read selama kondisi bisnis aktif.
- Chip hilang jika invoice `PAID`, booking resolved, atau stay/contract resolved.
- Klik chip mengarah ke `/portal/invoices`, `/portal/bookings`, atau `/portal/stay` sesuai sumber urgency.

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
| Aktivasi kamar | Room berubah OCCUPIED setelah invoice booking awal lunas |
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
  - target-aware payment submission
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


---

## ADDENDUM — 2026-04-26 (Phase 4.3-A Reminder Preview PASS)

### 1. Status terbaru fase 4.3
Phase 4.3 sudah dibuka secara aman melalui subfase **4.3-A Reminder Preview**.

| Subfase | Status | Catatan |
|---|---|---|
| 4.3-A Reminder Preview | ✅ PASS | Read-only preview, no send |
| 4.3-B Reminder Queue / Mock Send | ⏭️ Next | Simulasi/mock dulu sebelum provider asli |
| 4.3-C Real WhatsApp Provider | ⬜ Pending | Butuh keputusan provider dan credential |
| 4.3-D Scheduler / Cron | ⬜ Pending | Dibuka setelah send/idempotency aman |
| 4.3-E Portal Tenant Reminder Badge | ⬜ Pending | Bisa dikerjakan setelah backend reminder stabil |

### 2. Apa yang sudah ditutup di 4.3-A
- Backend preview endpoint untuk booking expiry, invoice due, invoice overdue, checkout approaching, dan all preview.
- Frontend `/reminders` untuk OWNER/ADMIN.
- Navigation entry **Pengingat WhatsApp**.
- Manual retest role visibility: ADMIN bisa akses, TENANT tidak melihat menu.

### 3. Batasan penting
4.3-A tidak mengirim WhatsApp, tidak menulis `NotificationLog`, tidak menjalankan scheduler, dan tidak memakai provider credential.

### 4. Urutan berikutnya
Lanjutkan **4.3-B Reminder Queue / Mock Send**. Real WhatsApp provider baru dibuka setelah mock flow aman dan idempotency jelas.
