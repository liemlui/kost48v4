# KOST48 V5 — Changelog
**Versi:** 2026-06-12 — Audit Mega Full-Sweep + Instruksi Perbaikan untuk AI Eksekutor. Entri < V5.11.0 di `archieve/CHANGELOG_PRE_V5110.md`.

<!-- KOST48_DOCS_SYNC_20260612_AUDIT_MEGA_FIX_INSTRUCTIONS -->
## 2026-06-12 — Audit Mega Full-Sweep (docs only, tanpa perubahan kode aplikasi)

### Type
Audit read-only oleh Fable 5 atas SEMUA lini: schema/bootstrap, main/common/auth, 33 modul backend, frontend terarah. 2 dokumen baru.

### Deliverables
- `docs/03_AUDIT_MEGA_2026-06.md` — 42 temuan M-01..M-42 (5×P1, 11×P2, sisanya P3/INFO) + 9 batch verifikasi SEHAT + daftar ESKALASI E-1..E-9 + pemetaan temuan→tindakan.
- `docs/04_FIX_INSTRUCTIONS.md` — 24 FIX patch verbatim (CARI/GANTI persis) untuk AI eksekutor; QC otomatis: 42/42 blok CARI match tepat 1× di file target; aturan emas + kriteria BERHENTI + pesan commit per FIX.

### Temuan P1 (inti)
- M-14 check-in manual tidak pernah "promoted" → tersisih dari seluruh lifecycle overstay/pengingat/okupansi (FIX-01 + backfill E-2).
- M-15 renew tanpa lock → dobel-renew/race sweeper (FIX-02).
- M-16 cancel stay penghuni melepas kamar tanpa gate inspeksi (FIX-03).
- M-22 auto-ops tanpa try/catch per item → satu stay beracun menghentikan semua job (FIX-04).
- M-33 edit/hapus expense & wifi-sale meninggalkan jurnal yatim (FIX-14/15).

### Koreksi pemahaman penting (sehat, docs lama salah)
- Suspend user MEMUTUS sesi seketika (jwt.strategy validasi DB per request + klaim pwdAt); email reset password nyata via Brevo; double-apply qty inventory TIDAK terjadi (trigger DB + sync self-healing); app-notification tanpa RolesGuard AMAN (scoped per user).
<!-- KOST48_DOCS_SYNC_20260611_DOCS_COMPACTION_D1D4 -->
## 2026-06-11 — Docs Compaction + Keputusan Owner D1–D4 (tanpa perubahan logika, 1 copy fix)

### Type
Dokumentasi + 1 string copy. No schema change. TypeScript backend PASS.

### Keputusan owner (detail di `02_FOCUS_PLAN.md` §3)
- **D1:** Tanpa denda keterlambatan → kata "denda" dihapus dari reminder overdue (`reminder-preview.service.ts`). Line `PENALTY` tetap untuk potongan manual.
- **D2:** Notifikasi in-app saja; arah jangka menengah PWA push.
- **D3:** Prioritas berikutnya = UAT end-to-end + rekonsiliasi data (checklist `02_FOCUS_PLAN.md` §4).
- **D4:** Docs dipadatkan: aktif kini hanya 5 file ±60 KB — `00_GROUND_STATE.md` (ditulis ulang ringkas), `01_FLOW_MAP.md` (eks 05), `02_FOCUS_PLAN.md` (eks 07, baru: 12 flow + matriks fokus + strategi token), `CHECKLIST.md` (ditulis ulang), `CHANGELOG.md` (entri V5.11.0+). Diarsipkan ke `archieve/`: 01_CONTRACTS, 02_PLAN, 03_DECISIONS_LOG, 04_JOURNAL, 06_AUDIT_PASS_AB, GROUND_STATE/CHECKLIST basi V5.10.0, CHANGELOG lama. `CLAUDE.md` root dibuat sebagai pintu masuk sesi.

