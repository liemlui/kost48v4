# B3 — ledger pemindahan peta audit ke `.audit-map/` (potret 2026-10-05)

> **Blok baca** · Jenis: **kartu bukti pemindahan** · Status: **beku setelah B3** · Untuk siapa: owner + agen verifikator
> · Baca kalau: memverifikasi pemindahan peta audit atau menjalankan ulang generasinya.

Rumah aturan: [RENCANA-ROMPAK-DOCS.md](RENCANA-ROMPAK-DOCS.md) §4 (B3) · keputusan owner: [PERTANYAAN-ROMPAK.md](PERTANYAAN-ROMPAK.md) (Q21, P14, P15).

## 1. Apa yang dipindah dan mengapa

| Sebelum | Sesudah | Alasan |
|---|---|---|
| `docs/audit-map/**` (1.126 berkas, ≈4,0 MB, generated, **untracked**) | **`.audit-map/**`** (akar repo, tetap **gitignored**) | 4 MB artefak generated berada di dalam pohon dokumen yang dipindai AI; Q21 = keluarkan dari `docs/` |
| `docs/audit-map/generate.cjs` (23,7 KB, ikut ter-ignore karena ada di dalam folder) | **`scripts/audit-map-generate.cjs`** (**tracked**) | P14: generator harus ikut repo supaya peta bisa diregenerasi di clone bersih |

Perubahan pendukung:

- `.gitignore` L89: `/docs/audit-map/` → **`/.audit-map/`** (hanya keluarannya yang diabaikan; generator kini di `scripts/` sehingga tracked).
- Generator dipatch 2 baris: `ROOT = path.resolve(__dirname, '..')` (scripts/ → akar repo) dan `OUT = path.join(ROOT, '.audit-map')`. Sisa logika tidak disentuh.
- Konservasi fisik: 1.126 berkas pindah; sampel 6 berkas inti (`README.md`, `CARA_AUDIT.md`, `ALUR_LINTAS_DOMAIN.md`, `GENERATED_INDEX.md`, `summary.json`, `inventory.json`) **SHA-256 identik sebelum/sesudah (0 berbeda)**. `docs/audit-map` tidak ada lagi.

## 2. Tautan di dalam peta (akibat naik satu tingkat)

Folder peta naik satu tingkat (`docs/audit-map` → `.audit-map`), sehingga tautan **ke sumber** (`[source](…)`) kehilangan tepat satu segmen `../`, sedangkan tautan **antar-berkas peta** tidak berubah (kedua ujung ikut pindah).

| Ukuran | Jumlah |
|---|---:|
| Berkas peta diperiksa | 1.123 |
| Tautan internal peta (tidak diubah) | **2.805** |
| Tautan ke sumber **diperbaiki** (−1 `../`) | **1.203** |
| Berkas dengan sebutan path repo-relatif diperbaiki | 3 |
| Tautan tidak dapat diperbaiki otomatis | 5 (di `README.md` peta — lihat §3) |
| **Verifikasi akhir** | **4.013 tautan relatif diperiksa, 0 rusak** |

## 3. Lima tautan peta yang ternyata sudah rusak sebelum B3

`README.md` peta menunjuk nama dokumen **era pra-Fase-3** yang sudah dihapus. Bukan akibat B3; ditemukan karena verifikasi. Dibetulkan ke rumah kanonik:

| Rujukan lama (mati) | Dibetulkan ke |
|---|---|
| `../M00_CODEMAP.md` | `../docs/PETA-KODE.md` |
| `../M02_KEPUTUSAN_OWNER.md` | `../docs/KEPUTUSAN-OWNER.md` |
| `../M12_CHECKLIST_CHANGELOG.md#antrean-prioritas-aktif` | `../docs/STATUS.md#2-antrean-prioritas-aktif` |
| `../CHECKLIST_AUDIT_TOTAL.md` | `../docs/arsip/audit-checklist-total.md` |
| `../M13_CHANGELOG.md` (berkasnya ada, pathnya yang salah setelah pindah) | `../docs/M13_CHANGELOG.md` |

## 4. Rujukan di dokumen aktif

| Bentuk | Jumlah dialihkan |
|---|---:|
| Tautan markdown (path relatif dihitung ulang per lokasi berkas) | **157** |
| Sebutan path repo-relatif `docs/audit-map` → `.audit-map` | **24** |
| Gagal dialihkan | **0** |
| Berkas terdampak terbesar | `docs/arsip/audit-checklist-total.md` (140 tautan) |

2 tautan ke **direktori** (`../audit-map/`, tanpa nama berkas) tidak tertangkap pola pertama dan sempat memunculkan 3 temuan R2; dibetulkan menjadi `../../.audit-map/` (2 berkas: `docs/audit/README.md`, `docs/history/governance.md`). Sesudahnya **R2 kembali 0**.

**Arsip beku (P15):** rujukan di `docs/arsip/**` **dibiarkan** apa adanya. `docs/arsip/README.md` §2 dan `docs/arsip/audit/gate-baseline-2026-10-05.md` yang menyebut lokasi lama dianggap catatan bertanggal.

## 5. Yang MASIH harus dijalankan (batas sandbox)

Regenerasi peta **belum** dijalankan oleh agen: generator memanggil `git rev-parse HEAD` lewat `child_process` dengan pipa stdio, dan sandbox sesi ini menolak spawn seperti itu (EPERM — batas terdokumentasi, bukan kegagalan skrip). Isi peta saat ini sudah benar tautannya (diverifikasi 4.013/4.013), tetapi stempel `HEAD`/fingerprint di `summary.json` masih dari generasi sebelum B3.

Perintah untuk owner (satu baris, dari akar repo):

```powershell
node scripts/audit-map-generate.cjs
```

Setelah itu peta akan menulis ulang seluruh keluarannya di `.audit-map/` dengan stempel HEAD terkini. Peta tetap gitignored, jadi menjalankannya **tidak** mengubah git.

## 6. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-05 | Dibuat saat B3: 1.126 berkas pindah ke `.audit-map/`; generator ke `scripts/` (tracked) dan dipatch; 1.203 tautan sumber diperbaiki; 157 tautan + 24 path dokumen aktif dialihkan; 4.013 tautan diverifikasi, 0 rusak. |
