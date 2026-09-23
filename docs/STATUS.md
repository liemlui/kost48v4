# STATUS — Antrean, Izin, dan Kondisi Proyek

> **Satu file kerja untuk AI.** File ini menggantikan `M12_CHECKLIST_CHANGELOG.md` (antrean/gate), `AI_MASTER.md` (dashboard), dan ringkasan `M13_CHANGELOG.md`.
> **Hierarki:** prompt owner > file ini (antrean/gate) > [AGENTS.md](../AGENTS.md) (aturan/izin) > file rujukan lain.
> Diperbarui: 23 September 2026. Riwayat lengkap: `docs/history/`.

## 1. Cara pakai (untuk AI, baca ini dulu)

1. Baca [AGENTS.md](../AGENTS.md) (aturan, izin, verifikasi) lalu file ini.
2. Pilih **satu** task dari §2 yang prasyarat dan izinnya sudah terpenuhi. Jangan mengulang pekerjaan selesai tanpa perubahan relevan.
3. Aturan domain (uang/huni/operasional/harga): `docs/domain/` **sementara** → target konsolidasi `docs/ATURAN.md`.
4. Runbook operasi (deploy/produksi/go-live): `docs/operations/` **sementara** → target `docs/OPERASI.md`.
5. Peta kode: [docs/PETA-KODE.md](PETA-KODE.md) (kanonik sejak B5, 23 Sep 2026) + [docs/audit-map/](audit-map/README.md); scope per role/flow: [docs/product/scope.md](product/scope.md); orientasi produk: [docs/product/orientasi.md](product/orientasi.md).
6. Tutup dengan bukti: perbarui §5/§7 di file ini, tulis entri di `docs/history/changelog/`, dan pisahkan implementasi lokal vs verifikasi vs deployment vs dampak runtime.

## 2. Antrean prioritas aktif

| # | Task | Penanggung jawab / kesiapan | Prasyarat dan bukti penutupan |
|---|------|-----------------------------|------------------------------|
| 1 | Onboarding 13 hunian + verifikasi KTP | Owner / menunggu data | Bulan masuk, meter kWh, deposit; penutupan mengikuti gate Fase A. Keputusan owner 23 Sep: gerbang KTP produksi **ditunda**, risiko aktivasi tanpa KTP terverifikasi diterima sementara dan wajib ditinjau sebelum onboarding nyata ([M02](M02_KEPUTUSAN_OWNER.md)) |
| 2 | Opening balance produksi | Owner / menunggu angka cutover | Kas/bank per cutover; bukti rekonsiliasi sesuai aturan keuangan |
| 3 | Cron AutoOps di cPanel | Owner / menunggu pelaksanaan dan bukti | Konfigurasi cron + bukti eksekusi ([OPERASI](operations/go-live-cpanel.md)); keberadaan token saja belum cukup |
| 4 | Ganti password OWNER + PIN owner | Owner / belum ada bukti | Bukti perubahan tanpa nilai secret; rotasi DB/JWT 20 Sep tidak membuktikan password OWNER/PIN selesai |
| 5 | Audit modul kedua | AI / ditunda di belakang pemetaan flow | Pilih modul dari gap flow; gunakan bukti audit yang masih sah |
| 6 | Deploy commit lokal ke produksi | AI + Owner / perlu rencana rilis | Artefak/SHA, diff rilis, target, rollback, izin deploy, bukti smoke |
| 7 | Uji dependency hilang & test nol pada wrapper | AI / perlu rancangan uji terisolasi | Bukti kedua jalur sesuai kontrak wrapper; fixture terisolasi |
| 8 | **Konsolidasi dokumen** (sedang berjalan) | AI | Lihat §8; target 7 file utama + arsip |
| 9 | **IMPACT-01 — ringkasan dampak sebelum/sesudah approve pembayaran** | AI | Task implementasi app pertama setelah dokumen tuntas: OWNER/ADMIN melihat nominal DP/pelunasan, status kamar sebelum→sesudah, pengaruh kas/piutang/deposit (angka dari backend, bukan hitungan baru di frontend), lalu hasil nyata + rujukan transaksi |

**Aturan prioritas:** kerjakan task teratas yang prasyaratnya terpenuhi dan lingkupnya diizinkan. Bila teratas BLOCKED, lanjutkan pekerjaan independen yang diizinkan. Tabel ini tidak memberi izin baru.

## 3. Task terbuka & gate (23 `[ ]`)

