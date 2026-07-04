# KOST48 V5 - Keuangan, Pembayaran, Invoice, Akuntansi

> File hasil pemampatan dari dokumen root `docs/`. File sumber lama sudah diarsipkan ke `docs/archieve/2026-06-16_root_docs_pre_M/`.

## Tujuan

Semua fondasi keuangan: harness verifikasi, pembayaran/invoice, accounting, laporan, dan gate UAT finance.

## Sumber Digabung

- `docs/05_VERIFIKASI_KEUANGAN.md` - konten dipertahankan
- `docs/10_PEMBAYARAN_INVOICE.md` - konten dipertahankan
- `docs/13_AKUNTANSI_LAPORAN.md` - konten dipertahankan

## Catatan Pemakaian

- Jadikan file ini pintu masuk tematik; bila butuh detail mentah, cek file sumber di arsip yang disebut di atas.
- Heading asli dinaikkan levelnya agar tidak bertabrakan dengan struktur M-file.

## Update 2026-06-30 — Override Booking Flow Fase V

**Kontrak room status final mengikuti Fase V di `docs/M12_CHECKLIST_CHANGELOG.md`:**

```txt
Booking dibuat, belum bayar        -> Room AVAILABLE
DP 30% approved                    -> Room RESERVED
Full payment approved              -> Room RESERVED
Check-in/serah kunci setelah lunas  -> Room OCCUPIED
```

Aturan baru yang memengaruhi keuangan:

- **`RESERVED` bukan sinonim lunas.** DP dan lunas sama-sama reserved; status pembayaran dibaca dari invoice/payment, bukan dari status kamar dan bukan dari `downPaymentPaidRupiah`.
- **Payment approval tidak boleh promote meter/occupancy.** `initialMetersPromotedAt` hanya di-set saat check-in.
- **Check-in/serah kunci wajib invoice sewa awal lunas.** Saat itulah meter awal dipromosikan dan room menjadi `OCCUPIED`.
- **Booking pesaing unpaid dibatalkan** saat pemenang payment approved; pesaing yang sudah transfer perlu jalur refund kalah-cepat.
- Label `Reserved-DP` vs `Reserved-Lunas` dibedakan dari payment data, bukan room status.

Untuk eksekusi coding, AI eksekutor WAJIB membaca `docs/M12_CHECKLIST_CHANGELOG.md` Fase V (V-00..V-16) sebagai sumber kebenaran, bukan narasi historis di bagian lama dokumen ini.

## Update 2026-06-20 — Fase K: Unifikasi Arus Kas ✅

**Dua "Arus Kas" yang berbeda (operasional approximation vs ledger-backed direct method) sudah diunifikasi (R2).** `GET /reports/cash-flow` dihapus — semua laporan arus kas kini pakai `GET /accounting/cashflow` (direct method, termasuk deposit + investasi + pendanaan). Frontend `ReportsPage` tab Operasional kini mengambil dari `fetchCashflowStatement()`. Deposit handling normal checkout juga diselaraskan dengan forced checkout (auto-cover semua invoice, tidak hanya meter).

## Update 2026-06-17 — AUDIT KEUANGAN ULTRA ✅

**Hasil audit menyeluruh (17 Juni 2026):**

| Invariant | Status |
|-----------|--------|
| Trial Balance `isBalanced: True` | ✅ LULUS |
| Deposit Reconciliation MATCHED (16 stay, Rp8jt) | ✅ LULUS |
| Cashflow `beginning+net=ending` (unit test 13/13) | ✅ LULUS |
| Financial Ratios expenseRatio benar (unit test 12/12) | ✅ LULUS |
| 8 Invarian M04 §1 | ✅ SEMUA PASS |
| 7 DO-NOT-TOUCH blocks | ✅ SEMUA UTUH |
| Dead code: `postPaymentReversalTx` (0 pemanggil) | 🟡 Minor |
| Unmapped transactions | ✅ 0 |
| PSAK 72 RentRecognitionSchedule | ✅ 0 stranded |

**Detail:** Audit ultra teliti 5 jalur: Chain of Custody (Invoice→Jurnal→TB), Invarian Akuntansi, High-Risk Flows (Booking/Checkout/Renewal/Meter/Forced), Dead Code, PSAK 72.

## Update 2026-06-16 - SI-4 Invoice Purpose

Sesuai analisa PDF dan temuan owner 2026-06-16, invoice tidak boleh hanya terbaca sebagai nomor. UI harus menjawab "tagihan ini buat apa" sebelum tenant/admin membuka detail.

- **SI-4 selesai:** `invoicePurposeLabel` dan `invoicePurposeMeta` menurunkan peruntukan dari `InvoiceLineType`.
- Label utama: `Sewa`, `Listrik`, `Air`, `Listrik & Air`, `Sewa + Listrik`, `Uang Muka (DP)`, `WiFi`, dan `Denda`.
- Badge "Tagihan <peruntukan>" tampil di daftar tenant, daftar backoffice, detail invoice backoffice, dan detail invoice tenant; nomor invoice turun menjadi subteks.
- Tidak ada migrasi schema: peruntukan diturunkan dari baris invoice, bukan kolom baru.
- Prinsip bisnis: kejelasan invoice mengurangi dispute, memperkuat trust, dan menyambungkan pembayaran ke riwayat sewa.

## Update 2026-06-19 - Fase G AI Finance Analyst

AI finance hanya boleh menjadi analis dan pembuat draft keputusan Owner/Admin. Detail implementasi ada di `docs/M09_AI_OWNER_ADMIN.md`.

