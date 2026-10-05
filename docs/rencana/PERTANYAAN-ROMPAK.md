# KARTU KEPUTUSAN — rombak dokumentasi KOST48

> **Blok baca** · Jenis: **kartu keputusan (beku per putaran)** · Status: **aktif — menua bersama rombak** · Untuk siapa: owner + agen sesi berikutnya
> · Baca kalau: melanjutkan batch rombak, atau ragu "apakah ini sudah diputuskan?". · **Jangan** dibaca kalau: mengerjakan task produk biasa.

**Kenapa berkas ini ada.** Rombak ini akan **berhenti di B5** untuk owner commit lebih dulu (P29). Kalau keputusan hanya hidup di percakapan,
sesi berikutnya akan menebak — dan menebak pada keputusan owner adalah cara termahal kehilangan arah. Berkas ini **mencatat**, bukan menambah aturan;
kontrak batch tetap di [RENCANA-ROMPAK-DOCS.md](RENCANA-ROMPAK-DOCS.md).

Sumber: tanya-jawab 2026-10-05 (Q1–Q32 · O1–O7 · D1–D3 · P1–P32). Ringkas; tidak ada keputusan yang diubah tanpa persetujuan owner.

## 1. Register inti (Q1–Q32)

| Q | Keputusan | Konsekuensi mengikat |
|---|---|---|
| Q1 | b — struktur **tangga baca** | Ada berkas wajib, rujukan, dan arsip; bukan 7 berkas pipih |
| Q2 | c — aturan **dikeluarkan dari STATUS** | Satu sumber aturan: berkas kontrak |
| Q3 | b→c — status penataan dokumen di berkas tersendiri, lalu hanya entri riwayat | Perlu penanda kapan "c" berlaku |
| Q4 | b — router digabung ke `AGENTS.md`; `AGENTS.md` §3 dihapus | Tautan ke README dialihkan |
| Q5 | b — `KEPUTUSAN-OWNER` dipecah: berlaku vs digantikan | Berkas hidup kecil |
| Q6 | a — plafon baca **≤1 berkas wajib + task aktif** | Menentukan isi berkas kontrak |
| Q7 | c — proksi, bukan token absolut | Lihat O3 |
| Q8 | b — blok baca hanya untuk berkas wajib | Rujukan tidak wajib berblok |
| Q9 | b (direvisi O2) — ambang **byte** | Lihat O2 |
| Q10 | a — Level + **alasan** wajib di laporan | Bentuk laporan 5 baris |
| Q11 | a — angka volatil **dilarang**; tulis perintahnya | Ditegakkan gate R1 |
| Q12 | a+b — kotak di luar antrean non-otoritatif **dan** backlog dikumpulkan | 1.447 kotak diturunkan derajatnya |
| Q13 | b — checklist audit → arsip + indeks kecil | 117 kotak keluar dari folder aktif |
| Q14 | c — STATUS = antrean + gate saja; bukti ke riwayat | 78,4 KB harus menyusut |
| Q15 | b — invariant masuk berkas kontrak | Ke `docs/KONTRAK.md`, bukan AGENTS |
| Q16 | b — **satu rumah arsip**, ejaan `archieve` diperbaiki | 181 rujukan dialihkan (B2) |
| Q17 | c — simpan yang dikutip; sisanya keluar repo | Owner mengeksekusi (O4) |
| Q18 | b — pointer hanya bila dipakai; **changelog satu rumah** | `M13_CHANGELOG.md` digabung |
| Q19 | i–v — banner · nama tetap · angka bek u · pekerjaan terbuka tidak ikut terarsip · inventaris | Aturan arsip |
| Q20 | b — boleh hapus (tracked) dengan ledger | Untracked selalu dipindah (O5) |
| Q21 | b — `audit-map` keluar dari `docs/` | 219 rujukan (B3) |
| Q22 | c — changelog bulan berjalan dipangkas 30 hari | 303 KB dipecah (B6) |
| Q23 | a — `PETA-KODE` satu-satunya peta yang dibaca | audit-map = artefak audit |
| Q24 | a — **gate dokumen yang bisa gagal** | `scripts/check-docs.mjs` |
| Q25 | b — gate manual, wajib hijau sebelum menutup batch dokumen | — |
| Q26 | a (direvisi O3) — berkas + **byte/4** | Baris sekunder |
| Q27 | b — bertahap per batch + ledger konservasi | B0–B8 |
| Q28 | c — pointer lama hanya bila dipakai di luar repo | Path M lama tetap dihapus |
| Q29 | c+a — snapshot/cabang dulu, commit per batch | Branch `docs-rombak` |
| Q30 | c+a — cabang terpisah + revert per batch | Rollback = revert commit batch |
| Q31 | konfirmasi nilai 1–8 + tambahan 9–12 | Lihat §4 |
| Q32 | setuju ukuran a–d + tambahan e–f | Lihat §4 |