Format: **ID** — judul | **Gate** (verifikasi wajib sebelum `[x]`). 🧑 = butuh data/keputusan owner.

- [ ] **ONBOARDING-HUNIAN** - lanjutan onboarding 13 hunian + verifikasi KTP (menunggu data owner) | **Gate:** bulan masuk, 13 meter kWh, saldo kas/bank, deposit; penutupan lewat gate Fase A
- [ ] **AO-13/14-BUKTI** - bukti eksekusi: tiga crawl tanpa skip, dua state TENANT, viewport/Axe, sign-off | **Gate:** crawl tuntas, screenshot/trace bebas PII, sign-off AO-14
- [ ] **AO-03 P1** - lima persona UAT non-personal dengan role/relasi/state terverifikasi | **Gate:** persona TENANT aktif + verifikasi ledger/DoD
- [ ] **AO-13** - crawl OWNER/ADMIN/STAFF setelah ledger UAT dan AO-03 terverifikasi | **Gate:** tiga role dieksekusi, 0 skip; exit 0 skrip saja belum cukup
- [ ] **AO-18 P2** - PARSIAL: trust 3+2, ikon semantik, FAQ sentence case selesai | **Gate:** polish copy/validasi hierarchy homepage sebelum sign-off AO-14
- [ ] **AO-19 P2** - PARSIAL: inventaris aset publik selesai; sisa butuh keputusan owner | **Gate:** keputusan owner (hak pakai foto, keseragaman aspek, izin optimasi)
- [ ] **AO-20 P1** - sisa lokal selesai; UAT desktop OWNER 1440 px + visual regression masih BLOCKED | **Gate:** UAT + visual regression + sign-off AO-14
- [ ] **AO-21 P2** - normalisasi sistem visual/terminologi Owner setelah review AO-20 | **Gate:** perubahan AppLayout dikoordinasikan
- [ ] **AO-23 P2** - konsolidasi komponen/shell Area Admin | **Gate:** regresi Owner bila AppLayout atau shared CSS berubah
- [ ] **AO-14** - audit final setelah AO-01..13 dan AO-15..23 memenuhi DoD | **Gate:** publik + OWNER/ADMIN/STAFF + dua state TENANT, viewport 320-1440 px, Axe/gate Baymard, build/test relevan, screenshot aman
- [ ] **EF-00 P0** - baseline deployment: konfigurasi panel dan limit/snapshot resource | **Gate:** SHA artefak yang berjalan, jam deploy, perilaku runtime EF-01/03/05, fault/interval pengukuran
- [ ] **EF-02 P0** - baseline workload host | **Gate:** butuh izin server; skenario, rentang waktu, jenis angka, resource/fault, artefak tercatat
- [ ] **EF-04 P2** - profil paket static | **Gate:** paket dan kedua profil diverifikasi setelah implementasi diizinkan
- [ ] **EF-06 P2** - kontrak routing/canary | **Gate:** canary/bucket routing diuji dengan izin; tanpa perubahan DB
- [ ] **EF-07 P1** - konfigurasi efektif env/DB | **Gate:** uji formal flag false vs DB true; jangan hapus key; inbox/pengumuman tetap bekerja
- [ ] **EF-08 P2** - lifecycle/peak | **Gate:** shutdown pool/timer + idempotensi diuji runtime; jangan jalankan server/UAT
- [ ] **EF-09 P3** - gate worker CLI (DITUNDA) | **Gate:** hanya bila pengukuran AutoOps terbatas membuktikan kebutuhan + persetujuan desain
- [ ] **MA** - implementasi batas modul DITUNDA | **Gate:** keputusan owner berikutnya; tanpa apps/libs, app Nest baru, worker
- [ ] **A1 / F1-12** - kelengkapan identitas hosting/deployment dan kesiapan env rahasia | **Gate:** versi/port PostgreSQL dari IDwebhost + kesiapan rotasi secret
- [ ] **A4** - konfirmasi rotasi password OWNER + PIN | **Gate:** bukti rotasi tanpa mencatat nilai secret
- [ ] **A5** - opening balance atau dokumentasi zero-start | **Gate:** angka cutover atau dokumentasi nol
- [ ] **A6** - smoke test produksi: login OWNER, public rooms 200, trial balance, recon | **Gate:** trial balance isBalanced, recon mismatch 0, readiness tanpa blocker merah
- [ ] **Z-19** - owner dashboard belum teraudit penuh | **Gate:** verifikasi manual/audit penuh dashboard owner

