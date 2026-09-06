# KOST48 Surabaya V5 — Agent Guide

Baca `CLAUDE.md`, lalu M12 untuk tugas aktif. Bahasa kerja dan dokumentasi: Indonesia.

## Arah dan status — 6 September 2026

- **Fase EF diprioritaskan:** target satu proses API NestJS, frontend React/Vite tetap, tanpa rewrite domain. Instance Passenger aktual masih UNKNOWN.
- **Fase MA — Batas Modul & Kesiapan Ekstraksi ditunda.** Nama lama V5.7/V5.8/V5.9 arsitektur bukan nomor versi aplikasi; jangan membuat apps/libs, app Nest baru, atau worker.
- EF-01/03/05 tersedia lokal; audit statis EF-01/03/04/07 selesai. Identitas deployment dan dampak PMEM belum diketahui. Lanjut EF-00/02 melalui data hosting; jangan ulang audit selesai tanpa perubahan relevan.
- Fase A masih membutuhkan konfirmasi infrastruktur/deployment; gate terbuka AO tidak dibatalkan. Jangan klaim siap produksi dari status historis fase B–AM.

## Sumber kebenaran

1. M02: keputusan owner; M12: satu checklist dan urutan eksekusi.
2. M19: spesifikasi EF + tabel pengukuran; M08: runbook deploy.
3. M01: master; M00: peta kode; M03–M11/M14–M18: domain terkait.
4. M13: riwayat bertanggal, bukan perintah menjalankan ulang tugas.

Dokumen aktif: seri M00–M19 di `docs/`, ditambah formulir go-live. Statistik model/test dan memory dapat usang; cek source atau hasil bertanggal. `docs/archieve/*`, `reference/*`, `backend/src/generated/*` tidak dibaca rutin.

## Perintah PowerShell

Jalankan dari direktori yang disebut, jangan jalankan server/build untuk task docs-only.

| Direktori | Tujuan | Perintah |
|---|---|---|
| backend | Typecheck tanpa incremental cache | `npx tsc --noEmit --incremental false` |
| backend | Build / unit | `npm run build` / `npm run test:unit` |
| frontend | Build / unit | `npm run build` / `npx vitest run` |
| backend / frontend | Dev (bila dibutuhkan) | `npm run start:dev` / `npm run dev` |
| root | Artefak deploy lokal | `npm run bundle:deploy:fast` / `npm run make-deploy:fast` |

Pembuatan artefak bukan deployment. DB UAT: 5433 `kost48_v3_pro`; DB produksi aktual dikonfirmasi melalui M19, bukan asumsi nama/port.

## Memory dan sesi

Jika tool memory tersedia, gunakan sebagai petunjuk navigasi; jangan menganggap angka atau checklist memory lebih baru dari M12. Jika tidak tersedia, lanjut dengan dokumen lokal. Simpan fakta lintas sesi hanya bila tool tersedia. Sesi baru bila konteks panjang atau topik berubah total; jangan mengulang pekerjaan selesai.

## Batas kerja

- Laksanakan lingkup yang sudah diizinkan tanpa meminta persetujuan yang sama lagi. Izin edit docs mencakup sinkronisasi panduan/checklist, bukan perubahan kode atau server.
- Jaga seluruh perubahan lama termasuk untracked. Dirty tree tidak mewajibkan commit WIP; jangan reset, stash, atau memindahkan perubahan tanpa izin.
- Commit hanya jika diminta; satu task = satu commit terarah bila diizinkan. Jangan push/deploy tanpa izin. Jangan tambah npm dependency tanpa persetujuan owner.
- Selesai task: perbarui M12 + M13; verifikasi sesuai lingkup. Docs-only cukup konsistensi/link/diff, bukan build aplikasi.
- Pisahkan implementasi, bukti lokal, deployment, dan dampak runtime; typecheck bukan build atau UAT. Jangan mutasi DB produksi atau menampilkan secret.