- **Manual only:** tombol seperti "Analisa Finance dengan AI" tidak boleh terpanggil otomatis saat halaman finance dibuka.
- **Owner-only untuk analisa mendalam:** AI membaca snapshot trial balance, P&L, cashflow, ratios, readiness, period close, dan deposit reconciliation; output berupa temuan, risiko, dan rekomendasi.
- **Tidak boleh mutasi ledger:** AI tidak boleh membuat/mengubah `JournalEntry`, `Invoice`, `InvoicePayment`, `Expense`, `AccountingPeriod`, `CashAccount`, atau `OpeningBalance`.
- **Guard tetap deterministik:** trial balance, no-partial, deposit liability, period OPEN/CLOSED, dan readiness tetap milik service accounting. Jika AI berbeda pendapat dengan guard backend, backend menang.
- **Expense OCR draft:** nota biaya boleh di-OCR lokal lalu AI menormalkan teks menjadi draft expense. Admin/Owner tetap mengoreksi dan klik simpan; posting expense/jurnal mengikuti service existing.
- **Audit trail:** jika rekomendasi AI dipakai untuk approve/reject pembayaran atau membuat expense, catat `AuditLog.meta.ai` berisi feature, model, promptHash, snapshotHash, confidence, dan humanDecision.

## Update 2026-06-30 - Payment Booking Fase V

Keputusan booking awal Fase V mengubah arti status kamar, tetapi tidak mengubah prinsip keuangan:

- DP 30% approved dan pelunasan approved sama-sama mengunci room menjadi `RESERVED`.
- `RESERVED` bukan bukti lunas; bukti lunas tetap invoice `PAID` atau total pembayaran invoice >= total tagihan.
- Payment approval tidak boleh mengubah room ke `OCCUPIED`, tidak boleh promote meter, dan tidak boleh mengisi `initialMetersPromotedAt`.
- Check-in/serah kunci wajib lunas penuh; baru setelah itu room `OCCUPIED` dan revenue/lifecycle hunian mengikuti flow promoted.
- Payment proof wajib punya ownership server-side; batch payment tidak boleh membuat submission tanpa file bukti yang terikat user/tenant.
- Guard no-partial tetap berlaku: nominal sah booking adalah DP tepat atau pelunasan tepat sesuai sisa kewajiban yang dihitung server.

## Bagian 1 - `docs/05_VERIFIKASI_KEUANGAN.md`

### 05 — HARNESS VERIFIKASI KEUANGAN (jaring pengaman AI eksekutor)
**Tujuan:** memastikan **hitungan keuangan tetap handal** saat kode disentuh AI lemah. `tsc 0` TIDAK cukup — kode bisa lolos compile tapi salah angka (bukti: bug F-18 = kembaran F-01 yang lolos audit V1). Jalankan harness ini SETELAH tiap task keuangan (dossier 13) dan tiap task uang (dossier 10/12).
**Aturan inti:** kalau salah satu cek di bawah GAGAL → **JANGAN commit**, perbaiki dulu. Kalau tak yakin → STOP & lapor.

---
#### 1. INVARIAN KEUANGAN (HARAM dilanggar — kalau pernah false, ada bug)
1. **Setiap JournalEntry balance:** Σ debit = Σ kredit (DB-enforced; jangan matikan guard `postBalancedJournalTx`).
2. **Idempotent:** 1 (sourceType, sourceId) = maksimal 1 jurnal POSTED non-VOID.
3. **Deposit = LIABILITY** (akun 2000), bukan revenue. Saldo 2000 TIDAK pernah debit (kalau debit → F-24 belum difix).
4. **Kas = akun prefix `10` (1000/1010/1020)**, BUKAN `11` (1100 = PIUTANG). Cashflow/rasio yang menyebut "kas" harus pakai `cashAccountId` atau prefix `10`.
5. **No-partial:** total pembayaran = DP-persis ATAU pelunasan-penuh; invoice tak pernah PARTIAL liar.
6. **Trial Balance seimbang:** total debit = total kredit (sampai ke rupiah).
7. **Rekonsiliasi deposit: mismatch = 0** (snapshot stay = ledger = akun 2000).
8. **Revenue ≠ invoice DRAFT** (DRAFT belum diterbitkan, bukan pendapatan).

#### 2. ⛔ DO-NOT-TOUCH (kode SUDAH BENAR — jangan "diperbaiki")
| Kode | Lokasi | Kenapa jangan disentuh |
|---|---|---|
| `postBalancedJournalTx` (inti jurnal) | `accounting-posting.service.ts:1110-1216` | Guard balance+idempotent+periode OPEN. Mesin jurnal SEHAT. |
| Blok saldo kas E-4 | `accounting-reports.service.ts:837-862` | Saldo per CashAccount = opening + Σ(D−K) line ber-cashAccountId. SUDAH BENAR — F1-3 meniru pola INI, jangan ubah blok ini. |
| 10 fungsi posting (D/K) | `accounting-posting.service.ts:128-849` | Semua balance+idempotent. Hanya F1-8 (settlement guard) yang menambah CEK, bukan ubah jurnal. |
| Trial Balance + opening fallback | `accounting-reports.service.ts:27-95` | Anti-double-count. |
| Tutup buku (closing/reopen versioned) | `accounting-period-close.service.ts` | Paling matang; jangan utak-atik. |
| `recalculateInvoiceTotal` (DISCOUNT−) | `invoices.service.ts:423-442` | Konsisten dgn trigger DB. |

