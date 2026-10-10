# Default & Seed DEV

> Migrasi dari docs/M08_DEPLOY_GO_LIVE.md + docs/M11_DEFAULT_DATA.md (M11 §1a, M11 §1b, M08 Bagian 3, M11 §9) pada f8f9a589 (DOC-GOV-20260922 Tahap 3); §1b dan catatan batch B9 ditambahkan 23 September 2026.
> Sumber asli (`docs/operations/data-master.md`) sudah dihapus di Fase 3 (23 Sep 2026); perintah seed untuk lingkungan PRODUKSI ada di [Produksi & Operasional Harian](produksi.md).
> **Batas lingkungan:** seluruh isi DEV di file ini memakai basis data pengembangan **port 5433**; kredensial DEV tidak pernah berlaku untuk UAT/produksi.
> Sumber asli dipertahankan sebagai pointer.
> **Status:** aktif — dokumentasi DEV; nilai kredensial DEV terdaftar **di sini** (satu rumah). **DEV only**, jangan dipakai di produksi.

### 1a. Akun Fondasi seed-dev (khusus database pengembangan port 5433)

| Role  | Email                  | Password    | Keterangan                        |
|-------|------------------------|-------------|-----------------------------------|
| OWNER | `owner@kost48.com`     | `Owner#2026`| Dibuat via `seed-dev-reset.js` (DEV) / `golive-setup.js` (produksi, password beda via env) |
| ADMIN | `admin@kost48.com`     | `admin123`  | **DEV only** (seed-dev); produksi buat manual |
| STAFF | `staff@kost48.com`     | `staff123`  | **DEV only** (seed-dev); produksi buat manual |

> Kredensial di atas adalah fondasi **DEV** dan TIDAK boleh dipakai sebagai kredensial audit UAT/produksi.

## Bagian 3 - `docs/arsip/legacy/2026-06-16_si_notes/_AKUN_DUMMY_DEV.md`

