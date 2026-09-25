# Verifikasi Statis P1-04..P1-09 — Audit 360° Flow Uang (Jul 2026)

- Status: **verifikasi statis selesai dengan temuan** — 2 masih ada (P1-04, P1-05), 3 indikasi diperbaiki (P1-06, P1-07; P1-01..P1-03 sudah dari 23 Sep), 1 masih ada tetapi sempit (P1-08), 1 terverifikasi + 1 duplikasi kode baru (P1-09)
- Tanggal: 25 September 2026
- Baseline: HEAD `7e4bbbdd`; working tree **juga** memuat pekerjaan sesi lain (3 berkas `frontend/src/**` untuk perbaikan temuan Z-19) yang **tidak disentuh** task ini
- Jenis: **verifikasi statis source** (membaca kode), bukan verifikasi runtime
- Klaim asli temuan: `docs/archieve/_previous_cycles/M15_AUDIT_360_FLOW_UANG.md` (dibaca tersasar hanya untuk klaim P1-04..P1-09)
- Indeks status sebelumnya: [Status Temuan P1-01..P1-09 (verifikasi 23 Sep 2026)](audit-uang-huni-2026-07.md)

## Metode

Inspeksi source pada jalur yang disebut temuan: dedupe ledger deposit, transisi status submission kedaluwarsa, reversal pembatalan invoice beserta seluruh pemanggilnya, pre-check pembatalan invoice, `paidAt` pada sinkronisasi status invoice, dan pembentuk note approval. Tidak ada test/build/server/DB yang dijalankan: ini task dokumentasi, sehingga exception gate uang (§8 AGENTS) berlaku dan dicatat di STATUS §7.

## Hasil per temuan

| ID | Klaim asli (Jul 2026) | Kondisi kode 25 Sep 2026 | Bukti | Status |
|---|---|---|---|---|
| **P1-04** (MEDIUM) | Deposit ledger sourceId dedupe risk (fallback stayId) | **Masih ada.** `sourceId` = `PS_<paymentSubmissionId ?? stayId>_IP_<invoicePaymentId>`, atau `String(paymentSubmissionId ?? stayId)` bila tidak ada `invoicePaymentId` — fallback ke `stayId` masih dipakai. Dedupe hanya `findFirst(stayId,type,sourceType,sourceId)` lalu `return null` (**skip senyap**, tanpa log/error), dan **tidak ada** `@@unique` pada kolom itu di schema sehingga dedupe tidak dijamin DB. | `deposit-ledger.service.ts` (sourceId 159–198; dedupe 103–133); `schema.prisma:927–957` (`@@index` saja) | **Masih ada** (statis) |
| **P1-05** (MEDIUM) | PENDING_REVIEW di-set EXPIRED, bukan REJECTED | **Masih ada.** Dua jalur expiry tetap meng-`updateMany` submission `PENDING_REVIEW` → `EXPIRED` (jalur expiry booking dan auto-ops sweep booking). | `payment-submissions.service.ts:1750–1756`, `:1877–1883` | **Masih ada** — arti status bisnis, perlu keputusan owner |
| **P1-06** (MEDIUM) | Reversal gagal di tengah competing cancel | **Indikasi diperbaiki pada seluruh pemanggil yang diperiksa.** Setiap pemanggil memeriksa `reversalResult?.skipped` dan melempar error sehingga transaksi bisnis rollback; reversal juga idempotent lewat kunci `sourceType`/`sourceId` (`ADJUSTMENT` + `INVOICE_REVERSAL:<invoiceId>`), sehingga pembatalan berkompetisi tidak menghasilkan reversal ganda. | `invoices.service.ts:562–569`; `booking-sweep.service.ts:161–166`; `renewal-sweep.service.ts:96`, `:198`; `stays.service.ts:1319`; `stays-renewal.service.ts:509`; `payment-submissions.service.ts:1611`; `accounting-posting.service.ts:805–855` | **Indikasi diperbaiki** (statis) |
| **P1-07** (MEDIUM) | Invoice cancel — pre-check di luar tx | **Indikasi diperbaiki.** Pre-check di luar transaksi memang masih ada, tetapi transaksi **mengulang validasi setelah** `SELECT ... FOR UPDATE` (kunci baris + status + `payments.length`), dan reversal dijalankan di transaksi yang sama. | `invoices.service.ts:522–572` (komentar "Audit A14" pada `:532`; lock `:534`; re-validasi `:535–540`) | **Indikasi diperbaiki** (statis) |
| **P1-08** (LOW) | `paidAt` fallback `new Date()` di syncInvoiceStatus | **Masih ada, tetapi sempit.** `paidAt = <paymentDate terbaru> ?? new Date()`; `InvoicePayment.paymentDate` **NOT NULL** sehingga fallback praktis tidak tercapai pada data normal. Pemicu tersisa: invoice **total 0** tanpa pembayaran → cabang pelunasan terambil → status PAID dengan `paidAt` = waktu sinkronisasi. | `invoice-payments.service.ts:289–307` (`invoiceTotal` `:26`); `schema.prisma:1109–1126` (`paymentDate DateTime @db.Date`) | **Masih ada (sempit)**; jalur total-0 tidak diverifikasi lebih jauh |
| **P1-09** (LOW) | `buildApprovalPaymentNote` not verified | **Terverifikasi + temuan baru.** Isi note = `"Pembayaran hasil approval bukti bayar tenant"` + `Ref: <referenceNumber>` + `Pengirim: <senderName>`; **tidak** memuat bukti verifikasi (aktor/waktu review/id submission). **Duplikasi:** fungsi identik ada di dua berkas, dan salinan di `payment-submissions.mapper.ts` **tidak punya pemanggil** (kode mati). | `payment-submissions.helpers.ts:210–215` (dipakai `payment-submissions.service.ts:44`, `:934`); `payment-submissions.mapper.ts:63–68` (0 importer; mapper hanya dipakai `payment-submissions.queries.ts:5` untuk `mapSubmissionRow`) | **Terverifikasi**; satu salinan = kode mati |

