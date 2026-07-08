# Fix List KTP G5 Review

Tujuan file ini: jadi instruksi kerja untuk AI yang lebih lemah agar bisa memperbaiki issue penting tanpa mengubah area lain.

## Scope

Kerjakan hanya area berikut:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/modules/owner-ai/owner-ai.service.ts`
- `backend/src/modules/tenants/tenants.service.ts`
- `frontend/src/components/ai/KtpOcrValidateCard.tsx`

Jangan ubah modul payment, owner dashboard, CSS split route, atau file lain di luar scope ini.

## Masalah Yang Harus Diperbaiki

### 1. Blocker: schema berubah tapi migration belum ada

Masalah:

- Di model `Tenant` sudah ada field baru:
  - `ktpVerificationMethod`
  - `ktpVerificationNotes`
- Tetapi belum ada migration Prisma yang menambahkan kolom itu ke database.

Risiko:

- Build lokal bisa lolos.
- Deploy ke database existing bisa gagal saat endpoint verifikasi KTP mencoba update kolom yang belum ada.

Tugas:

1. Buat migration Prisma baru untuk menambahkan:
   - `ktpVerificationMethod` nullable string
   - `ktpVerificationNotes` nullable string
2. Pastikan migration hanya menambah kolom yang dibutuhkan, jangan sentuh tabel lain.
3. Jangan pakai pendekatan destruktif.

Kriteria selesai:

- Ada folder migration baru di `backend/prisma/migrations/`
- SQL migration hanya menambah 2 kolom itu

### 2. Medium: rate limit AI terpotong walau AI tidak dipakai

Masalah:

- Di `validateKtpOcr()` ada `checkRateLimit()` yang dipanggil terlalu awal.
- Padahal jika hasil deterministik sudah solid, sistem skip AI.
- Akibatnya kuota AI harian tetap berkurang walau DeepSeek tidak dipanggil.

Tugas:

1. Ubah alur `validateKtpOcr()` agar:
   - preprocessing dan deterministic extraction jalan dulu
   - jika hasil deterministic solid, return langsung tanpa mengurangi AI rate limit
   - `checkRateLimit()` hanya dipanggil tepat sebelum benar-benar memanggil AI
2. Pastikan fallback non-AI juga tidak memotong kuota.

Kriteria selesai:

- Jalur `DETERMINISTIC_SOLID` tidak mengonsumsi rate limit AI
- Jalur fallback tanpa AI tidak mengonsumsi rate limit AI
- Jalur DeepSeek tetap mengonsumsi rate limit seperti sebelumnya

### 3. Medium: metode verifikasi bisa menipu audit trail

Masalah:

- Di frontend modal verifikasi manual, user masih bisa memilih method `AI`
- Ini bisa terjadi walau AI gagal, tidak tersedia, atau bahkan belum dipakai
- Backend menerima nilai method itu mentah-mentah dan menyimpannya
- Audit trail jadi bisa salah: tercatat `AI` padahal verifikasi sebenarnya manual

Tugas frontend:

1. Di `KtpOcrValidateCard.tsx`, batasi pilihan method berdasarkan kondisi nyata:
   - Jika hasil AI sukses dan recommendation mendukung, boleh pilih `AI`
   - Jika AI gagal / fallback / belum dijalankan / tidak configured, jangan izinkan pilih `AI`
   - Untuk kondisi itu, pakai `MANUAL` atau `AI_FAILED_MANUAL`
2. Jika perlu, sembunyikan opsi `AI` saat tidak valid.

Tugas backend:

1. Tambahkan guard di `tenants.service.ts` agar method `AI` tidak boleh disimpan bila konteksnya tidak valid.
2. Karena backend saat ini tidak menyimpan state hasil validasi AI, pilih guard yang sederhana dan aman:
   - minimal: jangan percaya payload frontend secara buta
   - kalau perlu, ubah endpoint verifikasi agar default aman adalah `MANUAL`
3. Jangan buat solusi besar yang butuh tabel baru.

Catatan:

- Fokusnya mencegah audit metadata menyesatkan.
- Jangan redesign total flow KTP.

Kriteria selesai:

- User tidak bisa asal menyimpan `method=AI` dari modal manual
- Backend punya validasi tambahan, bukan cuma frontend

## Yang Tidak Boleh Dilakukan

- Jangan refactor besar-besaran
- Jangan ubah API lain yang tidak relevan
- Jangan ganti struktur response besar
- Jangan tambah dependency baru
- Jangan ubah logic payment / finance / owner dashboard

## Verifikasi Wajib

Setelah selesai, jalankan:

### Backend

```bash
npm run build
```

### Frontend

```bash
npm run build
```

## Hasil Yang Diharapkan

Setelah fix:

- deploy tidak gagal karena kolom DB hilang
- jalur KTP deterministic benar-benar hemat kuota AI
- metadata verifikasi KTP tidak misleading

## Catatan Implementasi

- Solusi harus kecil, konservatif, dan kompatibel dengan codebase saat ini
- Ikuti pola existing NestJS + Prisma + React Query
- Prioritaskan correctness daripada fitur tambahan