#### 3. UNIT TEST (zero-dependency — pakai test runner BAWAAN Node, TANPA npm install)
> Proyek belum punya jest. JANGAN install. Pakai `node --test` (Node ≥18) terhadap hasil build `dist/`. Test = file CommonJS di `backend/test/unit/`.
**Cara jalankan:** `cd backend && npm run build && node --test "test/**/*.test.js"` → harus semua PASS (hijau). (Catatan: `node --test test/` GAGAL di Node 22/Windows — pakai pola glob ini.)
**Script siap-pakai (sudah ditambahkan):** di `package.json` → `"test:unit": "node --test \"test/**/*.test.js\""` → jalankan `npm run test:unit`.

##### File 1 — `backend/test/unit/pricing.test.js` (SIAP PAKAI — angka sudah diverifikasi dari kode)
```js
const test = require('node:test');
const assert = require('node:assert');
const P = require('../../dist/modules/tenant-bookings/pricing.helper.js');

test('calculateRentByPricingTerm — tarif bulanan 1.700.000 (owner decision: WEEKLY=0.5, SMESTERLY=5.7, YEARLY=11)', () => {
  assert.strictEqual(P.calculateRentByPricingTerm(1700000, 'DAILY'), 225000);    // 221.000 → bulat naik 5.000
  assert.strictEqual(P.calculateRentByPricingTerm(1700000, 'WEEKLY'), 850000);   // 0.5 × 1.700.000 = 850.000
  assert.strictEqual(P.calculateRentByPricingTerm(1700000, 'BIWEEKLY'), 1275000); // 0.75 × 1.700.000 = 1.275.000 → 1.275.000
  assert.strictEqual(P.calculateRentByPricingTerm(1700000, 'MONTHLY'), 1700000);
  assert.strictEqual(P.calculateRentByPricingTerm(1700000, 'SMESTERLY'), 9690000); // 5.7 × 1.700.000 = 9.690.000 → 9.690.000
  assert.strictEqual(P.calculateRentByPricingTerm(1700000, 'YEARLY'), 18700000);   // 11.0 × 1.700.000 = 18.700.000 → 18.700.000
});
test('pembulatan naik ke 5.000', () => {
  assert.strictEqual(P.calculateRentByPricingTerm(1333000, 'DAILY'), 175000);    // 173.290 → 175.000
  assert.strictEqual(P.roundUpToNearest(1, 5000), 5000);
  assert.strictEqual(P.roundUpToNearest(5000, 5000), 5000);
  assert.strictEqual(P.roundUpToNearest(0), 0);
  assert.strictEqual(P.roundUpToNearest(-5), 0);
});
test('term tidak valid / rate 0 → 0', () => {
  assert.strictEqual(P.calculateRentByPricingTerm(0, 'MONTHLY'), 0);
  assert.strictEqual(P.calculateRentByPricingTerm(1000000, 'XXX'), 0);
});
test('utilitas included hanya term pendek', () => {
  for (const t of ['DAILY','WEEKLY','BIWEEKLY']) assert.strictEqual(P.isUtilitiesIncludedForPricingTerm(t), true);
  for (const t of ['MONTHLY','SMESTERLY','YEARLY']) assert.strictEqual(P.isUtilitiesIncludedForPricingTerm(t), false);
});
```

##### File 2 — `backend/test/unit/periode.test.js` (SIAP PAKAI — UTC, exclusive end)
```js
const test = require('node:test');
const assert = require('node:assert');
const S = require('../../dist/modules/stays/stays.helpers.js');
const iso = (d) => d.toISOString().slice(0, 10);

test('calculatePeriodEnd — end eksklusif', () => {
  assert.strictEqual(iso(S.calculatePeriodEnd(new Date(Date.UTC(2026,8,1)), 'DAILY')),   '2026-09-02');
  assert.strictEqual(iso(S.calculatePeriodEnd(new Date(Date.UTC(2026,8,1)), 'WEEKLY')),  '2026-09-08');
  assert.strictEqual(iso(S.calculatePeriodEnd(new Date(Date.UTC(2026,8,1)), 'MONTHLY')), '2026-10-01');
});
test('addCalendarMonthsClamped — clamp akhir bulan', () => {
  assert.strictEqual(iso(S.calculatePeriodEnd(new Date(Date.UTC(2026,0,31)), 'MONTHLY')), '2026-02-28'); // 31 Jan +1bln → 28 Feb
});
```

##### File 3 — `backend/test/unit/cashflow-classifier.test.js` (BUAT SAAT F1-3)
Saat F1-3 mengekstrak fungsi classifier kas (deteksi line kas via `cashAccountId != null`, klasifikasi sekali per line), tulis test: line ber-cashAccountId debit → operating-in; line AR (1100) → BUKAN kas (operating-in = 0); OPENING_BALANCE → bukan arus operasi. **DP/angka harapan: lihat skenario emas §5.**

> Fungsi lain (DP 30% = `Math.round(rent*30/100)`, splitRent/Deposit) ada di service (bukan helper murni) — diuji via skenario emas §5, bukan unit test.

#### 4. HARNESS REKONSILIASI (alat audit BAWAAN — jalankan tiap selesai task finance)
| Endpoint | Harapan SEHAT | Kalau GAGAL artinya |
|---|---|---|
| `GET /api/accounting/trial-balance` | `isBalanced: true` (debit=kredit) | ada jurnal tak balance → bug posting |
| `GET /api/deposit-ledger/reconciliation-lite` | `mismatch: 0` | snapshot stay ≠ ledger → bug deposit |
| `GET /api/accounting/deposit-reconciliation` | `reconciliationStatus: MATCHED` (atau OPENING_BALANCE_ONLY) | akun 2000 ≠ operational held → F-24/F-06 |
| `GET /api/accounting/cashflow` | beginning + netCashflow = ending | breakdown arus salah → F1-3 belum benar |
| `GET /api/accounting/financial-ratios` | expenseRatio masuk akal (mis. 25, bukan 1e8); occupancy>0 saat ada penghuni | F-02/F-04/F-18 belum benar |

