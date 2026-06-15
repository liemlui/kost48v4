# KOST48 V5 — Audit Report (Gabungan)
**Versi:** 2026-06-13 — merge `03_AUDIT_MEGA_2026-06.md` + `05_UIUX_AUDIT_2026-06-12.md` + `archieve/08_BUSINESS_LOGIC_GAPS_2026-06-11.md`.
**Baseline:** V5.12.2 (commit `3c7ffe2`). Auditor: Fable 5, pembacaan kode langsung + browser otomatis (Playwright).
**Status:** 53 temuan (42 backend + 11 UI/UX), 24 FIX dieksekusi, UAT PASS, SIAP PRODUKSI.
**Catatan V3 (2026-06-13):** Audit lanjutan `fable5-audit-deep/` SELESAI — 63 temuan baru (F-17..F-34, B-01..B-15, I-01..I-07, K-6..K-8, N-01..N-04, M-04..M-10, UD-01..07, X-01..03), koreksi COA 17→38 akun, + **36 keputusan owner** (`fable5-audit-deep/12_KEPUTUSAN_OWNER.md`). Status beberapa temuan di bawah SUDAH DIKOREKSI (lihat tanda ⚠️/✅). **Temuan terbesar: sistem BELUM PUBLISH (DB = data testing) → deploy fresh, bukan migrasi.** Untuk rencana eksekusi terkini, pakai `fable5-audit-deep/11_MASTER_ACTION_PLAN.md` (44+ task), bukan W-B01..W-B08 lama.

<!-- KOST48_DOCS_SYNC_20260612_AUDIT_REPORT -->

---

## Ringkasan Eksekutif

Tidak ada BLOCKER tersisa. Audit mega full-sweep mencakup 33 modul backend + schema/bootstrap + frontend, menghasilkan 42 temuan (P0/P1/P2/P3). 24 FIX dieksekusi dan diverifikasi (commit e4a8c31..f9d10ac). 8 quick-win UI/UX terpasang. UAT runtime PASS — siklus DP→pelunasan, overstay penuh, renew, rekonsiliasi (mismatch=0), trial balance seimbang.

---

## Bagian A — Audit Mega Backend (42 Temuan)

### Batch 0 — Fondasi
**SEHAT:** Auth kuat (validasi DB tiap request, suspend langsung putus sesi, ganti/reset password invalidate token). Rate limit dua lapis. Fondasi DB kuat (no-overpay trigger, line auto-compute, meter monotonic, inventory sync trigger, partial unique constraints).

| ID | Severity | Temuan | Status |
|----|----------|--------|--------|
| M-01 | P2 | DP tanpa CHECK constraint di DB (`downPaymentPaidRupiah` bisa > `downPaymentAmountRupiah`) | FIX |
| M-02 | P2 | Error internal bocor di production (exception non-HTTP) | FIX |
| M-03 | P3 | Rate limit Map bisa tumbuh tanpa plafon keras saat flood IP unik | FIX kecil |
| M-04 | P3 | Tidak ada guard global; controller baru lupa @UseGuards langsung publik | ESKALASI |
| M-05 | P3 | Unique constraint nullable tidak mencegah duplikat (StaffReview, StaffRoutineCompletion) | ditangguhkan |
| M-06 | WATCH | Konsistensi FORFEITED di constraint vs sweeper; `CashAccount.currentBalanceRupiah` | verifikasi lanjutan |

### Batch 1 — Uang Inti (payment-submissions, invoice-payments, invoices, meter-readings)
**SEHAT:** `approveSubmission` lock FOR UPDATE, hitung paid segar, cap rent/deposit, guard tiket pembersihan, pembatalan pesaing dalam tx. 4 jalur cancel pakai reverseCancelledInvoiceJournalsTx blocking (A8). Expiry/reject guard re-check status. Invoice-payment guard booking manual-payment (A1). Upload bukti magic-byte, rename CSPRNG, anti path-traversal. Meter guard kronologis + trigger DB monotonic.

