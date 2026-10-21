# D4c — ledger konservasi konsolidasi domain (potret 2026-10-21)

> **LEDGER BATCH** · DOCS-GEN2 **D4c** · Status: **beku setelah D4c** · Dasar: rencana D4 (owner Q3=a)
> · Baca kalau: memverifikasi bahwa 5 berkas domain dipindah tanpa kehilangan isi, dan aturan/invarian tetap hidup di 4 berkas aktif.

**Tujuan.** Domain **10 → 5** (README + 4 isi): `keuangan.md` (keuangan+harga), `hunian.md` (hunian+operasional), `publik.md` (publik+flow+kontrak), `ai.md` (AI+IoT). Isi disalin **per blok**; teks tidak ditulis ulang, hanya heading digeser satu tingkat + header bagian/anchor/TOC.

## 1. Ringkasan

| Ukuran | Nilai |
|---|---:|
| Berkas dipindah ke arsip | **5** |
| Isi asal identik setelah banner (SHA body) | **5/5** |
| Berkas aktif domain | **5** (README + 4 isi) |

## 2. Berkas yang dipindah

| Berkas (arsip) | Isi ke | Byte | Baris non-kosong | SHA-256 sebelum | SHA-256 sesudah | Keterangan |
|---|---|---:|---:|---|---|---|
| [harga.md](../arsip/harga.md) | `domain/keuangan.md` | 13905 → 14088 | 172 → 173 | `5d71ae13c70adceff2ac283492fedbda2c47a783fcdf73b89b5cc9e0b66f9147` | `b8cf96c93e53fe9ec6d2287647854a8a7b96fc339a1a601d8a82cbd630ac2a3c` | keuangan Bagian B — Harga |
| [operasional.md](../arsip/operasional.md) | `domain/hunian.md` | 26416 → 26599 | 324 → 325 | `912fda55e5334fc524b6546c2e6232d02b1ae6dfd3cf3d3b9d9786b286f61c24` | `22740d9423540d499485b1a0756ca22889315287489b9f4a5c25dd32702ccf9b` | hunian Bagian B — Operasional/staf/auth |
| [flow.md](../arsip/flow.md) | `domain/publik.md` | 36731 → 36914 | 366 → 367 | `9293dfe63fed9f4fe4f5709833a6b0ca75558abd223c9d14ce9ed7df5cbaff45` | `30d805c77ea1259dc2af04bfc7a72d1270d854d86704f51ca366a895cd498277` | publik Bagian B — Flow map |
| [kontrak.md](../arsip/kontrak.md) | `domain/publik.md` | 22332 → 22515 | 354 → 355 | `d253c573388b7c45c30a8a333017449975f69f30728f2e9dd89627ef0f5c9258` | `42888acd30776417253bad04cc20a175270a4c8b2d0cfb8499a39904a4b9164e` | publik Bagian C — Kontrak & business rules |
| [iot.md](../arsip/iot.md) | `domain/ai.md` | 36064 → 36247 | 616 → 617 | `1083edeed104d2657a6facf179502a0ec4b3bbc2b936d51633d66babb6d19f31` | `3a8d585f0a5e60ee0e0fe82d692aa54b04a13d2d6661dafb61d9e1fb88090dcb` | ai Bagian C — IoT |

## 3. Berkas target

| Berkas aktif | Byte sebelum → sesudah | Baris non-kosong | SHA-256 sesudah |
|---|---:|---:|---|
| `domain/keuangan.md` | 9883 → 23813 | 94 → 267 | `08f66a43b9e9669484b642246a1eb5389ef6c3d3afca619ddcb1a41c825e1a5a` |
| `domain/hunian.md` | 12570 → 39048 | 85 → 410 | `04de9befc6c5aa06dda47b55bbfc73b374b33d1fa920fd96f3199beaf1d04274` |
| `domain/publik.md` | 52659 → 112099 | 525 → 1252 | `62c9087a717a7a323921f9f4d5b384914419a5d624f5345d18cc50d5e93acb7c` |
| `domain/ai.md` | 30445 → 66803 | 642 → 1265 | `07020e359b01ab017901d95329762a53e6c53dfa8cb07df74ae3879ed0044a8c` |

## 4. Cara memeriksa

1. Buang banner + satu baris kosong dari 5 berkas arsip; SHA-256 sisa isi harus sama dengan kolom **sebelum**.
2. Isi yang disalin ada di berkas aktif sebagai bagian dengan heading digeser +1; tidak ada baris isi yang dihapus. Kenaikan baris non-kosong berasal dari header bagian/anchor/TOC.
3. Tautan aktif ke 5 berkas lama sudah diarahkan ke berkas aktif + anchor bagian; gate R2/R6 = 0.

**Batas:** *publik.md* menjadi ~109 KB dan *ai.md* ~65 KB; keduanya wajib punya daftar isi berjangkar (R5/D3). Tidak ada aturan yang dipindah ke arsip tanpa salinan aktif.

## 5. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-21 | Dibuat: 5 berkas dipindah, 4 target diperluas; 5/5 isi arsip identik setelah banner. |
