# RENCANA ROMPAK DOKUMENTASI — kontrak batch

> **Blok baca** · Jenis: **kontrak rencana** · Status: **aktif (B0–B1 dikerjakan 2026-10-05)** · Untuk siapa: owner + agen AI pelaksana
> · Baca kalau: akan menjalankan atau menilai batch rombak dokumentasi. · **Jangan** dibaca kalau: sedang mengerjakan task produk biasa.

Dokumen ini **mengikat urutan batch**. Ia dibuat atas keputusan owner 2026-10-05 (Q1–Q32 + O1–O7) dan menggantikan
kebijakan `ARSIP-BATAS` (24 Sep 2026) serta target "7 berkas utama + 1 arsip" pada `STATUS.md` §8 — keduanya dibuka ulang secara sadar.

---

## 1. Diagnosis terukur (dasar keputusan, diukur 2026-10-05, HEAD `951f0c95`)

| Ukuran | Angka |
|---|---:|
| `docs/**` seluruhnya (sebelum B2) | 1.291 berkas `.md` · 7,3 MB · ≈1,87 juta token (proksi `byte/4`) |
| **Jalur baca "panas"** (yang benar-benar mungkin dibaca sesi baru) | **50 berkas · 1.037 KB · ≈265 rb token** |
Rincian per berkas: kartu keputusan, baseline gate, dan ledger per batch.

**Temuan yang mengubah Q9/Q26:** baris **bukan** proksi biaya yang sah — `docs/STATUS.md` hanya 147 baris tetapi **78,4 KB**; ambang berbasis baris meloloskan justru dokumen termahal, jadi ukuran mengikat = **byte**.
**Temuan kedua:** `AGENTS.md` disuntik harness **tiap request** → menambah isinya adalah pajak per-putaran, bukan ongkos sekali baca.

---

## 2. Struktur target (tangga baca)

| Tangga | Berkas | Sifat | Plafon |
|---|---|---|---|
| 0a | `AGENTS.md` | kontrak kerja + router dokumen; **disuntik tiap request** | **≤12 KB** |
| 0b | `docs/KONTRAK.md` | aturan rinci, **invariant + cara cek**, daftar berkas beku, bentuk laporan | **≤16 KB** |
| 0c | `docs/ANTREAN.md` | **satu-satunya** antrean/gate + 10 teratas; tanpa aturan, tanpa bukti | **≤16 KB** |
| 1 | `docs/PETA-KODE.md`, `docs/domain/**`, `docs/operations/**`, `docs/product/**`, `docs/audit/**` | rujukan, baca bila perlu | ≤48 KB per berkas, di atas itu wajib daftar isi berjangkar |
| 2 | `docs/arsip/{audit,changelog,legacy,plans}/**` | arsip beku + banner + indeks satu halaman | — |
| — | `.audit-map/` (akar repo, gitignored) | artefak generated, **bukan** dokumen | — |
| — | `docs/rencana/` | rencana/kontrak batch yang masih berjalan (dokumen ini) | ≤16 KB |

Berkas yang **hilang** setelah rombak: `docs/README.md` (router → `AGENTS.md` §3), `docs/STATUS.md` (→ `docs/ANTREAN.md`),
`docs/M13_CHANGELOG.md` (→ riwayat bulanan), `docs/archieve/**` (→ `docs/arsip/legacy/**` atau keluar repo),
`docs/arsip/audit-checklist-total.md` (→ arsip + indeks kecil).

---

## 3. Aturan yang mengikat

1. **Angka volatil dilarang di dokumen.** Tulis perintah pengukurnya. Bila sebuah angka wajib muncul, tulis sebagai *potret* bertanggal
   (`potret 2026-10-05`) dan beri kata penanda riwayat. Ditegakkan gate R1.
2. **Kotak `[ ]` otoritatif hanya di `docs/ANTREAN.md`.** Kotak di berkas lain = indeks cakupan, bukan pekerjaan (ditegakkan R3).
3. **Arsip:** banner di baris atas · nama berkas tidak diganti · angka di arsip tidak diperbarui · **pekerjaan terbuka tidak boleh ikut terarsip**
   (dipindah dulu ke ANTREAN) · satu baris inventaris di `docs/arsip/README.md`.
