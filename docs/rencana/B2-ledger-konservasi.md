# B2 — ledger konservasi pemindahan arsip legacy (potret 2026-10-05)

> **Blok baca** · Jenis: **kartu bukti pemindahan** · Status: **beku setelah B2** · Untuk siapa: owner + agen verifikator
> · Baca kalau: memverifikasi bahwa pemindahan B2 tidak menghilangkan atau mengubah isi berkas.

Rumah aturan: [RENCANA-ROMPAK-DOCS.md](RENCANA-ROMPAK-DOCS.md) §4 (B2) · keputusan owner: [PERTANYAAN-ROMPAK.md](PERTANYAAN-ROMPAK.md) (P4, P9, P12, P13, P33).

## 1. Ringkasan

| Ukuran | Nilai |
|---|---:|
| Berkas dipindahkan | **39** |
| Total byte | 547 KB |
| Total baris | 5773 |
| Pindah murni (SHA-256 identik sebelum→sesudah) | **37** |
| Transformasi terdokumentasi (bukan pindah murni) | **2** |
| Tujuan | `docs/arsip/legacy/<subfolder-asli>/…` (subfolder dipertahankan, P13) |
| Metode | `git mv` untuk tracked, `Move-Item` + `git add` untuk untracked (P12, P4=a) |

**Dua transformasi** (keputusan P33 / Q31-9): `_AKUN_DUMMY_DEV.md` **dua salinan** (folder `2026-06-16_si_notes/` dan `2026-06-16_root_docs_pre_M/`) memuat kata sandi DEV terbuka (`Owner#2026`, `admin123`, `staff123`, `Tenant#2026`). Keempatnya diganti placeholder + satu baris catatan; **sisa kredensial = 0** di kedua berkas. Karena itu SHA-nya **wajib berbeda** — kalau identik, itu tanda sanitasi gagal.
**Perluasan yang harus diketahui owner:** keputusan P33 menyebut berkas di `si_notes`; berkas **kembar** di `root_docs_pre_M` memuat kredensial yang sama, jadi diperlakukan sama. Kalau owner tidak menghendaki, revert commit B2.1 mengembalikan keduanya.

## 2. Tabel 39 baris

