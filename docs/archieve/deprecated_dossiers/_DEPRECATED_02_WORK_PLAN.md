# KOST48 V5 — Work Plan (Gabungan Fokus + Next Work)
**Versi:** 2026-06-13 — merge `02_FOCUS_PLAN.md` + `07_NEXT_WORK_INSTRUCTIONS.md` + `09_NEXT_WORK_V513.md`.
**Baseline:** commit `3c7ffe2` (origin/main).
**Tujuan:** Satu dokumen rencana kerja terpadu — peta fokus flow bisnis + instruksi pekerjaan lanjutan yang sudah/spesifik.

> ⚠️ **OTORITAS RENCANA TERKINI (2026-06-13):** Untuk eksekusi pakai `fable5-audit-deep/11_MASTER_ACTION_PLAN.md` (44+ task, sudah memuat 36 keputusan owner & temuan deep V3). W-01..W-07 & W-B01..W-B08 di bawah = referensi historis; beberapa spesifikasinya SUDAH BASI (mis. W-B01 lihat koreksi di §7). Keputusan owner lengkap: `fable5-audit-deep/12_KEPUTUSAN_OWNER.md`. **Temuan besar: sistem belum publish → deploy fresh.**

<!-- KOST48_DOCS_SYNC_20260612_WORK_PLAN -->

---

## 1. Inventori Flow Bisnis — Total: 12 flow utama + 9 job otomatis

Sistem terdiri dari **12 flow bisnis utama** (penomoran mengikuti `01_FLOW_MAP.md`) dan **9 job auto-ops** ("jam biologis" yang berjalan tanpa manusia). Klasifikasi per peran bisnis:

### Kelompok UANG (jalur rupiah — prioritas tertinggi)
| # | Flow | Inti |
|---|---|---|
| 2 | Publik → Booking | Katalog publik, booking tanpa login, booking portal, DP 30%, approve/reject admin |
| 3 | Pembayaran (jantung sistem) | Upload bukti → review admin → approve = aktivasi kamar + jurnal + ledger |
| 4 | Invoice & pembayaran manual | CRUD invoice, issue/cancel, pembayaran manual admin, meter reading |
| 6 | Checkout & Deposit jaminan | Pengajuan → final checkout → inspeksi → settlement deposit + ledger |
| 11 | Akuntansi (Auto Journal Lite + tutup buku) | Jurnal otomatis dari 8+ sumber, readiness gate, auto-close bulanan |

### Kelompok WAKTU (otomatis, tanpa manusia)
| # | Flow | Inti |
|---|---|---|
| 7 | Auto-ops — **9 job** (urut sequential) | ① bookingExpiry ② roomHealer ③ roomReleaseAtNoon ④ downPaymentForfeit ⑤ contractEndReminders (H-7/H-3/H-1/H-day) ⑥ overstayEnforcement (tiket EVICT) ⑦ overstayForcedCheckout (H+1) ⑧ postCheckoutAutoCancel ⑨ accountingAutoClose |

### Kelompok OPERASIONAL FISIK
| # | Flow | Inti |
|---|---|---|
| 5 | Perpanjangan (Renew) | Pengajuan tenant → approve admin → periode baru + invoice (wajib meter) |
| 8 | Tiket & operasional staf | Tiket (manual/otomatis), rutinitas staf, laporan lapangan, KPI, review tenant→staf |
| 9 | Inventaris & barang kamar | Stok gudang, movement, barang per kamar, sinkronisasi 3 jalur |

### Kelompok PENDUKUNG
| # | Flow | Inti |
|---|---|---|
| 1 | Auth & identitas | Login, reset password, manajemen user/tenant, rate limiting |
| 10 | Keuangan operasional | Expense, WiFi sales, aset tetap + depresiasi |
| 12 | Pelaporan, analytics, AI, notifikasi | 8 laporan, dashboard finansial, AI helper, notifikasi in-app, pengumuman |

---

## 2. Matriks Fokus — di mana kuat, di mana lemah

Skala: 🟢 KUAT (sudah audit pass mendalam + fix), 🟡 SEDANG (diverifikasi ringan / ada catatan sadar-risiko), 🔴 LEMAH (belum pernah jadi fokus audit khusus).

