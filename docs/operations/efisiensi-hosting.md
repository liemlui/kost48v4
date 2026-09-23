# Efisiensi Hosting 512 MB (Fase EF) — Audit, Rencana, dan Pencatatan

Tanggal: 2026-09-23
Status: aktif
Tujuan: batas teknis & rencana efisiensi shared hosting 512 MB — verdict, anggaran memori, verifikasi klaim audit, jalur arsitektur, peta dependensi mikrotask, definisi EF-00..EF-09, batasan/open questions, dan tabel pencatatan hosting EF-00/EF-02 (dari M19)
Rujukan: [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) · [STATUS](../STATUS.md) · [efisiensi hosting](efisiensi-hosting.md) · [produksi.md](produksi.md) · [deploy-go-live.md](deploy-go-live.md) · [go-live-cpanel.md](go-live-cpanel.md)

> Migrasi dari docs/M19_EFISIENSI_HOSTING_512MB.md (B3 Tahap 3, 23 Sep 2026) pada DOC-GOV-20260922; teks tidak diubah.
> Batch B3 memindahkan **seluruh isi M19 apa adanya** ke file ini (satu tujuan per handoff owner). Anchor lama (`#arah-dan-status-aktif...`, `#9-pencatatan-hosting-ef-00-dan-ef-02`) dipertahankan di pointer M19 agar rujukan dari M02/M08 tetap resolve.

## Arah dan status aktif — diselaraskan 8 September 2026; identitas hosting diperbarui 13 September 2026

Keputusan [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md): **Fase EF diprioritaskan; satu proses API NestJS dipertahankan sebagai target; Fase MA ditunda.** Instance Passenger teramati 13 Sep 2026: **1 proses saat idle, dan 2 proses sempat hidup bersamaan** sesaat setelah restart ([produksi §10](produksi.md)). Profil static masih rencana; bukan izin apps/libs, ekstraksi service atau worker baru. Checklist kanonik: [STATUS](efisiensi-hosting.md).

| Lapisan bukti | Status saat sinkronisasi | Batas kesimpulan |
|---|---|---|
| Implementasi | EF-01 telemetri, EF-03 singleton, EF-05 packaging tersedia lokal dan tercakup pada commit `b29ba32`; paket 12 Sep dibangun dari `cbca06f` | Commit tersebut juga memuat perubahan lain; commit lokal bukan bukti isi artefak server |
| Verifikasi lokal | Audit statis EF-01/03/04/07 + typecheck exit 0 menurut laporan Cline yang diterima owner; build EF-05 tercatat di M13 | Bukan build/UAT baru pada sesi docs; tidak menjamin konfigurasi server |
| Deployment | **Sudah dijalankan 13 Sep 2026** (izin owner): paket 12 Sep terpasang, checksum terverifikasi di server; identitas host/startup/docroot/urutan env diketahui (§9.1–9.2). Sisa UNKNOWN: SHA tunggal artefak yang berjalan, jam deploy, perilaku runtime EF-01/03/05 | `client/` diganti tiga kali pada 13 Sep dari working tree, jadi SHA tunggal tidak mewakili seluruh isi server; smoke test bukan uji beban |
| Dampak terukur | Snapshot PMEM `403,34/512 MB` dan resource panel 7 Sep (§9) + pengamatan proses 13 Sep: 1 instance saat idle, RSS ≈200 MB/proses, `/api/public/rooms` ≈0,3 s, overlap 2 proses saat restart. Interval/peak/fault/workload tetap belum diukur | RSS per proses ≠ PMEM akun; snapshot/pengamatan sesaat bukan baseline workload; kelayakan 512 MB belum PASS |

Audit statis diterima; tidak diulang tanpa perubahan relevan. **§9.1–§9.3 kini terisi** dari sesi deployment 13 Sep 2026 dan snapshot panel 7 Sep. Sisa pengukuran EF-02 (interval/peak/fault) serta verifikasi runtime EF-01/03/05 menunggu izin uji aktif. Fase A sudah dipublikasikan 13 Sep; gate AO yang terbuka tetap berlaku.

> Dokumen ini adalah **sumber kebenaran** fase efisiensi hosting: verdict kelayakan, anggaran RAM (fakta vs estimasi), verifikasi klaim audit terhadap kode (koreksi final + temuan P0–P2 audit deploy 6 Sep 2026), jalur arsitektur yang disetujui, dan definisi task EF-00..EF-09 (paket 10 mikrotask audit).
> Sumber kode: `backend/src/main.ts`, `backend/src/app.module.ts`, `backend/src/modules/auto-ops/auto-ops.service.ts`, `backend/src/modules/iot/iot-polling.service.ts`, `backend/src/common/config/app-config.service.ts`, `backend/src/prisma/prisma.service.ts`, `backend/package.json`, `scripts/make-deploy.mjs`, `docs/M08_DEPLOY_GO_LIVE.md`.
> Terakhir diperbarui: **2026-09-13** | Status: 🟠 **SEBAGIAN TERISI** (identitas deployment 13 Sep; sisa pengukuran EF-02) — lihat [STATUS.md](../STATUS.md) (status EF); rincian server di [produksi.md](produksi.md).

---

## 1. Verdict Eksekutif

- **Kelayakan shared hosting RAM LVE 512 MB belum terbukti.** Jalur A adalah arah tanpa rewrite yang dipilih untuk dievaluasi; pengukuran EF-00/02 harus mengidentifikasi artefak server sebelum menyimpulkan cukup atau tidak cukup.
- Pajak tetap yang memberatkan: **satu proses NestJS memuat 46 modul + Prisma 7 (query compiler WASM) + SPA di proses yang sama**.
- Dampak pengeluaran modul kecil belum diukur. Angka 1–5 MB pada audit awal adalah estimasi, bukan bukti penghematan. Tidak ada izin menghapus domain atau menambah proses sebagai solusi kapasitas.
- **Jangan dibuang:** stay, invoice, bukti bayar, deposit, tiket, meter manual, pengumuman in-app, akuntansi double-entry. Pengaturan beban job diputus dari pengukuran; tidak ada izin memindahkan job atau membuat worker sekarang.

