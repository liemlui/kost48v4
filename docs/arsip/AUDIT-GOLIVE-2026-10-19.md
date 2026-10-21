> **ARSIP BEKU** · dipindah dari `docs/kerja/` ke `docs/arsip/` pada 2026-10-21 (DOCS-GEN2 D4d). Isi dipindah/dipertahankan sebagai referensi; **jangan dibaca rutin**.

# AUDIT — kesiapan go-live/open beta · inventaris data awal · proteksi finance (potret 2026-10-19)

> **Blok baca** · Jenis: **laporan audit bertanggal (bukti)** · Status: **final untuk potret 2026-10-19 07:05 WIB** · Untuk siapa: owner + sesi agen berikutnya · Baca kalau: memutuskan buka publik/open beta, atau menyusun wizard data awal. · **Jangan** dibaca kalau: mencari status/antrean tugas (itu [ANTREAN](../ANTREAN.md)) atau keputusan final (itu [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md)).

**Sumber tugas:** `docs/kerja/PROMPT-AUDIT-GOLIVE-2026-10-19.md` §1–§9. Sesi ini **tidak** melakukan commit, push, deploy, perubahan kode, atau mutasi DB. Skrip sementara di server sudah dihapus (`rm -f` pada perintah yang sama); skrip lokal dihapus sebelum sesi ditutup.

## 0. Goal & todos (jejak kerja)

| Langkah | Status |
|---|---|
| Recon dokumen izin (AGENTS, KONTRAK §2/§6/§11, akses-ssh, TANYA-OWNER, OPERASI, ANTREAN §3) | selesai |
| Bukti produksi: SSH + smoke publik + inventaris server | selesai |
| Bukti DB: satu skrip SELECT baca-saja (40 kueri) | selesai |
| G1–G5 berstatus + bukti per baris | selesai |
| Matriks proteksi finance (14 kontrol) | selesai |
| Inventaris data awal (30 baris) + blueprint wizard (7 langkah) | selesai |
| Laporan + pertanyaan owner di [TANYA-OWNER](TANYA-OWNER.md) | selesai |
| Gate `node scripts/check-docs.mjs` | selesai (hasil di §9) |
| **Tidak dikerjakan (di luar izin):** perbaikan apa pun, deploy, backup baru, login OWNER, uji restore | blokir (menunggu keputusan owner) |

## 1. Verdict

**NO-GO untuk membuka katalog/booking publik hari ini.** Jalur ke GO: **CONDITIONAL**, hanya bila B1–B6 selesai (perkiraan 1 hari kerja + data dari owner).

- Aturan §4: GO hanya bila G1–G5 `PROVEN` **dan** 0 blocker P0/P1. Hasil ukur: **0 PROVEN · 4 WEAK · 1 MISSING**, dengan **7 blocker P1** dan **0 P0**.
- Yang **sudah kuat** (diukur, bukan diklaim): buku besar produksi seimbang — 23 jurnal POSTED, debit = kredit = **Rp 29.400.000**, selisih 0, 0 entri tidak seimbang, 0 duplikat sumber; piutang **0**; 0 kelebihan bayar; 0 pembayaran/tagihan tanpa jurnal; 11 stay ACTIVE semuanya promoted, 0 kamar dobel-huni; build live **`dyPs68LPy2yq`** sama dengan `version.json` dan `cache-control: no-store`.
- **Tiga risiko terbesar:** (1) katalog publik menampilkan foto kamar yang **404 untuk 13/13 kamar** (DB `images` kosong, `uploads/` 0 berkas); (2) **tarif listrik & air Rp 0** di 13/13 kamar → tagihan berikutnya menghitung pemakaian × 0; (3) **backup DB terakhir 13 Sep 2026** — data 18 Okt tidak tercakup, dan tidak ada bukti uji restore.
- **Syarat minimum naik ke GO:** B1 foto tampil (200), B2 tarif listrik/air terisi + keputusan owner, B3 dump DB baru + satu uji restore, B4 saldo awal kas ditetapkan, B5 deposit dijurnal, B6 email reset hidup (atau dinyatakan nonaktif).
- Klaim "aman/kuat" di laporan ini hanya untuk jalur yang **diukur**. Yang tidak diukur ada di §7 dan ditulis `UNKNOWN`.

