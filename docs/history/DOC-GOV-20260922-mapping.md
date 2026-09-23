# Mapping Migrasi Tahap 2 — DOC-GOV-20260922

Bukti perpindahan blok untuk Tahap 2; **bukan** sumber spesifikasi baru dan bukan antrean kedua.
Rancangan dan acceptance: [DOC-GOV-20260922](../plans/DOC-GOV-20260922.md) §4–§6 · Aturan kerja: [AGENTS](../../AGENTS.md) · Antrean: [M12](../M12_CHECKLIST_CHANGELOG.md).

Tanggal pencatatan: 22 September 2026 (S1). Baseline: **`2c5e9cc1e08c88f1f37e8fb0a3b57d43cdf835c3`**; working tree bersih saat pencatatan.
Aturan pencatatan: isi blok dipindahkan **tanpa diubah**; file tujuan yang belum dibuat ditulis sebagai `code`, bukan tautan, sampai dibuat pada S2–S4.

## 1. Baseline terukur (HEAD 2c5e9cc1)

| File | Baris | `[ ]` | `[x]` | Gate/perintah | Hash blob (HEAD = working tree) |
|---|---:|---:|---:|---:|---|
| `docs/M12_CHECKLIST_CHANGELOG.md` | 1.017 | **23** | **101** | **6** | `b52663e9604339ba9b1b26c3153bdc8b595f46b6` |
| `docs/M13_CHANGELOG.md` | 1.504 | 0 | 0 | — | `a18197c5f336e9541b61f4ae5253dda9a07df989` |
| `AI_MASTER.md` | 113 | 9 (checklist harian, bukan gate) | 0 | — | `af23092807024b8467fd02261b0e2bc64e2804d8` |

Target ukuran Tahap 2: M12 isi aktif **≤150 baris**, AI_MASTER **≤80 baris**.

## 2. Tabel section → tujuan

### 2.1 `docs/M12_CHECKLIST_CHANGELOG.md` (1.017 baris; header L1–4)

| Section | Baris | Klasifikasi | Disposisi |
|---|---|---|---|
| Cara Pakai | L5–20 (16) | Aktif | Tetap |
| Daftar Isi | L21–32 (12) | Aktif | Tetap; anchor kompatibilitas dijaga |
| Antrean Prioritas Aktif (2026-09-22) | L33–62 (30) | Aktif | Tetap (termasuk FLOW-CORE-01 DRAFT) |
| Status Kerja Aktif | L63–135 (73) | Riwayat (32 `[x]`) | → `docs/history/changelog/2026-09.md`; M12 simpan ringkasan + tautan |
| Peta Rujukan Dokumen | L136–170 (35) | Aktif (navigasi) | Diringkas ≤10 baris; rincian → riwayat |
| Update 2026-09-15 | L171–177 (7) | Riwayat | → `docs/history/changelog/2026-09.md` |
| Update 2026-09-13 | L178–183 (6, **1 `[ ]`**) | Riwayat | → `docs/history/changelog/2026-09.md`; task `[ ]` diangkat ke seksi aktif |
| Update 2026-09-12 | L184–188 (5) | Riwayat | → `docs/history/changelog/2026-09.md` |
| Update 2026-09-11 | L189–192 (4) | Riwayat | → `docs/history/changelog/2026-09.md` |
| Update 2026-09-08 | L193–202 (10, **1 `[ ]`**) | Riwayat | → `docs/history/changelog/2026-09.md`; task `[ ]` diangkat ke seksi aktif |
| Efisiensi Sesi & Bump Versi | L203–210 (8) | Aktif (kebijakan) | Tetap/diringkas ≤6 baris |
| Riwayat Fase | L211–269 (59) | Riwayat | → `docs/history/fase-lama.md` |
| Ledger Historis (kerangka) | L270–342 (73) | Riwayat | → `docs/history/fase-lama.md` |
| Fase AN | L343–356 (14) | Riwayat | → `docs/history/fase-lama.md` |
| **Fase AO** | L357–393 (37, **8 `[ ]`**) | Riwayat + gate | → `docs/history/fase-ao.md`; 8 task diangkat ke M12; anchor pointer dipertahankan |
| **Fase EF** | L394–410 (17, **7 `[ ]`**) | Riwayat + gate | → `docs/history/fase-ef.md`; 7 task diangkat ke M12; anchor pointer dipertahankan |
| Fase MA | L411–417 (7, **1 `[ ]`**) | Riwayat + gate | → `docs/history/fase-lama.md`; 1 task diangkat |
| Fase A | L418–435 (18, **4 `[ ]`**) | Riwayat + gate | → `docs/history/fase-lama.md`; 4 task diangkat |
| Fase B … AL (selesai/historis) | L436–1.017 (582) | Riwayat | → `docs/history/fase-lama.md` |
| **Baru: “Task Terbuka & Gate”** | (~±45, baru) | **Aktif** | 23 task `[ ]` + ID + gate + tautan lokasi riwayat |

**Komposisi target M12 aktif:** 16 + 12 + 30 + ±45 + ≤10 + ≤6 ≈ **119–135 baris** (≤150 ✔)

### 2.2 `docs/M13_CHANGELOG.md` (1.504 baris; header L1–2)

| Blok | Baris | Entri | Disposisi |
|---|---|---:|---|
| September (entri 1–10 terbaru) | L3–… (batas potong = akhir entri `##` ke-10) | 10 | **Tetap di M13** + indeks bulan |
| September (entri 11–63) | sisa blok September | 53 | → `docs/history/changelog/2026-09.md` |
| Agustus | L682–745 | 8 | → `docs/history/changelog/2026-08.md` |
| Juli | L753–1.100 (`##`) + L1.101–1.504 (`###` campuran + `## Release 2026-07-23` L1.384) | 40 (+ entri `###`) | → `docs/history/changelog/2026-07.md` |

Anchor yang wajib tetap ada di M13: entri 22 Sep (lihat §4). M13 akhir = entri terbaru + indeks riwayat per bulan.

### 2.3 `AI_MASTER.md` (113 baris)