## 2. Anggaran 512 MB — Fakta vs Estimasi

| Segmen | Angka | Status |
|---|---|---|
| Overhead cPanel/LVE | ~50 MB | ESTIMASI (belum terukur) |
| PostgreSQL satu akun | ~80–150 MB | ESTIMASI (belum terukur) |
| Nest + Express + 46 modul | ~80–130 MB RSS boot (heap cap 192 = target M08, **bukan fakta runtime**) | ESTIMASI (belum terukur). `start:prod` memuat `--max-old-space-size=192`, tetapi Passenger menjalankan `dist/main.js` langsung (M08:303, M08:593, make-deploy:565) — cap hanya berlaku bila `NODE_OPTIONS` diset di env cPanel |
| Prisma generated WASM | **27,2 MB disk / 31 file** (`backend/src/generated`) | FAKTA terverifikasi |
| Spike cron / dashboard | +30–80 MB sebentar | ESTIMASI (belum terukur) |

**Fakta M08 (statistik owner 2026-07-04):** RAM LVE **512 MB** (139 MB terpakai situs lama) · inode 46,7rb/75rb (62%) · entry process 5/15 · Postgres OK.

> **Catatan penting (audit deploy 6 Sep 2026):** `--max-old-space-size=192` membatasi *old-space* V8 — **RSS total proses bisa melebihi 192 MB**, dan angka ini **bukan fakta runtime host** (Passenger mengabaikan `start:prod`; M08:303). Angka idle 120–180 / puncak 250–300 MB **MEMANG ada di M08:303** sebagai **estimasi lama** ("Estimasi runtime: idle 120-180MB, puncak ~250-300MB") — bukan pengukuran. Jangan menjumlahkan estimasi "cPanel 50 MB" + "Postgres 80–150 MB" menjadi anggaran pasti; PMEM LVE akun adalah sumber keputusan (P2). Semua harus diukur (EF-00/EF-01).

### 2.1 EF-00 — baseline yang dapat diverifikasi dari workspace

Tabel berikut mempertahankan snapshot inventaris 7 Sep, bukan fingerprint workstation terbaru. Pada audit docs 8 Sep, `git log` menunjukkan HEAD `74068aa` (mekanisme AO) dan implementasi EF tercakup di `b29ba32`; tracked tree bersih sebelum edit docs, `.claude/` dan `kost48-deploy-bundled/` tetap untracked. Bundle historis di bawah tidak diperiksa ulang. Tidak ada bukti baru artefak/deploy/PMEM host dari audit ini.

| Fakta | Nilai | Status |
|---|---|---|
| SHA saat pencatatan | `8c35a4f7524f85eb3a07f8407a2c950cbfb6e98a` | FAKTA HEAD lokal, 7 Sep 2026; bukan bukti artefak server |
| Branch / working tree | `main` / `dirty` | FAKTA lokal; dirty state mencakup perubahan lintas task yang sudah ada |
| Entrypoint artefak | `dist/main.js` | FAKTA konfigurasi (`backend/package.json`); keberadaan di server belum diverifikasi |
| Versi Node lokal | `v22.15.0` | FAKTA workstation saat snapshot; Node panel `22.23.2` dari bukti 7 Sep di §9, versi proses host belum diverifikasi |
| Prisma client | `@prisma/client ^7.8.0` | FAKTA source; versi lock/runtime host belum diverifikasi |
| Bundle lokal | `kost48-deploy-bundled.tgz`, 42.863.126 byte; modifikasi `2026-09-06T06:26:48.9467864+07:00`; SHA-256 `820EEAA22FB389BF8AA8C660F12F0E4FA158F90970B3C4637C78B551F6E73B6` | FAKTA file lokal; waktu modifikasi bukan otomatis waktu build dan bundle bukan otomatis artefak server |
| Model proses aplikasi | Tidak ada `cluster`/`worker_threads` di source | FAKTA source; tidak membuktikan jumlah instance Passenger |
| Command Passenger efektif | Belum diketahui | UNKNOWN — ukur di host |
| Jumlah instance / overlap restart | Belum diketahui | UNKNOWN — ukur di host |
| LVE PMEM, fault, EP/NPROC/CPU/IO | Limit/snapshot panel parsial 7 Sep tersedia di §9 | Interval/peak/fault dan workload masih UNKNOWN; jangan menyamakan snapshot dengan baseline |
| Dokroot/static split aktif | Belum diketahui; baseline saat ini SPA disajikan Nest | FAKTA kode + UNKNOWN konfigurasi host |

**Kesimpulan EF-00:** inventaris lokal selesai, tetapi task tetap terbuka sampai bukti runtime host melengkapi baris UNKNOWN. Tidak ada klaim bahwa limit 512 MB cukup.

## 3. Verifikasi Klaim Audit vs Kode (2026-09-06)

### 3.1 Inventaris kode dan catatan audit lokal (anchor dapat bergeser)

