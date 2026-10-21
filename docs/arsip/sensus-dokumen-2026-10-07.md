> **ARSIP BEKU** · dipindah dari `docs/audit/` ke `docs/arsip/` pada 2026-10-21 (DOCS-GEN2 D4a). Isi tidak diubah selain banner ini + rebase tautan relatif; **jangan dibaca rutin**.

# SENSUS DOKUMEN — mana yang masih dipakai, mana yang diarsipkan (2026-10-07)

> **Blok baca** · Jenis: **kartu audit bertanggal (sensus dokumen, read-only + satu pemindahan arsip)** · Status: **aktif — hasil sensus 2026-10-07** · Untuk siapa: owner + agen yang merawat dokumentasi
> · Baca kalau: mempertanyakan "dokumen mana yang sudah tidak perlu", menilai hasil pemindahan arsip 7 Okt 2026, atau menyiapkan sensus berikutnya. · **Jangan** dibaca kalau: mencari tugas berikutnya (itu [ANTREAN](../ANTREAN.md)) atau aturan kerja (itu [KONTRAK](../KONTRAK.md)).

**Maksud.** Doktrin menyebut sensus berkala "dokumen mana yang sudah tidak berlaku" (TUGAS A-a) sebagai **kegiatan terjadwal**, bukan aturan tetap — sebabnya penilaian per berkas butuh bukti, bukan kesan ([ADAPTASI §6](../rencana/ADAPTASI-DOKTRIN-DOCS.md)). Ini sensus pertama; hasilnya dipakai untuk memindahkan berkas yang benar-benar sudah tidak dipakai ke [arsip](../arsip/README.md).

**Metode (bisa diulang).** Untuk setiap dokumen aktif dihitung **graf rujukan** dengan empat gaya yang dipakai repo ini: tautan markdown relatif, rujukan backtick `docs/…`, rujukan dari skrip (`.mjs`/`.cjs`/`.js`/`.ps1`), dan sebutan nama polos. Rujukan dari `docs/arsip/**` dihitung terpisah (catatan sejarah, bukan pemakaian hidup). Tambahan yang dinilai: baris **Status** di berkas itu sendiri, jumlah kotak `[ ]` (aturan "pekerjaan terbuka tidak boleh ikut terarsip"), dan status beku/selesai yang berkas itu nyatakan tentang dirinya sendiri.

**Kriteria keputusan.** **ARSIPKAN** bila ketiganya benar: (1) berkas menyatakan dirinya **beku/selesai** atau hanya pointer lama; (2) isinya bukan rumah aturan yang masih mengikat (aturannya sudah ada di [AGENTS](../../AGENTS.md)/[KONTRAK](../KONTRAK.md)/[ANTREAN](../ANTREAN.md)); (3) **0** kotak pekerjaan terbuka. **TETAP** bila: rumah aturan, rujukan hidup bagi tugas/aturan yang berjalan, indeks, atau dipakai skrip/gate sebagai kontrak.

## 1. Hasil ringkas

| Ukuran | Sebelum | Sesudah |
|---|---:|---:|
| Dokumen aktif (di luar `docs/arsip`) | 72 | **65** sesudah pemindahan (72 − 7) · **66** setelah kartu sensus ini sendiri dibuat |
| — di `docs/` | 67 | 63 → 64 (termasuk kartu ini) |
| — di akar repo | 5 | 2 |
| Berkas `.md` di `docs/arsip/` | 56 | **63** |
| Gate dokumen | BERSIH | BERSIH (0 pelanggaran, 0 dilewati) |
| CATATAN ARSIP (kotak `[ ]` di arsip) | 244 kotak / 9 berkas | **244 kotak / 9 berkas** — tidak berubah, bukti **tidak ada pekerjaan terbuka yang ikut terarsip** |

## 2. Yang diarsipkan (7 berkas, 1 pemindahan)