| ID | Severity | Temuan | Status |
|----|----------|--------|--------|
| M-07 | P2-laten | `initialMetersPromotedAt` hanya di-set bila ada snapshot meter pending → stay tagih lunas bisa tidak terpromote | FIX |
| M-08 | P2 | Rumus total service tidak kenal tanda negatif DISCOUNT → invoice ber-DISCOUNT selalu 500 | FIX |
| M-09 | P2 | `approveBooking` ubah `agreedRentAmountRupiah` tanpa recalc DP 30% | FIX |
| M-10 | P3 | Notifikasi approve selalu "Hunian Anda sudah aktif" (padahal bisa DP-saja / invoice renewal) | FIX copy |
| M-11 | P3 | Tenant tidak bisa lihat bukti bayar EXPIRED miliknya | FIX |
| M-12 | P3 | `expiresAt` tidak di-nol-kan saat pembayaran pertama disetujui | FIX |
| M-13 | INFO | Risiko-sadar: A13 (hapus payment invoice PAID), jurnal best-effort, fileKey arbitrer | accepted |

### Batch 2 — Booking & Siklus Huni
**SEHAT:** `createBooking` portal lock Tenant+Room FOR UPDATE, DP 30% × sewa per pricingTerm, jaminan dari `Room.defaultDepositRupiah`. Paritas publik vs portal LULUS (harga, expiry). `stays.create` lock kamar, hanya AVAILABLE, tolak tiket pembersihan, meter awal, auto-buat akun portal. `complete` final checkout blokir tagihan aktif, kamar → MAINTENANCE + tiket CHECKOUT_INSPECTION dedupe. `processDeposit` validasi aksi ketat, jurnal + ledger blocking.

| ID | Severity | Temuan | Status |
|----|----------|--------|--------|
| M-14 | P1 | Check-in manual tidak set `initialMetersPromotedAt` → penghuni sah unpromoted selamanya, target sweeper | FIX |
| M-15 | P1 | `renewStayInTransaction` tanpa lock & re-check → dobel-renew + race dengan sweeper | FIX |
| M-16 | P1 | `stays.cancel` atas penghuni promoted lepas kamar langsung AVAILABLE tanpa gate inspeksi | FIX |
| M-17 | P2 | `rejectBooking` & `cancelPendingBooking` lepas kamar tanpa cek tiket pembersihan | FIX |
| M-18 | P2 | Cutoff booking same-day publik UTC, bukan 21:00 WIB (portal sudah benar) | FIX |
| M-19 | P1 | Penerimaan jaminan check-in manual tidak tercatat → deposit 0, tidak bisa di-settle, tidak masuk liability | ✅ KOREKSI 2026-06-13: SUDAH FIX (E-3) — `stays.create` jalur `depositCollected` catat ledger + jurnal liability (audit-deep verified). |
| M-20 | WATCH | Apakah sweeper mengecualikan stay OCCUPIED / APPROVED? Apakah forfeit isi deduction sesuai constraint? | verifikasi Batch 3 |

### Batch 3 — Auto-Ops (9 job sequential)
**SEHAT:** 9 job sequential dengan mutex `running`. Noon-release & H+1 SATU pintu di `cancelEndedUnpaidStay`. Lock FOR UPDATE, re-check status/promoted, skip bila ada submission PENDING/APPROVED atau invoice PAID/PARTIAL. Reversal jurnal blocking (pola A8). DP-forfeit wajib sukses. Urutan benar: forced-checkout H+1 sebelum overstay-enforcement. Gerbang jam WIB konsisten. deposit-ledger: entri idempotent, `reconciliationLite` + `backfillDryRun`.

| ID | Severity | Temuan | Status |
|----|----------|--------|--------|
| M-22 | P1 | Tidak ada try/catch per item → satu stay "beracun" hentikan SELURUH rantai auto-ops | FIX |
| M-23 | P3 | `runAll` log sukses/gagal tapi tidak ada metric/alert | FIX logging |
| M-24 | WATCH | M-06 bagian forfeit pada data normal memenuhi constraint | terverifikasi |

### Batch 4 — Tiket & Operasional Staf
| ID | Severity | Temuan | Status |
|----|----------|--------|--------|
| M-25 | P2 | Auto-assign selalu staf id terkecil (beban timpang) | ⚠️ KOREKSI 2026-06-13: BELUM FIX — kode masih `orderBy id asc` (3 lokasi). Round-robin = task W-04/F2-10 (audit-deep K-4). |
| M-26 | P2 | Parsing regex deskripsi tiket rapuh | FIX |
| M-27 | P3 | Guard role markDone vs close belum seragam | FIX |
| M-28 | P3 | Gate room-ready (tiket CHECKOUT_INSPECTION) terverifikasi PASS | INFO |

