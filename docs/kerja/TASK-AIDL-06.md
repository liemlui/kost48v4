# TASK-AIDL-06 — pengukuran adopsi Mode Cepat (prasyarat tinjauan 30 hari)

> **Blok baca** · Jenis: **dokumen kerja tugas (kontrak kerja + Goal & todos, bukan antrean)** · Status: **aktif — desain selesai; instrumentasi BELUM** · Untuk siapa: agen yang mengerjakan tinjauan adopsi
> · Baca kalau: mengerjakan `AIDL-06`, atau butuh tahu **angka mana yang sudah bisa diukur dan mana yang belum**. · **Jangan** dibaca kalau: memilih tugas (itu [ANTREAN](../ANTREAN.md) §3) atau mencari rancangan Mode Cepat (itu [product/mode-cepat.md](../product/mode-cepat.md)).

## Goal & todos

**Goal.** `AIDL-06` bisa dijawab **dengan data**, bukan opini: (1) terukur berapa pemakaian **Cepat vs Normal** per role per hari, (2) terukur **berapa kartu diklik** per role, (3) sumbernya **tidak** menyimpan PII/isi keputusan. Definisi selesai: kedua angka itu **tertulis di satu tempat** yang bisa dibaca ulang, dan tinjauan 30 hari punya rentang tanggal yang jelas. **Bukan** bagian ini: keputusan lanjutan (itu milik owner setelah data ada).

**Bukti penutup:** _belum diisi — diisi saat instrumentasi selesai (perintah ukur + jumlah test + commit)._

| # | Langkah | Status |
|---:|---|---|
| 1 | Inventaris sumber data yang **sudah** ada (diverifikasi ke kode) | selesai |
| 2 | Tetapkan metrik + tempat penyimpanan + larangan PII | selesai |
| 3 | Instrumentasi: catat peristiwa mode per user per hari | belum |
| 4 | Instrumentasi: catat klik kartu (role + ruleId, tanpa isi) | belum |
| 5 | Test kecil: peristiwa tercatat sekali, tanpa isi keputusan, dan gagal-tulis tidak memblokir UI | belum |
| 6 | Isi "Bukti penutup" + mulai jendela 30 hari | belum |

## 1. Tujuan & definisi selesai

Gate aslinya ([ANTREAN §3](../ANTREAN.md)): *"angka pemakaian Cepat vs Normal dan jumlah kartu yang diklik tercatat; keputusan lanjutan berbasis data, bukan opini."*

Definisi selesai yang bisa diperiksa: (a) satu query menghasilkan **pemakaian per mode per role per hari**; (b) satu query menghasilkan **jumlah klik kartu per role per `ruleId`**; (c) tidak ada kolom yang memuat judul/isi keputusan, nominal uang, atau identitas penghuni; (d) kegagalan pencatatan **tidak** memblokir tampilan (best-effort, sama seperti `AuditLog.meta.ai`).

## 2. Kondisi awal + cara mengukur ulang (diverifikasi 18 Okt 2026)

| Yang dicari | Temuan | Bukti |
|---|---|---|
| Pilihan mode disimpan di mana | **`localStorage` saja** — kunci `kost48_mode:<userId>`, nilai `cepat`/`compact`/`full` | `frontend/src/utils/modeCepat.ts` (`persistModeChoice`), test `pilihModePage.test.tsx` |
| Pemakaian Cepat vs Normal terukur di server? | **Belum.** Tidak ada peristiwa mode yang dikirim ke backend | `git grep` untuk `modeCepat`/`preferredMode` di `backend/src` → 0 |
| Klik kartu dilacak? | **Belum.** Tidak ada pencatatan klik di mana pun | `git grep "cardClick\|trackClick\|klik kartu"` → hanya komentar/kelas CSS |
| Usage token AI | **Sudah ada** (AI-USAGE-01 `[x]`): `AuditLog.meta.ai` + `GET /owner-ai/usage` | `owner-ai.service.ts` (`Catat token usage ke AuditLog.meta.ai`), `owner-ai.controller.ts` `@Get('usage')` |
| Shell Normal boleh disentuh? | **Tidak** — `CEPAT-SHELL-PARALEL` melarang menyentuh halaman Normal | [mode-cepat.md §1](../product/mode-cepat.md) |