| Section | Baris | Disposisi |
|---|---|---|
| Header + status/task | L1–6 (6) | Tetap |
| §1 Peta File Governance | L7–28 (22) | Tetap + tambah baris `docs/history/*` (±23) |
| §2 Hierarki Aturan | L29–40 (12) | Ringkas ±6 (aturan kanonik di AGENTS) |
| §3 Checklist Harian | L41–54 (14; 9 `[ ]`) | **Pindah ke `AI_QUICKREF.md`**; hapus dari dashboard |
| §4 Status Audit Modul | L55–66 (12) | Ringkas ±6 + pointer `docs/audit/README.md` |
| §5 Utang Tooling | L67–77 (11) | Ringkas ±6 + pointer M12 #7 |
| §6 Roadmap 30 Hari | L78–86 (9) | → `docs/history/governance-log.md` |
| §7 Aturan Perubahan | L87–93 (7) | Ringkas 2 (delegasi [AGENTS §10](../../AGENTS.md#10-perubahan-governance)) |
| §8 Log Keputusan | L94–113 (20) | → `docs/history/governance-log.md`; dashboard simpan 2 baris terbaru + pointer (±5) |

**Komposisi target AI_MASTER:** 6 + 23 + 6 + 0 + 6 + 6 + 0 + 2 + 5 ≈ **54 baris** (≤80 ✔)

## 3. Daftar 23 task `[ ]` (gate terbuka) — asal → tujuan

Setiap baris diangkat ke seksi aktif baru M12 **“Task Terbuka & Gate”** (ID + gate/penutup + tautan lokasi riwayat), dan salinan riwayatnya tetap ada di file tujuan.
Catatan duplikasi: `AO-13` dan `AO-14` muncul dua kali (Update 2026-09-08 **dan** Fase AO) → **ID unik = 21, checkbox = 23**.

| # | ID / task | Asal (baris HEAD) | Riwayat ke | Aktif di |
|---:|---|---|---|---|
| 1 | Lanjutan onboarding hunian (menunggu data owner) | Update 2026-09-13 L182 | `docs/history/changelog/2026-09.md` | M12 — melengkapi antrean #1 |
| 2 | AO-13/14 — bukti eksekusi (3 crawl, 2 state TENANT, viewport/Axe, sign-off) | Update 2026-09-08 L200 | `docs/history/changelog/2026-09.md` | M12 (dup dengan #4/#8) |
| 3 | **AO-03 P1** — lima persona UAT non-personal | Fase AO L366 | `docs/history/fase-ao.md` | M12 Task Terbuka |
| 4 | **AO-13** — crawl OWNER/ADMIN/STAFF pasca ledger UAT | Fase AO L376 | `docs/history/fase-ao.md` | M12 Task Terbuka (dup #2) |
| 5 | **AO-18 P2** — parsial (trust 3+2, ikon semantik, FAQ) | Fase AO L380 | `docs/history/fase-ao.md` | M12 Task Terbuka |
| 6 | **AO-19 P2** — parsial (inventaris aset selesai; sisa keputusan owner) | Fase AO L381 | `docs/history/fase-ao.md` | M12 Task Terbuka |
| 7 | **AO-20 P1** — sisa lokal jalan; UAT masih BLOCKED | Fase AO L382 | `docs/history/fase-ao.md` | M12 Task Terbuka |
| 8 | **AO-21 P2** — normalisasi sistem visual/terminologi Owner | Fase AO L383 | `docs/history/fase-ao.md` | M12 Task Terbuka |
| 9 | **AO-23 P2** — konsolidasi komponen/shell Area Admin | Fase AO L385 | `docs/history/fase-ao.md` | M12 Task Terbuka |
| 10 | **AO-14** — audit final pasca AO-01..23 memenuhi DoD | Fase AO L386 | `docs/history/fase-ao.md` | M12 Task Terbuka (dup #2) |
| 11 | **EF-00 P0** — baseline deployment (panel, limit/snapshot resource) | Fase EF L398 | `docs/history/fase-ef.md` | M12 Task Terbuka |
| 12 | **EF-02 P0** — baseline workload host | Fase EF L400 | `docs/history/fase-ef.md` | M12 Task Terbuka |
| 13 | **EF-04 P2** — profil paket static | Fase EF L402 | `docs/history/fase-ef.md` | M12 Task Terbuka |
| 14 | **EF-06 P2** — kontrak routing/canary | Fase EF L404 | `docs/history/fase-ef.md` | M12 Task Terbuka |
| 15 | **EF-07 P1** — konfigurasi efektif env/DB | Fase EF L405 | `docs/history/fase-ef.md` | M12 Task Terbuka |
| 16 | **EF-08 P2** — lifecycle/peak | Fase EF L406 | `docs/history/fase-ef.md` | M12 Task Terbuka |
| 17 | **EF-09 P3** — gate worker CLI (ditunda) | Fase EF L407 | `docs/history/fase-ef.md` | M12 Task Terbuka |
| 18 | **MA** — implementasi ditunda (tanpa apps/libs/worker) | Fase MA L414 | `docs/history/fase-lama.md` | M12 Task Terbuka |
| 19 | **A1 / F1-12** — kelengkapan identitas hosting/deployment | Fase A L423 | `docs/history/fase-lama.md` | M12 Task Terbuka |
| 20 | **A4** — konfirmasi rotasi password OWNER + PIN | Fase A L426 | `docs/history/fase-lama.md` | M12 Task Terbuka |
| 21 | **A5** — opening balance / dokumentasi nol | Fase A L427 | `docs/history/fase-lama.md` | M12 Task Terbuka |
| 22 | **A6** — smoke test produksi (login, rooms 200, trial balance, recon) | Fase A L428 | `docs/history/fase-lama.md` | M12 Task Terbuka |
| 23 | **Z-19** — owner dashboard belum teraudit penuh | Fase Z L739 | `docs/history/fase-lama.md` | M12 Task Terbuka |

Rekapitulasi tujuan riwayat: `changelog/2026-09.md` 2 · `fase-ao.md` 8 · `fase-ef.md` 7 · `fase-lama.md` 6 = **23** ✔

## 4. Anchor dan path yang dipertahankan

| Anchor | Lokasi | Alasan / rujukan masuk |
|---|---|---|
| `#antrean-prioritas-aktif` | M12 — `<a id>` eksplisit (L30) | Dipakai [CHECKLIST_AUDIT_TOTAL](../CHECKLIST_AUDIT_TOTAL.md) L7, [M00](../M00_CODEMAP.md) L3, [M16](../M16_AUDIT_MENYELURUH.md) L3 |
| `#antrian-eksekusi-aktif` | M12 — `<a id>` kompatibilitas (L31) | Rujukan legacy dari 12 dokumen: M02:15/L29, M03–M07, M09–M11, M14, M15, M17, M18 (semua L3) |
| `#fase-ao--audit--hardening-uiux-lintas-portal` | M12 — **pointer** ke `docs/history/fase-ao.md` | [M14](../M14_AUDIT_UI_UX.md) L63, [AUDIT_UIUX_TOTAL_2026-09-12](../AUDIT_UIUX_TOTAL_2026-09-12.md) L168 |
| `#fase-ef--efisiensi-shared-hosting-512-mb` | M12 — **pointer** ke `docs/history/fase-ef.md` | [M19](../M19_EFISIENSI_HOSTING_512MB.md) L5, M13 L380 |
| `#2026-09-22-docs--koreksi-arahan-ai-dan-rancangan-penataan-menyeluruh` | M13 — tetap (10 entri terbaru) | [M16](../M16_AUDIT_MENYELURUH.md) L31 |
| `#2026-09-22-arah-produk--penyederhanaan-owneradmin-dan-landasan-ib` | M13 — tetap | Entri 22 Sep; belum dirujuk luar |

Keputusan owner: **M14, M19, AUDIT_UIUX_TOTAL_2026-09-12, dan M13 tidak diedit** untuk keperluan anchor ini.
Selain anchor ber-fragment, M12 juga dirujuk tanpa fragment oleh [AGENTS](../../AGENTS.md) L33, [docs/README](../README.md), [docs/audit/README](../audit/README.md), dan [rancangan](../plans/DOC-GOV-20260922.md) — path file M12 **tidak berpindah**, sehingga rujukan itu aman.

## 5. File baru yang akan dibuat (S2–S4)

| Path | Sumber isi | Tahap |
|---|---|---|
| `docs/history/changelog/2026-09.md` | M12: Status Kerja Aktif (32 `[x]`) + Update 09-08/11/12/13/15; M13: entri September ke-11..63 | S2 + S3 |
| `docs/history/changelog/2026-08.md` | M13: 8 entri Agustus (L682–745) | S3 |
| `docs/history/changelog/2026-07.md` | M13: 40 entri Juli (L753–1.100) + entri `###` (L1.101–1.504) + `## Release 2026-07-23` (L1.384) | S3 |
| `docs/history/fase-ao.md` | M12: Fase AO (L357–393, 8 `[ ]` + 17 `[x]`) | S2 |
| `docs/history/fase-ef.md` | M12: Fase EF (L394–410, 7 `[ ]` + 3 `[x]`) | S2 |
| `docs/history/fase-lama.md` | M12: Riwayat Fase (L211–269) + Ledger Historis (L270–342) + Fase AN, MA, A, B…AL (L343–1.017) | S2 |
| `docs/history/governance-log.md` | AI_MASTER: §6 Roadmap 30 Hari + §8 Log Keputusan | S4 |

Semua path di atas ditulis sebagai `code` sampai file-nya benar-benar dibuat; penambahan tautan dilakukan pada sub-langkah pemiliknya.

## 6. Rujukan masuk yang harus tetap resolve (22 ke M12 + 1 ke M13)

| # | Sumber (path:baris) | Menuju | Keterangan |
|---:|---|---|---|
| 1 | `docs/AUDIT_UIUX_TOTAL_2026-09-12.md:168` | M12 `#fase-ao…` | anchor pointer |
| 2 | `docs/CHECKLIST_AUDIT_TOTAL.md:7` | M12 `#antrean-prioritas-aktif` | anchor eksplisit |
| 3 | `docs/M00_CODEMAP.md:3` | M12 `#antrean-prioritas-aktif` | anchor eksplisit |
| 4 | `docs/M02_KEPUTUSAN_OWNER.md:15` & `:29` | M12 `#antrian-eksekusi-aktif` + `#9-pencatatan-hosting-ef-00-dan-ef-02` (M19) | anchor kompatibilitas |
| 5 | `docs/M03_FLOW_KONTRAK.md:3` | M12 `#antrian-eksekusi-aktif` | anchor kompatibilitas |
| 6 | `docs/M04_KEUANGAN.md:3` | idem | anchor kompatibilitas |
| 7 | `docs/M05_SIKLUS_HUNI.md:3` | idem | anchor kompatibilitas |
| 8 | `docs/M06_OPERASIONAL.md:3` | idem | anchor kompatibilitas |
| 9 | `docs/M07_PUBLIK_GROWTH.md:3` | idem | anchor kompatibilitas |
| 10 | `docs/M09_AI_OWNER_ADMIN.md:3` | idem | anchor kompatibilitas |
| 11 | `docs/M10_PETA_SCOPE.md:3` | idem | anchor kompatibilitas |
| 12 | `docs/M11_DEFAULT_DATA.md:3` | idem | anchor kompatibilitas |
| 13 | `docs/M13_CHANGELOG.md:380` | M12 `#fase-ef…` | anchor pointer |
| 14 | `docs/M14_AUDIT_UI_UX.md:3` | M12 `#antrian-eksekusi-aktif` | anchor kompatibilitas |
| 15 | `docs/M14_AUDIT_UI_UX.md:63` | M12 `#fase-ao…` | anchor pointer |
| 16 | `docs/M15_IOT.md:3` | M12 `#antrian-eksekusi-aktif` | anchor kompatibilitas |
| 17 | `docs/M16_AUDIT_MENYELURUH.md:3`, `:54`, `:84` | M12 `#antrean-prioritas-aktif` | anchor eksplisit |
| 18 | `docs/M17_PORTAL_FLOW_RINGKAS.md:3` | M12 `#antrian-eksekusi-aktif` | anchor kompatibilitas |
| 19 | `docs/M18_ATURAN_HARGA_KAMAR.md:3` | idem | anchor kompatibilitas |
| 20 | `docs/M19_EFISIENSI_HOSTING_512MB.md:5` | M12 `#fase-ef…` | anchor pointer |
| 21 | `docs/M16_AUDIT_MENYELURUH.md:31` | **M13** `#2026-09-22-docs--…` | entri M13 terbaru |

## 7. Aturan verifikasi S2–S6

1. Hitung ulang lintas **M12 + semua file riwayat baru**: `^\s*- \[ \]` = **23**, `^\s*- \[ x\]`/`\[x\]` = **101**, gate/perintah (`pretest:unit|test:unit|gate M04`) ≥ **6**.
2. Setiap ID pada §3 harus ditemukan di seksi aktif M12 **dan** di file riwayat tujuannya.
3. Semua anchor pada §4 harus resolve (pemeriksa fragment) dan seluruh rujukan masuk §6 tetap valid.
4. `git diff --check` exit 0; pemeriksa tautan relatif: **0 rusak**.
5. Ukuran: M12 isi aktif ≤150 baris; AI_MASTER ≤80 baris.
6. Tidak ada perubahan pada M14, M19, AUDIT_UIUX_TOTAL_2026-09-12, AGENTS, GUIDE, QUICKREF, M02, M00, M01 kecuali diputuskan owner.
7. Bukti per sub-langkah dicatat di [M13](../M13_CHANGELOG.md) dan laporan sesi; mapping ini diperbarui bila ada penyimpangan (bukan ditulis ulang).

### 7.1 Bukti per sub-langkah

| Sub | Commit | File (blob, baris) | Bukti hitung | Acceptance |
|---|---|---|---|---|
| S0 | `73d8d860` | mapping `2bf9ec98` (170) | 1 blank line EOF dihapus (14.152 -> 14.148 byte) | PASS - `git diff HEAD~1 HEAD --check` exit 0 |
| S2 | `10b63d75` | M12 `f2f99766` (137) - `fase-ao.md` `b3e8550c` (41) - `fase-ef.md` `7cbd6ac6` (21) - `fase-lama.md` `60a4398c` (758) - `changelog/2026-09.md` `9f059775` (108) | M12 `[ ]`=23 (isi aktif 137 baris, `[x]`=0); union M12+4 riwayat `[ ]`=23 `[x]`=101 gate=6; 6 anchor resolve; 163 tautan diperiksa -> 0 rusak | PASS |
| S3 | `87a8faa2` | M13 `c31d6fdb` (147) - `changelog/2026-09.md` `e8f40b83` (660) - `changelog/2026-08.md` `ed4d92aa` (75) - `changelog/2026-07.md` `fdc80a10` (757) | 63 entri September: 10 tetap di M13 + 53 pindah; pindah 8 entri Agustus + 40 entri Juli + 1 Release (49 heading `##`) + 41 sub-entri `###`; 3 anchor M13 (termasuk `#2026-09-22-docs--koreksi-...`) resolve; 196 tautan diperiksa -> 0 rusak | PASS |
| S4 | `3e2f5dd9` | `AI_MASTER.md` `2a0176c6` (77) - `AI_QUICKREF.md` `f8b5c14d` (65) - `governance-log.md` `704cc462` (34) | AI_MASTER 113 -> 77 baris (<=80); 9 checkbox §3 pindah ke QUICKREF dan terbukti identik; 2 baris log 22 Sep tetap di §8; M12+history tetap `[ ]`=23 `[x]`=101; total `[ ]` proyek 40 -> 40; 231 tautan diperiksa -> 0 rusak | PASS |
| S5 | `7a37551a` | `docs/README.md` `4256382a` (83) - `docs/audit/README.md` `4382ae38` (13) - `docs/M16_AUDIT_MENYELURUH.md` `1f1dba85` (190) | 7 file riwayat baru + mapping tertaut dari docs/README.md; M16 mencatat status S0-S6 dan menutup DOC-22-04 tanpa audit ulang aplikasi; diff terjaga minimal (M16 +19/-1, README +13/-2, audit/README +1); 4.779 tautan repo-wide -> 0 rusak di scope Tahap 2 | PASS |
| S6 | `7b09b4b1` (HEAD saat review; commit penutup = commit mapping ini) | READ-ONLY - hanya mapping §7 diubah | M12 137 baris - AI_MASTER 77 baris - union `[ ]`=23 `[x]`=101 gate=11 - 6 anchor resolve - 47 rujukan masuk M12 dan 19 ke M13 resolve - 4.779 tautan repo-wide (1 rusak pra-eksisting di luar scope: `docs/M11_DEFAULT_DATA.md:547`) - 15 file tersentuh, semuanya dalam scope | PASS |

### 7.2 Penyimpangan & rekonsiliasi (dicatat, bukan disembunyikan)

1. **Acceptance S2(a) dan S2(b) saling eksklusif.** S2(a) menuntut M12 `[x]` = 101, sedangkan S2(b) menuntut union M12+riwayat `[x]` = 101. Karena seluruh 101 `[x]` pindah ke file riwayat (per §2.1), M12 `[x]` = 0 dan union = 101. Yang dipakai adalah aturan §7 butir 1 (union) - satu-satunya bacaan yang konsisten; bila (a) dipaksakan literal, (b) pasti gagal.
2. **Task `[ ]` tidak diduplikasi sebagai checkbox.** §3 menuntut 23 baris `- [ ]` di seksi aktif baru M12 **dan** salinan riwayatnya tetap ada di file tujuan, sementara §7 butir 1 serta acceptance S2(b)/S6(b) menuntut union `[ ]` = 23. Agar keduanya terpenuhi, 23 task `[ ]` menjadi checkbox aktif **tunggal** di M12, dan di file riwayat disimpan sebagai kutipan riwayat `> - [ ]` (teks, ID, dan status tidak diubah; hanya penanda kutipan ditambahkan).
3. **104 tautan relatif pada blok pindahan di-rebase: 103 path + 1 fragment retarget ke `../M12_CHECKLIST_CHANGELOG.md`, plus 1 tautan diauthored = 105 tautan `../` total.** Blok berasal dari `docs/`, kini di `docs/history/` (`../`) atau `docs/history/changelog/` (`../../`). Label dan teks tidak diubah; hanya tujuan relatif diperbaiki lalu diverifikasi. Satu tautan fragment `#antrean-prioritas-aktif` (asal M12 L272, kini di `fase-lama.md`) diarahkan ke `../M12_CHECKLIST_CHANGELOG.md#antrean-prioritas-aktif`.
Angka 61 hanya mencakup S2; S3 menambah 42, tidak tercermin di versi awal.
4. **25 hard-break Markdown di `fase-lama.md` dipertahankan demi fidelity render (known exception).** Baris tersebut memakai dua spasi akhir (hard break Markdown) di M12 lama, sehingga `git diff --check` melaporkan trailing whitespace pada file ini sebagai **known exception, bukan defect**. Sempat dinormalkan pada S2 lalu dipulihkan pada commit koreksi pasca-review; teks tidak berubah.
5. **1 tautan rusak pra-eksisting di luar scope:** `docs/M11_DEFAULT_DATA.md:547` (pra-migrasi) — bagian §Appendix diarsipkan S1.a ke `docs/history/m11-seed-master-data-appendix-2026-07-08.md`. Target lama `../backend/sql/seed-master-data.sql` tidak dibuat/diubah pada Tahap 2; dilaporkan sebagai temuan, bukan diperbaiki.
6. **Gate/perintah pada union: `gate=12` (M12 + 7 file history).** Angka `gate=6` adalah nilai saat baseline Tahap 2 ditetapkan (HEAD 2c5e9cc1). 4 baris gate pindah ke history pada S2; 2 baris tambahan dari `governance-log.md` S4. Domain resmi Tahap 3 = M12 + seluruh history = **12**. Blok riwayat M13 yang dipindah dan log governance ikut memuat penyebutan `test:unit`/`gate M04` pada entri historisnya. Aturan §7 butir 1 menetapkan batas **>= 6**, sehingga statusnya terpenuhi.
7. **`governance-log.md` memakai basis relatif root, bukan `docs/`.** Blok dari `AI_MASTER.md` memakai tautan relatif terhadap root repo, sehingga 1 tautan (`AI_WORKFLOW_GUIDE.md#11-...`) di-rebase ke `../../`; 0 rusak. Basis per file: M12 `../` atau `../../`, M13 `../../`, AI_MASTER `../../`.
8. **Diff S5 sengaja minimal.** `docs/README.md` tetap CRLF (83 baris) dan `docs/M16_AUDIT_MENYELURUH.md` serta `docs/audit/README.md` tetap LF; tidak ada churn line-ending. Satu tautan awal di `docs/audit/README.md` sempat salah basis (`M16_...` dari `docs/audit/`) dan diperbaiki menjadi `../M16_...`.
9. **Tautan menggantung di file arsip M11 sengaja dipertahankan (known exception).** `docs/history/m11-seed-master-data-appendix-2026-07-08.md` memuat rujukan `../backend/sql/seed-master-data.sql` (L547) dan `psql ... -f sql/seed-master-data.sql` (L567) apa adanya sebagai bukti arsip; karena file itu memang sudah dihapus 2026-07-18, pemeriksa tautan melaporkan 1 temuan pada file arsip ini. Itu **known exception, bukan defect**, dan tidak diperbaiki di S1.a.
10. **7 hard break Markdown di `audit/audit-operasional-2026-07.md` dipertahankan demi fidelity (known exception, batch B1).** Baris `**Auditor:** ...` / `**Metode:** ...` pada empat deep audit M06 (L609, L610, L684, L685, L746, L747, L798) memakai dua spasi akhir; dipindah apa adanya, sehingga `git diff --cached --check` melaporkan trailing whitespace pada file itu sebagai **known exception, bukan defect** (pola sama dengan butir 4). Alternatif — menghapus dua spasi — akan mengubah render Markdown (dua baris menyatu) dan **tidak** diambil. Catatan: `git diff --check` pada working tree sempat exit 0 karena file baru belum di-stage; setelah di-stage, 7 temuan itu muncul dan dilaporkan di sini. Jumlah temuan lain di luar 7 baris ini: 0. **Batch B2 menambah 3 baris sejenis** di `docs/domain/publik.md` (dari M07 L578/L579/L643, blok `**Auditor:**`/`**Metode:**` deep audit) — total known exception trailing whitespace lintas B1+B2 = **10 baris**, semuanya hard break Markdown yang dipertahankan apa adanya.

11. **Batch B4: M14 dipisah per bagian; dua penyesuaian dan satu rebase diumumkan.** (a) Satu baris header sumber pada **tiap** pointer **diganti**: `> Dokumen ini menyimpan spesifikasi domain dan bukti bertanggal. …` → `> Dokumen ini adalah **pintu masuk tematik**; isi rinci sudah dipindah ke lokasi kanonik di bawah. …` (pola sama dengan B1–B3); sisa kalimat pada baris yang sama tetap identik. (b) Baris pemisah `---` dan baris kosong di ujung tiap file tujuan dibuang agar tidak ada blank line di EOF; **tidak ada baris non-kosong lain** yang hilang. (c) **18 baris isi pindahan di-rebase** tujuan relatifnya dari basis `docs/` ke `docs/audit/` atau `docs/history/`: M14 9 baris (L17/L30/L31 → `audit/audit-uiux-ulang-2026-09-12.md`; L63/L186/L188/L331/L333/L403 → `audit/audit-uiux-lintas-portal-2026-07.md`) dan M16 9 baris (§0 → `audit/audit-dokumentasi-2026-09.md`); teks identik setelah `../` dilepas. **Known exception diteruskan:** M14 dan M16 tidak memuat trailing whitespace (0 baris dua-spasi akhir), sehingga B4 **tidak menambah** known exception; total lintas B1–B4 tetap **10 baris** (butir 10). **Duplikasi yang disengaja:** dua `<a id>` M16 disalin ke pointer M16 dan tiga `<a id>` fragment ditulis di pointer M14 (anchor kompatibilitas, pola M19/B3); baris `|---|---|---|` tabel juga muncul di pointer dan di file kanonik. **Status aktif vs riwayat dipisah per bagian:** §7 (termasuk 27 gate `[ ]` DoD), §8, §9, §10 → `audit/status-ao-lintas-portal.md`; lampiran 2 Juli 2026 → `docs/history/`. Ke-27 gate itu di luar domain invariant (`STATUS.md` + `docs/history/**`), sehingga 23/101/12 tidak berubah; total checkbox proyek `[ ]` = 386 dan `[x]` = 146 (delta 0).

12. **Batch B5: M00/M01/M10/M17 → `PETA-KODE.md` + `product/` + riwayat; tiga keputusan penempatan dicatat.** (a) **M00 → `docs/PETA-KODE.md`** (L6–L172 dipindah apa adanya; blok `>` L3–L4 tetap di pointer agar tautan `M00_CODEMAP.md` dan rujukan mapping §6 butir 3 tetap resolve) dan **M10 → `docs/product/scope.md`**, bukan M10 → PETA-KODE seperti tertulis pada STATUS §8; isi M10 adalah scope per role/flow (materi produk) sedangkan PETA-KODE memuat peta modul/file. Perbedaan ini dicatat di STATUS §8 dan **butuh konfirmasi owner**. (b) **M01 dipisah menurut sifat isi**: orientasi aktif → `product/orientasi.md`; `## 🆕 Audit Lintas Scope — 29 Jul 2026 (Reasonix)` → `audit/audit-lintas-scope-2026-07-29.md` (bukti bertanggal, pola B1); dua snapshot status bertanggal → `history/changelog/2026-09.md` (diselaraskan 2026-09-08) dan `history/changelog/2026-07.md` (riwayat 30 Juli 2026); indeks dossier historis → `history/fase-lama.md`. Penomoran bagian M01 tidak diubah, sehingga orientasi memuat §1, §2, §4–§7 (lompatan nomor karena §3 pindah ke riwayat). (c) **M17 → `product/portal-owner-admin.md`**; empat `[x]` status implementasi ikut ke file kanonik sehingga tetap **di luar** domain invariant (23/101/12 tidak berubah; total checkbox proyek delta 0 — 4 `[x]` berpindah file). Konservasi **834 baris non-kosong** (M00 145 + M01 271 + M10 253 + M17 165) → **0 hilang**; tiap blok diperiksa identik baris-per-baris pada offset tujuannya (10/10 blok OK). Delta diumumkan: 4 baris header sumber diganti pada pointer (pola B1–B4), 1 baris navigasi M01 L3 diarahkan ke `PETA-KODE.md`, 3 baris pemisah `---` (M01 L58/L104/L166) dibuang di ujung blok dan digantikan pemisah blok baru di tujuan. Rujukan masuk diperbaiki di 6 file (`STATUS.md` §1 dan §8, `domain/flow.md`, `domain/operasional.md`, `history/fase-lama.md` 3 baris, `audit/README.md` 1 baris indeks); `docs/README.md` (B10), `M02` (B7), `M15_IOT.md`, dan `AGENTS.md` sengaja tidak disentuh. 0 tautan rusak baru. **Known exception:** 8 baris hard break Markdown (dua spasi akhir) ikut berpindah apa adanya dari M01 ke `audit/audit-lintas-scope-2026-07-29.md` (M01 L178, L197, L211, L212, L246, L311, L316, L321), sehingga `git diff --cached --check` melaporkan 8 trailing whitespace pada file itu — pola sama dengan butir 10 dan 11. Tidak dihapus agar render Markdown (dua baris menyatu) tidak berubah; **total known exception trailing whitespace lintas B1–B5 = 18 baris**. Temuan lain: 0.

### 7.3 Status Tahap 2

**S0-S6 DONE** pada 22 September 2026. Seluruh acceptance sub-langkah terpenuhi, kecuali dua butir yang secara matematis saling eksklusif dan direkonsiliasi pada §7.2 butir 1-2. Satu tautan rusak pra-eksisting di luar scope (`docs/M11_DEFAULT_DATA.md:547`) dilaporkan, tidak diperbaiki. Tidak ada push; tidak ada file di luar scope tersentuh.

### 7.4 Tahap 3 — status sub-langkah

| Sub | Status | Bukti |
|---|---|---|
| S1.a | **DONE** `f8f9a589` (2026-09-22) | M11 §Appendix "Patch Tenant Aman" (2026-07-08) diarsipkan ke `docs/history/m11-seed-master-data-appendix-2026-07-08.md` (29 baris apa adanya); M11 572 -> 546 baris; `seed-master-data` di M11 = 0 (kecuali substring nama file arsip); 1 tautan arsip menggantung = known exception §7.2 note 9 |
| S1.b | **DONE** `de2d0459` (2026-09-22) | 5 file `docs/operations/` dibuat (deploy-go-live 431, default-dev 121, produksi 244, go-live-cpanel 305, form-go-live 97 baris); 5 sumber jadi pointer (M08 711->37, M11 546->512, M20 247->10, GO_LIVE 180->11, FORM 105->15); konservasi 78 `[ ]` + 22 `[x]`; invariant 23/101/12; 117 tautan -> 0 rusak |
| S1.c | **DONE** — commit bookkeeping ini (2026-09-22) | `docs/README.md` menautkan 5 file operations; M13 menerima entri "Tahap 3 S1: batch operations"; mapping §7.2 note 5 dikoreksi dan §7.4 dilengkapi. Verifikasi: 0 tautan rusak; `git diff --check` exit 0; invariant 23/101/12 |
| S2.a | **DONE** `3cca562f` (2026-09-22) | M03 → `docs/domain/flow.md` (508 baris: L61–550 + "## Riwayat audit") dan `docs/domain/kontrak.md` (414 baris: L551–955); M03 jadi pintu masuk 27 baris; 4 Update → `history/changelog/2026-07.md` (+1 entri) dan `history/changelog/2026-06.md` (baru, 3 entri); `[ ]`=0 `[x]`=0 gate=0; 32 tautan → 0 rusak; invariant 23/101/12 |
| S2.a-fix | **DONE** `c3556bf3` (2026-09-22) | Koreksi S2.a: section "Override Booking Flow Fase V (2026-06-30, aktif)" dipindahkan dari `history/changelog/2026-06.md` → `docs/domain/kontrak.md` sebagai section terakhir; changelog 38 → 17 baris; pointer 1 baris di M03 (`524066de`, 28 baris); `[ ]`=0 `[x]`=0 gate=0; 18 tautan → 0 rusak; invariant 23/101/12 |
| S2.a-fix-2 | **DONE** `c38fa833` (2026-09-22) | Entry `2026-06-19 — Fase G AI sebagai Sidecar Approval` (normatif) dipindahkan dari `history/changelog/2026-06.md` → `docs/domain/kontrak.md` sebagai section terakhir (+11 baris); changelog 17 → 8 baris (tinggal 1 entry: 2026-06-17); pointer 1 baris di M03 (29 baris); `[ ]`=0 `[x]`=0 gate=0; 19 tautan → 0 rusak; invariant 23/101/12 |
| S2.b1 | **DONE** `f965a6dd` (2026-09-22) | 9 Update M04 (L23–120, 98 baris) di-disposisi: 5 NORMATIF → `docs/domain/keuangan.md` (Override Fase V — Dampak Keuangan · Quota Utilitas · SI-4 Invoice Purpose · Fase G AI Finance · Payment Booking Fase V); narasi 2 CAMPURAN + 1 HISTORIS → `changelog/2026-06.md` (+14 baris, 2 entri) dan `changelog/2026-07.md` (+20 baris, 2 entri); tabel status invarian → `domain/keuangan.md` §"Status Invarian Keuangan (per Jul 2026)"; Kebijakan Kapitalisasi → pointer M02 (bukan duplikat). M04 418 → 326 baris; `[ ]`=5 `[x]`=0 gate=3 di M04 (Bagian 1 tetap, hanya L230 diarahkan); keuangan.md 0/0/0; 22 tautan → 0 rusak; invariant 23/101/12 |
| S2.b2.a | **DONE** — commit ini (2026-09-23) | M04 Bagian 2 / Dossier 10 (L143–195) dipisah: aturan aktif → domain/keuangan.md §Kebijakan dan Invarian Pembayaran & Invoice; status, peta kode, audit, task, UAT → changelog/2026-06.md; M04 menjadi pointer. Invariant 23/101/12 diverifikasi. |
| S2.b2.b | **DONE** — commit ini (2026-09-23) | M04 Bagian 3 / Dossier 13 dipisah: aturan aktif → domain/keuangan.md; snapshot, peta kode, audit, task, UAT → changelog/2026-06.md; catatan test 2026-07-29 → changelog/2026-07.md; M04 menjadi pointer. |
| B1 | **DONE** — commit ini (2026-09-23) | Urutan batch dari handoff owner 23 Sep (B1–B11); padanan label S2.d/S3–S7 belum dipetakan. M06 (846 baris) dipartisi penuh: aturan normatif → `domain/operasional.md` (446 baris; 323 baris sumber + 22 baris header/heading), riwayat dossier + update 2026-06 → `changelog/2026-06.md` (272 → 428 baris), update 2026-07-08 → `changelog/2026-07.md` (798 → 807), audit 29 Jul → `audit/audit-operasional-2026-07.md` (193 baris sumber); `M06_OPERASIONAL.md` 846 → 33 baris (pointer). Konservasi: 653 baris non-kosong, 0 hilang (multiset per tujuan) dan tiap blok utuh berurutan (pemeriksa blok 17/17 + 17/17 + 2/2); 1 baris header sumber diganti pada pointer (diumumkan). 18 rujukan masuk diperbaiki di 5 file. 654 tautan standar → 0 rusak baru; invariant 23/101/12 (delta 0); `git diff --check` exit 0 |

**Prinsip pemisahan (ditetapkan S2.a-fix):** section `## Update …` yang memuat **aturan normatif** (kata kunci "tidak boleh", "wajib", "override", "invarian") → ke `docs/domain/`; `## Update …` yang hanya catatan status atau bukti bertanggal → ke `docs/history/changelog/`. Berlaku untuk semua batch Tahap 3 berikutnya.

| B2 | **DONE** — commit ini (2026-09-23) | Seluruh isi M07 (694 baris) → `domain/publik.md` (682) dan M09 (787) → `domain/ai.md` (786); satu tujuan per handoff owner, tanpa pemisahan riwayat/audit (bagian bertanggal ikut utuh, dicatat di header file domain). Pointer: M07 694 → 30 baris, M09 787 → 19 baris. Konservasi 1.117 baris non-kosong: 0 hilang (multiset 494/604/12/5) dan blok utuh (2/2, 4/4, 1/1, 2/2); 2 baris header sumber diganti pada pointer (diumumkan). Rujukan masuk: 9 penggantian di 7 file (M00 2, M10 3, domain/hunian, keuangan, kontrak, operasional 1 masing-masing); M02/M01/README sengaja ditunda. Invariant 23/101/12 (delta 0); 0 tautan rusak baru; `git diff --cached --check` bersih |

| B3 | **DONE** — commit ini (2026-09-23) | Seluruh isi M18 (225 baris) → `domain/harga.md` (168) dan M19 (246) → `operations/efisiensi-hosting.md` (197); pointer 10 dan 12 baris. **Anchor kompatibilitas** `#9-pencatatan-hosting-ef-00-dan-ef-02` + `#arah-dan-status-aktif--...` dipertahankan di pointer M19 (rujukan M02 L65 & M08 L5 tetap resolve). Konservasi 355 baris non-kosong: 0 hilang (multiset 161/190/2/1) dan blok utuh 1/1; **2 baris isi EF di-rebase tautannya** (basis `docs/` → `docs/operations/`, identik setelah `../` dilepas) — diumumkan. 1 baris header M18 diganti pada pointer (diumumkan); provenance "Sumber kode" ikut ke file kanonik. Rujukan masuk: 6 penggantian di 4 file (GO_LIVE_CPANEL_CHECKLIST 1, M08 1, M16 3, M20 1); M02/M01/README + boilerplate "Rujukan arah aktif" sengaja ditunda. Duplikasi harga vs uang/huni dicatat sebagai D-02 ([laporan duplikat](laporan-duplikat.md)). Invariant 23/101/12 (delta 0); 0 tautan rusak baru; `git diff --cached --check` bersih |

| B4 | **DONE** — commit ini (2026-09-23) | `M16_AUDIT_MENYELURUH.md` (190) → `audit/audit-dokumentasi-2026-09.md` (105) + `audit/audit-menyeluruh-2026-07.md` (92); `M14_AUDIT_UI_UX.md` (2.005) dipisah **per bagian** → `audit/audit-uiux-lintas-portal-2026-07.md` (852), `audit/audit-uiux-ulang-2026-09-12.md` (33), `audit/status-ao-lintas-portal.md` (174), `audit/audit-homepage-produksi-2026-09-15.md` (73), `history/lampiran-audit-portal-tenant-2026-07-02.md` (893). Pointer M16 190 → 18 dan M14 2.005 → 23; anchor kompatibilitas 2 (M16) + 3 (M14) dipertahankan. Konservasi 1.644 baris non-kosong: 0 hilang (multiset M14 583/20/137/717/51; M16 69/61), tiap blok identik baris-per-baris terhadap sumber setelah rebase. Delta diumumkan: 2 baris header sumber diganti pada pointer; 18 baris isi di-rebase tautannya; baris pemisah/kosong ujung file dibuang (no blank line EOF). Rujukan masuk: 11 penggantian di 6 file (M00 1, M11 1, operations/default-dev 1, audit/README 1, history/fase-ao 1, changelog/2026-09 6); docs/README + rujukan path-saja riwayat sengaja ditunda. Invariant 23/101/12 (delta 0); total checkbox proyek 386/146 (delta 0); 1 tautan rusak pra-eksisting, 0 baru; `git diff --cached --check` bersih |

| B5 | **DONE** — commit ini (2026-09-23) | `M00_CODEMAP.md` (172) → `PETA-KODE.md` (177); `M01_MASTER.md` (364) → `product/orientasi.md` (106) + `audit/audit-lintas-scope-2026-07-29.md` (202) + `history/changelog/2026-09.md` + `history/changelog/2026-07.md` + `history/fase-lama.md`; `M10_PETA_SCOPE.md` (295) → `product/scope.md` (300); `M17_PORTAL_FLOW_RINGKAS.md` (213) → `product/portal-owner-admin.md` (218). Pointer: 172 → 15, 364 → 24, 295 → 14, 213 → 13; pointer M01 memuat empat `<a id>` anchor kompatibilitas. Konservasi 834 baris non-kosong: 0 hilang (blok identik baris-per-baris); delta diumumkan (4 baris header sumber, 1 baris navigasi M01 L3, 3 pemisah `---`). Rujukan masuk: 6 file (`STATUS.md` §1/§8, `domain/flow.md`, `domain/operasional.md`, `history/fase-lama.md` 3 baris, `audit/README.md`); `docs/README.md` + `M02` + `M15_IOT.md` + `AGENTS.md` sengaja ditunda. Invariant 23/101/12 (delta 0); total checkbox proyek delta 0; 0 tautan rusak baru; `git diff --cached --check` bersih |

**Label batch (keputusan owner 23 Sep 2026):** mulai B1, penomoran resmi penataan = **B1–B11** (handoff owner 23 Sep, 1 batch = 1 commit); label lama **S2.d/S3–S7 superseded** dan tidak dipakai lagi. **Keputusan owner pasca-review B1:** quota utilitas kanonik di `domain/keuangan.md` — dedup D-01 **dieksekusi** (dua salinan menjadi rujukan, aturan tidak berubah; bukti [laporan duplikat](laporan-duplikat.md)); 4 tautan rusak pra-eksisting (§7.2 butir 5 dan 9) ditangani di B11; isi IoT Bagian 6 tetap di `domain/operasional.md` sampai B8.

**S1 Tahap 3 selesai** (S1.a + S1.b + S1.c); **S2.a selesai** + koreksi **S2.a-fix**/**S2.a-fix-2**; **S2.b1 selesai** (9 Update M04) pada 22 September 2026; **S2.b2.a dan S2.b2.b selesai** (M04 Bagian 2/3) pada 23 September 2026. **Sumbu izin:** Tahap 2 (S0–S6) + S1 + S2.a (+fix) + S2.b1 + S2.b2.a + S2.b2.b retro-approve kondisional owner 23 Sep ([M02](../M02_KEPUTUSAN_OWNER.md), commit `5207061b`, cakupan diklarifikasi owner 23 Sep); batch S2.b3, S2.b4, S2.c, S2.d, S3–S7, Tahap 4 belum tercatat — wajib approval per batch. **S2.b3 + S2.b4 selesai (23 Sep 2026, atas instruksi percepatan owner):** harness verifikasi keuangan dipindah apa adanya ke `operations/verifikasi-keuangan.md` (123 baris, 5 `[ ]` gate dipertahankan); blok `## Audit 360° Flow Uang (Jul 2026)` dipindah ke `audit/audit-360-uang-2026-07.md`; `M04_KEUANGAN.md` menjadi pointer tipis (182 → 32 baris). **Duplikasi tabel status invarian dihapus** — kanonik hanya di `domain/keuangan.md`. Status temuan: P1-01..P1-03 indikasi diperbaiki (verifikasi statis), P1-04..P1-09 UNKNOWN ([bukti](../audit/p1-uang-status-2026-09-23.md)). **S2.c selesai:** M05 dipisah — aturan & invarian siklus huni → `domain/hunian.md` (106 baris), dossier/task/temuan → `changelog/2026-06.md` (+92) & `2026-07.md` (+11), bukti audit → `audit/audit-360-huni-2026-07.md` (73 baris); `M05_SIKLUS_HUNI.md` menjadi pointer (29 baris). **B1 selesai (23 Sep 2026, urutan batch handoff owner B1–B11):** M06 dipisah — aturan normatif (tenant, staf, invarian & peta kode dossier 14/15/16/18, proposal meter, spesifikasi IoT) → `domain/operasional.md` (446 baris), riwayat dossier/temuan/task/update → `changelog/2026-06.md` (+156) & `2026-07.md` (+9), status Audit 360° P3–P8 + 4 deep audit 29 Jul → `audit/audit-operasional-2026-07.md` (257 baris); `M06_OPERASIONAL.md` 846 → 33 baris (pointer). Konservasi 653 baris non-kosong: 0 hilang (multiset per tujuan; tiap blok utuh berurutan); 1 baris header sumber diganti pada pointer (diumumkan); 18 rujukan masuk diperbaiki di 5 file; duplikasi quota energi dicatat di [laporan duplikat](laporan-duplikat.md), tidak dihapus. Verifikasi: invariant `[ ]` = 23, `[x]` = 101, gate domain = 12 (delta 0 vs HEAD); 654 tautan standar → 0 rusak baru (4 pra-eksisting/known exception §7.2 note 5 dan 9); `git diff --check` exit 0. **B2 selesai (23 Sep 2026):** M07 dan M09 dipindah **utuh** (satu tujuan) → `domain/publik.md` (494 baris sumber) dan `domain/ai.md` (604 baris sumber); pointer 30 dan 19 baris; konservasi 1.117 baris non-kosong 0 hilang; 9 rujukan masuk diperbaiki di 7 file; bagian bertanggal/audit **belum dipisah** (dicatat di header file domain) menunggu konsolidasi audit/arsip. **B3 selesai (23 Sep 2026):** M18 → `domain/harga.md` dan M19 → `operations/efisiensi-hosting.md` (utuh, satu tujuan); pointer 10 dan 12 baris; anchor `#9-pencatatan-hosting-ef-00-dan-ef-02` dipertahankan; konservasi 355 baris non-kosong 0 hilang; 6 rujukan masuk diperbaiki di 4 file; M02/M01/README sengaja ditunda; dugaan tumpang tindih harga ↔ uang/huni dicatat sebagai D-02 tanpa mengubah isi. **B4 selesai (23 Sep 2026):** M16 dipisah ke `audit/audit-dokumentasi-2026-09.md` (§0) + `audit/audit-menyeluruh-2026-07.md` (§1–§5); M14 dipisah **per bagian** ke `audit/audit-uiux-lintas-portal-2026-07.md` (§1–§6), `audit/audit-uiux-ulang-2026-09-12.md` (§0), `audit/status-ao-lintas-portal.md` (§7–§10 termasuk 27 gate `[ ]` DoD), `audit/audit-homepage-produksi-2026-09-15.md`, dan riwayat `history/lampiran-audit-portal-tenant-2026-07-02.md`; pointer M14/M16 23 dan 18 baris; konservasi 1.644 baris non-kosong 0 hilang; 18 tautan isi di-rebase; 11 rujukan masuk diperbaiki di 6 file; anchor lama dipertahankan.
