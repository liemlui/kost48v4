> **ARSIP BEKU** · dipindah dari `docs/kerja/` ke `docs/arsip/` pada 2026-10-21 (DOCS-GEN2 D4d). Isi dipindah/dipertahankan sebagai referensi; **jangan dibaca rutin**.

# TASK-BOOKING-ONLINE — booking publik dengan bukti transfer manual

> **Blok baca** · Jenis: **dokumen kerja tugas (kontrak kerja, bukan antrean)** · Status: **aktif — siap dikerjakan; belum ada kode yang ditulis** · Untuk siapa: agen yang mengerjakan flow booking online
> · Baca kalau: mengerjakan, menilai, atau melanjutkan flow booking online publik. · **Jangan** dibaca kalau: memilih tugas (itu [ANTREAN](../ANTREAN.md)) atau mencari aturan bisnis (itu [domain/hunian.md](../domain/hunian.md) Dossier 11).

Bentuk 7 bagian mengikuti konvensi [ANTREAN §3](../ANTREAN.md) butir A-2 — **tanpa kotak**, bukan antrean kedua. Status pekerjaannya tetap di [ANTREAN §3](../ANTREAN.md).

## 1. Tujuan & definisi selesai

**Tujuan.** Calon penghuni bisa memesan kamar dari halaman publik tanpa akun, membayar DP 30%, dan **mengirim bukti transfer manual**; ADMIN/OWNER memeriksa bukti itu; kamar terkunci saat DP disetujui dan **terbuka kembali** bila DP kedaluwarsa.

**Definisi selesai (dapat diperiksa, bukan kesan).**

1. Pemesan tanpa akun bisa membuat booking dari halaman publik dan menerima akun portal sementara (`POST /api/public/bookings`, `@Public()`).
2. Pemesan bisa **mengunggah bukti transfer** (`POST /api/payment-submissions/submit-with-proof`, role TENANT).
3. **Hanya ADMIN/OWNER** yang bisa approve/reject; percobaan oleh STAFF/TENANT ditolak (403).
4. Setelah approve: `Room.status = RESERVED` (**bukan** OCCUPIED — OCCUPIED hanya saat check-in) dan booking pesaing dibatalkan (first-paid-wins).
5. Setelah `expiresAt` lampau tanpa pembayaran disetujui: booking dibatalkan sweep dan **kamar kembali `AVAILABLE`** (bisa dipesan orang lain).
6. **Tidak ada** jalur pembayaran otomatis — tanpa QRIS, virtual account, atau payment gateway (aturan owner `BOOKING-ONLINE-MANUAL`).
7. Halaman publik & halaman verifikasi **mobile-first** (±390 px), tanpa gulir horizontal, aksi utama dalam jangkauan jempol.
8. Bukti: test modul untuk (3)(4)(5) + render halaman di viewport 390 px. **Klaim "selesai" wajib menyebut mana dari 8 butir ini yang benar-benar dibuktikan.**

## 2. Kondisi awal + cara mengukur ulang

Yang **sudah ada** di kode (diverifikasi 2026-10-10, bukan ingatan):

| Bagian | Bukti di kode |
|---|---|
| Booking publik tanpa akun → buat Tenant+User+Stay + **password sementara** | `public-bookings.service.ts` `createPublicBooking` (user TENANT dibuat, respons memuat `temporaryPassword` + instruksi login) |
| DP 30% × sewa, non-refundable | `tenant-bookings.service.ts` `downPaymentAmountRupiah`; aturan: [domain/hunian.md](../domain/hunian.md) Dossier 11 |
| Booking expiry **3 jam flat** | `tenant-bookings.helpers.ts` `calculateBookingExpiry` → `AUTO_OPS_DEADLINES.BOOKING_REVIEW_DEADLINE_HOURS` (default 3) |
| Kamar tidak terkunci saat booking dibuat | komentar resmi di `tenant-bookings.service.ts`: "Room status left as-is — baru berubah ke RESERVED saat DP/LUNAS dibayar" |
| Kamar terkunci saat approve | `payment-submissions.service.ts` — "Payment approved (DP atau Lunas) selalu set room RESERVED. Check-in akan mengubah ke OCCUPIED." |
| Approve/reject hanya OWNER/ADMIN | `payment-submissions.controller.ts` `@Roles(UserRole.OWNER, UserRole.ADMIN)` pada `:id/approve` dan `:id/reject` |
| Bukti transfer manual | `POST /payment-submissions/submit-with-proof` (TENANT) + `GET /proofs/:filename` (OWNER/ADMIN/TENANT) |
| Sweep pembatalan booking kedaluwarsa | `booking-sweep.service.ts` `expireBookingTx` / `expiredBookingWhere` |
| Jejak kamar kembali tersedia saat pembatalan | audit `Stay` CANCELLED mencatat `roomStatus: AVAILABLE` (`tenant-bookings.service.ts`) |