> DEV ONLY: akun dan data di bagian ini hanya untuk database pengembangan port 5433. Jangan pakai password ini di produksi.
>
> **Penting (AO-03, diperbarui 2026-09-08):** akun dummy di bawah adalah fondasi **DEV**.
> `backend/scripts/seed-audit-users.js` (`npm run seed:audit-users`) tersedia,
> tetapi gap target/fixture/pagination/gate sukses belum ditutup. OWNER existing
> dipakai login; skrip dapat membuat ADMIN/STAFF, dua portal TENANT dan satu tenant
> dummy. Baca §1b di file ini (kanonik).
> dan [M14 AO-03](../arsip/audit-uiux-lintas-portal-2026-07.md#ao-03--p1--kredensial-dan-data-uat-tidak-mendukung-audit-lintas-role)
> sebelum eksekusi. Provisioning serta sesi login crawl memutasi DB UAT dan
> memerlukan lingkup izin terkait. `AUDIT_CONFIRM=1` tidak memvalidasi lingkungan.
> Password dari environment proses/secret manager; kredensial DEV bukan kredensial UAT.

### 1b. Akun Audit UAT Non-Personal (AO-03) — password TIDAK ditulis di docs

Target AO-03 adalah lima persona audit (OWNER, ADMIN, STAFF, TENANT dengan stay
aktif, TENANT tanpa stay aktif) pada UAT non-produksi yang telah diverifikasi.
**Status 8 Sep 2026: skrip tersedia, akun/fixture belum dibuktikan siap.**
Password berasal dari **environment proses/secret manager**, bukan docs/test.
`frontend/.env.example` adalah contoh nama variabel; config Playwright saat ini
tidak otomatis memuat `.env.local`.

- Skrip `backend/scripts/seed-audit-users.js` (alias `npm run seed:audit-users`
  dari backend) memakai OWNER existing untuk login; membuat ADMIN/STAFF bila
  belum ada, hingga dua portal TENANT, dan fallback satu tenant dummy tanpa stay.
  Tidak membuat stay/invoice/payment atau mengganti password/role akun lama.
- Pemilihan tenant existing masih otomatis dan inventaris pagination belum
  lengkap; ringkasan selesai dapat memuat kegagalan parsial. `AUDIT_CONFIRM=1`
  hanya flag, bukan verifikasi server/DB. Tetapkan identitas audit unik dan
  tenant fixture non-personal secara eksplisit sebelum provisioning.
- **Provisioning memutasi DB; login crawl juga memperbarui `lastLoginAt` dan
  membuat `RefreshToken`.** Lingkup izin UAT harus mencakup akun/portal serta sesi
  autentikasi. Rincian gap/prasyarat: [M14 AO-03](../arsip/audit-uiux-lintas-portal-2026-07.md#ao-03--p1--kredensial-dan-data-uat-tidak-mendukung-audit-lintas-role).
- Konsumsi crawler: `frontend/e2e/audit-users.ts` (env `E2E_OWNER_*`,
  `E2E_ADMIN_*`, `E2E_STAFF_*`, `E2E_TENANT_ACTIVE_*`, `E2E_TENANT_NO_STAY_*`).
  Dua state TENANT baru dideklarasikan sebagai env, belum menjadi crawl UAT nyata
  di suite aktif. Kredensial kosong membuat crawl operasional di-skip.
- Empat status tetap dibedakan: implementasi lokal (mekanisme tersedia) ≠ akun
  benar-benar di-provision ≠ crawl lulus ≠ dampak terukur. Bukti tiga crawl
  operasional wajib mencatat eksekusi tanpa skip dan role/route yang benar.

### Akun Dummy DEV (login cepat) - SI-1 event-path

Data dummy **wajib dibuat lewat endpoint nyata (HTTP)**, bukan raw insert. Ini keputusan owner 2026-06-16: dummy harus melewati kejadian bisnis asli agar aturan service, invoice, deposit, meter, jurnal, dan audit trail ikut berjalan.

Login di `http://localhost:5173/login` (field `identifier` = email).

#### Cara isi ulang (wipe + reseed)

```bash
cd backend
node scripts/seed-dev-reset.js
# restart backend dev: npm run start:dev
node scripts/seed-dev-via-api.js
```

Alternatif npm:

```bash
npm run seed:dev:reset
npm run seed:dev:api
```

Seeder raw/bypass lama **usang** untuk data bisnis karena melewati aturan service. Jangan dipakai sebagai sumber data demo aktif.

#### Back-office

| Role | Email | Password |
|------|-------|----------|
| OWNER | `owner@kost48.com` | `Owner#2026` |
| ADMIN | `admin@kost48.com` | `admin123` |
| STAFF | `staff@kost48.com` | `staff123` |

#### Penghuni (TENANT)

Password semua tenant: `Tenant#2026`.

| Kamar | Nama | Email |
|-------|------|-------|
| K-A | Maya Pratiwi | `maya.tenant@kost48.test` |
| K-B | Dimas Saputra | `dimas.tenant@kost48.test` |
| K-C | Cindy Wijaya | `cindy.tenant@kost48.test` |
| K-D | Hendra Gunawan | `hendra.tenant@kost48.test` |
| K-E | Gita Lestari | `gita.tenant@kost48.test` |
| K-F | Indah Permata | `indah.tenant@kost48.test` |
| K-G | Bayu Nugroho | `bayu.tenant@kost48.test` |
| K-H | Karin Salsabila | `karin.tenant@kost48.test` |
| K-I | Lani Kusuma | `lani.tenant@kost48.test` |
| K-J | Rizky Ramadhan | `rizky.tenant@kost48.test` |
| K-K | Putri Anggraini | `putri.tenant@kost48.test` |
| K-L | Fajar Maulana | `fajar.tenant@kost48.test` |
| K-M | Sari Melati | `sari.tenant@kost48.test` |
| K-N | Andi Wirawan | `andi.tenant@kost48.test` |
| K-O | Nadia Safitri | `nadia.tenant@kost48.test` |
| K-P | Eko Prasetyo | `eko.tenant@kost48.test` |

Kamar `K-Q` sampai `K-T` tersedia untuk uji booking/check-in.

#### Isi data terverifikasi

- 20 kamar: 16 terisi, 4 kosong.
- 16 penghuni dan 16 stay ACTIVE promoted.
- 19 invoice: 16 sewa + 3 meter listrik; 12 PAID, 7 ISSUED.
- 16 deposit HELD Rp500.000/kamar, terjurnal.
- Trial balance seimbang dan tidak ada dobel-tagih.

---

## 9. Ringkasan Perintah Seed

```bash
# DEV — Reset + seed ulang dari nol:
cd backend
npm run seed:dev:reset     # Bersihkan DB + buat kamar + akun internal
# (pastikan backend dev sudah jalan: npm run start:dev)
npm run seed:dev:api       # Buat tenant + stay + invoice + bayar + tiket + survei

# FAQ (idempoten — aman diulang):
# POST http://localhost:3000/api/faqs/seed  (perlu login OWNER)

# PRODUKSI — input data tenant real (nama, NIK, kamar, tarif):
# 1. Pastikan DB fresh & kamar sudah terbuat (via golive-setup atau seed:dev:reset)
# 2. Jalankan seed-prod:
node scripts/seed-prod.js
# 3. Email/HP/occupation tenant → input via UI Owner → Manajemen Tenant
# 4. Deposit → atur via UI Owner
```

---

## 10. Referensi command kerja (dipindah dari KONTRAK §5)

Semua perintah di bawah **sudah terbukti jalan di mesin ini**. Daftar ini **bukan izin otomatis** — izinnya datang dari task (lihat [KONTRAK](../KONTRAK.md) §5 dan gate G0). Pakai cwd yang tertulis; jangan menjalankan dari akar bila cwd disebut.

| Cwd | Tujuan bila diperlukan & diizinkan | Command |
|---|---|---|
| backend | Typecheck tanpa cache | `npx tsc --noEmit --incremental false` |
| backend | Build / unit lengkap sesuai gate | `npm run build` / `npm run test:unit` |
| frontend | Build / test terpilih | `npm run build` / `npm run test -- <path>` |
| frontend | Suite unit lengkap bila diizinkan | `npx vitest run` |
| backend/frontend | Dev bila task membutuhkan | `npm run start:dev` / `npm run dev` |
| root | Gate dokumen (wajib untuk batch dokumentasi) | `node scripts/check-docs.mjs` |
| root | Kartu kekuatan dokumentasi (bukan gate, boleh gagal) | `node scripts/ukur-kekuatan-docs.mjs` |
| root | Kartu kesegaran isi docs (bukan gate; exit 3 = menolak mengukur saat `git` tak ada / repo shallow) | `node scripts/ukur-kesegaran-docs.mjs` |
| root | Artefak deploy lokal bila diminta | `npm run bundle:deploy:fast` / `npm run make-deploy:fast` |

Catatan yang mengikat: `pretest:unit` backend menjalankan `npm run build` (lihat [KONTRAK](../KONTRAK.md) §5 — exception uang).

### 10a. Jebakan mesin-dev yang sudah terbukti (jangan diulang)

Jebakan **produksi** punya rumah sendiri di [produksi §10](produksi.md) — **jangan diduplikasi di sini**, cukup ditunjuk. Daftar ini tumbuh dari kejadian nyata dan setiap baris menyebut buktinya; mengisinya dengan karangan akan merusak gunanya.

| Gejala | Sebab | Tindakan |
|---|---|---|
| Dokumen tampak berubah (`git status` → ` M`) padahal isinya tidak | berkas ditulis dengan CRLF padahal [.gitattributes](../../.gitattributes) mewajibkan `* text=auto eol=lf`; `scripts/tambah-toc.mjs` menulis CRLF sampai diperbaiki 2026-10-07 | **114 berkas sudah dinormalkan 2026-10-07** (keputusan owner). Diagnosis `git ls-files --eol <berkas>` — `w/crlf` berarti ini penyebabnya; jangan commit "perubahan" itu. Pengecualian yang **benar**: `*.ps1/*.bat/*.cmd` memang CRLF |
| Setelah menormalkan line ending, `git status` melaporkan banyak ` M` **hantu** (isinya identik dengan index) | stat-cache index basi: ukuran/mtime berubah, tetapi kontennya sama | buktikan dulu kontennya sama: `git hash-object --no-filters -- <berkas>` == `git rev-parse :<berkas>` dan `git diff-files -p -- <berkas>` kosong. Obatnya **satu berkas per perintah**: `git update-index --refresh -- <berkas>` (tanpa pathspec ia keluar 1 dan **tidak menulis** index; `git add --refresh -- .` pun tidak cukup). Tidak ada konten yang di-stage (`git diff --cached` tetap 0) |
| Huruf hilang setelah teks disusun lewat PowerShell (mis. `branch backup…` menjadi `ackup…`) | backtick adalah karakter escape PowerShell: `` `b `` menjadi **backspace (0x08)** | jangan menyusun teks repo di dalam string PowerShell; sisir dengan `[System.IO.File]::ReadAllBytes`. Kejadian nyata: `docs/history/changelog/2026-10.md` (1 byte 0x08), ditemukan & diperbaiki 2026-10-07 |
| Teks non-ASCII tampak rusak (`â€”`) di terminal | jalur keluaran konsol bisa mendekode UTF-8 dengan cara lain — berkasnya **belum tentu** cacat | verifikasi byte lebih dulu (`[System.IO.File]::ReadAllText` / daftar byte). Perhatian: beberapa dokumen **sengaja mengutip** pola mojibake (tabel inversi B12 di [bukti-2026-10](../history/bukti-2026-10.md) dan [mapping arsip](../arsip/DOC-GOV-20260922-mapping.md)) — **jangan "perbaiki"** |
| Skrip Node gagal `EPERM` saat memanggil `git` atau program lain | sandbox menolak **pipa stdio** `child_process` (pipeline PowerShell sendiri tidak terpengaruh) | alihkan keluaran anak ke berkas sementara tanpa pipa — contoh yang sudah jalan: `scripts/ukur-kesegaran-docs.mjs` |
| Baris ukuran KB di indeks folder jadi basi setelah dokumen disunting | indeks dihasilkan dari berkas; tanpa `--segarkan` skrip **tidak menimpa** indeks yang sudah ada | `node scripts/buat-indeks-folder.mjs --segarkan` |
| `git diff --check` melaporkan pelanggaran yang bukan bagian diff Anda | pohon kerja memuat perubahan belum-commit dari sesi lain | scope dulu: `git diff --check -- <berkas Anda>` |
| Angka "% segar" tinggi padahal belum ada manusia yang memeriksa isinya | batch dokumentasi menyentuh banyak dokumen sekaligus, sehingga `t_doc` nyaris seragam dan angka itu mengukur **urutan commit** | baca blok batas pada keluaran `node scripts/ukur-kesegaran-docs.mjs`; kartu ini bukan bukti isi benar |
| **Kartu kekuatan tiba-tiba GAGAL di pemeriksaan M** padahal batch Anda hanya menambah beberapa baris | ratchet baris dokumen aktif: total baris tidak boleh naik dari `scripts/docs-lines.baseline.json` | itu **bukan** kegagalan palsu — putuskan sadar: pindahkan isi ke arsip, atau naikkan `total_baris` di berkas baseline **beserta `alasan`** pada commit yang sama (angka baseline = data, bukan dokumen, jadi aturan "angka volatil" tidak dilanggar) |
| Self-test gate melaporkan "terdeteksi=false" pada aturan yang jelas-jelas Anda langgar | teks mutasi uji sendiri memuat frasa yang sedang dicari aturan itu (mis. menulis "tanpa blok baca" di dalam uji R4) | tulis mutasi **tanpa** frasa yang dicari; jalankan `node scripts/check-docs.selftest.mjs` — self-test wajib LULUS sebelum gate dianggap dipercaya |
| Transformasi teks massal atas dokumen bernilai tinggi **merusak tanpa terlihat** | **Empat kerusakan nyata** pada 2026-10-09 (konversi rujukan nomor baris), semuanya ketahuan **hanya karena ada pengukuran sebelum/sesudah**: (1) `\s{2,}` di JS memuat **newline** → `docs/domain/flow.md` 508→305 baris (baris tabel tergabung); (2) rentang memakai **en dash** (U+2013) → `prisma.service.ts:18–22` menyisakan `prisma.service.ts–22`; (3) aturan `\| \|`→`\|` menghapus **kolom kosong tabel**; (4) pola longgar `:[ \t]*\d+` + aturan pagar kode menghapus **nama simbol di dalam backtick** dan 3 pagar kode JSON | **Prosedur wajib bila transformasi menyentuh ≥10 berkas:** (a) `git archive HEAD` sebagai byte pembanding; (b) penjaga struktur di skrip — jumlah **baris** dan **baris tabel** harus identik, skrip **menolak menulis** bila berbeda; (c) uji **dua arah** — setiap baris baru harus = baris lama dikurangi pola yang dinyatakan, dan setiap teks yang dibuang harus cocok pola itu (**0 pengecualian**); (d) uji terpisah untuk yang **tidak boleh** hilang: jam (`12:00`), pagar kode, backtick kosong, kolom tabel kosong; (e) **jangan** pakai `\s` untuk merapikan teks — pakai `[ \t]` saja; (f) batasi ke bentuk yang benar-benar terbukti, sisanya **dilaporkan**, bukan ditebak. Kalau satu pun tidak bisa dipenuhi: **jangan jalankan** — sisa rujukan nomor baris jauh lebih murah daripada dokumen aturan yang rusak senyap |

---

## 11. Verifikasi dan Confidence Gate (dipindah utuh dari `docs/KONTRAK.md` §5, 2026-10-07)

> **Isi tidak diubah.** Aturan ini dulu ada di KONTRAK §5; ia dipindahkan ke rumah teknisnya karena KONTRAK menyentuh plafon 16 KB (preseden sama: tabel perintah §10 di atas). Ringkasannya tetap di [AGENTS §7](../../AGENTS.md); tempat ini yang **rinci**.

| Gate | Pemeriksaan sebelum melanjutkan |
|---|---|
| G0 — Otorisasi | Task mengizinkan command; larangan eksplisit berlaku |
| G1 — Dampak | Acceptance, kontrak, dan konsumen yang berubah diketahui |
| G2 — Relevansi | Test membuktikan perilaku itu; fixture/layanan dipahami |
| G3 — Biaya | Hook pre/post, build, generate, install, efek samping diketahui |
| G4 — Kesegaran | Source/artefak yang diuji sesuai perubahan saat ini |
| G5 — Stop | Hasil lengkap; bila test dijalankan, jumlah test terpilih > 0; acceptance terpenuhi |

- **Docs-only (XS)**: inspeksi isi, ejaan, tautan, scope, diff — jangan test/build/lint/typecheck atau menyalakan server.
- S/M: test berkas/modul terkait; tambah regresi hanya bila membuktikan bug perilaku.
- L: test kedua sisi kontrak; build hanya entry/package terkait yang tersedia dan diizinkan.
- Test kosong, artefak basi, atau hasil tidak lengkap **bukan** PASS. Typecheck ≠ build; build ≠ UAT; artefak ≠ deployment; test lokal ≠ dampak runtime.
- Baca lifecycle script sebelum memanggilnya: `pretest:unit` backend menjalankan `npm run build`.
- **KNOWN EXCEPTION — gate uang (opsi C, TUNDA)**: task yang menyentuh uang tetap wajib `npm run test:unit` backend (memicu full build lewat `pretest:unit`). Jangan menghapus/mengubah hook atau menggantinya dengan subset sepihak. Bila task uang melarang full test/build, catat konflik dan minta keputusan owner.
- Exception uang **tidak** memerintahkan test/build untuk task dokumentasi.

Referensi command ada di §10 berkas ini (cwd, tujuan, dan perintah yang sudah terbukti jalan di mesin ini). Daftar itu **bukan izin otomatis**, dan cwd yang tertulis di sana wajib dipakai.

---

*Diperbarui: 2026-10-07 (§10 daftar perintah + §10a jebakan mesin-dev + §11 gate verifikasi) · Sumber: owner KOST48 (data tenant real) + kost48surabaya.com + faqs.service.ts*

---