| Berkas | Asal | Bukti keputusan (kenapa "tidak perlu lagi") |
|---|---|---|
| [B2-ledger-konservasi.md](../arsip/B2-ledger-konservasi.md) | `docs/rencana/` | Berkas menyatakan dirinya **"beku setelah B2"**; batch B2 tuntas 2026-10-05; 0 kotak terbuka |
| [B3-ledger-peta-audit.md](../arsip/B3-ledger-peta-audit.md) | `docs/rencana/` | **"beku setelah B3"**; peta audit & generatornya sudah pindah ke `.audit-map/` + `scripts/`; 0 kotak |
| [B4-ledger-kotak.md](../arsip/B4-ledger-kotak.md) | `docs/rencana/` | **"beku setelah B4"**; kebijakan kotak sudah tertanam di gerbang R3 + ANTREAN; 0 kotak |
| [PENUTUP-SITASI-RUSAK.md](../arsip/PENUTUP-SITASI-RUSAK.md) | `docs/rencana/` | Berkas menyatakan **"SELESAI — dieksekusi 2026-10-05"**; 0 kotak |
| [AI_MASTER.md](../arsip/AI_MASTER.md) | akar repo | Isinya sendiri: *"tidak ada isi aktif di sini"* — pointer 0,5 KB agar tautan lama resolve; keputusan lama 2026-10-05 "dibiarkan sampai rujukannya dialihkan" **dipenuhi** pada sensus ini (rujukan dialihkan) |
| [AI_QUICKREF.md](../arsip/AI_QUICKREF.md) | akar repo | Cheatsheet **turunan** yang menyatakan status tooling-nya sendiri "disinkronkan 22 September 2026" (basi) dan menduplikasi tabel level yang sudah kanonik di AGENTS §5; tidak dirujuk berkas konfigurasi agent mana pun |
| [AI_WORKFLOW_GUIDE.md](../arsip/AI_WORKFLOW_GUIDE.md) | akar repo | **"bagian roadmap di bawah adalah usulan historis"** dan status pelaksanaannya "dibaca dari M12/AI_MASTER" — **keduanya sudah tidak ada** (M12 dihapus Fase 3, AI_MASTER kini arsip) |

**Transformasi yang dicatat (bukan pindah murni):** setiap berkas diberi **banner di baris atas** (wajib untuk arsip sejak DOCS-CLEANUP-1, [KONTRAK §7](../KONTRAK.md)) dan **tautan relatifnya dihitung ulang** karena kedalamannya berubah — **54 tautan** disesuaikan di seluruh repo (termasuk rujukan backtick gaya akar-repo dan tautan antar-berkas yang ikut pindah). Berkas **di luar** yang dipindah yang ikut tersentuh hanya pada **satu baris tautan** masing-masing — terverifikasi dengan `git diff --numstat`: 2 kartu audit (`audit-modul-2026`, `backend-auth-2026-09-24`), 1 berkas arsip lain yang menautkan ledger B2 (`B2-daftar-pindah-arsip-legacy.md`), dan 2 berkas rencana yang tetap (`PERTANYAAN-ROMPAK` 1 baris, `RENCANA-ROMPAK-DOCS` 4 baris). Nama berkas **tidak** diubah.

## 3. Ledger konservasi pemindahan ini

`baris` = jumlah baris baru (setiap berkas +2 baris: banner + baris kosong). SHA-256 lengkap dihitung untuk berkas sebelum dan sesudah.