Ringkas: P1-04 dan P1-05 **tidak lagi boleh disebut UNKNOWN** — keduanya masih ada pada source saat ini. P1-06 dan P1-07 **tidak lagi cocok** dengan pola yang dilaporkan Jul 2026. P1-08 tetap ada dalam bentuk sempit. P1-09 terverifikasi dan memunculkan duplikasi kode.

**Status lanjutan 25 Sep 2026:** P1-04 dan P1-09 sudah ditindaklanjuti pada source setelah keputusan owner (`P1-04-FIX`, `P1-09-CLEANUP`, `P1-05-KEEP`) — lihat § Perbaikan di bawah.

## Temuan residual (baru dari verifikasi ini)

1. **Duplikasi `buildApprovalPaymentNote`** di `payment-submissions.helpers.ts` dan `payment-submissions.mapper.ts` — salinan mapper tanpa pemanggil; risiko divergensi bila salah satu diubah kelak.
2. **Skip senyap pada ledger deposit** — `createEntryIfMissingTx` mengembalikan `null` tanpa error/log ketika entri dianggap sudah ada (`deposit-ledger.service.ts:133`), saat `amount <= 0` (`:161`), maupun saat stay tidak ditemukan (`:176`). Sejalan catatan residual verifikasi 23 Sep 2026.
3. **Dedupe ledger tanpa jaminan DB** — tidak ada `@@unique(stayId, type, sourceType, sourceId)`; dua transaksi paralel tetap dapat membuat dua entri.

## Perbaikan P1-04 & P1-09 — 25 September 2026 (setelah keputusan owner)

Keputusan yang mengikat: `P1-05-KEEP` (status quo), `P1-04-FIX`, `P1-09-CLEANUP` ([KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md)).