4. **Penghapusan:** berkas **tracked** boleh dihapus dengan ledger konservasi; berkas **untracked** selalu **dipindah**, tidak pernah dihapus.
5. **Gate wajib hijau** sebelum menutup batch dokumentasi (`node scripts/check-docs.mjs`). Gate yang melewati pemeriksaan **harus terlihat**:
   `SKIP` = exit code 2, tidak boleh berarti lulus.
6. **Bentuk laporan tiap batch** (5 baris, Q10=a):

   ```
   BATCH: <B0..B8> — Level: <XS..XL> — alasan: <satu frasa>
   UBAH: <berkas + satu baris apa yang berubah>
   ANGKA: <berkas/byte jalur wajib> <sebelum> → <sesudah>
   VERIFIKASI: <command, cwd, exit code, hasil>
   BLOKIR: tidak ada | <sebab>
   ```

7. **Verifikasi ulang tiap pemindahan:** 0 baris non-kosong hilang (ledger konservasi) + 0 tautan patah baru.

---

## 4. Rencana batch

| Batch | Isi | Gate / bukti | Rollback |
|---|---|---|---|
| **B0** | Branch `docs-rombak`; snapshot `docs/` ke `.design-audit/docs-snapshot-2026-10-05/`; daftar berkas yang diniatkan | `git status` sebelum = sesudah untuk berkas yang tidak diniatkan | hapus branch bila gagal |
| **B1** | `scripts/check-docs.mjs` (R1–R5) + jalankan pada kondisi sekarang; baseline disimpan sebagai berkas | Baseline **wajib merah** dan tersimpan sebagai berkas, bukan hanya keluaran terminal | hapus skrip + berkas baseline |
| **B2** ✅ | 39 berkas dikutip → `docs/arsip/legacy/`; 68 sisanya → `.docs-legacy/`; **60 rujukan** dialihkan; 7 penghapusan tracked | konservasi SHA 68/68 · 0 tautan patah baru · P5 & P11 ditutup | revert commit |
| **B3** ✅ | `docs/audit-map/**` → **`.audit-map/`** (tetap gitignored); generator → `scripts/audit-map-generate.cjs` (**tracked**); 157 tautan + 24 path dokumen dialihkan | **1.203 tautan sumber** diperbaiki · **4.013 tautan diverifikasi, 0 rusak** · gate R2 0 · regenerasi peta menunggu owner — ledger: [B3-ledger-peta-audit.md](B3-ledger-peta-audit.md) | revert commit |
| **B4** ✅ | Checklist audit 135 ID → arsip + indeks tipis; kebijakan 368 kotak: **117 ke arsip · 108 dikonversi · 78 bertanda non-otoritatif · 65 direklasifikasi** | Bukti konversi **normalisasi 5/5 identik** · R3 **0** dengan **143 kotak dikecualikan tetap terlihat** · R7 hijau · R2 0 — ledger: [B4-ledger-kotak.md](B4-ledger-kotak.md) | revert commit |
| **B5** | Pisah otoritas: `AGENTS.md` ramping + `docs/KONTRAK.md` + `docs/ANTREAN.md`; bukti → riwayat; `docs/README.md` dihapus | Gate hijau; jalur wajib ≤12 berkas / ≤150 KB | revert commit batch |
| **B6** | Rotasi changelog: bulan berjalan = 30 hari terakhir; `M13_CHANGELOG.md` digabung | Gate hijau | revert commit batch |
| **B7** | `KEPUTUSAN-OWNER` dipecah: berlaku sekarang vs digantikan (arsip) | Gate hijau; berkas hidup ≤16 KB | revert commit batch |
| **B8** | Sapu akhir: berkas di atas plafon byte, blok baca, **uji nyata Q30** (sesi baru + 1 tugas, ukur berkas+byte yang dibaca) | Laporan akhir + angka sebelum/sesudah | revert commit batch |

**Status batch (2026-10-05):** **B0 ✅ B1 ✅ B2 ✅ B3 ✅** · gate terkini **v1.4 = 23 pelanggaran + 1 dilewati** (R1 2 · R2 **0** · R3 12 · R4 4 · R5 5) · bukti per batch: kartu baseline + ledger.

