> **ARSIP BEKU** · dipindah dari `docs/kerja/` ke `docs/arsip/` pada 2026-10-21 (DOCS-GEN2 D4d). Isi dipindah/dipertahankan sebagai referensi; **jangan dibaca rutin**.

# Prompt Lanjutan — KOST48 (18 Okt 2026)

Salin seluruh isi berkas ini ke sesi baru sebagai pesan pertama. Tujuannya: melanjutkan pekerjaan yang belum selesai tanpa mengulang kesalahan sesi sebelumnya.

---

## Konteks

Repo: `kost48surabaya-v3/.../final_bundle` (NestJS + React/Vite, satu proses, produksi di `https://kost48surabaya.com`).
Bahasa kerja: Indonesia. Baca `AGENTS.md` dan `docs/KONTRAK.md` dulu. Runbook server: `docs/operations/produksi.md`.

Akses server (sudah terverifikasi berfungsi):
- SSH `kost48s1@api.kost48surabaya.com` port **4422**, kunci di `.ssh-kost48/kost48_deploy` (ter-ignore git), `known_hosts` di `.ssh-kost48/known_hosts`.
- Aplikasi: `~/kost48-prod` (`dist/`, `client/`, `.env`, `uploads/`). Restart: `touch ~/kost48-prod/tmp/restart.txt`.
- Basis data: dibaca dari `~/kost48-prod/.env` **tanpa mencetak isinya**; `psql` tersedia; DB `kost48s1_prod26`.
- Akun OWNER produksi: `liem.lui@gmail.com`; sandi ada di `.ssh-kost48/owner-password-baru.txt` (jangan cetak ke chat).

Keadaan terverifikasi 18 Okt 2026 (jangan diasumsikan, cek ulang):
- 13 kamar; 11 hunian aktif; C dan F1 kosong.
- 11 invoice lunas Rp 14.600.000 (TRANSFER, 18 Okt), 23 jurnal, debit = kredit Rp 29.400.000.
- COA 38 akun; periode 2026-09 & 2026-10 OPEN; Kas Tunai & Bank Utama; **saldo awal belum diisi**.
- 12 akun tenant; **belum ada ADMIN/STAFF**; `brevoApiKey` kosong; gate KTP aktif dan 11 tenant belum verifikasi KTP.
- Build client produksi: `EnxMx1YIWE6r` (cache React Query sudah `staleTime: 0` + refetch on focus).
- Halaman checklist beta: `/checklist` (statis, `frontend/public/checklist/index.html`).

## Larangan (sudah pernah dilanggar, jangan ulangi)

1. Jangan membaca/mencetak isi `.env`, `.bash_history`, atau `~/OWNER-PASSWORD-BACA-LALU-HAPUS.txt`; cukup jalur/statusnya.
2. Jangan memakai perintah SSH satu baris dengan kutip, `$()`, atau `|`. Tulis skrip, unggah dengan `scp`, jalankan `bash ~/skrip.sh; rm -f ~/skrip.sh`. (Kutip dimakan PowerShell → `psql` menerima URL terpotong dan **sandi DB tercetak di log**.)
3. `scp` hanya satu sumber → satu tujuan per pemanggilan; dua tujuan membuat direktori aneh di server.
4. Jangan `>` untuk menulis berkas (UTF-16 + NUL). Pakai `[IO.File]::WriteAllText` + `UTF8Encoding($false)`, lalu baca ulang.
5. PowerShell di mesin ini **5.1**: tidak ada `?.`, tidak ada daftar pernyataan di dalam `()`.
6. Jangan menonaktifkan gate/guard untuk melewati kegagalan: gate KTP, batas pembayaran pada hunian terisi, dan kontrak service worker adalah aturan bisnis. Laporkan, jangan tembus.
7. Jangan commit, push, atau deploy tanpa izin eksplisit. Jangan `git add -A`.
8. Build/test frontend butuh izin sandbox lebih luas (`spawn EPERM` dari esbuild) — minta **sekali** untuk satu paket bukti utuh.
9. Jangan mengubah/menghapus pembayaran pada hunian terisi (ditolak kode); koreksi lewat jalur akuntansi.
10. Data yang tampak basi belum tentu bug data: cek API/DB dulu sebelum menyimpulkan.

## Tugas (kerjakan berurutan, satu per satu; berhenti bila acceptance tidak tercapai)