- **P1-04 — fallback `stayId` dihentikan, jalur skip tidak lagi senyap.** `recordDepositReceivedTx` kini memakai helper `buildDepositReceivedSourceId()`:
  - dua cabang ber-dokumen **mempertahankan format lama verbatim** (`PS_<submission|stayId>_IP_<invoicePayment>` dan `String(submissionId)`) supaya idempotensi entri historis tidak berubah saat kode diperbaiki;
  - cabang **tanpa dokumen sumber** (mis. check-in manual di `stays.service.ts:457`) memakai kunci unik per kejadian `MANUAL_<stayId>_<epochMs>_<nominal>` **dan** menulis `logger.warn` — bukan lagi `String(stayId)` yang membuat deposit kedua pada stay yang sama tertelan dedupe;
  - jalur skip (nominal ≤ 0, stay tidak ditemukan, entri duplikat) sekarang menulis `logger.warn`, sehingga "deposit diterima tanpa entri baru" dapat dilacak.
- **P1-09 — salinan mati dihapus.** `buildApprovalPaymentNote` kini hanya ada di `payment-submissions.helpers.ts` (dipakai `payment-submissions.service.ts:44`, `:934`); salinan tanpa pemanggil di `payment-submissions.mapper.ts` dihapus, termasuk impor `SubmissionLockRow` yang menjadi tak terpakai.
- **Bukti (gate uang):** cwd `backend`, `npm run test:unit` **exit 0** — hook `pretest:unit` menjalankan build penuh, lalu **tests 144, pass 144, fail 0**. Test baru `backend/test/unit/deposit-ledger-source-id.test.js` (8 test): format kunci ber-dokumen dipertahankan, kunci manual unik per kejadian, dua deposit manual tidak saling menelan, dedupe menulis log duplikat, nominal tidak valid, stay hilang.
- **Masih terbuka (task operasional terpisah):** `@@unique(stayId, type, sourceType, sourceId)` **belum** ditambahkan, jadi dedupe masih level aplikasi (`findFirst` di dalam transaksi) dan dua transaksi paralel secara teori masih dapat membuat dua entri. Perubahan schema/migrasi menunggu izin operasional + backup.
- **Runtime tidak diukur:** hasil ini bukti kode + unit test, bukan UAT/produksi.

## Batas bukti

- Verifikasi **statis**; tidak membuktikan perilaku runtime dan tidak menggantikan test.
- Gate uang (`npm run test:unit` backend + M04) **tidak dijalankan** karena task ini task dokumentasi — sesuai exception §8 AGENTS ("Exception uang tidak memerintahkan test/build untuk task dokumentasi"). Status exception dicatat di STATUS §7.
- Hanya jalur yang disebut temuan yang diperiksa; sweeper lain, posting expense, dan reversal pembayaran (`postPaymentReversalTx`, 0 pemanggil) tidak diperiksa.
- Dampak keputusan P1-05 terhadap laporan/notifikasi tenant dan jalur P1-08 total-0 tidak diverifikasi.
- Perbaikan source (menambah `@@unique`, mengubah EXPIRED→REJECTED, menghapus kode mati) adalah task terpisah; laporan ini tidak memberi izin implementasi.

## Tindak lanjut

- **P1-05** — perubahan arti status tidak boleh diputuskan AI: butuh keputusan bisnis owner (EXPIRED vs REJECTED pada submission kedaluwarsa).
- **P1-04** — menutup risiko butuh perubahan schema (`@@unique`) atau menghapus fallback `stayId` + log keras saat skip → task source terpisah dengan gate uang.
- **P1-09** — hapus salinan mati di `payment-submissions.mapper.ts` → cleanup kecil, task terpisah.
- **P1-06/P1-07** — bukti masih statis; verifikasi runtime (competing cancel nyata) hanya bila owner mengizinkan akses DB/UAT.

## Hash bukti (12 karakter awal SHA-256)

`deposit-ledger.service.ts` `c8dcc5a1b8f0` · `payment-submissions.service.ts` `dd8b328d9ace` · `payment-submissions.helpers.ts` `41148a3421ac` · `payment-submissions.mapper.ts` `4e9ed3b9e7d0` · `invoices.service.ts` `847118b2911c` · `accounting-posting.service.ts` `f31fa3e96a7f` · `invoice-payments.service.ts` `ef93f81bfd1a` · `schema.prisma` `469fed9c680b`
