# RENCANA ROMPAK DOKUMENTASI — kontrak batch

> **Blok baca** · Jenis: **kontrak rencana** · Status: **aktif (B0–B1 dikerjakan 2026-10-05)** · Untuk siapa: owner + agen AI pelaksana
> · Baca kalau: akan menjalankan atau menilai batch rombak dokumentasi. · **Jangan** dibaca kalau: sedang mengerjakan task produk biasa.

Dokumen ini **mengikat urutan batch**. Ia dibuat atas keputusan owner 2026-10-05 (Q1–Q32 + O1–O7) dan menggantikan
kebijakan `ARSIP-BATAS` (24 Sep 2026) serta target "7 berkas utama + 1 arsip" pada `STATUS.md` §8 — keduanya dibuka ulang secara sadar.

---

## 1. Diagnosis terukur (dasar keputusan, diukur 2026-10-05, HEAD `951f0c95`)

| Ukuran | Angka |
|---|---:|
| `docs/**` (semua) | 1.291 berkas `.md` · 7,3 MB · ≈1,87 juta token (proksi `byte/4`) |
| `docs/audit-map/` | 1.123 berkas · 4,0 MB — generated, **untracked**, `.gitignore` L89 |
| `docs/archieve/` (ejaan legacy) | 106 berkas · 1,46 MB — **31 tracked**, 76 untracked (`.git/info/exclude`) |
| `docs/arsip/` | 12 berkas · 490 KB |
| `docs/history/` | 5 berkas · 355 KB — `changelog/2026-09.md` sendiri **303 KB / 785 baris** |
| **Jalur baca "panas"** (root + 8 berkas `docs/` + domain + operations + product + audit) | **50 berkas · 1.037 KB · ≈265 rb token** |
| Berkas `.md` tracked | 97 |
| Kotak terbuka | **1.447 `[ ]` di `docs/**`** vs invariant `STATUS.md` §7 yang menyatakan **29** |
| Tautan markdown di `docs/**` | 5.405 · referensi `audit-map` 219 · referensi `archieve` 181 di 28 berkas aktif |

**Temuan yang mengubah dua keputusan (Q9, Q26):** baris **bukan** proksi biaya yang sah.
`docs/STATUS.md` hanya **147 baris** tetapi **78,4 KB** (533 byte/baris); `docs/audit/audit-checklist-total.md`
**236 baris / 110,1 KB**. Ambang berbasis baris akan meloloskan justru dokumen termahal. Karena itu ukuran yang mengikat = **byte**.

**Temuan kedua:** `AGENTS.md` disuntikkan harness sebagai workspace instructions **setiap request**. Menambah isinya
bukan ongkos sekali baca, melainkan pajak per-putaran. Karena itu plafonnya lebih ketat daripada berkas lain.

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
`docs/audit/audit-checklist-total.md` (→ arsip + indeks kecil).

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
| **B2** | Recon sitasi `docs/archieve/**`; yang dikutip → `docs/arsip/legacy/`; `archieve` dihapus/dikeluarkan; 181 tautan dialihkan | 0 baris hilang; 0 tautan patah baru; `archieve` tidak lagi disebut berkas aktif | revert commit batch |
| **B3** | `audit-map` → `.audit-map/`; generator + `.gitignore` L89 + 219 referensi | `node .audit-map/generate.cjs` jalan; gate tautan hijau | revert commit batch |
| **B4** | Checklist audit → arsip + indeks kecil; derajat 1.447 kotak diturunkan; backlog 10 teratas ke ANTREAN | R3 hijau (kotak otoritatif hanya di ANTREAN) | revert commit batch |
| **B5** | Pisah otoritas: `AGENTS.md` ramping + `docs/KONTRAK.md` + `docs/ANTREAN.md`; bukti → riwayat; `docs/README.md` dihapus | Gate hijau; jalur wajib ≤12 berkas / ≤150 KB | revert commit batch |
| **B6** | Rotasi changelog: bulan berjalan = 30 hari terakhir; `M13_CHANGELOG.md` digabung | Gate hijau | revert commit batch |
| **B7** | `KEPUTUSAN-OWNER` dipecah: berlaku sekarang vs digantikan (arsip) | Gate hijau; berkas hidup ≤16 KB | revert commit batch |
| **B8** | Sapu akhir: berkas di atas plafon byte, blok baca, **uji nyata Q30** (sesi baru + 1 tugas, ukur berkas+byte yang dibaca) | Laporan akhir + angka sebelum/sesudah | revert commit batch |