## 2. Tabel gate G1–G5

| Gate | Status | Bukti (perintah/berkas/kueri) | Blocker |
|---|---|---|---|
| **G1 Keuangan** | `WEAK` | Kueri DB 2026-10-19 07:03 WIB: TB POSTED 23 entri, debit=kredit=29.400.000, `diff=0` (Q R); 0 entri tidak seimbang (Q Q); 0 POSTED ber-`isBalanced=false` (Q S); outstanding 0 (Q K); kelebihan bayar 0 (Q L); PAID tanpa pembayaran 0 (Q M); pembayaran tanpa jurnal 0 (Q N); tagihan terbit tanpa jurnal 0 (Q O); duplikat sumber jurnal 0 (Q T); periode 2026-09 & 2026-10 `OPEN` (Q W); COA 38 aktif, 2 akun kas (Q U). **Gagal:** `OpeningBalanceBatch` = **0 baris** (Q X); `CashAccount.openingBalanceRupiah` = 0 untuk kedua akun (Q V); 1 entri deposit ledger tanpa `journalEntryId` (Q AG) | B4, B5 |
| **G2 Hunian** | `WEAK` | 11 stay ACTIVE, 11 promoted, 0 duplikat per kamar (Q E, F); 0 kamar OCCUPIED tanpa stay promoted (Q G); 0 stay promoted di kamar bukan OCCUPIED (Q H). Guard kode: `FOR UPDATE` + status kamar + tiket `CHECKOUT_INSPECTION` terbuka + invoice awal wajib PAID (`backend/src/modules/stays/stays.service.ts` baris 202, 265–336). **Gagal:** tidak ada unique index/trigger DB untuk "1 stay aktif per kamar" — `Stay` hanya `@@index([roomId, status])` dan migrasi berisi **0 `CREATE TRIGGER`**, **0 CHECK** (Q AB, AC); AL-FIX-7 masih lokal (working tree kotor, `dist/main.js` mtime 18 Okt 10:58) | B7, B13 |
| **G3 Akses** | `WEAK` | Gate KTP di DB `true` (Q AA); `GET /api/public/availability/setup` tanpa PIN → **403**, perbandingan `timingSafeEqual` + PIN min 6 (`backend/src/modules/marketing/marketing-public-rooms.service.ts` 830–843); rate limit auth 10/15 mnt `failClosed` + PIN 20/15 mnt (`backend/src/main.ts` 143–172), dan **3×429** muncul di log akses; guard JWT global via `APP_GUARD` + `@Public()` (`backend/src/common/guards/jwt-auth.guard.ts` 7–9); `POST /api/auto-ops/cron` tanpa token → **403**. **Gagal:** email reset mati — Brevo **401** "unrecognised IP 203.161.184.108" di `stderr.log` 2026-10-19 05:53; akun ADMIN/STAFF = **0** (Q Y); login OWNER **tidak diuji** (tanpa kredensial, tidak diminta) | B6, B14 |
| **G4 Operasional** | `WEAK` | `/version.json` 200 `dyPs68LPy2yq` = `client/version.json`, `cache-control: no-store`; `/` 200, `/login` 200, `/cek` 200, `/api/public/rooms` 200 (12.506 B); log 3.000 baris terakhir: 419×200, 12×404, 9×401, 3×429, **0×5xx**; `AUTO_OPS_CRON_TOKEN` ada, `JWT_SECRET` ≥32, `PIN` ≥6 (kehadiran saja, nilai tidak dicetak). **Gagal:** dump DB terbaru **13 Sep 2026** (`~/backups` 17 berkas, hanya 1 `.sql.gz`); crontab **kosong** (hanya `MAILTO=""`) sehingga AutoOps hanya `setInterval` in-process; **3 proses Node** ≈ 119+130+199 MB = **449 MB** dari RAM 512 MB; `/cek` publik & basi (menyebut "gate KTP ditunda", "12 terisi/1 tersedia", "PIN lama lemah") | B3, B8, B11, B12 |
| **G5 Data** | `MISSING` | 13 kamar: 11 OCCUPIED, 2 AVAILABLE (Q B); **foto 0/13** (`images` kosong) dan `uploads/` berisi **0 berkas**; 3 URL foto yang diuji (`/api/uploads/room-images/kamar-a.webp`, `-a-1.webp`, `/uploads/room-images/kamar-a.webp`) → **404 semua**; **`RoomFacility` 0 baris**, 13 kamar tanpa fasilitas (Q D); tarif listrik **0 di 13**, tarif air **0 di 13** (Q C); 13 tenant, **KTP terverifikasi 0**, **foto KTP 0/13**, email 1 kosong, kontak darurat 13 kosong (Q Z) | B1, B2, B7 |

