# TASK-AIDL-01a — kontrak kartu keputusan: 5 field tambahan

> **Blok baca** · Jenis: **dokumen kerja tugas (kontrak kerja + catatan goal/todos, bukan antrean)** · Status: **aktif — belum ada kode ditulis** · Untuk siapa: agen yang mengerjakan increment ini
> · Baca kalau: mengerjakan atau menilai `AIDL-01a`. · **Jangan** dibaca kalau: memilih tugas (itu [ANTREAN](../ANTREAN.md) §3) atau mencari rancangan kartu lengkap (itu [product/portal-owner-admin.md](../product/portal-owner-admin.md) §10).

Increment ini adalah bagian pertama dari `AIDL-01` ([ANTREAN §3](../ANTREAN.md)); `AIDL-01b` (mesin kartu aturan lintas role + fallback) dan `AIDL-02a/b` (shell `/cepat`) menyusul sebagai increment terpisah dengan dokumen/boksnya sendiri.

## Goal & todos

**Goal.** Tipe `ActionQueueItem` punya **5 field tambahan** — `sebab`, `dampak`, `sourceRefs[]`, `expiresAt`, `fallback` — **di tipe yang sudah ada** (bukan kontrak paralel), dan **seluruh consumer lama tetap terkompilasi**. **Bukan** bagian increment ini: mesin kartu aturan (itu `AIDL-01b`) dan halaman `/cepat` (itu `AIDL-02a`).

**Bukti penutup — terisi 11 Okt 2026.** Build frontend `exit 0` (`tsc -b` lulus, `vite build` 44,98 s, PWA `qEDSp80ZMc1w`, `chunks=162`) · **test baru 12/12 lulus** (`npx vitest run src/test/unit/decisionCardNormalize.test.ts`) · **seluruh test frontend 180/180 lulus di 36 berkas** (bukti tidak ada test lain yang rusak) · berkas diubah: `ActionQueueTable.tsx` (+5 field opsional), `utils/decisionCard.ts` (baru), `src/test/unit/decisionCardNormalize.test.ts` (baru). **Batas:** test baru menguji fungsi normalisasi murni, **bukan** render komponen; dan **belum ada layar yang memakai** kelima field itu (`AIDL-01b` yang memakainya).

| # | Langkah | Status |
|---:|---|---|
| 1 | Catat baseline: tipe di `ActionQueueTable.tsx` + 4 consumer + util dedupe | **selesai** |
| 2 | Tambah 5 field **opsional** ke tipe (field lama tidak diubah) | **selesai** |
| 3 | Satukan normalisasi/validasi di satu helper bersama (jangan tersebar di halaman) | **selesai** |
| 4 | Test kecil: field lama tetap valid · `fallback` benar saat AI mati · `expiresAt` lewat ditandai | **selesai** |
| 5 | Build frontend + pastikan 4 consumer tetap kompilasi | **selesai** |
| 6 | Isi baris "Bukti penutup" + commit (satu increment = satu commit) | **selesai** |

## 1. Tujuan & definisi selesai

**Tujuan.** Menyiapkan kontrak kartu keputusan yang dipakai **semua role** (OWNER/ADMIN/STAFF/TENANT) tanpa membuat tipe kedua, sehingga `AIDL-01b` bisa membangun mesin kartu **aturan** di atasnya dan `AIDL-03/04` hanya menambah kualitas (sebab/prioritas) dari AI.

**Definisi selesai (dapat diperiksa).**

1. `ActionQueueItem` (satu-satunya tipe kartu) memuat kelima field baru sebagai **opsional** — kode lama yang belum mengisinya tetap valid.
2. Tidak ada tipe/kontrak kartu kedua di repo (gate `AIDL-01`).
3. Normalisasi (mis. `sourceRefs` kosong, `expiresAt` lewat) ada di **satu** helper, bukan disalin per halaman.
4. Build frontend lulus (`tsc -b` + `vite build`).
5. Test kecil menutup: field lama tetap valid · kartu `fallback` saat AI mati · kartu kedaluwarsa ditandai.
6. Baris "Bukti penutup" di boks atas terisi: perintah, jumlah test, commit.

## 2. Kondisi awal + cara mengukur ulang

Diverifikasi 10 Okt 2026 (bukan ingatan):