| Flow | Fokus | Bukti / yang sudah dilakukan | Yang BELUM |
|---|---|---|---|
| 3 Pembayaran | 🟢 | Pass A penuh; A1,A2,A6–A12,A14,A16,A17 fixed; reversal seragam (A8) | Idempotensi approve di-retry (catatan flow map) |
| 7 Auto-ops | 🟢 (kode) / 🔴 (runtime) | Pass B; A3–A5 redesign; job sequential | Uji end-to-end di UAT (9 job baru/diubah) |
| 6 Checkout & deposit | 🟢 | Pass C; ledger idempotent; fix forfeit sweeper | `reconciliationLite` data nyata |
| 2 Booking & DP | 🟢 | A18 redesign penuh (DP vs jaminan terpisah) | Paritas validasi publik vs portal |
| 4 Invoice manual | 🟢 | A6/A12/A14/A16 fixed | A13: hapus payment invoice PAID (sadar-risiko) |
| 11 Akuntansi | 🟢 (desain) / 🟡 (data) | A8+A11 verified; auto-close ter-gate readiness | Backfill/rekonsiliasi DB nyata |
| 1 Auth | 🟡 | Rate limiting global+auth | Refresh token absen; matriks @Roles belum diaudit menyeluruh |
| 9 Inventaris | 🟡 | Pass F ringan; lock qty di movement; self-healing sync | Skenario double-apply field-report→ticket-close |
| 10 Keuangan ops | 🟡 | Posting jurnal terhubung | Delete expense/wifi → reversal? Depresiasi dobel-run? |
| **5 Renew** | 🔴 | Hanya guard dasar (tolak telat, tolak tunggakan) | Race renew-approve vs noon-release; interaksi renew dengan DP 30% |
| **8 Tiket & staf** | 🔴 | Dipetakan di flow map | Auto-assign selalu staf id terkecil; regex parsing deskripsi rapuh |
| **12 Pelaporan & notifikasi** | 🔴 | Reports tersedia; reminder in-app jalan | Cross-check reports vs trial balance; endpoint AI belum diaudit |

### Kesimpulan — **99% TERTANGANI ✅**
1. ~~Verifikasi runtime & data (Pass G)~~ → TUNTAS: UAT PASS + E-2 backfill + rekonsiliasi mismatch=0.
2. ~~Flow 5 Renew~~ → diaudit Audit Mega + UAT renew PASS. **GAP #2 (DP renewal) BELUM diimplementasikan.**
3. ~~Flow 8 Tiket & staf~~ → Batch 4 Audit Mega FIXED + gate room-ready teruji runtime.
4. ~~Flow 12 cross-check laporan~~ → M-35/M-36 FIXED + cross-check P&L vs trial balance PASS.
5. **Kedalaman keamanan (sisa)** — refresh token + E-1 guard global.

### Item ditunda (bukan blocker per 2026-06-12)
- **E-6 Timezone staf** — mitigasi: TZ server Asia/Jakarta (lihat W-05).
- **E-7 Round-robin assignment** — beban staf masih merata ke id terkecil (lihat W-04).
- **E-8 Unit tests** — belum ada automated test suite (lihat W-07).
- **GAP #1** (partial payment) — **sudah sebagian tertutup** oleh gate dua-nominal-sah A18 (temuan V3 `fable5-audit-deep/01_FLOW_VERIFIED.md`). W-B01 tetap direkomendasikan untuk hardening penuh, bukan blocker.
- **GAP #2** (renewal DP) — masih perlu disesuaikan.
- **GAP #3 #4** — masih perlu disesuaikan (W-B02, W-B03).

---

## 3. Keputusan Owner — 2026-06-11 (D1–D4)

| # | Keputusan | Konsekuensi implementasi |
|---|---|---|
| **D1** | **Tanpa denda keterlambatan.** Forced checkout H+1 + DP hangus + renewal diblokir bila tunggakan. | Kata "denda" dihapus dari reminder. Tipe `PENALTY` tetap ada untuk potongan manual. |
| **D2** | **Notifikasi in-app saja dulu**; ke depan: **PWA dengan push notification**. | Tidak ada integrasi WA/email sekarang. PWA push (VAPID) untuk pengingat nanti. |
| **D3** | **Prioritas: UAT end-to-end + rekonsiliasi data.** | CHECKLIST selesai. |
| **D4** | **Rapikan docs penuh** untuk hemat token. | 5 docs aktif; sisanya di arsip. |

