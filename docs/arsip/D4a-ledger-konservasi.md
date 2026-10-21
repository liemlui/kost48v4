# D4a — ledger konservasi pemindahan kartu audit & history (potret 2026-10-21)

> **KARTU BUKTI PEMINDAHAN** · Batch **DOCS-GEN2 D4a** · Status: **beku setelah D4a** · Untuk siapa: owner + agen verifikator
> · Baca kalau: memverifikasi bahwa 19 berkas yang dipindah dari `docs/audit/` dan `docs/history/` tidak kehilangan isi.

**Tujuan.** Memindahkan kartu audit/history bertanggal keluar jalur baca rutin tanpa memangkas isi, sebagai langkah pertama konsolidasi D4 (target owner Q3=a: ≤30 berkas / ≤400 KB). **Bukan** penghapusan: semua berkas utuh di `docs/arsip/`, nama tidak diganti, angka di dalamnya tidak diperbarui.

## 1. Ringkasan

| Ukuran | Nilai |
|---|---:|
| Berkas dipindah | **19** (14 audit + 5 history) |
| Total byte sebelum → sesudah | 351.073 → 354.467 |
| Baris non-kosong sebelum → sesudah | 2014 → 2033 (+19 = satu baris banner per berkas) |
| Berkas dengan isi-inti identik (SHA body = SHA sebelum) | **13** |
| Berkas dengan transformasi terdokumentasi | **6** (26 tautan di-rebase) |
| Berkas dihapus | **0** |

## 2. Tabel 19 baris

SHA-256 **sebelum** = berkas kerja tepat sebelum dipindah; SHA-256 **sesudah** = berkas di `docs/arsip/` setelah banner + rebase tautan. Kolom byte/baris non-kosong memakai hitungan yang sama.

