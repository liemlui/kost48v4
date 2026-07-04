# M29 — Audit Modul ExternalReview (OC-05)

> **Auditor:** Reasonix Code (DeepSeek V4 Pro)
> **Tanggal:** 4 Juli 2026
> **Status:** ✅ Selesai — temuan didokumentasikan, tidak ada kode yang diubah (audit murni)

---

## Ringkasan

Modul `ExternalReview` adalah entitas Prisma untuk ulasan eksternal (Google Maps, Facebook, manual) yang **tidak memiliki CRUD endpoint atau admin UI**. Satu-satunya jalur baca adalah melalui `MarketingPublicRoomsService.getPublicSocialProof()` yang menggabungkan `ExternalReview` + `StaffReview` untuk social proof publik.

---

## 1. Temuan Positif ✅

| Aspek | Detail |
|-------|--------|
| **Model Prisma bersih** | Standalone, tanpa relasi/FK — tepat untuk data eksternal |
| **Index efisien** | `(isVisible, rating)` + `(reviewedAt)` — optimal untuk query publik |
| **Read path efisien** | `$transaction` menjalankan 5 query paralel (staff, external, aggregate) |
| **`isVisible` gate** | Hanya review dengan `isVisible: true` yang tampil ke publik |
| **Unit test** | TC-MP01 (empty) + TC-MP02 (dengan data) — mock externalReview di `makeSvc()` |
| **Seed data** | 14 ulasan Google real dari `seed-real.ts` — source: 'google', isVisible: true |
| **Frontend display** | `ReviewsPublicPage.tsx` — badge Google Review, pagination, sort Terbaru/Rating |
| **No leak to other modules** | `MarketingPublicRoomsService` tidak di-export dari module metadata |

---

## 2. Temuan Kritis 🔴

### 🔴 C01 — Tidak Ada CRUD Endpoint

Owner/Admin **tidak bisa** mengelola ulasan eksternal tanpa akses DB langsung.

| Operasi | Endpoint | Ada? |
|---------|----------|:----:|
| List semua (termasuk tersembunyi) | `GET /admin/external-reviews` | ❌ |
| Tambah ulasan baru | `POST /admin/external-reviews` | ❌ |
| Edit ulasan (teks/rating/sumber) | `PATCH /admin/external-reviews/:id` | ❌ |
| Toggle visibilitas | `PATCH /admin/external-reviews/:id/visibility` | ❌ |
| Hapus ulasan | `DELETE /admin/external-reviews/:id` | ❌ |

**Dampak:** Satu-satunya cara menambah/menyembunyikan/mengedit ulasan adalah query manual ke PostgreSQL. Owner tidak bisa:
- Menambahkan ulasan Facebook/manual
- Menyembunyikan ulasan negatif (jika `isVisible` perlu diubah)
- Memperbaiki typo/kesalahan di ulasan yang ada

### 🔴 C02 — Tidak Ada Admin UI

Tidak ada halaman di dashboard Owner/Admin untuk manajemen ulasan eksternal.

**Dampak:** Owner harus tahu SQL atau minta developer untuk perubahan data sederhana.

---

## 3. Temuan Sedang 🟡

### 🟡 M01 — Rating Tanpa Validasi 1-5

```prisma
rating  Int   // 1..5
```

Model hanya komentar — Prisma tidak memvalidasi rentang. Aplikasi juga tidak punya DTO validation layer. Rating `-1` atau `999` bisa masuk via seed atau query manual.

### 🟡 M02 — Source Free Text (Bukan Enum)

```prisma
source  String  @default("google") // "google" | "facebook" | "manual"
```

Dokumentasi model menyebut 3 nilai yang valid, tapi kolom adalah `String` bebas. Tidak ada native Prisma enum atau validasi aplikasi. `source: 'invalid-source'` bisa masuk tanpa error.

---

## 4. Temuan Rendah 🟢

### 🟢 L01 — Tidak Ada `updatedAt`

Model hanya punya `createdAt` dan `reviewedAt`. Jika admin nantinya mengedit review, tidak ada jejak kapan terakhir diubah.

### 🟢 L02 — `take: 20` di Read Publik

