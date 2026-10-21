# D4a — addendum perbaikan tautan arsip (potret 2026-10-21)

> **ADDENDUM LEDGER** · Batch **DOCS-GEN2 D4a** · Status: **beku setelah addendum** · Dasar: keputusan owner **4b** (21 Okt 2026)
> · Baca kalau: memverifikasi bahwa perbaikan 13 tautan di arsip beku tidak mengubah isi lain.

**Konteks.** Pemindahan D4a membuat 13 tautan di 6 berkas arsip beku menunjuk path lama `docs/audit/…` dan `docs/history/…`. Zona arsip dikecualikan gate, jadi ini bukan pelanggaran gate; tetapi owner memilih **(4b)** memperbaikinya dengan addendum hash yang eksplisit. Berkas tujuan kini berada **datar** di `docs/arsip/`, jadi target baru cukup nama berkas.

## 1. Ringkasan

| Ukuran | Nilai |
|---|---:|
| Berkas disentuh | **6** |
| Tautan diperbaiki | **13** |
| Perubahan selain target tautan | **0** (dibuktikan dengan reversi + SHA-256) |
| Berkas dipindah/dihapus | **0** |

## 2. Tabel

| Berkas | Byte sebelum → sesudah | Baris non-kosong | SHA-256 sebelum | SHA-256 sesudah | Tautan |
|---|---|---:|---|---|---:|
| [AI_MASTER.md](AI_MASTER.md) | 700 → 689 | 7 → 7 | `4fa9abced82f01433921fc05937db6ab7ee13a38fd93e31c767fe3418419363f` | `a32d39ce3578b16a8f791f5dffe163f525901f565b7335bb9a3d6a5a65baab22` | 1 |
| [audit-uiux-lintas-portal-2026-07.md](audit-uiux-lintas-portal-2026-07.md) | 62653 → 62633 | 587 → 587 | `5aacfd9eaeee1ebaf728f45242ef84e184181608a9e601f33e676b47c383b2f0` | `305bf08831e50c84497fa4800e29f767b79ecd633767a40d795d977d05b7f349` | 2 |
| [audit-uiux-total-2026-09-12.md](audit-uiux-total-2026-09-12.md) | 35751 → 35742 | 285 → 285 | `5151f43cf3ac56c462648d83d0c2fc98a2051497fd988cecc447ecf91f3697d2` | `7341975da1e3bb3d76e7812c73d7c0f919456fc98b4bc6a4302cc02db2899d8a` | 1 |
| [changelog-2026-06.md](changelog-2026-06.md) | 51403 → 51394 | 340 → 340 | `839756c32de9296444864f48a298365cd5216379d7ce2c93f9ae8464a2caec99` | `4b0c05d438e01d2e10e3d81d0ba5ab5bfddc9a3ea2a5d0a430244b22615a313a` | 1 |
| [DOC-GOV-20260922-mapping.md](DOC-GOV-20260922-mapping.md) | 91103 → 91032 | 210 → 210 | `dadf80cfe535dd7f802252a260baf49026dfe7c04e1b3728b74bd45ef2efb602` | `8f86c034dcb7a1b48acaab638ed6a790bfea744606a3357305f57b3295bce55f` | 7 |
| [README.md](README.md) | 10591 → 10582 | 64 → 64 | `2cf2f2a0c964168477b1562d869c11f48075825463858d2b65a71e92486cc8f7` | `85315f1205240a7cbcac7bb48897d3e45b37d962c905eaab7f0e95439fa15b3f` | 1 |

**Catatan:** `README.md` berubah lagi pada batch **D4b/D4c/D4d** (inventaris operations, domain, product/kerja/rencana). Hash README di tabel ini adalah **potret setelah D4a**, bukan kondisi terkini; perubahannya dicatat di [D4b-ledger-konservasi.md](D4b-ledger-konservasi.md).

## 3. Cara memeriksa

1. Untuk 5 berkas tracked, ambil versi `HEAD` sebelum addendum; SHA-256 harus sama dengan kolom **sebelum**. Terapkan kebalikan 13 penggantian target pada berkas sekarang; hasilnya harus identik dengan versi `HEAD`.
2. Untuk `README.md`, kolom **sebelum** adalah kondisi kerja sebelum addendum: satu baris target (`sensus-dokumen-2026-10-07.md`) dikembalikan ke `../audit/sensus-dokumen-2026-10-07.md`; tidak ada baris lain yang berubah.
3. Tautan baru diuji dengan resolusi relatif dari `docs/arsip/`: 13/13 menunjuk berkas yang ada.

**Batas:** tautan lain yang sudah rusak **sebelum** batch ini (mis. `../STATUS.md`, `../M13_CHANGELOG.md`) tidak diperbaiki oleh addendum ini; daftar itu berada di luar 13 tautan yang diputuskan owner.

## 4. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-21 | Dibuat: 13 tautan di 6 berkas arsip diperbaiki; isi lain tidak berubah (reversi SHA-256 identik untuk 5 berkas tracked; README satu baris). |
