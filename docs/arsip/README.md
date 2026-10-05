# docs/arsip/ - Rumah tunggal bukti dan riwayat bulk

> **Aturan baca:** folder ini **bukan** bahan orientasi. AI/agent **tidak membaca** berkas di sini kecuali sedang melakukan forensik bukti bertanggal atau memverifikasi konservasi pemindahan.
> **Dibuat:** 24 Sep 2026 (DOCS-CLEANUP-1). Isi dipindah **utuh/verbatim** dari lokasi lamanya; tidak ada isi yang diubah. Hanya tujuan tautan relatifnya yang di-rebase.

## 1. Isi arsip

| Berkas | Asal | Isi |
|---|---|---|
| [lampiran-audit-portal-tenant-2026-07-02.md](lampiran-audit-portal-tenant-2026-07-02.md) | `docs/history/` | Lampiran audit portal tenant 2 Jul 2026 (bukti bulk) |
| [fase-lama.md](fase-lama.md) | `docs/history/` | Riwayat fase lama; 25 baris trailing whitespace = known exception, isi tidak diubah |
| [DOC-GOV-20260922-mapping.md](DOC-GOV-20260922-mapping.md) | `docs/history/` | Ledger pemetaan migrasi DOC-GOV-20260922 (bukti perpindahan) |
| [changelog-2026-06.md](changelog-2026-06.md) | `docs/history/changelog/` | Changelog bulanan Juni 2026 (rotasi bulan selesai) |
| [changelog-2026-07.md](changelog-2026-07.md) | `docs/history/changelog/` | Changelog bulanan Juli 2026 |
| [changelog-2026-08.md](changelog-2026-08.md) | `docs/history/changelog/` | Changelog bulanan Agustus 2026 |
| [m11-seed-master-data-appendix-2026-07-08.md](m11-seed-master-data-appendix-2026-07-08.md) | `docs/history/` | Lampiran seed master data (M11) |
| [DOC-GOV-20260922.md](DOC-GOV-20260922.md) | `docs/plans/` | Rancangan penataan dokumentasi (selesai; Tahap 1-3 + Fase 2/3) |
| [DOC-GOV-20260922-batch-scope.md](DOC-GOV-20260922-batch-scope.md) | `docs/plans/` | Memo scope batch S2.b3/S2.b4 (DRAFT; batch sudah selesai) |
| [audit-uiux-lintas-portal-2026-07.md](audit-uiux-lintas-portal-2026-07.md) | `docs/audit/` | Bukti bulk audit UI/UX lintas portal (AO-00..AO-23) |
| [audit-uiux-total-2026-09-12.md](audit-uiux-total-2026-09-12.md) | `docs/audit/` | Bukti bulk audit UI/UX total 12 Sep 2026 |
| [legacy/](legacy/) | `docs/archieve/` | **Arsip legacy yang dikutip dokumen aktif** — 39 berkas, subfolder asli dipertahankan (batch B2, 2026-10-05). Ledger konservasi 39 baris (SHA-256 sebelum/sesudah): [B2-ledger-konservasi.md](../rencana/B2-ledger-konservasi.md). 2 berkas di antaranya **transformasi** (kata sandi DEV diredaksi, P33/Q31-9) — SHA-nya memang berbeda |

Changelog bulanan yang **masih berjalan** tetap di `docs/history/changelog/2026-09.md` (menerima rotasi entri M13).

## 2. Yang bukan arsip ini

- `docs/archieve/**` - **sisa yang menunggu dipindah keluar repo**: 68 berkas di disk (**7 tracked**, 61 untracked lokal). Sejak batch B2 (2026-10-05) arsip legacy yang **dikutip dokumen aktif** sudah pindah ke [`legacy/`](legacy/) (39 berkas). Sisa 66 berkas kelas C + `08_CHECKLIST.md` **keluar repo** (eksekusi owner; daftar + perintah: [B2-daftar-pindah-arsip-legacy.md](../rencana/B2-daftar-pindah-arsip-legacy.md) §6.2). Baris `docs/archieve/` di `.git/info/exclude` **sengaja belum dihapus** sampai pemindahan itu selesai - kalau dihapus lebih dulu, ~62 berkas untracked membanjiri `git status`. Keputusan lama `ARSIP-BATAS` (24 Sep 2026) digantikan rencana rombak dokumentasi 2026-10-05.
- `docs/audit-map/**` - **generated dan untracked** (1.126 berkas, 0 tracked), di-ignore `.gitignore` L89 (`/docs/audit-map/`); dipakai 135+ tautan peta per ID audit. **Jangan dihapus** dan jangan dianggap bagian repo; regenerasi `node docs/audit-map/generate.cjs`. Rencana batch **B3** memindahkannya keluar dari `docs/` (target `.audit-map/` di akar repo) dan men-track generatornya.

## 3. Aturan

- Berkas di sini boleh besar; biaya bacanya dipindahkan keluar dari jalur kerja rutin.
- Setiap pemindahan wajib punya bukti konservasi (0 baris non-kosong hilang) di entri riwayat terkait.
- Batas arsip dan berkas besar sudah **diputuskan owner 24 Sep 2026** (`ARSIP-BATAS`): lihat [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) dan [STATUS](../STATUS.md).