| Klaim | Bukti |
|-------|-------|
| 46 modul NestJS dalam 1 proses | Tepat 46 folder `backend/src/modules/`; semua di-import `app.module.ts` (imports baris 68–124) |
| Prisma 7 + WASM (27 MB disk) | `@prisma/client`, `prisma`, `@prisma/adapter-pg` `^7.8.0` (`backend/package.json`); `binaryTargets` sudah dihapus (M13); `backend/src/generated` = 27,2 MB |
| Nest menyajikan SPA (`client/` = copy `frontend/dist`) | `main.ts:204–228` (`useStaticAssets` + SPA fallback); `scripts/golive-combined.mjs:45–48`; `scripts/make-deploy.mjs:459` |
| Node yang meng-gzip | `main.ts:91` `app.use(compression())` |
| `rawBody: true` global | `main.ts:25` |
| Auto-Ops = kandidat beban puncak; belum diukur | `auto-ops.service.ts:172–218` `runAllUnlocked()`: 19+ sweep berurutan — booking expiry, renewal priority/settlement, DP forfeit, overstay, recurring expense, depresiasi, rent recognition, rekonsiliasi jurnal, auto-close, prune notifikasi, dispatch pengumuman, push dispatch |
| IoT timer default OFF | `IOT_TUYA_POLL_ENABLED` default `false` (`app-config.service.ts:191`, `iot-polling.service.ts:31`); kWh Tuya dibaca **on-demand tanpa cron** di mode shared hosting (M08 §IoT) |
| AI DeepSeek manual-only, default OFF | `aiFeaturesEnabled = (process.env.AI_FEATURES_ENABLED === 'true')` — default OFF (`app-config.service.ts:201`); `aiManualOnly` default on; tombol AI OWNER/ADMIN saja |
| Web-push nonaktif tanpa VAPID | M08 F4-2: tanpa VAPID → push otomatis NONAKTIF; notif in-app tetap jalan |
| Tesseract/Recharts/FullCalendar = beban browser | `frontend/package.json`: `tesseract.js` ^7, `recharts` ^3.8, `@fullcalendar/*` ^6 — beban JS bundle & browser, bukan heap server (kecuali di-gzip oleh Node saat serve SPA) |
| Heap cap 192 MB | `backend/package.json` `start:prod`; M08:314 |
| Pool pg `max:3` | `prisma.service.ts:18–22` (`new Pool({ max: 3, Client: SerializedPgClient })`) |
### 3.2 Koreksi final — 4 klaim audit awal salah/terlalu keras

1. **Idle 120–180 / puncak 250–300 MB** — **ADA di M08:303** sebagai *"Estimasi runtime: idle 120-180MB, puncak ~250-300MB"*, tetapi itu **estimasi lama runbook, bukan pengukuran**. Koreksi M19 sebelumnya yang menyebut "tidak ada di M08" adalah **salah** — audit deploy 6 Sep 2026 membantahnya. Sisa fakta M08 benar: LVE 512 MB, situs lama 139 MB, inode 62%, entry 5/15, heap cap 192 MB (hanya bila `NODE_OPTIONS` diset di cPanel).
2. **`rawBody` bukan pengganda file KTP/bukti bayar.** Upload bukti bayar & KTP memakai Multer `FileInterceptor` + `diskStorage` (stream ke disk, multipart) — tidak lewat body-parser JSON, jadi `rawBody` tidak menggandakannya. `rawBody` hanya menahan body JSON/urlencoded di memori. Membatasi ke rute IoT tetap rapi, tetapi **bukan penghemat utama**.
3. **Auto-Ops template deploy sudah `AUTO_OPS_ENABLED=false` + cron URL** (`make-deploy.mjs:490–493`). Risiko nyata = env kosong lalu **DB default `autoOpsEnabled=true`** (seed row id=1; komentar `auto-ops.service.ts:49–52`). Advisory lock `pg_try_advisory_lock` sudah ada.
4. **Pool pg `max:3` sudah terimplementasi** (`prisma.service.ts:18–22`) — bukan pekerjaan baru.

### 3.3 Belum terukur (wajib diukur di LVE = EF-00)

RSS boot 80–130 MB · RSS Prisma 20–40 MB · spike cron +30–80 MB · overhead LVE ~50 MB · Postgres 80–150 MB. **Telemetri lokal EF-01 sudah tersedia** (`common/telemetry/`); default OFF dan tanpa endpoint publik baru. Belum ada hasil PMEM host. Ukuran disk generated yang dicatat sebelumnya tidak boleh dianggap RSS.

### 3.4 Temuan audit deploy 2026-09-06 (read-only, terverifikasi ke kode)

| Prioritas | Temuan | Bukti terverifikasi | Status |
|---|---|---|---|
| P0 | **Dua instance PrismaService/pool** — `reports.module.ts:8` mendaftarkan provider lokal, padahal `prisma.module.ts:4–7` sudah `@Global` | `reports.module.ts:8`, `prisma.module.ts:4–7`; `max:3` per pool → kapasitas bisa 6 koneksi/proses | ✅ **FIX** (ACT 6 Sep 2026): provider lokal dihapus, pakai `PrismaModule` global |
| P0 | **Heap 192 bukan fakta runtime** — Passenger menjalankan `dist/main.js` langsung; `start:prod` tidak dipakai | M08:303, M08:593, make-deploy:565–566, golive-combined:64 | 📌 dikoreksi di §2; verifikasi `NODE_OPTIONS` cPanel + `v8.getHeapStatistics()` |
| P0 | **Tidak ada .htaccess/Passenger/nginx aktif** (grep 0 file) | grep repo | 📌 EF-06 — perlu profil paket + routing webserver + acceptance host |
| P1 | **Key AI/Push dapat dibaca dari DB lalu env; flag izin AI terpisah** — `settings.service.ts:19–25` muat DeepSeek/Tuya/VAPID dari DB saat boot; `push.service.ts:35–40` DB dulu, env fallback | `settings.service.ts:18–26`, `push.service.ts:20–41` | 📌 EF-07 — "kosongkan env" TIDAK memadai; ukur konfigurasi efektif |
| P1 | **make-deploy README menawarkan cron IoT** yang M08:666 larang | make-deploy:578–580 vs M08:666 | ✅ EF-05 lokal: contoh cron IoT di generator dihapus; artefak host UNKNOWN |
| P1 | **bundle-deploy duplikasi packaging** (make-deploy + npm ci lagi + arsip lagi) | bundle-deploy:65–67, 85–97, 128 | ✅ EF-05 lokal: wrapper delegasi tunggal; deployment UNKNOWN |
| P1 | **Shutdown hooks belum terbukti** — `main.ts` hanya pasang `beforeExit`, bukan SIGTERM | `prisma.service.ts:74–78` (`process.on('beforeExit')`), `main.ts:88` | 📌 EF-08 — rehearsal stop/restart |
| P2 | **Static streaming, bukan seluruh SPA di heap** — `main.ts:209–224` `useStaticAssets`+`sendFile` | `main.ts:209–224` | 📌 koreksi klaim "penghemat idle RAM terbesar" — potensi di request/gzip CPU/wakeups, bukan idle RSS |
| P2 | **Estimasi cPanel 50 MB + Postgres 80–150 MB tidak boleh dijumlah** tanpa tahu proses mana masuk LVE akun | M08:303 | 📌 PMEM LVE = sumber keputusan |

