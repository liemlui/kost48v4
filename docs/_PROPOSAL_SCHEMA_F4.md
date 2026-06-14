# PROPOSAL SCHEMA ADDITIVE — FASE 4 (F4-2 / F4-1 / F4-9 / F4-8)
**Status:** PROPOSAL (BELUM mengubah `schema.prisma`). Disusun 2026-06-14. Owner memilih: kerjakan **F4-2 lebih dulu**, tetapi **review keempat proposal sekaligus** (2026-06-14).
**Sifat:** semua perubahan **ADDITIVE** (tabel/kolom/enum baru, nullable atau ber-default) → tak merusak baris lama. UAT (5433) di-`db push` dulu; deploy via migration additive + `bootstrap.sql`.
**Cara approve:** beri "OK" per-task (boleh sebagian) ATAU koreksi nama field/enum. Saya hanya mengeksekusi task yang Anda setujui, urut **F4-2 → F4-1 → F4-9 → F4-8** (atau urutan lain sesuai Anda).

> ⚠️ **Yang BUKAN sekadar schema (butuh keputusan terpisah Anda):**
> - **F4-2** butuh **dependency npm baru `web-push`** (tak ada cara praktis kirim Web Push + VAPID tanpanya) → melanggar "JANGAN tambah npm" tanpa izin. **Perlu izin `npm install web-push`.** Plus **VAPID keys** (saya generate, Anda simpan di env) + **service worker frontend**.
> - **F4-1** memengaruhi **pengakuan pendapatan** (kapan sewa jadi revenue) → wajib lewat gate keuangan `05` + UAT trial-balance.

---

## 1. ⭐ F4-2 — PWA Web Push (prioritas owner)
**Tujuan:** notifikasi in-app yang sudah ada (AppNotification) juga dikirim sebagai **push ke HP** (4 kelompok event J-d: kontrak/H-10, pembayaran disetujui/ditolak, booking dibatalkan/DP hangus/kalah-cepat, tiket baru staf + ajakan tenant menilai). Pola **transactional outbox** + VAPID.

### Tabel baru — `PushSubscription` (registrasi device/browser)
```prisma
model PushSubscription {
  id         Int       @id @default(autoincrement())
  userId     Int
  endpoint   String    @unique     // URL endpoint unik per browser/device (dari PushManager)
  p256dh     String                 // public key enkripsi payload (Web Push)
  auth       String                 // auth secret
  userAgent  String?
  isActive   Boolean   @default(true)
  createdAt  DateTime  @default(now())
  lastUsedAt DateTime?
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}
```
`model User` (back-relation): `pushSubscriptions PushSubscription[]`

### Outbox — REKOMENDASI: pakai AppNotification yang sudah ada (tanpa tabel kedua)
Tambahan kolom di `model AppNotification` + 1 enum (outbox in-place, lebih ramping daripada tabel terpisah):
```prisma
  // F4-2: status pengiriman push (outbox). NONE = tak perlu push (mis. notif lama).
  pushStatus   PushDeliveryStatus @default(NONE)
  pushAttempts Int                @default(0)
  pushedAt     DateTime?

enum PushDeliveryStatus { NONE PENDING SENT FAILED }
```
- **Alur:** helper notif yang relevan menandai `pushStatus = PENDING` saat membuat AppNotification. Sweeper auto-ops `runPushDispatch` mengambil notif `PENDING`, kirim ke semua `PushSubscription` aktif milik `recipientUserId` (lib `web-push`, VAPID), lalu set `SENT`/`FAILED` + `pushAttempts++`. Endpoint balas **404/410** → `PushSubscription.isActive = false` (device mati).
- **Alternatif** (bila Anda lebih suka): tabel terpisah `PushOutbox` (1 baris per kiriman, retry mandiri). Lebih "murni" tapi menambah 1 tabel + join. Saya rekomendasikan **in-place** karena AppNotification sudah jadi sumber kebenaran 1 notif = 1 baris.

