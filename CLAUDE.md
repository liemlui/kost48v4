# KOST48 Surabaya V5 — Panduan Sesi

Sistem manajemen kost 48 kamar. NestJS + Prisma + PostgreSQL (`backend/`), React + Vite + TanStack Query (`frontend/`). Bahasa kerja Indonesia; role OWNER/ADMIN/STAFF/TENANT.

## Arah aktif — 6 September 2026

- Prioritas **Fase EF**, satu proses API NestJS dengan modul internal. Jumlah instance Passenger aktual belum diketahui. Pertahankan frontend dan fitur bisnis yang ada.
- **Fase MA — Batas Modul & Kesiapan Ekstraksi: DITUNDA.** Sebutan lama V5.7/V5.8/V5.9 arsitektur bukan nomor versi aplikasi. Belum ada izin apps/libs, aplikasi Nest baru, ekstraksi service, atau worker.
- Audit lokal EF-01/03/04/07 selesai; EF-01/03/05 tersedia di working tree. Deployment/dampak hosting UNKNOWN. Langkah berikutnya: identitas deployment dan pengamatan pasif EF-00/02.
- Kesiapan produksi belum disahkan; Fase A dan gate terbuka AO tetap berlaku. Audit lama bukan bukti runtime terbaru.

## Sumber dan navigasi

1. `docs/M02_KEPUTUSAN_OWNER.md`: keputusan bisnis dan arah owner.
2. `docs/M12_CHECKLIST_CHANGELOG.md`: checklist aktif dan urutan kerja; jangan ulang task selesai.
3. `docs/M19_EFISIENSI_HOSTING_512MB.md`: spesifikasi EF, bukti lokal, tabel hosting UNKNOWN.
4. `docs/M01_MASTER.md`: orientasi; `docs/M00_CODEMAP.md`: modul ke path sebelum pencarian kode.
5. Domain: M03 flow, M04 keuangan, M05 huni, M06 operasional, M07 publik, M08 deploy, M09 AI, M10 scope, M11 default, M14 UI/UX, M15 IoT, M16 audit, M17 portal, M18 harga. M13 = riwayat.
6. Formulir go-live kanonik: `docs/FORM_ISI_DATA_GO_LIVE.md`. Form lama (`GO_LIVE_DATA_ISI.md`, `tenant-data-template.tsv`) diarsipkan di `docs/archieve/2026-09-07_docs_cleanup/`.

Seri M00–M19 aktif. Judul sumber lama dalam dossier adalah riwayat, bukan file yang perlu dibuat ulang. Memory hanya petunjuk; keputusan terbaru dan bukti kode menang atas memory lama. Jangan baca `docs/archieve/*`, `reference/*`, `backend/src/generated/*`, atau seluruh node_modules.

## Konsep yang sering salah

- Tidak ada model Booking: `Stay` = booking → huni → selesai; promoted saat `initialMetersPromotedAt` terisi.
- DP 30% sewa, hangus, berbeda dari deposit jaminan refundable (`Room.defaultDepositRupiah`). Tanpa denda keterlambatan.
- AI berbayar manual-only OWNER/ADMIN; hasil draft, approval manusia. Key tersedia berbeda dari fitur aktif.
- Lokasi Jl. Hikmah V No. 48, Surabaya Barat (Pakuwon/PTC). Aturan bisnis rinci di M02.

## Aturan kerja

Kerjakan lingkup yang sudah diizinkan tanpa konfirmasi berulang. Permintaan sinkronisasi docs mengizinkan edit docs, bukan deploy/DB. Jaga perubahan lama; dirty tree bukan alasan wajib commit WIP. Jangan reset/stash/pindah perubahan tanpa izin. Jangan tambah npm dependency, push, deploy, atau mutasi DB produksi tanpa izin terkait. Commit hanya jika diminta.

PowerShell: typecheck backend `npx tsc --noEmit --incremental false` dari backend; build `npm run build` dari backend/frontend; unit `npm run test:unit` backend, `npx vitest run` frontend. Typecheck berbeda dari build/UAT. Docs-only: periksa konsistensi, tautan, dan diff; tidak perlu build aplikasi.

Selesai task: M12 + entri M13 sesuai bukti. Bedakan implementasi, verifikasi lokal, deployment, dan dampak terukur. Jangan tampilkan secret. UAT port 5433 `kost48_v3_pro`; identitas DB produksi harus dikonfirmasi.

## Konvensi Versi

`frontend/src/config/version.ts` dan `frontend/public/version.json` adalah versi aplikasi (saat sinkronisasi: 1.3.0). Naikkan hanya atas permintaan bump versi eksplisit. Label fase EF/MA tidak mengubah versi. Build PWA mempunyai BUILD_ID tersendiri.

Audit portal Juli yang dahulu ditempel di sini dipertahankan sebagai lampiran historis M14. Mulai sesi baru bila konteks terlalu panjang atau topik benar-benar berganti; jangan mengulang audit selesai.
