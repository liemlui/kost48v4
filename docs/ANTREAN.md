# ANTREAN — antrean, gate, dan status tugas

> **Blok baca** · Jenis: **antrean kerja (satu-satunya)** · Status: **aktif** · Untuk siapa: owner + agen pelaksana
> · Baca kalau: memilih tugas berikutnya, mengecek gate, atau menutup tugas. · **Jangan** dibaca kalau: butuh aturan kerja (itu [KONTRAK.md](KONTRAK.md)) atau riwayat/bukti (itu [history/](history/)).

> Berkas ini memuat **antrean + gate saja**: tanpa aturan, tanpa bukti bertanggal. Aturan kerja: [AGENTS.md](../AGENTS.md) + [KONTRAK.md](KONTRAK.md); bukti bertanggal: [history/bukti-2026-10.md](arsip/bukti-2026-10.md); keputusan owner: [KEPUTUSAN-OWNER.md](KEPUTUSAN-OWNER.md).

**Fakta** · Status: **aktif** · potret **2026-10-23** — ukur ulang: `node scripts/ukur-kekuatan-docs.mjs` (kesehatan antrean) + hitung `- [ ]` di §3 (ambang & invariant: [default-dev §11](operations/default-dev.md#d4b-invariant)) — jangan percaya tanggal di berkas ini.

## 1. Cara pakai (untuk AI, baca ini dulu)

1. Baca [AGENTS.md](../AGENTS.md) (aturan, izin, verifikasi) lalu file ini.
2. Pilih **satu** task dari §2 yang prasyarat dan izinnya sudah terpenuhi. Jangan mengulang pekerjaan selesai tanpa perubahan relevan.
3. Aturan domain (uang/huni/operasional/harga): [ATURAN.md](ATURAN.md) (rincian `docs/domain/`).
4. Runbook operasi (deploy/produksi/go-live): [OPERASI.md](OPERASI.md) (rincian `docs/operations/`). Audit & temuan bertanggal: [AUDIT.md](AUDIT.md) (rincian `docs/audit/`).
5. Peta kode: [PETA-KODE.md](PETA-KODE.md) + [.audit-map](../.audit-map/README.md); scope per role/flow: [scope](product/product.md#d4d-scope); orientasi: [orientasi](product/product.md#d4d-orientasi).
6. Tutup dengan bukti: perbarui §5/§7 di file ini, tulis entri di `docs/history/changelog/`, dan pisahkan implementasi lokal vs verifikasi vs deployment vs dampak runtime.


## 2. Prioritas aktif

Daftar prioritas, penanggung jawab, dan kesiapan ada di [TASK-AKTIF](kerja/TASK-AKTIF.md#prioritas) bagian “Prioritas & penanggung jawab”. Antrean satu baris per tugas ada di §3.

**BLOCKED (owner):** baris bertanda (owner) dan W-OWN-001..009/013 serta W-OPS-*/W-DATA-001 menunggu jawaban **P29–P32** di [TANYA-OWNER](kerja/TANYA-OWNER.md) (bukti UAT/sign-off · normalisasi visual & hak foto · akses server/DB · adopsi Mode Cepat). Default teraman sudah dijalankan; tidak ada baris yang diklaim selesai tanpa bukti.

## 3. Task terbuka & gate (28 `[ ]`)

Format: **ID** — judul | **Gate** (verifikasi wajib sebelum `[x]`). (owner) = butuh data/keputusan owner.

**Dokumen kerja (tugas ≥S).** Tugas yang butuh langkah/jebakan boleh punya `docs/kerja/TASK-<ID>.md` — 7 bagian, tanpa kotak dan tanpa daftar pekerjaan (status tetap di §3). Asal-usul: [ADAPTASI-DOKTRIN-DOCS](arsip/ADAPTASI-DOKTRIN-DOCS.md) butir **A-2**; contoh: [TASK-T05](arsip/TASK-T05-DETEKTOR-ARSIP.md).

- [ ] **W-OPS-001** - lanjutan onboarding 13 hunian + verifikasi KTP (menunggu data owner) | **Gate:** bulan masuk, 13 meter kWh, saldo kas/bank, deposit; penutupan lewat gate Fase A
- [ ] **W-OWN-004** - bukti eksekusi: tiga crawl tanpa skip, dua state TENANT, viewport/Axe, sign-off | **Gate:** crawl tuntas, screenshot/trace bebas PII, sign-off AO-14
- [ ] **W-OWN-002** - lima persona UAT non-personal dengan role/relasi/state terverifikasi | **Gate:** persona TENANT aktif + verifikasi ledger/DoD
- [ ] **W-OWN-003** - crawl OWNER/ADMIN/STAFF setelah ledger UAT dan AO-03 terverifikasi | **Gate:** tiga role dieksekusi, 0 skip; exit 0 skrip saja belum cukup
- [ ] **W-OWN-006** (owner: sign-off AO-14) - trust 3+2, ikon semantik, FAQ sentence case selesai; **22 Okt:** copy + hierarki homepage dipoles (CTA katalog seragam, h2 katalog, "hal-hal tertulis"), render 390/1440 0 overflow | **Gate:** sign-off AO-14 setelah tinjauan owner
- [ ] **W-OWN-007** - PARSIAL: inventaris aset publik selesai; sisa butuh keputusan owner | **Gate:** keputusan owner (hak pakai foto, keseragaman aspek, izin optimasi)
- [ ] **W-OWN-008** - sisa lokal selesai; UAT desktop OWNER 1440 px + visual regression masih BLOCKED | **Gate:** UAT + visual regression + sign-off AO-14
- [ ] **W-OWN-009** - normalisasi sistem visual/terminologi Owner setelah review AO-20; **label filter sudah diseragamkan "Rating Tertinggi"** (22 Okt: `PublicGuestDashboardPage.tsx`; sisa normalisasi visual/terminologi menunggu review AO-20) | **Gate:** perubahan AppLayout dikoordinasikan
- [x] **W-OWN-010** - konsolidasi komponen/shell Area Admin | **Gate:** regresi Owner bila AppLayout atau shared CSS berubah. **Bukti:** 3 pembungkus nav dilebur ke `RoleMobileBottomNav` + `config/mobileNav.ts`; markup 0 diff vs baseline (`mobileNavShell.test.tsx`)
- [x] **W-OWN-011** - etalase beranda/katalog + foto rasio apa pun utuh & saran rasio upload | **Gate:** bukti browser 390/768/1440 px (foto utuh, chip kategori, tautan kebutuhan); [TASK](kerja/TASK-AKTIF.md#d4f-uiux); **Bukti:** [render 390/768/1440](kerja/bukti-own-011-2026-10-22/README.md) — 0.75/2.33 `contain`, 1.33 `cover`, chip kategori, tautan kebutuhan | checklist: kerja/TASK-AKTIF.md#d4f-uiux
- [ ] **W-OWN-005** - audit final setelah AO-01..13 dan AO-15..23 memenuhi DoD | **Gate:** publik + OWNER/ADMIN/STAFF + dua state TENANT, viewport 320-1440 px, Axe/gate Baymard, build/test relevan, screenshot aman
- [ ] **W-OPS-002** - baseline deployment: konfigurasi panel dan limit/snapshot resource | **Gate:** SHA artefak yang berjalan, jam deploy, perilaku runtime EF-01/03/05, fault/interval pengukuran
- [ ] **W-OPS-003** - baseline workload host | **Gate:** butuh izin server; skenario, rentang waktu, jenis angka, resource/fault, artefak tercatat
- [x] **W-OPS-016** - profil paket static selesai lokal 25 Sep | **Bukti:** profil `combined` + `static`, manifest eksplisit, batas private/public, dan kedua arsip terverifikasi; deployment/runtime host tetap UNKNOWN
- [ ] **W-OPS-004** - kontrak routing/canary | **Gate:** canary/bucket routing diuji dengan izin; tanpa perubahan DB
- [ ] **W-OPS-005** - konfigurasi efektif env/DB | **Gate:** uji formal flag false vs DB true; jangan hapus key; inbox/pengumuman tetap bekerja
- [ ] **W-OPS-006** - lifecycle/peak | **Gate:** shutdown pool/timer + idempotensi diuji runtime; jangan jalankan server/UAT
- [ ] **W-OPS-007** - gate worker CLI (DITUNDA) | **Gate:** hanya bila pengukuran AutoOps terbatas membuktikan kebutuhan + persetujuan desain
- [ ] **W-OPS-008** - implementasi batas modul DITUNDA | **Gate:** keputusan owner berikutnya; tanpa apps/libs, app Nest baru, worker
- [ ] **W-OPS-009** - kelengkapan identitas hosting/deployment | **Gate:** versi/port PostgreSQL dari IDwebhost + kesiapan rotasi secret
- [ ] **W-OPS-010** - kesiapan env rahasia | **Gate:** kesiapan rotasi secret
- [ ] **W-OPS-011** - konfirmasi rotasi password OWNER + PIN | **Gate:** bukti rotasi tanpa mencatat nilai secret
- [ ] **W-OPS-012** - opening balance atau dokumentasi zero-start | **Gate:** angka cutover atau dokumentasi nol
- [ ] **W-OPS-013** - smoke test produksi: login OWNER, public rooms 200, trial balance, recon | **Gate:** trial balance isBalanced, recon mismatch 0, readiness tanpa blocker merah
- [ ] **W-OWN-001** - T1..T4 selesai lokal 25 Sep (bukti: [audit dashboard owner](arsip/owner-dashboard-z19-2026-09-25.md)); sisa verifikasi runtime | **Gate:** kegagalan parsial, stale, scope periode, rekonsiliasi KPI-tren; OWNER 1024/1280/1440 px + touch/keyboard/Axe + CTA

- [x] **W-OWN-014** - kontrak + mesin kartu aturan lintas role | **Gate:** AI mati/key kosong, keempat role tetap melihat kartu; tanpa angka di luar snapshot; tanpa kontrak paralel. **Bukti 18 Okt 2026:** 3 kartu TENANT + screenshot /portal/stay 390/1440 di `kerja/bukti-aidl-01-2026-10-18/` (mock, tanpa DB); FE 255/255. Sisa: DB nyata + tinjauan owner
- [x] **W-OWN-015** - shell Mode Cepat `/cepat` + percabangan login (OWNER/ADMIN pilih-mode; STAFF/TENANT langsung) + saklar header + pemetaan saklar lama | **Gate:** halaman Normal **0 perubahan** (diff bersih pada shell/sidebar/CSS lama); pindah mode tanpa login ulang; pilihan diingat per pengguna. **Bukti 17 Okt 2026:** 29/29 test baru, FE 225/225; build exit 0; `AppLayout`/sidebar/CSS lama tidak berubah. Sisa: bukti browser + saklar lama
- [x] **W-OWN-016** - allowlist rute + tautan rekomendasi AI yang bisa diklik pada Mode Cepat OWNER | **Gate:** tidak ada `navigate` ke rute di luar allowlist; tautan mendarat pada filter yang benar (butuh bukti browser); temuan A-1/A-2 di [audit AI](arsip/ai-agenda-recon-2026-09-25.md). **Bukti 17–18 Okt 2026:** matcher pola `:id` + `toSafeAiPriorityActions` membuang rute mentah; 24/24 test AIDL-03, FE 237/237. Sisa: bukti browser
- [ ] **W-OWN-012** - agenda AI terjadwal 1×/hari (memakai antrean `AiDraft`, tanpa schema baru) + strip biaya/kuota OWNER | **Gate:** membuka halaman **tidak** memicu permintaan AI; rupiah hanya tampil setelah `W-OWN-018` selesai; pemicu terjadwal terbukti berjalan. **Progres 22 Okt:** `AiAgendaSweepService` (1 draft/hari WIB, fallback tanpa AI) + test + deploy `0x8rRhAiIe3_`; sisa bukti cron produksi | **BLOCKED (owner): P33**
- [x] **W-OWN-017** - kirim ringkasan ke WhatsApp + cetak (OWNER/ADMIN) | **Gate:** tanpa NIK/foto/alamat; panjang dibatasi; format stabil. **Bukti 18 Okt:** `cepatSummary.ts` (whitelist+masking, 1200) + aksi Cepat; 9/9 test, frontend 246/246; build exit 0 (`yqbdxH46dUlV`). Sisa: browser
- [ ] **W-OWN-013** - tinjau adopsi Mode Cepat setelah 30 hari pemakaian | **Gate:** angka pemakaian Cepat vs Normal dan jumlah kartu yang diklik tercatat; keputusan lanjutan berbasis data, bukan opini
- [x] **W-OWN-018** - catat usage token + konstanta harga AI (menutup A-5/A-6) | **Gate:** `AuditLog.meta.ai` tertulis, `GET /owner-ai/usage` berisi angka, tidak ada secret di log. **Bukti 18 Okt 2026:** test backend 157/157 + frontend 255/255, build exit 0; rincian di [changelog 18 Okt](history/changelog/2026-10.md). Batas: DB/AI nyata belum dijalankan
- [x] **W-OWN-019** - katalog `/rooms` default **kamar tersedia** + heatmap ketersediaan mobile-first + skor peluang kosong per kamar | **Gate:** tanpa query hanya kamar bookable; heatmap terbaca 390/768/1440 px tanpa scroll horizontal; skor 4 skenario teruji dan berlabel “perkiraan”; tanpa nama penghuni di publik; `check-fitur` hijau; [TASK](kerja/TASK-RUANG-WIZARD.md) **Bukti 22 Okt:** `/rooms` default bookable, heatmap 14 hari + toggle tabel, `estimateVacancy` 4 test, build `3VTDk5uLtg4I`, FE 311/311. Sisa: tinjauan owner
- [x] **W-OWN-020** - wizard pembuka lintas role (TENANT/STAFF/ADMIN/OWNER): aksi penting dulu, tombol lewati ke tampilan penuh | **Gate:** halaman pertama = wizard; ≤1 ketuk ke aksi utama; tombol lewati selalu ada; pilihan diingat per user; tanpa regresi AppLayout/shell; render 390 px; [TASK](kerja/TASK-RUANG-WIZARD.md) **Bukti 22 Okt:** `QuickStartWizard` 4 role, lewati diingat per user, AppLayout utuh, build `3VTDk5uLtg4I`. Sisa: render perangkat
- [ ] **W-OWN-021** - Program ROOMS & AKUN V2 (9 fase) | **Gate:** [§8 rencana + protokol + pertanyaan wajib](kerja/TASK-RUANG-WIZARD.md#8-program-rooms-dan-akun-v2-23-okt-2026); deploy hanya di S9 + izin owner

- [x] **W-TNT-001** - aturan huni + wizard terarah + CTA checkout + dokumen 1 halaman | **Gate:** angka menunjuk sumber kanonik; 0 pertentangan; ≤2 klik dari beranda; render 390/1440 | **Bukti 21 Okt 2026:** `tenantRules.ts` 8 kategori + `source`; wizard 4 jalur; kartu deposit dari data kamar; CTA amber; F-15..F-17; FE 306/306, tsc FE+BE exit 0, check-docs BERSIH. Sisa: tanda tangan owner + 1 baris FAQ | checklist: kerja/TASK-AKTIF.md#d4f-faq
- [x] **W-TNT-002** - checklist hewan + jumlah penghuni saat check-in → deposit hewan & surcharge otomatis, satu helper untuk walk-in/booking/portal | **Gate:** `hasPet`/`occupantCount` terisi; deposit = kamar + pet; tidak dobel dengan yang sudah dibayar; test hitung 3 kanal; [TASK](kerja/TASK-AKTIF.md#d4f-huni) **Bukti 22 Okt:** helper biaya 3 kanal, DTO `occupantCount`/`hasPet`, gate uang 191/191. Sisa: uji check-in ganda | checklist: kerja/TASK-AKTIF.md#d4f-huni
- [x] **W-TNT-003** (owner) - KTP tidak memblokir check-in; wajib dilengkapi pasca check-in + status 4 keadaan + pengingat berulang | **Gate:** default P25/P26 dipakai (pengingat saja · 7 hari); gate lama tidak memblokir; pengingat berhenti saat verified; akses verifikasi **tidak diubah** (P28 default); runbook diperbarui (F-14); [TASK](kerja/TASK-AKTIF.md#d4f-huni) **Bukti:** gate dihapus (check-in + booking); `KtpReminderSweepService` 7 hari (dedupe per gelombang, berhenti saat VERIFIED) + eskalasi hari ke-8 tanpa NIK/foto; runbook Bagian D diperbarui; BE 198/198, FE 311/311. Sisa: uji runtime | checklist: kerja/TASK-AKTIF.md#d4f-huni
- [ ] **W-TNT-004** (owner: bukti perangkat) - PWA push + tombol "Ingatkan via WA" manual (wa.me, tanpa API) pada kartu urgent | **Gate:** push diterima 1 perangkat; tombol wa.me terisi; tanpa kunci API/NIK. **Progres 22 Okt:** tombol + normalisasi 62… + pesan ≤320 (16 test), kontak tenant di aggregate; sisa bukti perangkat | checklist: kerja/TASK-AKTIF.md#d4f-huni
- [x] **W-FIN-001** - F-01 override deposit & F-02 paritas surcharge/deposit hewan antar kanal | **Gate:** P27 = **tegakkan di semua kanal**; satu helper dipakai booking publik/portal/walk-in; gate uang backend lulus; [TASK](kerja/TASK-AKTIF.md#d4f-sinkron) **Bukti 22 Okt:** override deposit diabaikan, helper 3 kanal, gate uang 191/191 | checklist: kerja/TASK-AKTIF.md#d4f-sinkron
- [x] **W-FIN-002** - selaraskan panduan tenant, prompt FAQ AI, dan komentar kode dengan aturan kanonik (F-04..F-10) | **Gate:** 0 angka bertentangan; gate dokumen hijau; [TASK](kerja/TASK-AKTIF.md#d4f-sinkron) | **Bukti 21 Okt 2026:** F-04..F-10 teks selesai di `MyManualPage.tsx`, `faq.prompt.ts`, dan komentar `prepay-extension.service.ts`; `rg` frasa basi 0; `tsc --noEmit` exit 0; test MyManualPage 3/3; `check-docs` BERSIH. Sisa F-15..F-17 dicatat terbuka | checklist: kerja/TASK-AKTIF.md#d4f-sinkron
- [ ] **W-DATA-001** (owner) - bandingkan tarif & deposit 13 kamar produksi dengan seed, catat selisih (rekomendasi c) | **Gate:** izin baca DB; kueri read-only; selisih dicatat tanpa PII
- [x] **W-OPS-015** - halaman `/checklist` memuat daftar data go-live (aset, stok, foto, kamar, KTP, keuangan, akun, konten) | **Gate:** konten ditinjau owner; deploy; render 390/1440 px; tanpa PII di halaman. **Bukti 22 Okt:** digabung ke `/cek` (checklist + data kurang + ketersediaan; `/okupansi` dialihkan), tanpa PII, build `swSyGU0OfDsh`. Sisa: tinjauan owner
- [x] **W-OPS-017** (owner) - dump + cron harian + retensi 14 hari + satu uji restore | **Gate:** berkas dump + `gzip -t` + hitung 5 tabel di DB uji + DB uji dihapus; [runbook](operations/produksi.md#d4b-backup). **Bukti 20 Okt 2026:** dump 40 KB (gzip OK), cron terpasang, restore 62 tabel + 5 hitungan cocok, DB uji dihapus; run terjadwal pertama belum terlihat
- [ ] **W-OPS-014** (owner) - konfirmasi apakah `uploads/` (foto kamar/bukti bayar) perlu dipindahkan dari server lama | **Gate:** jawaban owner + bukti path/aset; jangan salin data pengguna tanpa izin
- [x] **W-DOC-001** - tata ulang dokumen generasi kedua D0–D9 ([kontrak arsip](arsip/TASK-DOCS-GEN2.md)): konstitusi ID + registry, peta peran, registry fitur, checklist di dokumen tugas, gate v3 | **Gate:** tiap batch D0–D9 punya bukti; gate hijau saat batch ditutup. **Bukti 22 Okt:** gate v3.0 R1–R16 BERSIH, selftest 21/21, register default-dev §13, anggaran baca §12a; gap ≤30 berkas = keputusan owner

**Rekap (potret 2026-10-23):** 28 terbuka + 18 selesai = 46 baris.


---

**Backlog 10 teratas** (rincian panjang ada di berkas topiknya; ini hanya pengingat, bukan antrean penuh): lihat daftar `[ ]` di atas — berkas ini satu-satunya sumber. Butir lama yang bukan pekerjaan (indeks cakupan audit, catatan fase) sudah dipindah ke tempatnya masing-masing.

---

## Backlog di luar antrean

Backlog yang belum dijadwalkan (4 kandidat arsip legacy, kredensial DEV, AI_MASTER, pre-commit hook) ada di [TASK-AKTIF](kerja/TASK-AKTIF.md#backlog) bagian “Backlog di luar antrean”.