### Non-schema (perlu aksi Anda)
- **`npm install web-push`** (1 dependency; populer, maintained). **Tanpa izin ini F4-2 tak bisa jalan.**
- **VAPID keys:** saya generate sepasang (public/private) → Anda taruh di `backend/.env` (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:...`). Public key dipakai frontend.
- **Frontend:** service worker (`sw.js`) + UI "Aktifkan notifikasi" (minta izin, `subscribe`, kirim ke `POST /push/subscribe`). PWA manifest sudah ada.

---

## 2. F4-1 — Unearned Revenue PSAK 72 (sewa panjang)
**Masalah (F-15):** sewa **SMESTERLY (6 bln)** & **YEARLY (12 bln)** kini diakui pendapatan **sekaligus saat check-in** → overstate revenue bulan berjalan, understate bulan berikut. PSAK 72: akui **bertahap** sepanjang masa sewa.
**COA:** **sudah ada `2200 Unearned Revenue` (LIABILITY/CREDIT)** — tak perlu akun baru.

### Tabel baru — `RentRecognitionSchedule` (jadwal pengakuan per bulan)
```prisma
model RentRecognitionSchedule {
  id                    Int       @id @default(autoincrement())
  stayId                Int
  periodIndex           Int        // bulan ke-1..N
  periodStart           DateTime  @db.Date
  periodEnd             DateTime  @db.Date   // eksklusif
  scheduledAmountRupiah Int
  recognizedAt          DateTime?            // null = belum diakui
  journalEntryId        Int?                 // jurnal DR 2200 / CR 4xxx saat diakui
  createdAt             DateTime  @default(now())
  stay         Stay          @relation(fields: [stayId], references: [id], onDelete: Cascade)
  journalEntry JournalEntry? @relation(fields: [journalEntryId], references: [id], onDelete: SetNull)
  @@unique([stayId, periodIndex])
  @@index([stayId])
  @@index([recognizedAt])
}
```
`model Stay`: `rentRecognitionSchedules RentRecognitionSchedule[]` · `model JournalEntry`: `rentRecognitions RentRecognitionSchedule[]`

### Catatan implementasi
- **Check-in sewa panjang:** alih-alih CR 4xxx penuh, posting CR **2200 Unearned** penuh + buat N baris jadwal (rata per bulan; sisa pembulatan ke baris terakhir pakai `money.helper`).
- **Sweeper bulanan** (auto-ops, dekat accounting auto-close): baris jatuh tempo (periodStart ≤ akhir bulan WIB) & belum diakui → jurnal **DR 2200 / CR 4100** (pendapatan sewa) + isi `recognizedAt`/`journalEntryId`. Idempotent per `(stayId, periodIndex)`.
- **Term pendek (DAILY/WEEKLY/BIWEEKLY/MONTHLY): TETAP diakui langsung** (bukan prabayar multi-bulan). 
- ❓ **Keputusan owner:** terapkan deferral hanya untuk **SMESTERLY + YEARLY** (rekomendasi saya) — setuju? Atau termasuk MONTHLY juga?

---

## 3. F4-9 — Gamifikasi / Loyalitas tenant
**Desain lengkap:** dossier 19. Poin tak dapat dipindah; reward **wajib terjurnal** (M4); penukaran **wajib approve admin/owner** (M3).

### Enum baru
```prisma
enum LoyaltyPointReason { RENEWAL ON_TIME_PAYMENT VALIDATED_REPORT ONBOARDING_QUEST REDEMPTION ADJUSTMENT }
enum LoyaltyRewardType  { RENT_DISCOUNT SERVICE_ADDON METER_DISCOUNT BADGE PHYSICAL }
enum RedemptionStatus   { PENDING APPROVED REJECTED FULFILLED CANCELLED }
```
### Tabel baru
```prisma
model LoyaltyPoint {                 // ledger append-only (saldo = Σ delta)
  id           Int      @id @default(autoincrement())
  tenantId     Int
  delta        Int                    // + earn / - redeem
  reason       LoyaltyPointReason
  sourceType   String                 // idempotensi (mis. "RENEWAL")
  sourceId     String                 // mis. renewRequestId
  note         String?
  createdById  Int?
  createdAt    DateTime @default(now())
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  @@unique([sourceType, sourceId])    // 1 sumber = 1 entri poin
  @@index([tenantId])
}
model LoyaltyReward {                 // katalog reward (owner kelola)
  id          Int               @id @default(autoincrement())
  name        String
  description String?
  pointCost   Int
  type        LoyaltyRewardType
  valueRupiah Int?                     // nominal diskon/expense bila relevan
  isActive    Boolean           @default(true)
  stockQty    Int?                     // null = tak terbatas
  createdAt   DateTime          @default(now())
  redemptions Redemption[]
}
model Redemption {                    // penukaran (wajib approve)
  id            Int              @id @default(autoincrement())
  tenantId      Int
  rewardId      Int
  pointCost     Int                    // snapshot biaya poin saat tukar
  status        RedemptionStatus @default(PENDING)
  requestedAt   DateTime         @default(now())
  decidedAt     DateTime?
  decidedById   Int?
  journalEntryId Int?                  // jurnal diskon/expense saat FULFILLED
  note          String?
  tenant       Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  reward       LoyaltyReward @relation(fields: [rewardId], references: [id], onDelete: Restrict)
  journalEntry JournalEntry? @relation(fields: [journalEntryId], references: [id], onDelete: SetNull)
  @@index([tenantId])
  @@index([status])
}
```
`model Tenant`: `loyaltyPoints LoyaltyPoint[]` · `redemptions Redemption[]` · `model JournalEntry`: `redemptions Redemption[]`
- **Poin (owner-set, konstanta kode dulu):** renewal +100, bayar tepat waktu +50, lapor tervalidasi +30, quest onboarding +200 (1×).
- **Akuntansi:** RENT_DISCOUNT → jurnal pengurang pendapatan; PHYSICAL/SERVICE_ADDON/METER → expense. Terjurnal saat `FULFILLED`.
- ❓ **Keputusan owner:** nilai poin & isi katalog reward boleh saya pakai default dossier 19 dulu (bisa diubah via admin panel nanti) — setuju?

---

## 4. F4-8 — Flow pindah kamar resmi (perlu desain)
**Tujuan:** tenant pindah antar-kamar tanpa checkout+booking ulang (mempertahankan loyalitas/rent-lock D-16).

### Tabel baru — `RoomTransfer` (jejak perpindahan)
```prisma
model RoomTransfer {
  id               Int      @id @default(autoincrement())
  stayId           Int
  fromRoomId       Int
  toRoomId         Int
  transferDate     DateTime @db.Date
  reason           String?
  rentChangeRupiah Int?      // selisih sewa bila beda kelas (opsional)
  note             String?
  createdById      Int?
  createdAt        DateTime @default(now())
  stay      Stay  @relation(fields: [stayId], references: [id], onDelete: Cascade)
  fromRoom  Room  @relation("RoomTransferFrom", fields: [fromRoomId], references: [id], onDelete: Restrict)
  toRoom    Room  @relation("RoomTransferTo", fields: [toRoomId], references: [id], onDelete: Restrict)
  createdBy User? @relation("RoomTransferCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  @@index([stayId])
}
```
`model Stay`: `roomTransfers RoomTransfer[]` · `model Room`: `transfersFrom/transfersTo RoomTransfer[]` · `model User`: `roomTransfersCreated RoomTransfer[]`

### ❓ Pertanyaan desain (perlu jawaban Anda sebelum implementasi)
1. **Identitas stay:** pindah = **Stay yang sama** (update `roomId`) + catat transfer (rekomendasi saya) — atau Stay baru? *(rekomendasi: stay sama, agar histori/loyalitas utuh)*
2. **Deposit jaminan:** ikut pindah apa adanya (rekomendasi) atau disesuaikan ke `defaultDepositRupiah` kamar baru?
3. **Sewa:** bila kamar baru beda harga — naik/turun mengikuti kamar baru, atau **kunci harga lama** (sesuai rent-loyalty D-16)? *(rekomendasi: kunci harga lama; selisih = keputusan kasus-per-kasus)*
4. **Meter:** kamar baru di-snapshot baseline saat transfer (seperti promote check-in) — setuju?
5. **Kamar lama:** otomatis → tiket `CHECKOUT_INSPECTION` + `MAINTENANCE`→`AVAILABLE` (pola checkout), kamar baru → `OCCUPIED`. Setuju?

---

## 5. Ringkasan dampak migration
| Task | Tabel baru | Enum baru | Kolom tambah (tabel lama) | Non-schema |
|---|---|---|---|---|
| **F4-2** | `PushSubscription` | `PushDeliveryStatus` | `AppNotification` +3 (pushStatus/Attempts/pushedAt); `User` back-rel | **npm `web-push`** + VAPID env + service worker FE |
| **F4-1** | `RentRecognitionSchedule` | — | `Stay`/`JournalEntry` back-rel | pakai COA 2200 (sudah ada); sweeper bulanan |
| **F4-9** | `LoyaltyPoint`, `LoyaltyReward`, `Redemption` | `LoyaltyPointReason`, `LoyaltyRewardType`, `RedemptionStatus` | `Tenant`/`JournalEntry` back-rel | dashboard tenant + admin panel FE |
| **F4-8** | `RoomTransfer` | — | `Stay`/`Room`/`User` back-rel | flow + UI; **5 keputusan desain** di atas |

Semua nullable / ber-default / tabel baru → **zero-risk untuk baris existing**. Tidak ada kolom dihapus/diubah tipe.

## 6. Urutan eksekusi (setelah approval)
1. **F4-2 dulu** (prioritas owner): butuh izin `npm install web-push` + VAPID + service worker. Bila Anda belum mau pasang dependency, F4-2 tertunda dan kita mulai F4-1.
2. Per task: edit `schema.prisma` (additive) → `db push` UAT 5433 → `prisma generate` → implementasi (1 task = 1 commit) → gate (`tsc` 0, `node --test`; finance task + UAT runtime untuk F4-1/F4-9).
3. Migration resmi additive saat hijau.

> **Aksi owner:** (a) **OK / koreksi** tiap blok schema; (b) **izin `npm install web-push`?** (F4-2); (c) jawab ❓ F4-1 (#2), F4-9 (nilai default), dan **5 pertanyaan desain F4-8**.