| Berkas | Asal | Byte | Baris non-kosong | SHA-256 sebelum | SHA-256 sesudah | Catatan |
|---|---|---:|---:|---|---|---|
| [ai-agenda-recon-2026-09-25.md](ai-agenda-recon-2026-09-25.md) | `docs/audit/` | 6397 → 6581 | 44 → 45 | `ae2b2270f868a8771f71e2eae0a98e3f5a881eea61759ee18f36b972a87f956e` | `1cf5ed186c3449f7c351b99d52632cdad3baebd2b431306eac654556aaf1422a` | Recon infrastruktur AI (25 Sep 2026). pindah murni + banner; isi setelah banner identik |
| [audit-2026-09.md](audit-2026-09.md) | `docs/audit/` | 21989 → 22182 | 156 → 157 | `886c9a04559dd9e3e99176e2e0a87ad5525d07e7903b4e6b2a9d17f9b06b146c` | `7709ba48a45c3deb9938517e9318a7f19d4eabede0532e4efa27e24583910bd3` | Audit dokumentasi & urutan kerja (8 Sep 2026). banner + 1 tautan di-rebase; isi lain identik |
| [audit-aturan-docs-vs-doktrin-2026-10-07.md](audit-aturan-docs-vs-doktrin-2026-10-07.md) | `docs/audit/` | 34135 → 34297 | 119 → 120 | `7ce9a26727a72cb430d5ffea731f0b8ce4d4980fe8bca55959ca638bd3a76036` | `f0859b4f3536c1460fa33640e63e971b3b557417c632e4b71bc05ae2c7652569` | Kesiapan docs sebagai aturan vs doktrin (7 Okt 2026). banner + 2 tautan di-rebase; isi lain identik |
| [audit-kekuatan-dokumentasi-2026-09-24.md](audit-kekuatan-dokumentasi-2026-09-24.md) | `docs/audit/` | 11038 → 11222 | 80 → 81 | `9de278671940ae5bf1ac3b6d54436a52f8e254c53d0358cda21944a8b931f847` | `a0e79a8f9bc5be72fd4c01e36d5343f47e01fc220b8e947c95a0305aa8e328cb` | Kekuatan dokumentasi (24 Sep 2026). pindah murni + banner; isi setelah banner identik |
| [audit-lintas-scope-2026-07-29.md](audit-lintas-scope-2026-07-29.md) | `docs/audit/` | 11532 → 11716 | 148 → 149 | `791c62ab96637a564a3b4bab42ffb9b50911d563b75b12057fc722a0bfd6827e` | `67b9d5132caaf83d747e1541edcc72b6870f0305786cd7d3257528153d284ed7` | Audit lintas scope Reasonix (29 Jul 2026). pindah murni + banner; isi setelah banner identik |
| [audit-modul-2026.md](audit-modul-2026.md) | `docs/audit/` | 13665 → 13849 | 136 → 137 | `f5f9ab376cd6d312dda4af2c2e7ada18371d1cda816d6e98b07205af4705922e` | `08e723270edee4bfd76cf3d747cd9788d7ef240dcc1aecc1256e7268a7d46ff2` | Audit modul frontend-auth (20 Sep 2026). pindah murni + banner; isi setelah banner identik |
| [audit-operasional-2026-07.md](audit-operasional-2026-07.md) | `docs/audit/` | 15278 → 15462 | 193 → 194 | `6a222f482da32b57692713cda5589ef3b03e074cd3131753996515295ffbcbce` | `1c8e136327ea710ff3d6b12a49838202dc1be6e75f09db5754b088d56bace79c` | Audit operasional, inventaris, notifikasi & IoT (Jul 2026). pindah murni + banner; isi setelah banner identik |
| [audit-uang-huni-2026-07.md](audit-uang-huni-2026-07.md) | `docs/audit/` | 12954 → 13138 | 115 → 116 | `f3b7eddfae9009fe95a247f43882bd92ae0ee8c38509dd21b5bcab0aeaebc805` | `37e66269c2d5d25c8d1b059b83837efdda0732fb27e6880b2c0e0a40b581103c` | Audit 360 flow uang + huni (Jul 2026). pindah murni + banner; isi setelah banner identik |
| [backend-auth-2026-09-24.md](backend-auth-2026-09-24.md) | `docs/audit/` | 16551 → 16735 | 112 → 113 | `1e09219259e82905dc16639fec60bf21f087396ab6543229d030121c24b0ea32` | `76e01b68a47f9b177c414a98133fa6c13ccd611464c4c079a99ed68fa8033a96` | Audit ulang backend auth / BE-002 (24 Sep 2026). pindah murni + banner; isi setelah banner identik |
| [inventaris-docs-2026-10-20.md](inventaris-docs-2026-10-20.md) | `docs/audit/` | 7897 → 8059 | 83 → 84 | `de525ad0af87749bbffa914812d8982dcc55a888baac168ef69089d125078d11` | `ac92d5d79d19a4596a5e02481acf4899a903819b29c7abf3ac15732854793432` | Baseline D0 DOCS-GEN2 (20 Okt 2026). banner + 2 tautan di-rebase; isi lain identik |
| [owner-dashboard-z19-2026-09-25.md](owner-dashboard-z19-2026-09-25.md) | `docs/audit/` | 7854 → 8038 | 53 → 54 | `444c27d5fdfc017c6faa09ead8d5ee6354a92418d2206690e4b38b09fc54c48d` | `d8fea036770499b4990d260756f0954a56abb603446b4b0d0000072cf795d316` | Audit Z-19 Dashboard Owner (25 Sep 2026). pindah murni + banner; isi setelah banner identik |
| [p1-uang-verifikasi-2026-09-25.md](p1-uang-verifikasi-2026-09-25.md) | `docs/audit/` | 9808 → 9992 | 47 → 48 | `9c87613c097c3f50e014396b4d9284936ba7691864784eb98dc447d3725bb37d` | `c823b392df79f5dce7f8052249b22800c246a4205e979f2e274eb9054d093e6e` | Verifikasi statis P1-04..P1-09 (25 Sep 2026). pindah murni + banner; isi setelah banner identik |
| [payment-impact-review-2026-09-25.md](payment-impact-review-2026-09-25.md) | `docs/audit/` | 1860 → 2044 | 15 → 16 | `1a5d2cc4f5615a7ab3054525dab79c8c83494c8a83c43bf34ecd953b4d12f97d` | `d26b157ac8471148856c12258aaa9fa20fcf51ee6a5d22b77b448cc5945d802e` | Review independen IMPACT-01 (25 Sep 2026). pindah murni + banner; isi setelah banner identik |
| [sensus-dokumen-2026-10-07.md](sensus-dokumen-2026-10-07.md) | `docs/audit/` | 10969 → 11169 | 65 → 66 | `9dcfb92ad26a9c7fd48910ce894c43e52cb472b73f66ebd4125ee5089e60a4dc` | `644fb348cffd34828da8a5b83a418ab22a580e74e9c74c114a2751a3faa49766` | Sensus dokumen (7 Okt 2026) + ledger 7 berkas. banner + 4 tautan di-rebase; isi lain identik |
| [bukti-2026-10.md](bukti-2026-10.md) | `docs/history/` | 115872 → 115974 | 309 → 310 | `75e8d922ec92b994a2539083a1791cb3ec56de3bf870168fa0a7c1336ebbb413` | `29da10c35fa783df5eec1c64c0bf954772e09857edeb59514a4a8d1112a18b38` | Bukti bertanggal Oktober 2026. banner + 16 tautan di-rebase; isi lain identik |
| [fase-ao-ef.md](fase-ao-ef.md) | `docs/history/` | 15377 → 15563 | 52 → 53 | `c59057c15edb8a3e7fe6fbc5911d1e23d430e4253365295bc88b5894bc7f0082` | `234e83cd7d9cfc23f65fe3f9c522b43525cb34f7f3a4dc03162b70738f4bdf3e` | Riwayat Fase AO/EF. pindah murni + banner; isi setelah banner identik |
| [governance.md](governance.md) | `docs/history/` | 23637 → 23814 | 188 → 189 | `f565d342779b34aed43ea2957859a02722525b3f3eab449eac6a1110c5f97eb4` | `3a4aaf2317e13b084b51399c49301f9b5448dd1dc0c91339ea9d8a0101dc6d67` | Riwayat konsolidasi governance (20 Sep 2026). banner + 1 tautan di-rebase; isi lain identik |
| [izin-dan-catatan-keputusan-owner.md](izin-dan-catatan-keputusan-owner.md) | `docs/history/` | 6284 → 6470 | 55 → 56 | `f66ff289bae6f2ee10168bd93a5a758f8740fa93bf782be86cb283c8a5128533` | `cde99f0cb385583bd4bcd98f977c233ffaca7982de81280be0960eccb291c479` | Riwayat izin & catatan keputusan owner. pindah murni + banner; isi setelah banner identik |
| [laporan-duplikat.md](laporan-duplikat.md) | `docs/history/` | 7976 → 8162 | 44 → 45 | `2bb355e162750b73905864863ba44f6fd3f4da2a9298545f41d678a4dff199c0` | `9c2bbf91a46523e29473f94d7177f3ee9ab8cdf0f2743888e11747d0685c6aad` | Laporan duplikasi isi. pindah murni + banner; isi setelah banner identik |