---

## 4. Rencana UAT + Rekonsiliasi (TUNTAS 2026-06-12) ✅

> Hasil: §4.1 inti PASS · §4.2 PASS PENUH · §4.3 PASS (renew) · §4.4 PASS (reconciliation-lite mismatch=0; trial balance seimbang).
> Belum direproduksi runtime: first-paid-wins, expiry 3 jam live, DP-forfeit H+1. Checklist dipertahankan sebagai prosedur baku.

### 4.1 Siklus DP → pelunasan (flow 2+3)
- [ ] Booking portal pilih "DP 30%" → bayar DP → approve → kamar RESERVED, expiresAt mati.
- [ ] Pelunasan sisa + jaminan → approve → kamar OCCUPIED, meter promoted.
- [ ] First-paid-wins + notifikasi tenant kalah.
- [ ] DP dibayar tapi TIDAK dilunasi → H+1 pk 12:00 `runDownPaymentForfeit` → stay batal, jurnal `DP_FORFEIT`.
- [ ] Booking tanpa bayar → expired 3 jam → kamar lepas.
- [ ] Pembayaran manual admin pada invoice booking → DITOLAK.

### 4.2 Siklus kontrak habis → overstay (flow 7)
- [ ] Pengingat in-app H-7/H-3/H-1/H-day.
- [ ] H-day pk 12:00: kamar publik + tiket EVICT_OVERSTAY.
- [ ] H+1 pk 12:00: forced checkout → kamar MAINTENANCE + `allowBookingWhileCleaning=true`.
- [ ] Tenant overstay belum lunas → TIDAK auto-checkout.

### 4.3 Renew & checkout normal (flow 5+6)
- [ ] Renew invoice meter+sewa, periode menyambung tanpa gap.
- [ ] Checkout normal: inspeksi → settlement deposit → ledger cocok.

### 4.4 Rekonsiliasi data
- [ ] `deposit-ledger/reconciliation-lite` → selisih = 0.
- [ ] Cross-check P&L vs trial balance.

---

## 5. Strategi Hemat Token & Quota

- Hanya 5 docs aktif (±60 KB total): `00_GROUND_STATE`, `01_FLOW_MAP`, `02_WORK_PLAN`, `CHECKLIST`, `CHANGELOG`.
- `CLAUDE.md` di root (<3 KB) — pintu masuk sesi.
- Docs basi → `docs/archieve/` (sejarah tetap ada tanpa membebani sesi).
- Satu tugas = satu sesi. Plan Mode untuk tugas besar.
- Batch pertanyaan keputusan dalam satu AskUserQuestion.
- Hindari subagent kecuali benar-benar perlu.
- Jangan minta baca seluruh folder — selalu Grep berpola.

### Routing model (hemat quota)
| Jenis tugas | Model |
|---|---|
| Audit logika, desain, race condition | Model utama |
| Edit mekanis: copy/label, rename, sync docs | Sonnet / Haiku (3–10× lebih hemat) |
| Eksplorasi besar baca-saja | Subagent Explore |

### Kebersihan berkelanjutan
- Setiap rilis: update bagian atas GROUND_STATE (ringkas) + prepend CHANGELOG.
- File docs >30 KB → pecah/arsipkan bagian lama.

---

## 6. Next Work Instructions — 7 Pekerjaan W-01 s.d W-07

> **Aturan emas:** Kerjakan berurutan. Satu tugas = verifikasi lulus = satu commit. Setelah tiap backend: `npx tsc --noEmit` = 0 error. Setelah frontend: `tsc --noEmit` + `npm run build`.
> **STOP condition:** file tidak ditemukan; error setelah 2× perbaikan; butuh npm install baru; butuh keputusan tak tertulis.
> **LARANGAN:** jangan tambah dependensi npm; jangan ubah logika payment/auto-ops/accounting di luar yang diminta; jangan sentuh `sql/`, schema, DB; jangan push.