| Berkas (relatif `docs/arsip/legacy/`) | KB | Baris | SHA-256 | Catatan |
|---|---:|---:|---|---|
| `_expired_root_cleanup/PANDUAN_DEPLOY_CPANEL.md` | 15.4 | 324 | `7D20EBA5568E…` | pindah (identik) |
| `_expired_root_cleanup/RUNBOOK_DATA_AWAL_PRODUKSI_DAN_AUDIT_FASILITAS.md` | 23.6 | 399 | `77BFA5F7FDA8…` | pindah (identik) |
| `_expired_root_cleanup/UI_UX_OWNER_ADMIN.md` | 3.1 | 45 | `E61970AD5A20…` | pindah (identik) |
| `_previous_cycles/M09_AUDIT.md` | 70.5 | 805 | `B20633BDDF7F…` | pindah (identik) |
| `_previous_cycles/M14_REDUNDANSI_UI_UX.md` | 1.9 | 34 | `832FC0223F1D…` | pindah (identik) |
| `_previous_cycles/M15_AUDIT_360_FLOW_UANG.md` | 2 | 32 | `C3C1E74D7B01…` | pindah (identik) |
| `_previous_cycles/M16_AUDIT_360_FLOW_HUNI.md` | 1.6 | 29 | `51322D80C1AA…` | pindah (identik) |
| `_previous_cycles/M17_AUDIT_360_P3_P8.md` | 2.2 | 27 | `5B6E67254A1E…` | pindah (identik) |
| `2026-06-16_root_docs_pre_M/_AKUN_DUMMY_DEV.md` | 2.2 | 39 | `84ADC56CD585…` | transformasi: redaksi 4 kredensial -> placeholder |
| `2026-06-16_root_docs_pre_M/_PETA_AI.md` | 6.9 | 67 | `7920FF5216FB…` | pindah (identik) |
| `2026-06-16_root_docs_pre_M/_PROPOSAL_MARKETING_GAMIFIKASI_TIP.md` | 5.6 | 70 | `F56FC0EF979F…` | pindah (identik) |
| `2026-06-16_root_docs_pre_M/_PROPOSAL_METER_LISTRIK_AIR.md` | 5.3 | 69 | `9533E0EA799D…` | pindah (identik) |
| `2026-06-16_root_docs_pre_M/00_BLUEPRINT.md` | 8.9 | 67 | `2AAD609F75C2…` | pindah (identik) |
| `2026-06-16_root_docs_pre_M/01_GROUND_STATE.md` | 9.4 | 97 | `372F5350ED69…` | pindah (identik) |
| `2026-06-16_root_docs_pre_M/02_FLOW_MAP.md` | 29.8 | 343 | `AE95ED98AC76…` | pindah (identik) |
| `2026-06-16_root_docs_pre_M/03_KEPUTUSAN_OWNER.md` | 16.1 | 119 | `910A9AA8A774…` | pindah (identik) |
| `2026-06-16_root_docs_pre_M/04_DEPLOY_AND_PWA.md` | 18 | 204 | `FBE9B2258547…` | pindah (identik) |
| `2026-06-16_root_docs_pre_M/05_VERIFIKASI_KEUANGAN.md` | 8.4 | 97 | `E479D16429DF…` | pindah (identik) |
| `2026-06-16_root_docs_pre_M/06_CONTRACTS.md` | 18.1 | 316 | `E5F54B861919…` | pindah (identik) |
| `2026-06-16_root_docs_pre_M/10_PEMBAYARAN_INVOICE.md` | 6.7 | 46 | `B236BD2092A1…` | pindah (identik) |
| `2026-06-16_root_docs_pre_M/11_BOOKING_RENEWAL.md` | 8.7 | 59 | `6B53A87DB23F…` | pindah (identik) |
| `2026-06-16_root_docs_pre_M/12_CHECKOUT_DEPOSIT_OVERSTAY.md` | 7.5 | 46 | `4C8B0E197E2D…` | pindah (identik) |
| `2026-06-16_root_docs_pre_M/13_AKUNTANSI_LAPORAN.md` | 13.3 | 87 | `35A503ABA563…` | pindah (identik) |
| `2026-06-16_root_docs_pre_M/14_INVENTARIS.md` | 4.7 | 38 | `21A7E72BBA8F…` | pindah (identik) |
| `2026-06-16_root_docs_pre_M/15_STAF_TIKET_KPI.md` | 5.6 | 45 | `60DAB32CA67B…` | pindah (identik) |
| `2026-06-16_root_docs_pre_M/16_NOTIFIKASI_PENGUMUMAN.md` | 6.7 | 40 | `934C3A8DCE74…` | pindah (identik) |
| `2026-06-16_root_docs_pre_M/17_PUBLIK_MARKETING_UIUX.md` | 7.8 | 42 | `92EA055974A5…` | pindah (identik) |
| `2026-06-16_root_docs_pre_M/18_AUTH_FONDASI_ONBOARDING.md` | 6 | 41 | `7FD4FB7312F0…` | pindah (identik) |
| `2026-06-16_root_docs_pre_M/19_GAMIFIKASI_LOYALITAS.md` | 4.7 | 43 | `246BB76E0D24…` | pindah (identik) |
| `2026-06-16_root_docs_pre_M/CHANGELOG.md` | 120.8 | 771 | `8C31C32DF433…` | pindah (identik) |
| `2026-06-16_root_docs_pre_M/GO_LIVE_CHECKLIST.md` | 6.7 | 67 | `1D52CBD77956…` | pindah (identik) |
| `2026-06-16_si_notes/_AKUN_DUMMY_DEV.md` | 2.8 | 46 | `18F7F84C99EC…` | transformasi: redaksi 4 kredensial -> placeholder |
| `2026-06-20_fase_selesai/M13_FASE_H_UIUX_COMPACT.md` | 28.3 | 422 | `804812A32618…` | pindah (identik) |
| `2026-06-20_fase_selesai/M15_FASE_J_HARDENING_AI.md` | 18.2 | 117 | `CD6B8CB01901…` | pindah (identik) |
| `2026-06-20_fase_selesai/M16_PASCA_AUDIT_PLAN.md` | 2.5 | 31 | `E05949836193…` | pindah (identik) |
| `2026-09-07_docs_cleanup/GO_LIVE_DATA_ISI.md` | 8.8 | 108 | `D4460CD6E76C…` | pindah (identik) |
| `audit_fable/00_INDEX.md` | 19 | 205 | `E069516BB316…` | pindah (identik) |
| `AUDIT_INVENTARIS_LENGKAP.md` | 11 | 208 | `AB4F03330DA4…` | pindah (identik) |
| `audit_reasonix/RINGKASAN_EKSEKUTIF.md` | 8.3 | 128 | `3BA02AC3BD3B…` | pindah (identik) |

