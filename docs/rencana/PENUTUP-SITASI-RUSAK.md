# Penutup rujukan rusak — SELESAI (7 butir)

> **Blok baca** · Jenis: **kartu penutup rujukan rusak** · Status: **SELESAI — dieksekusi 2026-10-05** (perintah owner: "kerjakan semua yang belum dikerjakan, ambil keputusan paling bijak") · Untuk siapa: owner + agen verifikator
> · Baca kalau: akan menutup rujukan yang tidak punya target di repo. · **Jangan** dibaca kalau: mengerjakan task produk biasa.

Konteks: ditemukan saat batch **B2** (2026-10-05) ketika alih rujukan arsip legacy. **Tidak satu pun disebabkan B2** — semuanya sudah rusak sebelum rombak.
Bukti mentah: [B2-ledger-konservasi.md](B2-ledger-konservasi.md) §6 butir 3 dan 4 · keputusan terkait: [PERTANYAAN-ROMPAK.md](PERTANYAAN-ROMPAK.md) (P3, P15, P16).

Aturan yang berlaku: rujukan **hanya boleh** diarahkan ulang bila targetnya ada. Karena targetnya tidak ada, keenam butir ini **tidak** bisa ditutup oleh pengalihan path — harus diputuskan isinya.

## 1. Invetaris (terukur 2026-10-05)

| # | Lokasi rujukan | Yang dirujuk | Status target |
|---|---|---|---|
| 1 | `docs/domain/flow.md` baris 482 | `archieve/_DEPRECATED_05_UIUX_AUDIT_2026-06-12.md` | tidak ada di disk; **pernah ada** di riwayat git |
| 2 | `docs/operations/deploy-go-live.md` baris 9 | `archieve/_DEPRECATED_06_DEPLOY_RUNBOOK.md` | tidak ada di disk; **pernah ada** di riwayat git |
| 3 | `docs/operations/deploy-go-live.md` baris 9 (baris yang sama) | `archieve/_DEPRECATED_08_PWA_AUDIT_AND_HARDENING_PLAN_2026-06-12.md` | tidak ada di disk; **pernah ada** di riwayat git |
| 4 | `docs/M13_CHANGELOG.md` baris 13 | `docs/archieve/M13_CHANGELOG_ARSIP_S1_2026.md` | **tidak pernah ada**. Nama benarnya `_previous_cycles/M11_CHANGELOG_ARSIP_S1_2026.md` (144 KB, kelas C → keluar repo oleh owner) |
| 5 | `docs/operations/deploy-go-live.md` baris 20 | `` `08_CHECKLIST.md` `` (nama saja, tanpa path) | berkas ada, tetapi **keluar repo** pada batch B2 (eksekusi owner) |
| 6 | `docs/operations/verifikasi-keuangan.md` baris 117 | `` `08_CHECKLIST` `` (nama saja) | idem #5 |
| 7 | `docs/arsip/changelog-2026-08.md` · `docs/arsip/legacy/2026-09-07_docs_cleanup/GO_LIVE_DATA_ISI.md` · `docs/history/changelog/2026-09.md` | `docs/archieve/2026-09-07_docs_cleanup/tenant-data-template.tsv` | berkas dipindah ke `.docs-legacy/` saat penutupan B2 (`c1134387`); ketiga rujukan adalah catatan historis |

Catatan sifat: #1–#4 adalah **sitasi prosa** (path dalam backtick) — gate **tidak** memeriksanya, karena R2 hanya memeriksa tautan markdown. #5–#6 berada **di dalam baris `[ ]`** yang juga menjadi sasaran batch B4 (kebijakan kotak).

## 2. Pilihan tindakan per butir

**Butir 1–3 (jejak audit yang berkasnya sudah dihapus).** Nilainya historis: menyebut *dari mana* sebuah dokumen dikonsolidasikan.

| Opsi | Isi | Nilai | Risiko |
|---|---|---|---|
| a | Hapus kalimat rujukannya | bersih | kehilangan jejak asal-usul konsolidasi |
| b | **Ganti dengan catatan bertanggal** ("berkas itu dihapus; jejaknya di riwayat git sebelum 2026-10-05") | jejak tetap, tidak ada path mati | perlu satu penyuntingan di 2 berkas |
| c | Biarkan apa adanya | nol kerja | rujukan mati tetap ada dan akan ditemukan lagi oleh sesi berikutnya |

**Butir 4 (nama berkas salah).** Bukan sekadar target hilang — **namanya salah** sejak awal (`M13_CHANGELOG_ARSIP_S1` vs `M11_CHANGELOG_ARSIP_S1`). Opsi: (a) betulkan nama **dan** tandai bahwa berkasnya kini di arsip luar repo; (b) hapus baris tabelnya; (c) biarkan.

**Butir 5–6 (nama `08_CHECKLIST`).** Berkasnya memang pernah dipakai sebagai checklist eksekusi; setelah keluar repo, kalimat "Fase 1 di `08_CHECKLIST.md` selesai" tetap benar sebagai pernyataan sejarah, tetapi tidak lagi bisa diverifikasi di dalam repo. Opsi: (a) tambahkan keterangan "(checklist 2026-06-13, kini di arsip luar repo)"; (b) hapus rujukannya; (c) biarkan.

## 3. Usulan yang dijalankan

Keputusan diambil memakai opsi yang **paling sedikit menghapus informasi**: jejak historis dipertahankan, path mati dihilangkan, dan target yang masih ada di repo ditunjuk dengan jalur barunya.

