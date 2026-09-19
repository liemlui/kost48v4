# AI Quickref — KOST48

Sumber aturan: [AGENTS.md](AGENTS.md); exception uang di [AGENTS §8](AGENTS.md#8-verifikasiexception).
Lampiran: [GUIDE §11 — Roadmap](AI_WORKFLOW_GUIDE.md#11-roadmap-migrasi-workflow-30-hari) dan [§12 — Template](AI_WORKFLOW_GUIDE.md#12-lampiran-template-siap-pakai).
Cheatsheet usulan; tidak mengganti gate proyek atau izin user.

## Pilih level berdasarkan risiko

| Level | Scope | Maks. file dibaca/tahap | Test | Build | Token indikatif |
|---|---|---:|---|---|---|
| XS | Typo/copy/style lokal tanpa logika | 5 | Tidak | Tidak | 1–3 ribu |
| S | Satu fungsi, satu file implementasi | 8 | File terkait saja | Tanpa full build | 3–7 ribu |
| M | Beberapa file, satu modul | 12 | Modul terkait saja | Default tidak; target terisolasi jika diizinkan | 7–15 ribu |
| L | Lintas modul/kontrak bersama | 18 | Modul terdampak + kontrak | Entry/package terkait jika perlu dan diizinkan | 15–30 ribu |
| XL | Arsitektur/schema/runtime besar | 20 | Bertahap | Sesuai tahap yang disetujui | 10–25 ribu/tahap |

Hitung file unik berisi konteks, termasuk docs/config dan hasil pencarian isi.
Jangan baca ulang instruksi yang sudah tersedia; token adalah anggaran, bukan jaminan kuota.
XS: setelah izin, langsung edit; tanpa lint/typecheck/server baru; inspeksi diff/ejaan/tautan.
Style global, permission, uang, dan kontrak bersama perlu penilaian risiko lebih tinggi.
S/M: tetapkan target dan test relevan; celah test dicatat, bukan diganti full suite otomatis.
L: petakan producer → kontrak → consumer; entry build harus terbukti tersedia.
XL: persetujuan rencana wajib; tahap kecil; Fase MA tetap ditunda.

## Checklist sebelum edit

- [ ] Instruksi aktif dipahami; satu tujuan dan acceptance jelas.
- [ ] Level, scope baca/edit, batas file, dan anggaran ditetapkan.
- [ ] Audit lama diperiksa kesegarannya; perubahan lokal/untracked dijaga.
- [ ] Izin sudah mencakup tindakan; jangan meminta persetujuan yang sama lagi.
- [ ] Larangan test/build/install/refactor dicatat; gate uang/schema/akses dipertahankan.
- [ ] Sebelum command: periksa cwd, hook pre/post, fixture, efek samping, dan artefak.
- [ ] Kriteria selesai, laporan, serta pembaruan dokumentasi ditetapkan.
- [ ] Commit/push/deploy/DB/dependency/bump versi tidak otomatis diizinkan.

## Verifikasi terbatas — hanya jika diizinkan

- FE, cwd `frontend`: `npm run test -- src/test/<folder>/<nama>.test.tsx`.
- BE, cwd `backend`: `node --test test/unit/<nama>.test.js`.
- Ganti placeholder dengan path nyata; test terpilih harus > 0; catat exit dan hasil.
- BE: `npm run test:unit` memicu build melalui `pretest:unit`; jangan hapus hook sembarangan.
- Runner BE langsung melewati hook, tetapi import/prasyarat dan kesegaran `dist` tetap wajib.
- Artefak basi atau prasyarat tidak tersedia: laporkan verifikasi belum lengkap; jangan klaim PASS.
- `test:module`, `build:module`, `audit:module` masih usulan; wrapper belum dibuat.
- Wrapper usulan wajib menolak ID kosong/asing, test kosong, dan target build tidak tersedia.
- Jangan fallback ke full suite; audit tooling hanya memeriksa manifest/path/kesegaran docs.
- Nest Module/halaman Vite bukan otomatis entry build mandiri; typecheck bukan build.
- Jangan menimpa `dist` produksi dengan output parsial; jangan install dependency otomatis.
