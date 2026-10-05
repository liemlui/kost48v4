# KEPUTUSAN-OWNER — Register Keputusan Bisnis Owner

Tanggal: 2026-09-23
Status: aktif
Tujuan: register kanonik keputusan bisnis/arah owner — tanggal, status berlaku/digantikan, dan sumber bukti; keputusan tidak diubah oleh pemindahan
Rujukan: [ANTREAN](ANTREAN.md) · [AGENTS](../AGENTS.md) · [ANTREAN](ANTREAN.md) · [KEPUTUSAN-OWNER (pointer)](KEPUTUSAN-OWNER.md) · [izin & catatan](history/izin-dan-catatan-keputusan-owner.md)

> Migrasi dari docs/M02_KEPUTUSAN_OWNER.md (B7 Tahap 3, 23 Sep 2026) pada DOC-GOV-20260922; teks keputusan, tanggal, dan bukti dipindah apa adanya.
> Kelas isi non-keputusan dan izin/approval yang sudah digantikan dipisah ke [history/izin-dan-catatan-keputusan-owner.md](history/izin-dan-catatan-keputusan-owner.md) tanpa mengubah teks.
> Status "berlaku/digantikan" di bawah ditetapkan dari bukti bertanggal; keputusan lama tidak otomatis dianggap tidak berlaku.
> **Diperbarui 24 Sep 2026 (DOCS-CLEANUP-1b):** keputusan owner atas butir A1-A4, C1-C3 ditambahkan sebagai entri baru di bawah; tidak ada keputusan lama yang diubah.

## Status keputusan (berlaku / digantikan) — dari bukti