| Berkas | Byte sebelum → sesudah | Baris | SHA-256 sebelum → sesudah |
|---|---|---:|---|
| B2-ledger-konservasi.md | 11.255 → 11.488 | 125 → 127 | `840a51c138170cbd…` → `3f73dbad829b3ab3…` |
| B3-ledger-peta-audit.md | 4.724 → 4.957 | 75 → 77 | `e0c5a57a765b08d2…` → `c28a5096d9655341…` |
| B4-ledger-kotak.md | 5.800 → 6.033 | 67 → 69 | `23ecada966cbca8d…` → `8448e9c4aa608aaf…` |
| PENUTUP-SITASI-RUSAK.md | 8.306 → 8.510 | 79 → 81 | `4cea143706917e69…` → `1827b13b5b312e0f…` |
| AI_MASTER.md | 504 → 700 | 7 → 9 | `9b14e97081f84e36…` → `4fa9abced82f0143…` |
| AI_QUICKREF.md | 5.161 → 5.392 | 67 → 69 | `32981aea955c6392…` → `8943e208a6d0ce6a…` |
| AI_WORKFLOW_GUIDE.md | 5.016 → 5.232 | 78 → 80 | `444d64e75fa4e7dc…` → `062bec870f4945a1…` |

**Verifikasi pemindahan:** (a) **0** rujukan ke jalur lama tersisa di seluruh repo (`docs/rencana/B2-ledger-konservasi|B3-ledger-peta-audit|B4-ledger-kotak|PENUTUP-SITASI-RUSAK`); (b) gate **R2 = 0 tautan mati** dan **R6 = 0 rujukan backtick hantu**; (c) **36 tautan relatif di dalam 7 berkas pindah** diperiksa satu per satu → **0 rusak** (arsip tidak diperiksa gate, jadi ini diperiksa terpisah); (d) inventaris [arsip/README.md](../arsip/README.md) bertambah 7 baris → kartu kekuatan item H tetap lulus; (e) kartu kekuatan **11/11**, kartu kesegaran exit 0.

## 4. Yang sengaja DIPERTAHANKAN (dan alasannya)

Komposisi 66 dokumen aktif sesudah sensus ini (65 + kartu ini sendiri), dan alasan tiap kelompok:

| Kelompok | Jumlah | Alasan tidak diarsipkan |
|---|---:|---|
| Akar repo: [AGENTS](../../AGENTS.md), [CLAUDE.md](../../CLAUDE.md) | 2 | AGENTS = kontrak tertinggi (15 rujukan masuk) dan disuntik tiap request; CLAUDE.md = pointer yang dibaca harness agent (bukan sumber aturan, tetapi dipakai) |
| `docs/` tingkat atas: [ANTREAN](../ANTREAN.md), [ATURAN](../ATURAN.md), [AUDIT](../AUDIT.md), [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md), [KONTRAK](../KONTRAK.md), [OPERASI](../OPERASI.md), [PETA-KODE](../PETA-KODE.md) | 7 | Rumah aturan; rujukan masuk terbanyak (ANTREAN 53, KEPUTUSAN-OWNER 40, KONTRAK 21, PETA-KODE 18) |
| `docs/audit/` | 16 | 13 kartu bertanggal (termasuk kartu ini) + 2 indeks ([README](../audit/README.md), [index-cakupan](../audit/index-cakupan.md)) + 1 kartu status hidup ([status-ao-lintas-portal](../audit/status-ao-lintas-portal.md), memuat state tugas AO). Bukti untuk temuan/gate yang **belum semuanya ditutup**; [KONTRAK §7](../KONTRAK.md) menegaskan arsip **tidak** sah sebagai bukti PASS untuk perubahan baru |
| `docs/domain/` | 10 | 9 rujukan domain + indeks; setiap berkas punya 8–19 rujukan masuk, termasuk antar-domain |
| `docs/operations/` | 10 | 9 runbook + indeks; dipakai tugas terbuka (deploy, produksi, go-live, DEV) |
| `docs/product/` | 6 | 5 dokumen arah/scope/portal + indeks; dirujuk ANTREAN dan domain |
| `docs/history/` | 8 | Bukti bertanggal yang masih tumbuh ([bukti-2026-10](bukti-2026-10.md) diperbarui tiap putaran; [changelog bulan berjalan](../history/changelog/2026-10.md)) + [batas-kejujuran](../history/batas-kejujuran.md) yang dibaca sebelum menutup sesi + indeks |
| `docs/rencana/` | 5 | Indeks + 4 yang dipertahankan: [RENCANA-ROMPAK-DOCS](../rencana/RENCANA-ROMPAK-DOCS.md) dan [PERTANYAAN-ROMPAK](../rencana/PERTANYAAN-ROMPAK.md) adalah **provenance kontrak gate yang masih aktif** (dirujuk kepala `scripts/check-docs.mjs`); [ADAPTASI-DOKTRIN-DOCS](../rencana/ADAPTASI-DOKTRIN-DOCS.md) dirujuk [KONTRAK §8](../KONTRAK.md) + [ANTREAN §3](../ANTREAN.md) sebagai asal konvensi A-2; [ALAT-UKUR-KESEGARAN-DOCS](../rencana/ALAT-UKUR-KESEGARAN-DOCS.md) dokumentasi alat ukur yang masih hidup |
| `docs/kerja/` | 2 | Indeks + dokumen kerja tugas yang **masih jadi acuan bentuk A-2** ([TASK-T05-DETEKTOR-ARSIP](../kerja/TASK-T05-DETEKTOR-ARSIP.md)) |
| **Total** | **66** | — |