**Kebijakan line ending ✅** (2026-10-05, sebelum B2): `.gitattributes` ditambahkan (`* text=auto eol=lf`; skrip Windows CRLF; biner tidak disentuh).
Fakta yang menghemat satu langkah: isi index sudah LF seluruhnya — **1.109 `i/lf`, 0 `i/crlf`, 0 `i/mixed`** — sehingga **tidak perlu** commit normalisasi;
146 `w/crlf` + 48 `w/mixed` hanyalah artefak checkout Windows.

**B2 recon ✅** (2026-10-05): 106 berkas `docs/archieve/**` dipetakan — **kelas A 35** (dikutip lewat path) · **kelas B 5** (hanya namanya muncul) · **kelas C 66** (tidak dikutip).
Daftar pindah: `docs/rencana/B2-daftar-pindah-arsip-legacy.md`. Temuan: berkas kelas A dikutip eksplisit oleh `flow.md`, `kontrak.md`, dan `PETA-KODE.md`, sehingga pemindahan menuntut alih rujukan besar — dan sebagian kandidat lebih tepat **diserap** ke dokumen aktif (masuk backlog P3).

**B2 eksekusi ✅** (2026-10-05, 3 commit — rincian per commit di [ledger](B2-ledger-konservasi.md) §6):

- **B2.1 `2971efa7`** — 39 berkas pindah ke `docs/arsip/legacy/`; **37 identik SHA-256**, **2 transformasi** (redaksi kredensial, sisa 0); 15 berkas untracked kini tracked (P4=a).
- **B2.2 `56e99f15`** — **60 rujukan dialihkan** di 23 dokumen aktif, bertahap 4 klaster + gate tiap klaster (P7). Rujukan hanya dialihkan bila targetnya ada; 4 dibiarkan (lihat §4.1).
- **B2.3 `a4b46132`** — pernyataan struktur diperbarui di `AGENTS.md` §6, `docs/ATURAN.md`, `docs/README.md`, `docs/product/orientasi.md`, `docs/arsip/README.md`.
- **`0f28e8d9`** (terpisah, bukan bagian B2) — dokumentasi tertunda owner; dipisah dari commit campuran atas instruksi owner 2026-10-05. **`20a043e7`** — skrip pindah keluar repo + draft penutup sitasi rusak + gate v1.4.
- **B2 penutup `c1134387`:** 68 berkas arsip (913 KB) pindah ke `.docs-legacy/` — **di dalam repo, diabaikan git** (keputusan owner 2026-10-05, sebab sandbox agen tidak boleh menulis di luar repo); konservasi SHA-256 **68/68**, 7 penghapusan tracked. **P5 ditutup** (baris `docs/archieve/` di `.git/info/exclude` dihapus; `git check-ignore` kosong) · **P11 ditutup** (pohon folder kosong dihapus). Skrip `B2-pindah-keluar-repo.ps1` tetap disimpan sebagai cara mengeluarkan folder itu dari repo bila diinginkan.

B3–B8 **belum**; menunggu perintah.

### 4.1 Ledger perbaikan di luar batch