| Butir | Status | Bukti / pengganti |
|---|---|---|
| Retro-approve kondisional 23 Sep — syarat "setiap batch wajib approval eksplisit" | **digantikan** | [DELEGASI-DOC-TEKNIS](#keputusan-yang-mengikat-ringkas) + [BATCH-B1-B11](#keputusan-yang-mengikat-ringkas) (23 Sep, pasca-B5, `fe2955a3`); teks asli di [history/izin-dan-catatan-keputusan-owner.md](history/izin-dan-catatan-keputusan-owner.md) |
| IZIN-CAKUPAN 23 Sep — "S2.b3/S2.b4/S2.c dan batch berikutnya menunggu approval per batch" | **digantikan** | S2.b3/S2.b4/S2.c dieksekusi atas instruksi percepatan owner 23 Sep; B1–B7 mengikuti urutan batch + DELEGASI-DOC-TEKNIS ([STATUS §5](STATUS.md#5-pelaksanaan-vs-izin-dua-sumbu--jangan-digabung)) |
| ARAH-DOKUMEN 6 Sep — "seri M00–M19 dipertahankan" | **digantikan** | [KONSOLIDASI-FILE](#keputusan-yang-mengikat-ringkas) 23 Sep + [STATUS §8](STATUS.md#8-struktur-dokumen-tujuan-konsolidasi) (7 file utama; path lama menjadi pointer) |
| Keputusan izin bertahap 8 Sep + koreksi lingkup AO | **riwayat** (izin sebagian masih operatif; status eksekusi bertanggal) | Dipisah ke [history/izin-dan-catatan-keputusan-owner.md](history/izin-dan-catatan-keputusan-owner.md); status aktual di [ANTREAN](ANTREAN.md) dan [ANTREAN](ANTREAN.md) |
| Butir lain: D-01..D-31, R1–R5, B1–B5, E/F/K/L/S, OP-*, FIN-*, PUB-*, STF-*, AI-*, OWN-*, W-00-D1..D3, AL-01..AL-04, OC-01..OC-07 | **berlaku** | Tidak ada bukti penggantian yang tercatat per 23 Sep 2026 |
| Batas penataan arsip & berkas besar (DOCS-CLEANUP, 24 Sep 2026 — A1–A4, C1–C3) | **berlaku** | Entri "2026-09-24 — DOCS-CLEANUP" di bawah; bukti batch [M13](M13_CHANGELOG.md) |
| Arah lapisan keputusan AI (25 Sep 2026 — AI-DECISION-*) | **berlaku**; benturan aturan **diselesaikan** oleh `CEPAT-AI-JADWAL` (agenda terjadwal, halaman hanya membaca); rumah simpanan memakai `AiDraft` (tanpa schema baru) | Entri "2026-09-25 — Arah lapisan keputusan AI" + "2026-09-25 — Dua mode" di bawah; rancangan [product/mode-cepat.md](product/mode-cepat.md) |
| Dua mode: Mode Cepat `/cepat` + halaman Normal (25 Sep 2026 — DUA-MODE/CEPAT-*) | **berlaku**; implementasi **belum** | Entri "2026-09-25 — Dua mode" di bawah; rancangan [product/mode-cepat.md](product/mode-cepat.md) |


---

## Entri bertanggal (di arsip)

Seluruh entri bertanggal **13 Juni – 25 September 2026** dipindah utuh ke [arsip/keputusan-owner-2026-06-sd-2026-09.md](arsip/keputusan-owner-2026-06-sd-2026-09.md) (beku, ber-banner). Daftar bagiannya, supaya tidak ada yang tak terlihat:

| Bagian di arsip | Topik |
|---|---|
| 2026-09-24 | DOCS-CLEANUP: batas arsip, berkas >600 baris, preseden kerja |
| 2026-09-23 | DEDUP-UANG; percepatan penataan dokumentasi; prioritas, cakupan izin, KTP, cakupan flow |
| 2026-09-22 | Keputusan penyederhanaan aplikasi |
| 2026-09-06 | Keputusan arah aplikasi |
| 2026-07-08 | Data lapangan produksi + Kuis Audit Aset & Nilai |
| 2026-07-07 / 2026-07-04 | Audit Reasonix Code — keputusan lanjutan |
| 2026-06-30 | W-00 Decision Register (Fase W) |
| 2026-06-17 | Keputusan Operasional & Portal; UI/UX Publik; UI/UX Dashboard |
| 2026-06-13–14 | Register lama `03_KEPUTUSAN_OWNER` (D-01..D-31, R1–R5, B1–B5, E/F/K/L/S, OP-*, FIN-*, PUB-*, STF-*, AI-*, OWN-*) |


## 6. Keputusan owner yang mengikat (ringkas)

Daftar lengkap dan status berlaku/digantikan: [KEPUTUSAN-OWNER.md](KEPUTUSAN-OWNER.md) (register kanonik sejak B7, 23 Sep 2026; `docs/M02_KEPUTUSAN_OWNER.md` sudah dihapus di Fase 3). Kelas riwayat (izin/approval yang sudah digantikan + catatan teknis non-keputusan) ada di [history/izin-dan-catatan-keputusan-owner.md](history/izin-dan-catatan-keputusan-owner.md).

- **DEDUP-UANG** (23 Sep): pengulangan isi aturan uang/harga **boleh didedup** dengan satu pernyataan kanonik di `docs/domain/*` (multiplikator term & DP/deposit → `domain/harga.md`; periode quota → `domain/keuangan.md`; konstanta utilitas → `domain/operasional.md`); angka dan aturan tidak berubah, salinan lain menjadi rujukan. Bukti: [laporan duplikat](history/laporan-duplikat.md) D-02/D-05.
- **PROD-SIMPLE / FLOW-CORE / UX-OWNER-ADMIN** (22 Sep): dahulukan penyederhanaan OWNER/ADMIN pada flow penghuni & keuangan; dashboard harus menjawab "apa yang harus dikerjakan" beserta asal angka.
- **IOT-LATER** (22 Sep): IoT ditunda; pencatatan meter untuk tagihan tetap jalan.
- **IB-FOUNDATION** (22 Sep): landasan IB Diploma Business Management; teori harus terhubung keputusan nyata, bukan menambah kerumitan.
- **IZIN-CAKUPAN** (23 Sep): retro-approve kondisional seperti §5.
- **KTP-GATE-TUNDA** (23 Sep): risiko diterima sementara; wajib ditinjau sebelum onboarding penghuni nyata.
- **FLOW-CORE-CAKUPAN** (23 Sep): keenam flow utama tetap dalam cakupan (penghuni masuk, tagihan & pembayaran, perpanjangan, checkout/deposit, pengeluaran, dashboard harian).
- **DOC-CEPAT + FOKUS-IMPLEMENTASI** (23 Sep): tumpang tindih dokumen diselesaikan dengan eksekusi tegas; setelah itu fokus implementasi aplikasi (task pertama: IMPACT-01, §2 #9).
- **KONSOLIDASI-FILE** (23 Sep): dokumen dirapikan menjadi sedikit file utama tanpa penomoran berserak; docs harus membantu AI bekerja, bukan memperumit.
- **BATCH-B1-B11** (23 Sep): urutan batch handoff (B1–B11, 1 batch = 1 commit) adalah **penomoran resmi** penataan; label lama S2.d/S3–S7 ditandai superseded dan tidak dipakai lagi.
- **DEDUP-QUOTA** (23 Sep): `domain/keuangan.md` § Quota Utilitas = **kanonik**; salinan di `domain/operasional.md` § Bagian 6 dan `history/changelog/2026-07.md` menjadi rujukan. Isi aturan tidak berubah — hanya pengulangan yang dihapus ([bukti](history/laporan-duplikat.md)).
- **TAUTAN-ARSIP-B11** (23 Sep): 4 tautan rusak pra-eksisting (3 di `docs/archieve/**` legacy + 1 di `docs/history/m11-seed-master-data-appendix-2026-07-08.md`) **tidak** diperbaiki sekarang; ditangani di B11.
- **IOT-BAGIAN6-TETAP** (23 Sep): isi IoT Bagian 6 tetap di `domain/operasional.md` sampai B8 (M15); rumah akhir materi IoT diputuskan di B8 bersama IOT-LATER. — **Ditutup di B8 (23 Sep 2026):** Bagian 6 dikonsolidasikan ke `domain/iot.md`; keputusan IOT-LATER (IoT ditunda, pencatatan meter tetap) tidak berubah.
- **DELEGASI-DOC-TEKNIS** (23 Sep, pasca-B5): **penataan dokumen adalah keputusan AI** — struktur file, rumah kanonik, pemisahan riwayat/audit, format tabel/heading, anchor, tautan, dedup pengulangan **non-aturan**, dan urutan batch B5–B11 diputuskan AI tanpa menunggu approval per batch, dengan bukti konservasi + invariant dilaporkan per commit. **Owner hanya dimintai keputusan yang menyentuh aturan bisnis/flow bisnis atau UI/UX** — termasuk perubahan nominal/DP/deposit/harga/utang-piutang, gate uang/huni, cakupan flow, dan keputusan pengalaman pengguna. Konsekuensi: (a) item "butuh konfirmasi owner" yang bersifat penataan ditutup sendiri (mis. penempatan M10 di `product/scope.md`, Auto-Ops ke `domain/operasional.md`); (b) dedup yang menyentuh isi aturan uang/harga/huni (mis. D-02, D-05) **tetap** milik owner; (c) delegasi ini tidak menambah izin menyentuh source, DB, server, deploy, atau secret.

- **TEMUAN-UANG-25SEP** (25 Sep): submission kedaluwarsa tetap `EXPIRED` — dicatat sebagai accepted behaviour, tanpa perubahan source; risiko ledger deposit **P1-04 diperbaiki** (bentuk teknis didelegasikan; perubahan schema/kunci unik tetap task operasional terpisah dengan backup/runbook); cleanup salinan mati `buildApprovalPaymentNote` **digabung** ke task uang berikutnya; **"Laba Bersih" dashboard disatukan pada basis akrual** (Z19-T2 — wajib lewat gate uang dan berkoordinasi dengan sesi yang memegang berkas dashboard); berkas frontend Z-19 tetap milik sesi yang mengerjakannya.
- **IZIN-25SEP** (25 Sep): izin **push** diberikan dan dieksekusi (`1b0858c2..5928462f`, `main` sinkron dengan `origin/main`); izin **akses DB UAT** (`5433` / `kost48_v3_pro`) untuk uji konkurensi nyata T6/T7 pada task tersendiri — bukan mutasi data produksi; urutan task AI: regresi auth #3 → uang P1-04 + P1-09 → konkurensi DB → Z19-T2. Detail kanonik: [KEPUTUSAN-OWNER](KEPUTUSAN-OWNER.md).
- **ARSIP-BATAS** (24 Sep, DOCS-CLEANUP-1b): owner menyetujui seluruh rekomendasi batch penataan — (A1) `domain/ai.md`/`domain/iot.md`/`domain/publik.md` **tetap utuh** (aturan bisnis; sub-gate >600 baris **ditutup sebagai accepted exception**), (A2) `history/changelog/2026-09.md` tetap penerima rotasi M13, (A3) `docs/archieve/**` dibiarkan (31 tracked; 76 di-exclude lokal), (A4) `.audit-map/**` tetap generated lokal (di-ignore `.gitignore` L87; jangan dihapus), (C1) tidak ada DOCS-CLEANUP-2/3, (C2) alat checker tidak diubah. Detail: [KEPUTUSAN-OWNER](KEPUTUSAN-OWNER.md).
- **AI-DECISION-25SEP + MODE-CEPAT** (25 Sep): arah lapisan keputusan AI **dan** bentuk permukaannya. **Dua halaman berdampingan:** **Mode Cepat** (`/cepat`, shell paralel) dan **Normal** (tidak disentuh). AI hanya untuk OWNER dan dihitung **terjadwal 1×/hari** lalu disimpan — membuka halaman tidak memanggil AI, sehingga `domain/ai.md` §Pola Terlarang dan UAT Fase G item 1 tetap utuh. ADMIN/STAFF/TENANT deterministik (tanpa AI, tanpa tampilan biaya). Biaya hanya ditampilkan ke OWNER (target ≤ Rp 50.000/bulan; rupiah menyusul setelah `AI-USAGE-01`). AI mati → kartu aturan tetap penuh. Item `AIDL-05` lama (penyederhanaan navigasi Normal) **dibatalkan** dan digantikan Mode Cepat. Halaman `/cek` **tetap statis** (tanpa API) dan wajib disinkronkan setiap antrean berubah — terakhir 25 Sep 2026. Rancangan: [mode-cepat.md](product/mode-cepat.md) + [portal-owner-admin §10–§11](product/portal-owner-admin.md); aturan: [domain/ai.md §G10](domain/ai.md).