## 3. Blocker

| ID | Sev | Dampak (uang/data/pengguna) | Pemilik keputusan | Perbaikan | Estimasi |
|---|---|---|---|---|---|
| **B1** | P1 | Katalog publik: setiap kartu kamar memuat 4 URL foto yang 404 → pengunjung melihat gambar rusak pada 13/13 kamar | Owner (aset foto) + agen (unggah) | Unggah foto lewat menu Kamar (atau salin ke `uploads/room-images`), lalu buktikan 1 URL → 200 | 1–3 jam |
| **B2** | P1 | **Uang:** tagihan baru menghitung pemakaian listrik/air × Rp 0 → tagihan kurang saji; `waterMeteringEnabled=false` | Owner (nominal) | Isi tarif per kamar atau konstanta operasional; sepakati perlakuan tagihan yang sudah PAID | 30 menit + keputusan |
| **B3** | P1 | **Data:** DB hanya punya dump 13 Sep; 11 invoice/11 pembayaran/23 jurnal 18 Okt tidak tercakup; tidak ada bukti uji restore | Owner (izin membuat dump) | `pg_dump` sekarang + jadwal + 1 uji restore ke DB terpisah | 1 jam (+ jadwal) |
| **B4** | P1 | **Uang:** neraca tidak berangkat dari saldo riil; `OpeningBalanceBatch` 0 baris, opening kas 0, sementara 29,4 jt sudah terjurnal | **Owner** (A5 di [ANTREAN](../ANTREAN.md)) | Tetapkan angka cutover kas/bank, buat batch saldo awal, posting; atau nyatakan zero-start tertulis | 1–2 jam |
| **B5** | P1 | **Uang:** 1 entri deposit ledger Rp 200.000 tanpa jurnal; hanya 1 dari 11 stay punya ledger deposit → liabilitas 2000 kurang saji | Owner (kebijakan deposit) | Backfill deposit (`/accounting` backfill dry-run → execute) atau catat resmi "deposit belum dijurnal" | 1 jam |
| **B6** | P1 | Pengguna: reset sandi mandiri mati (OWNER/TENANT); tanpa ADMIN, OWNER satu-satunya operator | **Owner** (P18) | Tambahkan IP server di Brevo + verifikasi pengirim, lalu uji kirim; rotasi kunci | 15 menit owner |
| **B7** | P1 | Onboarding: gate KTP aktif + 0 verifikasi + 0 foto KTP → check-in/aktivasi berikutnya **diblokir**; PDP belum terpenuhi | Owner (data KTP) | Unggah & verifikasi 13 KTP lewat menu tenant; uji 1 check-in | 1–2 jam |
| **B8** | P2 | `/cek` publik tanpa login memuat status internal & klaim usang (PIN lemah, "password ada di file server", gate KTP "ditunda", 12 terisi/1 tersedia) | Agen | Perbarui atau turunkan `/cek` dari rute publik; jangan memuat petunjuk berkas sandi | 30 menit |
| **B9** | P2 | Perubahan `OperationalSetting` (termasuk gate KTP, kunci Brevo) tidak masuk `AuditLog` — hanya `updatedById` di baris | Agen | Tulis audit log di `updateOperational` (kecuali nilai rahasia) | 1 jam |
| **B10** | P2 | PostgreSQL **9.6.22** (EOL Nov 2021) — tanpa patch keamanan | Owner/hosting | Minta hosting menaikkan versi; uji di UAT lebih dulu | eksternal |
| **B11** | P2 | 3 proses Node ≈449 MB / RAM 512 MB; 2 proses berumur 15 jam (sisa restart) → risiko OOM saat trafik naik | Agen | Restart bersih + ukur 1 proses; catat di EF-00/EF-02 | 30 menit |
| **B12** | P2 | AutoOps hanya `setInterval` in-process; cron cPanel kosong → sweep bisa berhenti saat Passenger idle | Agen | Pasang cron `POST /api/auto-ops/cron` dengan `X-Cron-Token` | 20 menit |
| **B13** | P2 | Tidak ada jaminan DB untuk: jurnal seimbang, imutabilitas POSTED, idempotensi `(sourceType, sourceId)`, 1 stay aktif/kamar | Agen | Tambah unique index parsial + trigger append-only di migrasi baru (butuh izin skema) | 0,5–1 hari |
| **B14** | P2 | ADMIN/STAFF 0 akun → jalur role ADMIN/STAFF belum pernah terbukti di produksi | **Owner** (P17) | Buat akun ADMIN (butuh email) lalu uji login + 1 aksi | 20 menit |