| Fakta | Bukti |
|---|---|
| Tipe `ActionQueueItem` **sudah ada** | `frontend/src/components/command-center/ActionQueueTable.tsx` — `export type ActionQueueItem` |
| Consumer yang harus tetap kompilasi | 4 halaman mengimpor tipe ini: `InvoicesPage.tsx`, `StaysPage.tsx`, `DashboardAdmin.tsx`, `AdminWorkspaces.tsx` |
| Field lama + artinya | tabel "Sudah tersedia di `ActionQueueItem`" di [portal-owner-admin §10](../product/portal-owner-admin.md) |
| 5 field yang ditambahkan | tabel "Field yang masih perlu ditambahkan" di dokumen yang sama |

**Dari dokumen (belum saya periksa ulang di sesi ini, verifikasi saat implementasi):** util dedupe `frontend/src/utils/commandCenterDedup.ts` (`getCommandDedupKey`/`dedupeCommandItems`) dan helper deep-link `openActionTarget()`.

**Cara mengukur ulang:** `git grep -n "export type ActionQueueItem" frontend/src` · `git grep -ln "ActionQueueItem" frontend/src | measure` · `npm run build` (cwd `frontend`).

## 3. Langkah (dari risiko terendah)

1. **Baseline**: catat daftar consumer + util dedupe (perintah di §2) supaya penambahan field tidak menyentuh perilaku lama.
2. **Tambah field opsional** ke tipe yang ada; tidak menyentuh field lama, tidak menyentuh UI.
3. **Helper normalisasi bersama** — satu berkas, dipakai calon pemanggil (mesin kartu `AIDL-01b`).
4. **Test kecil** — satu berkas test, fokus tiga kasus di definisi selesai butir 5.
5. **Build + review diff consumer** — pastikan 4 halaman tidak perlu diubah (kalau perlu, itu sinyal desain field salah: kembali ke langkah 2).
6. **Tutup**: isi "Bukti penutup", commit (`KERJA-KECIL-COMMIT`), update baris `AIDL-01` di ANTREAN §3 bila seluruh `AIDL-01` selesai (bukan di increment ini).

## 4. Jebakan nyata yang sudah terukur

- **Kontrak paralel.** Menambah tipe baru "biar rapi" langsung melanggar gate `AIDL-01`; tipe yang ada **wajib** diperluas di tempatnya ([default-dev §10a](../operations/default-dev.md) pola yang sama: jangan menyalin aturan).
- **Field wajib yang memecahkan consumer.** Kalau kelima field dibuat **wajib**, 4 halaman langsung gagal kompilasi — itu sebabnya opsional.
- **Angka di dalam kartu.** Kartu tidak boleh mengarang angka: `sourceRefs[]` wajib menunjuk snapshot/endpoint nyata ([portal-owner-admin §10](../product/portal-owner-admin.md) aturan 3).
- **`expiresAt` tanpa efek.** Kalau ditambahkan tetapi tidak ada yang membacanya, kartu basi tetap tampil sebagai fakta — normalisasi harus menandai, bukan menyimpan mentah.

## 5. Kalau macet (gejala → sebab → tindakan)

| Gejala | Sebab paling sering | Tindakan |
|---|---|---|
| Build gagal di salah satu dari 4 halaman | field dibuat wajib, atau nama field bentrok dengan yang sudah ada (`type`, `subject`) | jadikan opsional; cek nama terhadap tabel field lama di §10 |
| Test sulit ditulis | helper normalisasi belum dipisah dari komponen UI | pindahkan logika ke fungsi murni, uji fungsinya (bukan render) |
| Muncul keinginan membuat tipe kedua | tipe lama dianggap "tidak cocok" | berhenti — baca gate `AIDL-01`; perluas di tempat atau angkat sebagai keputusan ke [TANYA-OWNER](../kerja/TANYA-OWNER.md) |

## 6. Catatan penyimpangan

Belum ada. Setiap penyimpangan dari kontrak ini dicatat di sini **pada sesi yang sama**.

## 7. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-10 | Dibuat sebagai **contoh pertama** boks "Goal & todos" permanen (keputusan owner `LOG-GOAL-TODOS-PERMANEN`, pilihan c). Belum ada kode ditulis; isi goal/todos diambil dari gate `AIDL-01` di [ANTREAN §3](../ANTREAN.md) + kontrak kartu di [portal-owner-admin §10](../product/portal-owner-admin.md). |
