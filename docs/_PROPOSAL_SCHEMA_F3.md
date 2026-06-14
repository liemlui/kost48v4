# PROPOSAL SCHEMA ADDITIVE — F3-14 / F3-15 / F3-17 / F3-19 (+F3-16 gabung)
**Status:** PROPOSAL (belum mengubah `schema.prisma`). Disusun 2026-06-14. Owner sudah meng-approve arah keempat task; dokumen ini mengunci **bentuk field final** sebelum migration dijalankan.
**Sifat:** semua perubahan **ADDITIVE** (kolom/enum baru, semua nullable atau ber-default) → aman, tak merusak data/baris lama. Deploy = `prisma migrate` additive; UAT (5433) di-`db push` lebih dulu.
**Keputusan owner 2026-06-14:** F3-16 (paksa-checkout overstay nunggak) **DIGABUNG** dengan F3-14 (tenant kabur) jadi satu fitur "Forced Checkout (admin)" beralasan (overstay / kabur); shortfall deposit → **AR 1100** (piutang), bukan write-off.

---

## 1. F3-14 (+F3-16) — Forced Checkout admin: tenant kabur & overstay nunggak

### Schema baru — `model Stay`
```prisma
  // F3-14/F3-16: penandaan "kabur" + jejak forced-checkout admin
  fledMarkedAt   DateTime?   // kapan admin menandai tenant kabur (null = tidak)
  fledMarkedById Int?        // admin yang menandai
  fledReason     String?     // catatan alasan (nunggak X hari + tak terhubung, dll.)
  fledMarkedBy   User? @relation("StayFledMarkedBy", fields: [fledMarkedById], references: [id], onDelete: SetNull)
```
### `model User` (back-relation)
```prisma
  staysFledMarked Stay[] @relation("StayFledMarkedBy")
```
### Catatan implementasi (TANPA schema tambahan)
- **Ambang "nunggak X hari"** = konstanta kode (`AUTO_OPS_DEADLINES`, default 7), bukan kolom DB.
- **Shortfall → AR:** saat forced-checkout, tunggakan ditutup dari deposit (pakai `depositDeductionRupiah` yang sudah ada); bila deposit < tunggakan → sisa diposting sebagai **piutang AR 1100** (jurnal `ADJUSTMENT`/invoice ISSUED — reuse posting yang ada, tanpa kolom baru).
- **UI:** satu tombol "Forced Checkout (admin)" dengan dropdown alasan **OVERSTAY_NUNGGAK / TENANT_KABUR** (string di `checkoutReason`, tak perlu enum baru). Alasan KABUR mengisi `fledMarkedAt/By/Reason`.

---

## 2. F3-15 — Barang ditinggal (abandoned) 30 hari

### Enum baru
```prisma
enum BelongingsStatus { PENDING CLAIMED ABANDONED }
```
### Schema baru — `model Stay`
```prisma
  // F3-15: pelacakan barang tenant pasca-checkout
  belongingsStatus     BelongingsStatus @default(PENDING)
  belongingsDeadline   DateTime?        // = actualCheckOutDate + 30 hari (di-set saat checkout final)
  belongingsResolvedAt DateTime?        // kapan diambil (CLAIMED) / dinyatakan ABANDONED
```
### Catatan implementasi
- Sweeper auto-ops: `belongingsDeadline < today (WIB)` & status `PENDING` → set `ABANDONED` + notif admin (best-effort, di luar tx). Tindakan fisik tetap manual.
- Default `PENDING` aman untuk baris lama (mereka tak punya deadline → tak pernah jadi ABANDONED).

---

## 3. F3-17 — Upload + verifikasi KTP (kepatuhan UU PDP)