## 4. Inventaris data awal

Sumber kolom: **UI** = sudah ada layar; **env** = hanya berkas `.env` + restart; **seed/kode** = nilai di kode. "Nilai sekarang" = potret 2026-10-19 07:03 WIB (Q = kueri DB).

| # | Field | Wajib? | Sumber | Validasi | Nilai sekarang | Akibat bila kosong | UI |
|---|---|---|---|---|---|---|---|
| 1 | Nama kos/brand | ya | seed/kode (frontend) | tidak ada | terisi, hardcode | ganti nama = ubah kode + build | belum |
| 2 | Alamat kos | ya | seed/kode — **2 versi** | tidak ada | "Jl. Hikmah V No. 48" (publik) vs "Jl. Kedung Tarukan 4C No. 48" (cetak invoice) | invoice tercetak dengan alamat berbeda dari situs | belum |
| 3 | WhatsApp publik | ya | DB `OperationalSetting.adminWhatsappNumber` | `MaxLength(100)` | 6285648887628 | CTA WhatsApp mati | ada |
| 4 | Email pengirim | ya (reset) | DB `mailFromEmail` + `mailFromName` | `MaxLength(100)` | no-reply@kost48surabaya.com | reset sandi gagal | ada |
| 5 | Kunci Brevo | ya (reset) | DB `brevoApiKey` (fallback env yang tidak ada) | `MaxLength(200)` | terisi di DB | reset sandi mati | ada |
| 6 | IP server diizinkan Brevo | ya (reset) | dashboard Brevo (luar sistem) | di luar sistem | **ditolak 401** | email tidak terkirim | belum |
| 7 | Gate KTP | keputusan | DB `ktpVerificationGateEnabled`, env fallback hanya saat baris dibuat | boolean | `true` | check-in tanpa KTP (risiko PDP) | ada |
| 8 | PIN `/okupansi` | ya | env `AVAILABILITY_OWNER_PIN` | min 6; 20 percobaan/15 mnt | set (len ≥6) | wizard ketersediaan 503 | belum |
| 9 | Kode kamar | ya | DB `Room.code` | unik | 13 terisi | kamar tak bisa dibuat | ada |
| 10 | Tarif bulanan | ya | DB `Room.monthlyRateRupiah` | > 0 | 13 terisi | tagihan Rp 0 | ada |
| 11 | Deposit default | ya | DB `Room.defaultDepositRupiah` | ≥ 0 | 13 terisi | deposit 0 → liability salah | ada |
| 12 | Tarif listrik/kWh | ya | DB `Room.electricityTariffPerKwhRupiah` | ≥ 0 | **0 di 13** | tagihan listrik Rp 0 | ada |
| 13 | Tarif air/m³ | bila metering | DB `Room.waterTariffPerM3Rupiah` + `waterMeteringEnabled` | ≥ 0 | **0 di 13**, metering `false` | tagihan air Rp 0 | ada |
| 14 | Foto kamar | ya (publik) | DB `Room.images[]` + berkas di `uploads/room-images` | berkas harus ada | **0/13**, 0 berkas | katalog gambar rusak | ada |
| 15 | Fasilitas kamar | ya (publik) | DB `RoomFacility` (+`publicVisible`) | — | **0 baris** | katalog tanpa fasilitas | ada |
| 16 | COA | ya | seed `DEFAULT_COA` (38 akun) | kode unik | 38 aktif | posting gagal | ada |
| 17 | Akun kas/bank | ya | DB `CashAccount` (+`bankName`, `accountNumberMasked`, `holderName`) | 1 default | 2 aktif, opening 0 | saldo awal tidak jelas | ada |
| 18 | Saldo awal per cutover | ya | DB `OpeningBalanceBatch` | debit = kredit, periode OPEN | **0 batch** | neraca salah | ada |
| 19 | Periode akuntansi | ya | DB `AccountingPeriod` | unik (year, month) | 2026-09 & 2026-10 OPEN | posting ditolak | ada |
| 20 | Akun OWNER | ya | DB `User` | email unik, JWT | 1 | tidak bisa masuk | ada |
| 21 | Akun ADMIN/STAFF | perlu | DB `User` | email wajib | **0** | jalur role tak terbukti | ada |
| 22 | Akun TENANT | perlu | DB `User` (`tenantId`) | 1 user per tenant | 12 dari 13 tenant | tenant tanpa portal | ada |
| 23 | NIK tenant | ya | DB `Tenant.identityNumber` | unik | 13 terisi | gate KTP tak bisa lewat | ada |
| 24 | Foto KTP | ya (PDP) | DB `Tenant.ktpImageUrl` + berkas | berkas ada | **0/13** | verifikasi mustahil | ada |
| 25 | Verifikasi KTP | ya (gate) | DB `Tenant.ktpVerifiedAt` | — | **0/13** | check-in diblokir | ada |
| 26 | Kontak darurat | perlu | DB `Tenant.emergencyContact*` | — | **0/13** | sulit dihubungi saat darurat | ada |
| 27 | Jam operasional | perlu | **tidak ada field** | — | tidak ada | info hilang dari situs | belum |
| 28 | Kebijakan DP/pembatalan | perlu | teks hardcode/FAQ statis | — | ada di FAQ | berubah = ubah kode | belum |
| 29 | Booking online publik | keputusan | env `PUBLIC_ONLINE_BOOKING_ENABLED` (dibaca `isPublicOnlineBookingEnabled`) | flag | ada di `.env`, **nilai tidak dibaca** | `canBook=false` → hanya WhatsApp | belum |
| 30 | Kunci AI/IoT/push | opsional | DB `deepseekApiKey`/`tuyaKey`/`vapid*` | `MaxLength` | **tidak diisi** | fitur AI/IoT/push mati | ada |

