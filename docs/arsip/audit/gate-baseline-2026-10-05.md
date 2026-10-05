# Baseline gate dokumen — potret 2026-10-05

> **BANNER ARSIP** · Diarsipkan: **2026-10-05** · Alasan: **kartu bukti bertanggal**, bukan dokumen hidup.
> Isinya **dibekukan**: angka di sini adalah potret kondisi pada tanggal tersebut dan **tidak diperbarui**.
> Rumah aturannya: [RENCANA-ROMPAK-DOCS.md](../rencana/RENCANA-ROMPAK-DOCS.md) §3–§4 (batch B1) · keputusan owner: [PERTANYAAN-ROMPAK.md](../rencana/PERTANYAAN-ROMPAK.md).
> Pengganti untuk keadaan sekarang: **jalankan** `node scripts/check-docs.mjs` dari akar repo.

> **Blok baca** · Jenis: **kartu bukti gate** · Status: **beku (potret 2026-10-05)** · Untuk siapa: owner + agen pelaksana rombak dokumentasi
> · Baca kalau: mempertanyakan apakah gate dokumen benar-benar bisa gagal, atau melanjutkan batch B2 ke atas.

## 1. Kenapa berkas ini ada

Ukuran keberhasilan rombak (Q32-d) berbunyi: *gate dokumen bisa gagal, **dan pernah dibuktikan gagal***. Tanpa berkas ini,
bukti itu hanya hidup sebagai keluaran terminal satu sesi, lalu menguap — dan gate yang tidak pernah terbukti merah sama saja
dengan gate yang tidak ada. Karena itu baseline ini disimpan sebagai berkas, bukan sebagai tangkapan layar percakapan.

## 2. Lingkungan saat baseline diambil

| Fakta | Nilai | Cara mengukurnya ulang |
|---|---|---|
| Tanggal | 2026-10-05 (±10:55) | `Get-Date -Format 'yyyy-MM-dd HH:mm'` |
| Branch | `docs-rombak` (dibuat di B0 dari `main`) | `git branch --show-current` |
| HEAD | `951f0c95` | `git rev-parse --short HEAD` |
| Remote | `origin` = `github.com/liemlui/kost48v4.git` | `git remote -v` |
| Entri dirty saat B0 | **14** (9 dokumen + 2 source + 3 untracked) | `git status --porcelain` |
| Berkas yang dikawal (9) | **0 berubah** setelah B0 | SHA-256 sebelum/sesudah, di `.design-audit/docs-snapshot-2026-10-05/pre-state-hashes.txt` |
| Snapshot | `.design-audit/docs-snapshot-2026-10-05/` — 1.302 berkas, 9,0 MB (untracked) | bandingkan `docs/` dengan salinannya |
| Perintah | `node scripts/check-docs.mjs` (cwd = akar repo) | — |
| Versi gate | **v1.1** | baris pertama keluaran |

## 3. Hasil: **GAGAL** — exit code `2`

`2` dipakai karena ada pemeriksaan yang **dilewati**, dan melewati pemeriksaan tidak pernah berarti lulus.

```text
=== CHECK-DOCS v1.1 (gate dokumen KOST48) ===
berkas diperiksa : 56 aktif (1292 .md di docs/ seluruhnya; 1241 arsip/generated dikecualikan)
versi kanonik    : 1.3.0, 1.0.0 (dari frontend/src/config/version.ts + package.json)

— R1 angka volatil pada dokumen kontrak: 2
    docs/domain/keuangan.md:126 — menulis jumlah test mutakhir tanpa penanda potret/riwayat
    docs/domain/keuangan.md:127 — menulis jumlah test mutakhir tanpa penanda potret/riwayat

— R2 tautan relatif mati: 1
    docs/product/mode-cepat.md:312 — tautan mati: ../design/alur-semua-halaman.html

— R3 kotak `[ ]` di luar docs/ANTREAN.md: 12
  total kotak terbuka di luar ANTREAN: 368 di 12 berkas
     117  docs/audit/audit-checklist-total.md
      52  docs/operations/deploy-go-live.md
      42  docs/domain/iot.md
      29  docs/STATUS.md
      27  docs/audit/status-ao-lintas-portal.md
      26  docs/operations/iot-water-meter-esp32.md
      18  docs/operations/go-live-cpanel.md
      18  docs/operations/iot-tuya-setup.md
      17  AI_QUICKREF.md
       9  docs/history/governance.md
       8  docs/operations/produksi.md
       5  docs/operations/verifikasi-keuangan.md

— R4 blok baca berkas tangga wajib: 4
    AGENTS.md:1 — 12 baris pertama tanpa blok baca (jenis · status · untuk siapa · baca kalau)
    docs/KONTRAK.md — berkas tangga wajib belum ada
    docs/ANTREAN.md — berkas tangga wajib belum ada
    docs/PETA-KODE.md:1 — 12 baris pertama tanpa blok baca (jenis · status · untuk siapa · baca kalau)

— R5 plafon byte: 4
    AGENTS.md — 17.7 KB (18077 B) > plafon 12.0 KB (12288 B)
    docs/PETA-KODE.md — 16.1 KB (16519 B) > plafon 16.0 KB (16384 B)
    docs/audit/audit-checklist-total.md — 110.1 KB (112742 B) > plafon rujukan 48.0 KB — wajib daftar isi berjangkar atau dipecah
    docs/domain/publik.md — 48.7 KB (49836 B) > plafon rujukan 48.0 KB — wajib daftar isi berjangkar atau dipecah

— INFO kartu bukti (docs/audit, docs/history) — tidak dihitung sebagai pelanggaran: 6
       4  docs/history/changelog/2026-09.md
       1  docs/audit/owner-dashboard-z19-2026-09-25.md
       1  docs/audit/payment-impact-review-2026-09-25.md
    (kartu bukti bertanggal memang memuat angka terukurnya; jangan dianggap kotor)

— DILEWATI (tidak pernah berarti lulus):
    [R3] docs/ANTREAN.md belum ada; kotak otoritatif belum punya rumah (kondisi baseline, bukan lulus)

check-docs: 23 pelanggaran + 1 pemeriksaan dilewati.
```