**Cara mengukur ulang:** `git grep -n "submit-with-proof\|@Roles(UserRole.OWNER" backend/src/modules/payment-submissions` · `node -e "console.log(require('./backend/package.json').scripts['test:unit'])"` · gate uang: `npm run test:unit` (cwd `backend`) karena flow ini menyentuh **uang**.

**Yang BELUM terbukti (jangan dianggap beres):** apakah jalur sweep benar-benar menulis `Room.status = AVAILABLE` pada transaksi yang sama (baru terlihat di jejak audit, belum diuji), dan apakah halaman publik saat ini sudah mobile-first.

## 3. Langkah (dari risiko terendah)

1. **Bekukan perilaku hari ini dengan test** — state transition booking→approve→RESERVED dan booking kedaluwarsa→AVAILABLE. Ini yang memastikan butir (4) dan (5) tidak sekadar "kelihatan benar".
2. **Tambal bila ada celah** pada jalur unlock (butir 5). Perubahan schema/kunci unik = task terpisah dengan runbook, bukan diselipkan.
3. **Halaman publik booking, mobile-first** (butir 1, 7) — satu kolom, tanpa tabel lebar, unggah bukti langsung dari ponsel (kamera).
4. **Halaman verifikasi bukti untuk ADMIN/OWNER** — masuk sebagai kartu di Mode Cepat (`AIDL`), memuat ringkasan dampak sebelum approve (mekanisme `preview` sudah ada).
5. **Notifikasi** ke pemesan (bukti diterima/ditolak) + pengingat sebelum kedaluwarsa.

Setiap langkah = **satu commit** (aturan owner `KERJA-KECIL-COMMIT`).

## 4. Jebakan nyata yang sudah terukur

- **Unggah bukti butuh role TENANT** — pemesan yang belum pernah login akan gagal di `submit-with-proof`; alur harus lewat akun sementara dari respons booking, dan **password sementara itu wajib ditampilkan sekali** serta **tidak boleh masuk log**.
- **DP non-refundable** — jangan menambahkan tombol "ajukan refund" pada flow ini; refund hanya jalur manual admin (aturan lama).
- **RESERVED ≠ OCCUPIED** — pernah salah ditulis di dokumen; kamar jadi OCCUPIED hanya saat check-in.
- **Jangan mengubah 3 jam flat** tanpa keputusan owner: itu `D-04`, dan mengubahnya mengubah perilaku semua jalur booking.
- **Jangan menambah gateway pembayaran** — keputusan owner eksplisit; menambah dependency juga melanggar aturan repo.

## 5. Kalau macet (gejala → sebab → tindakan)

| Gejala | Sebab yang paling sering | Tindakan |
|---|---|---|
| Pemesan tidak bisa mengunggah bukti (401/403) | belum login dengan akun sementara, atau endpoint dipanggil sebagai publik | pastikan alur login dari halaman booking; periksa `@Roles` pada endpoint unggah |
| Kamar tetap terkunci setelah kedaluwarsa | sweep tidak menyentuh `Room.status`, atau `expiresAt` tidak diset | periksa `expireBookingTx` dan `expiredBookingWhere`; ukur ulang dengan test butir (5) |
| Approve gagal "nominal tidak sesuai" | gate no-partial menuntut DP tepat atau pelunasan penuh | unggah nominal **tepat** DP, bukan sebagian |

## 6. Catatan penyimpangan

Belum ada. Setiap penyimpangan dari kontrak ini wajib dicatat di sini **pada sesi yang sama** (aturan pelaporan [KONTRAK §9](../KONTRAK.md)).

## 7. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-10 | Dibuat setelah owner memberikan aturan flow (kamar terkunci saat DP, terbuka saat DP kedaluwarsa, approve ADMIN/OWNER, bukti transfer manual). **Ralat** frasa "DP via QRIS" yang salah tercatat sebelumnya → keputusan owner `BOOKING-ONLINE-MANUAL`. Belum ada kode ditulis. |