**Cara mengukur ulang:** `git grep -n "persistModeChoice\|kost48_mode" -- frontend/src` · `git grep -n "modeCepat\|preferredMode" -- backend/src` · `git grep -n "cardClick\|trackClick" -- frontend/src`.

## 3. Langkah (dari risiko terendah)

1. **Tetapkan peristiwa, bukan skema baru.** Usulkan memakai `AuditLog` yang sudah ada (aksi `UI_MODE_VIEW` dan `DECISION_CARD_CLICK`) dengan `meta` = `{ mode, role, ruleId, route }` — **tanpa** judul/isi kependekatan, nominal, atau identitas penghuni. Tidak ada migrasi schema (aturan repo: schema = task operasional tersendiri).
2. **Titik catat mode** — pilih titik yang **tidak** menyentuh shell Normal: resolusi pasca-login dan shell Cepat (`frontend/src/pages/cepat/CepatShell.tsx`, `frontend/src/pages/auth/LoginPage.tsx` — keduanya tidak sedang dipegang sesi lain pada 18 Okt).
3. **Titik catat klik kartu** — satu handler bersama di komponen kartu keputusan; kirim `ruleId` + role, sekali per klik.
4. **Endpoint** — modul telemetri kecil (berkas baru, didaftarkan di `app.module.ts`) atau perluas kontrak yang **sudah ada** bila endpoint audit menerima aksi bebas; keputusan teknis ini diambil saat implementasi dan dicatat di §6.
5. **Test** — peristiwa tercatat sekali; tidak ada isi keputusan di `meta`; kegagalan menulis tidak memblokir UI.
6. **Mulai jendela 30 hari** hanya setelah instrumentasi terpasang dan satu peristiwa terbukti masuk.

## 4. Jebakan nyata yang sudah terukur

- **Mengukur tanpa sumber = opini.** Hari ini "Cepat vs Normal" hanya bisa dijawab dari `localStorage` perangkat pengguna — tidak bisa dijumlahkan lintas pengguna, dan hilang saat cache dibersihkan.
- **Instrumentasi di shell Normal melanggar keputusan owner.** `CEPAT-SHELL-PARALEL`: halaman Normal tidak disentuh. Karena itu titik catat harus di login + shell Cepat, bukan di `AppLayout`.
- **Membocorkan isi keputusan.** `meta` yang memuat judul kartu/nominal bisa membawa PII ke tabel audit. Batasi ke `ruleId` + role + mode + route.
- **Menulis sinkron di jalur render.** Pencatatan wajib best-effort (try/catch, tidak `await` di render kritis) — preseden `AuditLog.meta.ai` yang gagal tanpa memblokir.
- **Jendela 30 hari dimulai terlalu cepat.** Kalau instrumentasi belum terpasang, 30 hari pertama menghasilkan nol data dan tinjauan tetap berbasis opini.

## 5. Kalau macet (gejala → sebab → tindakan)

| Gejala | Sebab paling sering | Tindakan |
|---|---|---|
| Tidak ada peristiwa masuk setelah login | titik catat dipasang di halaman yang tidak dilewati (mis. hanya `/cepat`) | catat juga saat resolusi pasca-login; uji dengan akun kedua role |
| Angka klik jauh lebih besar dari jumlah kartu | handler terpasang ganda (StrictMode / listener menumpuk) | pastikan pencatatan sekali per klik; uji dengan jumlah harapan eksplisit |
| `meta` memuat isi keputusan | objek kartu dikirim apa adanya | kirim field eksplisit saja (`ruleId`, `role`, `mode`) |

## 6. Catatan penyimpangan

Belum ada. Keputusan teknis saat implementasi (modul telemetri baru vs endpoint audit yang ada) **wajib** dicatat di sini pada sesi yang sama.

## 7. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-18 | Dibuat: desain pengukuran `AIDL-06` setelah recon 18 Okt membuktikan **sumber datanya belum ada** (mode = `localStorage`, klik kartu tidak dilacak). Instrumentasi belum dikerjakan; gate `AIDL-06` tetap terbuka di [ANTREAN](../ANTREAN.md) §3. |