> **Catatan kontrak routing (dari audit):** kandidat static split = satu origin, Passenger root `/`, dokroot = artefak Vite publik, `/api/*` diteruskan path utuh ke Nest (`setGlobalPrefix('api')` main.ts:90). Kontrak: `/api/public/rooms` → JSON 200 · `/api/stays` tanpa auth → 401 · `/api/tidak-ada` → JSON 404 · `/login`, `/portal/stay` → HTML SPA · `/assets/hilang.js` → 404 · publik hanya `/uploads/room-images/*` + `/api/uploads/room-images/*` (main.ts:61–86) · bukti bayar tetap bearer `/api/payment-submissions/proofs/:filename` · cookie `Path=/api/auth` HttpOnly Secure (auth.controller) + `withCredentials:true` (client.ts:11) · SW tolak cache `/api/*` kecuali gambar kamar (sw.js:52–79).

## 4. Jalur Arsitektur

| Jalur | Keputusan dan lingkup | Status |
|---|---|---|
| A — Tanpa rewrite | Satu proses API sebagai target; prebuilt lokal, AutoOps interval OFF dan cron token-protected sesuai profil, IoT on-demand tanpa cron Tuya. Static split dievaluasi setelah baseline dan kemampuan routing host jelas. Jangan hapus fitur bisnis/key DB. | Arah aktif; tidak membuktikan host cukup dan bukan izin deploy |
| B — Worker atau pembatasan graph modul | Hanya kandidat EF-09 bila bounded AutoOps terbukti gagal budget; perlu anggaran overlap, atomisitas/idempotensi dan keputusan desain. | DITUNDA; jangan implementasikan |
| C — Hosting lebih besar | Alternatif bila pengukuran menunjukkan kapasitas tidak cukup; kebutuhan/biaya diputus owner berdasarkan bukti. Tidak perlu migrasi stack sebagai asumsi awal. | Belum diputus |
| MA — Batas Modul & Kesiapan Ekstraksi | Nama pengganti rencana arsitektur V5.7/V5.8/V5.9. Modul tetap di struktur sekarang; tidak membuat apps/libs sebagai pekerjaan kosmetik. | Audit diterima, implementasi DITUNDA; bukan PASS migrasi |

Multi-proses belum terbukti layak pada hosting ini; tidak bisa dinyatakan pasti gagal dari penjumlahan estimasi. Accounting/deposit/audit atomik tetap dalam transaksi sekarang; kepemilikan shared service belum diputus. Pasca-commit bukan otomatis aman diekstrak.

## 5. Peta dependensi 10 mikrotask (bukan izin eksekusi otomatis)

| # | Tindakan | Catatan |
|---|----------|--------|
| 1 | **Baseline deployment (EF-00)** | Catat SHA/dirty, entrypoint (`dist/main.js`), versi Node/Prisma, jumlah instance, LVE limit/fault, metode start + dokroot, tanpa secret. Jangan simpulkan host cukup. |
| 2 | **Telemetri lokal opsional (EF-01)** | Log JSON PID/uptime/RSS/heap/external/arrayBuffers/heap limit + label operasi/durasi; tanpa secret/PII/endpoint publik/dependensi baru; timer `unref()`; mati via flag. |
| 3 | **Baseline workload terkontrol (EF-02)** | Cold start, idle hangat, aset/static burst, dashboard/report, upload legal maks, AutoOps bersamaan aktivitas normal (tanpa menambah cron IoT), stop/restart. Load generator dari klien luar host. Ambil peak proses + peak PMEM akun. |
| 4 | **Hilangkan Prisma provider ganda (EF-03)** | ✅ **Implementasi lokal selesai** — `reports.module.ts` memakai `PrismaModule` global. Registrasi ganda dihapus; jumlah pool/koneksi host belum diukur. |
| 5 | **Profil paket static (EF-04)** | Pisahkan application root/private dari public/ Vite; tambah profil di fingerprint/build marker; update `verifyNoLongLivedIotStream`, required archive, eksklusi `.env`/`uploads`. |
| 6 | **Sederhanakan packaging wrapper + README (EF-05)** | Satu jalur install/arsip/verifikasi; buang README lama yang dioverride (make-deploy:509–553 → 556–589); hapus contoh cron IoT dari generator (bertentangan M08:666). |
| 7 | **Kontrak routing + canary host (EF-06)** | Satu origin, Passenger root `/`, dokroot = artefak Vite publik, `/api/*` path utuh; uji matriks §3.4; rollback profil combined; tanpa perubahan DB. |
| 8 | **Verifikasi effective env/DB scheduler (EF-07)** | `AUTO_OPS_ENABLED=false` + `IOT_TUYA_POLL_ENABLED=false`; JANGAN hapus kunci DB (DeepSeek/Tuya/VAPID dibaca dari DB — `settings.service.ts`, `push.service.ts`); uji false menang atas DB true; cron URL tetap; inbox/pengumuman tidak mati. |
| 9 | **Rehearsal lifecycle & peak (EF-08)** | Stop/start tidak meninggalkan pool/timer; SIGTERM (sekarang hanya `beforeExit`); job idempoten di UAT; sesuaikan hooks hanya bila bukti menunjukkan perlu; jangan ubah jalur uang bersamaan. |
| 10 | **Gate worker CLI (EF-09)** | Hanya bila bounded AutoOps di proses API gagal budget. Desain module graph minimal, `app.close()`, timer nonaktif, lock bersama, timeout, retry/checkpoint; bandingkan PMEM akun API+worker overlap, bukan RSS worker saja; batalkan bila peak lebih buruk. |