**Paling sering kosong (13/13):** foto kamar · fasilitas kamar · tarif listrik · tarif air · foto KTP · verifikasi KTP · kontak darurat. Lalu: saldo awal (0 batch), deposit ledger (1 dari 11 stay), akun ADMIN/STAFF (0).

## 5. Blueprint wizard data awal

Urutan wajib (langkah berikut bergantung pada sebelumnya). "Sudah ada" = layar/endpoint hari ini.

| # | Langkah | Field | Validasi | Idempotensi | Rollback | Permission | Bukti "selesai" | Ada? |
|---|---|---|---|---|---|---|---|---|
| 1 | Identitas + rekening | nama, alamat, WA, jam operasional, bank/nomor/holder | alamat 1 versi saja; WA 9–15 digit; nomor rekening wajib tersamar | simpan ke 1 baris (upsert) | simpan versi sebelumnya (riwayat) | OWNER | halaman publik **dan** cetak invoice memakai alamat identik | **belum** (field belum ada) |
| 2 | Kamar + tarif + deposit + meter awal | kode, tarif bulanan, deposit, tarif listrik/air, foto, fasilitas, kWh/m³ awal | kode unik; tarif > 0; ≥1 foto termuat (200); ≥1 fasilitas | upsert per `code` | hapus hanya bila tanpa stay/tagihan (FK `Restrict`) | OWNER/ADMIN | `GET /api/public/rooms` → N kamar, semua `images` 200 | sebagian (CRUD ada; validasi ≥1 foto belum) |
| 3 | COA + akun kas + saldo awal | akun kas (bank/holder), tanggal cutover, saldo per akun | total debit = total kredit; periode OPEN; tepat 1 default | batch DRAFT bisa diulang; posting sekali (`OPENING_BALANCE` + nomor jurnal unik) | void selama DRAFT; POSTED butuh reversal (belum ada UI) | OWNER | trial balance seimbang **dan** saldo awal kas = angka cutover | sebagian |
| 4 | Staf + role | nama, email, role, sandi awal | email unik + valid | upsert per email | nonaktifkan (bukan hapus) | OWNER | login ADMIN sukses + 1 aksi tercatat di `AuditLog` | sebagian (menunggu P17) |
| 5 | Email + uji kirim | kunci Brevo, pengirim, nama pengirim | kunci diterima Brevo (bukan 401) | simpan; uji kirim boleh diulang | kunci lama tetap tersimpan sampai diganti | OWNER | uji kirim **200** + log tanpa 401 | **belum** (tidak ada endpoint uji kirim) |
| 6 | KTP + gate | unggah KTP per tenant, verifikasi, toggle gate | berkas gambar valid; verifikator OWNER/ADMIN | verifikasi idempoten (timestamp) | batalkan verifikasi (hapus `ktpVerifiedAt`) | OWNER/ADMIN | 13/13 `ktpVerifiedAt` terisi + 1 check-in uji lolos | sebagian |
| 7 | Publikasi katalog + ketersediaan | overlay ketersediaan, proyeksi kosong, urutan tampil | status overlay valid; PIN benar | simpan per kamar (upsert) | hapus overlay = kembali ke status kamar | OWNER (PIN) | kamar tanpa overlay memakai status kamar; situs menampilkan foto & status yang sama | sebagian |