| Item | Sifat | Status |
|---|---|---|
| **D1** tautan `docs/product/mode-cepat.md` → `../../design/alur-semua-halaman.html` | 1 baris, di luar batch (gate sudah mendeteksinya; dibiarkan akan jadi noise tiap jalan) | **selesai** 2026-10-05; R2 1 → 0; commit **belum dibuat** (berkas `mode-cepat.md` masih untracked — lihat catatan commit di laporan) |
| **D2** R4 tidak berlaku untuk `AGENTS.md` (disuntik, bukan dipilih); gantinya wajib **satu baris peran**; R4 berlaku untuk `KONTRAK.md`, `ANTREAN.md`, `PETA-KODE.md` | aturan gate v1.2 | **selesai** (gate menerapkan); pemenuhan aturan menyusul di B5 |
| **D3** R5 menghormati **daftar isi berjangkar**; plafon **tidak** dinaikkan | aturan gate v1.2 | **selesai** (gate menerapkan). Fakta: `docs/domain/publik.md` **tidak** punya TOC berjangkar (0 tautan `](#` di 682 baris) → tetap pelanggaran sampai **B8** menambahkan TOC |
| **R1** `docs/domain/keuangan.md:126–127` (2 baris angka test basi) | temuan gate yang nyata | **dibuka** — ditutup di **B5** |
| **R5** `docs/domain/publik.md` 48,7 KB tanpa TOC | temuan gate | **dibuka** — ditutup di **B8** dengan TOC berjangkar (bukan dipecah) |
| **Exception tertulis** `B2-daftar-pindah-arsip-legacy.md` 31,2 KB > plafon 16 KB | daftar kerja sementara (P8: biarkan sampai B8) | diterima sadar (plafon tidak dilemahkan); ditutup di **B8** saat jadi kartu arsip |
| **B2/B3 — aset besar di dalam repo** (`.docs-legacy/`, `.audit-map/`, keduanya diabaikan git) | sandbox agen tidak boleh menulis di luar workspace | **diterima owner 2026-10-05**; bebas dipindah keluar kapan saja |
| **B3 — regenerasi peta** belum dijalankan agen | generator memanggil `git rev-parse HEAD` via `child_process` pipa stdio → EPERM di sandbox | **diserahkan ke owner**: `node scripts/audit-map-generate.cjs`; isi peta sudah benar tautannya (4.013/4.013) |
| **B2 — commit campuran (kini dipisah)** | kesalahan agen: `git add -u -- docs` men-stage 7 berkas dokumentasi tertunda owner bersama alih rujukan | **selesai ditangani** 2026-10-05 atas instruksi owner: dipisah menjadi **`0f28e8d9`** (konten owner) + **`56e99f15`** (alih rujukan). Isi berkas owner **tidak disentuh** — 20 berkas dipantau SHA-256, 0 berubah. Commit lama (`59e04736`, `895aff79`, `4282ccf1`) tidak lagi di cabang; objeknya masih dapat diperiksa dengan `git show <sha>` sampai garbage collection |
| **4 sitasi ke berkas yang tidak ada** (`_DEPRECATED_05/06/08…`, `M13_CHANGELOG_ARSIP_S1_2026.md`) | ditemukan saat B2.2, **bukan** akibat B2 | dicatat di [draft penutup sitasi rusak](PENUTUP-SITASI-RUSAK.md) butir 1–4; dijadwalkan **B8** |
| **Baris `docs/archieve/` di `.git/info/exclude`** | P5, urutan pelaksanaan disetujui owner | **ditutup 2026-10-05** (`c1134387`): baris dihapus setelah arsip keluar; `git check-ignore docs/archieve/uji.md` **kosong** |
| **B4 — dua runbook diberi penanda, bukan dikonversi** (`go-live-cpanel.md`, `produksi.md`) | P16 menyebut konversi untuk "10 berkas lain"; dua itu dipakai manusia langkah demi langkah | **keputusan teknis agen**: penanda `<!-- kotak-non-otoritatif -->` menyelesaikan ambiguitas yang sama tanpa menghapus kotak yang dipakai; bisa dikonversi atas permintaan owner |
| **B4 — 5 rujukan historis** (`08_CHECKLIST`, `tenant-data-template.tsv`) | butir 5–7 [draft penutup sitasi rusak](PENUTUP-SITASI-RUSAK.md) | dibiarkan (catatan historis); butir 5–6 dijadwalkan bersamaan saat B5 menulis ulang berkasnya |

**Rumah arsip:** `docs/arsip/` siap (README + aturan + **11/11** inventaris — syarat Q19-v) dan kini juga memuat `legacy/`.

**Aturan antar-batch:** ragu → naikkan kehati-hatian, jangan turunkan. Setelah **B5**, buka **sesi baru** dan verifikasi sebelum B6
(B5 mengubah `AGENTS.md` yang disuntik tiap request; kesalahan di situ mencemari semua batch setelahnya).

---

## 5. Batas dan risiko

- **Sandbox:** menulis **di luar repo** tidak mungkin bagi agen (dibuktikan 2026-10-05) → aset besar ditaruh di `.docs-legacy/` dan `.audit-map/`, keduanya diabaikan git (keputusan owner).
- **76 berkas `docs/archieve/**` untracked** → tidak ada jaring git. Selalu dipindah, tidak pernah dihapus.
- **13 entri dirty** pada saat B0 (`main`): 9 dokumen (AUDIT, KEPUTUSAN-OWNER, STATUS, audit/README, domain/ai,
  history/changelog/2026-09, product/portal-owner-admin + 2 source) + 4 untracked. 9 berkas dokumen itu **tidak disentuh** oleh B0/B1;
  2 berkas source (`MyManualPage.tsx`, `CekPage.tsx`) di luar lingkup rombak sepenuhnya.