<!-- KOST48_DOCS_SYNC_20260611_V5122_FRONTEND_RATELIMIT_PASSCE -->
## 2026-06-11 — V5.12.2 Frontend DP/Jaminan + Rate Limiting + Audit Pass C/E/P3

### Type
Frontend + backend hardening. No schema change. TypeScript PASS (backend & frontend).

### Frontend (fitur V5.12.x kini terlihat pengguna)
- **SubmitPaymentModal (portal):** pilihan radio "DP 30%" vs "Bayar Lunas" dengan rincian dan copy kebijakan (DP kunci kamar, hangus bila gagal lunas; pelunasan paling lambat saat check-in). Fase pelunasan punya copy deadline H+1 pk 12:00.
- **BookingCard (portal):** baris "DP 30%" (dengan tanda ✓ bila terbayar) + label "Deposit jaminan" menggantikan "Deposit awal".
- **Katalog publik:** kamar MAINTENANCE yang `canBook=true` tampil "Bisa dipesan · dibersihkan" dengan copy lengkap (booking & DP sekarang, huni setelah bersih).
- **Admin ApproveBookingModal:** label "Deposit Jaminan" + penjelasan beda DP vs jaminan.
- **Admin Review Pembayaran:** nominal yang tepat sama dengan sisa DP 30% dinilai "Pas" (bukan "Parsial mencurigakan") dengan dampak approve yang menjelaskan kunci kamar (`paymentReviewSafety.ts`).
- Types: `downPaymentAmountRupiah`/`downPaymentPaidRupiah` di `Stay` & `TenantBooking`.

### Pass E — Rate limiting (sebelumnya TIDAK ADA throttling)
- `common/middleware/rate-limit.middleware.ts` — limiter in-memory tanpa dependensi (selaras keputusan tanpa-Helmet).
- Global `/api`: 300 req/menit/IP (env `RATE_LIMIT_GLOBAL_PER_MINUTE`).
- `/api/auth/login|forgot-password|reset-password`: 10 req/15 menit/IP (env `RATE_LIMIT_AUTH_PER_15MIN`) — menahan brute-force & enumerasi.
- Catatan: state per-proses; bila kelak multi-instance perlu store bersama.

### Pass C — Deposit jaminan end-to-end
- Ledger (`deposit-ledger.service.ts`) diverifikasi sehat: entri idempotent per (stay, type, source), settlement mencatat DEDUCTION/FORFEIT/REFUND, `reconciliationLite` tersedia sebagai alat audit data.
- **Fix:** forfeit deposit legacy di sweeper (`cancelEndedUnpaidStay`) kini menulis entri FORFEIT ke ledger via `recordDepositSettlementTx` — sebelumnya hanya mengubah status stay sehingga rekonsiliasi akan selisih.
- Catatan (P3): `recordDepositReceivedTx` fallback sourceId ke stayId bila tanpa submissionId — risiko dedupe-collision teoretis, biarkan.

### P3 fixes
- **A14:** `invoices.cancel` kini lock `FOR UPDATE` + re-validasi status/pembayaran di dalam transaksi.
- **A17:** tenant yang kalah first-paid-wins kini menerima notifikasi in-app berisi alasan & ajakan pilih kamar lain (dikirim setelah transaksi approve sukses, best-effort).

### Pass D/F/G — status verifikasi
- **Pass D (tutup buku):** sudah diverifikasi di V5.11.1 — auto-close di-gate readiness `unmapped-operational` (hitung penuh) + depresiasi + asset alignment + trial balance; celah invoice CANCELLED ditutup A8. Sisa pekerjaan: cross-check angka `reports/*` (raw SQL) vs trial balance accounting per periode — perlu data produksi, jadwalkan saat UAT.
- **Pass F (operasional fisik):** sinkronisasi qty barang punya 3 jalur (movement, field report, ticket close) dengan lock `lockInventoryQtyTx` di movement; risiko double-apply tersisa di kombinasi field-report→ticket-close (status saja, bukan qty) — risiko rendah, pantau lewat `ensureOpeningStockSyncedTx`/`ensureInventoryQtySyncedTx` yang sudah self-healing.
- **Pass G (data lama):** alat sudah tersedia & terhubung: `GET /api/deposit-ledger/reconciliation-lite`, `deposit-ledger/backfill-dry-run`, `accounting/backfill-auto-journal`, `accounting/deposit-backfill-dry-run`. Jalankan berurutan di UAT/produksi setelah deploy V5.12.x, perbaiki temuan via backfill sebelum tutup buku bulan berjalan.