## 3. Yang TIDAK dipindahkan (dan alasannya)

| Berkas | Alasan |
|---|---|
| `archieve/2026-06-16_root_docs_pre_M/08_CHECKLIST.md` | Keputusan owner: **keluar repo** (checklist eksekusi kedaluwarsa), dieksekusi owner lewat daftar B2 §6.2 |
| 66 berkas kelas C | Tidak dikutip dokumen aktif; **keluar repo** via daftar B2 §6.2 (61 untracked → dipindah, tidak dihapus — O5) |
| `archieve/*.tsv` (1 berkas) | Bukan berkas .md; tidak masuk lingkup recon; tetap di tempat |

**Efek samping yang tercatat:** dua dokumen operasional aktif menyebut `08_CHECKLIST` **berdasarkan nama**, bukan path — `docs/operations/deploy-go-live.md` baris 20 dan `docs/operations/verifikasi-keuangan.md` baris 117. Setelah berkas itu keluar repo, kedua kalimat itu menunjuk berkas yang tidak ada di repo. Dibiarkan apa adanya (rujukan historis), dicatat di sini sebagai known reference.

## 4. Cara memverifikasi ulang

```powershell
# 1) SHA-256 tiap berkas dibandingkan dengan tabel di atas
Get-ChildItem docs/arsip/legacy -Recurse -File | Get-FileHash -Algorithm SHA256
# 2) tidak ada berkas yang hilang: 39 berkas, 39 tracked
git ls-files docs/arsip/legacy | Measure-Object
# 3) sisa folder sumber (68 berkas: 66 kelas C + 08_CHECKLIST + 1 .tsv)
Get-ChildItem docs/archieve -Recurse -File | Measure-Object
# 4) kredensial DEV tidak ada lagi di arsip legacy
Select-String -Path docs/arsip/legacy/**/*.md -Pattern 'Owner#2026|admin123|staff123|Tenant#2026'
```

## 5. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-05 | Dibuat saat B2.1: 39 berkas dipindah (37 identik, 2 transformasi sanitasi), semuanya tracked. |
## 6. Eksekusi B2.2 dan B2.3 (ringkas)

