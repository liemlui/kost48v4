# 06 — MODUL LAINNYA: WiFi, Loyalty, Survei, Notifikasi, Settings (15 temuan)

---

## WIFI SALES

### 🔍 Modul BUKAN Subscription System
`WifiSale` table: `saleDate`, `customerName`, `packageName`, `soldPriceRupiah`, `note`. Tidak ada tenant FK, device tracking, status, atau billing recurring.

### Frontend: Expression of Interest
`WifiOrderPage.tsx`: tenant klik "Pesan Sekarang" → `POST /additional-services/{id}/interest` → `ServiceInterest` PENDING. Admin follow-up manual.

### 🟡 Device Limit 3/Tenant — Tidak Enforced
Tidak ada FK tenant, tidak ada count check.

### 🟡 Monthly Billing — Tidak Ada
`wifiRupiah` di OperationalSetting tidak terhubung ke subscription manapun.

### 🟡 Dua Sumber Kebenaran Redundan
`wifi-sales/` module + AdditionalService WiFi = dua sumber pricing.

---

## ADDITIONAL SERVICES

### Flow: Expression of Interest → Manual
Tenant → `ServiceInterest` (PENDING) → admin kontak manual → `CONTACTED`/`DONE`/`CANCELLED`.

### 🟡 Tidak Ada Auto-Provisioning
Tidak ada aktivasi otomatis atau recurring order.

---

## LOYALTY

### ✅ Points Earning — 4 Reasons + Idempotent
| Reason | Points | Trigger |
|--------|--------|---------|
| RENEWAL | 100 | Renewal/prepay |
| ON_TIME_PAYMENT | 50 | Payment submission |
| VALIDATED_REPORT | 30 | Ticket/stay validation |
| ONBOARDING_QUEST | 200 | Profile completion |

`@@unique([sourceType, sourceId])` — cegah double-earn. `award()` catch P2002.

### ✅ Negative Point Guard
`redemption.service.ts:83-87`: `after < 0` → ConflictException. Dalam `$transaction` + `FOR UPDATE`.

### 🟢 Tidak Ada Point Expiry
By design. Points tidak expire.

### 🟢 Frontend Hitung Ulang
`totalEarned`/`totalRedeemed` dihitung ulang client-side, padahal backend sudah return.

---

## SURVEYS

### ✅ Rating Calculation Benar
`summary()`: `Math.round((sum / count) * 10) / 10`. `recommendRate` = % `wouldRecommend === true`.

### 🟡 Load Semua Row ke Memori
```typescript
const rows = await this.prisma.satisfactionSurvey.findMany(...);
```
Tidak ada pagination. Ribuan survei → memory pressure.

### 🟡 "Rekomendasi" Bukan NPS
Hanya persentase sederhana. Kalau NPS dibutuhkan: `%promoters(9-10) - %detractors(0-6)`.

---

## ANNOUNCEMENTS

### ✅ CRUD via SimpleCrudPage
ADMIN/OWNER bisa buat. Tenant lihat via `/portal/announcements` filtered active.

### 🟢 Tidak Ada Targeting
Semua announcement broadcast ke semua tenant.

---

## NOTIFICATIONS

### ✅ In-App dengan Money-Guard
StaySweep tolak auto-settle deposit kalau ada invoice ISSUED → notifikasi ke admin.

### 🟡 `@Roles()` Tidak Ada
`AppNotificationController` tanpa dekorator role. Service filter by `user.id` — aman tapi defense-in-depth lemah.

---

## SETTINGS

### ✅ Dua Endpoint — Pemisahan Benar
- `GET /settings/operational` → ADMIN/OWNER (full config)
- `GET /settings/public-config` → `@Public()` (hanya yang relevan)

### 🟠 C19-01: Tenant Panggil Endpoint Salah
Tenant masih panggil `/settings/operational` → 403. Harusnya `/settings/public-config`.

### ✅ Default Values Sesuai `DEFAULT_DATA.md`
WiFi 50k, galon 20k, pet 100k, freeKwh 30, listrik 2.500, extraOccupant 20%.

---

## MODEL SEKUNDER — Audit Minimal

### `GuestPreferenceSurvey`
Tidak ada halaman admin untuk review.

### `ExternalReview`
Hanya C01-04 (rating ≥4 filter). CRUD dan tampilan tidak diaudit penuh.

### `MarketAnalysis`
Model SWOT/PESTLE dari DeepSeek. Tidak ada validasi expiry/cleanup.

### `AiDraft` Queue
Draft→approve→audit flow tidak diverifikasi live.

---

## ✅ KESIMPULAN MODUL PENDUKUNG

Secara umum fungsional dan bebas bug kritis. Gap terbesar:
1. WiFi bukan subscription (hanya expression of interest)
2. Tidak ada auto-provisioning
3. Survey summary load semua row
4. Model sekunder minim verifikasi
5. Tenant panggil endpoint admin (C19-01)