<!-- KOST48_DOCS_SYNC_20260611_OVERSTAY_LIFECYCLE -->
## 2026-06-11 — V5.12.1 Overstay Lifecycle (Keputusan Owner)

### Type
Backend + schema additive (`Room.allowBookingWhileCleaning`, db push OK). TypeScript PASS.
Keputusan owner: forced checkout otomatis penuh; kamar kotor bisa dipesan, huni tunggu bersih; pengingat H-7/H-3/H-1/H-day; biaya overstay dipotong dari deposit jaminan saat settlement.

### Siklus overstay lengkap (auto-ops, urutan sequential)
1. **Pengingat** — `runContractEndReminders`: notifikasi in-app ke tenant pada H-7, H-3, H-1, dan H-day (dedupe per gelombang). Isi: perpanjang atau checkout sebelum pk 12:00; peringatan checkout paksa H+1.
2. **H-day pk 12:00** — `runOverstayEnforcement` (V5.12.0): tiket `EVICT_OVERSTAY` untuk staf menemui tenant.
3. **H+1 pk 12:00** — `runOverstayForcedCheckout` (BARU): stay → COMPLETED otomatis, kamar → MAINTENANCE + `allowBookingWhileCleaning=true` (kotor tapi bisa dipesan), tiket pembersihan `CHECKOUT_INSPECTION` untuk staf (keluarkan barang, bersihkan, foto), notifikasi ke tenant. **Pengecualian:** masih ada tagihan belum lunas → TIDAK auto-checkout; admin/owner dapat notifikasi 🚨 (dedupe harian) karena uang harus diputuskan manusia.
4. **Kamar kotor bisa dipesan** — katalog publik menampilkan "Bisa dipesan — sedang dibersihkan" (`canBook=true`); booking + DP diterima (portal & publik). **Aktivasi/huni diblokir** sampai tiket pembersihan ditutup: pelunasan tidak bisa di-approve, check-in manual ditolak.
5. **Tiket pembersihan ditutup** — gate baru: booking baru di kamar itu TIDAK memblokir penutupan tiket (yang memblokir hanya penghuni promoted); kamar → AVAILABLE (atau tetap RESERVED bila sudah dipesan), flag kotor direset → pelunasan boleh di-approve.
6. **Biaya overstay** — dipotong dari deposit jaminan tenant lama saat settlement (`processDeposit`, manual oleh admin; tercantum di deskripsi tiket).

### Konsistensi tambahan
- Semua jalur pelepas kamar (expiry sweep, expire manual, auto-cancel pasca-reject, cancelEndedUnpaidStay, room healer) kini memakai `releaseRoomAfterBookingCancelTx`: bila masih ada tiket pembersihan terbuka, kamar kembali ke MAINTENANCE (tetap bisa dipesan) — bukan AVAILABLE — agar check-in manual tidak masuk kamar kotor.
- `stays.create` (check-in manual) menolak kamar dengan tiket pembersihan terbuka.
- Aktivasi booking (pelunasan PAID) mereset `allowBookingWhileCleaning`.

### Files
`schema.prisma` + `sql/bootstrap.sql` (Room.allowBookingWhileCleaning), `auto-ops.service.ts`/`auto-ops.module.ts` (2 job baru + notifikasi), `payment-submissions.service.ts`, `tenant-bookings.service.ts`/`-helpers.ts`, `public-bookings.service.ts`, `tickets.service.ts`, `stays.service.ts`, `marketing-public-rooms.service.ts`.

