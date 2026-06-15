# INSTRUKSI PEKERJAAN LANJUTAN — KOST48 (untuk AI eksekutor)
**Tanggal:** 2026-06-12 · Baseline: commit `3e7890c` (origin/main) · Penyusun: Fable 5.
**Konteks:** sistem sudah lulus audit mega + UAT runtime penuh (lihat `CHANGELOG.md` 2026-06-12). Dokumen ini berisi 7 pekerjaan lanjutan W-01..W-07. Berbeda dari `04_FIX_INSTRUCTIONS.md`, sebagian tugas di sini MEMBANGUN kode baru — ikuti spesifikasi persis, jangan berimprovisasi di luar yang ditulis.

## ATURAN EMAS
1. Kerjakan **berurutan W-01 → W-07**. Satu tugas = verifikasi lulus = satu commit, baru lanjut.
2. Setelah tiap tugas backend: `cd backend; npx tsc --noEmit` = 0 error. Setelah tiap tugas frontend: `cd frontend; npx tsc --noEmit` = 0 error, dan untuk W-01 juga `npm run build`.
3. **Kondisi BERHENTI** (lewati tugas, catat alasan, lanjut tugas berikutnya — JANGAN memaksa): file/fungsi yang disebut tidak ditemukan; verifikasi gagal setelah 2 percobaan; butuh dependensi baru; butuh keputusan yang tidak tertulis di sini.
4. LARANGAN MUTLAK: jangan tambah dependensi npm; jangan ubah logika pembayaran/auto-ops/akuntansi di luar yang diminta; jangan sentuh `sql/`, schema Prisma, atau database apa pun; jangan jalankan migrasi; jangan push ke remote; jangan kerjakan daftar "BUKAN TUGASMU" di bagian akhir.
5. Pesan commit persis seperti tertulis per tugas.
6. Path relatif terhadap root repo (`final_bundle`).

---

## W-01 [PERF] Route-level code splitting — bundle publik ramping (temuan U-01)
**File:** `frontend/src/App.tsx`
**Masalah:** semua halaman (admin/staff/owner/finance) ikut terbundel & termuat saat calon tenant membuka halaman publik → detail kamar spinner 5–8 detik; build mengeluh chunk >500 kB.
**Spesifikasi:**
1. Ubah import halaman menjadi `React.lazy(() => import('...'))` untuk SEMUA halaman KECUALI yang publik berikut (biarkan eager): `LoginPage`, `ForgotPasswordPage`, `ResetPasswordPage`, halaman home publik (PublicGuestDashboardPage / RoomsRouteEntry), `PublicRoomsPage`, `PublicRoomDetailPage`, `GuestBookingPage` (+ komponen guard/route kecil yang dipakainya).
2. Bungkus `<Routes>` dengan `<Suspense fallback={...}>` — fallback: div tengah berisi `<Spinner animation="border" />` (import dari react-bootstrap).
3. Jangan mengubah path rute, guard `RequireRoles`, atau props apa pun.
**Verifikasi:** `npx tsc --noEmit` 0 error; `npm run build` sukses dan output menunjukkan BANYAK chunk (bukan satu chunk JS raksasa ~1,9 MB; chunk utama diharapkan turun signifikan — catat angka sebelum/sesudah di pesan laporanmu); buka cepat `http://localhost:5173/rooms` (server dev berjalan) — halaman tetap render.
**Commit:** `perf(U-01): route-level code splitting - halaman backoffice lazy, bundle publik ramping`

---

## W-02 [UX] Skeleton pengganti spinner di detail kamar publik (temuan U-01)
**File:** `frontend/src/pages/rooms/PublicRoomDetailPage.tsx`
**Spesifikasi:** ganti blok `{query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}` dengan skeleton layout memakai komponen `Placeholder` dari react-bootstrap (sudah tersedia, bukan dependensi baru): satu Card besar berisi `Placeholder` rasio foto (div tinggi ±320px dengan `Placeholder` as div animation="wave"), di sampingnya kolom dengan 4–6 baris `Placeholder xs={6..12}`. Bentuknya menyerupai layout akhir (foto kiri besar + kartu harga kanan). Jangan ubah logika query.
**Verifikasi:** tsc 0 error; buka `http://localhost:5173/rooms/5/detail` — saat loading terlihat skeleton (bukan spinner), lalu konten normal.
**Commit:** `ui(U-01): skeleton layout menggantikan spinner di detail kamar publik`

---

## W-03 [PERF/UX] Pagination katalog publik (temuan U-02)
**File:** `frontend/src/pages/rooms/PublicRoomsPage.tsx`
**Spesifikasi:**
1. Tambah state `visibleCount` (awal 12). Daftar kartu yang dirender = hasil filter saat ini `.slice(0, visibleCount)`.
2. Di bawah grid, bila masih ada sisa: tombol `Button variant="outline-primary"` berlabel `Tampilkan 12 kamar lagi (X tersisa)` → `setVisibleCount(c => c + 12)`.
3. Saat filter/pencarian berubah, reset `visibleCount` ke 12 (useEffect pada dependensi filter yang sudah ada).
4. Jangan mengubah logika fetch/filter yang ada.
**Verifikasi:** tsc 0 error; `http://localhost:5173/rooms` desktop & lebar 390px — awalnya ±12 kartu, tombol menambah 12, filter mereset.
**Commit:** `perf(U-02): pagination 12-per-klik di katalog kamar publik`

