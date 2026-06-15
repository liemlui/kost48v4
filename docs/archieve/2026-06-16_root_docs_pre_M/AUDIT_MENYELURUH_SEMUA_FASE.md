# AUDIT MENYELURUH — SEMUA FASE (1–4 + fondasi)
**Mulai:** 2026-06-15. **Lingkup:** seluruh domain (dossier 10–19), bukan hanya Fase 4. **Pelengkap** `AUDIT_FASE4_FINAL.md` (deep-dive Fase 4).
**Metode:** baca dossier §3 Temuan/§4 Task → **verifikasi langsung di kode hasil-commit** (anti over-confidence dua arah: cek yang diklaim selesai BENAR selesai, & cek yang diklaim open apakah masih open). Bandingkan dgn teori (PSAK, idempotency, lock/race, RBAC, PDP).
**Severity:** 🔴 BUG (harus fix) · 🟠 CELAH (risiko nyata) · 🟡 CATATAN/over-confidence · ✅ OK.

---

## 🟢 KESIMPULAN UTAMA
**TIDAK ditemukan 🔴 bug baru di seluruh fase.** Satu-satunya 🔴 warisan yang menakutkan (ghost-stock I-02) ternyata **sudah ditutup di kode**. Gate hijau (tsc 0, build, unit, UAT runtime, app boot tanpa circular-dep), trial balance seimbang.

### 🔎 TEMUAN DOMINAN (META) — DOSSIER DRIFT: dokumentasi TERTINGGAL dari kode
Tabel `§3 Temuan` & daftar `§4 Task` di banyak dossier masih menandai item sebagai **OPEN (🔴/🟠)** padahal **kode sudah mengimplementasikannya**. Diverifikasi langsung di kode = SELESAI tapi dossier bilang open:

| Item | Dossier bilang | Kode aktual | Bukti |
|---|---|---|---|
| **F1-1R** no-partial menyeluruh | 10 · B-01 🔴 P1 (task) | ✅ SELESAI | `payment-submissions.service.ts:418-450` (gate approve) + `invoice-payments.service.ts:167-172,223-228` (manual lunas penuh) |
| **F1-2** guard payment OCCUPIED | 10 · GAP#3 🟠 (task) | ✅ SELESAI | `invoice-payments.service.ts:270-276` |
| **F1-8** guard settlement deposit | 13 · F-24 🔴 P1 (task) | ✅ SELESAI | `accounting-posting.service.ts:631-641,727-736` (cek receipt journal) |
| **F1-3/F1-4** cashflow/rasio | 13 · F-01/F-02/F-18 🔴 (tabel) | ✅ SELESAI | `cashflow-classifier.ts` + `financial-ratios.helper.ts` ada + teruji (§6/§7) |
| **F1-10** kunci deposit | 11 · C3 🟠 P2 (task) | ✅ SELESAI | `tenant-bookings.service.ts:342-343` + `stays.service.ts:191-192` (= `Room.defaultDepositRupiah`) |
| **F2-5 / I-02** ghost-stock + konsolidasi helper | 14 · I-02 🔴 P2 (task), 18 · X-03 (task) | ✅ SELESAI | `staff-field-reports.service.ts:11,488-489` pakai `common/utils/room-booking.util` (lock+validasi) |
| **F2-14** monthRange WIB | 15 · K-5 🟡 (task) | ✅ SELESAI | `staff-performance.service.ts:9-22` (batas bulan WIB) |

**Implikasi:** ini ARAH AMAN (kode > docs, bukan klaim kosong), TAPI tetap risiko: pekerjaan masa depan bisa "mengulang" task yang sudah selesai, atau owner mengira fitur belum jadi. **Saran: sinkronkan tabel §3/§4 dossier 10/11/13/14/15/18 dengan status kode** (status header tiap dossier sudah akurat; hanya tabel detail yang basi).

---

## TEMUAN OPEN NYATA (di luar Fase 4 — pelengkap AUD-1..AUD-8)

### 🟠 L-1 (= A-8/AUD-8) Auto-journal best-effort di flow warisan — SISTEMIK
Call-site jurnal di flow lama menelan error posting & tetap commit operasinya:
- `stays.service.ts:331-337` (jurnal deposit liability saat check-in manual) — `.catch()`+`logger.warn`, tx tetap commit.
- `stays.service.ts:1418-1419` (`postInvoiceIssuedTx`) — idem.
- Pola sama untuk PAYMENT/CANCELLED/EXPENSE/WIFI (temuan audit lama `FLOW_AUDIT_LAPORAN.md` R1).
- Bila posting gagal → data operasional (kamar OCCUPIED, ledger, invoice) commit **tanpa jurnal** → laporan bisa understate sampai di-backfill.
- **Mitigasi yang ADA:** readiness `unmapped-operational` mendeteksi + `backfillAutoJournal` (manual). Deploy fresh (D-06) → COA selalu ter-seed → kegagalan jarang. **Kontras:** Fase 4 (F4-1/F4-11/redemption) justru BLOCKING (throw → rollback).
- **Keputusan owner perlu:** jadikan blocking + rekonsiliasi otomatis (R1/R2 audit lama)? Atau pertahankan best-effort + monitor readiness?