**Rekap:** 23 `[ ]` = fase changelog 2 · fase AO 8 · fase EF 7 · fase lama 6 (ID unik 21; AO-13 dan AO-14 muncul dua kali).

## 4. Task selesai terbaru (bukti bertanggal)

- **23 Sep 2026 — batch B5 (Tahap 3): M00 + M01 + M10 + M17 dipisah ke `docs/PETA-KODE.md` + `docs/product/` + riwayat**: M00 (172 baris) → `PETA-KODE.md` (177 baris; isi peta L6–L172 dipindah utuh); M01 (364) dipisah → `product/orientasi.md` (106), `audit/audit-lintas-scope-2026-07-29.md` (202; § Audit Lintas Scope 29 Jul 2026), status terkini 2026-09-08 → `history/changelog/2026-09.md`, riwayat status 30 Juli 2026 → `history/changelog/2026-07.md`, indeks dossier historis → `history/fase-lama.md`; M10 (295) → `product/scope.md` (300); M17 (213) → `product/portal-owner-admin.md` (218; empat `[x]` status implementasi ikut ke file kanonik, di luar domain invariant). Keempat sumber menjadi pointer 13–24 baris. Konservasi **834 baris non-kosong → 0 hilang** (M00 145 + M01 271 + M10 253 + M17 165; tiap blok identik baris-per-baris di tujuan); delta diumumkan: 4 baris header sumber diganti pada pointer, 1 baris navigasi (M01 L3) diarahkan ke `PETA-KODE.md`, 3 baris pemisah `---` dibuang di ujung blok. Invariant 23/101/12 (delta 0); total checkbox proyek delta 0 (4 `[x]` M17 berpindah file); rujukan masuk diperbaiki di 6 file; 0 tautan rusak baru. Bukti: [mapping §7.4](history/DOC-GOV-20260922-mapping.md) dan [M13](M13_CHANGELOG.md).
- **23 Sep 2026 — batch B4 (Tahap 3): M14 + M16 dipisah ke `docs/audit/` + riwayat**: M16 (190 baris) → `audit/audit-dokumentasi-2026-09.md` + `audit/audit-menyeluruh-2026-07.md`; M14 (2.005 baris) **dipisah per bagian** → `audit/audit-uiux-lintas-portal-2026-07.md` (§1–§6), `audit/audit-uiux-ulang-2026-09-12.md` (§0), `audit/status-ao-lintas-portal.md` (§7–§10: status, **27 gate `[ ]` DoD**, perintah verifikasi, handoff), `audit/audit-homepage-produksi-2026-09-15.md`, dan `history/lampiran-audit-portal-tenant-2026-07-02.md`; pointer M16 190 → 18 baris dan M14 2.005 → 23 baris (**dua anchor M16 + tiga `<a id>` fragment dipertahankan**). Konservasi 1.644 baris non-kosong (M14 1.511 + M16 133) → **0 hilang**, tiap blok identik baris-per-baris setelah rebase 18 tautan (diumumkan) dan 2 baris header sumber diganti pada pointer. 11 rujukan masuk diperbaiki di 6 file; invariant 23/101/12 (delta 0); 1 tautan rusak pra-eksisting, 0 baru. Bukti: [mapping §7.4](history/DOC-GOV-20260922-mapping.md) dan [M13](M13_CHANGELOG.md).
- **23 Sep 2026 — batch B3 (Tahap 3): M18 + M19 dipisah**: seluruh isi M18 → `docs/domain/harga.md` (168 baris) dan M19 → `docs/operations/efisiensi-hosting.md` (197 baris) dipindah apa adanya (satu tujuan per handoff owner); `docs/M18_ATURAN_HARGA_KAMAR.md` 225 → 10 baris dan `docs/M19_EFISIENSI_HOSTING_512MB.md` 246 → 12 baris (pointer, **anchor `#9-pencatatan-hosting-ef-00-dan-ef-02` dipertahankan** agar rujukan M02/M08 tetap resolve). Konservasi 355 baris non-kosong → **0 hilang** (1 baris header sumber diganti pada pointer M18, diumumkan); 6 rujukan masuk diperbaiki di 4 file; invariant 23/101/12; dugaan tumpang tindih harga DP/deposit & utilitas dicatat sebagai D-02 (belum didedup). Bukti: [mapping §7.4](history/DOC-GOV-20260922-mapping.md) dan [M13](M13_CHANGELOG.md).
- **23 Sep 2026 — batch B2 (Tahap 3): M07 + M09 dipisah**: seluruh isi M07 → `docs/domain/publik.md` (682 baris) dan M09 → `docs/domain/ai.md` (786 baris) dipindah apa adanya (satu tujuan per handoff owner); `docs/M07_PUBLIK_GROWTH.md` 694 → 30 baris dan `docs/M09_AI_OWNER_ADMIN.md` 787 → 19 baris (pointer). Konservasi 1.117 baris non-kosong → **0 hilang** (2 baris header sumber diganti pada pointer, diumumkan); 9 rujukan masuk diperbaiki di 7 file; invariant 23/101/12. Bagian bertanggal/audit ikut utuh di file domain dan belum dipisah (menunggu konsolidasi AUDIT/arsip). Bukti: [mapping §7.4](history/DOC-GOV-20260922-mapping.md) dan [M13](M13_CHANGELOG.md).
- **23 Sep 2026 — tindak lanjut review B1 (keputusan owner + dedup)**: lima keputusan owner dicatat di §6; **dedup D-01 dieksekusi** — quota utilitas kanonik di `domain/keuangan.md` (ditandai eksplisit), dua salinan berulang di `domain/operasional.md` dan `history/changelog/2026-07.md` menjadi rujukan (kalimat yang tidak berulang dipertahankan; tidak ada aturan yang berubah). Bukti: [laporan duplikat](history/laporan-duplikat.md), [M13](M13_CHANGELOG.md).
- **23 Sep 2026 — batch B1 (Tahap 3): M06 (operasional) dipisah**: aturan normatif → `docs/domain/operasional.md` (446 baris); riwayat identity dossier, temuan audit, dan task → `docs/history/changelog/2026-06.md` (+156 baris) dan update Juli → `2026-07.md` (+9 baris); empat deep audit 29 Jul 2026 → `docs/audit/audit-operasional-2026-07.md` (257 baris); `docs/M06_OPERASIONAL.md` 846 → 33 baris (pointer, tautan lama tetap resolve). Konservasi 653 baris non-kosong → **0 hilang** (satu baris header sumber diganti pada pointer dan diumumkan); 18 rujukan masuk diperbaiki di 5 file; invariant 23/101/12; 0 tautan rusak baru (4 pra-eksisting/known exception). Bukti: [mapping §7.4](history/DOC-GOV-20260922-mapping.md) dan [M13](M13_CHANGELOG.md).
- **23 Sep 2026 — konsolidasi dokumen**: M04 (keuangan) dan M05 (huni) dipecah ke `domain/`, `operations/`, `audit/`, `history/`; duplikasi tabel status invarian dihapus; definisi invariant gate ditulis; bukti verifikasi P1 uang dicatat. Commit: `1c156b78`, `8557cf9a`, `6701fc3e`, `9512ad73`, `801cc192`.
- **23 Sep 2026 — verifikasi statis temuan uang**: P1-01/P1-02/P1-03 indikasi sudah diperbaiki (jurnal & deposit ledger blocking); P1-04..P1-09 UNKNOWN. Bukti: `docs/audit/p1-uang-status-2026-09-23.md`.