## 6. Matriks proteksi finance

`PROVEN` = ada bukti yang bisa gagal (constraint/trigger/uji). `WEAK` = hanya kode tanpa pagar/uji. `MISSING` = tidak ada.

| # | Kontrol | Mekanisme | Bukti | Status | Celah | Perbaikan terkecil |
|---|---|---|---|---|---|---|
| 1 | Jurnal seimbang | cek debit = kredit di `postBalancedJournalTx`; `isBalanced` dihitung aplikasi | `backend/src/modules/accounting/accounting-posting.service.ts` 1386–1390; uji `backend/test/unit/audit-hardening-regression.test.js` 201 | `PROVEN` (app) / `MISSING` (DB) | tidak ada CHECK/trigger | constraint/trigger `debit = credit` per entri |
| 2 | POSTED tak bisa diubah/dihapus | tidak ada kode `update`/`delete` pada `JournalEntry` (hanya `create`/`find*`/`count`) | grep seluruh `backend/src` | `WEAK` | ditegakkan oleh **ketiadaan kode**, bukan DB; SQL langsung tetap bisa | trigger `BEFORE UPDATE/DELETE` tolak status POSTED |
| 3 | Periode terkunci menolak posting | `period.status !== 'OPEN'` → error; tutup/buka ulang lewat jurnal closing/reversal | posting service 1397–1401; `accounting-period-close.service.ts` 136, 166 | `PROVEN` (app) | tidak ada pagar DB; `LOCKED` hanya enum | pagar DB pada `entryDate` vs periode |
| 4 | Satu jalur posting | auto-posting terpusat + jalur manual (`accounting.service.ts` 585–615) | dua titik `journalEntry.create` utama | `WEAK` | dua jalur; hanya satu yang memakai `postBalancedJournalTx` | satukan lewat satu fungsi |
| 5 | Idempotensi sumber | cek `(sourceType, sourceId)` non-VOID + nomor entri unik turunan sumber | posting service 1343–1354, 44–50; skema `@@index([sourceType, sourceId])` | `WEAK` | **bukan unique**; entryNumber unik hanya menahan tabrakan tak sengaja | unique index parsial `(sourceType, sourceId) WHERE status <> 'VOID'` |
| 6 | Bayar ≤ sisa tagihan | `SELECT … FOR UPDATE` + total tagihan vs akumulasi bayar | `backend/src/modules/invoice-payments/invoice-payments.service.ts` 152–171; uji `backend/test/unit/payment-policy.test.js` 66–85 | `PROVEN` (app) | tidak ada pagar DB | CHECK di DB tidak mungkin lintas tabel → pertahankan uji |
| 7 | Hapus pembayaran ditolak → reversal | `assertNoActivePaymentJournal` + guard kamar terisi; reversal tersedia | invoice-payments 61–67, 250–267; posting service 805–890 | `PROVEN` | pembayaran tanpa jurnal masih bisa dihapus (jalur posting gagal = rollback) | tambah uji regresi untuk jalur hapus |
| 8 | Deposit liability seimbang | `postDepositReceivedForStayTx` + guard F-24 (settlement hanya bila penerimaan ada) | posting service 547–620, 643–656 | `WEAK` | **data:** 1 entri ledger tanpa jurnal; hanya 1 dari 11 stay ber-ledger | backfill deposit + uji ledger ↔ akun 2000 |
| 9 | Pembulatan rupiah terpusat | `rupiahAmount` dipakai semua jalur + DTO `@IsInt` | posting service 39–42; DTO `debitRupiah` `@IsInt` | `PROVEN` | — | — |
| 10 | Rekonsiliasi kas vs jurnal | laporan menghitung saldo dari ledger (opening + mutasi POSTED), bukan kolom manual; kolom manual diekspos terpisah | `backend/src/modules/accounting/accounting.service.ts` 155–178; `accounting-reports.service.ts` 886–907 | `PROVEN` (laporan) | kolom `CashAccount.currentBalanceRupiah` di DB = 0 → pembaca DB bisa salah tafsir | beri label "manual" di DB/komentar + uji selisih |
| 11 | Audit log mutasi uang | `audit.log` pada create/update/delete pembayaran, stay, invoice | invoice-payments 190, 246, 265; `AuditLog` 33 baris 7 hari terakhir (Q AD) | `WEAK` | log ditulis **di luar** transaksi uang; jurnal & perubahan settings tidak diaudit | tulis audit di dalam transaksi + audit settings |
| 12 | Transaksi atomik / row lock | `$transaction` + `FOR UPDATE` pada `Invoice`/`Room` | invoice-payments 153; `stays.service.ts` 265 | `PROVEN` | lock per baris induk, bukan per operasi global | — |
| 13 | Backup + uji restore | tidak ada penjadwalan; 1 dump manual | `~/backups` 17 berkas, `.sql.gz` terbaru **13 Sep 2026** | `MISSING` | data 18 Okt di luar cakupan; tanpa uji restore | dump harian + 1 uji restore tercatat |
| 14 | Guard role & isolasi tenant | `RolesGuard` + `@Roles`, guard JWT global, filter `tenantId` per service | `backend/src/common/guards/roles.guard.ts`; `stays-query.service.ts` 99; `invoices.service.ts` 226; `tickets.service.ts` 213 (`?? -1`) | `WEAK` | isolasi per endpoint, bukan sistemik; ADMIN/STAFF 0 akun | uji isolasi lintas tenant + buat akun ADMIN |