> **Belum diizinkan:** penghapusan domain/module, migrasi PHP, turunkan heap 192→160, atau worker baru. Identitas deployment dan pengukuran Passenger adalah langkah berikutnya; implementasi singleton lokal tidak perlu diulang.

## 6. Definisi Task EF-00..EF-09

| Task | Prioritas | Isi | Definition of Done |
|------|-----------|-----|--------------------|
| **EF-00** | 🔴 P0 | Baseline deployment tanpa mengubah runtime: SHA/dirty, entrypoint (`dist/main.js`), versi Node/Prisma, jumlah instance, LVE limit/fault, metode start + dokroot (tanpa secret) | Tabel fakta/unknown di M19; tidak menyimpulkan "host cukup" |
| **EF-01** | 🟡 P1 | **DONE 6 Sep 2026.** Telemetri lokal opsional: log JSON (PID, uptime, RSS, heapUsed/Total, external, arrayBuffers, heap limit, label operasi/durasi); tanpa secret/PII/endpoint publik/dependensi baru; timer `unref()`; mati via flag | Implementasi lokal selesai; audit statis + typecheck dilaporkan lulus, default OFF. Hasil unit lama tidak diklaim ulang; log runtime/host belum diuji |
| **EF-02** | 🔴 P0 | Baseline workload terkontrol: cold start, idle hangat, aset/static burst, dashboard/report, upload legal maks, AutoOps bersamaan aktivitas normal (tanpa menambah cron IoT), stop/restart; load generator dari klien luar host; catat peak proses + peak PMEM akun | Data terekam; estimator vs bukti nyata diberi label; panjang periode sesuai |
| **EF-03** | 🔴 P0 | **Implementasi lokal selesai:** provider duplikat di `reports.module.ts` dihapus, pakai `PrismaModule` global | Audit statis dan typecheck dilaporkan lulus; jumlah instance/pool host UNKNOWN |
| **EF-04** | 🟢 P2 | Profil paket static: pisahkan application root/private dari public/ Vite; tambah profil di fingerprint/build marker; update `verifyNoLongLivedIotStream`, required archive files, eksklusi `.env`/`uploads` | Paket diverifikasi lokal; kedua profil lulus verifikasi |
| **EF-05** | 🟢 P2 | **Implementasi lokal selesai; deployment UNKNOWN.** Sederhanakan packaging wrapper + README: satu jalur install/arsip/verifikasi; buang README lama yang dioverride (make-deploy:509–553 → 556–589); hapus contoh cron IoT (M08:666) | `bundle-deploy` delegasi tunggal; README hasil generate konsisten M08 |
| **EF-06** | 🟢 P2 | Kontrak routing + canary host: template webserver sesuai kemampuan host terkonfirmasi; uji matriks §3.4 (JSON 200/401/404, HTML SPA, 404 asset, image publik, bukti bayar bearer, cookie auth, SW) | Matriks lulus di canary; rollback profil combined; tanpa perubahan DB |
| **EF-07** | 🟡 P1 | Verifikasi effective env/DB: `AUTO_OPS_ENABLED=false` + `IOT_TUYA_POLL_ENABLED=false`; JANGAN hapus kunci opsional DB (DeepSeek/Tuya/VAPID dari DB — settings.service.ts, push.service.ts); uji false menang atas DB true; cron URL tetap jalan; inbox/pengumuman tidak mati | Hasil uji tercatat; tidak ada fitur hilang tanpa alasan terukur |
| **EF-08** | 🟡 P2 | Rehearsal lifecycle & peak: stop/start tidak meninggalkan pool/timer; SIGTERM (sekarang hanya `beforeExit`); job idempoten di UAT; sesuaikan hooks hanya bila bukti menunjukkan perlu | Rehearsal tercatat; shutdown/restart terbukti aman |
| **EF-09** | 🟢 P3 | Gate worker CLI: hanya bila bounded AutoOps di proses API gagal budget; module graph minimal, `app.close()`, timer nonaktif, lock bersama, timeout, retry/checkpoint; bandingkan PMEM akun API+worker overlap, bukan RSS worker saja; batalkan bila peak lebih buruk | Rancangan disetujui; keputusan berbasis PMEM |

**Gate Fase EF:** identitas artefak EF-00 dan baseline EF-02 terukur; verifikasi lokal EF-01/03/05 relevan terhadap artefak tersebut; konfigurasi/lifecycle aman; tanpa regresi `/api`, auth, dan upload bila profil deploy diubah. M12 menyimpan status checklist; server dan dampak saat ini UNKNOWN.

## 7. Batasan & Open Questions