---

## W-04 [OPS-FAIRNESS] Round-robin penugasan tiket otomatis (eskalasi E-7)
**Masalah:** 3 pembuat tiket otomatis selalu memilih staf `orderBy: { id: 'asc' }` → staf ber-ID terkecil kebanjiran tugas.
**Lokasi (cari pola `role: ... STAFF ... isActive: true` + `orderBy: { id: "asc" }` di dalam pembuatan tiket):**
1. `backend/src/modules/stays/stays.service.ts` — method `complete` (tiket CHECKOUT_INSPECTION).
2. `backend/src/modules/auto-ops/auto-ops.service.ts` — `forceCheckoutOverstay` (tiket CHECKOUT_INSPECTION) dan `runOverstayEnforcement` (tiket EVICT_OVERSTAY).
**Spesifikasi:** ganti pemilihan `staffAssignee` di TIGA lokasi itu dengan pola berikut (sesuaikan `tx`/`this.prisma` mengikuti konteks masing-masing — di stays.complete dan forceCheckoutOverstay pakai `tx`, di runOverstayEnforcement pakai `this.prisma`):
```ts
// Audit E-7: pilih staf aktif dengan beban tiket terbuka paling sedikit (seri -> id terkecil).
const staffCandidates = await tx.user.findMany({
  where: { role: "STAFF", isActive: true },
  select: { id: true, _count: { select: { ticketsAssigned: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } } } } } },
});
const staffAssignee = staffCandidates
  .sort((a, b) => (a._count.ticketsAssigned - b._count.ticketsAssigned) || (a.id - b.id))[0] ?? null;
```
Catatan tipe: bila `"STAFF"`/status perlu cast, pakai `as any` mengikuti gaya file; relasi `ticketsAssigned` ada di model User (`Ticket[] @relation("TicketAssignedTo")`). Pemakaian selanjutnya `staffAssignee?.id` tidak berubah.
**Verifikasi:** tsc 0 error. (Perilaku runtime diuji owner saat UAT berikutnya.)
**Commit:** `feat(E-7): penugasan tiket otomatis round-robin berbasis beban tiket terbuka`

---

## W-05 [KONSISTENSI] Batas hari/bulan modul staf pakai WIB (eskalasi E-6)
**Masalah:** checklist staf "hari ini" dan rekap bulanan memakai timezone server; bila server UTC, hari berganti pk 07:00 WIB.
**Langkah a — File:** `backend/src/modules/staff-routines/staff-routines.service.ts` — ganti SELURUH isi fungsi `startOfLocalDate` menjadi:
```ts
function startOfLocalDate(input = new Date()) {
  // Audit E-6: batas hari operasional = WIB (UTC+7), independen dari TZ server.
  const shifted = new Date(input.getTime() + 7 * 60 * 60 * 1000);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
}
```
Lalu di fungsi `isTemplateDue` dan `formatDateKey` (file yang sama), ganti pemanggilan `date.getDay()`/`date.getDate()`/`getFullYear()`/`getMonth()` menjadi varian UTC (`getUTCDay()`, `getUTCDate()`, `getUTCFullYear()`, `getUTCMonth()`) karena tanggal kini dinormalisasi sebagai UTC-midnight-WIB.
**Langkah b — File:** `backend/src/modules/staff-performance/staff-performance.service.ts` — ganti SELURUH isi fungsi `monthRange` menjadi:
```ts
function monthRange(month?: string) {
  // Audit E-6: rentang bulan KPI = kalender WIB (UTC+7).
  const WIB_MS = 7 * 60 * 60 * 1000;
  let year: number; let mon: number;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    year = Number(month.slice(0, 4)); mon = Number(month.slice(5, 7)) - 1;
  } else {
    const nowWib = new Date(Date.now() + WIB_MS);
    year = nowWib.getUTCFullYear(); mon = nowWib.getUTCMonth();
  }
  const start = new Date(Date.UTC(year, mon, 1) - WIB_MS);
  const end = new Date(Date.UTC(year, mon + 1, 1) - WIB_MS);
  return { start, end, key: `${year}-${String(mon + 1).padStart(2, '0')}` };
}
```
Dan di `formatDateKey` file yang sama ganti getter lokal menjadi varian UTC.
**Verifikasi:** tsc 0 error. Bila ada pemakaian lain dari fungsi-fungsi ini yang error tipe → BERHENTI dan laporkan (jangan menambal di tempat lain).
**Commit:** `fix(E-6): batas hari/bulan modul staf berbasis WIB, independen timezone server`

---