**Tiga celah terbesar:** (a) tidak ada **satu pun** pagar DB untuk keseimbangan, imutabilitas POSTED, idempotensi sumber, dan 1-stay-per-kamar — semuanya bergantung kode; (b) **backup DB basi 36 hari tanpa uji restore**; (c) **saldo awal & deposit belum tercermin di buku besar** (0 batch saldo awal, 1 deposit tanpa jurnal).

## 7. Yang TIDAK diperiksa (dan alasannya)

1. **Login OWNER/ADMIN/TENANT sungguhan** — tidak ada kredensial dan saya tidak memintanya (larangan §1). Yang terbukti hanya: endpoint kredensial dilindungi rate limit (`failClosed`) dan `3×429` muncul di log.
2. **Uji kirim email** — tidak ada endpoint uji; yang terukur hanya kegagalan 401 di `stderr.log`. Status pengirim di dashboard Brevo = `UNKNOWN`.
3. **Uji restore backup** — tidak boleh menulis DB; hanya keberadaan/umur dump yang diukur.
4. **Uji konkurensi nyata** (dua check-in bersamaan, dua posting bersamaan) — bukti hanya dari kode (`FOR UPDATE`) dan uji unit yang ada; tidak dijalankan di produksi.
5. **Uji alur checkout → bersih → AVAILABLE** di runtime — kode ada (`stay-sweep` set MAINTENANCE, tiket `CHECKOUT_INSPECTION` menutup → AVAILABLE), tapi tidak dieksekusi; tidak ada stay yang di-checkout pada sesi ini.
6. **Endpoint OWNER** (`monthly-income`, `cash-accounts`, `trial-balance`) — butuh token; angka G1 diambil langsung dari DB (lebih kuat untuk keseimbangan, tapi **tidak** membuktikan endpoint/UI-nya benar).
7. **`PUBLIC_ONLINE_BOOKING_ENABLED`** — kehadiran diperiksa, **nilainya tidak dibaca**; apakah booking publik hidup = `UNKNOWN`.
8. **Backup otomatis hosting (cPanel)** — tidak terlihat dari akun; `UNKNOWN`.
9. **AL-FIX-7** — status deploy disimpulkan dari mtime `dist/main.js` (18 Okt 10:58) + `buildId` tidak berubah (18 Okt 10:49); isi berkas yang berjalan **tidak** dibandingkan byte-per-byte.
10. **Kualitas visual/performa** (Core Web Vitals, aksesibilitas) — di luar §1–§9; `/cek` 3.409 B dan `/api/public/rooms` 12.506 B hanya mengukur bahwa halaman menjawab, bukan bahwa tampilannya benar.