- **Retensi `IotReading`** — belum ada job prune; perlu keputusan owner; kemungkinan schema + sweeper. Ditangguhkan (bukan prioritas awal audit deploy 6 Sep 2026); jangan tambah schema di fase lain.
- **`rawBody` per-rute IoT** — opsional, prioritas rendah; bukan penghemat utama (Multer `diskStorage` tidak lewat body JSON). Ditangguhkan.
- **Instrumen RAM** — EF-01 selesai sebagai telemetri lokal opsional; tidak ada health endpoint publik. `MEMORY_TELEMETRY_ENABLED` default `false`; saat aktif log JSON berisi PID, uptime, RSS, heap, external, arrayBuffers, heap limit, serta label operasi/durasi. Timer memakai `unref()` dan dapat dimatikan tanpa perubahan kode.
- **Passenger instance count** — kode tidak memakai cluster/worker_threads, tetapi itu TIDAK membuktikan Passenger hanya satu instance; perilaku restart dan kemungkinan overlap proses harus dikonfirmasi di host. **Jangan** suruh AI menulis `PassengerMaxInstancesPerApp 1` di `.htaccess` (server-config only; per-app hanya Enterprise).
- **CloudLinux**: PMEM = physical memory proses pelanggan (dapat kill saat limit); EP = koneksi masuk, bukan jumlah worker Node. Catat PMEM + fault + EP/NPROC/CPU/IO dari periode uji yang sama (EF-00/02).
- Deposit settlement (B4), damage/penalty (B5), loyalty/survei, migrasi PHP, turunkan heap 192→160, dan rewrite total **bukan** bagian fase ini dan belum bisa dijustifikasi tanpa baseline.
- **Kondisi working tree:** tidak bersih dan mencakup lintas tugas. EF-01: telemetry/config/app wiring; EF-03: reports.module; EF-05: generator packaging. Perubahan accounting/rent-recognition/dashboard/announcements dan override AutoOps tidak otomatis dinyatakan bagian resmi EF atau lulus runtime. `schema.prisma` (compilerBuild) dicatat terpisah, bukan diasumsikan telemetri. Seed tenant dan M18 adalah domain data/harga. Jangan commit/stash/reset campuran perubahan sebagai syarat audit.
- **Batas telemetri:** payload memori yang ditinjau tidak memuat body/header/query, tetapi interceptor membentuk label dari `request.route?.path ?? request.path`. Fallback path dapat mengandung identifier; klaim bebas PII menyeluruh belum dibuktikan. Tinjau label saat verifikasi aktivasi, tanpa mengubah kode pada sinkronisasi docs ini.

## 8. Sinkronisasi

Dokumen ini harus dijaga sinkron dengan: `backend/src/main.ts`, `backend/src/app.module.ts`, `backend/src/modules/auto-ops/auto-ops.service.ts`, `backend/src/modules/iot/iot-polling.service.ts`, `backend/src/common/config/app-config.service.ts`, `backend/src/prisma/prisma.service.ts`, `backend/src/modules/reports/reports.module.ts`, `backend/src/modules/settings/settings.service.ts`, `backend/src/modules/push/push.service.ts`, `backend/package.json`, `scripts/make-deploy.mjs`, `scripts/bundle-deploy.mjs`, `scripts/golive-combined.mjs`, `docs/M08_DEPLOY_GO_LIVE.md`. Setiap perubahan perilaku deploy wajib mengupdate **M19** (sumber kebenaran) + **M12** (checklist) + **M13** (changelog).

## 9. Pencatatan hosting EF-00 dan EF-02

Isi hanya data yang tersedia dari panel/log/artefak. Nilai kosong tetap **UNKNOWN**, sertakan sumber dan waktu/zona waktu; jangan kirim password, token, connection string, atau key. Tabel §9.1–§9.3 diisi dari snapshot panel 7 Sep 2026 dan **sesi deployment 13 Sep 2026** (izin owner; rincian di [produksi](produksi.md)); tidak ada pengukuran host baru yang dijalankan dalam sesi sinkronisasi dokumentasi ini.

### 9.1 Identitas deployment — isi terlebih dahulu