## 5. Kandidat gelombang berikutnya (belum diarsipkan — jangan dianggap sudah selesai)

| Berkas | Ukuran | Mengapa kandidat | Mengapa ditahan |
|---|---:|---|---|
| [audit-2026-09.md](audit-2026-09.md) | 21,5 KB | Kartu gabungan September (dokumentasi + homepage + UI/UX); rujukan masuknya **hanya** dari indeks audit + kartu audit lain + bukti | Masih dipetakan [AUDIT.md](../AUDIT.md) sebagai audit halaman utama; memindahkannya menuntut baris indeks ikut diarahkan, dan tidak ada bukti seluruh temuannya sudah ditutup |
| [audit-modul-2026.md](audit-modul-2026.md) | 13,3 KB | Audit modul pertama (Sep); statusnya sendiri "diperiksa sebagian" | Masih dirujuk [AUDIT.md](../AUDIT.md) (baris "auth-frontend") dan kartu audit lain |
| [audit-kekuatan-dokumentasi-2026-09-24.md](audit-kekuatan-dokumentasi-2026-09-24.md) | 10,8 KB | Audit kekuatan dokumentasi Sep; sebagian besar temuannya sudah ditutup batch B-series/RAPI | Dirujuk kartu [audit aturan docs](audit-aturan-docs-vs-doktrin-2026-10-07.md) sebagai pembanding; memindahkannya saat itu masih dipakai untuk perbandingan |

Sensus berikutnya sebaiknya dijalankan **setelah** temuan ketiga kartu di atas dinyatakan tertutup, dengan metode yang sama (graf rujukan + status + kotak terbuka).

## 6. Batas laporan ini

- Angka rujukan dihitung dengan skrip di luar repo (sekali jalan, 2026-10-07) pada pohon kerja saat itu; **tidak** ada rujukan dari luar repo (mis. tautan dari chat/tiket) yang bisa dihitung.
- "Tidak dipakai" di sini berarti **tidak ada rujukan hidup di dalam repo** — bukan "isinya salah" dan bukan "tidak berguna bagi manusia".
- Sebutan nama polos (tanpa tautan/backtick) dihitung sebagai pemakaian **lemah**: berkas dengan hanya sebutan polos tetap dipertahankan bila ia rumah aturan.
- Pemindahan ini **tidak** menyentuh berkas untracked milik sesi lain (`.design-audit/`, 36 MB — keputusan owner terpisah) dan tidak mengubah riwayat git.
- Tidak ada test/build/lint/typecheck/server/DB yang dijalankan (docs-only, AGENTS §7).
