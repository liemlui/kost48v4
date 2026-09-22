# Keuangan — Domain

Tanggal: 2026-09-22
Status: aktif
Tujuan: kontrak & aturan keuangan (dari M04)
Rujukan: [M02](../M02_KEPUTUSAN_OWNER.md) · [M12](../M12_CHECKLIST_CHANGELOG.md) · [M04](../M04_KEUANGAN.md) · [domain/kontrak.md](kontrak.md)

> Migrasi dari docs/M04_KEUANGAN.md L23–120 (Update normatif) + Bagian 2/3
> (
e0f8984f
, S2.b Tahap 3). Bagian 2/3 ditambahkan pada S2.b2.

<a id="override-fase-v--dampak-keuangan"></a>
<a id="override-fase-v---dampak-keuangan"></a>
## Override Fase V — Dampak Keuangan
Kontrak status kamar: [kontrak.md](kontrak.md#override-fase-v--status-kamar).

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

## Quota Utilitas Berbasis Periode Sewa Lunas

> **Kanonik (dedup D-01, keputusan owner 23 Sep 2026).** Hanya bagian ini yang mengikat; salinan yang beredar di `domain/operasional.md` § Bagian 6 dan `history/changelog/2026-07.md` adalah rujukan ke sini.

- Dasar quota listrik gratis bukan lagi selalu satu bulan kalender. `MeterReadingsService` dan settlement renewal memakai periode sewa awal/perpanjangan dengan invoice `RENT` berstatus `PAID` sebagai sumber utama.
- Perpanjangan tiga bulan menerima tiga kali `freeElectricityKwhPerMonth`; pembacaan meter di tengah periode hanya boleh menagihkan sisa quota yang belum dipakai/ditagihkan dalam periode yang sama.
- Invoice DP renewal sengaja dikecualikan: DP belum memperpanjang masa tinggal sehingga tidak boleh mereset quota.
- `IotTelemetry` tidak menjadi jurnal atau invoice. Hanya `MeterReading` melalui service bisnis ber-audit yang dapat menerbitkan tagihan utilitas.

## SI-4 Invoice Purpose

Sesuai analisa PDF dan temuan owner 2026-06-16, invoice tidak boleh hanya terbaca sebagai nomor. UI harus menjawab "tagihan ini buat apa" sebelum tenant/admin membuka detail.

- **SI-4 selesai:** `invoicePurposeLabel` dan `invoicePurposeMeta` menurunkan peruntukan dari `InvoiceLineType`.
- Label utama: `Sewa`, `Listrik`, `Air`, `Listrik & Air`, `Sewa + Listrik`, `Uang Muka (DP)`, `WiFi`, dan `Denda`.
- Badge "Tagihan <peruntukan>" tampil di daftar tenant, daftar backoffice, detail invoice backoffice, dan detail invoice tenant; nomor invoice turun menjadi subteks.
- Tidak ada migrasi schema: peruntukan diturunkan dari baris invoice, bukan kolom baru.
- Prinsip bisnis: kejelasan invoice mengurangi dispute, memperkuat trust, dan menyambungkan pembayaran ke riwayat sewa.

## Fase G AI Finance Analyst

AI finance hanya boleh menjadi analis dan pembuat draft keputusan Owner/Admin. Detail implementasi ada di `docs/domain/ai.md`.

- **Manual only:** tombol seperti "Analisa Finance dengan AI" tidak boleh terpanggil otomatis saat halaman finance dibuka.
- **Owner-only untuk analisa mendalam:** AI membaca snapshot trial balance, P&L, cashflow, ratios, readiness, period close, dan deposit reconciliation; output berupa temuan, risiko, dan rekomendasi.
- **Tidak boleh mutasi ledger:** AI tidak boleh membuat/mengubah `JournalEntry`, `Invoice`, `InvoicePayment`, `Expense`, `AccountingPeriod`, `CashAccount`, atau `OpeningBalance`.
- **Guard tetap deterministik:** trial balance, no-partial, deposit liability, period OPEN/CLOSED, dan readiness tetap milik service accounting. Jika AI berbeda pendapat dengan guard backend, backend menang.
- **Expense OCR draft:** nota biaya boleh di-OCR lokal lalu AI menormalkan teks menjadi draft expense. Admin/Owner tetap mengoreksi dan klik simpan; posting expense/jurnal mengikuti service existing.
- **Audit trail:** jika rekomendasi AI dipakai untuk approve/reject pembayaran atau membuat expense, catat `AuditLog.meta.ai` berisi feature, model, promptHash, snapshotHash, confidence, dan humanDecision.

## Payment Booking Fase V

Keputusan booking awal Fase V mengubah arti status kamar, tetapi tidak mengubah prinsip keuangan:

- DP 30% approved dan pelunasan approved sama-sama mengunci room menjadi `RESERVED`.
- `RESERVED` bukan bukti lunas; bukti lunas tetap invoice `PAID` atau total pembayaran invoice >= total tagihan.
- Payment approval tidak boleh mengubah room ke `OCCUPIED`, tidak boleh promote meter, dan tidak boleh mengisi `initialMetersPromotedAt`.
- Check-in/serah kunci wajib lunas penuh; baru setelah itu room `OCCUPIED` dan revenue/lifecycle hunian mengikuti flow promoted.
- Payment proof wajib punya ownership server-side; batch payment tidak boleh membuat submission tanpa file bukti yang terikat user/tenant.
- Guard no-partial tetap berlaku: nominal sah booking adalah DP tepat atau pelunasan tepat sesuai sisa kewajiban yang dihitung server.

## Kebijakan Pembayaran & Invoice

Dossier 10 membahas alur uang masuk inti: bukti bayar tenant, review/approve admin, invoice, pembayaran manual, dan meter reading.

Kontrak no-partial, status PARTIAL, dan pelunasan manual ada di [Payment & Invoice Contracts](kontrak.md#3-payment--invoice-contracts); aturan tersebut tidak disalin sebagai kontrak ketiga di sini.

- Pembayaran booking WAJIB lewat approve bukti (bukan pembayaran manual) — guard A1 di invoice-payments.create:142-150.
- Reversal jurnal saat cancel = BLOCKING (pola A8) di semua jalur.
- Tarif TERKUNCI setelah DP dibayar (tak bisa diubah saat approve) — cegah manipulasi.

## Invarian Pembayaran & Invoice

- Total pembayaran ≤ invoice + sisa deposit; promosi meter & OCCUPIED hanya saat invoice PAID; satu pemenang per kamar; uang masuk = otomatisasi berhenti.

## Kebijakan Akuntansi & Pelaporan

Dossier 13 mencakup jurnal otomatis, COA, general ledger, trial balance, serta laporan keuangan. Kontrak COA 38 akun, idempotensi jurnal, readiness auto-close, reversal blocking, deposit liability, dan laporan ada di [Accounting & Finance Contracts](kontrak.md#10-accounting--finance-contracts); tidak disalin sebagai kontrak ketiga di sini.

- Pembulatan Rupiah memakai helper terpusat common/business/money.helper.ts: roundRupiah(v) dan rupiahAmount(v).

## Invarian Akuntansi & Pelaporan

- Trial balance seimbang; jurnal idempotent per sourceType+sourceId; DRAFT tidak masuk laporan; deposit excluded dari operating cashflow.

## Pengakuan Pendapatan, Arus Kas & Rasio

- Sewa lebih dari satu bulan ditangguhkan ke COA 2200 lalu diakui straight-line per bulan; Invoice dan AR tetap penuh di muka, hanya pengakuan pendapatan dibagi.
- Kas memakai cashAccountId atau prefix 10; AR 1100 bukan kas. Deposit dipisah ke depositLiability dan keluar dari operating cashflow.
- Invarian cashflow: beginning+net=ending. Rasio memakai CASH_PREFIXES 10, INVENTORY_PREFIXES 12, dan CURRENT_LIABILITY_PREFIXES 20/21/22/23.
- Occupancy memakai kamar operable dan stay ACTIVE dengan initialMetersPromotedAt.

## Otomasi Biaya dan Penutupan Bulanan

- Expense.status membedakan DRAFT, CONFIRMED, dan CANCELLED; recurringKey unik mencegah draft kategori-bulan ganda.
- Laporan, readiness, analytics, finance, dan posting jurnal hanya memakai expense CONFIRMED. Konfirmasi draft dan posting jurnal berjalan dalam satu transaksi.
- AutoOps membuat maksimal enam draft biaya rutin, menjalankan depresiasi bulan sebelumnya sebelum auto-close, dapat dipicu OWNER/ADMIN, dan aman dijalankan ulang.

## Kebijakan Kapitalisasi Aset & Saldo Awal

Detail keputusan owner: [M02 §Kuis Audit Aset & Nilai](../M02_KEPUTUSAN_OWNER.md).

## Status Audit Invarian Keuangan (per Jul 2026)
Daftar invarian kanonik (8 invarian) beserta harness verifikasinya ada di [operations/verifikasi-keuangan.md](../operations/verifikasi-keuangan.md) — dipindah dari M04 Bagian 1 pada 23 Sep 2026. Tabel di bawah adalah **status resmi**; bukti auditnya di [audit/audit-360-uang-2026-07.md](../audit/audit-360-uang-2026-07.md).

| Invariant | Status |
|-----------|--------|
| Trial Balance `isBalanced: True` | ✅ LULUS |
| Deposit Reconciliation MATCHED (16 stay, Rp8jt) | ✅ LULUS |
| Cashflow `beginning+net=ending` (unit test 13/13) | ✅ LULUS |
| Financial Ratios expenseRatio benar (unit test 12/12) | ✅ LULUS |
| 8 invarian keuangan (daftar kanonik di [operations/verifikasi-keuangan.md](../operations/verifikasi-keuangan.md)) | ✅ 5 lulus · ⚠️ 3 bercatatan: #3 receipt best-effort, #6 TB dapat tidak seimbang bila P1-01 terjadi, #7 mismatch bila P1-02 terjadi |
| Temuan P1-01..P1-03 (jurnal & deposit *best-effort*) | ✅ Indikasi diperbaiki — verifikasi **statis** 23 Sep 2026; P1-04..P1-09 UNKNOWN ([bukti](../audit/p1-uang-status-2026-09-23.md)) |
| 7 DO-NOT-TOUCH blocks | ✅ SEMUA UTUH |
| Dead code: `postPaymentReversalTx` (0 pemanggil) | 🟡 Minor |
| Unmapped transactions | ✅ 0 |
| PSAK 72 RentRecognitionSchedule | ✅ 0 stranded |