| Item | Nilai | Sumber/bukti yang diperlukan |
|---|---|---|
| Commit/SHA yang membentuk artefak | Backend: paket 12 Sep dibangun dari `cbca06f`. Klien: tiga build 13 Sep dari working tree (`B70lrG6Auual` → `MhA2UHkaDbmU` → `Mqb2SpEkSw55` → `G2vp1MdZhTRz`). SHA tunggal artefak server: UNKNOWN | M13 2026-09-12/13; perubahan uncommitted ikut pada build klien |
| Artefak server | `kost48-deploy-bundled.tgz` 42.749.795 byte (40,8 MB), SHA-256 `BC9176F2…EEDFD`; `sha256sum` di server **cocok** 13 Sep 2026 WIB | M13 2026-09-13; bukan lagi tebakan |
| Bundle kandidat yang diberikan owner | Folder `kost48-deploy-bundled`: 753 file, 55.310.649 byte; isi bertanggal 18 Agu 2026 WIB; `client/version.json` buildId `1BavS58Sb96-` | Arsip lama; sudah digantikan paket 12 Sep — jangan dipakai |
| Berkas env di dalam bundle | Tidak ada `.env*` di dalam bundle; env dikelola panel cPanel, dan `.env` app root **kalah** dari env panel | Pemeriksaan bundle 7 Sep + temuan 13 Sep (M20 §2, §10) |
| Deklarasi runtime bundle | `package.json` `main: dist/main.js`, Node `>=22.12.0`; runtime server memakai `/home/kost48s1/nodevenv/kost48-prod/22/bin/node` (v22.23.2) | Verifikasi 13 Sep 2026 (M20 §2) |
| Perubahan uncommitted yang ikut artefak | **Ada:** tiga build klien 13 Sep dari working tree (termasuk halaman baru `/cek` dan `/okupansi`); backend dari paket `cbca06f` | M13 2026-09-13 (lanjutan) |
| Waktu deploy terakhir + zona waktu | `2026-09-13` WIB (Asia/Jakarta); jam presisi UNKNOWN | M13 2026-09-13 |
| Versi aplikasi yang dilaporkan terpasang | `1.3.0` (Portal Ringkas); build PWA tersaji `G2vp1MdZhTRz` | M20 §1; nilai lama `v1.2.0` sudah tidak berlaku |
| Node / startup file / application root / document root | Node `22.23.2` (venv); startup `dist/main.js`; app root `/home/kost48s1/kost48-prod`; **document root `/home/kost48s1/public_html`** (Passenger diarahkan dari `.htaccess` di sana); URL `https://kost48surabaya.com`; SSH `api.kost48surabaya.com:4422`, server `batikan.idweb.host` (IDwebhost) | Screenshot panel 7 Sep + bukti deployment 13 Sep (M20 §2) |
| EF-01 telemetri sudah terpasang? | **Ada di paket backend** (`dist/common/telemetry/*`, default OFF); apakah pernah diaktifkan di host: UNKNOWN | Isi paket (M13 2026-09-12); log host belum diperiksa |
| EF-03 singleton sudah terpasang? | Kode paket berasal dari source yang memuat EF-03; perilaku pool/koneksi runtime: UNKNOWN | Audit lokal + M13; bukan verifikasi runtime |
| EF-05 generator kanonik dipakai? | **Ya untuk paket 12 Sep**: dibangun `npm run make-deploy`, dan verifikasi isi arsip (tanpa `seed.sql`/`seed_ORIGINAL.sql`) lulus | M13 2026-09-12 |
| Identitas DB produksi (tanpa kredensial) | PostgreSQL **9.6.22** (EOL Nov 2021) di server yang sama; database produksi `kost48s1_prod26`; DB lama `kost48s1_kost48_prod` dipertahankan utuh; **`_prisma_migrations` tidak ada** sehingga `prisma migrate deploy` tidak boleh dipakai | M13 2026-09-13, M20 §7 |
| Paket lokal siap unggah | `kost48-deploy-bundled.tgz` 42.749.795 byte, SHA-256 `BC9176F2…EEDFD`, build PWA `B70lrG6Auual`; **diunggah, checksum diverifikasi, dan dipasang 13 Sep 2026** | FAKTA file lokal + verifikasi server 13 Sep |

Baseline server sebelum patch terpasang hanya mewakili versi server itu. Efek patch memerlukan perbandingan pada skenario/periode yang sebanding dengan identitas artefak sebelum/sesudah jelas. Deployment 13 Sep dijalankan atas izin eksplisit owner (M13); tabel ini terisi dari bukti sesi itu, bukan dari uji aktif tambahan.

### 9.2 Konfigurasi panel dan efektif aplikasi

| Item | Nilai panel | Efektif aplikasi | Sumber/catatan |
|---|---|---|---|
| PMEM limit | `512 MB` | Snapshot 7 Sep: `403,34 MB / 512 MB (78,78%)`; 13 Sep: RSS ≈200 MB per proses Passenger | cPanel General Information/Statistics 7 Sep + pengamatan proses 13 Sep (M20 §10.9). Snapshot sesaat, bukan peak; RSS per proses ≠ PMEM akun |
| CPU / IO / EP / NPROC limit | CPU `100%`; IOPS `1.024`; I/O `10 MB/s`; EP `15`; proses `100` | Snapshot 7 Sep: CPU `0%`; IOPS `0`; I/O `0 bytes/s`; EP `2/15`; proses `22/100` | cPanel Statistics 7 Sep; bukan uji beban; EP `2/15` tidak sama dengan jumlah instance Passenger |
| File/inode usage | `75.000` file | `49.651 / 75.000 (66,2%)` | cPanel Statistics 7 Sep |
| Disk akun | volume 1,5 TB | pemakaian akun ±2,2 GB | M20 §2 (13 Sep) |
| PostgreSQL disk usage | — | `48,57 MB` | cPanel Statistics 7 Sep; bukan PMEM PostgreSQL |
| Instance Passenger dan overlap restart | — | **Terjawab sebagian:** 1 proses (`lsnode`) saat idle/observasi; **2 proses hidup bersamaan** sesaat setelah restart, masing-masing RSS ±170–200 MB → **overlap nyata terjadi** | M20 §10.9 + M13 2026-09-13; bila LVE ketat, periksa jumlah proses di cPanel dan pertimbangkan restart aplikasi penuh |
| NODE_OPTIONS / heap limit | `--max-old-space-size=192` | Cap heap berlaku pada proses app; **hanya bisa diset lewat env cPanel**, tidak lewat `.env` | M20 §4 (13 Sep) |
| AUTO_OPS_ENABLED | `false` (wajib) | Timer in-process harus mati; sweep dijalankan cron cPanel tiap 5 menit; row DB `OperationalSetting.autoOpsEnabled` masih `true` | M20 §4, §8; env menang atas DB — jangan menyimpulkan konfigurasi dari DB saja |
| IOT_TUYA_POLL_ENABLED | UNKNOWN; target `false` | UNKNOWN | Tuya on-demand, tanpa cron Tuya (M20 §8) |
| AI_FEATURES_ENABLED / AI_MANUAL_ONLY | UNKNOWN | UNKNOWN | Flag izin/default false dan manual-only; key tersedia bukan bukti fitur aktif |
| DeepSeek key tersedia? | UNKNOWN | UNKNOWN | Cukup ada/tidak dan sumber DB/env; jangan nilai key |
| VAPID lengkap/aktif? | UNKNOWN | UNKNOWN | Jangan hapus key; in-app tetap terpisah |
| MEMORY_TELEMETRY_ENABLED | UNKNOWN | UNKNOWN | Default false; EF-01 ikut paket 12 Sep (`dist/common/telemetry/*`); log hanya bila sudah aktif dan privasinya ditinjau |
| Urutan prioritas env | env cPanel Node.js App (`~/.cl.selector/node-selector.json`) > `.htaccess` > `.env` | Nilai efektif ditentukan env cPanel; dibuktikan penanda nama kamar + `/proc/<pid>/environ` | Temuan 13 Sep (M20 §2, §10); mengubah `.env`/`.htaccess` saja tidak cukup |

