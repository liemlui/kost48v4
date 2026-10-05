# ANTREAN — antrean, gate, dan status tugas

> **Blok baca** · Jenis: **antrean kerja (satu-satunya)** · Status: **aktif** · Untuk siapa: owner + agen pelaksana
> · Baca kalau: memilih tugas berikutnya, mengecek gate, atau menutup tugas. · **Jangan** dibaca kalau: butuh aturan kerja (itu [KONTRAK.md](KONTRAK.md)) atau riwayat/bukti (itu [history/](history/)).

> Berkas ini menggantikan `docs/ANTREAN.md` sejak batch B5 (2026-10-05). Ia memuat **antrean + gate saja**: tanpa aturan, tanpa bukti bertanggal. Aturan kerja ada di [AGENTS.md](../AGENTS.md) + [KONTRAK.md](KONTRAK.md); bukti bertanggal ada di [history/bukti-2026-10.md](history/bukti-2026-10.md); keputusan bisnis owner di [KEPUTUSAN-OWNER.md](KEPUTUSAN-OWNER.md).

## 1. Cara pakai (untuk AI, baca ini dulu)

1. Baca [AGENTS.md](../AGENTS.md) (aturan, izin, verifikasi) lalu file ini.
2. Pilih **satu** task dari §2 yang prasyarat dan izinnya sudah terpenuhi. Jangan mengulang pekerjaan selesai tanpa perubahan relevan.
3. Aturan domain (uang/huni/operasional/harga): [docs/ATURAN.md](ATURAN.md) — **kanonik sejak Fase 2 (23 Sep 2026)**; rincian per topik di `docs/domain/`.
4. Runbook operasi (deploy/produksi/go-live): [docs/OPERASI.md](OPERASI.md) — kanonik sejak Fase 2; rincian di `docs/operations/`. Status audit dan temuan bertanggal: [docs/AUDIT.md](AUDIT.md) — rincian di `docs/audit/`.
5. Peta kode: [docs/PETA-KODE.md](PETA-KODE.md) (kanonik sejak B5, 23 Sep 2026) + [.audit-map/](../.audit-map/README.md); scope per role/flow: [docs/product/scope.md](product/scope.md); orientasi produk: [docs/product/orientasi.md](product/orientasi.md).
6. Tutup dengan bukti: perbarui §5/§7 di file ini, tulis entri di `docs/history/changelog/`, dan pisahkan implementasi lokal vs verifikasi vs deployment vs dampak runtime.


## 2. Antrean prioritas aktif