| Butir | Usulan | Batch pelaksana | Alasan penempatan |
|---|---|---|---|
| 1–3 | Opsi **b** (catatan bertanggal) | **B8** (sapu akhir) | bukan bagian dari pemindahan; butuh keputusan kata-kata, bukan sekadar path |
| 4 | Opsi **a** (betulkan nama + tandai pindah keluar repo) | **B8** | idem |
| 5–6 | Opsi **a** (keterangan singkat di baris yang sama) | **B4** | baris itu memang sedang disunting B4 untuk kebijakan kotak — satu suntingan, bukan dua |

## 4. Usulan pencegahan (keputusan terpisah)

Gate v1.3 **tidak bisa** menangkap kelas rujukan ini: R2 hanya memeriksa `[teks](target)`, sedangkan keenam butir memakai **path dalam backtick**. Usulan aturan baru **R6 — "path dalam backtick"**: tolak bila sebuah dokumen kontrak menyebut `docs/…` yang tidak ada di disk, kecuali barisnya memuat penanda historis/potret (supaya catatan bertanggal tetap sah).

Konsekuensi bila R6 dipasang **sebelum** butir 1–6 ditutup: pelanggaran naik, bukan turun. Karena itu usulannya: **pasang R6 setelah B8** menutup keenam butir, lalu ukur baseline baru. Ini keputusan owner, bukan keputusan agen.

## 5. Hasil eksekusi (2026-10-05)

| # | Tindakan yang diambil | Bukti |
|---|---|---|
| 1 | Kalimat di `docs/domain/flow.md` diganti: "berkas lama `_DEPRECATED_05_UIUX_AUDIT_2026-06-12.md` sudah dihapus dari repo; jejaknya di riwayat git sebelum 2026-10-05" (opsi b) | tidak ada lagi path mati di baris itu |
| 2–3 | Baris versi `docs/operations/deploy-go-live.md` diganti: "konsolidasi dari runbook deploy dan audit PWA lama (keduanya sudah dihapus dari repo; jejaknya di riwayat git)" (opsi b) | dua path mati hilang, asal-usul tetap tercatat |
| 4 | **Tertutup dengan sendirinya:** berkas yang memuatnya (`docs/M13_CHANGELOG.md`) dihapus pada B8; sitasi itu kini hanya ada di salinan arsip beku | [arsip/changelog-2026-09.md](../arsip/changelog-2026-09.md) menyimpan isi M13 utuh |
| 5–6 | Keterangan ditambahkan **dan** jalur baru ditunjuk: `.docs-legacy/2026-06-16_root_docs_pre_M/08_CHECKLIST.md` (berkasnya memang ada di sana, di subfolder aslinya) | [deploy-go-live.md](../operations/deploy-go-live.md) · [verifikasi-keuangan.md](../operations/verifikasi-keuangan.md) |
| 7 | **Dibiarkan** — ketiga rujukan `tenant-data-template.tsv` semuanya di catatan historis (arsip + changelog beku), dan berkasnya terdaftar di inventaris arsip | [arsip/README.md](../arsip/README.md) |
| R6 | **Dipasang setelah B8** (gate v1.6). Cakupan: rujukan `docs/…` dalam backtick yang tidak ada; catatan bertanggal (`docs/rencana`, `docs/history`, `docs/arsip`) dikecualikan; glob/placeholder dilewati. **Terbukti bisa gagal**: uji negatif dengan satu rujukan palsu → 1 pelanggaran, exit 1 | [check-docs.mjs](../../scripts/check-docs.mjs) |

**Efek samping yang ikut tertangani:** R6 menemukan **36 rujukan rusak lain** yang tidak ada di inventaris awal (path era-M yang dihapus Fase 3), tersebar di 22 berkas hidup — semuanya sudah diarahkan ke rumah kanonik (40 penggantian). Selain itu, satu rujukan ke berkas yang memang tidak pernah ada (`FORM_ISI_DATA_GO_LIVE.md`) ditandai apa adanya di 2 dokumen, bukan dialihkan diam-diam.

## 5b. Keputusan yang diambil, dan batasnya

1. **Butir 5–6:** keterangan **plus jalur barunya** — lebih berguna daripada menghapus, karena pembaca bisa memverifikasi sendiri bahwa checklist itu masih ada (di luar dokumentasi).
2. **Butir 1–3:** cukup menyebut **bahwa** berkasnya dihapus dan jejaknya ada di riwayat git. Tanggal penghapusan tidak ditulis: tidak satu pun berkas itu dihapus oleh rombak ini — mereka sudah hilang sebelum B2, jadi tanggalnya tidak bisa dipastikan dari dokumen aktif.
3. **R6:** dipasang setelah B8, mencakup **semua dokumen aktif** kecuali catatan bertanggal (rencana/history/arsip). **Batas yang diketahui:** R6 hanya memeriksa bentuk `docs/…` di dalam backtick — rujukan tanpa backtick atau yang menyebut nama berkas saja tetap luput. Jadi R6 menaikkan kebersihan, bukan menjaminnya.

## 6. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-05 | DRAFT dibuat atas permintaan owner setelah batch B2. Belum ada satu butir pun yang dieksekusi. |
| 2026-10-05 | **Ketujuh butir ditutup** + R6 dipasang (gate v1.6) dan diuji negatif. Rincian per butir di §5. |
