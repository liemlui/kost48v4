# Keuangan — Domain

Tanggal: 2026-09-22
Status: aktif
Tujuan: kontrak & aturan keuangan (dari M04)
Rujukan: [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) · [ANTREAN](../ANTREAN.md) · [keuangan](keuangan.md) · [domain/kontrak.md](publik.md#d4c-kontrak)

> Migrasi dari docs/M04_KEUANGAN.md L23–120 (Update normatif) + Bagian 2/3
> (
e0f8984f
, S2.b Tahap 3). Bagian 2/3 ditambahkan pada S2.b2.

<a id="override-fase-v--dampak-keuangan"></a>
<a id="override-fase-v---dampak-keuangan"></a>
## Override Fase V — Dampak Keuangan
Kontrak status kamar: [kontrak.md](publik.md#d4c-kontrak).

**Kontrak room status final mengikuti Fase V di [domain/kontrak.md](publik.md#d4c-kontrak) (status kamar) dan berkas ini (dampak keuangan):**

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

Untuk eksekusi coding, AI eksekutor WAJIB membaca aturan Fase V (V-00..V-16) di [domain/kontrak.md](publik.md#d4c-kontrak) dan [domain/keuangan.md](keuangan.md) sebagai sumber kebenaran, bukan narasi historis di bagian lama dokumen ini.

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

Kontrak no-partial, status PARTIAL, dan pelunasan manual ada di [Payment & Invoice Contracts](publik.md#d4c-kontrak); aturan tersebut tidak disalin sebagai kontrak ketiga di sini.

- Pembayaran booking WAJIB lewat approve bukti (bukan pembayaran manual) — guard A1 di invoice-payments.create:142-150.
- Reversal jurnal saat cancel = BLOCKING (pola A8) di semua jalur.
- Tarif TERKUNCI setelah DP dibayar (tak bisa diubah saat approve) — cegah manipulasi.

## Invarian Pembayaran & Invoice

- Total pembayaran ≤ invoice + sisa deposit; promosi meter & OCCUPIED hanya saat invoice PAID; satu pemenang per kamar; uang masuk = otomatisasi berhenti.

## Kebijakan Akuntansi & Pelaporan

Dossier 13 mencakup jurnal otomatis, COA, general ledger, trial balance, serta laporan keuangan. Kontrak COA 38 akun, idempotensi jurnal, readiness auto-close, reversal blocking, deposit liability, dan laporan ada di [Accounting & Finance Contracts](publik.md#d4c-kontrak); tidak disalin sebagai kontrak ketiga di sini.

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

Detail keputusan owner: [KEPUTUSAN-OWNER §Kuis Audit Aset & Nilai](../KEPUTUSAN-OWNER.md).

## Status Audit Invarian Keuangan (per Jul 2026)
Daftar invarian kanonik (8 invarian) beserta harness verifikasinya ada di [operations/verifikasi-keuangan.md](../operations/produksi.md#d4b-verifikasi) — dipindah dari M04 Bagian 1 pada 23 Sep 2026. Tabel di bawah adalah **status resmi**; bukti auditnya di [audit/audit-360-uang-2026-07.md](../arsip/audit-uang-huni-2026-07.md).

| Invariant | Status |
|-----------|--------|
| Trial Balance `isBalanced: True` | ✅ LULUS |
| Deposit Reconciliation MATCHED (16 stay, Rp8jt) | ✅ LULUS |
| Cashflow `beginning+net=ending` | ✅ LULUS — cek: `npm run test:unit` (cwd `backend`), berkas `cashflow-classifier.test.js` |
| Financial Ratios expenseRatio benar | ✅ LULUS — cek: `npm run test:unit` (cwd `backend`), berkas `financial-ratios.helper.test.js` |
| 8 invarian keuangan (daftar kanonik di [operations/verifikasi-keuangan.md](../operations/produksi.md#d4b-verifikasi)) | ✅ 5 lulus · ⚠️ 3 bercatatan: #3 receipt best-effort, #6 TB dapat tidak seimbang bila P1-01 terjadi, #7 mismatch bila P1-02 terjadi |
| Temuan P1-01..P1-03 (jurnal & deposit *best-effort*) | ✅ Indikasi diperbaiki — verifikasi **statis** 23 Sep 2026; P1-04..P1-09 UNKNOWN ([bukti](../arsip/audit-uang-huni-2026-07.md)) |
| 7 DO-NOT-TOUCH blocks | ✅ SEMUA UTUH |
| Dead code: `postPaymentReversalTx` (0 pemanggil) | 🟡 Minor |
| Unmapped transactions | ✅ 0 |
| PSAK 72 RentRecognitionSchedule | ✅ 0 stranded |


<a id="d4c-harga"></a>
## Bagian B — Harga

Tanggal: 2026-09-23
Status: aktif
Tujuan: aturan resmi & terimplementasi penentuan harga kamar (harian, mingguan, 2-mingguan, bulanan, semester, tahunan), pembulatan, utilitas, DP & deposit, rent-lock, prabayar, dan kewenangan role (dari M18)
Rujukan: [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) · [ANTREAN](../ANTREAN.md) · [harga](keuangan.md#d4c-harga) · [keuangan.md](keuangan.md) · [hunian.md](hunian.md) · [kontrak.md](publik.md#d4c-kontrak) · [operasional.md](hunian.md#d4c-operasional)

> Migrasi dari docs/M18_ATURAN_HARGA_KAMAR.md (B3 Tahap 3, 23 Sep 2026) pada DOC-GOV-20260922; teks aturan tidak diubah.
> Batch B3 memindahkan **seluruh isi M18 apa adanya** ke file ini (satu tujuan per handoff owner); nomor & urutan bagian sama seperti aslinya.

> Dokumen ini merangkum **aturan resmi & terimplementasi** penentuan harga kamar KOST48.
> Sumber kode: `backend/src/modules/tenant-bookings/pricing.helper.ts`, `frontend/src/utils/pricing.ts`, `tenant-bookings.helpers.ts`, `prepay-extension.service.ts`, `rooms.service.ts`, `docs/KEPUTUSAN-OWNER.md`.
> Terakhir diperbarui: 2026-08-22.

---

### 1. Prinsip Dasar — Tarif Bulanan Adalah Pangkal Semua Harga

1. **Satu-satunya sumber kebenaran harga** adalah kolom `Room.monthlyRateRupiah` (tarif bulanan dalam Rupiah).
2. **Semua harga term lain (harian, mingguan, 2-mingguan, semester, tahunan) DITURUNKAN dari tarif bulanan** memakai formula resmi — **bukan** kolom harga manual.
3. Kolom `dailyRateRupiah` / `weeklyRateRupiah` / `biWeeklyRateRupiah` **hanya dipakai sebagai "pintu ketersediaan"** (apakah term ditawarkan?), **bukan** sebagai harga final.
4. Audit M-40: *"Harga tampil harus sama dengan harga yang DITAGIH backend — semua term diturunkan dari tarif bulanan via formula resmi."* Artinya tampilan katalog dan tagihan **selalu sama**, karena memakai rumus yang identik.
5. Kamar **aktif wajib memiliki `monthlyRateRupiah > 0`** (diberlakukan saat simpan: `ConflictException('Kamar aktif wajib memiliki monthlyRateRupiah > 0')`).

---

### 2. Formula Multiplikator (PRICING_MULTIPLIERS)

| Term | Kode API | Pengali × Tarif Bulanan | Keterangan |
|------|----------|--------------------------|------------|
| **Harian** | `DAILY` | **0,13 ×** tarif bulanan | Listrik & air **SUDAH TERMASUK** (all-in) |
| **Mingguan** | `WEEKLY` | **0,50 ×** tarif bulanan | Listrik & air **SUDAH TERMASUK** (all-in) |
| **2-Mingguan** | `BIWEEKLY` | **0,75 ×** tarif bulanan | Listrik & air **SUDAH TERMASUK** (all-in) |
| **Bulanan** | `MONTHLY` | **1,00 ×** tarif bulanan | Listrik & air **DIHITUNG TERPISAH** via meter |
| **Semester (6 bulan)** | `SMESTERLY` | **5,70 ×** tarif bulanan | Listrik & air **DIHITUNG TERPISAH** via meter |
| **Tahunan (12 bulan)** | `YEARLY` | **11,00 ×** tarif bulanan | Listrik & air **DIHITUNG TERPISAH** via meter |

#### Catatan penting
- **Provenance angka:** owner-confirmed 2026-06-24; implementasi `pricing.helper.ts`. Dicatat sebagai kanonik di sini pada dedup D-02/D-05 (keputusan owner 23 Sep 2026) — sebelumnya angka yang sama diulang di `product/orientasi.md` §2 dan `domain/hunian.md` § Dossier 11.
- `SMESTERLY` = 5,7× → efektif **Rp 0,95/bulan** (diskon ~5% dari 6×).
- `YEARLY` = 11× → efektif **Rp 0,917/bulan** (diskon ~8,3% dari 12×).
- Diskon jangka panjang ini khusus pada **prabayar di muka penuh** (lihat §10).

---

### 3. Pembulatan — Selalu Ke Atas Kelipatan Rp 5.000

`roundUpToNearest(monthlyRate × multiplier, 5000)`:

```
raw = monthlyRateRupiah × multiplier
hasil = ceil(raw / 5.000) × 5.000
```

- Konstanta: `PRICING_ROUND_TO = 5000`.
- **Selalu dibulatkan KE ATAS** ke kelipatan Rp 5.000 (bukan nearest/biasa).
- Jika hasilnya ≤ 0 → harga = 0 (berarti term tidak ditawarkan).

**Contoh perhitungan** (tarif bulanan Rp 1.000.000):

| Term | Perhitungan | Dibulatkan |
|------|-------------|------------|
| Harian | 1.000.000 × 0,13 = 130.000 | **Rp 130.000 / hari** |
| Mingguan | 1.000.000 × 0,50 = 500.000 | **Rp 500.000 / minggu** |
| 2-Mingguan | 1.000.000 × 0,75 = 750.000 | **Rp 750.000 / 2 minggu** |
| Bulanan | 1.000.000 × 1,00 = 1.000.000 | **Rp 1.000.000 / bulan** |
| Semester | 1.000.000 × 5,70 = 5.700.000 | **Rp 5.700.000 / 6 bulan** |
| Tahunan | 1.000.000 × 11,00 = 11.000.000 | **Rp 11.000.000 / 12 bulan** |

**Contoh pembulatan** (tarif bulanan Rp 900.000):

| Term | Perhitungan | Dibulatkan |
|------|-----------|------------|
| Harian | 900.000 × 0,13 = 117.000 | → **Rp 120.000 / hari** |
| Mingguan | 900.000 × 0,50 = 450.000 | → **Rp 450.000 / minggu** |
| 2-Mingguan | 900.000 × 0,75 = 675.000 | → **Rp 675.000 / 2 minggu** |
| Semester | 900.000 × 5,70 = 5.130.000 | → **Rp 5.130.000 / 6 bulan** |
| Tahunan | 900.000 × 11,00 = 9.900.000 | → **Rp 9.900.000 / 12 bulan** |

**Contoh pembulatan** (tarif bulanan Rp 1.750.000):

| Term | Perhitungan | Dibulatkan |
|------|-----------|------------|
| Harian | 1.750.000 × 0,13 = 227.500 | → **Rp 230.000 / hari** |
| Mingguan | 1.750.000 × 0,50 = 875.000 | → **Rp 875.000 / minggu** |
| 2-Mingguan | 1.750.000 × 0,75 = 1.312.500 | → **Rp 1.315.000 / 2 minggu** |
| Bulanan | 1.750.000 × 1,00 = 1.750.000 | → **Rp 1.750.000 / bulan** |
| Semester | 1.750.000 × 5,70 = 9.975.000 | → **Rp 9.975.000 / 6 bulan** |
| Tahunan | 1.750.000 × 11,00 = 19.250.000 | → **Rp 19.250.000 / 12 bulan** |

> Karena pembulatan ke atas, harga yang tampil bisa lebih besar sedikit dari jumlah mentah, TETAPI tampilan & tagihan selalu memakai angka yang sama (nilai pembulatan).

---

### 4. Ketersediaan Term Berdasarkan Kolom Harga

| Term | Syarat | Tersedia bila |
|------|--------|----------------|
| `DAILY` | kamar menawarkan term harian | `dailyRateRupiah > 0` |
| `WEEKLY` | kamar menawarkan term mingguan | `weeklyRateRupiah > 0` |
| `BIWEEKLY` | kamar menawarkan term 2-mingguan | `biWeeklyRateRupiah > 0` |
| `MONTHLY`, `SEMESTERLY`, `YEARLY` | semua memakai basis bulanan | `monthlyRateRupiah > 0` |

- Satu kolom `monthlyRateRupiah > 0` otomatis **mengaktifkan 3 term**: `MONTHLY`, `SEMESTERLY`, dan `YEARLY`.
- Kolom harian/mingguan/2-mingguan bila bernilai 0 atau null → term tersebut **tidak ditawarkan** pada kamar.
- Kamar **aktif (isActive=true) WAJIB** `monthlyRateRupiah > 0`; tarif harian/mingguan opsional.

---

### 5. Utilitas — Listrik & Air

Aturan `isUtilitiesIncludedForPricingTerm`:

| Term | Status Utilitas |
|------|----------------|
| `DAILY`, `WEEKLY`, `BIWEEKLY` | **Termasuk** (all-in di tarif) — tidak ditagih meter |
| `MONTHLY`, `SEMESTERLY`, `YEARLY` | **Pisah via meter** (pascabayar dihitung dari pemakaian) |

#### Aturan tambahan (keputusan owner & FAQ):
- Sewa bulanan: tiap kamar mendapat **jatah gratis listrik bulanan**; kelebihannya ditagih dengan **tarif per kWh** (keduanya disetel di `OperationalSetting`; tarif kamar bisa di-override OWNER). **Nilai default tidak diulang di sini** — konstanta kanonik di [operasional.md § Konstanta owner-settable](hunian.md#d4c-operasional), dasar periode quota di [keuangan.md § Quota Utilitas](keuangan.md#quota-utilitas-berbasis-periode-sewa-lunas).
- Air: hanya ditagih bila sesuai setting aktif, dengan tarif per m³ (dari `OperationalSetting.waterTariffPerM3Rupiah`).
- **Air gratis sementara (keputusan P19, 19 Okt 2026):** `waterMeteringEnabled=false`, tarif 0, tidak ada tagihan air sampai sensor waterflow IoT tersedia.
- Untuk tarif jangka pendek (harian/mingguan/2-mingguan), listrik & air **SUDAH TERMASUK** — tidak ditagih meter.
- Estimasi tambahan listrik (FAQ): kipas umumnya tidak ada tambahan; AC hemat Rp 0–100rb; AC rata-rata Rp 100rb–200rb; pasutri sering di kos Rp 200rb–300rb.

---

### 6. Periode Sewa Berdasarkan Term

Periode mulai **inclusive**, tanggal akhir (`periodEnd`/`plannedCheckOutDate`) **exclusive**:

| Term | Penambahan periode |
|------|---------------------|
| Harian | `+1 hari` |
| Mingguan | `+7 hari` |
| 2-Mingguan | `+14 hari` |
| Bulanan | `+1 bulan kalender` (Clamp: 31 Jan + 1 bln = 28/29 Feb) |
| Semester | `+6 bulan kalender` |
| Tahunan | `+12 bulan kalender` |

Contoh: check-in 1 September + 3 bulan → berakhir 1 Desember (exclusive). 31 Jan + 1 bulan → 28/29 Februari.

---

### 7. Uang Muka (DP) & Deposit

> **Kanonik nominal DP & deposit (dedup D-02, keputusan owner 23 Sep 2026).** Angka 30% dan `Room.defaultDepositRupiah` di seksi ini adalah rujukan kanonik. Penyebutan kontekstual di [hunian.md](hunian.md#dossier-11--booking--renewal-normatif), [kontrak.md](publik.md#d4c-kontrak), [flow.md](publik.md#d4c-flow), dan [keuangan.md](keuangan.md) dipertahankan sebagai bagian alur domainnya — bukan salinan yang dihapus.

#### DP (uang muka pemesanan) — G-4/B
- **DP = 30% × tarif periode** (sesuai `pricingTerm`): `roundRupiah(agreedRentAmountRupiah × 30 / 100)`.
- **Non-refundable** (hangus saat booking dibatalkan / gagal lunas).
- **Merupakan bagian dari harga sewa** — bukan biaya tambahan.
- Setelah DP dibayar untuk tarif tertentu, **tarif tidak boleh lagi diubah** lewat approval (kecuali batal dan negosiasi ulang).

#### Prinsip NO-PARTIAL (D-02)
Pembayaran yang sah HANYA:
1. **DP 30% persis**, atau
2. **Pelunasan penuh** = sisa invoice + sisa deposit.
Jalur invoice-only (renewal/utilitas) wajib lunas penuh.

#### Deposit jaminan
- **Selalu** = `Room.defaultDepositRupiah` (nilai bawaan kamar) — **ADMIN tidak boleh mengubah deposit** (D-05). Berlaku di **semua kanal** (booking publik, booking portal, walk-in); tidak ada override.
- **Nilai bawaan per kamar (keputusan owner 21 Okt 2026):** kamar **AC Rp 200.000**, kamar **non-AC Rp 100.000** — disimpan di `Room.defaultDepositRupiah` per kamar. Stay yang sudah berjalan **tidak** di-retro; nilai baru berlaku untuk booking/aktivasi berikutnya.
- Merupakan **dana titip, liability (kewajiban), BUKAN revenue**.

---

### 8. Penghuni Ekstra — Surcharge +20%

| Ukuran Kamar | Penghuni Gratis | Maks Booking | Maks Ekstra |
|--------------|-----------------|--------------|-------------|
| `SMALL/STANDARD` (2,5×3 m) | **2 orang** | **4 orang** | 2 |
| `LARGE` (3×3,5 m) | **4 orang** | **6 orang** | 2 |

**Aturan (keputusan owner D-24):**
- Penghuni di atas batas gratis dikenakan **+20% harga sewa per kepala ekstra**:
  `surcharge = roundUpToNearest(baseRent × 0,20 × jumlahEkstra, 5.000)`
- Contoh: tarif bulanan Rp 1.000.000, kamar STANDARD dihuni 3 orang (1 ekstra) → surcharge = 1.000.000 × 0,20 × 1 = Rp 200.000 (dibulatkan ke 5rb).
- Lebih dari 2 ekstra **tidak dibolehkan sistem** (kamar tidak layak huni).
- Surcharge dan deposit hewan dihitung di **semua kanal** (publik, portal, walk-in) dengan helper yang sama.

---

### 9. Kunci Harga Sewa Tenant Loyal (Rent-Lock) — D-16

- Tenant yang **memperpanjang tanpa putus kontrak** → harga sewa **DIKUNCI** (tidak naik) — memakai `agreedRentAmountRupiah` yang sudah disepakati.
- Harga **hanya bisa naik** jika: kontrak terputus → gagal bayar → atau memesan ulang sebagai penghuni baru (re-kontrak).
- Saat **pindah kamar (transfer room)**, harga juga tetap dikunci; perubahan harga sewaktu pindah adalah **OWNER-only** (D-17).
- Saat **renewal dengan ganti term** (dari bulanan ke harian dsb.), harga dikunci → dihitung ulang agar setara (re-multiply dengan rasio multiplier).

---

### 10. Prabayar / Perpanjangan dengan Diskon Jangka Panjang (D-18 / A-5 / F5-8)

Tenant dapat **membayar di muka 1–24 bulan** (kapan saja — tak harus menunggu kontrak habis):

| `rateTerm` | Syarat Minimum | Harga Efektif per Bulan | Total |
|------------|----------------|---------------------------|-------|
| `MONTHLY` | 1–24 bulan | `monthlyRent` (harga bulanan dikunci) | `monthlyRent × months` |
| `SEMESTERLY` | ≥ 6 bulan | `roundRupiah(monthlyRent × 5,7 / 6)` | `effectiveMonthly × months` |
| `YEARLY` | ≥ 12 bulan | `roundRupiah(monthlyRent × 11,0 / 12)` | `effectiveMonthly × months` |

- `monthlyRent` sumber: jika stay saat ini `MONTHLY` → pakai `agreedRentAmountRupiah` (lock D-16); jika term lain → pakai `Room.monthlyRateRupiah`.
- **Diblokir jika ada tunggakan** → tenant yang masih memiliki invoice berstatus `ISSUED` atau `PARTIAL` **tidak dapat prabayar** (keputusan A-06).
- Akuntansi PSAK-72: seluruh **prabayar > 1 bulan = unearned revenue** (COA 2200), diakui bertahap per bulan.
- **Poin loyalitas** diberikan untuk prabayar multi-bulan (keputusan A-7, alasan `RENEWAL`).

#### Contoh hitung YEARLY
Tarif bulanan Rp 1.000.000, prabayar 12 bulan:
- effectiveMonthly = 1.000.000 × 11,0 / 12 = **Rp 916.667/bulan**
- total dibayar di muka = 916.667 × 12 = **Rp 11.000.000**

---

### 11. Kewenangan & Batasan Role

- **Setelan kamar & harga** (tarif bulanan, deposit, tarif listrik/air, harga harian/mingguan/2-mingguan) — **OWNER-only** (D-17 / F-2-16).
- **STAFF dilarang**: override harga sewa, override tarif listrik, dan override tarif air. Staf memakai harga default kamar yang mengikuti formula.
- **ADMIN** tidak boleh mengubah deposit secara manual; boleh menjalankan operasi lain yang secara eksplisit diizinkan selain 4 area owner-only.

---

### Ringkasan Alur

1. Dimulai dari tarif bulanan `Room.monthlyRateRupiah` (wajib untuk kamar aktif).
2. Owner memilih term: term harian/mingguan/2-mingguan muncul bila kolomnya > 0; bulanan selalu tersedia dan membuka semester + tahunan.
3. Sistem menghitung harga final = `ceil(monthly × multiplier / 5.000) × 5.000`.
4. Term DAILY/WEEKLY/BIWEEKLY → listrik & air sudah termasuk; MONTHLY/SEMESTERLY/YEARLY → listrik & air dihitung meter.
5. Masa sewa dihitung berdasarkan term (1 hari · 7 hari · 14 hari · 1/6/12 bulan, akhir eksklusif).
6. Ekstra penghuni di luar batas gratis → +20% × harga per kepala ekstra (pembulatan ke 5rb).
7. Booking → DP 30%, deposit jaminan default; kunci harga berlaku untuk renewal & pindah kamar.
8. Prabayar ≥6 bln / ≥12 bln berhak diskon semester/tahunan (5,7×/6, 11×/12) — dibayar penuh di muka.

---

*Dokumen ini harus dijaga sinkron dengan `pricing.helper.ts` (backend) dan `utils/pricing.ts` (frontend). Perubahan kebijakan harga memerlukan persetujuan OWNER dan update di KEDUA file kode.*