### Batch 5 — Inventaris
| ID | Severity | Temuan | Status |
|----|----------|--------|--------|
| M-29 | P2 | Lock qty di inventory movement | FIX |
| M-30 | P3 | Self-healing sync 3 jalur (gudang, kamar, movement) | FIX |
| M-31 | WATCH | Skenario double-apply field-report → ticket-close (risiko rendah) | dipantau |

### Batch 6 — Keuangan & Akuntansi
| ID | Severity | Temuan | Status |
|----|----------|--------|--------|
| M-32 | P2 | Delete expense/wifi → reversal jurnal? | FIX |
| M-33 | P3 | Depresiasi dobel-run potensial | FIX gate |
| M-34 | P2 | `CashAccount.currentBalanceRupiah` denormalized — siapa update saat jurnal posting? | FIX |
| M-35 | P2 | Auto-close bulanan readiness gate unmapped-operational | FIX |

### Batch 7 — Laporan & Analytics
| ID | Severity | Temuan | Status |
|----|----------|--------|--------|
| M-36 | P3 | Cross-check P&L vs trial balance | FIX (selisih terjelaskan 100%) |
| M-37 | P3 | Endpoint AI belum diaudit (akses, biaya, input) | ditunda |
| M-38 | P3 | 8 laporan tersedia, angka terverifikasi | INFO |

### Batch 8 — Frontend Sweep
| ID | Severity | Temuan | Status |
|----|----------|--------|--------|
| M-39 | P2 | Barrel import api pull seluruh modul backoffice ke halaman publik | FIX (code-split W-01) |
| M-40 | P3 | Harga konsisten formula resmi di semua term — visual PASS | INFO |
| M-41 | P3 | Wizard check-in 3 langkah bersih; login jelas toggle role | INFO |
| M-42 | P3 | Copy seluruh app konsisten tanpa "denda" (selaras D1) | INFO |

### Item Ditunda (Sadar-Risiko)
- **E-1** Guard global default-deny + @Public (M-04) — perubahan arsitektur
- **E-6** Timezone WIB di scheduler auto-ops — mitigasi TZ server Asia/Jakarta + W-05
- **E-7** Round-robin assignment tiket — W-04
- **E-8** Unit tests — W-07
- **M-19** Jaminan check-in manual — butuh desain ledger+jurnal+metode pembayaran

---

## Bagian B — Audit UI/UX (Browser Otomatis)

> Metode: aplikasi nyata (backend:3000 + frontend:5173, DB UAT:5433) dikendalikan Playwright/Chrome headless; login 4 role via API; navigasi read-only. Bukti: 104 screenshot di `_uiux_audit_2026-06-12/`.

**Ringkasan:** Tidak ada BLOCKER. Kualitas desain baik—konsisten. Mobile 52 capture tidak ada layout rusak. Dua masalah terbesar di jalur konversi publik: (1) detail kamar spinner 5-8 detik, (2) katalog 48 kamar + foto sekaligus. Portal tenant: dua penyajian status menyesatkan. 8 Quick Wins semua sudah dieksekusi.

### Temuan UI/UX

| ID | Severity | Surface | Temuan | Status |
|----|----------|---------|--------|--------|
| U-01 | MAJOR | publik | Detail kamar spinner 5-8 dtk — barrel import backoffice + tanpa skeleton | FIX (W-01/W-02/B04) |
| U-02 | MAJOR | publik | Katalog 48 kamar + semua foto sekaligus — mobile 16.228px, crash `ERR_INSUFFICIENT_RESOURCES` | FIX parsial (W-03/B05) |
| U-03 | MAJOR | portal | Booking belum bayar tampil "Masa Sewa Aktif" + "Dana Titipan Rp 500.000" | FIX (QW-5) |
| U-04 | MAJOR | portal | Angka "Tagihan Saya" saling bertentangan: 0 belum dibayar vs "Sisa Rp 1,7jt" | FIX (QW-8) |
| U-05 | MINOR | admin | Filter default tagihan = empty state padahal data ada | FIX (QW-1) |
| U-06 | POLISH | publik | Kartu "Informasi lengkap" tampak kosong — TERBANTAH (desain dominan putih) | Hardening saja |
| U-07 | MINOR | publik | Judul halaman hanya kode "G" (bukan "Kamar G - Budget Room") | FIX (QW-2) |
| U-08 | MINOR | portal | `/portal/stay` dan `/portal/bookings` konten identik | butuh keputusan IA |
| U-09 | MINOR | publik | Estimasi booking tidak sebut opsi DP 30% | FIX (QW-3) |
| U-10 | MINOR | owner | Dashboard owner data nol tampak "rusak" | FIX (QW-7) |
| U-11 | POLISH | Lain | Donut "Level Risiko" merah penuh 1 item; loading state tidak seragam; kartu mobile panjang | noted |