| # | Task | Penanggung jawab / kesiapan | Prasyarat dan bukti penutupan |
|---|------|-----------------------------|------------------------------|
| 1 | Onboarding 13 hunian + verifikasi KTP | Owner / menunggu data | Bulan masuk, meter kWh, deposit; penutupan mengikuti gate Fase A. Keputusan owner 23 Sep: gerbang KTP produksi **ditunda**, risiko aktivasi tanpa KTP terverifikasi diterima sementara dan wajib ditinjau sebelum onboarding nyata ([KEPUTUSAN-OWNER](KEPUTUSAN-OWNER.md)) |
| 2 | Opening balance produksi | Owner / menunggu angka cutover | Kas/bank per cutover; bukti rekonsiliasi sesuai aturan keuangan |
| 3 | Cron AutoOps di cPanel | Owner / menunggu pelaksanaan dan bukti | Konfigurasi cron + bukti eksekusi ([OPERASI](operations/go-live-cpanel.md)); keberadaan token saja belum cukup |
| 4 | Ganti password OWNER + PIN owner | Owner / belum ada bukti | Bukti perubahan tanpa nilai secret; rotasi DB/JWT 20 Sep tidak membuktikan password OWNER/PIN selesai |
| 5 | Audit modul kedua — backend auth / BE-002 | AI / **audit statis selesai 24 Sep; addendum T6/T7 25 Sep** | [Laporan](audit/backend-auth-2026-09-24.md): T1/T2 tetap tertutup; T6 (claim reset token) dan logout–refresh T7 tertutup secara statis + unit lewat addendum 25 Sep (build + 12/12 test lulus); interleaving transaksi DB dan runtime/UAT belum dibuktikan. Audit uang P1-04..P1-09 sudah diperiksa 25 Sep (statis, docs-only): P1-04 & P1-05 masih ada, P1-06 & P1-07 indikasi diperbaiki, P1-08 sempit, P1-09 terverifikasi — [laporan](audit/p1-uang-verifikasi-2026-09-25.md); perbaikan source butuh keputusan/izin terpisah |
| 6 | Deploy commit lokal ke produksi | AI + Owner / perlu rencana rilis | Artefak/SHA, diff rilis, target, rollback, izin deploy, bukti smoke |
| 7 | Uji dependency hilang & test nol pada wrapper | AI / **selesai 24 Sep** | Fixture terisolasi membuktikan dependency hilang ditolak exit 4 dan laporan valid dengan 0 test ditolak exit 1; fixture sudah dibersihkan |
| 8 | **Konsolidasi dokumen** | AI / **selesai 25 Sep** | Tahap 3 + Fase 2 + Fase 3 + DOCS-CLEANUP-1 + Tahap 4 selesai. Review akhir menyelaraskan status P1, rumah arsip, dan label path lama; tidak mengubah aturan bisnis. |
| 9 | **IMPACT-01 — ringkasan dampak sebelum/sesudah approve pembayaran** | AI / **implementasi + review independen + FIX-A selesai lokal 25 Sep** | Implementasi awal commit `933bdff5`; review menemukan preview gagal tidak memblokir approve, lalu FIX-A menjadikan preview backend gate wajib di UI. Frontend 3/3 dan gate uang backend 147/147 lulus. **Runtime/browser/DB belum diukur.** Bukti: [review IMPACT-01](audit/payment-impact-review-2026-09-25.md) |
| 10 | **MODE-CEPAT — dua halaman berdampingan (Mode Cepat `/cepat` + Normal) dan agenda AI OWNER** | AI / **dokumentasi + keputusan arah selesai 25 Sep; implementasi belum** | Keputusan owner 25 Sep: dua mode berdampingan; shell paralel `/cepat`, halaman Normal **tidak disentuh**; AI hanya OWNER dan dihitung **terjadwal 1×/hari** lalu disimpan; biaya ditampilkan hanya ke OWNER (target ≤ Rp 50.000/bulan, rupiah menyusul); AI mati → kartu aturan tetap penuh. Rancangan: [mode-cepat.md](product/mode-cepat.md); kontrak kartu: [portal-owner-admin §10](product/portal-owner-admin.md); aturan: [domain/ai.md §G10](domain/ai.md); recon: [audit AI 25 Sep](audit/ai-agenda-recon-2026-09-25.md). Item `AIDL-01`..`AIDL-06` + `AI-USAGE-01` di §3. **Benturan aturan sudah diselesaikan** (`CEPAT-AI-JADWAL`); sisa ketergantungan: pemicu terjadwal (cron AutoOps, prasyarat #3) |

**Aturan prioritas:** kerjakan task teratas yang prasyaratnya terpenuhi dan lingkupnya diizinkan. Bila teratas BLOCKED, lanjutkan pekerjaan independen yang diizinkan. Tabel ini tidak memberi izin baru.


## 3. Task terbuka & gate (29 `[ ]`)

Format: **ID** — judul | **Gate** (verifikasi wajib sebelum `[x]`). 🧑 = butuh data/keputusan owner.

- [ ] **ONBOARDING-HUNIAN** - lanjutan onboarding 13 hunian + verifikasi KTP (menunggu data owner) | **Gate:** bulan masuk, 13 meter kWh, saldo kas/bank, deposit; penutupan lewat gate Fase A
- [ ] **AO-13/14-BUKTI** - bukti eksekusi: tiga crawl tanpa skip, dua state TENANT, viewport/Axe, sign-off | **Gate:** crawl tuntas, screenshot/trace bebas PII, sign-off AO-14
- [ ] **AO-03 P1** - lima persona UAT non-personal dengan role/relasi/state terverifikasi | **Gate:** persona TENANT aktif + verifikasi ledger/DoD
- [ ] **AO-13** - crawl OWNER/ADMIN/STAFF setelah ledger UAT dan AO-03 terverifikasi | **Gate:** tiga role dieksekusi, 0 skip; exit 0 skrip saja belum cukup
- [ ] **AO-18 P2** - PARSIAL: trust 3+2, ikon semantik, FAQ sentence case selesai; kalibrasi copy homepage + sentence case label di-commit `8aa0e975` **apa adanya tanpa build/test dan tanpa verifikasi visual** | **Gate:** polish copy/validasi hierarchy homepage sebelum sign-off AO-14
- [ ] **AO-19 P2** - PARSIAL: inventaris aset publik selesai; sisa butuh keputusan owner | **Gate:** keputusan owner (hak pakai foto, keseragaman aspek, izin optimasi)
- [ ] **AO-20 P1** - sisa lokal selesai; UAT desktop OWNER 1440 px + visual regression masih BLOCKED | **Gate:** UAT + visual regression + sign-off AO-14
- [ ] **AO-21 P2** - normalisasi sistem visual/terminologi Owner setelah review AO-20; **termasuk keputusan label filter** yang kini bercabang: "Rating tertinggi" (homepage, `8aa0e975`) vs kanonik "Rating Tertinggi" (`domain/publik.md`, `PUB-REVIEWS-FILTER` di KEPUTUSAN-OWNER, `ReviewsPublicPage.tsx`, `AdminSurveysPage.tsx`) | **Gate:** perubahan AppLayout dikoordinasikan
- [ ] **AO-23 P2** - konsolidasi komponen/shell Area Admin | **Gate:** regresi Owner bila AppLayout atau shared CSS berubah
- [ ] **AO-14** - audit final setelah AO-01..13 dan AO-15..23 memenuhi DoD | **Gate:** publik + OWNER/ADMIN/STAFF + dua state TENANT, viewport 320-1440 px, Axe/gate Baymard, build/test relevan, screenshot aman
- [ ] **EF-00 P0** - baseline deployment: konfigurasi panel dan limit/snapshot resource | **Gate:** SHA artefak yang berjalan, jam deploy, perilaku runtime EF-01/03/05, fault/interval pengukuran
- [ ] **EF-02 P0** - baseline workload host | **Gate:** butuh izin server; skenario, rentang waktu, jenis angka, resource/fault, artefak tercatat
- [x] **EF-04 P2** - profil paket static selesai lokal 25 Sep | **Bukti:** profil `combined` + `static`, manifest eksplisit, batas private/public, dan kedua arsip terverifikasi; deployment/runtime host tetap UNKNOWN
- [ ] **EF-06 P2** - kontrak routing/canary | **Gate:** canary/bucket routing diuji dengan izin; tanpa perubahan DB
- [ ] **EF-07 P1** - konfigurasi efektif env/DB | **Gate:** uji formal flag false vs DB true; jangan hapus key; inbox/pengumuman tetap bekerja
- [ ] **EF-08 P2** - lifecycle/peak | **Gate:** shutdown pool/timer + idempotensi diuji runtime; jangan jalankan server/UAT
- [ ] **EF-09 P3** - gate worker CLI (DITUNDA) | **Gate:** hanya bila pengukuran AutoOps terbatas membuktikan kebutuhan + persetujuan desain
- [ ] **MA** - implementasi batas modul DITUNDA | **Gate:** keputusan owner berikutnya; tanpa apps/libs, app Nest baru, worker
- [ ] **A1 / F1-12** - kelengkapan identitas hosting/deployment dan kesiapan env rahasia | **Gate:** versi/port PostgreSQL dari IDwebhost + kesiapan rotasi secret
- [ ] **A4** - konfirmasi rotasi password OWNER + PIN | **Gate:** bukti rotasi tanpa mencatat nilai secret
- [ ] **A5** - opening balance atau dokumentasi zero-start | **Gate:** angka cutover atau dokumentasi nol
- [ ] **A6** - smoke test produksi: login OWNER, public rooms 200, trial balance, recon | **Gate:** trial balance isBalanced, recon mismatch 0, readiness tanpa blocker merah
- [ ] **Z-19** - T1..T4 selesai lokal 25 Sep; gate uang 147/147, frontend 18/18, build/PWA lulus; hanya verifikasi manual/runtime terbuka | **Gate:** verifikasi kegagalan parsial, stale, scope periode, dan rekonsiliasi KPI-tren pada runtime; OWNER 1024/1280/1440 px + touch/keyboard/Axe dan CTA; bukti: [audit Z-19](audit/owner-dashboard-z19-2026-09-25.md)

- [ ] **AIDL-01 P1** - kontrak kartu keputusan (`ActionQueueItem` + `sebab`/`dampak`/`sourceRefs`/`expiresAt`/`fallback`) + mesin kartu **aturan** lintas role termasuk jalur fallback | **Gate:** dengan AI dimatikan atau key kosong, OWNER/ADMIN/STAFF/TENANT tetap melihat kartu tanpa galat; tidak ada angka di luar snapshot; tidak ada kontrak kartu paralel
- [ ] **AIDL-02 P1** - shell Mode Cepat `/cepat` + percabangan login (OWNER/ADMIN melihat layar pilih-mode; STAFF/TENANT langsung) + saklar header + pemetaan saklar lama | **Gate:** halaman Normal **0 perubahan** (diff bersih pada shell/sidebar/CSS lama); pindah mode tanpa login ulang; pilihan diingat per pengguna
- [ ] **AIDL-03 P1** - allowlist rute + tautan rekomendasi AI yang bisa diklik pada Mode Cepat OWNER | **Gate:** tidak ada `navigate` ke rute di luar allowlist; tautan mendarat pada filter yang benar (butuh bukti browser); temuan A-1/A-2 di [audit AI](audit/ai-agenda-recon-2026-09-25.md)
- [ ] **AIDL-04 P2** - agenda AI terjadwal 1×/hari (memakai antrean `AiDraft`, tanpa schema baru) + strip biaya/kuota OWNER | **Gate:** membuka halaman **tidak** memicu permintaan AI; rupiah hanya tampil setelah `AI-USAGE-01` selesai; pemicu terjadwal terbukti berjalan
- [ ] **AIDL-05 P2** - kirim ringkasan ke WhatsApp + cetak (OWNER/ADMIN) | **Gate:** tanpa NIK, foto identitas, atau alamat; panjang teks dibatasi; format ringkasan stabil
- [ ] **AIDL-06 P3** - tinjau adopsi Mode Cepat setelah 30 hari pemakaian | **Gate:** angka pemakaian Cepat vs Normal dan jumlah kartu yang diklik tercatat; keputusan lanjutan berbasis data, bukan opini
- [ ] **AI-USAGE-01 P2** - catat usage token + konstanta harga AI (menutup temuan A-5/A-6) | **Gate:** `AuditLog.meta.ai` benar-benar tertulis, `GET /owner-ai/usage` berisi angka, tidak ada secret di log

**Rekap:** 29 `[ ]` = fase changelog 2 · fase AO 8 · fase EF 6 · fase lama 6 · AIDL 6 · AI-USAGE 1 (ID unik 27; AO-13 dan AO-14 muncul dua kali).


---

**Backlog 10 teratas** (rincian panjang ada di berkas topiknya; ini hanya pengingat, bukan antrean penuh): lihat daftar `[ ]` di atas — berkas ini satu-satunya sumber. Butir lama yang bukan pekerjaan (indeks cakupan audit, catatan fase) sudah dipindah ke tempatnya masing-masing.