### W-01 [PERF] Route-level code splitting — bundle publik ramping (U-01)
- **File:** `frontend/src/App.tsx`
- `React.lazy()` untuk semua halaman KECUALI publik: Login, ForgotPassword, ResetPassword, PublicRooms, PublicRoomDetail, GuestBooking.
- `<Suspense fallback={<Spinner />}>` bungkus Routes.
- **Verifikasi:** `tsc --noEmit` 0 error; `npm run build` banyak chunk; `localhost:5173/rooms` tetap render.
- Commit: `perf(U-01): route-level code splitting - halaman backoffice lazy, bundle publik ramping`

### W-02 [UX] Skeleton pengganti spinner di detail kamar publik (U-01)
- **File:** `frontend/src/pages/rooms/PublicRoomDetailPage.tsx`
- Ganti `isLoading` blok spinner dengan skeleton Card + Placeholder (react-bootstrap).
- Jangan ubah logika query.
- Commit: `ui(U-01): skeleton layout menggantikan spinner di detail kamar publik`

### W-03 [PERF/UX] Pagination katalog publik (U-02)
- **File:** `frontend/src/pages/rooms/PublicRoomsPage.tsx`
- `visibleCount` state (awal 12), `.slice(0, visibleCount)`, tombol "Tampilkan 12 lagi (X tersisa)".
- Filter reset → `visibleCount` ke 12.
- Commit: `perf(U-02): pagination 12-per-klik di katalog kamar publik`

### W-04 [OPS-FAIRNESS] Round-robin penugasan tiket otomatis (E-7)
- **Lokasi:** `stays.service.ts:complete` (CHECKOUT_INSPECTION), `auto-ops.service.ts:forceCheckoutOverstay` + `runOverstayEnforcement`
- Pilih staf aktif dengan beban tiket terbuka paling sedikit (OPEN/IN_PROGRESS count). Seri → id terkecil.
- Commit: `feat(E-7): penugasan tiket otomatis round-robin berbasis beban tiket terbuka`

### W-05 [KONSISTENSI] Batas hari/bulan modul staf pakai WIB (E-6)
- **File:** `staff-routines.service.ts` + `staff-performance.service.ts`
- `startOfLocalDate` dan `monthRange` dikonversi ke WIB via UTC+7 shift.
- Commit: `fix(E-6): batas hari/bulan modul staf berbasis WIB, independen timezone server`

### W-06 [OPS] Skrip backup harian database
- **File baru:** `scripts/ops/backup_kost48.ps1` (Windows) + `scripts/ops/backup_kost48.sh` (Linux)
- pg_dump format custom, retensi 14 hari, log ke `backups/backup.log`.
- JANGAN eksekusi/registrasi scheduler. Hanya buat file.
- Commit: `ops: skrip backup harian pg_dump + retensi 14 hari`

### W-07 [QUALITY] Rangka unit test tahap 1 (E-8)
- **File baru:** `backend/test/unit/pricing.helper.spec.ts`, `stays-helpers.spec.ts`, `booking-helpers.spec.ts`
- Fungsi murni: `calculateRentByPricingTerm`, `roundUpToNearest`, `isUtilitiesIncludedForPricingTerm`, `calculatePeriodEnd`, `addCalendarMonthsClamped`.
- Hanya test murni, TANPA database/mocking Prisma.
- Commit: `test(E-8): unit test tahap 1 - fungsi murni pricing, periode sewa, clamp kalender`

---

## 7. Next Work V5.13 — 8 Pekerjaan W-B01 s.d W-B08

> **Aturan:** Kerjakan sequensial. Satu task = verify = satu commit `fix: [task]`. STOP condition jika file tidak ada / error 2× / butuh npm install.

### W-B01 — GAP #1: NO-PARTIAL MENYELURUH (DIGANTI → F1-1R)
- ⚠️ **DIPERBARUI 2026-06-13 (keputusan D-02):** spesifikasi lama ("tolak bila rentPortion+depositPortion < invoice + deposit") **JANGAN dipakai** — itu menolak DP 30% yang sah. Gate dua-nominal-sah A18 sudah ada di `createSubmission`.
- **Spesifikasi benar (F1-1R, lihat `fable5-audit-deep/11_MASTER_ACTION_PLAN.md`):** (a) di `approveSubmission` booking, re-validasi nominal HANYA boleh = sisa-DP-persis ATAU pelunasan-persis; (b) jalur invoice-only (renewal/utilitas) WAJIB lunas penuh (no partial di mana pun, D-02).
- **Target:** `payment-submissions.service.ts:approveSubmission` (:406-430) + jalur invoice-only (:146-159).