### Schema baru — `model Tenant` (foto KTP terproteksi; `identityNumber` teks sudah ada)
```prisma
  // F3-17: foto KTP terproteksi + jejak verifikasi + hapus saat keluar (UU PDP)
  ktpImageUrl              String?
  ktpImageFileKey          String?
  ktpImageOriginalFilename String?
  ktpImageMimeType         String?
  ktpImageFileSizeBytes    Int?
  ktpVerifiedAt            DateTime?
  ktpVerifiedById          Int?
  ktpDeletedAt             DateTime?   // penanda penghapusan PDP (file fisik dihapus di storage)
  ktpVerifiedBy            User? @relation("TenantKtpVerifiedBy", fields: [ktpVerifiedById], references: [id], onDelete: SetNull)
```
### `model User` (back-relation)
```prisma
  tenantsKtpVerified Tenant[] @relation("TenantKtpVerifiedBy")
```
### Catatan implementasi
- **Gate aktivasi kamar:** promosi/aktivasi stay menolak bila `ktpVerifiedAt == null` (logika, bukan schema).
- **Akses file:** lewat endpoint terproteksi (pola `canAccessImage` seperti tiket) — OWNER/ADMIN saja.
- **Hapus saat keluar (PDP):** saat checkout final, hapus file fisik + set `ktpDeletedAt`, kosongkan `ktpImage*`.

---

## 4. F3-19 — SLA tiket + KPI adil

### Schema baru — `model Ticket`
```prisma
  // F3-19: SLA per kategori + dasar waktu adil + eskalasi
  assignedAt      DateTime?  // kapan PERTAMA di-assign (dasar resolved-time, bukan createdAt)
  dueAt           DateTime?  // batas SLA per kategori (dihitung saat assign)
  escalationLevel Int       @default(0)  // 0=none, 1=admin, 2=owner
  escalatedAt     DateTime?
```
### Catatan implementasi (mapping SLA = konstanta kode, bukan schema)
- **Dasar resolved-time:** `resolvedAt − assignedAt` (bukan `− createdAt`) → idle di antrean tak menghukum staf.
- **SLA per kategori (`dueAt = assignedAt + N`):** usulan default —
  - **24 jam:** `EMERGENCY`, `SECURITY`, `KUNCI`
  - **3 hari:** `KERUSAKAN`, `MAINTENANCE`, `KEBERSIHAN`, `CHECKOUT_INSPECTION`
  - **7 hari:** `INVENTARIS`, `AUDIT_INVENTARIS`, `PEMERIKSAAN`, `BARANG_PINDAH`, lainnya
  - *(angka final menunggu konfirmasi owner — mudah diubah, hanya konstanta)*
- **Eskalasi:** sweeper menaikkan `escalationLevel` + notif saat lewat `dueAt` (staf→admin→owner). `escalatedAt` mencegah notif berulang.
- **KPI dashboard:** breakdown per kategori + on-time vs overdue.

---

## 5. Ringkasan dampak migration
| Model | Kolom baru | Enum baru | Relation baru |
|---|---|---|---|
| Stay | 3 (fled*) + 3 (belongings*) | `BelongingsStatus` | `fledMarkedBy` |
| Tenant | 9 (ktp*) | — | `ktpVerifiedBy` |
| Ticket | 4 (assignedAt/dueAt/escalationLevel/escalatedAt) | — | — |
| User | — | — | back-rel: `staysFledMarked`, `tenantsKtpVerified` |

Semua nullable / ber-default → **zero-risk untuk baris existing**. Tidak ada kolom yang dihapus/diubah tipe.

## 6. Urutan eksekusi yang diusulkan (setelah owner konfirmasi bentuk di atas)
1. Edit `schema.prisma` (additive) → `prisma db push` ke UAT 5433 → `prisma generate`.
2. Implementasi per task (1 task = 1 commit), tiap task finance lewat gate `node --test` + UAT runtime.
3. Migration resmi (`prisma migrate dev --name f3_admin_safety`) saat semua hijau.

> **Owner action:** konfirmasi bentuk field (atau koreksi nama/angka SLA). Setelah "OK", saya mulai dari schema → F3-19 (paling mandiri) → F3-15 → F3-17 → F3-14/F3-16 (gabung).