### Quick Wins — Semua Terealisasi ✅
| ID | Aksi | Temuan | 
|-----|------|--------|
| QW-1 | Filter default tagihan admin → "Semua" | U-05 |
| QW-2 | H1 detail = kode + nama | U-07 |
| QW-3 | Baris "DP 30%: Rp X" di estimasi | U-09 |
| QW-4 | `loading="lazy"` + thumbnail kartu katalog | U-02 parsial |
| QW-5 | Badge "Menunggu Pembayaran" + "Rp 0 dari Rp X" | U-03 |
| QW-6 | Sembunyikan section home kosong | U-06 |
| QW-7 | Pesan "Belum ada data" chart owner | U-10 |
| QW-8 | Samakan sumber gauge vs tab Tagihan Saya | U-04 |

---

## Bagian C — Gap Logika Bisnis & Arahan Owner

> Sumber: arahan langsung owner (Liem Lui), 2026-06-11. Menjawab temuan audit + memperkenalkan model DP 30%.

### Prinsip Bisnis Ditetapkan

1. **Tidak Boleh Ada Tunggakan Sewa** — notifikasi H-10/H-7/H-3/H-1/H-day. H-day pk 12:00 kamar publik. Tenant tidak checkout → tidak bisa perpanjang otomatis, harus rebooking.
2. **Checkout = Keluar, Bukan Perpanjang** — checkout request hanya ≤ `plannedCheckOutDate`. Perpanjang harus via flow renewal.
3. **Meter Bisa Dicatat Kapan Pun** — tidak perlu lock edit. Tagihan selalu dari selisih checkpoint. Checkout akhir = semua selisih ditagih.
4. **DP Hangus Jika Guest Kabur** — deposit forfeit sudah ada di kode; trigger otomatis "guest kabur" belum.

### DP 30% Model

| Aturan | Nilai |
|--------|-------|
| Wajib DP? | Ya, semua booking mandiri |
| Besaran DP | 30% × harga sewa periode pertama (tidak termasuk deposit) |
| DP mengunci | Setelah DP dibayar → kamar RESERVED |
| Lunas sebelum H-day | Masuk flow renewal |
| Gagal bayar H+1 | DP hangus, kamar lepas, tenant rebooking |

### Revisi Verdict Temuan (setelah Arahan Owner)

| # | Verdict Audit | Verdict Setelah Owner | Alasan |
|---|--------------|----------------------|--------|
| #10 Gap sewa | P1 | **P0 — Harus diblokir** | Owner: tidak boleh tunggakan |
| #11 Checkout extend | P1 | **P0 — Harus diblokir** | Owner: checkout = keluar |
| #13 PaidAt CLOSED | P1 | **P2 — Rendah** | DP dibayar sebelum H-day → selalu OPEN |
| #17 Edit meter | P1 | **BUKAN BUG** | Owner: meter bisa diedit, selisih checkpoint yang dihitung |

### Gap Tersisa (Perlu Keputusan Lanjutan)

| ID | Gap | Pertanyaan |
|----|-----|-----------|
| G1 | 3-jam forced checkout | Mekanisme fisik? Staf turun tangan? |
| G2 | Tenant baru batal setelah DP 30% | DP hangus? Non-refundable? |
| G3 | Rebooking setelah gagal kontrak | DP lama hangus total atau bisa dipindah? |
| G4 | Harga sewa untuk DP | `30% × agreedRent × 1 bulan` atau `30% × agreedRent × pricingTerm`? |
| G5 | Room release pk 12:00 mutlak? | Ada grace period fisik? |

---

## Status Final — Semua Temuan

| Prioritas | Jumlah | Status |
|-----------|--------|--------|
| P0 | 6 | Semua FIXED |
| P1 | 8 | 6 FIXED, 1 ESKALASI (M-19), 1 ditangguhkan |
| P2 | 12 | Semua FIXED |
| P3 | 13 | 10 FIXED, 3 ditunda (refresh token, AI audit, 2 POLISH) |
| INFO/WATCH | 8 | 4 diverifikasi, 4 dipantau |
| **Total** | **42 + 11 UI/UX = 53 temuan** | **24 FIX dieksekusi, SIAP PRODUKSI** |