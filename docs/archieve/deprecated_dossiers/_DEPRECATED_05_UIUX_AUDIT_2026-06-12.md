# KOST48 V5 — Audit UI/UX Visual (Browser Otomatis)
**Tanggal:** 2026-06-12 · Auditor: Fable 5 · Metode: aplikasi nyata (backend 3000 + frontend 5173, DB UAT 5433) dikendalikan Playwright/Chrome headless; login 4 role via API; navigasi **read-only** (tanpa submit form).
**Bukti:** 104 screenshot di `_uiux_audit_2026-06-12\<surface>\<halaman>-<desktop|mobile>.png` (public 14, tenant 18, staff 12, admin 54, owner 6) + `console-log.txt`. Folder bukti TIDAK di-commit.
**Severity:** BLOCKER (menghalangi tugas) · MAJOR (merusak kepercayaan/konversi) · MINOR (gesekan nyata) · POLISH (kosmetik).

<!-- KOST48_DOCS_SYNC_20260612_UIUX_AUDIT -->

## Ringkasan eksekutif
Tidak ada BLOCKER. Kualitas desain secara umum **baik—konsisten** (design system kartu/chip/tab seragam lintas surface, mobile tidak ada layout rusak satu pun dari 52 capture mobile). Dua masalah terbesar justru di **jalur konversi publik**: (1) halaman detail kamar menatap spinner 5–8 detik, (2) katalog memuat 48 kamar + seluruh fotonya sekaligus. Di portal tenant ada **dua penyajian status yang menyesatkan** (booking belum bayar tampil "Masa Sewa Aktif"; angka tagihan saling bertentangan). Sisanya gesekan kecil yang murah diperbaiki — daftar Quick Wins di bagian akhir.

Konsol bersih pada run sehat: **0 error HTTP 4xx/5xx aplikasi** di 102 navigasi; error pada run pertama (`ERR_INSUFFICIENT_RESOURCES`, Vite mati) adalah gejala U-02 + restart dev server, bukan bug halaman.

---

## Temuan

### U-01 [MAJOR] [publik/performa] Detail kamar: spinner 5–8 detik sebelum konten
- **Bukti:** probe terukur — halaman `/rooms/5/detail` baru render konten setelah ±6–8 dtk; dua run capture standar (jeda 1,2 dtk + networkidle) masih memotret spinner. Penyebab terlihat di network log: halaman publik menyeret **±28 modul `src/api/*.ts`** (accounting, assets, staffRoutines, autoOps, dll.) sebelum query kamar pertama jalan — barrel import menarik seluruh API backoffice ke halaman publik.
- **Dampak:** calon tenant (halaman paling menentukan konversi) menatap layar kosong; di produksi bundling menolong, tapi ekor impor tetap membengkakkan bundle publik dan data fetch tetap tanpa skeleton.
- **Rekomendasi:** (a) pisahkan modul API publik dari barrel backoffice (import langsung `bookings.ts`), (b) skeleton card menggantikan spinner tunggal, (c) prefetch detail saat kartu katalog di-hover/tap.

### U-02 [MAJOR] [publik/performa] Katalog memuat 48 kamar + semua foto sekaligus
- **Bukti:** `public/rooms-mobile.png` setinggi **16.228 px** (48 kartu × foto); pada run pertama Chrome sampai kehabisan resource (`ERR_INSUFFICIENT_RESOURCES`, lihat console-log run 22:22) dan halaman gagal render.
- **Dampak:** waktu muat & kuota data calon tenant; di HP kelas menengah berisiko crash tab; scroll tak berujung menyulitkan membandingkan kamar.
- **Rekomendasi:** pagination/infinite-scroll (mis. 12 kartu per halaman), `loading="lazy"` + ukuran thumbnail khusus untuk foto kartu (bukan file utama), filter tetap di atas.

### U-03 [MAJOR] [portal/status] Booking belum dibayar tampil sebagai "Masa Sewa Aktif" dengan "Dana Titipan Rp 500.000"
- **Bukti:** `tenant/portal_stay-desktop.png` — tenant Andi (stay fase booking, belum promoted, belum bayar apa pun) melihat badge hijau "Masa Sewa Aktif", "Akhir sewa 30 Juni 2026", dan kartu "DANA TITIPAN Rp 500.000" seolah uang jaminan sudah dititipkan.
- **Dampak:** tenant bisa mengira kamar sudah terkunci tanpa membayar (bertentangan dengan kebijakan first-paid-wins & alur DP A18); angka jaminan tampil seperti saldo padahal kewajiban.
- **Rekomendasi:** bedakan fase: belum promoted → badge "Menunggu Pembayaran — kamar belum terkunci" + CTA bayar DP; dana titipan tampil "Rp 0 dari Rp 500.000 (belum disetor)".