## 2. Keputusan operasional awal (O1–O7)

| O | Keputusan |
|---|---|
| O1 | Q31 +: (9) larangan kredensial di dokumen · (10) daftar berkas/simbol berisiko · (11) alur deploy/rollback · (12) audit trail = tanggal + bukti yang bisa dijalankan. Q32 +: (e) baseline gate disimpan **sebagai berkas** · (f) uji nyata Q30 dijalankan di B8 |
| O2 | Plafon byte: **`AGENTS.md` ≤12 KB** (disuntik tiap request) · berkas wajib ≤16 KB · rujukan ≤48 KB + wajib daftar isi berjangkar atau dipecah |
| O3 | Proksi hemat token = **jumlah berkas + byte/4** di jalur wajib; baris sekunder · target ≤12 berkas / ≤150 KB |
| O4 | Pemindahan **ke luar repo** dieksekusi **owner**; agen menyiapkan daftar + perintah |
| O5 | **Tracked** boleh dihapus dengan ledger; **untracked selalu dipindah** (tidak ada jaring git) |
| O6 | `docs/STATUS.md` → **`docs/ANTREAN.md`**; `AGENTS.md` ramping + **`docs/KONTRAK.md`** (dibaca per task); invariant di KONTRAK |
| O7 | Tulis plan dulu, lalu B0+B1, **berhenti**; tanpa commit ke `main`, tanpa push |

## 3. Perbaikan di luar batch (D1–D3)

| D | Keputusan | Status |
|---|---|---|
| D1 | Perbaiki tautan `mode-cepat.md` sekarang sebagai micro-commit terpisah | **Selesai** 1 baris (R2 1→0). Commit tidak dibuat: berkasnya untracked milik owner (opsi A) |
| D2 | `AGENTS.md` **dikecualikan** dari R4 (disuntik, bukan dipilih); wajib **satu baris peran**; R4 untuk `KONTRAK.md`, `ANTREAN.md`, `PETA-KODE.md` | Gate v1.2 menerapkan |
| D3 | Plafon **tidak** dinaikkan; berkas >48 KB sah bila punya daftar isi berjangkar | `docs/domain/publik.md` **tidak** punya TOC → ditutup di B8 |

## 4. Nilai yang wajib selamat (Q31) & ukuran keberhasilan (Q32)

**Wajib selamat:** (1) invariant uang/jurnal + gate `backend npm run test:unit` (`pretest:unit`) & gate M04 · (2) permission/role & status hunian · (3) keputusan bisnis owner yang masih berlaku · (4) bukti audit bertanggal + batas keberlakuannya · (5) larangan menyentuh berkas/simbol berisiko tanpa izin · (6) pemisahan implementasi vs verifikasi vs deployment vs dampak runtime · (7) landasan bisnis IB Diploma · (8) aturan arsip "jangan dibaca rutin" · (9) **larangan menaruh kredensial/rahasia di dokumen** · (10) daftar berkas berisiko · (11) alur deploy/rollback · (12) audit trail bertanggal + bukti yang bisa dijalankan.

**Ukuran selesai:** (a) jalur wajib dari 50 berkas/1.037 KB → **≤12 berkas/≤150 KB** · (b) kotak otoritatif hanya di `docs/ANTREAN.md` · (c) 0 dokumen usang di folder aktif · (d) gate bisa gagal **dan pernah dibuktikan gagal** · (e) baseline tersimpan sebagai berkas · (f) uji nyata di B8 · **plus P32:** owner verifikasi di perangkat; "selesai" = gate hijau + laporan sebelum/sesudah + uji Q30 + semua Q/O/D/P tercatat.

## 5. Keputusan eksekusi (P1–P32)

