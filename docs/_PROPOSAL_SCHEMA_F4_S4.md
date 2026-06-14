# PROPOSAL SCHEMA ADDITIVE — S-4: F4-13c (quest sikap) + F4-13 referral
**Status:** PROPOSAL (BELUM mengubah schema). 2026-06-15. Semua ADDITIVE (tabel/enum baru) → zero-risk.

---

## F4-13c — Quest perbaikan sikap antar-tenant (ANONIM)
**Alur:** Tenant A lapor keburukan B (anonim) → admin moderasi → B diberi tahu "ada keluhan" **TANPA identitas A** → B perbaiki → **A konfirmasi** B membaik → B dapat poin. **B tak pernah tahu siapa A.**

```prisma
enum PeerReportStatus {
  PENDING_REVIEW   // A lapor, tunggu moderasi admin
  ACKNOWLEDGED     // admin validkan → B diberi tahu (anonim), diminta perbaiki
  IMPROVED         // B klaim sudah memperbaiki
  CONFIRMED        // A konfirmasi B membaik → B dapat poin
  DISMISSED        // admin tolak (tidak valid)
}
model PeerBehaviorReport {
  id               Int      @id @default(autoincrement())
  reporterTenantId Int      // DIRAHASIAKAN dari reportee (tak pernah diekspos ke B)
  reporteeTenantId Int
  category         String   // mis. KEBISINGAN, KEBERSIHAN, PARKIR
  description      String
  status           PeerReportStatus @default(PENDING_REVIEW)
  moderatedById    Int?
  acknowledgedAt   DateTime?
  improvedAt       DateTime?
  confirmedAt      DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  // relations: reporter/reportee Tenant, moderatedBy User
}
```
- **Privasi (KUNCI):** endpoint/notif untuk B TIDAK PERNAH menyertakan `reporterTenantId`/nama A. B hanya lihat kategori + deskripsi.
- **Poin:** B dapat poin saat `CONFIRMED` (nilai owner-set, mis. +40). Reuse LoyaltyService (reason ADJUSTMENT/sourceType PEER_IMPROVEMENT).
- **Anti-abuse:** 1 laporan aktif per (A,B,kategori); admin moderasi cegah laporan palsu.

## F4-13 — Referral teman → poin
**Alur:** Tenant A mengajak teman → teman jadi tenant → A dapat poin.

```prisma
enum ReferralStatus { PENDING JOINED REWARDED CANCELLED }
model TenantReferral {
  id               Int      @id @default(autoincrement())
  referrerTenantId Int
  referredName     String
  referredPhone    String?
  referredTenantId Int?     // terisi saat teman jadi tenant (link admin / match HP)
  status           ReferralStatus @default(PENDING)
  rewardedAt       DateTime?
  note             String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  // relations: referrer Tenant, referred Tenant?
}
```
- **Poin:** A dapat poin saat teman jadi **tenant aktif** (promoted). Nilai owner-set (mis. +150).
- **Matching teman → tenant baru:** lihat pertanyaan desain.

---

## ❓ Pertanyaan desain (jawaban Anda menentukan implementasi)
1. **Approve schema S-4** (PeerBehaviorReport + TenantReferral + 2 enum)?
2. **F4-13c — siapa konfirmasi B sudah membaik?** (a) **Tenant A** (pelapor) — sesuai ide Anda; (b) Admin/owner; (c) A atau admin.
3. **F4-13 referral — cara cocokkan teman ke tenant baru?** (a) **Admin link manual** saat teman check-in (paling sederhana, andal); (b) **kode referral** yang dipakai teman saat booking; (c) **match nomor HP** otomatis.
4. **Nilai poin:** pakai default (perbaikan sikap +40, referral +150) atau Anda tentukan?