**Status batch (2026-10-05):** **B0 ✅** · **B1 ✅** — baseline gate **v1.1**: **23 pelanggaran + 1 dilewati, exit 2**
(R1 2 · R2 1 · R3 12 berkas/368 kotak · R4 4 · R5 4). Bukti: `docs/arsip/audit/gate-baseline-2026-10-05.md`.
Setelah D1–D3 (lihat §4.1): gate **v1.2** = **22 pelanggaran + 1 dilewati** (R1 2 · R2 **0** · R3 12 · R4 4 · R5 4).

**Kebijakan line ending ✅** (2026-10-05, sebelum B2): `.gitattributes` ditambahkan (`* text=auto eol=lf`; skrip Windows CRLF; biner tidak disentuh).
Fakta yang menghemat satu langkah: isi index sudah LF seluruhnya — **1.109 `i/lf`, 0 `i/crlf`, 0 `i/mixed`** — sehingga **tidak perlu** commit normalisasi;
146 `w/crlf` + 48 `w/mixed` hanyalah artefak checkout Windows.

**B2 recon ✅** (2026-10-05): 106 berkas `docs/archieve/**` dipetakan — **kelas A 35** (dikutip lewat path) · **kelas B 5** (hanya namanya muncul) · **kelas C 66** (tidak dikutip).
Daftar pindah + perintah siap-jalan: `docs/rencana/B2-daftar-pindah-arsip-legacy.md`. **Eksekusi B2 belum dijalankan** — menunggu persetujuan owner.
Temuan yang perlu dibaca sebelum memindahkan: berkas kelas A dikutip **oleh `docs/domain/flow.md`, `docs/domain/kontrak.md`, dan `docs/PETA-KODE.md`** sebagai rujukan eksplisit,
jadi pemindahan menuntut alih ~181 kemunculan `archieve` di 28 berkas aktif — dan beberapa di antaranya mungkin lebih tepat **diserap** ke dokumen aktif daripada sekadar diarsipkan.

B2 eksekusi–B8 **belum**; menunggu perintah.

### 4.1 Ledger perbaikan di luar batch

| Item | Sifat | Status |
|---|---|---|
| **D1** tautan `docs/product/mode-cepat.md` → `../../design/alur-semua-halaman.html` | 1 baris, di luar batch (gate sudah mendeteksinya; dibiarkan akan jadi noise tiap jalan) | **selesai** 2026-10-05; R2 1 → 0; commit **belum dibuat** (berkas `mode-cepat.md` masih untracked — lihat catatan commit di laporan) |
| **D2** R4 tidak berlaku untuk `AGENTS.md` (disuntik, bukan dipilih); gantinya wajib **satu baris peran**; R4 berlaku untuk `KONTRAK.md`, `ANTREAN.md`, `PETA-KODE.md` | aturan gate v1.2 | **selesai** (gate menerapkan); pemenuhan aturan menyusul di B5 |
| **D3** R5 menghormati **daftar isi berjangkar**; plafon **tidak** dinaikkan | aturan gate v1.2 | **selesai** (gate menerapkan). Fakta: `docs/domain/publik.md` **tidak** punya TOC berjangkar (0 tautan `](#` di 682 baris) → tetap pelanggaran sampai **B8** menambahkan TOC |
| **R1** `docs/domain/keuangan.md:126–127` (2 baris angka test basi) | temuan gate yang nyata | **dibuka** — ditutup di **B5** |
| **R5** `docs/domain/publik.md` 48,7 KB tanpa TOC | temuan gate | **dibuka** — ditutup di **B8** dengan TOC berjangkar (bukan dipecah) |
| **Exception tertulis** `docs/rencana/B2-daftar-pindah-arsip-legacy.md` 31,2 KB > plafon berkas kerja batch 16 KB | daftar kerja sementara (keputusan **P8**: biarkan sampai B8) | **diterima sadar** — gate **tetap** melaporkannya sebagai pelanggaran (plafon tidak dilemahkan, sesuai D3); ditutup di **B8** ketika berkasnya jadi kartu arsip ber-banner tanpa blok perintah. Sejak gate v1.3, R5 mencakup `docs/rencana/**`. |

**Kesiapan rumah arsip (diverifikasi 2026-10-05):** `docs/arsip/` **siap** menjadi rumah final — punya `README.md` dengan
aturan + inventaris, dan **11 dari 11** berkas isinya terdaftar di README (syarat Q19-v). B2 karena itu tidak perlu
menyiapkan rumahnya, hanya memverifikasi **sitasi** dan menyiapkan daftar pindah.