### 🟡 L-2 (= F-30) Dedupe deposit-ledger belum pakai invoicePaymentId
`recordDepositReceivedTx` set `sourceId = paymentSubmissionId ?? stayId` (`deposit-ledger.service.ts:184`); kunci dedupe (`:123-128`) pakai `sourceId`. Kolom `invoicePaymentId` SUDAH ada di tabel tapi **tidak dipakai sebagai kunci dedupe** → setoran jaminan manual ke-2 tanpa submission berbeda akan ter-dedupe (kurang catat). **Dampak sangat rendah** (deposit lazimnya diterima 1× per stay). Fix kecil: masukkan `invoicePaymentId` ke `sourceId`/kunci dedupe.

### 🟡 L-3 Jurnal reward vs spesifikasi dossier 19
Implementasi fulfillment reward selalu **DR 6300 (Beban Marketing)/CR 2100 (Utang)**, sedangkan dossier 19 §4 menyebut reward **diskon sewa → "jurnal pengurang pendapatan" (kontra-revenue)**. Untuk reward layanan/fisik, beban marketing wajar; untuk **diskon sewa**, idealnya kontra-revenue (kurangi 4000), bukan beban. **Dampak rendah** (owner memilih utamakan reward layanan in-house, bukan diskon sewa). **Klarifikasi bila reward "Diskon sewa" benar-benar diaktifkan.**

### 🟡 L-4 Gate aktivasi KTP default OFF — RISIKO GO-LIVE
`stays.create` menggerbang KTP via env `KTP_ACTIVATION_GATE_ENABLED` (**default OFF**, F3-17). Artinya tanpa diset ON di produksi, kamar bisa diaktifkan **tanpa KTP terverifikasi** (lawan maksud E1/PDP). **Bukan bug** (sengaja default-off agar UAT lancar), tapi **WAJIB masuk runbook go-live** (`04_DEPLOY`): set `KTP_ACTIVATION_GATE_ENABLED=true` di produksi.

### 🟡 L-5 SEO Lighthouse ≥90 belum diukur (implemented-but-unvalidated)
F3-3 mengimplementasi OG/JSON-LD/canonical/robots/sitemap, TAPI target Lighthouse SEO ≥90 **belum diukur** (konektor browser lokal gagal). Status jujur: implementasi ada, validasi belum. Juga tertunda kosmetik: UD-04 (chart owner all-zero), V-7 (seri Laba redundan). Bukan blocker.

### ℹ️ L-6 Sadar-risiko (deferred, sesuai skala saat ini)
- Tanpa refresh token (JWT 24 jam, di localStorage PWA) — dossier 18, diterima.
- Rate-limit in-memory per-proses (multi-replica perlu Redis) — diterima sampai skala naik.
- wifi-order tanpa event in-app (via WhatsApp) — by design.

---

## RINGKASAN PER DOMAIN
| Dossier | Status kode | Catatan audit |
|---|---|---|
| **10 Pembayaran/Invoice** | 🟢 KUAT | F1-1R/F1-2 SELESAI (dossier drift). No-partial menyeluruh tegak di create+approve+manual. |
| **11 Booking/Renewal** | 🟢 KUAT | F1-10 deposit-lock SELESAI (drift). Renewal state-machine + rent-loyalty utuh. |
| **12 Checkout/Deposit/Overstay** | 🟢 KUAT | F1-8 settlement-guard SELESAI; forced-checkout F3-16 (shortfall→AR) UAT 12/12. F-30 minor (L-2). |
| **13 Akuntansi/Laporan** | 🟢 engine sehat | F1-3/4/5/7/8/9 SELESAI (tabel §3 basi). L-1 best-effort journal (warisan). |
| **14 Inventaris** | 🟢 SEHAT | I-02 ghost-stock 🔴 **DITUTUP** (F2-5, util bersama). Tabel §3 basi. |
| **15 Staf/Tiket/KPI** | 🟢 | F2-14 WIB SELESAI (drift). Round-robin tiket sistem parsial (AUD-5). |
| **16 Notifikasi** | 🟢 LENGKAP | Coverage penuh + PWA push (F4-2). Hanya wifi-order by-design tanpa event. |
| **17 Publik/Marketing/UIUX** | 🟢 | SEO impl ada, Lighthouse belum diukur (L-5). UX minor tertunda. |
| **18 Auth/Fondasi/KTP** | 🟢 KUAT | default-deny guard, OWNER-only, KTP. Gate KTP default-OFF (L-4 go-live). |
| **19 Gamifikasi** | 🟢 SELESAI | Lihat `AUDIT_FASE4_FINAL.md` (FASE B). L-3 jurnal reward vs spec. |

## TINDAK LANJUT (ke `08_CHECKLIST.md`)
- **SINKRON-DOC:** rapikan tabel §3/§4 dossier 10/11/13/14/15/18 (tandai item SELESAI). _(pekerjaan docs, bukan kode)_
- **L-1/AUD-8:** keputusan owner — auto-journal blocking + rekonsiliasi otomatis vs best-effort+monitor.
- **L-4:** tambah `KTP_ACTIVATION_GATE_ENABLED=true` ke runbook go-live `04_DEPLOY`.
- **L-2/L-3/L-5:** perbaikan kecil/klarifikasi (rendah prioritas).
- AUD-1..AUD-7 (Fase 4) + D-21 sudah tercatat di checklist.