### Follow-up frontend
- Katalog publik: render `availabilityNote` "sedang dibersihkan" (data sudah dikirim backend).
- Portal: tampilkan pengingat kontrak (notifikasi in-app sudah masuk bell icon yang ada).

<!-- KOST48_DOCS_SYNC_20260611_A18_DP_VS_DEPOSIT -->
## 2026-06-11 — V5.12.0 DP (Uang Muka) vs Deposit (Jaminan) + Overstay Enforcement Baru

### Type
Backend + schema additive (`prisma db push` sudah dijalankan ke kost48_v3_pro). TypeScript PASS.
Keputusan owner: jaminan = `Room.defaultDepositRupiah`; pelunasan paling lambat saat check-in (H+1 pk 12:00 = hangus); DP via jalur upload bukti yang sama; overstay = kontrak lewat + belum checkout final.

### Schema (additive)
- `Stay.downPaymentAmountRupiah` (DP 30% × sewa), `downPaymentPaidRupiah`, `downPaymentPaidAt`, `downPaymentForfeitedAt`.
- `Stay.depositAmountRupiah` kini KONSISTEN = jaminan (refundable): portal booking memakai `Room.defaultDepositRupiah` (sebelumnya 30% sewa), sama dengan booking publik & check-in manual.
- `sql/bootstrap.sql` + ALTER idempotent.

### Alur booking baru (A18)
1. Booking dibuat: DP = 30% sewa; jaminan = defaultDepositRupiah; SLA bayar DP = 3 jam (`expiresAt`).
2. Tenant upload bukti — dua nominal sah: **DP 30%** atau **pelunasan penuh** (sisa sewa + jaminan).
3. DP disetujui → invoice PARTIAL, `downPaymentPaid*` terisi, **kamar terkunci** (booking pesaing dibatalkan saat itu juga, tidak menunggu lunas), guard `expiresAt` mati.
4. Pelunasan disetujui → invoice PAID → kamar OCCUPIED, jaminan masuk deposit ledger + jurnal liability, meter dipromote (alur lama).
5. Tidak lunas hingga **H+1 pk 12:00 WIB setelah check-in** → job baru `runDownPaymentForfeit`: stay CANCELLED, invoice dibatalkan + reversal, **DP hangus** (`downPaymentForfeitedAt`), jurnal forfeit `DP_FORFEIT:{stayId}` (debit 1100 AR, kredit 4400 Penalty) — hanya diposting bila pembayaran DP terjurnal (hindari piutang fiktif), jaminan tidak tersentuh (belum dibayar).

### Overstay enforcement baru (A5)
- `runOverstayEnforcement` ditulis ulang: tenant promoted dengan `plannedCheckOutDate` lewat + belum checkout final → tiket `EVICT_OVERSTAY` otomatis setelah pk 12:00 WIB (dedupe per kamar). Definisi lama (perlu tenant baru yang bayar di kamar OCCUPIED) terbukti unreachable.

### Files
`schema.prisma`, `sql/bootstrap.sql`, `tenant-bookings.service.ts`, `tenant-bookings-helpers.ts`, `public-bookings.service.ts`, `payment-submissions.service.ts`, `payment-submissions.helpers.ts`, `accounting-posting.service.ts` (+`postDownPaymentForfeitTx`), `auto-ops.service.ts` (+`runDownPaymentForfeit`).

### Follow-up frontend (belum dikerjakan)
- Portal MyBookings: tampilkan dua opsi nominal (DP 30% / pelunasan) + status DP + deadline pelunasan; sekarang pesan error backend yang memandu nominal.
- Admin booking approval: label "Deposit" → "Deposit Jaminan"; tampilkan kolom DP di antrean review pembayaran.

<!-- KOST48_DOCS_SYNC_20260611_AUDIT_PASS_AB_FIX1 -->
## 2026-06-11 — V5.11.1 Audit Pass A/B — Fix Paket 1

### Type
Backend hardening only. No schema change. No DB reset. TypeScript PASS.
Referensi temuan: `docs/06_AUDIT_PASS_AB_2026-06-11.md` (flow map: `docs/05_FLOW_MAP.md`).