**Ringkas:** 23 pelanggaran (R1 2 · R2 1 · R3 12 · R4 4 · R5 4) + 1 pemeriksaan dilewati. 368 kotak terbuka hidup di luar antrean.

## 4. Jalan pertama (v1.0) dan dua koreksinya

Jalan pertama gate menghasilkan **29 pelanggaran + 1 dilewati**. Dua temuan di antaranya **bukan** pelanggaran, dan
dibiarkan akan membuat gate menuduh yang benar (gate yang menangis serigala akan diabaikan, lalu mati):

| Koreksi | Sebelum | Sesudah | Dasar |
|---|---|---|---|
| Sumber versi kanonik | `package.json` (root/frontend/backend = `1.0.0`) | `frontend/src/config/version.ts` → `APP_VERSION = '1.3.0'` | `1.0.0` adalah versi paket orkestrator, bukan versi produk; klaim "aplikasi berjalan 1.3.0" di dokumen **benar** |
| Cakupan R1 | semua dokumen aktif | dokumen kontrak saja; `docs/audit/**` + `docs/history/**` dihitung sebagai **INFO** | kartu bukti bertanggal memang memuat angka terukurnya (147/147 test, 12/12 test) — itu temuannya, bukan kebocoran |
| Cacat R3 (v1.0) | temuan kotak dicetak tetapi **tidak** ikut total pelanggaran | setiap berkas ber-kotak = 1 pelanggaran, total kotak jadi metrik | di v1.0 gate bisa mencetak "368 kotak" sambil melaporkan "BERSIH" — persis mode gagal "lulus sambil tidak memeriksa" |

## 5. Batas gate ini (jangan diklaim lebih)

Yang **tidak** diperiksa v1.1: arsip beku (`docs/arsip/**`, `docs/archieve/**`), artefak generated (`docs/audit-map/**`),
rotasi changelog, konservasi baris saat pemindahan, dan isi berkas di luar glob. Gate ini juga **tidak** membuktikan
dokumen itu benar atau mutakhir — ia hanya menolak klaim yang bisa dipastikan salah. Pemeriksaan yang mati akan tampil
sebagai `DILEWATI` + exit `2`, bukan senyap.

## 6. Siapa yang menutup temuan ini

| Temuan | Ditutup oleh batch |
|---|---|
| R1 (2) `docs/domain/keuangan.md` | B5/B8 — ganti angka dengan perintah pengukurnya |
| R2 (1) tautan `../design/alur-semua-halaman.html` di `docs/product/mode-cepat.md` | batch kecil tersendiri (di luar B0–B8) atau B8 |
| R3 (12 berkas, 368 kotak) | B4 — turunkan derajat kotak; hanya `docs/ANTREAN.md` yang otoritatif |
| R4 (4) | B5 — `AGENTS.md` + `docs/KONTRAK.md` + `docs/ANTREAN.md` dibuat lengkap dengan blok baca |
| R5 (4) | B5 (`AGENTS.md`, `PETA-KODE.md`) · B4 (`audit-checklist-total.md`) · B8 (`domain/publik.md`) |
| DILEWATI (1) | B5 — `docs/ANTREAN.md` lahir, rumah kotak otoritatif ada |

## 7. Appendix — koreksi setelah pembekuan

Isi di §3 **dibekukan** dan tidak diubah. Perubahan berikut dicatat di sini supaya angka baseline dan angka gate terkini tidak saling bertentangan.

- **Setelah perbaikan D1 (2026-10-05):** tautan `docs/product/mode-cepat.md` → `../../design/alur-semua-halaman.html` dibetulkan (1 baris, di luar batch). Gate **v1.2** melaporkan **22 pelanggaran + 1 dilewati** (R1 2 · R2 **0** · R3 12 · R4 4 · R5 4), exit `2`. Perubahan aturan yang menyertainya: D2 (`AGENTS.md` dikecualikan dari R4, wajib baris peran) dan D3 (R5 menghormati daftar isi berjangkar).
- **Commit artefak B0–B1: `22f8d408`** (branch `docs-rombak`, 3 berkas, tanpa push). Fix D1 **tidak** ikut di-commit: `docs/product/mode-cepat.md` masih untracked (20,9 KB, berkas owner), sehingga "commit satu baris" akan sekaligus memperkenalkan seluruh berkas itu ke riwayat — fix dibiarkan di working tree dan ikut saat berkas itu di-commit sendiri.

## 8. Riwayat berkas ini

| Tanggal | Perubahan |
|---|---|
| 2026-10-05 | Dibuat di batch B1: baseline gate v1.1 (23 pelanggaran + 1 dilewati, exit 2), termasuk catatan koreksi v1.0 → v1.1. Dibekukan sebagai kartu bukti. |
