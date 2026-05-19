# KOST48 V5 — Decisions Log
**Versi:** 2026-05-19 V5.12 decision sync

## 2026-05-19 — V5.10 Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 219 | Decision D active: Stable Modular Monolith | Multi-app menjadi roadmap only, bukan implementasi aktif. |
| 220 | V5.9 multi-app shell tidak dilanjutkan | Jangan buat `apps/`, shell API terpisah, atau runtime alias mirror. |
| 221 | V5.10-A monolith hardening diprioritaskan | Import hygiene, checkout UX, Prisma generated hygiene, AuditLog dependency. |
| 222 | Renew approval tetap core monolith | Karena extend stay + invoice issue adalah lifecycle write. |
| 223 | Renew approve DTO harus sesuai frontend | Backend menerima `plannedCheckOutDate`, `agreedRentAmountRupiah`, `reviewNotes`. |
| 224 | Tenant renew create boleh membawa optional `requestedCheckOutDate` | Memberi kontrak yang selaras dengan schema dan admin list. |
| 225 | Renew approval harus lebih atomic | Row lock `FOR UPDATE`; request approval + stay extension + invoice issue dalam satu transaction. |
| 226 | Staff billing/finance-sensitive writes dibatasi | Meter reading, expense, wifi-sale write menjadi OWNER/ADMIN. |
| 227 | Staff read visibility tetap boleh untuk operasional | Staff tetap bisa membaca data tertentu untuk kebutuhan kerja. |
| 228 | Finance mutation tetap OWNER/ADMIN core | Payment approval dan invoice/payment mutation tidak diextract. |
| 229 | Docs aktif harus disinkronkan ke V5.10 | Tidak boleh lagi menyebut V5.8 PLAN sebagai fase aktif. |

## Active Business Decisions

1. `core` monolith owns all Stay lifecycle writes.
2. Room status/occupancy writes remain core.
3. Tenant can create/view requests/submissions only.
4. Renew approval/execution remains core.
5. Checkout final remains core and is blocked by open invoice.
6. Payment approval remains core.
7. Marketing/public is read-only.
8. Staff early boundary is low-risk/read-heavy.
9. Owner-api deferred.
10. Multi-app only after monolith gates pass.

## Historical Decisions Kept Active

- `schema.prisma` is main data shape.
- `bootstrap.sql` is DB integrity guard.
- PowerShell only.
- Invoke-RestMethod for API tests.
- No production DB reset.
- No docs outside 7 active docs unless user asks.


## 2026-05-19 — V5.11 Regression Pack Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 230 | Admin checkout request list boleh menerima optional `stayId` filter | `StayDetailPage` tidak perlu load semua pending/approved checkout requests untuk mencari request milik satu stay. |
| 231 | `stayId` invalid harus ditolak dengan HTTP 400 | Mencegah query ambigu dan memudahkan UAT/manual debugging. |
| 232 | V5.11 menambah PowerShell UAT scripts, bukan test framework besar | Cocok dengan workflow lokal Windows + Invoke-RestMethod tanpa menambah dependency. |
| 233 | Staff boundary regression harus dapat diulang tanpa DB reset | Forbidden-write probes memakai role guard dan expected 403 sehingga aman terhadap side effect. |


## 2026-05-19 — V5.12 UAT Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 230 | V5.12 fokus pada full business UAT pack | Tidak membuka fitur besar baru sebelum renew/checkout/payment terbukti. |
| 231 | UAT scripts boleh membuat isolated UAT data | Scripts boleh create tenant, room, stay, invoice, payment untuk verifikasi repeatable. |
| 232 | V5.12 scripts tidak boleh reset DB | Data UAT dibuat additive, bukan destructive. |
| 233 | Renew UAT wajib membuktikan renewal invoice `ISSUED` dan double approval 409 | Menutup risiko kontrak renew setelah V5.10-B. |
| 234 | Checkout UAT wajib membuktikan open invoice block 409 dan paid invoice allows checkout | Menutup risiko guard checkout setelah V5.8-A/V5.10-A. |
| 235 | Payment regression wajib membuktikan PARTIAL/PAID/overpay guard | Menjaga finance core behavior setelah boundary hardening. |