## W-06 [OPS] Skrip backup harian database (siapkan file SAJA — jangan eksekusi/registrasi)
**Buat dua file baru:**
1. `scripts/ops/backup_kost48.ps1` (Windows/UAT): pg_dump format custom (`-Fc`) ke folder `backups/` (buat bila belum ada) dengan nama `kost48_<dbname>_yyyyMMdd_HHmm.dump`; parameter `-DbHost`(default localhost) `-Port`(5433) `-DbName`(kost48_v3_pro) `-User`(postgres); password dibaca dari env `PGPASSWORD` (JANGAN hard-code); setelah sukses hapus file backup berumur >14 hari di folder itu; tulis baris log ke `backups/backup.log`.
2. `scripts/ops/backup_kost48.sh` (Linux/produksi): perilaku identik, default port 5432 dbname kost48_v3, retensi `find ... -mtime +14 -delete`, shebang `#!/usr/bin/env bash`, `set -euo pipefail`.
Sertakan komentar header cara registrasi (Task Scheduler harian 02:00 / `crontab 0 2 * * *`). JANGAN menjalankan skrip, JANGAN mendaftarkan scheduler.
**Verifikasi:** PowerShell parse-check: `[scriptblock]::Create((Get-Content scripts/ops/backup_kost48.ps1 -Raw)) | Out-Null` tanpa error; `bash -n scripts/ops/backup_kost48.sh` bila bash tersedia (bila tidak ada bash, catat dilewati).
**Commit:** `ops: skrip backup harian pg_dump + retensi 14 hari (Windows & Linux, belum diregistrasi)`

---

## W-07 [QUALITY] Rangka unit test tahap 1 — fungsi murni jalur uang (eskalasi E-8)
**Prasyarat:** jest sudah ada di devDependencies backend (Nest bawaan). Bila `npx jest --version` gagal di folder backend → BERHENTI, catat.
**Buat file test BARU di `backend/test/unit/` (buat folder bila perlu) — HANYA menguji fungsi murni, TANPA database/mocking Prisma:**
1. `pricing.helper.spec.ts` → import dari `../../src/modules/tenant-bookings/pricing.helper`:
   - `calculateRentByPricingTerm(2000000, term)` untuk tiap term = DAILY 260000, WEEKLY 900000, BIWEEKLY 1500000, MONTHLY 2000000, SMESTERLY 11000000, YEARLY 20000000.
   - pembulatan ke atas 5000: `calculateRentByPricingTerm(1234567, 'MONTHLY')`… MONTHLY tidak membulatkan input? (multiplier 1 × 1234567 → roundUp → 1235000) — uji nilai itu.
   - `roundUpToNearest(0)` = 0; nilai negatif = 0.
   - `isUtilitiesIncludedForPricingTerm`: true utk DAILY/WEEKLY/BIWEEKLY, false utk MONTHLY/SMESTERLY/YEARLY.
2. `stays-helpers.spec.ts` → import `calculatePeriodEnd` dari `../../src/modules/stays/stays.helpers`:
   - MONTHLY dari 2026-01-31 → klaim clamp akhir bulan (verifikasi hasilnya 2026-02-28; bila implementasi memberi tanggal lain yang konsisten-dokumentasi, sesuaikan ekspektasi dengan PERILAKU AKTUAL lalu beri komentar `// snapshot perilaku saat ini`).
   - DAILY +1 hari, WEEKLY +7 hari (gunakan tanggal aman pertengahan bulan, mis. 2026-06-10).
3. `booking-helpers.spec.ts` → import `addCalendarMonthsClamped` dari `../../src/modules/tenant-bookings/tenant-bookings-helpers`:
   - 2026-01-31 +1 bulan = 2026-02-28; 2026-03-31 +1 = 2026-04-30; 2026-06-15 +1 = 2026-07-15.
Gaya: `describe/it/expect`, tanpa snapshot file. Jika sebuah import menarik dependensi Nest/Prisma yang membuat jest gagal load → BERHENTI untuk file itu, catat, lanjut file lain.
**Verifikasi:** dari folder backend: `npx jest test/unit --passWithNoTests=false` → semua hijau. Pastikan `npx tsc --noEmit` tetap 0 error (test di luar tsconfig build? bila tsc mengeluh atas file test, tambahkan `test` ke `exclude` tsconfig build HANYA bila perlu dan catat).
**Commit:** `test(E-8): unit test tahap 1 - fungsi murni pricing, periode sewa, clamp kalender`

---

## SETELAH SEMUA SELESAI
1. `cd backend; npx tsc --noEmit` dan `cd ../frontend; npx tsc --noEmit; npm run build` — semuanya hijau.
2. `git log --oneline -10` — satu commit per W yang sukses.
3. Tulis laporan: per W → SUKSES (+bukti singkat: angka chunk W-01, jumlah test hijau W-07) atau DILEWATI (+alasan persis). JANGAN push.

## BUKAN TUGASMU (jangan disentuh — milik owner/Fable)
- **Deploy produksi** (`docs/06_DEPLOY_RUNBOOK.md`) — dieksekusi owner dengan pendampingan.
- **PWA + push notification** (arsitektur — Fable).
- **U-08** keputusan IA `/portal/bookings` vs `/portal/stay` (butuh keputusan produk; JANGAN redirect — halaman bookings punya alur batalkan-booking sendiri).
- Refresh token / perubahan mekanisme auth; monitoring stack; perubahan apa pun pada payment-submissions, auto-ops, accounting.