- **Tanpa commit ke `main`, tanpa push** sampai owner memerintahkan.

---

## 6. Daftar berkas yang diniatkan (record B0)

**Dibuat pada B0/B1:** `docs/rencana/RENCANA-ROMPAK-DOCS.md` · `docs/rencana/PERTANYAAN-ROMPAK.md` · `scripts/check-docs.mjs` · `docs/arsip/audit/gate-baseline-2026-10-05.md` ·
`.design-audit/docs-snapshot-2026-10-05/**` (snapshot, untracked).

**Dibuat pada batch berikutnya:** `docs/KONTRAK.md` · `docs/ANTREAN.md` · `docs/arsip/{audit,changelog,legacy,plans}/**` · `.audit-map/**`.

**Dipindah/dihapus pada batch berikutnya:** `docs/README.md` · `docs/STATUS.md` · `docs/M13_CHANGELOG.md` ·
`docs/arsip/audit-checklist-total.md` · `docs/archieve/**` · `.audit-map/**`.

**Tidak pernah disentuh rombak ini:** `frontend/src/pages/portal/MyManualPage.tsx` · `frontend/src/pages/public/CekPage.tsx` ·
`design/**` · `.design-audit/**` selain folder snapshot · seluruh `node_modules/**` · artefak build.

---

## 7. Nilai yang wajib selamat (Q31)

Daftar 12 nilai (uang · hunian/permission · keputusan owner · bukti audit · berkas berisiko · pemisahan status verifikasi · landasan IB · aturan arsip · larangan kredensial · berkas beku · deploy/rollback · audit trail) ada di [kartu keputusan](PERTANYAAN-ROMPAK.md) §4 — dirujuk di sini agar tidak ada dua daftar yang bisa menyimpang.

## 8. Ukuran keberhasilan (Q32)

**(a)** jalur wajib 50 berkas/1.037 KB → **≤12 berkas/≤150 KB** · **(b)** kotak otoritatif hanya di `docs/ANTREAN.md` · **(c)** 0 dokumen usang di folder aktif · **(d)** gate bisa gagal **dan pernah terbukti gagal** (baseline B1) · **(e)** baseline tersimpan sebagai berkas · **(f)** uji nyata Q30 dijalankan di B8. Rincian di [kartu keputusan](PERTANYAAN-ROMPAK.md) §4.

---

## 9. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-05 | Dibuat dari keputusan owner Q1–Q32 + O1–O7. Menggantikan kebijakan `ARSIP-BATAS` dan target 7-berkas. B0–B1 dikerjakan; berhenti di checkpoint untuk persetujuan lanjut. |
| 2026-10-05 | **B0 selesai:** branch `docs-rombak` + snapshot `.design-audit/docs-snapshot-2026-10-05/` (1.302 berkas, 9,0 MB); 9 berkas kawalan terbukti 0 berubah (SHA-256). **B1 selesai:** `scripts/check-docs.mjs` v1.1; baseline **23 pelanggaran + 1 dilewati (exit 2)** tersimpan di `docs/arsip/audit/gate-baseline-2026-10-05.md`. Dua koreksi v1.0→v1.1 (sumber versi kanonik; kartu bukti audit/history) dan satu cacat R3 dibetulkan agar gate tidak lulus sambil tidak memeriksa. |
| 2026-10-05 | **D1–D3 (keputusan owner) diterapkan:** D1 tautan `mode-cepat.md` diperbaiki (R2 1 → 0); D2 `AGENTS.md` dikecualikan dari R4 dan diganti kewajiban **baris peran**; D3 R5 menghormati daftar isi berjangkar, plafon tidak dinaikkan. Gate → **v1.2**, **22 pelanggaran + 1 dilewati**. Ledger di §4.1. |
| 2026-10-05 | **Commit artefak B0–B1 `22f8d408`** (plan + gate + baseline; fix D1 sengaja tidak ikut) dan **commit kebijakan line ending `f8fbff7d`** (`.gitattributes` + appendix baseline). Tanpa push. **B2 recon** menghasilkan `docs/rencana/B2-daftar-pindah-arsip-legacy.md` (A 35 · B 5 · C 66); belum ada berkas dipindahkan. |