### W-B02 — GAP #3: Guard Hapus Payment Saat Kamar OCCUPIED
- **Target:** `invoice-payments.service.ts:remove`
- **Guard:** tolak 409 jika room OCCUPIED atau `Stay.initialMetersPromotedAt !== null`.
- Guard hanya untuk `remove`.

### W-B03 — GAP #4: Refund Manual First Paid Wins (DIPERLUAS → F2-3 + F2-3b)
- **Target:** `payment-submissions.service.ts` (notifikasi A17) + pencatatan refund.
- (a) Copy notif dua-varian: loser yang SUDAH transfer → "DP-mu akan dikembalikan admin, hubungi pengelola dengan bukti"; loser belum transfer → copy netral. JANGAN klaim "tidak ada dana terpotong" untuk yang sudah transfer (N-01).
- (b) **DICATAT DI SISTEM (D-07):** field bukti transfer balik + status refund (PENDING_REFUND/REFUNDED) + UI admin upload bukti (F2-3b).

### W-B04 — U-01: Skeleton + Prefetch Detail Kamar Publik
- **Target:** `PublicRoomDetailPage.tsx` + `PublicRoomsPage.tsx`
- Skeleton: `placeholder-glow` + `placeholder` Bootstrap, bukan spinner.
- Prefetch on hover di katalog.

### W-B05 — U-02: Pagination / Lazy-Load Katalog Kamar
- **Target:** `PublicRoomsPage.tsx`
- Default 12 kamar/halaman, pagination numbered, scroll ke atas saat pindah.

### W-B06 — E-6 Timezone WIB di Scheduler Auto-Ops
- **Target:** `auto-ops.service.ts`
- Konversi waktu sekarang ke WIB untuk comparison job noon-release, forfeit, forced-checkout, reminders.

### W-B07 — E-7 Round-Robin Assignment Tiket
- **Target:** `tickets.service.ts`
- Pilih staf dengan tugas aktif paling sedikit. Random jika jumlah sama.

### W-B08 — Backup Otomatis + Monitoring Uptime
- **File baru:** `scripts/backup-prod.ps1` + `scripts/health-check.ps1`
- Backup: pg_dump retensi 30 hari. Health check: curl endpoint public rooms, log hasil.

---

### Ringkasan Semua Task W-B01..W-B08

| ID | Tugas | File Utama | Estimasi |
|---|---|---|---|
| W-B01 | 🔴 Hapus partial payment | `payment-submissions.service.ts` | 1 sesi |
| W-B02 | 🟠 Guard remove payment OCCUPIED | `invoice-payments.service.ts` | 1 sesi |
| W-B03 | 🟡 Update notifikasi refund manual | `payment-submissions.service.ts` | 0.5 sesi |
| W-B04 | 🟠 Skeleton + prefetch detail kamar | `PublicRoomDetailPage.tsx` | 1 sesi |
| W-B05 | 🟡 Pagination katalog 48 kamar | `PublicRoomsPage.tsx` | 1 sesi |
| W-B06 | 🟡 Timezone WIB auto-ops | `auto-ops.service.ts` | 0.5 sesi |
| W-B07 | 🔵 Round-robin assignment tiket | `tickets.service.ts` | 0.5 sesi |
| W-B08 | 🔵 Backup + monitoring | `scripts/backup-prod.ps1` | 1 sesi |

**Total estimasi:** ±6–7 sesi AI eksekutor.

---

## 8. Ringkasan satu paragraf
Sistem punya 12 flow bisnis + 9 job otomatis. Jalur uang dan mesin waktu sudah KUAT di kode setelah audit pass A/B/C/E. Tiga flow lemah: Renew (5), Tiket & staf (8), Laporan (12) — semua sudah diaudit/diperbaiki ke tingkat tertentu. 7 pekerjaan W-01..W-07 (era V5.12) + 8 pekerjaan W-B01..W-B08 (era V5.13) sudah terdefinisi presisi. Prioritas owner: tanpa denda, notifikasi in-app menuju PWA push, UAT + rekonsiliasi (TUNTAS), docs rapi.