```js
this.prisma.externalReview.findMany({
  where: { isVisible: true },
  take: 20,
  orderBy: { reviewedAt: 'desc' },
})
```

Jika >20 ulasan visible, yang terlama tidak akan muncul. Saat ini hanya 14, jadi bukan masalah — tapi bisa jadi jika ulasan bertambah banyak.

---

## 5. Diagram Alur Saat Ini

```
┌──────────────┐     ┌──────────────────────────────┐     ┌──────────────┐
│  seed-real   │────→│     Prisma DB (PostgreSQL)    │←────│  DB query    │
│  (14 review) │     │  ┌─────────────────────────┐  │     │  (manual)    │
└──────────────┘     │  │  ExternalReview table    │  │     └──────────────┘
                     │  │  - id                    │  │
                     │  │  - source (google/...)   │  │
                     │  │  - authorName            │  │
┌──────────────┐     │  │  - rating (1-5)          │  │     ┌──────────────────┐
│  StaffReview │     │  │  - comment               │  │     │  Tenant Portal   │
│  (internal)  │────→│  │  - isVisible             │  │     │  (tidak akses)   │
└──────────────┘     │  │  - reviewedAt            │  │     └──────────────────┘
                     │  └─────────────────────────┘  │
                     └──────────────────────────────┘
                               │
                               ▼
              ┌────────────────────────────┐
              │  getPublicSocialProof()    │
              │  (MarketingPublicRoomsSvc) │
              │  - $transaction 5 queries  │
              │  - gabung Staff+External   │
              │  - weighted avg + pool 20  │
              └───────────┬────────────────┘
                          │
                          ▼
              ┌────────────────────────────┐
              │  GET /public/rooms/        │
              │  social-proof (no auth)    │
              │  → occupantCount           │
              │  → averageRating           │
              │  → reviewCount             │
              │  → reviews[]               │
              └───────────┬────────────────┘
                          │
                          ▼
              ┌────────────────────────────┐
              │  ReviewsPublicPage.tsx     │
              │  (public)                  │
              │  + fetchPublicSocialProof  │
              │  + pagination, sort        │
              │  + Google badge            │
              └────────────────────────────┘
```

**Tidak ada jalur admin** — titik putus-putus (manual DB query) adalah satu-satunya cara tulis.

---

## 6. Rekomendasi

| Prioritas | Rekomendasi | Estimasi |
|-----------|-------------|----------|
| 🔴 **WAJIB** | Buat CRUD endpoint admin: `backend/src/modules/external-reviews/external-reviews.controller.ts` + service + DTO (5 endpoint standar). Guard: OWNER/ADMIN only. | 2 jam |
| 🔴 **WAJIB** | Buat admin UI page: `frontend/src/pages/admin/ExternalReviewsPage.tsx` — tabel paginated + modal add/edit + toggle visibility toggle + delete confirm. | 3 jam |
| 🟡 **SARAN** | Ganti `source String` → Prisma enum (`Google`, `Facebook`, `Manual`) + validasi rating 1-5 di DTO. | 30 mnt |
| 🟢 **NICE** | Tambah `updatedAt` ke model untuk audit trail. | 15 mnt |

---

## 7. File yang Diperiksa

| File | Peran |
|------|-------|
| `backend/prisma/schema.prisma:2206-2217` | Definisi model |
| `backend/prisma/migrations/20260624100000_add_external_review/migration.sql` | Migration SQL |
| `backend/src/modules/marketing/marketing-public-rooms.service.ts:59-131` | Satu-satunya service pengguna (read-only) |
| `backend/src/modules/marketing/marketing-public-rooms.controller.ts` | Controller (tidak ada endpoint khusus ExternalReview) |
| `backend/src/modules/marketing/marketing.module.ts` | Module (tidak export) |
| `backend/test/unit/marketing-public-rooms.service.test.js` | Unit test (mock externalReview) |
| `backend/seed-real.ts:338-359` | Seed 14 Google reviews |
| `frontend/src/api/marketing.ts` | FE API client (interface PublicSocialProofReview) |
| `frontend/src/pages/public/ReviewsPublicPage.tsx` | FE halaman publik ulasan |
| `frontend/src/pages/public/PublicGuestDashboardPage.tsx` | FE dashboard publik (bagian ulasan) |