## 5. Pelaksanaan vs izin (dua sumbu — jangan digabung)

- **Sumbu A (pelaksanaan, bukti commit):** migrasi dokumen Tahap 1–2 DONE; Tahap 3 berjalan — S1, S2.a (+fix), S2.b1, S2.b2.a/b, S2.b3, S2.b4, S2.c DONE, ditambah **B1 (M06), B2 (M07 + M09), B3 (M18 + M19), B4 (M14 + M16), B5 (M00/M01/M10/M17) DONE 23 Sep** menurut urutan batch handoff owner; sisa batch B6–B11; Tahap 4 belum.
- **Sumbu B (izin, otoritas owner):** Tahap 1 disetujui 22 Sep; Tahap 2 + S1 + S2.a (+fix) + S2.b1 + S2.b2.a/b retro-approve kondisional 23 Sep; S2.b3/S2.b4/S2.c dijalankan atas instruksi percepatan owner 23 Sep; **konsolidasi ke file utama (§8) dan urutan batch B1–B11 juga atas instruksi owner 23 Sep.** Batch B2–B5 dijalankan atas instruksi handoff owner 23 Sep (1 batch = 1 commit); batch B6–B11, S2.d, S3–S7, Tahap 4 belum tercatat — wajib approval per batch.

## 6. Keputusan owner yang mengikat (ringkas)