### U-04 [MAJOR] [portal/tagihan] Angka di "Tagihan Saya" saling bertentangan
- **Bukti:** `tenant/portal_invoices-desktop.png` — tab menunjukkan "Belum Dibayar **0**, Selesai **1**", tetapi gauge "Tingkat Pelunasan **0% Lunas**, Terbayar Rp 0, **Sisa Rp 1,7 jt**"; bar "Tagihan per Status" kosong meski ada 1 tagihan lunas.
- **Dampak:** tenant tidak bisa percaya angka mana pun; "sisa 1,7 jt" tanpa tagihan yang bisa diklik = jalan buntu (kemungkinan menghitung invoice DRAFT yang memang tidak ditampilkan ke tab).
- **Rekomendasi:** satukan sumber data gauge & tab (hanya invoice non-DRAFT non-CANCELLED); bila ada DRAFT, jangan ikut dihitung di "Sisa".

### U-05 [MINOR] [admin/tagihan] Landing default "Tagihan & Piutang" = empty state padahal data ada
- **Bukti:** `admin/invoices-desktop.png` — kartu ringkasan menunjukkan ada tagihan (Lunas ≥5), tetapi tabel default "Tidak ada tagihan yang cocok — coba ubah filter status".
- **Rekomendasi:** filter default "Semua" (atau "Aktif" dengan fallback otomatis ke "Semua" bila kosong).

### U-06 [POLISH — direvisi setelah verifikasi] [publik/home] Kartu "Informasi lengkap KOST48"
- **Revisi 2026-06-12:** dugaan "kartu blank" TERBANTAH — ketiga aset brosur 200 OK (92–548 KB) dan memang berdesain dominan putih; tampak kosong hanya pada thumbnail kecil. Perbaikan tetap dipasang sebagai hardening (gambar gagal-muat kini disembunyikan, section ikut hilang bila semua gagal). Area kosong tinggi di tengah home tetap tercatat untuk ditelusuri terpisah (kemungkinan reserved-space section galeri).

### U-07 [MINOR] [publik/detail] Judul halaman hanya kode kamar ("G")
- **Bukti:** `public/rooms_5_detail-desktop.png` — H1 "G"; nama lengkap "Kamar G - Budget Room" justru ada di kartu samping.
- **Rekomendasi:** H1 = "Kamar G — Budget Room".

### U-08 [MINOR] [portal/IA] `/portal/stay` dan `/portal/bookings` menampilkan konten identik
- **Bukti:** `tenant/portal_stay-desktop.png` vs `tenant/portal_bookings-desktop.png` — sama persis (kartu Kamar Saya + layanan tambahan).
- **Rekomendasi:** bila memang satu pengalaman ber-tab, redirect salah satunya; bila beda tujuan, tampilkan konten booking (riwayat/status pembayaran) di rute bookings.

### U-09 [MINOR] [publik/booking] Estimasi biaya tidak menyebut opsi DP 30%
- **Bukti:** `public/booking_16_available-desktop.png` — estimasi "Rp 3.200.000 (sewa 2.000.000 + jaminan 1.200.000)" benar, tetapi tidak ada info bahwa kamar bisa diamankan dengan **DP 30% (Rp 600.000)** sesuai kebijakan A18 — calon tenant mengira wajib siap dana penuh.
- **Rekomendasi:** satu baris di kartu estimasi: "Amankan kamar cukup dengan DP 30%: Rp 600.000 — pelunasan saat check-in."

### U-10 [MINOR] [owner/empty-state] Dashboard & laporan owner dengan data nol tampak "rusak"
- **Bukti:** `owner/owner-dashboard-desktop.png`, `owner/reports-desktop.png` — semua kartu Rp 0, okupansi 0%, bidang chart kosong tanpa pesan, status "Bermasalah".
- **Rekomendasi:** chart kosong → pesan "Belum ada data periode ini"; bedakan "Bermasalah karena data buruk" vs "belum ada data".

### U-11 [POLISH] Lain-lain
- Donut "Level Risiko" merah penuh untuk 1 item (admin review pembayaran) — terkesan darurat untuk volume kecil; tampilkan hitungan, bukan proporsi.
- Loading state tidak seragam: `/portal/stay` spinner tanpa shell header, halaman lain dengan shell — pakai pola shell+skeleton seragam.
- Kartu baris "Masa Sewa" versi mobile sangat panjang (label diulang tiap kartu) — ringkas 3 baris + tombol detail.