### Fixed
| Temuan | Perbaikan | File |
|---|---|---|
| A1 | Pembayaran manual ditolak untuk invoice booking belum aktif (room RESERVED + belum promoted) — wajib lewat Review Pembayaran agar aktivasi kamar/jaminan/meter berjalan | `invoice-payments.service.ts` (create) |
| A1 | Semua sweeper kini skip stay yang punya invoice PAID/PARTIAL ("uang masuk = keputusan manusia") | `auto-ops.service.ts` (expireBookingTx), `payment-submissions.service.ts` (expireBooking, runExpiryCheck, autoCancelRejectedExpiredBookingTx) |
| A2 | `expireBooking` & `runExpiryCheck` kini lock `FOR UPDATE OF s, r` + re-cek status/submission dalam transaksi (pola fix #3) — race vs approve tertutup | `payment-submissions.service.ts` |
| A4 | Job auto-ops jalan **sequential** (bukan `Promise.all`) | `auto-ops.service.ts` (runAll) |
| A4 | Noon-release & H+1 auto-cancel digabung ke satu metode `cancelEndedUnpaidStay`: lock + re-cek, skip bila ada pembayaran, batalkan invoice DRAFT/ISSUED dengan reversal blocking, forfeit dana terbayar (G2=A), lepas kamar hanya bila tidak ada stay ACTIVE lain | `auto-ops.service.ts` |

### Terminologi (ketetapan owner)
- **DP** = uang muka pesan kamar (bagian harga sewa, hangus bila gagal).
- **Deposit** = uang jaminan, dicek saat checkout, refundable.
- Temuan arsitektur **A18**: `Stay.depositAmountRupiah` saat ini mencampur keduanya — menunggu keputusan owner (lihat docs/06 §A18).

### Fixed — Paket 2 (P2 terisolasi)
| Temuan | Perbaikan | File |
|---|---|---|
| A6 | `update`/`remove` payment: lock `FOR UPDATE` invoice + cek jurnal & overpayment dipindah ke dalam transaksi | `invoice-payments.service.ts` |
| A7 | Line jurnal reversal payment kini berisi `description` (sebelumnya salah field `memo` → kosong); sortOrder mulai 0 | `accounting-posting.service.ts` |
| A9 | Check-in manual hanya boleh ke kamar AVAILABLE (MAINTENANCE/INACTIVE kini ditolak, bukan cuma OCCUPIED/RESERVED) | `stays.service.ts` |
| A10 | Booking path `createSubmission` menolak invoice DRAFT (konsisten dengan jalur invoice-only) | `payment-submissions.service.ts` |
| A12 | `syncInvoiceStatus` menulis `paidAt` = tanggal pembayaran terakhir, bukan `now()` | `invoice-payments.service.ts` |
| A16 | Copy error CANCELLED pada update payment diperbaiki | `invoice-payments.service.ts` |

### Fixed — Paket 3 (konsistensi accounting)
| Temuan | Perbaikan | File |
|---|---|---|
| A8 | Helper tunggal `reverseCancelledInvoiceJournalsTx`: pre-check jurnal POSTED → reversal **wajib sukses** (skip idempotent = OK) — dipakai di 4 jalur cancel yang sebelumnya warn-only (competing-cancel, expire manual, sweep expiry, auto-cancel pasca-reject) | `payment-submissions.service.ts` |
| A11 | Diverifikasi: auto-close SUDAH diblokir readiness `unmapped-operational` (hitung penuh, bukan sample) bila ada invoice/payment/expense/wifi tanpa jurnal. Celah tersisa (invoice CANCELLED lolos dari hitungan unmapped) ditutup oleh A8 | (tanpa perubahan kode) |

### Open (menunggu keputusan owner)
- A18 (pemisahan DP vs deposit jaminan + alur DP-only payment) — termasuk fakta baru: check-in manual masih pakai `defaultDepositRupiah`, portal pakai 30% sewa (dua rumus, satu field)
- A5 (definisi ulang trigger EVICT_OVERSTAY)
- A13–A15, A17 (P3, catatan ringan)

<!-- KOST48_DOCS_SYNC_20260611_AUDIT_FIX -->
## 2026-06-11 — V5.11.0 Audit Hardening & Business Logic Fixes

### Type
Backend refactor + schema additive + auto-ops expansion + security headers.
Schema: added `Stay.cancelReason` + fixed `RenewRequest.tenant` relation. No DB reset.

### Commits (5)
```
7bdcca3 fix: P2-20 trust proxy, P2-21 CSP header
cb43471 fix: #3 expiry race FOR UPDATE, #8 P2002 catch createSubmission
e030956 feat: auto-ops room release pk 12:00, forced checkout tiket staf, auto-cancel H+1 forfeit DP
73085b2 feat: DP 30% model - depositAmountRupiah = 30% × agreedRent sesuai pricingTerm
4cab5ee fix: terapkan audit fix ACT-1 s.d ACT-5 (11 temuan) + docs
```

### Audit Fix (11 temuan)
| # | Temuan | Perbaikan |
|---|--------|-----------|
| #1 | Stay.cancelReason schema drift | +field di schema.prisma + db push |
| #2 | Cancel stay skip accounting blocking | Pre-check journal POSTED sebelum reversal |
| #4 | Refund deposit fiktif | Hapus fallback ke depositAmount |
| #5 | DepositPortion tanpa cap | Cap ke depositRemaining |
| #6 | catch dalam transaksi | 5 lokasi → try/catch + logger.warn |
| #7 | Race overpayment manual | FOR UPDATE + validasi dalam transaksi |
| #9 | INVOICE_PAYMENT reversal | Method baru `postPaymentReversalTx` |
| #12 | Jurnal VOID blocking | Filter `status: { not: 'VOID' }` |
| #15 | RenewRequest.tenant relation | `Tenant` (not `Tenant?`) + Restrict |
| #16 | TOCTOU check-in manual | FOR UPDATE + re-validasi dalam transaksi |
| #3 | Expiry race TOCTOU | FOR UPDATE + re-cek submission sebelum cancel |

### Business Logic (Keputusan Owner G1-G5)
| Gap | Keputusan | Implementasi |
|-----|-----------|-------------|
| DP 30% | 30% × pricingTerm (G4=B) | depositAmountRupiah di createBooking |
| DP non-refundable | Hangus 100% jika gagal (G2=A) | auto-cancel H+1 forfeit |
| DP tidak pindah | Hangus total saat rebooking (G3=A) | depositStatus = FORFEITED |
| Room release | Pk 12:00 batas keras (G5=A) | runRoomReleaseAtNoon |
| Forced checkout | Sistem + tiket staf (G1=B) | runOverstayEnforcement → tiket EVICT_OVERSTAY |

### Auto-Ops Baru
- `runRoomReleaseAtNoon` — pk 12:00 WIB, lepas stay RESERVED yang overdue
- `runOverstayEnforcement` — auto-create tiket EVICT_OVERSTAY untuk staf
- `runPostCheckoutAutoCancel` — H+1 cancel + DP forfeit

### Security
- Trust proxy setting (`app.set('trust proxy', 1)`)
- Content-Security-Policy header
- PasswordHash stripped from AuditLog
- CSPRNG password generator (randomBytes)
- Generic Prisma error messages (no table/column leak)

### Docs
- `docs/06` s.d `09` + `05_BMI` → archived to `docs/archieve/`
- `docs/03_DECISIONS_LOG.md` — updated with G1-G5 decisions
- `docs/CHANGELOG.md` — this entry

### Files Changed (cumulative)
```
15 backend source files + 1 schema.prisma + 1 main.ts + db push
Total: +1.500 lines, 0 TypeScript errors
```

<!-- KOST48_DOCS_SYNC_20260602_V5100_CHARTS_REVIEW_TICKETS_CSS -->
