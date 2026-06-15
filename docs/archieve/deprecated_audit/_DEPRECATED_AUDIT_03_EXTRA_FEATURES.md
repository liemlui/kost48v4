# FITUR TAMBAHAN & FONDASI DEEP (V3) — 9 fitur + 5 lapisan fondasi diverifikasi dari source; auth enumeration-safe TERBUKTI; 3 temuan kualitas baru X-01..X-03
**Basis baca:** auth.service (targeted :96-160), app-notification.service (penuh), announcements (:100-260), tenant-staff-reviews (V1), marketing-public-rooms (penuh), ai/analytics (V1 + controller), faqs (V1), common/* (rate-limit, guards — V1/E-1).

## 9 fitur tambahan
| # | Fitur | Verdict | Evidence + temuan |
|---|---|---|---|
| 1 | FAQ publik | ✅ | `faqs.controller.ts` — hanya GET /faqs/public terbuka (isActive); mutasi OWNER/ADMIN (V1 verified, tidak berubah) |
| 2 | Pengumuman | ✅ +2 temuan | Publish → notif per-user dedupe best-effort (`announcements.service.ts:181-245`). **N-02:** publish ber-startsAt masa depan → notif instan, konten belum tayang. **N-03:** audiens TENANT = hanya room OCCUPIED (:188-204) — tenant fase booking terlewat |
| 3 | Staff Field Reports | 🟡 | Alur create→review→movement utuh; TAPI **I-02** (ghost-stock via adminReview tanpa lock/validasi RETURN) — lihat `AUDIT_05_INVENTORY.md` |
| 4 | Tenant → Staff Review | ✅ | Anti-duplikat P2002; ≤2⭐ wajib komplain + notif admin (V1 verified) |
| 5 | Staff Performance | ✅ formula / 🟠 integritas | Formula verified per baris; **K-6** double-count tiket lintas bulan — lihat `AUDIT_09_KPI.md` |
| 6 | WiFi Sales | ✅ | CRUD + jurnal + M-33 guard verified (`wifi-sales.service.ts:69-80`); order tenant tanpa notif konfirmasi (08 rek. 5) |
| 7 | Aset & Depresiasi | ✅ | Double-run terkunci 2 lapis (unique periodYear_periodMonth `assets.service.ts:392,461` + re-check tx); alignment status machine (NEEDS_REVIEW→PREVIEWED→ALIGNED/DISCLOSURE_ONLY :99-222,684-698); jurnal 6700/1590 & alignment 1500/3000-1010 verified di posting |
| 8 | AI Helper | ✅ | Rule-based murni tanpa provider eksternal; OWNER/ADMIN-only; rate-limit 12/mnt (V1 verified). Integrasi Deepseek = rencana FLOW_MAP §13.3, belum kode |
| 9 | PWA | 🟡 milik AI lain | sw.js/manifest/offline.html ada; Phase 0-1 sedang dikerjakan (working tree M) — TIDAK disentuh audit ini |

## Lapisan fondasi (yang menopang semua fitur)
| Lapisan | Verdict | Evidence + temuan |
|---|---|---|
| Auth | ✅ | **forgotPassword enumeration-safe TERBUKTI** (`auth.service.ts:96-150`): respons `{success:true}` identik utk user tak-ada/nonaktif (:106-108) & sukses (:149); token di-hash SHA-256 sebelum disimpan (:159); email kirim async best-effort. Menjawab fokus audit FLOW_MAP §1 |
| Guard global | ✅ | E-1 APP_GUARD default-deny + @Public terverifikasi runtime (GROUND_STATE §3) — controller baru otomatis 401 |
| Rate limit | ✅ sadar-batas | In-memory per-proses (global 300/mnt, auth 10/15mnt) — multi-instance butuh store bersama (sudah tercatat) |
| Notifikasi inti | ✅ +1 | `app-notification.service.ts` (104 baris): create/list/read/read-all rapi, kepemilikan dicek (:66-73). **N-04:** tanpa retensi — tabel tumbuh tanpa batas (broadcast ALL × user) |
| Audit log | ✅ | Semua mutasi penting yang dibaca pada sesi ini menulis AuditLog (pola konsisten `audit.log`/`tx.auditLog.create`) — sampling ±40 lokasi |

## Temuan kualitas baru lintas fitur
| # | Sev | Issue | Evidence |
|---|---|---|---|
| X-01 | 🟡 | Tiga salinan `releaseRoomAfterBookingCancelTx` + dua salinan `generateTicketNumber` + dua salinan `syncRoomItem` — kebijakan keselamatan kamar/stok tersebar copy-paste; sudah mulai DRIFT (syncRoomItem beda kebijakan status, I-03) | payment-submissions:860-869 vs auto-ops:905-914; room-items:276 vs staff-field-reports:638 |
| X-02 | 🟡 | `marketing-public-rooms.service.ts:34-46` — 76 nama file foto hardcoded di service; menambah foto = deploy backend | M-04 |
| X-03 | INFO | `analytics.service.ts` (2.7KB) = agregator ringkas marketing/finance/operations/strategy — membaca service lain, tidak menghitung sendiri; aman, tapi mewarisi bug F-09/F-21 dari sumbernya | — |

## Cross-check klaim docs vs kode (drift yang ditemukan sesi ini)
1. FLOW_MAP §3.1: payment-submissions "1.346 baris" → aktual 1.564; klaim partial-bebas perlu rewrite (B-01).
2. FLOW_MAP §4: "remove payment → postPaymentReversalTx" → aktual remove DIBLOKIR bila berjurnal; fungsi reversal dead code (F-29).
3. FLOW_MAP §7 fokus audit job #3 → basi (B-05).
4. FLOW_MAP §14.1 klaim notif renew → tetap salah (nol notif) — konsisten dgn temuan V1.
5. V1 04_FINANCE: "COA 17/17" → aktual 38 akun (lihat 04 §A).
6. V1 08: payment-submitted admin "tidak ada inbox" → benar, TAPI pola notifyOwnerAdminOnCreate sudah ada di checkout-requests utk disalin.

## RECOMMENDATIONS (ordered)
1. X-01: konsolidasi util keselamatan (rilis kecil, mencegah drift kebijakan kamar/stok) — gabung dgn sesi I-02.
2. N-02: tunda notif pengumuman sampai startsAt.
3. Notif konfirmasi WiFi order (pola appNotification standar).
4. N-04: job pruning notifikasi (sebelum PWA push).
5. Koreksi 4 drift FLOW_MAP + 2 drift V1 di atas saat update docs rilis berikutnya.

## OPEN QUESTIONS → ✅ TERJAWAB 2026-06-13 (`04_KEPUTUSAN_OWNER.md`)
- Deepseek integration? → **TIDAK, cukup rule-based** (D-14) → ditunda; hemat biaya + aman UU PDP.
- N-03 pengumuman utk tenant booking? → **TIDAK, cukup tenant huni** (D-10) → tutup tanpa perubahan.

---

## LAMPIRAN — Audit per-file fondasi & fitur kecil (format V3 §5)

### backend/src/auth/auth.service.ts (12.6KB — targeted :96-160)
- **Function:** Login, me, forgot/reset/change password.
- **Audit:** forgotPassword enumeration-safe (respons identik semua cabang :99/:107/:149); token reset CSPRNG → disimpan sebagai SHA-256 hash (:159) — token mentah tidak pernah di DB ✅; kirim email async catch (:144).
- **Theory ref:** OWASP account enumeration; defense in depth.
- **Verdict:** ✅ — fokus audit FLOW_MAP §1 terjawab tuntas.

### backend/src/modules/notifications/app-notification.service.ts (104 — penuh)
- Lihat lampiran `AUDIT_08_NOTIF.md`. Verdict ✅ + N-04 retensi.

### backend/src/modules/announcements/announcements.service.ts (:100-260)
- Lihat lampiran 08. Verdict ✅ + N-02/N-03.

### backend/src/modules/ai/ai.service.ts (7.2KB — V1 dipertahankan + controller check)
- **Function:** 4 helper rule-based (narrative, proof-analyze, reminder-personalize, classify) + cache kecil.
- **Audit:** tanpa provider eksternal (tidak ada HTTP client di module); OWNER/ADMIN-only; rate-limit decorator 12/mnt. Tidak mengirim data tenant keluar — aman UU PDP saat ini.
- **Verdict:** ✅; keputusan Deepseek = murni bisnis.

### backend/src/modules/analytics/analytics.service.ts (2.7KB)
- **Function:** Agregator 4 ringkasan (marketing/finance/operations/strategy) utk dashboard.
- **Audit:** delegasi ke service lain → mewarisi F-09/F-21 dari sumber; tidak ada kalkulasi sendiri yang bisa salah.
- **Verdict:** ✅ pasif (X-03).

### backend/src/modules/faqs/faqs.service.ts (6.1KB — V1)
- **Function:** CRUD FAQ + endpoint publik isActive.
- **Audit:** satu-satunya surface publik non-booking; read-only publik. Tidak ada temuan.
- **Verdict:** ✅.

### backend/src/modules/users/users.service.ts + tenants/tenants.service.ts (targeted V1)
- **Function:** CRUD user (OWNER/ADMIN) & tenant + akses portal (buat/suspend/reset).
- **Audit:** suspend memutus sesi seketika (jwt.strategy validasi DB per request — GROUND_STATE terverifikasi); guard email-bentrok lintas tenant juga ada di stays.create (:187-216) — konsisten.
- **Verdict:** ✅.

### backend/src/modules/rooms/rooms.service.ts (11.6KB — targeted)
- **Function:** CRUD kamar + fasilitas + status manual.
- **Audit:** admin BISA mengubah status kamar manual — ini escape-hatch yang menyelamatkan dari B-08 hari ini (kamar tersangkut MAINTENANCE), sekaligus pintu bypass gate inspeksi; AuditLog menjejak. Trade-off diterima selama B-08 belum difix.
- **Verdict:** ✅ dengan catatan keterkaitan B-08.

### backend/src/common/* (guards, middleware, utils — V1/E-1 dipertahankan)
- **Audit:** APP_GUARD default-deny + @Public; rate-limit in-memory; `date.util.ts` punya `parseJakartaDateOnly`/`startOfJakartaBusinessDay` yang DIPAKAI stays (complete) — fondasi WIB sudah ada utk F2-14 (tinggal dipakai posting & KPI).
- **Verdict:** ✅.

## Ringkasan kesehatan per kategori (penutup domain)
| Kategori | File diaudit | Temuan P1/P2 | Kesimpulan |
|---|---|---|---|
| Fondasi (auth/guard/notif inti) | 6 | 0 | matang |
| Fitur operasional kecil (faq/wifi/announcement/review) | 5 | 0 (N-02 P3) | sehat |
| Fitur analitik (ai/analytics) | 2 | 0 | pasif-aman |
| Aset & depresiasi | 1 | 0 | matang |
| Field reports | 1 | 1 (I-02) | satu lubang serius |
