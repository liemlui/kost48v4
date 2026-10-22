# Default, Seed & Data Master

> Migrasi dari docs/M08_DEPLOY_GO_LIVE.md + docs/M11_DEFAULT_DATA.md (M11 §1a, M11 §1b, M08 Bagian 3, M11 §9) pada f8f9a589 (DOC-GOV-20260922 Tahap 3); §1b dan catatan batch B9 ditambahkan 23 September 2026.
> Sumber asli (`docs/operations/default-dev.md`) masih ada dan tetap ter-tracked — **koreksi 2026-10-10**: klaim lama “sudah dihapus di Fase 3 (23 Sep 2026)” tidak cocok dengan riwayat git (`git log --diff-filter=D` kosong); perintah seed untuk lingkungan PRODUKSI ada di [Produksi & Operasional Harian](produksi.md).
> **Batas lingkungan:** seluruh isi DEV di file ini memakai basis data pengembangan **port 5433**; kredensial DEV tidak pernah berlaku untuk UAT/produksi.
> Sumber asli dipertahankan sebagai pointer.
> **Status:** aktif — dokumentasi DEV; nilai kredensial DEV terdaftar **di sini** (satu rumah). **DEV only**, jangan dipakai di produksi.

## Daftar isi

- [§10 Referensi command kerja](#d4b-gate-10)
- [§11 Verifikasi dan Confidence Gate](#d4b-gate-11)
- [§12 Otoritas keputusan & ekonomi verifikasi](#d4b-gate-12)
- [§13 Register aturan normatif](#d4b-register)
- [Bagian G — Data master & nilai default](#d4b-data-master)


### 1a. Akun Fondasi seed-dev (khusus database pengembangan port 5433)

| Role  | Email                  | Password    | Keterangan                        |
|-------|------------------------|-------------|-----------------------------------|
| OWNER | `owner@kost48.com`     | `Owner#2026`| Dibuat via `seed-dev-reset.js` (DEV) / `seed-owner.js` (produksi, kredensial lewat env `OWNER_EMAIL`/`OWNER_PASSWORD`/`OWNER_FULLNAME` — `npm run seed:owner`) |
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

<a id="d4b-gate-10"></a>
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

> **Aturan owner (10 Okt 2026):** setiap kesalahan yang **terulang** wajib punya entri di tabel ini **pada sesi yang sama** — gejala · sebab · tindakan pencegah — supaya tidak pernah ada kesalahan ketiga. Aturan ini sendiri muncul karena satu kelas kesalahan terjadi **lima kali dalam satu sesi** (lihat baris "Isi dokumen **terpotong atau menempel**" di tabel di bawah). **Versi portabel (18 Okt 2026):** katalog ini juga hidup sebagai **skill DSH `dsh-jebakan-kerja`** (`~/.dsh/skills/dsh-jebakan-kerja/SKILL.md`) sehingga terbaca di **setiap sesi dan lintas proyek**, bukan hanya di repo ini. Pembagian tugas: **repo ini = detail + bukti bertanggal**; **skill = versi ringkas yang portabel**. Kesalahan baru dicatat di **keduanya** pada sesi yang sama.

| Gejala | Sebab | Tindakan |
|---|---|---|
| Dokumen tampak berubah (`git status` → ` M`) padahal isinya tidak | berkas ditulis dengan CRLF padahal [.gitattributes](../../.gitattributes) mewajibkan `* text=auto eol=lf`; `scripts/tambah-toc.mjs` menulis CRLF sampai diperbaiki 2026-10-07 | **114 berkas sudah dinormalkan 2026-10-07** (keputusan owner). Diagnosis `git ls-files --eol <berkas>` — `w/crlf` berarti ini penyebabnya; jangan commit "perubahan" itu. Pengecualian yang **benar**: `*.ps1/*.bat/*.cmd` memang CRLF |
| Setelah menormalkan line ending, `git status` melaporkan banyak ` M` **hantu** (isinya identik dengan index) | stat-cache index basi: ukuran/mtime berubah, tetapi kontennya sama | buktikan dulu kontennya sama: `git hash-object --no-filters -- <berkas>` == `git rev-parse :<berkas>` dan `git diff-files -p -- <berkas>` kosong. Obatnya **satu berkas per perintah**: `git update-index --refresh -- <berkas>` (tanpa pathspec ia keluar 1 dan **tidak menulis** index; `git add --refresh -- .` pun tidak cukup). Tidak ada konten yang di-stage (`git diff --cached` tetap 0) |
| Huruf hilang setelah teks disusun lewat PowerShell (mis. `branch backup…` menjadi `ackup…`) | backtick adalah karakter escape PowerShell: `` `b `` menjadi **backspace (0x08)** | jangan menyusun teks repo di dalam string PowerShell; sisir dengan `[System.IO.File]::ReadAllBytes`. Kejadian nyata: `docs/history/changelog/2026-10.md` (1 byte 0x08), ditemukan & diperbaiki 2026-10-07 |
| Teks non-ASCII tampak rusak (`â€”`) di terminal | jalur keluaran konsol bisa mendekode UTF-8 dengan cara lain — berkasnya **belum tentu** cacat | verifikasi byte lebih dulu (`[System.IO.File]::ReadAllText` / daftar byte). Perhatian: beberapa dokumen **sengaja mengutip** pola mojibake (tabel inversi B12 di [bukti-2026-10](../arsip/bukti-2026-10.md) dan [mapping arsip](../arsip/DOC-GOV-20260922-mapping.md)) — **jangan "perbaiki"** |
| Skrip Node gagal `EPERM` saat memanggil `git` atau program lain | sandbox menolak **pipa stdio** `child_process` (pipeline PowerShell sendiri tidak terpengaruh) | alihkan keluaran anak ke berkas sementara tanpa pipa — contoh yang sudah jalan: `scripts/ukur-kesegaran-docs.mjs` |
| Baris ukuran KB di indeks folder jadi basi setelah dokumen disunting | indeks dihasilkan dari berkas; tanpa `--segarkan` skrip **tidak menimpa** indeks yang sudah ada | `node scripts/buat-indeks-folder.mjs --segarkan` |
| `git diff --check` melaporkan pelanggaran yang bukan bagian diff Anda | pohon kerja memuat perubahan belum-commit dari sesi lain | scope dulu: `git diff --check -- <berkas Anda>` |
| Angka "% segar" tinggi padahal belum ada manusia yang memeriksa isinya | batch dokumentasi menyentuh banyak dokumen sekaligus, sehingga `t_doc` nyaris seragam dan angka itu mengukur **urutan commit** | baca blok batas pada keluaran `node scripts/ukur-kesegaran-docs.mjs`; kartu ini bukan bukti isi benar |
| **Kartu kekuatan tiba-tiba GAGAL di pemeriksaan M** padahal batch Anda hanya menambah beberapa baris | ratchet baris dokumen aktif: total baris tidak boleh naik dari `scripts/docs-lines.baseline.json` | itu **bukan** kegagalan palsu — putuskan sadar: pindahkan isi ke arsip, atau naikkan `total_baris` di berkas baseline **beserta `alasan`** pada commit yang sama (angka baseline = data, bukan dokumen, jadi aturan "angka volatil" tidak dilanggar) |
| Self-test gate melaporkan "terdeteksi=false" pada aturan yang jelas-jelas Anda langgar | teks mutasi uji sendiri memuat frasa yang sedang dicari aturan itu (mis. menulis "tanpa blok baca" di dalam uji R4) | tulis mutasi **tanpa** frasa yang dicari; jalankan `node scripts/check-docs.selftest.mjs` — self-test wajib LULUS sebelum gate dianggap dipercaya |
| Transformasi teks massal atas dokumen bernilai tinggi **merusak tanpa terlihat** | **Empat kerusakan nyata** pada 2026-10-09 (konversi rujukan nomor baris), semuanya ketahuan **hanya karena ada pengukuran sebelum/sesudah**: (1) `\s{2,}` di JS memuat **newline** → `docs/domain/publik.md` 508→305 baris (baris tabel tergabung); (2) rentang memakai **en dash** (U+2013) → rujukan baris 18–22 pada `prisma.service.ts` (`PrismaService`, pool `max: 3`) menyisakan sisa menggantung `prisma.service.ts–22`; (3) aturan `\| \|`→`\|` menghapus **kolom kosong tabel**; (4) pola longgar `:[ \t]*\d+` + aturan pagar kode menghapus **nama simbol di dalam backtick** dan 3 pagar kode JSON | **Prosedur wajib bila transformasi menyentuh ≥10 berkas:** (a) `git archive HEAD` sebagai byte pembanding; (b) penjaga struktur di skrip — jumlah **baris** dan **baris tabel** harus identik, skrip **menolak menulis** bila berbeda; (c) uji **dua arah** — setiap baris baru harus = baris lama dikurangi pola yang dinyatakan, dan setiap teks yang dibuang harus cocok pola itu (**0 pengecualian**); (d) uji terpisah untuk yang **tidak boleh** hilang: jam (`12:00`), pagar kode, backtick kosong, kolom tabel kosong; (e) **jangan** pakai `\s` untuk merapikan teks — pakai `[ \t]` saja; (f) batasi ke bentuk yang benar-benar terbukti, sisanya **dilaporkan**, bukan ditebak. Kalau satu pun tidak bisa dipenuhi: **jangan jalankan** — sisa rujukan nomor baris jauh lebih murah daripada dokumen aturan yang rusak senyap |
| Isi dokumen **terpotong atau menempel** setelah Anda merasa "cuma menambah satu baris" — label keputusan lama hilang, baris register tetangga lenyap, kalimat penutup nempel di ujung bullet baru | jangkar `old_string` hanya **potongan awal/akhir baris**, atau blok multi-baris dipakai sebagai jangkar sementara `new_string` tidak memuat baris yang tidak ingin dihapus. Sisa baris menggantung **tanpa galat apa pun** | **Jangkar = SELURUH teks yang diganti**, dari awal baris sampai akhir baris. Kalau hanya menambah baris di samping baris lain, salin baris lama **utuh** di dalam `new_string`; kalau menghapus satu baris dari blok, sisir baris yang **tidak** ingin dihapus satu per satu. Setelah suntingan struktural: `git diff --unified=0 -- <berkas>` dan **baca setiap hunk**. Kejadian nyata 2026-10-10 — **lima kali dalam satu sesi**: label `AI-DECISION-25SEP` terpotong di [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md), dua baris register hilang di [batas-kejujuran](../history/batas-kejujuran.md), kalimat `Batas sesi ini` nempel di [SERAH-TERIMA](../kerja/SERAH-TERIMA.md), dan label bullet governance terpotong di [changelog](../history/changelog/2026-10.md) — **yang keempat terjadi saat pelajaran ini sedang ditulis**. Bukti bahwa menuliskan aturan **tidak** mencegah; yang mencegah adalah **membaca diff sebelum menutup**. Semuanya ketahuan karena itu, **0 lolos ke commit** (`b29f1bed`). **Yang kelima** — baris jebakan PowerShell terpotong ketika baris jebakan R6 di bawah ini ditambahkan, kurang dari sepuluh menit sesudah baris ini ditulis — juga ketahuan dari pemeriksaan diff, dan commit `b0f75148` diamandemen **sebelum** dipush |
| Tautan relatif **mati** setelah teks ditambah di berkas yang dalam (mis. `docs/history/changelog/…`) | salah menghitung kedalaman: dari `docs/history/changelog/` ke akar repo butuh **tiga** tingkat, ke `docs/kerja/` butuh `../../kerja/` | hitung tingkat dari **lokasi berkas**, bukan dari `docs/`, lalu buktikan dengan `node scripts/check-docs.mjs` (R2) **sebelum** commit. Kejadian 2026-10-10: `../../AGENTS.md` dan `../kerja/TANYA-OWNER.md` — ditangkap gate, 0 lolos |
| `git commit -F <berkas>` gagal `fatal: could not read log file` | `$env:TEMP` **berbeda tiap pemanggilan perintah** di harness ini (`…\Temp\dsh-xxxx\`), sedangkan berkas pesan commit ditulis ke `…\Temp\` | pakai **path absolut yang sama persis** saat menulis dan saat memakai, atau tulis berkas pesan di dalam repo lalu hapus setelah commit. Kejadian 2026-10-10 — staging tidak hilang, commit tinggal diulang dengan path literal |
| Pertanyaan ke owner dikirim **telanjang** — "mau saya commit?", "lanjut?", atau pilihan singkat tanpa konsekuensi | agen mengejar kecepatan dan menganggap owner sudah tahu konteks yang ada di kepalanya sendiri; akibatnya owner harus menebak, dan satu pertanyaan jadi lebih mahal daripada pekerjaannya | **Format wajib lima unsur**: konteks · pilihan **(a)/(b)/(c)** · konsekuensi + risiko tiap pilihan · rekomendasi agen + alasan · default bila tidak dijawab. Kalau pilihan belum terbayang: **susun dulu** pilihan yang masuk akal — jangan melempar pertanyaan kosong. Kejadian 2026-10-10 **dua kali** (pilihan singkat di alat tanya-jawab, lalu "mau saya commit?" di chat); keduanya ditegur owner. Rumah aturan: [§12](#12-otoritas-keputusan--ekonomi-verifikasi-arah-owner-2026-10-10) + [AGENTS §4](../../AGENTS.md); pertanyaan ditulis di [kerja/TANYA-OWNER.md](../kerja/TANYA-OWNER.md) |
| Gate menuduh rujukan **hantu** (`R6`) pada kalimat yang justru **menyatakan** berkasnya tidak ada | aturan R6 memeriksa **bentuk** `docs/...` di dalam backtick, bukan makna kalimatnya — jadi menyebut berkas lama sebagai contoh tetap terhitung | kalau berkasnya memang sudah tidak ada, jangan tulis path-nya di dalam backtick: pakai *miring* (mis. *docs/STATUS.md*) atau sebut namanya tanpa awalan `docs/`. Kejadian 2026-10-10 (2× dalam satu commit, `KEPUTUSAN-OWNER` + `TANYA-OWNER`); **jangan** melonggarkan gate-nya — ganti gayanya |
| Skrip ukur berhenti dengan `SyntaxError: Expected ',' or '}' after property value in JSON` | berkas **data** yang dibaca skrip memuat kutip ganda **tanpa escape** di dalam nilai string — pada 2026-10-10 ini terjadi di `scripts/docs-lines.baseline.json` karena kata berkutip ditulis apa adanya di `alasan` | pakai kutip tunggal (`'…'`) di dalam nilai JSON, atau escape (`\"`). Diagnosis cepat: `Get-Content <berkas> -Raw | ConvertFrom-Json` — kalau gagal, jangan menyalahkan skripnya. Kejadian 2026-10-10 (1×, ketahuan sebelum commit) |
| PowerShell gagal dengan `Missing closing ')'` atau `if : The term 'if' is not recognized` | `if` adalah **statement**, bukan ekspresi: memakainya di dalam argumen/format (`(if (...) {...} else {...})`) ditolak parser | hitung dulu ke variabel, baru pakai: `$x = if (...) { 'a' } else { 'b' }` di baris terpisah **sah**, lalu pakai `$x` di dalam string. Kejadian 2026-10-10 **dua kali** pada perintah ukur byte yang sama |

---

<a id="d4b-gate-11"></a>
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
- **Gate uang — dilonggarkan sebagian (keputusan owner 10 Okt 2026):** `npm run test:unit` backend **wajib** (memicu full build lewat `pretest:unit`) bila perubahan menyentuh **rumus, jurnal/posting, skema DB, atau aturan uang**; perubahan **tampilan/label/copy** di halaman yang menyentuh uang cukup **verifikasi terkecil** (render/diff/inspeksi), tanpa full build. Jangan menghapus atau mengubah hook. Bila ragu masuk kategori mana, **perlakukan sebagai rumus**.
- Exception uang **tidak** memerintahkan test/build untuk task dokumentasi.

Referensi command ada di §10 berkas ini (cwd, tujuan, dan perintah yang sudah terbukti jalan di mesin ini). Daftar itu **bukan izin otomatis**, dan cwd yang tertulis di sana wajib dipakai.

<a id="d4b-invariant"></a>
### 11a. Invariant & cara memeriksanya (dipindah utuh dari `docs/KONTRAK.md` §11, 2026-10-22)

> **Isi tidak diubah.** Bagian ini dulu ada di KONTRAK §11; ia dipindahkan ke rumah verifikasi yang sama dengan gate G0–G5 di atas, agar KONTRAK punya ruang untuk register aturan (batch D6 DOCS-GEN2) tanpa menaikkan plafon 16 KB. Pointer-nya tetap di [KONTRAK §11](../KONTRAK.md).

Angka **tidak ditulis** di sini — pakai perintahnya (Q11). Bila sebuah angka wajib muncul di laporan, tulis sebagai potret bertanggal.

| Invariant | Cara memeriksa | Ambang lulus |
|---|---|---|
| Antrean tugas terbuka | hitung `- [ ]` di [ANTREAN](../ANTREAN.md) §3 | sama dengan judul bagian itu |
| Tugas selesai historis | hitung `- [x]` di `docs/history/**` + `docs/arsip/**` | tidak menurun tanpa penjelasan |
| Gate domain uang/huni | `grep` pola `pretest:unit\|test:unit\|gate M04` di ANTREAN + berkas riwayat | tidak ada gate yang hilang |
| Kebersihan diff | `git diff --check` | exit 0 sebelum commit dokumentasi |
| Gate dokumen | `node scripts/check-docs.mjs` | exit 0 (atau `DILEWATI` yang dijelaskan) sebelum menutup batch dokumentasi |
| Konservasi pemindahan | bandingkan SHA-256 berkas sebelum/sesudah | 100% identik, kecuali transformasi yang dicatat |
| Kesesuaian berkas serah-terima | `node scripts/ukur-serah-terima-docs.mjs` | blok `@kost48-state` cocok dengan repo (HEAD, berkas yang ditunjuk ada, label gate benar); tanggal potret tidak lebih tua dari commit terakhir berkas tangga |
| Register keputusan final | `node scripts/ukur-serah-terima-docs.mjs --keputusan` | setiap baris di [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) punya tanggal + sumber; **tidak ada** baris baru yang menghidupkan R-1…R-6 tanpa keputusan baru |

**Exception ukuran berkas yang sudah disetujui:** aturan bisnis owner (mis. `docs/domain/ai.md`, `docs/domain/publik.md`) boleh melewati plafon rujukan bila punya daftar isi berjangkar; keputusan lama ARSIP-BATAS (24 Sep 2026) digantikan rencana rombak 2026-10-05.

---

<a id="d4b-gate-12"></a>
## 12. Otoritas keputusan & ekonomi verifikasi (arah owner 2026-10-10)

**Satu baris:** keputusan **teknis milik agen**; owner hanya dimintai **uang · flow/perilaku pengguna baru · hapus data · deploy/secret · keputusan penting yang sulit dibalik**. Ringkasan kanonik: [AGENTS §4](../../AGENTS.md); register keputusan bisnis: [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md).

| Kelas | Siapa memutuskan | Contoh |
|---|---|---|
| **Teknis** | **Agen (dsh)** — putuskan, kerjakan, catat satu baris alasan | arsitektur modul, nama berkas/fungsi/anchor, pola Prisma & DTO, urutan kerja, pemakaian library **yang sudah ada**, refactor internal, penataan & format dokumen, alat ukur |
| **Produk / flow** | **Owner** | flow app **baru**, perubahan langkah yang dilihat pengguna, aturan bisnis, label/halaman publik |
| **Uang** | **Owner** (+ gate uang §11) | nominal, DP/deposit, harga, jurnal, periode, rekonsiliasi |
| **Data & produksi** | **Owner** | hapus/migrasi data, deploy, secret, akses server/DB produksi |
| **Penting & sulit dibalik** | **Owner** | keputusan yang mengikat lintas modul atau menutup opsi lain (rewrite domain, ganti arsitektur hosting) |

**Cara bertanya — supaya owner tidak menebak (arah owner 10 Okt 2026, wajib).** Satu pertanyaan = satu keputusan, **bahasa manusia**, dan **selalu** memuat **lima unsur**:

1. **Konteks** 2–3 baris: apa yang sedang terjadi dan kenapa ini butuh keputusan owner (bukan agen).
2. **Pilihan berhuruf** — minimal dua, ditulis sebagai **(a) · (b) · (c)**, bukan kalimat yang harus ditafsirkan. Kalau pilihan owner belum terbayang, agen **wajib mengarang pilihan yang masuk akal** lebih dulu; pertanyaan tanpa pilihan = pekerjaan yang dilempar balik ke owner.
3. **Konsekuensi tiap pilihan** — apa yang terjadi, apa yang **tidak** terjadi, berapa kira-kira biayanya (waktu/langkah), dan **risikonya** bila ada. Risiko ditulis terbuka, bukan disembunyikan supaya pilihan terlihat menarik.
4. **Rekomendasi agen + alasan** — agen ikut mengambil tanggung jawab berpikir, bukan hanya bertanya.
5. **Default bila tidak dijawab** — apa yang akan agen jalankan supaya pekerjaan lain tidak berhenti.

**Dilarang:** pertanyaan telanjang di chat ("mau saya commit?", "lanjut?"), pertanyaan ya/tidak tanpa konsekuensi, dan pertanyaan yang memaksa owner membaca kode untuk bisa menjawab. Pertanyaan ditulis juga di [kerja/TANYA-OWNER.md](../kerja/TANYA-OWNER.md) — satu rumah, jangan berpencar — lalu **dipindah** ke [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) begitu dijawab.

**Contoh benar** (bentuk yang diharapkan): *"Kontekns: dua berkas source Anda belum di-commit. (a) Saya build frontend lalu commit+push — bukti kompilasi, ±10 menit, tidak menyentuh produksi. (b) Commit tanpa build — 1 menit, risiko: kalau ada galat TypeScript, `main` jadi merah untuk sesi berikutnya. (c) Biarkan — main tetap bersih, tetapi perubahan Anda tidak terlacak. Rekomendasi: (a). Default bila tidak dijawab: (c)."*
**Contoh salah:** *"Mau saya commit juga berkas source-nya?"* — tidak ada pilihan, tidak ada konsekuensi, tidak ada default.

**Goal & todos pada setiap pekerjaan (arah owner 10 Okt 2026 — wajib, untuk tracking owner).** Pekerjaan yang tidak punya keduanya dianggap **tidak terlacak**, sekalipun hasilnya benar.

1. **Goal** — satu kalimat tujuan + **definisi selesai yang bisa diperiksa**, menyebut berkas/keluaran yang menjadi bukti. Goal ditutup **hanya** bila definisi selesai benar-benar terpenuhi; kalau belum, tulis apa yang kurang — jangan ditutup diam-diam.
2. **Todos** — langkah konkret, satu baris per langkah, status `pending`/`in_progress`/`completed` diperbarui **selama** bekerja (bukan sekali di awal). Item selesai ditandai begitu selesai; langkah baru yang muncul ditambahkan, tidak disembunyikan.
3. **Blokir** — pekerjaan yang macet **≥3 putaran** ditandai `blocked` dengan **sebab konkret** (bukan "sulit" atau "belum yakin"), supaya owner bisa memutuskan.
4. **Batas keras** — todos adalah instrumen **sesi**, **bukan** antrean kedua: status pekerjaan proyek tetap di [ANTREAN](../ANTREAN.md) §3; **jangan** menulis daftar kotak `[ ]` ke dokumen mana pun di luar ANTREAN (gate R3) dan jangan membuat berkas antrean paralel.
5. **Satu goal = satu pekerjaan** yang punya definisi selesai; pekerjaan besar dipecah per increment (`KERJA-KECIL-COMMIT` di [mode-cepat §1b](../arsip/mode-cepat.md)) sehingga tiap increment bisa ditutup sendiri dan di-commit sendiri.
6. **Laporan penutup** menyebut goal + jumlah langkah yang selesai — itu yang dibaca owner untuk menilai laju, bukan kesan agen.

**Catatan permanen goal + todos (arah owner 10 Okt 2026 — pilihan c).** Goal dan todos hidup di sesi, tetapi owner memutuskan jejaknya **ikut disimpan di repo** supaya bisa dibuka kembali berbulan-bulan kemudian.

- **Tugas yang punya dokumen kerja** (`docs/kerja/TASK-<ID>.md`): tulis satu boks **Goal & todos** di bagian atas, bentuk baku:

  ```text
  ## Goal & todos
  **Goal:** <satu kalimat — apa yang selesai + definisi selesai yang bisa diperiksa>
  **Bukti penutup:** <perintah/keluaran/commit>

  | # | Langkah | Status |
  |---:|---|---|
  | 1 | … | belum |
  ```

  Status yang dipakai: **`belum` · `jalan` · `selesai` · `blokir`** — **jangan** kotak `[ ]`, karena gate R3 menolak kotak di luar [ANTREAN](../ANTREAN.md).
- **Tugas kecil (XS/S) tanpa dokumen kerja:** catat **satu baris** di entri changelog: `goal · langkah selesai/total · commit`.
- **Boks diperbarui selama bekerja**, bukan sekali di awal; saat pekerjaan ditutup, status terakhir + commit pengakhirnya diisi pada baris "Bukti penutup".
- **Yang dilarang:** menjadikan boks itu daftar pekerjaan berikutnya (itu tugas antipran) atau menyalin status proyek ke sini — ia **catatan**, bukan antrean.

**Ekonomi verifikasi (fokus percepatan app).** Jalankan **verifikasi terkecil yang membuktikan acceptance**, sekali, lalu lanjut. Jangan mengulang audit statis yang sudah ada; jangan build penuh untuk pekerjaan dokumen; test baru hanya bila menutup risiko **uang/auth/schema/kontrak bersama**. Verifikasi yang tidak membuktikan apa pun tentang acceptance = biaya, bukan mutu. **Docs-only tetap tanpa test/build/lint/typecheck**, dan gate dokumen dijalankan **sekali per batch**. **Gate uang §11 tetap berlaku** sampai owner memutuskan lain.

<a id="d4b-baca"></a>
### 12a. Anggaran baca per level (batch D7 DOCS-GEN2)

Angka **diturunkan**, bukan dikarang: token indikatif [AGENTS §5](../../AGENTS.md) × 4 (KONTRAK §3: token ≈ byte/4), kolom berkas = "maks. berkas" AGENTS §5.

| Level | Berkas (maks) | Anggaran baca | Catatan |
|---|---:|---|---|
| XS | 5 | 4–12 KB | typo/copy lokal |
| S | 8 | 12–28 KB | satu fungsi/berkas |
| M | 12 | 28–60 KB | satu modul |
| L | 18 | 60–120 KB | lintas modul |
| XL | 20/tahap | 40–100 KB/tahap | arsitektur; per tahap |

- **Pencatatan:** satu baris di laporan: `BACA: <n> berkas / <KB>` — **model menilai** berkas mana yang masuk konteks, **skrip menghitung** byte-nya: `node scripts/ukur-jalur-baca.mjs --baca <path...> [--level=S]`.
- **Cakupan:** anggaran menghitung bacaan **tambahan** selama tugas; AGENTS yang disuntik tidak dihitung. Jalur wajib (KONTRAK + ANTREAN) sudah memakan sebagian besar anggaran XS/S — itu fakta yang harus terlihat, bukan alasan menaikkan angka.
- **Kelebihan anggaran:** dilaporkan, **tidak** diblokir gate (gate tidak bisa melihat konteks sesi); lebih dari **20%** di atas anggaran wajib satu baris alasan di laporan.

**Dilarang:** menahan task hanya karena menunggu jawaban yang tidak wajib (tulis default + lanjut), dan menanyakan ulang hal yang sudah diputuskan ([KONTRAK §8](../KONTRAK.md)).

---

*Diperbarui: 2026-10-10 (§12 otoritas keputusan + ekonomi verifikasi) · 2026-10-07 (§10 daftar perintah + §10a jebakan mesin-dev + §11 gate verifikasi) · Sumber: owner KOST48 (data tenant real) + kost48surabaya.com + faqs.service.ts*

---


<a id="d4b-data-master"></a>
## Bagian G — Data master & nilai default

Tanggal: 23 September 2026
Status: Kanonik untuk nilai default DEV, konstanta operasional, data master lapangan, dan referensi seed.
Tujuan: Rumah kanonik materi referensi master asal `docs/operations/default-dev.md` (data mentah lapangan, nilai default, FAQ).
Rujukan: [data default & seed DEV pintu masuk](default-dev.md) · [Default & Seed DEV](default-dev.md) · [Produksi & Operasional Harian](produksi.md) · [operasi produksi](produksi.md)

> **Migrasi batch B9 (23 September 2026):** isi `docs/operations/default-dev.md` dipindah ke file ini; teks tidak diubah, hanya tautan relatif yang disesuaikan dengan basis folder tujuan. Batch B9 memindahkan: §2, §2 (Catatan Fisik Kamar), §2 (Fasilitas Per Kamar), §3, §4, §5, §6, §7, §7b, dan §8. Sisa isi M11 ada di [Default & Seed DEV](default-dev.md) (§1a, §1b, §9) dan [Produksi & Operasional Harian](produksi.md) (§ Status penggunaan data untuk go-live, §1c, §7 Data Tenant Produksi, §7b Data Audit Fasilitas Lapangan).
>
> **Batas lingkungan (eksplisit):** DEV (basis data pengembangan port 5433) · UAT (audit non-personal, akun/kredensial tidak ditulis di docs) · **Produksi (data penghuni nyata dan audit lapangan)**. File ini memuat **referensi nilai/nilai default dan data master lapangan**, bukan instruksi seed produksi; status go-live dan data tenant produksi ada di [Produksi & Operasional Harian](produksi.md).

<a id="4-konstanta-operasional-operationalsetting-id1"></a>
<a id="5-layanan-tambahan-additionalservice"></a>
<a id="6-faq-lengkap-37-faq"></a>

### Isi & lokasi kanonik

| Topik | Lokasi kanonik | Catatan |
|---|---|---|
| § Status penggunaan data untuk go-live | [operations/produksi.md](produksi.md) | Batas produksi sebelum go-live |
| §1a Akun Fondasi seed-dev, §1b Akun Audit UAT Non-Personal, §9 Ringkasan Perintah Seed | [operations/default-dev.md](default-dev.md) | DEV + fixture UAT; kredensial tidak ditulis di docs |
| §1c Data Tenant Produksi (GO-LIVE), §16 Data Tenant Produksi per kamar (dulu §7 di sini) | [operations/produksi.md](produksi.md) | Data penghuni nyata; input lewat UI Owner |
| §2 Kamar (13 kamar nyata), Catatan Fisik Kamar, Fasilitas Per Kamar | File ini | Nilai master lapangan |
| §3 Fasilitas Umum | File ini | Referensi fasilitas |
| §3a Data Lapangan Produksi Owner | [operations/produksi.md](produksi.md) | Ground truth lapangan; belum otomatis masuk DB |
| §4 Konstanta Operasional (`OperationalSetting` id=1), §5 Layanan Tambahan | File ini | Nilai default sistem |
| §6 FAQ Lengkap (37 FAQ) | File ini | Sumber kanonik: `backend/src/modules/faqs/faqs.service.ts` |
| §7b Data Audit Fasilitas Lapangan | [operations/produksi.md](produksi.md) | Hasil audit lapangan; template siap diisi |
| §8 DeepSeek AI — API Key & Konfigurasi | [operations/produksi.md](produksi.md) | Nilai key TIDAK disalin; hanya lokasi |

### Catatan Pemakaian

- Jadikan file ini rumah kanonik nilai master/default; runbook DEV (akun & perintah seed) ada di [Default & Seed DEV](default-dev.md), data produksi/audit lapangan ada di [Produksi & Operasional Harian](produksi.md).
- Heading asli (`## 2. Kamar (13 Kamar Nyata)` … `## 6. FAQ Lengkap`) dipertahankan apa adanya; penomoran bagian tidak diubah demi keterlacakan. **Sejak 11 Okt 2026 ada lompatan nomor 6 → 9**: §7, §7b, dan §8 dipindah ke [produksi.md](produksi.md) (lihat tabel "Isi & lokasi kanonik" di atas) dan nomornya **sengaja tidak dipakai ulang** supaya rujukan lama tetap menunjuk hal yang sama.
- **Batas DEV/UAT/produksi tetap eksplisit:** DEV di `operations/default-dev.md`, UAT non-personal mengikuti berkas audit AO-03, produksi/audit lapangan di `operations/produksi.md`.
- **Keselamatan data:** materi ini memuat data lapangan yang dapat memuat PII; jangan salin ke paket deploy, log, atau artefak publik.
---
### 2. Kamar (13 Kamar Nyata)

Sumber: kost48surabaya.com. Semua kamar saat ini OCCUPIED (per data real 2026-06).

| Kode | Nama     | Kategori | Tipe       | Ukuran   | KM     | Pendingin | Tarif Publik | Tarif Kontrak* | Deposit   | Lantai |
|------|----------|----------|------------|----------|--------|-----------|-------------|----------------|-----------|--------|
| A    | Kamar A  | DELUXE   | MEZZANINE  | STANDARD | Dalam  | AC        | 1.700.000   | 1.700.000      | 500.000   | 1      |
| B    | Kamar B  | DELUXE   | REGULAR    | STANDARD | Dalam  | AC        | 1.700.000   | 1.500.000      | 500.000   | 1      |
| C    | Kamar C  | DELUXE   | REGULAR    | STANDARD | Dalam  | AC        | 1.700.000   | 1.600.000      | 500.000   | 1      |
| D    | Kamar D  | DELUXE   | REGULAR    | STANDARD | Dalam  | AC        | 1.600.000   | 1.500.000      | 500.000   | 1      |
| G    | Kamar G  | ECONOMY  | REGULAR    | STANDARD | Luar   | Kipas     | 850.000     | 800.000        | 300.000   | 1      |
| H    | Kamar H  | ECONOMY  | REGULAR    | STANDARD | Luar   | Kipas     | 850.000     | 800.000        | 300.000   | 1      |
| I    | Kamar I  | ECONOMY  | REGULAR    | STANDARD | Luar   | Kipas     | 850.000     | 800.000        | 300.000   | 1      |
| J    | Kamar J  | DELUXE   | REGULAR    | STANDARD | Dalam  | AC        | 1.600.000   | 1.500.000      | 500.000   | 1      |
| K    | Kamar K  | DELUXE   | REGULAR    | LARGE    | Dalam  | AC        | 1.800.000   | 1.600.000      | 600.000   | 1      |
| L    | Kamar L  | DELUXE   | REGULAR    | LARGE    | Dalam  | AC        | 1.800.000   | 1.600.000      | 600.000   | 1      |
| M    | Kamar M  | STANDARD | REGULAR    | LARGE    | Dalam  | Kipas     | 1.400.000   | 1.200.000      | 500.000   | 1      |
| F1   | Kamar F1 | DELUXE   | MEZZANINE  | STANDARD | Dalam  | AC        | 1.750.000   | 1.700.000      | 500.000   | 2      |
| F2    | Kamar F2 | DELUXE   | MEZZANINE  | STANDARD | Dalam  | AC        | 1.750.000   | 1.600.000      | 500.000   | 2      |

> **\* Tarif Kontrak** = harga yang dibayar tenant saat ini (berdasarkan kontrak awal saat join, bisa berbeda dari tarif publik).

#### Catatan Fisik Kamar

| Kode | Dimensi & Detail                                                                                  |
|------|---------------------------------------------------------------------------------------------------|
| A    | 2m×3,5m + Mezanin 2m×2m; KM Dalam 1,2m×1,5m; Kasur ukuran 160                               |
| B    | 2,5m×3,5m (medium); KM Dalam 1,2m×1,5m; **Kasur kosong** (tenant tidak mau)                               |
| C    | 2,5m×3,5m (medium); KM Dalam 1,5m×1,5m; Kasur ukuran 120                                               |
| D    | 2m×3,5m (small); KM Dalam 1,5m×1,5m; Kasur ukuran 140                                                |
| G    | 2m×3,5m (medium); KM Luar bersama; Kasur **belum diaudit**                                                |
| H    | 2m×3,5m (medium); KM Luar bersama; Kasur **belum diaudit**                                                |
| I    | 2m×3,5m (medium); KM Luar bersama; Kasur ukuran 140                                                |
| J    | 2m×3,5m (medium); KM Dalam 1,2m×1,5m; Springbed ukuran 160                                            |
| K    | 3m×3,5m (besar); KM Dalam 1,2m×1,5m; Springbed ukuran 180                                             |
| L    | 3m×3,5m (besar); KM Dalam 1,2m×1,5m; Springbed ukuran 180                                             |
| M    | 3m×3,5m (besar); KM Dalam 1,2m×1,5m; Springbed ukuran 160; Superior/Economy tanpa AC       |
| F1   | 2,5m×3m (standar) + Mezanin 1,5m×3m; KM Dalam 1,5m×1,2m; **2 kasur ukuran 90**    |
| F2   | 2,5m×3m (standar) + Mezanin 1,5m×3m; KM Dalam 1,5m×1,2m; Kasur ukuran 90; Perabot lengkap    |

#### Fasilitas Per Kamar (seed via POST /rooms/:id/facilities)

Semua kamar (DELUXE / ECONOMY / STANDARD):
- Kasur Busa Tebal (qty 1, kategori: tidur, publicVisible: true)
- Lemari Baju (qty 1, kategori: perabot, publicVisible: true)
- Gantungan Baju (qty 1, kategori: perabot, publicVisible: true)
- Kipas Angin (qty 1, kategori: pendingin, publicVisible: true)

Kamar ber-AC (A, B, C, D, J, K, L, F1, F2): acWattage 380W (K & L: 450W), acCleanIntervalDays 90.

---

### 3. Fasilitas Umum

| Fasilitas                | Keterangan                                           |
|--------------------------|------------------------------------------------------|
| Parkir luas              | Ruang parkir mobil dan motor                         |
| Dapur bersama            | Area masak + kitchen set                             |
| Air PDAM + tandon        | 2 tandon cadangan 650 liter                          |
| Balkon santai            | Area terbuka untuk istirahat                         |
| Area jemur               | Beberapa titik di area kos                           |
| Taman & area hijau       | Lingkungan teduh dan nyaman                          |

#### 3a. Data Lapangan Produksi Owner — Belum Otomatis Masuk DB

Sumber: konfirmasi owner 2026-07-08. Data ini adalah ground truth lapangan awal, tetapi **belum boleh dianggap sudah ada di database produksi** sampai diinput lewat UI/seed/runbook. Jangan masukkan full NIK, foto KTP, password jaringan, token, atau API key ke repo.

**✅ Status NIK per 2026-07: Semua 13 tenant sudah punya NIK lengkap.**
- Tenant Kamar B ✅ NIK ################ — data lengkap, tinggal upload foto KTP via UI
- Tenant Kamar I — nama tampil di sistem; NIK atas nama **pemilik KTP** ✅ ################ — data lengkap

| Area | Data owner-confirmed | Status DB/aplikasi | Target input |
|------|----------------------|--------------------|--------------|
| Kamar F3/F4 | FINAL (owner 2026-07-08): TIDAK ADA — blok F dirombak menjadi F1+F2 | Tidak dibuat di master `Room`; total kamar tetap 13 | — |
| Lampu area bersama | 7 titik: depan poster, teras depan, dapur, lorong, pojok lorong, depan KM belakang, lorong belakang | BELUM jadi inventory/aset | `InventoryItem`/`FixedAsset` bila ingin dilacak, atau checklist operasional |
| CCTV area bersama | 5 titik: depan 2, depan dapur 1, area depan KM belakang 1, lorong belakang 1 | BELUM jadi inventory/aset; wajib review privasi angle kamera | `InventoryItem`/`FixedAsset`; dokumen notice CCTV |
| Bola pemadam api/APAR | Rencana 3-5 titik | BELUM dibeli/dipasang/final | `InventoryItem`/`FixedAsset` + checklist emergency |
| Kamar mandi dalam | F1 closet jongkok; kamar mandi dalam lain closet duduk | BELUM detail per room item | `RoomFacility` + `RoomItem` per kamar |
| Kamar mandi luar | 2 unit: satu closet duduk, satu khusus mandi; bak air plastik besar; tidak ada shower | BELUM ada model khusus area bersama | Checklist operasional; dapat dicatat sebagai facility umum/manual |
| Dapur outdoor | Kran ada, tempat sampah ada, rak piring tidak ada, ventilasi tidak perlu, kompor/selang/regulator/tabung LPG ada | BELUM jadi inventory/aset lengkap | `InventoryItem`/`FixedAsset` untuk kompor/LPG; checklist gas |
| Jemuran bersama | 1 jemuran besar area kamar belakang | BELUM jadi inventory/aset | `InventoryItem` bila perlu dilacak |
| Anak kunci | Perlu daftar master/cadangan per kamar | BELUM diinput | Checklist audit kelengkapan data kamar; catatan room/stay |
| Garansi barang | Jika ada: AC, router, pompa, CCTV, kasur | BELUM terstruktur | `FixedAsset.notes` atau dokumen operasional |
| Foto audit kondisi kamar saat ini | Perlu foto audit setiap kamar sebelum input data produksi | BELUM dibuat | Upload/file operasional; jangan simpan foto mentah di repo |
| Materi cetak | Nomor darurat, emergency flow, denah evakuasi, notice CCTV, aturan penghuni, checklist kamar/fasilitas | BELUM dibuat | Dokumen cetak + portal/manual tenant bila relevan |

Kebijakan owner terkait kerusakan:

- Kerusakan normal/aus/bocor/lampu mati/AC bermasalah/fasilitas mulai tidak layak: owner/staff memperbaiki atau mengganti.
- Kerusakan sengaja, salah pakai berat, kehilangan barang/kunci, atau pelanggaran aturan: direview sebagai tanggung jawab tenant.
- Kondisi kamar saat audit produksi sebaiknya difoto sebagai baseline data yang adil.

Rujukan detail: `docs/arsip/legacy/_expired_root_cleanup/RUNBOOK_DATA_AWAL_PRODUKSI_DAN_AUDIT_FASILITAS.md`.

### 4. Konstanta Operasional (OperationalSetting id=1)

| Field                         | Nilai Default | Keterangan                                          |
|-------------------------------|---------------|-----------------------------------------------------|
| freeElectricityKwhPerMonth    | 30            | Jatah listrik gratis per bulan (kWh)                |
| electricityTariffPerKwhRupiah | 2.500         | Tarif kelebihan listrik per kWh (Rp)                |
| waterMeteringEnabled          | false         | Toggle meteran air (default off)                    |
| waterTariffPerM3Rupiah        | 0             | Tarif air per m³ (bila meteran aktif)               |
| freeWaterM3PerMonth           | 0             | Jatah air gratis per bulan (m³)                     |
| wifiRupiah                    | 50.000        | Biaya WiFi per perangkat per bulan (Rp)             |
| galonRupiah                   | 20.000        | Harga galon air Voila per galon (Rp)                |
| petDepositRupiah              | 100.000       | Deposit jaminan hewan peliharaan (Rp, refundable)   |
| extraOccupantFeePercent       | 20            | Biaya penghuni tambahan (% tarif/kepala/bulan)      |

---

### 5. Layanan Tambahan (AdditionalService)
| Nama                       | Harga   | Unit              | Keterangan                                        |
|----------------------------|---------|-------------------|---------------------------------------------------|
| WiFi                       | 50.000  | /perangkat/bulan  | Jaga kualitas koneksi                             |
| Galon Air (Voila)          | 20.000  | /galon            | Beli langsung ke pengelola                        |
| TV Tambahan                | 50.000  | /bulan            | Layar datar 17 inci (opsional, konfirmasi dulu)   |
| Deposit Hewan Peliharaan   | 100.000 | /hewan            | Refundable bila tidak ada kerusakan               |

> **Catatan:** Galon = **Rp 20.000** (bukan 15.000). `insert-faqs.js` lama salah — gunakan `faqs.service.ts` sebagai referensi kanonik.
### 6. FAQ Lengkap (37 FAQ)

Sumber kanonik: `backend/src/modules/faqs/faqs.service.ts` → `DEFAULT_FAQS`.
Seed via `POST /api/faqs/seed` (idempoten, aman diulang).

> `insert-faqs.js` sudah USANG (konten beda, galon salah). JANGAN dipakai. Gunakan endpoint seed.

#### Kelompok Website (sortOrder 1–18) — dari kost48surabaya.com

| No | sortOrder | Kategori  | Pertanyaan                                                  |
|----|-----------|-----------|-------------------------------------------------------------|
| 1  | 1         | Fasilitas | Fasilitasnya apa saja Kak?                                  |
| 2  | 2         | Lokasi    | Lokasinya dimana ya? Apakah dekat PTC - Pakuwon Mall?       |
| 3  | 3         | Aturan    | Satu kamar bisa untuk berapa orang?                         |
| 4  | 4         | Fasilitas | Apakah tersedia WiFi?                                       |
| 5  | 5         | Fasilitas | Apakah disediakan nasi putih?                               |
| 6  | 6         | Fasilitas | Apakah disediakan dispenser air minum?                      |
| 7  | 7         | Aturan    | Ini kost cewek apa cowok?                                   |
| 8  | 8         | Aturan    | Apakah boleh membawa pasangan atau selingkuhan?             |
| 9  | 9         | Aturan    | Apakah boleh untuk pasangan Nikah Siri?                     |
| 10 | 10        | Aturan    | Apakah kos bebas?                                           |
| 11 | 11        | Aturan    | Apakah boleh membawa hewan peliharaan?                      |
| 12 | 12        | Aturan    | Apakah boleh untuk Pasutri (Pasangan Suami Istri)?          |
| 13 | 13        | Fasilitas | Apakah ada TV di kamar?                                     |
| 14 | 14        | Fasilitas | Apakah tempatnya bersih?                                    |
| 15 | 15        | Lokasi    | Apakah ada kamar kosong?                                    |
| 16 | 16        | Aturan    | Apakah boleh menginap dengan pacar?                         |
| 17 | 17        | Tarif     | Apakah sudah termasuk listrik?                              |
| 18 | 18        | Tarif     | Berapa tarif kamarnya kak?                                  |

#### Kelompok Operasional (sortOrder 30–83) — dari aturan bisnis

| sortOrder | Kategori            | Pertanyaan                                                          |
|-----------|---------------------|---------------------------------------------------------------------|
| 30        | Pembayaran          | Bagaimana cara membayar — tunai atau transfer?                      |
| 31        | Pembayaran          | Apakah boleh mencicil pembayaran sewa?                              |
| 32        | Pembayaran          | Apa beda DP (uang muka) dengan deposit jaminan?                     |
| 33        | Pembayaran          | Bagaimana hitungan listrik bila melebihi jatah?                     |
| 40        | Booking             | Bagaimana cara memesan kamar?                                       |
| 41        | Booking             | Berapa lama batas waktu konfirmasi booking?                         |
| 42        | Booking             | Bagaimana jika beberapa orang memesan kamar yang sama?              |
| 50        | Perpanjangan        | Kapan saya bisa memperpanjang sewa?                                 |
| 51        | Perpanjangan        | Bisakah saya membayar di muka beberapa bulan ke depan?             |
| 52        | Perpanjangan        | Apakah harga sewa naik saat saya perpanjang?                        |
| 60        | Checkout & Deposit  | Bagaimana proses keluar (checkout)?                                 |
| 61        | Checkout & Deposit  | Kapan deposit jaminan dikembalikan dan bisakah terpotong?           |
| 62        | Checkout & Deposit  | Jika saya keluar lebih awal, apakah sewa dikembalikan?             |
| 63        | Checkout & Deposit  | Apa yang terjadi bila saya melewati tanggal keluar tanpa perpanjang?|
| 70        | KTP & Privasi       | Apakah saya wajib menyerahkan KTP?                                  |
| 80        | Keluhan & Poin      | Bagaimana cara melapor kerusakan atau keluhan?                      |
| 81        | Keluhan & Poin      | Apakah saya bisa memberi tip ke staf setelah keluhan selesai?       |
| 82        | Keluhan & Poin      | Bagaimana cara mendapatkan dan memakai poin loyalitas?              |
| 83        | Keluhan & Poin      | Bagaimana cara mengaktifkan notifikasi?                             |

**Total: 37 FAQ** (18 website + 19 operasional)

### Salinan data produksi — dipindahkan 11 Okt 2026

Sampai 10 Okt 2026 bagian ini memuat salinan **§3a, §7, §7b, §8** (data produksi, audit fasilitas, DeepSeek AI) yang berasal dari migrasi batch B9 (23 Sep 2026). Tabel **Isi & lokasi kanonik** di atas sudah menyatakan keempatnya berumah kanonik di [operations/produksi.md](produksi.md), jadi salinan di sini adalah duplikat — dan duplikat itu terukur: **224 dari 228 barisnya identik** dengan berkas kanonik.

Salinan itu **dihapus dari berkas ini** dan **isi utuhnya diarsipkan** (bukan dipangkas diam-diam) di [arsip/data-master-bagian-produksi-2026-10-11.md](../arsip/data-master-bagian-produksi-2026-10-11.md), dengan provenance + ledger SHA-256 blok aslinya: `a7ce9499f9ed524b7e6bbc3f046757897c4abd67f7c5e4266dc5838569eb29ae` (243 baris, 10.587 byte). Rujukan pada dokumen lain yang tadinya menunjuk ke salinan itu sudah dialihkan ke [produksi.md](produksi.md).

**Untuk produksi, buka [produksi.md §15–§18](produksi.md).** Yang tetap menjadi milik berkas ini: nilai master lapangan (§2 kamar, §3 fasilitas, §4 konstanta, §5 layanan, §6 FAQ).

### 9. Ringkasan Perintah Seed

Isi lengkap perintah seed ada di [Default & Seed DEV](default-dev.md); bagian ini adalah penunjuk, bukan salinan perintah.

### Appendix — Seed Master Data (diarsipkan)

Prosedur "Patch Tenant Aman" (2026-07-08) sudah tidak tersedia.
Arsip: [m11-seed-master-data-appendix-2026-07-08.md](../arsip/m11-seed-master-data-appendix-2026-07-08.md).

<a id="d4b-register"></a>
## 13. Register aturan normatif (batch D6 DOCS-GEN2, 2026-10-22)

**Cara baca.** Setiap aturan normatif di tier-0/1 punya **detektor yang bisa gagal** atau status **PANDUAN** (+ pemilik + alasan). `PANDUAN` **tidak menghapus kewajiban** — ia menyatakan aturan itu dijaga manusia, bukan mesin. Detektor yang tertulis `R…` hidup di [check-docs](../../scripts/check-docs.mjs) dan dibuktikan bisa gagal oleh [self-test](../../scripts/check-docs.selftest.mjs); yang lain adalah skrip ukur. Register ini **tidak** memeriksa dirinya sendiri: aturan baru wajib menambah satu baris di sini pada batch yang sama.

| Aturan (rumah · kutipan) | Detektor | Status | Pemilik & alasan |
|---|---|---|---|
| AGENTS §1 hierarki otoritas | — | PANDUAN | owner — menilai niat/konflik tidak bisa digate |
| AGENTS §1 "tidak ada jawaban bukan persetujuan" | — | PANDUAN | owner |
| AGENTS §2 satu proses API NestJS; modul terpisah ditunda | — | PANDUAN | owner — keputusan arsitektur, bukan bentuk berkas |
| AGENTS §2 RAM LVE 512 MB = batas kerja | — | PANDUAN | owner — ambang diagnosis di [produksi Bagian E](produksi.md#d4b-kapasitas) |
| AGENTS §3 peta dokumen (router) | R2 · R6 · R8 | DIPERIKSA | — |
| AGENTS §4 izin, scope, larangan (dependency/DB/secret/reset/deploy) | — | PANDUAN | owner — izin hanya bisa dinilai manusia |
| AGENTS §5 level task, maks. berkas, token indikatif | — | PANDUAN | agen — dihitung saat review, bukan gate |
| AGENTS §6 batas baca + zona jangan-dibaca | R11 (zona dikecualikan) | PANDUAN | agen — kebiasaan membaca tidak terlihat gate |
| AGENTS §7 gate G0–G5, docs-only tanpa test | — | PANDUAN | agen — verifikasi diri di laporan |
| AGENTS §8 bentuk laporan + batas kejujuran | ukur-serah-terima | PANDUAN | owner — klaim "hijau" butuh pembacaan manusia |
| AGENTS §9 gate dokumen R1–R16 | check-docs + selftest | DIPERIKSA | — |
| KONTRAK §1 konflik & hierarki | — | PANDUAN | owner |
| KONTRAK §2 Smallest Safe Change + scope sebelum edit | — | PANDUAN | agen |
| KONTRAK §2 jangan menonaktifkan sandbox/guard/test | — | PANDUAN | owner |
| KONTRAK §3 level, proksi byte, XL butuh approval | — | PANDUAN | agen |
| KONTRAK §4 batas baca & hitung berkas | — | PANDUAN | agen |
| KONTRAK §6 berkas/area berisiko butuh izin | — | PANDUAN | owner |
| KONTRAK §7 angka volatil tanpa penanda potret | R1 | DIPERIKSA | — |
| KONTRAK §7 kotak otoritatif hanya ANTREAN + checklist bertanda | R3 | DIPERIKSA | — |
| KONTRAK §7 arsip: banner, nama tetap, pekerjaan terbuka tidak ikut | catatan T-05 di gate | PANDUAN | owner — arsip beku tidak boleh disunting |
| KONTRAK §7 rujukan lokasi = kutipan, bukan nomor baris | INFO nomor baris di gate | PANDUAN | agen — konversi = pekerjaan Isi |
| KONTRAK §7 gate dokumen R1–R12 + cakupan di kepala skrip | check-docs + selftest | DIPERIKSA | — |
| KONTRAK §7 kartu ukur (kekuatan, kesegaran, serah-terima) | ukur-kekuatan · ukur-kesegaran · ukur-serah-terima | DIPERIKSA | — |
| KONTRAK §7 plafon byte (AGENTS 12 KB · tangga 16 KB · rujukan 48 KB) | R5 | DIPERIKSA | — |
| KONTRAK §7 plafon tier (T0–T2/T9) | R16 | DIPERIKSA | owner — cap hanya turun |
| KONTRAK §7 baris Fakta pada berkas tangga | kartu kekuatan D | DIPERIKSA | — |
| KONTRAK §7 pagar wajib bisa gagal | check-docs.selftest | DIPERIKSA | — |
| KONTRAK §7 ratchet baris dokumen aktif | kartu kekuatan M | DIPERIKSA | owner — kenaikan butuh keputusan + alasan |
| KONTRAK §8 konflik selesai; R-1…R-6 tidak dihidupkan lagi | ukur-serah-terima `--keputusan` | DIPERIKSA | — |
| KONTRAK §9 bentuk laporan 4 baris + level | — | PANDUAN | owner |
| KONTRAK §10 pelaksanaan vs izin (dua sumbu) | — | PANDUAN | agen |
| KONTRAK §12 riwayat berkas | — | PANDUAN | agen |
| ATURAN §1 aturan uang/harga/huni butuh keputusan owner | — | PANDUAN | owner |
| ATURAN §2 topik kanonik (tautan ke domain/) | R2 · R6 · R8 | DIPERIKSA | — |
| ATURAN §3 batas berkas (antrean/runbook/audit di rumahnya) | — | PANDUAN | agen |
| domain/keuangan — invarian uang & jurnal | gate uang `npm run test:unit` backend | DIPERIKSA | owner — wajib saat rumus/jurnal/skema berubah; menjalankannya tetap PANDUAN |
| domain/hunian — siklus huni, deposit, KTP pasca check-in | — | PANDUAN | owner |
| domain/publik — FAQ bukan sumber aturan; tanpa PII | — | PANDUAN | owner |
| domain/ai — AI berbayar butuh izin + fallback rule-based | — | PANDUAN | owner (biaya) |
| operations/produksi — deploy/backup/cron/kapasitas | — | PANDUAN | owner |
| operations/default-dev — seed idempoten, batas DEV/UAT/produksi | — | PANDUAN | agen |
| OPERASI §1 batas lingkungan; jangan tampilkan secret/data pribadi | — | PANDUAN | owner |
| OPERASI §2 deploy/rilis = task tersendiri | — | PANDUAN | owner |
| OPERASI §4 runbook kanonik (tautan) | R2 · R6 · R8 | DIPERIKSA | — |
| id-registry §2 prefix wajib terdaftar sebelum dipakai | R14 | DIPERIKSA | — |
| id-registry §3 nomor tidak didaur ulang | — | PANDUAN | agen |
| id-registry §5 tanpa emoji; mojibake hanya sebagai kutipan | R13 | DIPERIKSA | — |
| id-registry §5a pemetaan ID lama → `W-` | — | PANDUAN | agen — alias beku, tidak disunting |
| default-dev §10 command per-cwd | — | PANDUAN | agen — perintah sudah terbukti, bukan gate |
| default-dev §10a jebakan mesin-dev | — | PANDUAN | agen |
| default-dev §11 gate G0–G5; "bukan PASS"; exception uang | — | PANDUAN | agen — gate uang bagian uang diperiksa test |
| default-dev §11a invariant & ambang lulus | ukur-serah-terima · check-docs · git | DIPERIKSA | — |
| default-dev §12 lima hal yang ditanyakan ke owner | — | PANDUAN | owner — lihat penyelesaian "4 vs 5" di bawah |
| default-dev §12 goal & todos + jejak di repo | — | PANDUAN | owner |
| default-dev §12 ekonomi verifikasi | — | PANDUAN | agen |
| FITUR — registry fitur (`FEAT-`): rute unik, jangkar ada, status sah | check-fitur | DIPERIKSA | — |
| peran.md — rute/path yang ditulis harus ada di kode | R15 | DIPERIKSA | — |
| batas-kejujuran — pisahkan implementasi/verifikasi/deployment/runtime | — | PANDUAN | owner |
| Register ini — aturan baru menambah satu baris di sini | — | PANDUAN | agen — register tidak memeriksa dirinya sendiri |

**Penyelesaian "4 vs 5 hal".** Aturan yang mengikat adalah **lima hal** yang ditanyakan ke owner: uang · flow/perilaku pengguna baru · hapus data · deploy/secret · keputusan penting yang sulit dibalik ([AGENTS §4](../../AGENTS.md) · [KONTRAK §2](../KONTRAK.md) · [§12](#d4b-gate-12)). Versi **"empat hal"** (tanpa "keputusan penting") hanya hidup di **arsip beku** — `ADAPTASI-DOKTRIN-DOCS` butir A-5 dan `PROMPT-SESI-BERIKUTNYA` — dan **tidak berlaku**; arsip tidak disunting. Satu baris konflik dicatat di [KONTRAK §8](../KONTRAK.md).