### T1 — Perbaiki bug laporan pendapatan bulanan
Gejala: September `billed=14.600.000`, `paid=0`, `outstanding=+14.600.000`, padahal `paidInvoiceCount=11`, `unpaidCount=0`; Oktober `outstanding=−14.600.000`.
Sebab: `backend/src/modules/reports/reports.service.ts` `monthlyIncome()` memfilter `billed` dengan `periodStart` tetapi `paid` dengan `paymentDate` (baris ±34–48, 84).
Acceptance: satu basis tanggal yang konsisten (ikuti pola `AL-FIX-4` di baris ±384), angka Sept/Oktober tidak lagi saling meniadakan, dan `outstanding >= 0` untuk data nyata.
Bukti wajib: sebelum/sesudah untuk 2026-09 dan 2026-10 dari endpoint `/api/reports/monthly-income`, plus uji yang **gagal** bila logika dikembalikan ke versi lama (uji mutasi).

### T2 — Perbaiki saldo kas pada daftar akun kas
Gejala: `GET /api/accounting/cash-accounts` mengembalikan `currentBalanceRupiah: 0`, sedangkan trial balance menunjukkan Bank Utama Rp 14.600.000.
Sebab: endpoint membaca kolom tersimpan; laporan menghitung dari jurnal (`accounting-reports.service.ts` ±905).
Acceptance: daftar kas menampilkan saldo yang sama dengan trial balance, atau kolomnya dihapus dari kontrak API dan UI memakai nilai terhitung.
Bukti: respons endpoint sebelum/sesudah + perbandingan dengan `/api/accounting/trial-balance`.

### T3 — Catat pekerjaan sesi 18 Okt ke dokumen
Isi `docs/arsip/bukti-2026-10.md` (bagian baru) dan changelog: reset OWNER, periode Okt, 11 check-in, 11 pembayaran, deploy client `EnxMx1YIWE6r`, halaman `/checklist`, serta penyimpangan (gate KTP dimatikan sementara, status kamar lewat SQL, override F1 lewat SQL, sandi DB tercetak di log).
Syarat: cek dulu `git status` dan `git log` — **sesi lain mungkin sedang menulis berkas yang sama**. Jangan menimpa; tambahkan. Tanpa commit kecuali diizinkan.

### T4 — Rotasi dan pembersihan rahasia
- Rotasi sandi user DB produksi `kost48s1_lurin` (sandi lama sempat tercetak di log sesi sebelumnya).
- Setelah rotasi: perbarui `~/kost48-prod/.env` dengan aman, restart Passenger, lalu smoke.
- Hapus `.ssh-kost48/owner-password-baru.txt` setelah sandi OWNER dipindahkan ke password manager.
- Bila tidak dipakai lagi: cabut baris `dsh-release-2026-10-18` di `~/.ssh/authorized_keys` dan hapus folder kunci.
Acceptance: login OWNER tetap berhasil, API publik 200, tidak ada sandi di repo.

### T5 — Konfigurasi email reset (butuh data owner)
Minta `BREVO_API_KEY` dan alamat pengirim terverifikasi; isi lewat Pengaturan Operasional (bukan SQL), lalu uji satu reset password end-to-end.
Acceptance: email diterima, tautan reset membuka `/reset-password`, dan sandi benar-benar berubah.

### T6 — Akun staf dan KTP (butuh keputusan owner)
- Tentukan siapa yang butuh ADMIN/STAFF, buat lewat menu Akun Pengguna, uji login, lalu catat.
- Siapkan alur unggah/verifikasi KTP 11 penghuni; **jangan** mematikan gate lagi. Bila berkas KTP belum ada, berhenti dan laporkan.

### T7 — Saldo awal akuntansi (butuh angka owner)
Kumpulkan saldo kas/bank per awal periode, susun draft opening balance, posting setelah disetujui owner.

### T8 — Persiapan soft beta
Gunakan `/checklist` sebagai acuan. Pastikan kriteria kelulusan beta terpenuhi: uji back-office & portal, PWA di dua perangkat, tidak ada laporan minus, KTP aktif terverifikasi, minimal satu akun staf, email reset jalan, saldo awal diputuskan.

## Format laporan setiap tugas

```text
TUGAS: T<n> — Level: <XS..XL>
UBAH: berkas + satu baris perubahan
ANGKA: sebelum → sesudah
VERIFIKASI: perintah, exit code, hasil ; yang TIDAK dijalankan + alasan
BLOKIR: tidak ada | sebab + pemilik keputusan
```

Pisahkan: implementasi lokal · verifikasi lokal · deployment · dampak runtime. Sebutkan apa yang **belum** dilihat mata atau belum dijalankan.

## Pertanyaan ke owner (format wajib)

Konteks 2–3 baris · minimal 2 pilihan berhuruf · konsekuensi tiap pilihan termasuk risiko · rekomendasi + alasan · default bila tidak dijawab. Tulis juga ke `docs/kerja/TANYA-OWNER.md`.