**Aturan:** jalankan SEBELUM mulai (catat baseline) & SESUDAH task. Angka boleh berubah, tapi invarian §1 harus tetap true.

#### 5. SKENARIO EMAS (end-to-end, angka eksak — verifikasi setelah Fase 1)
Di DB bersih + COA seeded + CashAccount Cash(1000)+Bank(1010) + periode OPEN:
1. Kamar tarif bulanan **1.700.000**, deposit **500.000**. Booking MONTHLY → DP 30% = **510.000**.
2. Tenant bayar DP 510.000 (transfer) → approve → jurnal `INVOICE_PAYMENT` D Bank 510.000 / K AR 510.000. Kamar RESERVED, expiresAt null.
3. Pelunasan = sisa sewa (1.700.000−510.000=1.190.000) + deposit 500.000 = **1.690.000** → approve → kamar OCCUPIED, meter promoted. Deposit → jurnal D Bank / K 2000 (liability) 500.000.
4. **Cek:** trial-balance seimbang; cashflow operating-in bulan ini = 510.000+1.190.000 = **1.700.000** (kas dari pelunasan sewa) — BUKAN angka AR; deposit 500.000 masuk kas tapi kredit 2000 (liability, bukan revenue). reconciliation-lite mismatch=0.
5. Checkout → settlement FULL_REFUND 500.000 → D 2000 / K Bank 500.000 → saldo 2000 kembali 0. reconciliation MATCHED.
> Bila angka cashflow menampilkan mutasi PIUTANG (1100) sebagai "kas" → F1-3 belum benar. Bila expenseRatio = jutaan persen → F1-4 belum benar.

#### 6. GATE PER-TASK (centang sebelum commit task finance)
- [ ] `tsc --noEmit` 0 error.
- [ ] `npm run test:unit` (`node --test "test/**/*.test.js"`) semua PASS (kalau task menyentuh fungsi ber-test).
- [ ] 5 invarian §1 yang relevan tetap true (cek via §4 endpoint).
- [ ] Angka harapan task terpenuhi (lihat "selesai bila" di `08_CHECKLIST` / dossier 13).
- [ ] Tidak menyentuh kode di DO-NOT-TOUCH §2.
- Kalau ada yang ✗ → JANGAN commit; perbaiki atau STOP & lapor.


## Bagian 2 - `docs/10_PEMBAYARAN_INVOICE.md`

### DOSSIER 10 — PEMBAYARAN & INVOICE
**Domain:** alur uang masuk inti — bukti bayar tenant, review/approve admin, invoice & pembayaran manual, meter reading. **Flow 3 & 4.**
**Status:** 🟢 KUAT secara arsitektur (lock, cap, reversal blocking). Sisa: penegakan no-partial di titik approve + guard hapus payment.
**File inti:** `payment-submissions.service.ts` (1.564 baris — terbesar), `invoice-payments.service.ts` (283), `invoices.service.ts` (535), `meter-readings.service.ts`.