---

## Yang sudah BAGUS (pertahankan)
- **Mobile sehat menyeluruh:** 52 capture mobile tanpa satu pun layout pecah/overflow; tabel admin berubah jadi kartu bertumpuk dengan benar.
- **Form booking publik jujur & aman:** peringatan "booking belum mengunci kamar", "jangan transfer sebelum tagihan resmi", guard kamar terisi dengan CTA WhatsApp + "Lihat Kamar Lain" (`public/booking_5-desktop.png`).
- **Harga konsisten formula resmi di semua term** (2 Mingguan 690rb / Bulanan 920rb / Semesteran 5,06jt / Tahunan 9,2jt untuk kamar G) — FIX M-40 terverifikasi visual.
- **Stay detail admin**: checklist "Safety Belt Checkout" + timeline alur masa sewa — pola terbaik di aplikasi ini.
- **Staff dashboard**: ramah, fokus satu-pekerjaan, skor gamifikasi — sangat baik.
- Wizard check-in 3 langkah bersih; login jelas dengan toggle role; copy seluruh app konsisten tanpa janji "denda" (selaras D1).

## Status eksekusi Quick Wins (2026-06-12, oleh Fable)
Semua QW-1..QW-8 **sudah dieksekusi & diverifikasi visual** pada aplikasi berjalan (bukti: `_uiux_audit_2026-06-12\after-qw\*.png`): tabel tagihan admin langsung tampil (QW-1), H1 "Kamar G - Budget Room" (QW-2), baris hijau "DP 30%: Rp 600.000" di estimasi booking (QW-3), `loading="lazy"` kartu katalog (QW-4), badge "Menunggu Pembayaran" utk kamar RESERVED + titipan "disetor / target" (QW-5; catatan: semua tenant demo UAT berdata occupied+lunas sehingga jalur RESERVED diverifikasi lewat logika kode), fallback galeri home (QW-6), pesan "Belum ada data…" pada chart owner kosong (QW-7), gauge pelunasan kini 100%/Sisa Rp 0 konsisten dengan tab (QW-8 — termasuk lapisan kedua bug: invoice PAID tanpa baris pembayaran kini dihitung lunas penuh). `tsc` + `vite build` PASS.

Temuan tambahan saat verifikasi U-04: akar kedua = data invoice berstatus PAID dengan 0 baris InvoicePayment (data demo/lama) — gauge lama menghitungnya sebagai tunggakan. Ditangani di sisi tampilan; data seperti ini juga akan tertangkap rekonsiliasi UAT.

## Quick Wins (urut nilai/usaha — semuanya kecil)
| # | Aksi | Temuan | Perkiraan |
|---|---|---|---|
| QW-1 | Filter default halaman Tagihan admin → "Semua" | U-05 | 1 baris |
| QW-2 | H1 detail kamar = kode + nama | U-07 | 1 baris |
| QW-3 | Baris copy "DP 30%: Rp X" di estimasi booking publik | U-09 | ±10 baris |
| QW-4 | `loading="lazy"` + thumbnail di kartu katalog | U-02 (parsial) | ±5 baris |
| QW-5 | Badge "Menunggu Pembayaran" utk stay belum promoted + "Rp 0 dari Rp 500.000" | U-03 | ±20 baris |
| QW-6 | Sembunyikan section home yang kosong | U-06 | ±10 baris |
| QW-7 | Pesan kosong pada chart owner | U-10 | ±10 baris |
| QW-8 | Samakan sumber angka gauge vs tab di Tagihan Saya | U-04 | ±15 baris |

Pekerjaan lebih besar (bukan quick win): U-01 (code-split API publik + skeleton), U-02 penuh (pagination katalog), U-08 (keputusan IA portal).

## Lampiran — kualitas bukti
- Run pertama (22:11–22:37 WIB malam) terganggu: katalog memicu resource-exhaustion lalu Vite dev mati (AI eksekutor sedang bekerja) → public/tenant diambil ulang pada server sehat; staff/admin/owner diambil ulang penuh (72/72 ok, gagal 0).
- Halaman dengan data dinamis dipotret setelah spinner hilang (timeout 12 dtk); `booking_16_available-*` ditambahkan khusus untuk memotret form booking pada kamar AVAILABLE.
- Tidak ada mutasi data oleh sesi audit selain `lastLoginAt` 4 akun (efek login).