| Langkah | Commit | Hasil | Verifikasi |
|---|---|---|---|
| B2.2 alih rujukan | `56e99f15` | 60 kemunculan `archieve/<berkas>.md` → `arsip/legacy/<berkas>.md` di 23 dokumen aktif (16 berkas ikut ter-commit). Klaster: kontrak 18 · PETA-KODE 7 · flow/publik/ai/KEPUTUSAN-OWNER 15 · sisanya 20 | gate tiap klaster; R2 (tautan mati) **0 → 0**; total pelanggaran 23 + 1 dilewati |
| B2.3 bersih-bersih | `a4b46132` | Pernyataan struktur diperbarui: `AGENTS.md` §6 · `docs/ATURAN.md` · `AGENTS.md` §3 · `docs/product/orientasi.md` · `docs/arsip/README.md` (inventaris `legacy/`) | gate: R5 kembali ke 5; total 23 + 1 dilewati |
| Pemisahan commit campuran | `0f28e8d9` (konten owner) + `56e99f15` (alih rujukan) | Atas instruksi owner 2026-10-05: commit campuran lama dipisah. **Isi berkas owner tidak disentuh** — 20 berkas dipantau SHA-256, **0 berubah** | `git show --stat` kedua commit; commit lama (`59e04736`, `895aff79`, `4282ccf1`) masih dapat diperiksa sampai garbage collection |
| B2 penutup | `c1134387` | 68 berkas (67 `.md` + 1 `.tsv`, 913 KB) dari `docs/archieve/` → `.docs-legacy/` (di dalam repo, **diabaikan git** atas keputusan owner); 7 penghapusan tracked di-commit satu per satu; P5 & P11 ditutup | konservasi **SHA-256 68/68 identik, 0 berbeda**; `git check-ignore docs/archieve/uji.md` kosong; pohon `docs/archieve/` dihapus |

**Penyimpangan yang dicatat (bukan disembunyikan):**

1. **Commit campuran sudah dipisah** (instruksi owner 2026-10-05): `0f28e8d9` = konten dokumentasi owner, `56e99f15` = alih rujukan B2.2. Isi berkas owner **tidak disentuh** (20 berkas dipantau SHA-256, 0 berubah). 2 berkas source owner (`MyManualPage.tsx`, `CekPage.tsx`) tetap belum di-commit sampai B2 ditutup.
2. **Baris `docs/archieve/` di `.git/info/exclude` sengaja belum dihapus** (P5 dieksekusi setelah kelas C dipindah owner) supaya ~62 berkas untracked tidak membanjiri `git status`.
3. **4 sitasi ke berkas yang memang tidak ada** dibiarkan (rusak sebelum B2): `_DEPRECATED_05_UIUX_AUDIT_2026-06-12.md`, `_DEPRECATED_06_DEPLOY_RUNBOOK.md`, `_DEPRECATED_08_PWA_AUDIT_AND_HARDENING_PLAN_2026-06-12.md` (pernah ada di riwayat git), dan `M13_CHANGELOG_ARSIP_S1_2026.md` (tidak pernah ada; nama benarnya `_previous_cycles/M11_CHANGELOG_ARSIP_S1_2026.md`).
4. **Dua dokumen operasional menyebut `08_CHECKLIST` berdasarkan nama** (`operations/deploy-go-live.md` baris 20; `operations/verifikasi-keuangan.md` baris 117) — setelah berkas itu keluar repo, keduanya menunjuk berkas yang tidak ada. Dibiarkan sebagai rujukan historis.

## 7. Angka checkpoint

| Ukuran | Sebelum B2 | Sesudah B2 |
|---|---:|---:|
| `archieve/` di dokumen aktif (tanpa `docs/rencana`) | 93 | **34** |
| — di antaranya catatan historis/keputusan (dibiarkan) | — | 26 |
| — pernyataan struktur yang menyebut sisa folder (sengaja, akurat) | — | 5 |
| — sitasi rusak pra-eksisting | — | 3 |
| `archieve/` di `docs/rencana` (peta sumber, tidak ditulis ulang) | 120 | 127 |
| `archieve/` di arsip beku (dibiarkan, P15) | 76 | 116 |
| Tautan mati (gate R2) | 0 | **0** |
| Pelanggaran gate | 23 + 1 dilewati | **23 + 1 dilewati** (setelah plan dirampingkan) |
| Berkas dipindah & tracked di `docs/arsip/legacy/` | 0 | **39** |
| Berkas fisik di `docs/archieve/` (ditutup 2026-10-05) | 106 | **0** — 39 ke `docs/arsip/legacy/`, 68 ke `.docs-legacy/` (gitignored) |
| Berkas tracked di `docs/archieve/` | 31 | **0** (7 dihapus dari repo; isi tetap di riwayat git) |