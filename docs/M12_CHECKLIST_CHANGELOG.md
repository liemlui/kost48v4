# KOST48 V5 — Checklist Eksekusi Aktif

> Versi aktif: **2026-09-22** | Changelog → `docs/M13_CHANGELOG.md` | Temuan tata dokumen → [M16 §0](M16_AUDIT_MENYELURUH.md#0-audit-dokumentasi-dan-urutan-kerja--8-september-2026) | Riwayat fase & update harian -> `docs/history/`

## Cara Pakai (AI Eksekutor — baca sebelum coding)

Aturan kerja, izin, batas baca, dan pemeriksaan repo mengikuti [AGENTS](../AGENTS.md); instruksi yang sudah ada dalam konteks tidak dibaca ulang.

1. **Pilih pekerjaan:** prompt owner yang aktif, lalu satu task terbuka dari [antrean](#antrean-prioritas-aktif) yang prasyarat dan izinnya terpenuhi. Jangan mengulang pekerjaan selesai tanpa perubahan relevan.
2. **Baca sesuai task:** satu peta/domain relevan → target dan dependensi langsung. M01 hanya bila orientasi bisnis diperlukan; EF → M19 §9, AO → M14. Riwayat dibuka hanya untuk menjawab pertanyaan bukti tertentu.
3. **Tutup dengan bukti:** perbarui status + tanggal dan tautan M13/audit; pisahkan implementasi lokal, verifikasi lokal, deployment, dan dampak terukur. Gate uang tetap `npm run test:unit` backend + gate M04; docs-only cukup inspeksi isi/tautan/diff.

| Marker | Arti |
|--------|------|
| 🧑 / [OWNER] | Butuh data/keputusan owner; lanjutkan kerja independen yang sudah diizinkan |
| 🧬 / [SCHEMA] | Migration additive — approval owner dulu |
| **Gate:** | Verifikasi wajib sebelum `[x]` |

> Aturan operasional umum kini di [AGENTS.md](../AGENTS.md); M12 tetap mengatur antrean, urutan, dan gate tugas.
> Dashboard: [AI_MASTER.md](../AI_MASTER.md); exception gate uang tetap memakai full test+build melalui `pretest:unit` dan gate M04.

## Daftar Isi

1. [Antrean prioritas aktif](#antrean-prioritas-aktif) - satu-satunya urutan eksekusi
2. [Task terbuka & gate](#task-terbuka--gate) - 23 `[ ]` + gate + lokasi riwayat
3. [Peta rujukan dokumen](#peta-rujukan-dokumen)
4. [Efisiensi sesi & versi](#efisiensi-sesi--bump-versi)
5. [Riwayat fase & changelog](#riwayat-fase--changelog) - dipindah ke `docs/history/` (Tahap 2)

<a id="antrean-prioritas-aktif"></a>
<a id="antrian-eksekusi-aktif"></a>

### 🎯 Antrean Prioritas Aktif (2026-09-22)

**Task prompt aktif — DOC-GOV-20260922:** perbaikan inkonsistensi dokumentasi dan persiapan [rancangan penataan total](plans/DOC-GOV-20260922.md). Perbaikan terbatas dibukukan di M13; **Tahap 1 (indeks dokumentasi + penyelarasan workflow) disetujui owner 22 Sep dan sudah diterapkan** — [indeks dokumentasi](README.md) dibuat sehingga rujukan AGENTS §3/§4 tidak lagi menembus file yang belum ada, dan AGENTS/GUIDE/QUICKREF/AI_MASTER/M13 diselaraskan. Tahap 2–4 (antrean/riwayat, domain, review akhir) belum dijalankan dan tetap menunggu urutan rancangan sesuai AGENTS §5. Ini tidak menutup gate aplikasi atau mengizinkan pekerjaan server.

**Arah produk terbaru:** [keputusan owner 22 Sep](M02_KEPUTUSAN_OWNER.md#keputusan-penyederhanaan-aplikasi--22-september-2026) mendahulukan penyederhanaan OWNER/ADMIN pada operasional penghuni dan keuangan. Pengembangan IoT ditunda; gate EF/A/AO dan keuangan tetap. Daftar sisa pekerjaan berikut dipertahankan, tetapi audit tooling tidak otomatis mendahului flow bisnis utama.

**FLOW-CORE-01 — DRAFT:** petakan perjalanan penghuni → tagihan → verifikasi pembayaran → perpanjangan/checkout, beserta pengeluaran dan ringkasan bisnis. Acceptance rancangan: tiap keputusan memiliki aktor, prasyarat, efek pada uang/status/proses lain, bukti hasil, dan jalur koreksi; usulan dashboard menjawab apa yang harus dikerjakan serta asal angka. [Rancangan flow](plans/DOC-GOV-20260922.md#11-arah-produk-dan-flow-utama) belum merupakan bukti perilaku source atau izin perubahan keuangan. Landasan teori telah diklarifikasi: IB Diploma Business Management; [pemetaan awal](plans/DOC-GOV-20260922.md#12-landasan-ib-diploma-business-management) tetap memerlukan bukti data dan kontrak sebelum implementasi.

| # | Task | Penanggung jawab / kesiapan | Prasyarat dan bukti penutupan |
|---|------|-----------------------------|------------------------------|
| 1 | Onboarding 13 hunian + verifikasi KTP | Owner / menunggu data | Bulan masuk, meter kWh, deposit; penutupan mengikuti gate Fase A, bukan hanya data terkumpul |
| 2 | Opening balance produksi | Owner / menunggu angka cutover | Kas/bank per cutover; bukti rekonsiliasi sesuai M04 sebelum ditutup |
| 3 | Cron AutoOps di cPanel | Owner / menunggu pelaksanaan dan bukti | Target, izin, konfigurasi cron, dan bukti eksekusi sesuai M20; keberadaan token saja belum cukup |
| 4 | Ganti password OWNER + PIN owner | Owner / belum ada bukti penutupan di antrean | Bukti perubahan tanpa nilai secret; rotasi DB/JWT pada M13 20 Sep tidak membuktikan password OWNER/PIN selesai |
| 5 | Audit modul kedua | AI / ditunda di belakang pemetaan flow utama | Pemilihan modul mengikuti gap FLOW-CORE-01; gunakan bukti audit yang masih sah. Pendaftaran manifest adalah perubahan tooling terpisah, bukan syarat audit dokumen |
| 6 | Deploy commit lokal ke produksi | AI + Owner / perlu rencana rilis | Artefak/SHA dan diff rilis, bukti verifikasi, target, rollback, izin deploy; penutupan memakai bukti smoke dan identitas versi tersaji |
| 7 | Uji dependency hilang dan jumlah test nol pada wrapper | AI / perlu rancangan uji terisolasi | Bukti hasil kedua jalur sesuai kontrak wrapper; usulan fixture terisolasi dalam rancangan, belum izin rename node_modules workspace |
| 8 | Penataan struktur dokumentasi (termasuk empat file non-M) | AI / Tahap 1 selesai; tahap 2–4 menunggu urutan rancangan | Cakupan diperluas oleh prompt 22 Sep; mapping, kompatibilitas tautan, pelestarian isi, dan acceptance ada di rancangan DOC-GOV-20260922; [indeks dokumentasi](README.md) sudah dibuat pada Tahap 1 |

**Sisa lama (referensi — belum selesai):** direkonstruksi dari git (`e96d032`); baris lama #1 sudah tercakup item 1–4 di atas.

1. EF-00 sisa — identitas artefak + pengukuran runtime
2. Sisa Fase AO — AO-13 crawl + AO-14 sign-off
3. EF-02 — baseline workload host
4. EF-07 → EF-04/06/08 — env/kontrak/lifecycle
5. AL — rekonsiliasi H1-H15, Z-19 verifikasi manual
6. EF-09 + Fase MA — worker CLI + batas modul (ditunda)

> Aturan prioritas: kerjakan task teratas yang prasyaratnya terpenuhi dan lingkupnya sudah diizinkan. Bila teratas BLOCKED, lanjutkan pekerjaan independen yang sudah diizinkan. Tabel ini tidak memberi izin baru.

<a id="task-terbuka--gate"></a>

## Task Terbuka & Gate

Agregat tunggal 23 checkbox `[ ]` proyek. Format tiap baris: **ID** - judul | **Gate** (verifikasi wajib sebelum `[x]`) | **Riwayat** (lokasi isi lengkap, tidak diubah). Tanda 🧑 = butuh data/keputusan owner.
Isi lengkap tiap task tetap di file riwayatnya. Checkbox aktif hanya ada di seksi ini; di file riwayat, task terbuka disimpan sebagai kutipan (`> - [ ]`).

- [ ] **ONBOARDING-HUNIAN** - lanjutan onboarding 13 hunian + verifikasi KTP (menunggu data owner) | **Gate:** bulan masuk, 13 meter kWh, saldo kas/bank, deposit; penutupan lewat gate Fase A | **Riwayat:** [changelog/2026-09.md](history/changelog/2026-09.md)
- [ ] **AO-13/14-BUKTI** - bukti eksekusi: tiga crawl tanpa skip, dua state TENANT, viewport/Axe, sign-off | **Gate:** crawl tuntas, screenshot/trace bebas PII, sign-off AO-14 | **Riwayat:** [changelog/2026-09.md](history/changelog/2026-09.md)
- [ ] **AO-03 P1** - lima persona UAT non-personal dengan role/relasi/state terverifikasi | **Gate:** persona TENANT aktif + verifikasi ledger/DoD | **Riwayat:** [fase-ao.md](history/fase-ao.md#fase-ao--audit--hardening-uiux-lintas-portal)
- [ ] **AO-13** - crawl OWNER/ADMIN/STAFF setelah ledger UAT dan AO-03 terverifikasi | **Gate:** tiga role dieksekusi, 0 skip; exit 0 skrip saja belum cukup | **Riwayat:** [fase-ao.md](history/fase-ao.md#fase-ao--audit--hardening-uiux-lintas-portal)
- [ ] **AO-18 P2** - PARSIAL: trust 3+2, ikon semantik, FAQ sentence case selesai | **Gate:** polish copy/validasi hierarchy homepage sebelum sign-off AO-14 | **Riwayat:** [fase-ao.md](history/fase-ao.md#fase-ao--audit--hardening-uiux-lintas-portal)
- [ ] **AO-19 P2** - PARSIAL: inventaris aset publik selesai; sisa butuh keputusan owner | **Gate:** keputusan owner (hak pakai foto, keseragaman aspek, izin optimasi) | **Riwayat:** [fase-ao.md](history/fase-ao.md#fase-ao--audit--hardening-uiux-lintas-portal)
- [ ] **AO-20 P1** - sisa lokal selesai; UAT desktop OWNER 1440 px + visual regression masih BLOCKED | **Gate:** UAT + visual regression + sign-off AO-14 | **Riwayat:** [fase-ao.md](history/fase-ao.md#fase-ao--audit--hardening-uiux-lintas-portal)
- [ ] **AO-21 P2** - normalisasi sistem visual/terminologi Owner setelah review AO-20 | **Gate:** perubahan AppLayout dikoordinasikan | **Riwayat:** [fase-ao.md](history/fase-ao.md#fase-ao--audit--hardening-uiux-lintas-portal)
- [ ] **AO-23 P2** - konsolidasi komponen/shell Area Admin | **Gate:** regresi Owner bila AppLayout atau shared CSS berubah | **Riwayat:** [fase-ao.md](history/fase-ao.md#fase-ao--audit--hardening-uiux-lintas-portal)
- [ ] **AO-14** - audit final setelah AO-01..13 dan AO-15..23 memenuhi DoD | **Gate:** publik + OWNER/ADMIN/STAFF + dua state TENANT, viewport 320-1440 px, Axe/gate Baymard, build/test relevan, screenshot aman | **Riwayat:** [fase-ao.md](history/fase-ao.md#fase-ao--audit--hardening-uiux-lintas-portal)
- [ ] **EF-00 P0** - baseline deployment: konfigurasi panel dan limit/snapshot resource | **Gate:** SHA artefak yang berjalan, jam deploy, perilaku runtime EF-01/03/05, fault/interval pengukuran | **Riwayat:** [fase-ef.md](history/fase-ef.md#fase-ef--efisiensi-shared-hosting-512-mb)
- [ ] **EF-02 P0** - baseline workload host | **Gate:** butuh izin server; skenario, rentang waktu, jenis angka, resource/fault, artefak tercatat | **Riwayat:** [fase-ef.md](history/fase-ef.md#fase-ef--efisiensi-shared-hosting-512-mb)
- [ ] **EF-04 P2** - profil paket static | **Gate:** paket dan kedua profil diverifikasi setelah implementasi diizinkan | **Riwayat:** [fase-ef.md](history/fase-ef.md#fase-ef--efisiensi-shared-hosting-512-mb)
- [ ] **EF-06 P2** - kontrak routing/canary | **Gate:** canary/bucket routing diuji dengan izin; tanpa perubahan DB | **Riwayat:** [fase-ef.md](history/fase-ef.md#fase-ef--efisiensi-shared-hosting-512-mb)
- [ ] **EF-07 P1** - konfigurasi efektif env/DB | **Gate:** uji formal flag false vs DB true; jangan hapus key; inbox/pengumuman tetap bekerja | **Riwayat:** [fase-ef.md](history/fase-ef.md#fase-ef--efisiensi-shared-hosting-512-mb)
- [ ] **EF-08 P2** - lifecycle/peak | **Gate:** shutdown pool/timer + idempotensi diuji runtime; jangan jalankan server/UAT | **Riwayat:** [fase-ef.md](history/fase-ef.md#fase-ef--efisiensi-shared-hosting-512-mb)
- [ ] **EF-09 P3** - gate worker CLI (DITUNDA) | **Gate:** hanya bila pengukuran AutoOps terbatas membuktikan kebutuhan + persetujuan desain; bukan izin membuat worker | **Riwayat:** [fase-ef.md](history/fase-ef.md#fase-ef--efisiensi-shared-hosting-512-mb)
- [ ] **MA** - implementasi batas modul DITUNDA | **Gate:** keputusan owner berikutnya; tanpa apps/libs, app Nest baru, worker | **Riwayat:** [fase-lama.md](history/fase-lama.md)
- [ ] **A1 / F1-12** - kelengkapan identitas hosting/deployment dan kesiapan env rahasia | **Gate:** versi/port PostgreSQL dari IDwebhost + kesiapan rotasi secret | **Riwayat:** [fase-lama.md](history/fase-lama.md)
- [ ] **A4** - konfirmasi rotasi password OWNER + PIN | **Gate:** bukti rotasi tanpa mencatat nilai secret | **Riwayat:** [fase-lama.md](history/fase-lama.md)
- [ ] **A5** - opening balance atau dokumentasi zero-start | **Gate:** angka cutover atau dokumentasi nol | **Riwayat:** [fase-lama.md](history/fase-lama.md)
- [ ] **A6** - smoke test produksi: login OWNER, public rooms 200, trial balance, recon | **Gate:** trial balance isBalanced, recon mismatch 0, readiness tanpa blocker merah | **Riwayat:** [fase-lama.md](history/fase-lama.md)
- [ ] **Z-19** - owner dashboard belum teraudit penuh | **Gate:** verifikasi manual/audit penuh dashboard owner | **Riwayat:** [fase-lama.md](history/fase-lama.md)

**Rekap:** 23 `[ ]` = changelog/2026-09.md 2 - fase-ao.md 8 - fase-ef.md 7 - fase-lama.md 6. ID unik = 21 (AO-13 dan AO-14 muncul dua kali).

## Peta Rujukan Dokumen

Seri M00-M20 adalah pintu masuk stabil; indeks berbasis kebutuhan ada di [docs/README.md](README.md). Arsip `docs/archieve/*` hanya untuk forensik. Lampiran navigasi M00: [peta struktur audit](audit-map/README.md), [alur lintas domain](audit-map/ALUR_LINTAS_DOMAIN.md), [cara audit/checkpoint](audit-map/CARA_AUDIT.md); checklist cakupan owner: [CHECKLIST_AUDIT_TOTAL.md](CHECKLIST_AUDIT_TOTAL.md) (135 subkelompok). Rincian tabel lengkap dipindah ke riwayat pada Tahap 2.

| Rujukan | Fungsi |
|---|---|
| [M00](M00_CODEMAP.md) - [M01](M01_MASTER.md) - [M02](M02_KEPUTUSAN_OWNER.md) | Modul ke path - orientasi - keputusan owner (menang bila konflik) |
| [M03](M03_FLOW_KONTRAK.md) - [M04](M04_KEUANGAN.md) - [M05](M05_SIKLUS_HUNI.md) | Flow - uang (wajib tiap task uang) - siklus huni/renewal/checkout/KTP |
| [M06](M06_OPERASIONAL.md) - [M07](M07_PUBLIK_GROWTH.md) - [M08](M08_DEPLOY_GO_LIVE.md) | Operasional - publik/SEO - runbook deploy/go-live |
| [M09](M09_AI_OWNER_ADMIN.md) - [M10](M10_PETA_SCOPE.md) - [M11](M11_DEFAULT_DATA.md) | AI manual - scope per role - seed/default DEV |
| [M13](M13_CHANGELOG.md) - [M14](M14_AUDIT_UI_UX.md) - [M15](M15_IOT.md) | Riwayat terbaru - UI/UX - IoT |
| [M16](M16_AUDIT_MENYELURUH.md) - [M17](M17_PORTAL_FLOW_RINGKAS.md) - [M18](M18_ATURAN_HARGA_KAMAR.md) | Audit docs - prinsip portal ringkas - multiplier harga |
| [M19](M19_EFISIENSI_HOSTING_512MB.md) - [M20](M20_PRODUKSI_KOST48.md) - [FORM](FORM_ISI_DATA_GO_LIVE.md) | EF/tabel host - produksi harian - formulir go-live kanonik |
| **M12** - [AI_MASTER](../AI_MASTER.md) - [AGENTS](../AGENTS.md) | file ini - dashboard - aturan operasional kanonik |

<a id="efisiensi-sesi--bump-versi"></a>

## Efisiensi Sesi & Bump Versi

- Satu sesi ideal = 1 episode kerja yang masih berhubungan; topik berganti total -> sesi baru. Navigasi konteks mengikuti [AGENTS](../AGENTS.md); M01 dan riwayat hanya bila diperlukan.
- Bump versi hanya atas permintaan eksplisit owner, sumber `frontend/src/config/version.ts` dan `frontend/public/version.json`: `PATCH` bugfix/polish - `MINOR` fitur terasa user - `MAJOR` breaking.
- Saat bump, update `APP_BUILD_DATE`; build ID PWA dihasilkan saat `npm run build`.

<a id="riwayat-fase--changelog"></a>

## Riwayat Fase & Changelog (pointer)

Isi fase lama, ledger historis, dan update harian dipindah **tanpa diubah** ke `docs/history/` pada Tahap 2. Anchor lama tetap hidup melalui pointer di bawah; file M14, M19, AUDIT_UIUX_TOTAL_2026-09-12, dan M13 tidak diedit.

<a id="fase-ao--audit--hardening-uiux-lintas-portal"></a>

### Fase AO - Audit & Hardening UI/UX Lintas Portal

Rincian 37 baris + 8 ` [ ] ` + 17 ` [x] ` -> [docs/history/fase-ao.md](history/fase-ao.md).

<a id="fase-ef--efisiensi-shared-hosting-512-mb"></a>

### Fase EF - Efisiensi Shared Hosting 512 MB

Rincian 17 baris + 7 ` [ ] ` + 3 ` [x] ` -> [docs/history/fase-ef.md](history/fase-ef.md).

**Riwayat lain:** [fase-lama.md](history/fase-lama.md) (Riwayat Fase, Ledger Historis, Fase AN, MA, A, B..AL: 6 ` [ ] ` + 36 ` [x] `) - [changelog/2026-09.md](history/changelog/2026-09.md) (2 ` [ ] ` + 45 ` [x] `) - [M13](M13_CHANGELOG.md) (10 entri terbaru + indeks bulan).