**Aturan antar-batch:** ragu → naikkan kehati-hatian, jangan turunkan. Setelah **B5**, buka **sesi baru** dan verifikasi sebelum B6
(B5 mengubah `AGENTS.md` yang disuntik tiap request; kesalahan di situ mencemari semua batch setelahnya).

---

## 5. Batas dan risiko

- **Sandbox sesi `workspace-write`:** memindahkan berkas **ke luar repo** (bagian dari B2) tidak bisa dilakukan agen. Owner mengeksekusi
  daftar perintah yang disiapkan; agen tidak meminta eskalasi untuk hal yang bisa dijalankan owner.
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
`docs/audit/audit-checklist-total.md` · `docs/archieve/**` · `docs/audit-map/**`.

**Tidak pernah disentuh rombak ini:** `frontend/src/pages/portal/MyManualPage.tsx` · `frontend/src/pages/public/CekPage.tsx` ·
`design/**` · `.design-audit/**` selain folder snapshot · seluruh `node_modules/**` · artefak build.

---

## 7. Nilai yang wajib selamat (Q31)

1. Invariant uang & jurnal + gate `backend npm run test:unit` (hook `pretest:unit`) dan gate M04.
2. Permission/role & status hunian.
3. Keputusan bisnis owner yang masih berlaku.
4. Bukti audit bertanggal + batas keberlakuannya.
5. Larangan menyentuh berkas/simbol berisiko tanpa izin.
6. Pemisahan implementasi lokal vs verifikasi lokal vs deployment vs dampak runtime.
7. Landasan bisnis IB Diploma (`docs/product/arah-produk.md`).
8. Aturan arsip "jangan dibaca rutin".
9. Larangan menaruh kredensial/rahasia di dokumen.
10. Daftar berkas/simbol berisiko yang tidak boleh disentuh tanpa izin.
11. Alur deploy/rollback operasional.
12. Audit trail: setiap keputusan punya tanggal + bukti yang bisa dijalankan.

## 8. Ukuran keberhasilan (Q32)

| # | Ukuran | Target |
|---|---|---|
| a | Jalur baca wajib | dari **50 berkas/1.037 KB** → **≤12 berkas/≤150 KB** |
| b | Kotak `[ ]` otoritatif | hanya di `docs/ANTREAN.md` |
| c | Dokumen usang di folder aktif | **0** (punya banner atau sudah pindah) |
| d | Gate dokumen | bisa gagal, **dan pernah dibuktikan gagal** (baseline B1 tersimpan) |
| e | Baseline B1 | tersimpan sebagai `docs/arsip/audit/gate-baseline-2026-10-05.md` |
| f | Uji nyata Q30 | dijalankan di B8 (sesi baru + 1 tugas, ukur berkas+byte dibaca), bukan dijanjikan |

---

## 9. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-05 | Dibuat dari keputusan owner Q1–Q32 + O1–O7. Menggantikan kebijakan `ARSIP-BATAS` dan target 7-berkas. B0–B1 dikerjakan; berhenti di checkpoint untuk persetujuan lanjut. |
| 2026-10-05 | **B0 selesai:** branch `docs-rombak` + snapshot `.design-audit/docs-snapshot-2026-10-05/` (1.302 berkas, 9,0 MB); 9 berkas kawalan terbukti 0 berubah (SHA-256). **B1 selesai:** `scripts/check-docs.mjs` v1.1; baseline **23 pelanggaran + 1 dilewati (exit 2)** tersimpan di `docs/arsip/audit/gate-baseline-2026-10-05.md`. Dua koreksi v1.0→v1.1 (sumber versi kanonik; kartu bukti audit/history) dan satu cacat R3 dibetulkan agar gate tidak lulus sambil tidak memeriksa. |
| 2026-10-05 | **D1–D3 (keputusan owner) diterapkan:** D1 tautan `mode-cepat.md` diperbaiki (R2 1 → 0); D2 `AGENTS.md` dikecualikan dari R4 dan diganti kewajiban **baris peran**; D3 R5 menghormati daftar isi berjangkar, plafon tidak dinaikkan. Gate → **v1.2**, **22 pelanggaran + 1 dilewati**. Ledger di §4.1. |
| 2026-10-05 | **Commit artefak B0–B1 `22f8d408`** (plan + gate + baseline; fix D1 sengaja tidak ikut) dan **commit kebijakan line ending `f8fbff7d`** (`.gitattributes` + appendix baseline). Tanpa push. **B2 recon** menghasilkan `docs/rencana/B2-daftar-pindah-arsip-legacy.md` (A 35 · B 5 · C 66); belum ada berkas dipindahkan. |