---
#### 1. Aturan bisnis (sumber: keputusan owner — lihat `03_KEPUTUSAN_OWNER.md`)
- **NO-PARTIAL MENYELURUH (D-02):** nominal pembayaran yang sah HANYA: (a) DP 30% persis, atau (b) pelunasan penuh = sisa invoice + sisa deposit. Jalur invoice-only (renewal/utilitas) wajib LUNAS penuh. Tidak ada cicilan di mana pun.
- **Gate dua-nominal-sah A18** sudah ada di `createSubmission:122-135`; WAJIB direplikasi di `approveSubmission` (lihat task F1-1R).
- **Admin tak boleh hapus/ubah payment kamar OCCUPIED (GAP #3):** payment berjurnal sudah diblokir; payment tanpa-jurnal masih bisa dihapus saat promoted → harus diberi guard.
- Invoice status teknis tetap **DRAFT → ISSUED → PARTIAL → PAID / CANCELLED**. `PARTIAL` sah hanya sebagai hasil DP 30% yang tepat; cicilan dengan nominal bebas dilarang.
- Pembayaran booking WAJIB lewat approve bukti (bukan pembayaran manual) — guard A1 di `invoice-payments.create:142-150`.
- Reversal jurnal saat cancel = BLOCKING (pola A8) di semua jalur.

#### 2. Peta kode (detail chain di `02_FLOW_MAP.md` §3-4)
| Aksi | Lokasi |
|---|---|
| Tenant upload bukti | `payment-submissions.service.ts:52` createSubmission; gate nominal :122-135 |
| Approve admin (aktivasi kamar+meter+first-paid-wins) | `:353` approveSubmission; split rent/deposit :406-430; OCCUPIED :587; promosi meter :630-686 |
| Batal pesaing first-paid-wins | `:736` cancelCompetingUnpaidBookingsTx |
| Pembayaran manual admin | `invoice-payments.service.ts:113` create (lock+anti-overpay), :237 remove (guard jurnal :245) |
| Issue/cancel invoice | `invoices.service.ts:444` issue, :480 cancel (lock+reversal blocking) |

#### 3. Temuan audit (semua, dua-lapis: dampak bisnis + lokasi/fix)
> 🔄 **SINKRON KODE (2026-06-15, audit menyeluruh):** tabel di bawah BASI — item berikut SUDAH SELESAI di kode (terverifikasi langsung): **B-01/F1-1R** no-partial menyeluruh (`payment-submissions.service.ts:418-450` gate approve + `invoice-payments.service.ts:167-172,223-228` manual lunas penuh); **GAP#3/F1-2** guard payment OCCUPIED (`invoice-payments.service.ts:270-276`). Severity 🔴/🟠 di tabel = status historis, bukan TODO aktif.
| ID | Sev | Dampak bisnis | Lokasi kode | Fix / Task |
|---|---|---|---|---|
| B-01 | 🔴 P1 | GAP #1 sebagian tertutup; approve tidak re-validasi nominal dan pembayaran manual admin masih dapat mencatat nominal parsial. | `payment-submissions.service.ts` approve + `invoice-payments.service.ts` create/update | **F1-1R**: gate dua nominal booking; invoice-only/manual wajib lunas penuh |
| GAP#3/B-04 | 🟠 P2 | Admin bisa hapus payment kamar yang sudah ditempati bila jurnalnya gagal/skip → occupancy vs uang inkonsisten tanpa jejak. | `invoice-payments.service.ts:237` remove, :189 update | **F1-2**: 409 bila stay promoted / room OCCUPIED |
| F-09 | 🟠 P2 | Invoice DRAFT ikut dihitung pendapatan di laporan → revenue overstated. (Detail di `13_AKUNTANSI_LAPORAN`.) | reports/finance agregat | **F1-7** (lihat dossier 13) |
| B-09 | 🟡 P3 | Kebijakan posting jurnal tak konsisten: issue MELEMPAR bila gagal, tapi check-in/renew MENELAN error → invoice gagal-jurnal hanya tertangkap readiness. | `invoices.service.ts:136-137` vs `stays.service.ts:361-368` | Satukan pakai `resolveInvoiceAccountingMetadata` |
| B-11 | ✅ RESOLVED (F3-13, 2026-06-14) | Promosi meter dedupe per (room,utility,tanggal): bila ada reading di tanggal sama (rebooking sehari) dgn nilai BERBEDA, snapshot baru yang dibuang kini **dicatat `logger.warn`** → tak lagi diam-diam; admin diingatkan cek tagihan utilitas awal. Perilaku dedupe & bentuk response tak diubah (flag response = lanjutan opsional). | `payment-submissions.service.ts` (blok promote meter) | **F3-13 (B-11 selesai)** |
| F-29 | 🟡 INFO | `postPaymentReversalTx` = DEAD CODE (0 pemanggil); remove payment berjurnal kini diblokir. FLOW_MAP §4 lama menyebutnya → drift. | `accounting-posting.service.ts:741` | Hapus / dokumentasikan |
| B-02 | ✅ RESOLVED | Notif kalah-cepat sudah dua varian: tenant yang punya PaymentSubmission/DP tercatat diarahkan ke refund; tenant yang belum transfer diarahkan memilih kamar lain. Pencatatan bukti refund tetap F2-3b. | `payment-submissions.notifyLosingTenants` | **F2-3 selesai; F2-3b belum** |
| B-13 | ✅ positif | Tarif TERKUNCI setelah DP dibayar (tak bisa diubah saat approve) — cegah manipulasi. | `tenant-bookings.service.ts:326-344` | pertahankan |

#### 4. Task (urutan & spec lengkap)
##### F1-1R · 🔴 FASE 1 · No-partial menyeluruh
- **File:** `payment-submissions.service.ts` approve booking/invoice-only; `invoice-payments.service.ts` create/update pembayaran manual.
- **Spec:** (a) booking: replikasi gate createSubmission di approve — tolak bila amount bukan sisa DP tepat dan bukan pelunasan penuh; (b) submission invoice-only wajib sama dengan sisa tagihan; (c) pembayaran manual non-booking wajib melunasi sisa invoice, bukan membuat cicilan bebas.
- **Kriteria selesai:** DP tepat ✅; pelunasan tepat ✅; renewal/utilitas/manual lunas ✅; semua nominal kurang/aneh → 409; tsc 0.
- **Larangan:** JANGAN pakai spek V1 lama ("tolak bila < invoice+deposit") — itu menolak DP sah. **Stop:** struktur isBookingPath berubah → STOP.
##### F1-2 · 🟠 FASE 1 · Guard remove/update payment OCCUPIED
- **File:** `invoice-payments.service.ts:189, :237`.
- **Spec:** dalam tx setelah lock, telusuri payment→invoice→stay; bila `initialMetersPromotedAt != null` ATAU room OCCUPIED → 409 "Tidak dapat mengubah/menghapus pembayaran kamar yang sudah ditempati."
- **Kriteria selesai:** remove pada stay promoted → 409 (meski tanpa jurnal); pada booking RESERVED → tetap bisa. **Stop:** relasi invoice→stay tak ada → STOP.

#### 5. Invarian & UAT
- **Invarian:** total pembayaran ≤ invoice + sisa deposit; promosi meter & OCCUPIED hanya saat invoice PAID; satu pemenang per kamar; uang masuk = otomatisasi berhenti.
- **UAT:** (1) submit 600rb saat sisa DP 510rb & pelunasan 1.69jt → 409; (2) approve submission lama bernominal aneh → 409; (3) pembayaran manual 50% invoice non-booking → 409; (4) DP tepat → kamar terkunci; (5) pelunasan tepat → OCCUPIED + meter promoted; (6) hapus payment stay promoted tanpa jurnal → 409; (7) first-paid-wins + notif tenant kalah.
- **Prasyarat:** kerjakan SEBELUM deploy (Fase 1). Terkait deposit → dossier 12; akuntansi → dossier 13.


## Bagian 3 - `docs/13_AKUNTANSI_LAPORAN.md`

### DOSSIER 13 — AKUNTANSI & LAPORAN
**Domain:** jurnal otomatis, COA, general ledger, trial balance, laporan keuangan (P&L, Balance Sheet, Cashflow, AR Aging). **Flow 12.**
**Status:** 🟢 Journal engine HEALTHY / 🔴 Report layer punya 9 bug nyata. Fase 1 = FIX bug laporan SEBELUM deploy.
**File inti:** `accounting-posting.service.ts`, `accounting-reports.service.ts`, `accounting-readiness.service.ts`.

---
#### 1. Aturan bisnis
- **COA 38 akun** (dikoreksi V3 dari klaim V1 17/17). Prefix mapping: 1xxx=Aset, 2xxx=Liabilitas, 3xxx=Ekuitas, 4xxx=Pendapatan, 5xxx=Beban.
- **Auto Journal Lite:** 10 fungsi posting idempotent per `(sourceType, sourceId)`:
  1. `postStayInitialRentRevenueTx` — pendapatan sewa awal
  2. `postStayRenewRentRevenueTx` — pendapatan perpanjangan
  3. `postStayMeterRevenueTx` — pendapatan meter
  4. `postStayDPForfeitTx` — hangus DP (jurnal DP_FORFEIT)
  5. `postStayDepositReceiptTx` — setoran jaminan (liability)
  6. `postStayDepositSettlementTx` — penyelesaian deposit
  7. `postStayPenaltyTx` — denda manual
  8. `postExpenseTx` — pencatatan beban
  9. `postInventoryMovementTx` — mutasi inventaris
  10. `postPaymentReversalTx` — reversal pembayaran (DEAD CODE sejak A8)
- **Auto-close bulanan** ter-gate readiness: `unmapped-operational` menghitung penuh sebelum auto-close.
- **Reversal CANCEL invoice = BLOCKING** di semua jalur (pola A8); reversal gagal → cancel invoice ditolak.

#### 2. Peta kode
| Aksi | Lokasi |
|---|---|
| Post jurnal sewa awal (auto, saat check-in/approve) | `accounting-posting.service.ts:postStayInitialRentRevenueTx` |
| Post jurnal renewal | `accounting-posting.service.ts:postStayRenewRentRevenueTx` |
| Post jurnal meter | `accounting-posting.service.ts:postStayMeterRevenueTx` |
| Post jurnal DP forfeit | `accounting-posting.service.ts:postStayDPForfeitTx` |
| Post jurnal deposit receipt + settlement | `accounting-posting.service.ts:postStayDepositReceiptTx, postStayDepositSettlementTx` |
| Readiness check | `accounting-readiness.service.ts` |
| Reports (P&L, Balance Sheet, Cashflow) | `accounting-reports.service.ts` |
| General Ledger query | Prisma raw + report helpers |

#### 3. Temuan audit
> 🔄 **SINKRON KODE (2026-06-15, audit menyeluruh):** tabel BASI — fix laporan & guard berikut SUDAH SELESAI (lihat §6/§7/§8 + kode): **F-01/F-18→F1-3/F1-4** (cashflow & rasio: AR 11xx ≠ kas 10xx; `cashflow-classifier.ts` + `financial-ratios.helper.ts`), **F-02→F1-4** (expenseRatio presedensi), **F-17→F1-5** (balance sheet grouping), **F-09→F1-7** (DRAFT exclude revenue), **F-10→F1-9** (deposit ≠ operating cashflow), **F-24→F1-8** (guard settlement cek receipt journal, `accounting-posting.service.ts:631-641,727-736`). Severity 🔴/🟠 di tabel = historis. Catatan tetap relevan: **A-8 (best-effort auto-journal warisan)** kini punya sweeper rekonsiliasi otomatis (F5-6).
| ID | Sev | Dampak bisnis | Lokasi | Fix/Task |
|---|---|---|---|---|
| F-01 | 🔴 P1 | Cashflow mendeteksi AR prefix `11` sebagai kas → laporan overstate. | `accounting-reports.service.ts` | **F1-3**: gunakan `cashAccountId`/prefix `10` |
| F-02 | 🔴 P1 | Expense ratio: operator precedence BUG `expense×100/revenue` → angka ratusan bukan persen. | Laporan rasio keuangan | **F1-4**: tambah kurung `expense*100/(revenue&#124;&#124;1)` |
| F-09 | 🟠 P2 | Invoice DRAFT ikut dihitung pendapatan di laporan → revenue overstated. | Reports/finance agregat | **F1-7**: exclude DRAFT dari revenue calculation |
| F-10 | 🟠 P2 | Deposit masuk operating cashflow sehingga kas operasional tampak terlalu besar. | `accounting-reports.service.ts` | **F1-9**: pisahkan perubahan liability titipan |
| F-17 | 🟠 P2 | Balance Sheet: total aset ≠ liabilitas + ekuitas saat ada jurnal partial → imbalance karena mapping akun tidak lengkap. | `accounting-reports.service.ts` BS query | **F1-5**: perbaiki grouping akun balance sheet |
| F-18 | 🟠 P2 | Ratio menggunakan AR sebagai cash → current ratio salah. | Laporan rasio | **F1-4** bagian ratio |
| F-24 | 🔴 P1 | Settlement deposit TANPA cek receipt journal → akun liabilitas 2000 bisa debit permanen (uang titipan hilang dari buku). | `accounting-posting.service.ts:602` | **F1-8**: guard cek journal receipt sebelum settlement |
| F-29 | 🟡 INFO | `postPaymentReversalTx` = DEAD CODE (0 pemanggil) — remove payment berjurnal kini diblokir A8. | `accounting-posting.service.ts:741` | Hapus / dokumentasikan |
| F-30 | 🟡 P3 | Ledger deposit sourceId fallback stayId → setoran jaminan manual ke-2 kena dedupe → kurang catat. | `deposit-ledger.service.ts:184` | Sertakan invoicePaymentId di sourceId |
| F-31 | ✅ RESOLVED (F4-10, 2026-06-14) | Pembulatan Rupiah tersebar di banyak modul (util/DP/depresiasi/revenue-per-kamar + helper `rupiah` duplikat) → potensi drift pecahan. Disentralkan ke `common/business/money.helper.ts` (`roundRupiah`/`rupiahAmount`, tie half-away-from-zero). | `money.helper.ts` + 8 call-site | **F4-10 selesai** |
| (sehat) | ✅ | 10 auto-journal posting idempotent + readiness gate auto-close bulanan = engine sehat. Trial balance runtime seimbang, deposit mismatch=0. | — | pertahankan |

#### 4. Task (urutan & spec lengkap)
- **F1-3 · FASE 1:** fix cashflow prefix mapping — AR (11xx) ≠ kas (10xx).
- **F1-4 · FASE 1:** fix operator precedence ratio + mapping AR/cash.
- **F1-5 · FASE 1:** fix balance sheet grouping.
- **F1-6 · FASE 1:** hitung occupancy dari kamar operable dan stay promoted.
- **F1-7 · FASE 1:** exclude DRAFT dari revenue.
- **F1-9 · FASE 1:** exclude deposit dari operating cashflow, pisahkan ke section liabilitas titipan. (F-10)
- **F1-8 · FASE 1:** guard settlement deposit — cek receipt journal. (F-24)
- **F2-8 · FASE 1:** nonaktifkan endpoint/UI pembuatan jurnal draft manual; draft opening balance tetap terpisah dan terkontrol.
- **F3-18 · FASE 3 (SELESAI 2026-06-14):** buat draft biaya rutin bulanan idempotent untuk gaji/listrik/air/internet/sewa/pajak; draft dikecualikan dari laporan dan jurnal hingga dikonfirmasi.
- **F3-21 · FASE 3 (SELESAI 2026-06-14):** jalankan depresiasi bulan WIB sebelumnya sebelum accounting auto-close, memakai service dan idempotency yang sama dengan proses manual.
- **F3-10 · FASE 3 (SELESAI 2026-06-14):** higiene jurnal. **race P2002** — 7 entrypoint posting ber-transaksi-sendiri dibungkus `runIdempotentPosting`: duplikat akibat dua proses paralel (entryNumber `@unique`) diperlakukan sebagai sudah-terposting di LUAR tx (catch P2002 di dalam tx mustahil karena Postgres meng-abort tx). **entryNumber suffix VOID = N/A** (tak ada jalur `journalEntry`→`VOID`). **forfeit entryDate** sudah = tanggal kejadian (post oleh sweeper).
- **F4-1 · FASE 4 (SELESAI 2026-06-15, F-15):** unearned revenue PSAK 72. Sewa mencakup **>1 bulan** (SMESTERLY=6/YEARLY=12; mekanisme berbasis N bulan, reusable F4-11 prabayar fleksibel) ditangguhkan ke **COA 2200** lalu diakui **straight-line** per bulan. **Jalur posting BARU** (hormati DO-NOT-TOUCH): `postRentDeferralTx` (DR 4000/CR 2200 saat invoice sewa ter-posting) + `postRentRecognitionTx` (DR 2200/CR 4000 bulan ke-i), sourceType `ADJUSTMENT` + sourceId `RENT_DEFERRAL:stayId` / `RENT_RECOGNITION:stayId:idx` (idempotent). `RentRecognitionService` (decoupled dari check-in: ensure jadwal+deferral untuk stay long-lease ber-invoice-posted, lalu recognize baris jatuh tempo) di sweeper `runRentRecognition` (+endpoint manual). **Invoice & AR tetap 1 penuh di muka**; hanya pengakuan pendapatan dibagi. Helper murni `rent-recognition.helper.ts` + unit test. UAT runtime: TB seimbang tiap langkah, idempotent, residu 0.
- **F4-10 · FASE 4 (SELESAI 2026-06-14):** standarisasi pembulatan Rupiah. Helper terpusat `common/business/money.helper.ts` — `roundRupiah(v)` (bilangan bulat terdekat, tie 0,5 menjauhi nol → simetri debit/kredit, NaN/∞→0) + `rupiahAmount(v)` (clamp ≥0). Diwiring ke 8 call-site Rupiah: posting helper `rupiah` (di luar rentang DO-NOT-TOUCH), util line (stays ×2), DP 30% (renew + tenant-bookings ×2 + public-bookings raw-SQL), depresiasi bulanan (assets ×2 + helper lokal), revenue-per-kamar (finance + reports). **DO-NOT-TOUCH `accounting-period-close.service.ts` SENGAJA tak disentuh** (helper lokalnya dibiarkan). Nilai preserved (untuk input ≥0 identik `Math.round`, dibuktikan unit test). Gate: tsc 0; `node --test` 32/32; runtime UAT TB seimbang + akun 2000 saldo kredit.

#### 5. Invarian & UAT
- **Invarian:** trial balance seimbang; jurnal idempotent per sourceType+sourceId; DRAFT tidak masuk laporan; deposit excluded dari operating cashflow.
- **UAT:** (1) TB seimbang pasca siklus booking→checkout; (2) P&L show revenue tanpa DRAFT; (3) cashflow tidak hitung deposit sebagai inflow; (4) balance sheet A=L+E; (5) settlement ditolak tanpa receipt journal (pasca F1-8).

#### 6. F1-3 cashflow — spec before→after (4 sub-langkah, SELESAI 2026-06-13)
Lokasi: `accounting-reports.service.ts` fungsi `cashflow()` (anchor metode :731 — grep `async cashflow`).
- **F1-3a deteksi kas (F-01):** *before* `isCashAccount = code.startsWith('11')` → 1100 (PIUTANG/AR) dihitung kas. *after* kas = `cashAccountId != null` ATAU `code.startsWith('10')`. Diekstrak ke `cashflow-classifier.ts::isCashLine` (pure, teruji).
- **F1-3b opening filter:** *before* `openingBalanceLine` where COA `code startsWith '11'`. *after* `'10'` (saldo awal KAS, bukan AR).
- **F1-3c classify once (F-19/F-20):** *before* semua cash-line masuk `operatingInTotal/Out` LALU investing/financing ditambah lagi (double-count) + dead `cashCOACodes`(→null). *after* `classifyCashflow()` mengklasifikasi tiap `sourceType` SEKALI ke operating/investing/financing berbasis net debit−kredit; operating total hanya dari sumber operating.
- **F1-3d beginning = akhir bln lalu:** *before* `cashBeginning = totalCashOpening || openingJournal`; `cashEnding = totalCashCurrent || …` → saldo all-time, `beginning+net ≠ ending`. *after* `cashBeginning = opening + Σ(mutasi kas POSTED entryDate < periodStart)`; `cashEnding = cashBeginning + netCashflow` → invarian **beginning+net=ending**.
- **DO-NOT-TOUCH:** blok saldo-kas E-4 `:838-847` (groupBy `cashAccountId`) — F1-3d MENIRU pola ini untuk prior-delta, jangan ubah.
- **F1-9 (F-10) deposit bukan operating:** sourceType `DEPOSIT` dipisah ke section `depositLiability` (perubahan liabilitas titipan), keluar dari operating; `netCashflow` tetap memuat deposit (mempengaruhi kas). Skenario emas: sewa 1,7jt = operating-in; deposit 500rb = depositLiability-in.
- **Verifikasi:** `backend/test/unit/cashflow-classifier.test.js` (F-01: AR 1100 ≠ kas; F1-9: DEPOSIT ≠ operating). Total `test:unit` 13/13 hijau. ⏳ runtime skenario emas `05 §5` (operating-in = Σ kas, bukan AR/deposit; beginning+net=ending) → gate pra-deploy F1-12.

#### 7. F1-4 rasio — spec before→after (SELESAI 2026-06-13)
Lokasi: `accounting-reports.service.ts` `financialRatios()` (grep `async financialRatios`). Helper murni: `financial-ratios.helper.ts`.
- **F-02 expenseRatio (presedensi):** *before* `Math.round((pnl.totals?.expenseRupiah ?? 0 / totalRevenue) * 10000)/100` → `/` mengikat lebih kuat dari `??` ⇒ praktis `expense × 100` (beban 1jt → 1e8). *after* `expenseRatioPercent(expense, revenue)` = `(expense/revenue)×100`. **Selesai: beban 1jt / rev 4jt = 25.**
- **F-18 cashAndBank:** *before* `code.startsWith('11')` (1100=AR dihitung kas) → *after* `CASH_PREFIXES=['10']` (1000/1010/1020).
- **Inventory:** *before* `startsWith('14')` (tak ada akun 14xx → selalu 0) → *after* `INVENTORY_PREFIXES=['12']` (COA 1200).
- **Current liabilities:** *before* `startsWith('21')` (lewatkan deposit 2000) → *after* `CURRENT_LIABILITY_PREFIXES=['20','21','22','23']` → semua liquidity ratio (current/quick/cash) benar.
- **Verifikasi:** `financial-ratios.helper.test.js` (expenseRatio→25; kas 10≠AR 11; inventory 12; currentLiab termasuk deposit 2000). 12/12 hijau total. ⏳ runtime → gate pra-deploy F1-12.
- COA acuan (`constants/default-coa.ts`): kas 1000/1010/1020 · AR 1100 · inventory 1200 · fixed 1500/1590 · liab 2000/2100/2200/2300.
- **F1-6 occupancy (F-04):** *before* `occupancyRate = bs.statement?.occupancyRate ?? 0` (balanceSheet tak punya field itu → selalu 0). *after* hitung INLINE: `operable = kamar isActive − (MAINTENANCE+INACTIVE)`, huni = `stay ACTIVE & initialMetersPromotedAt!=null` → `occupancyRatePercent(huni, operable)`. Konsisten `finance.service` occupancySummary. Test: 5/10→50, operable 0→0.

**Lintas-dossier:** jurnal booking/payment → dossier 10; jurnal deposit → dossier 12; keputusan owner → `03_KEPUTUSAN_OWNER.md`.

#### 8. F3-18/F3-21 — otomasi bulanan (SELESAI 2026-06-14)
- **Expense draft:** `Expense.status` membedakan `DRAFT`, `CONFIRMED`, dan `CANCELLED`; `recurringKey` unik mencegah draft kategori-bulan ganda. Pembuatan manual tetap langsung `CONFIRMED`.
- **Batas akuntansi:** semua laporan, readiness, analytics, finance, dan posting jurnal hanya memakai expense `CONFIRMED`. Konfirmasi draft dan posting jurnal berjalan dalam satu transaksi.
- **AutoOps:** setiap bulan membuat maksimal enam draft biaya rutin dari nilai confirmed terbaru, lalu menjalankan depresiasi bulan sebelumnya sebelum auto-close. Kedua proses dapat dipicu manual oleh OWNER/ADMIN dan aman dijalankan ulang.
- **UAT:** transaksi rollback membuat tepat enam draft tanpa residu data; depresiasi pada 14 Juni 2026 menargetkan Mei 2026 dan safe-skip `NO_ELIGIBLE_ASSETS`. Migration Prisma deployed; backend build dan 18/18 unit test lulus.