Daftar lengkap dan riwayat keputusan: [M02_KEPUTUSAN_OWNER.md](M02_KEPUTUSAN_OWNER.md) (akan menjadi `docs/KEPUTUSAN-OWNER.md` pada konsolidasi berikutnya).

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
- **IOT-BAGIAN6-TETAP** (23 Sep): isi IoT Bagian 6 tetap di `domain/operasional.md` sampai B8 (M15); rumah akhir materi IoT diputuskan di B8 bersama IOT-LATER.

## 7. Invariant & verifikasi

| Invariant | Nilai | Cara cek |
|---|---|---|
| Task terbuka aktif | **23** `[ ]` | hitung `- [ ]` di file ini (§3) |
| Task selesai historis | **101** `[x]` | `docs/history/**` |
| Gate domain | **12** | baris cocok pola `pretest:unit\|test:unit\|gate M04` di file ini + 7 file riwayat |
| Kebersihan diff | `git diff --check` exit 0 | sebelum commit dokumentasi |

Catatan: nilai 24/28 pada pola `**Gate:**` adalah metrik berbeda, bukan kontradiksi.

**Gate uang (tetap berlaku):** task yang menyentuh uang WAJIB menjalankan `npm run test:unit` backend — hook `pretest:unit` memicu full build — beserta gate M04; exception opsi C tetap ditunda sampai owner memutuskan lain.

## 8. Struktur dokumen tujuan (konsolidasi)

**Target: 7 file utama + 1 arsip.** Nama tanpa penomoran M.

| File utama | Isi | Menggantikan |
|---|---|---|
| `AGENTS.md` | Aturan kerja, izin, batas, verifikasi AI | tetap |
| `docs/STATUS.md` | **File ini** — antrean, gate, status, keputusan ringkas | M12, AI_MASTER, ringkasan M13 |
| `docs/ATURAN.md` | Aturan domain bisnis: uang, huni, operasional, harga, publik, AI/IoT | domain/*, M03/M04/M05/M06/M07/M09/M15/M18 |
| `docs/OPERASI.md` | Runbook: deploy, produksi, go-live, env, default dev | operations/*, M08/M11/M19/M20 |
| `docs/PETA-KODE.md` | Peta modul & file kode | M00, audit-map (ringkas); isi scope role/flow M10 ditempatkan di `docs/product/scope.md` (B5, 23 Sep — dicatat, butuh konfirmasi owner) |
| `docs/AUDIT.md` | Status audit, temuan, bukti bertanggal | M14, M16, audit/*, CHECKLIST_AUDIT_TOTAL |
| `docs/KEPUTUSAN-OWNER.md` | Register keputusan bisnis | M02 |
| `docs/arsip/` | Riwayat, fase, changelog bulanan, audit lama, dokumen lama | history/*, M13, archieve/* |

**Aturan kompatibilitas:** path lama (`docs/M12_CHECKLIST_CHANGELOG.md` dst.) tetap ada sebagai pointer 3–5 baris supaya tautan lama resolve, dan dihapus hanya setelah tidak ada rujukan.

**Progres konsolidasi:** file ini dibuat (Fase 1) · M12 + AI_MASTER menjadi pointer (Fase 1) · M04 + M05 dipisah (Tahap 3) · **M06 → `domain/operasional.md` + riwayat + `audit/audit-operasional-2026-07.md` (B1)** · **M07 → `domain/publik.md`, M09 → `domain/ai.md` (B2)** · **M18 → `domain/harga.md`, M19 → `operations/efisiensi-hosting.md` (B3)** · **M14 → `audit/audit-uiux-lintas-portal-2026-07.md` + `audit/status-ao-lintas-portal.md` + `audit/audit-uiux-ulang-2026-09-12.md` + `audit/audit-homepage-produksi-2026-09-15.md` + `history/lampiran-audit-portal-tenant-2026-07-02.md`; M16 → `audit/audit-dokumentasi-2026-09.md` + `audit/audit-menyeluruh-2026-07.md` (B4)** · **M00 → `PETA-KODE.md`; M01 → `product/orientasi.md` + `audit/audit-lintas-scope-2026-07-29.md` + `history/changelog/2026-09.md` + `history/changelog/2026-07.md` + `history/fase-lama.md`; M10 → `product/scope.md`; M17 → `product/portal-owner-admin.md` (B5)** — semuanya 23 Sep 2026 · sisa batch B6–B11 (non-M, M02, M15/M13, arsip) · ATURAN/OPERASI/AUDIT/KEPUTUSAN-OWNER (Fase 2) · arsip + pembersihan pointer lama (Fase 3).