| P | Keputusan |
|---|---|
| P1 | **b** untuk `CHANGELOG.md` + `08_CHECKLIST.md` (ditahan, tinjau isi dulu — lihat §6) · **a** untuk `01_GROUND_STATE.md`, `_AKUN_DUMMY_DEV.md`, `_PROPOSAL_METER_LISTRIK_AIR.md` |
| P2 | Keluar repo ke `…\kost48surabaya-v3\_arsip-docs-legacy-2026-10-05\`; **hanya dipindah, tidak dihapus** |
| P3 | **b** — 4 kandidat serap (`04_DEPLOY_AND_PWA`, `M17_AUDIT_360_P3_P8`, `17_PUBLIK_MARKETING_UIUX`, `AUDIT_INVENTARIS_LENGKAP`) masuk **backlog tersendiri**, tidak diserap di B2 |
| P4 | **a** — track semua kelas A+B |
| P5 | Hapus baris `docs/archieve/` dari `.git/info/exclude` — **dengan catatan urutan** (§7) |
| P6 | **a** — rebase 4 tautan + 39 kemunculan di dalam berkas yang pindah |
| P7 | **b** — bertahap per klaster: `kontrak.md` (15) → `PETA-KODE` (6) → `flow/publik/ai/KEPUTUSAN-OWNER` → sisanya; gate hijau tiap langkah |
| P8 | Biarkan sampai B8, lalu jadi kartu arsip |
| P9 | **a** — SHA-256 + jumlah baris per berkas; tabel 40 baris di ledger |
| P10 | **b** — tiga commit: pindah → alih rujukan → bersih-bersih |
| P11 | Sisakan folder `docs/archieve/` sampai verifikasi owner; hapus di B8 |
| P12 | Ya — `git mv` untuk tracked, `Move-Item` untuk untracked |
| P13 | Pertahankan subfolder: `docs/arsip/legacy/<subfolder-asli>/…` (flatten akan tabrakan nama) |
| P14 | **a** + generator di-track: `.audit-map/` di akar, keluaran gitignored, `generate.cjs` tracked |
| P15 | Rujukan `audit-map` di berkas arsip beku **dibiarkan** + catatan known-broken di kartu arsip |
| P16 | Hibrida: `operations/deploy-go-live.md` (52) → **b** penanda non-otoritatif · `domain/iot.md` (42) → **a** konversi ke daftar biasa (**"ya" owner diberikan 2026-10-05**) · 10 berkas lain → **a** · butir yang benar-benar pekerjaan terbuka → **c** migrasi ke ANTREAN (pekerjaan tersendiri, bukan satu putaran B4) |
| P17 | `docs/audit/index-cakupan.md` ±60 baris: ID tanpa kotak + tautan peta; dipelihara owner; gate memastikan berkas ada dan tidak memuat `[ ]` otoritatif |
| P18 | Router **dipadatkan jadi tabel ≤10 baris**; detail tetap di `docs/KONTRAK.md` |
| P19 | **c** hybrid: alihkan rujukan in-repo, sisakan pointer 3 baris untuk bookmark luar, hapus di B8. **Hasil pemeriksaan:** 0 rujukan di luar repo (folder induk bersih); in-repo non-docs: `.audit-runtime/c3-mine-only.ps1:35` dan komentar `frontend/src/pages/public/CekPage.tsx:10` (berkas dirty owner — disentuh hanya setelah P29) |
| P20 | Ya — invariant = tabel + perintah verifikasi; gate uang satu-satunya bukti sah task uang; daftar berkas beku format "nama + kerugian bila dilanggar" |
| P21 | Semua bukti bertanggal → `docs/history/bukti-2026-10.md`; ANTREAN hanya menautkan |
| P22 | Basis **tanggal entri**; satu berkas per bulan; `M13_CHANGELOG.md` digabung bila entrinya Okt 2026, sisanya beku ke arsip |
| P23 | Pakai tabel status yang sudah ada; target ≤16 KB ≈ 40–50 keputusan; bagian "digantikan" → `docs/arsip/` |
| P24 | **a** sekarang (`check:docs` di `package.json` root); **b** (pre-commit hook) ditinjau setelah B8 |
| P25 | Task nyata dari ANTREAN; ukur berkas yang **benar-benar dibuka untuk kerja** + byte-nya; bandingkan dengan daftar wajib (P26) dan baseline 50 berkas/1.037 KB |
| P26 | Jalur wajib = `AGENTS.md` + `KONTRAK.md` + `ANTREAN.md` + `PETA-KODE.md` + maks 2 berkas topik; `audit/**`, `rencana/**`, `history/**` di luar |
| P27 | Ya, hanya `publik.md`; plafon 48 KB juga mengikat `audit/**` |
| P28 | **Selesai** — plan dipindah ke `docs/rencana/RENCANA-ROMPAK-DOCS.md` |
| P29 | **a** — owner commit 4 berkas dirty (`STATUS.md`, `KEPUTUSAN-OWNER.md`, `domain/ai.md`, `history/changelog/2026-09.md`) **sebelum B5** |
| P30 | **c** — branch dibiarkan untuk ditinjau owner; **tidak push**; merge ke `main` menunggu perintah eksplisit |
| P31 | Satu batch = satu putaran + lapor + berhenti (B3 dan B4 tidak digabung) |
| P32 | Owner verifikasi di perangkat; tanda selesai seperti §4 |

## 6. Laporan dua berkas kelas B yang ditahan (P1)

| Berkas | Isi sebenarnya (diverifikasi 2026-10-05) | Usul |
|---|---|---|
| `2026-06-16_root_docs_pre_M/CHANGELOG.md` (120,8 KB, 771 baris) | Changelog historis: "KOST48 V5 — Versi 2026-06-13 — Audit V3 + 84 keputusan owner + restruktur docs domain-dossier". **Bukan** changelog yang direstore ke root (DOC-B) | Arsip **di dalam repo** (`docs/arsip/legacy/`) — nilai riwayat, bukan sampah |
| `2026-06-16_root_docs_pre_M/08_CHECKLIST.md` (43,9 KB, 160 baris) | "Checklist Eksekusi (untuk AI eksekutor)" 2026-06-13 — "kerjakan task BERURUTAN dari atas". Checklist tugas **kedaluwarsa** | Keluar repo: ia justru contoh "kotak otoritatif palsu" yang dibereskan B4 |

**Perlu diperiksa sebelum `_PROPOSAL_METER_LISTRIK_AIR.md` diperlakukan sebagai legacy:** isinya keputusan owner 2026-06-16 yang **DISETUJUI** (model & tampilan meter listrik/air, implementasi bertahap belum mulai). Wajib dipastikan `docs/domain/iot.md` sudah memuat keputusan itu — kalau belum, berkas ini **bukan** arsip mati.

## 7. Catatan penyimpangan & item terbuka

1. **Urutan P5 (belum dijalankan):** menghapus baris `docs/archieve/` dari `.git/info/exclude` **sebelum** owner memindahkan kelas C akan memunculkan ~68 berkas untracked di `git status`, karena 66 berkas kelas C + berkas yang ditahan masih tinggal di sana. Karena itu penghapusan ditempatkan **setelah** pemindahan kelas C oleh owner (atau di B8). Kelas A/B tidak terpengaruh: setelah pindah ke `docs/arsip/legacy/`, pola exclude itu tidak lagi menjangkaunya sehingga `git add` normal.
2. **P16 — selesai:** konversi 42 kotak `docs/domain/iot.md` ke daftar biasa **disetujui owner 2026-10-05** (sintaks berubah, isi aturan bisnis tidak). Dikerjakan di B4.
3. **P33 — selesai (kredensial, Q31-9):** `_AKUN_DUMMY_DEV.md` (untracked) memuat kata sandi DEV terbuka (4 pola; nilainya didaftarkan di [operations/default-dev.md](../operations/default-dev.md) dan **sengaja tidak ditulis lagi di berkas ini**). Keputusan owner 2026-10-05: **sanitasi sebelum di-track** — kata sandi literal dihapus, diganti rujukan ke `backend/scripts/seed-dev-reset.js`; email/nama/kamar tetap. Fakta pembanding: kata sandi yang sama **sudah ada di berkas repo** — 63 kemunculan di 21 berkas, terukur 2026-10-05 (termasuk arsip, kode, dan indeks lokal `.dsh/`); itu kondisi repo yang sudah ada, bukan kebocoran baru. **Tindak lanjut 2026-10-05 (sisa rombak):** nilai literal dihapus dari dokumen rencana (berkas ini + [B2-ledger](B2-ledger-konservasi.md)), 2 dokumen operasi ([deploy-go-live](../operations/deploy-go-live.md), [go-live-cpanel](../operations/go-live-cpanel.md)), dan 1 contoh di [domain/kontrak.md](../domain/kontrak.md); sisa di **kode** (seed DEV + skrip lokal) tercatat sebagai backlog di [ANTREAN](../ANTREAN.md).
4. **Pemeriksaan rujukan luar (P19):** 0 berkas di folder induk menyebut `docs/STATUS.md`. Batas: bookmark peramban, mesin lain, dan catatan di luar disk ini **tidak** bisa saya periksa — asumsi "tidak ada" berasal dari cakupan itu.
5. **Temuan untuk direkonsiliasi di B5/B7 (bukan pekerjaan B2):** `docs/domain/iot.md:822` menyebut proposal meter pascabayar dengan rujukan **`docs/M06_OPERASIONAL.md` § Bagian 5 (M-1..M-5 ✅)** — path M itu sudah dihapus di Fase 3 (rumah barunya `docs/domain/operasional.md`), dan tanda ✅ di sana **bertentangan** dengan isi proposal yang menyatakan "DISETUJUI (model & tampilan), implementasi BERTAHAP (**belum mulai**)". Dua tempat menyatakan status implementasi yang berbeda; perlu diputuskan mana yang benar sebelum proposal itu diperlakukan sebagai arsip mati.

## 8. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-05 | Dibuat atas permintaan owner: mengabadikan Q1–Q32 · O1–O7 · D1–D3 · P1–P32 supaya sesi berikutnya tidak menebak (khususnya karena rombak berhenti di B5 menunggu commit owner). |
| 2026-10-05 | Dua item terbuka ditutup: **P16** (konversi kotak `domain/iot.md`) = **ya**; **P33** (kredensial `_AKUN_DUMMY_DEV.md`) = **sanitasi sebelum di-track**. Ditambah temuan rekonsiliasi status proposal meter (iot.md:822 vs isi proposal). |