## 8. Pertanyaan owner

Ditulis lebih dulu di [TANYA-OWNER](TANYA-OWNER.md) sebagai **P19–P24** (format lima unsur), ringkasnya:

| ID | Inti | Rekomendasi | Default bila tidak dijawab |
|---|---|---|---|
| P19 | Tarif listrik/air Rp 0 di 13 kamar; tagihan berikutnya menghitung × 0 | (a) isi tarif per kamar sekarang | jangan terbitkan tagihan baru yang memuat listrik/air |
| P20 | Saldo awal kas/bank (A5): 0 batch, opening 0, 29,4 jt sudah terjurnal | (a) tetapkan angka cutover lalu posting | zero-start tertulis, laporan kas diberi catatan |
| P21 | Foto kamar 404 & fasilitas kosong di katalog publik | (a) unggah foto + fasilitas sebelum buka | katalog publik ditutup (NO-GO tetap) |
| P22 | Deposit: 1 ledger tanpa jurnal, 1 dari 11 stay ber-ledger | (a) backfill + uji akun 2000 | catat sebagai celah terbuka di laporan |
| P23 | Dua alamat kos berbeda (publik vs cetak invoice) | (a) alamat publik yang benar | sebutkan di laporan, tanpa ubah kode |
| P24 | Izin membuat dump DB sekarang + jadwal + 1 uji restore | (a) ya, buat sekarang | backup tetap 13 Sep; risiko P1 diterima owner |

## 9. Verifikasi sesi ini

| Perintah | Cwd | Exit | Hasil |
|---|---|---|---|
| SSH read-only probe + `pg` SELECT (40 kueri) | server `~/kost48-prod` | 0 | exit 0; skrip sementara dihapus pada perintah yang sama |
| `node scripts/check-docs.mjs` | repo | **0** | `BERSIH — 0 pelanggaran, 0 pemeriksaan dilewati` (79 berkas aktif diperiksa, termasuk laporan ini) |
| `git status --porcelain` | repo | 0 | working tree sudah kotor **sebelum** sesi ini (26 modified + 5 untracked = AL-FIX-6/7); tidak ada berkas sesi ini yang tertinggal |

**Batas kejujuran:** "hijau/lulus" di laporan ini berarti perintahnya keluar 0 dan keluarannya diperiksa — bukan bahwa fitur bekerja untuk pengguna. Yang belum pernah dilihat mata: tampilan katalog dengan foto asli, login OWNER, email reset yang sampai, restore backup, dan satu siklus checkout penuh.