## 3. Cara memeriksa

1. Ambil berkas asal dari commit sebelum pemindahan: `git show HEAD:docs/audit/<nama>` (atau `docs/history/<nama>`), lalu hitung SHA-256 — harus sama dengan kolom **sebelum**. Untuk 17 berkas tracked yang bersih, cara ini sudah diuji dan cocok.
2. Untuk 13 berkas "pindah murni", buang dua baris banner pertama dari berkas arsip; SHA-256 sisa isi harus sama dengan kolom **sebelum** (bukti byte-per-byte, bukan klaim).
3. Untuk 6 berkas bertransformasi, selisih byte = panjang banner + perubahan panjang target tautan; **tidak ada baris isi yang dihapus**. Jumlah baris non-kosong naik tepat 1 per berkas (banner), bukan turun.
4. `bukti-2026-10.md` **sudah** punya perubahan sesi lain sebelum dipindah. Rekonstruksi isi kerja (419 baris dari HEAD + 83 baris entri baru) menghasilkan SHA sebelum `75e8d922ec92…`; setelah banner + 16 tautan di-rebase, isi di luar tautan tidak diubah. Perubahan sesi lain **tidak** diklaim sebagai milik batch ini.
5. `inventaris-docs-2026-10-20.md` **untracked** sebelum dipindah; SHA sebelum diambil dari berkas kerja. Dua tautannya di-rebase (bukan isi), byte menyusut tepat 22 = panjang dua target path yang dipendekkan.

## 4. Tautan masuk

Seluruh tautan aktif ke 19 berkas diperbarui pada batch yang sama (**118 tautan di 32 berkas aktif**, termasuk `AGENTS.md`, `docs/AUDIT.md`, `docs/ANTREAN.md`, `docs/KEPUTUSAN-OWNER.md`, changelog, dan berkas `docs/rencana/`). Gate `check-docs` melaporkan **R2 = 0** dan **R6 = 0** setelah pemindahan. Tautan di dalam 19 berkas juga di-rebase (**26 tautan di 6 berkas**); 2 tautan contoh `[teks](target)` sengaja **tidak** diubah.

**Dokumentasi arsip yang sudah beku** (mis. `AI_MASTER.md`, `DOC-GOV-20260922-mapping.md`, `changelog-2026-09.md`) semula memakai path lama. Atas keputusan owner **4b** (21 Okt 2026), **13 tautan** di 6 berkas arsip beku diperbaiki dengan addendum hash eksplisit — lihat [D4a-addendum-tautan-arsip.md](D4a-addendum-tautan-arsip.md). Tautan lain yang sudah rusak **sebelum** batch ini (mis. `../STATUS.md`, `../M13_CHANGELOG.md`) tidak diperbaiki; ini batas yang diketahui, bukan klaim "0 tautan rusak di seluruh arsip".

## 5. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-21 | Dibuat: 19 berkas dipindah, banner, ledger SHA-256; 6 berkas dengan 26 tautan di-rebase. |