### 9.3 Pengamatan pasif — boleh disiapkan tanpa uji aktif

| Pengamatan | Nilai | Sumber / rentang waktu / jenis angka |
|---|---|---|
| Tanggal/jam dan zona waktu | `2026-09-07 WIB (Asia/Jakarta)` (panel) dan `2026-09-13 WIB` (sesi deployment); jam persis UNKNOWN | Snapshot panel 7 Sep + M13 2026-09-13 |
| Aktivitas saat diamati | 7 Sep: tidak ada job atau beban yang dipicu sesi. 13 Sep: deploy nyata (bootstrap DB, extract paket, restart), smoke test HTTPS, penerbitan dua halaman operasional | M13 2026-09-13; pengamatan sesaat, bukan uji beban |
| PMEM akun | `403,34 MB / 512 MB (78,78%)` pada 7 Sep; PMEM akun 13 Sep tidak dibaca | Snapshot sesaat; bukan rata-rata atau peak |
| RSS per proses Passenger | 13 Sep: ≈200 MB saat smoke test; ±170–200 MB saat dua proses hidup bersamaan | Pengamatan proses (M20 §10.9); data pelengkap, bukan pengganti PMEM akun |
| CPU / IO / EP / NPROC pemakaian | CPU `0/100%`; IOPS `0/1.024`; I/O `0 bytes/s / 10 MB/s`; EP `2/15`; proses `22/100` (7 Sep) | Snapshot panel yang sama dengan PMEM |
| Waktu respons API | `/api/public/rooms` ≈0,3 s pada 13 Sep setelah restart | M13 2026-09-13; satu titik ukur, bukan rata-rata/peak |
| Fault counter tiap resource yang tersedia | UNKNOWN | Catat awal/akhir interval dan perubahan, bukan hanya total tanpa waktu |
| Keterbatasan panel/sampling | UNKNOWN | Metrik yang tidak tersedia, interval agregasi, potensi puncak tidak tertangkap |

Gunakan panel **Setup Node.js App/Application Manager** untuk identitas startup dan **Resource Usage** untuk limit/pemakaian/fault. Nama/menu bisa berbeda antarhost; bila tidak tersedia, jangan memasang instrumen atau mengubah konfigurasi sendiri.

### 9.4 Uji aktif — rencana; sebagian terjalankan pada deployment 13 Sep 2026

| Skenario | Bukti yang dicatat | Status |
|---|---|---|
| Restart/cold start dan kemungkinan overlap | Identitas artefak, PID/jumlah instance, waktu siap, PMEM peak/fault | **SEBAGIAN (13 Sep):** restart `kill -TERM` + revive Passenger dijalankan saat deploy; 1 proses saat idle lalu 2 proses bersamaan teramati (RSS ±170–200 MB). Jumlah PID tercatat, PMEM peak/fault dan waktu siap belum |
| Burst aset static | Jenis/jumlah request, waktu, CPU/IO/PMEM peak | RENCANA |
| Dashboard/laporan berat | Skenario, durasi, resource/fault | RENCANA |
| Upload dalam batas aplikasi | Ukuran/jenis fixture aman, durasi, PMEM/fault; tanpa PII | RENCANA |
| AutoOps bersamaan beban yang disetujui | Durasi/lock, CPU/PMEM/fault, tanpa menambah cron IoT | RENCANA |
| Routing/canary dan rollback | Matriks §3.4; API/auth/upload/SPA; profil yang diuji | **SEBAGIAN (13 Sep):** deploy backend+klien, deploy klien tanpa restart, rollback kode dari `~/backups/`, dan rollback DB lewat pengalihan `DATABASE_URL` env sudah dijalankan; canary/bucket routing belum diuji |

Aktivitas yang memicu perubahan data membutuhkan izin dan lingkungan/fixture yang sesuai. Menyusun tabel bukan izin restart, cron, uji beban, konfigurasi server, deploy atau DB. Jangan menjalankan tahap aktif hanya karena observasi pasif selesai.

### 9.5 Jika metrik tidak tersedia

Owner dapat menanyakan kepada support: limit PMEM/CPU/IO/EP/NPROC; pemakaian dan fault pada rentang waktu tertentu; jumlah instance Passenger serta perilaku overlap restart; versi Node/startup file; ketersediaan data historis dan interval sampling. Agent tidak menghubungi support atas nama owner tanpa izin. Jika jawaban belum ada, pertahankan UNKNOWN; tidak perlu mengulang audit lokal.

## 10. Pemeliharaan status

M12 menyimpan checklist tunggal; bagian §6 di sini adalah spesifikasi/DoD, bukan antrean terpisah. M13 menyimpan riwayat bukti bertanggal. Bila hasil hosting tersedia, isi §9 sesuai sumber, cocokkan artefak, lalu perbarui M12/M13. Jangan menyalin tabel isian kosong ke banyak dokumen atau menyatakan PASS hanya dari typecheck.
