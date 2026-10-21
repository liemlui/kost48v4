> **ARSIP BEKU** · dipindah dari `docs/audit/` ke `docs/arsip/` pada 2026-10-21 (DOCS-GEN2 D4a). Isi tidak diubah selain banner ini + rebase tautan relatif; **jangan dibaca rutin**.

# Inventaris dokumen — baseline D0 (potret 2026-10-20)

> **Blok baca** · Jenis: **kartu audit bertanggal (bukti)** · Status: **final untuk potret 2026-10-20** · Untuk siapa: owner + agen pelaksana program tata ulang dokumen generasi kedua (DOCS-GEN2)
> · Baca kalau: memulai atau menilai batch D0–D9, atau butuh angka awal korpus dokumen. · **Jangan** dibaca kalau: mencari tugas berikutnya (itu [ANTREAN](../ANTREAN.md)) atau aturan kerja (itu [KONTRAK](../KONTRAK.md)).

## 1. Maksud

Program DOCS-GEN2 dimulai dari pengukuran, bukan opini. Kartu ini mengunci **angka awal** supaya setiap batch berikutnya bisa dibandingkan dengan angka yang sama, diukur dengan perintah yang sama. Angka di sini adalah **potret**, bukan keadaan hari ini; ia tidak boleh diperbarui tanpa menjalankan ulang perintahnya.

## 2. Metode

| Perintah | Fungsi | Exit |
|---|---|---|
| `node scripts/inventaris-docs.mjs` | hitung korpus aktif, tier-0, mojibake, emoji, sensus ID | 0 |
| `node scripts/inventaris-docs.mjs --selftest` | buktikan alat ukur bisa gagal (3 kasus) | 0 |
| `node scripts/check-docs.mjs` | gate dokumen v2.0 (R1–R11) | 1 (jumlah pelanggaran berubah selama sesi — lihat §6) |

Alat ukur `scripts/inventaris-docs.mjs` bersifat **baca-saja** dan tidak dijalankan otomatis oleh gate. Cakupannya: seluruh berkas .md di docs/ kecuali folder arsip dan assets, ditambah dua berkas akar (AGENTS.md, CLAUDE.md).

## 3. Korpus aktif (potret 2026-10-20)

| Ukuran | Angka | Catatan |
|---|---:|---|
| Berkas aktif di `docs/` | **84** | tanpa arsip; angka ini diukur **sebelum** kartu ini ditulis |
| Ukuran | **1.346,2 KB** | proksi biaya: byte (bukan baris) |
| Baris | **15.682** | — |
| Tier-0 (5 berkas wajib) | **95,0 KB** | ≈24 ribu token untuk aturan dasar |
| Mojibake | **9 hit di 3 berkas** | sebagian kutipan sengaja |
| Emoji di tier-0 | **22** (PETA 18, ANTREAN 4) | status terbaca sebagai hiasan |
| Pola ID (≥2 kemunculan) | **419** | tanpa registry, tanpa arti tunggal |

**Catatan reproduksi.** Angka di tabel ini adalah potret **sebelum** kartu ini dan alat ukurnya ditambahkan. Menjalankan perintah yang sama sesudahnya melaporkan **85 berkas · 1.354,6 KB · 15.794 baris · tier-0 96,6 KB** (selisih = kartu ini, +8,4 KB, dan kenaikan KEPUTUSAN karena entri `DOCS-GEN2`). Selisih itu bukan kesalahan alat ukur; yang berubah adalah pohon kerjanya.

### 3.1 Tier-0 per berkas

| Berkas | Ukuran | Plafon | Status |
|---|---:|---:|---|
| [AGENTS.md](../../AGENTS.md) | 11,7 KB | 12 KB | di bawah plafon |
| [KONTRAK.md](../KONTRAK.md) | 16,0 KB | 16 KB | tepat di plafon |
| [ANTREAN.md](../ANTREAN.md) | 18,4 KB | 16 KB | **di atas plafon** |
| [PETA-KODE.md](../PETA-KODE.md) | 15,8 KB | 16 KB | di bawah plafon |
| [KEPUTUSAN-OWNER.md](../KEPUTUSAN-OWNER.md) | 33,1 KB | tidak berplafon | kandidat pemangkasan D4 |

### 3.2 Sepuluh berkas terbesar

| Berkas | Ukuran |
|---|---:|
| [history/bukti-2026-10.md](bukti-2026-10.md) | 113,2 KB |
| [domain/publik.md](../domain/publik.md) | 51,4 KB |
| [operations/efisiensi-hosting.md](../operations/efisiensi-hosting.md) | 38,9 KB |
| [operations/produksi.md](../operations/produksi.md) | 37,1 KB |
| [domain/flow.md](../domain/flow.md) | 35,9 KB |
| [domain/iot.md](../domain/iot.md) | 35,2 KB |
| [history/changelog/2026-10.md](../history/changelog/2026-10.md) | 35,0 KB |
| [operations/deploy-go-live.md](../operations/deploy-go-live.md) | 34,7 KB |
| [audit-aturan-docs-vs-doktrin-2026-10-07.md](audit-aturan-docs-vs-doktrin-2026-10-07.md) | 33,3 KB |
| [KEPUTUSAN-OWNER.md](../KEPUTUSAN-OWNER.md) | 33,1 KB |

## 4. Sensus ID — mengapa penamaan perlu konstitusi

419 pola dengan ≥2 kemunculan. Sebagian besar sah (nama modul, tipe, istilah). Yang menjadi temuan adalah **token pendek yang menanggung lebih dari satu arti**:

| Token | Arti pertama | Arti kedua | Bukti |
|---|---|---|---|
| `F1` | kode kamar F1 | temuan/fase F1 (`F1-12`, `F1-2`) | [data-master](../operations/data-master.md) vs [ANTREAN](../ANTREAN.md) |
| `P1` | prioritas P1 | pertanyaan owner P1 (`TANYA-OWNER`) dan temuan `P1-04` | [ANTREAN](../ANTREAN.md) vs [TANYA-OWNER](../kerja/TANYA-OWNER.md) |
| `A-1` vs `A1` | butir adopsi doktrin A-1 | tugas antrean A1 | [ADAPTASI-DOKTRIN-DOCS](../rencana/ADAPTASI-DOKTRIN-DOCS.md) vs [ANTREAN](../ANTREAN.md) |
| `R1` / `R-1` / `R-30` | aturan gate R1 | ide ditolak R-1; rekomendasi desain R-30 | [check-docs.mjs](../../scripts/check-docs.mjs) vs [ADAPTASI](../rencana/ADAPTASI-DOKTRIN-DOCS.md) vs [AUDIT-GOLIVE](../kerja/AUDIT-GOLIVE-2026-10-19.md) |

Kesimpulan yang bisa dipakai: **jangan memakai satu huruf + angka untuk ID proses**. Kode kamar (A–M, F1–F2) tetap seperti sekarang karena itu kode domain; justru itu alasan ID proses harus berbentuk lain.

## 5. Sensus simbol

| Berkas | Mojibake | Catatan |
|---|---:|---|
| [history/bukti-2026-10.md](bukti-2026-10.md) | 7 | perlu diperiksa: kutipan atau kerusakan |
| [audit-aturan-docs-vs-doktrin-2026-10-07.md](audit-aturan-docs-vs-doktrin-2026-10-07.md) | 1 | kemungkinan kutipan sengaja (T-16) |
| [operations/default-dev.md](../operations/default-dev.md) | 1 | perlu diperiksa |

Emoji tier-0: [PETA-KODE.md](../PETA-KODE.md) 18, [ANTREAN.md](../ANTREAN.md) 4. Tidak ada di AGENTS, KONTRAK, dan KEPUTUSAN.

## 6. Gate saat baseline

`node scripts/check-docs.mjs` → **exit 1**. Dua laporan pada hari yang sama, keduanya dicatat:

| Waktu (WIB) | Pelanggaran | Sebab |
|---|---:|---|
| 12:20 | 1 | **R5** — ANTREAN.md 18.865 B > plafon 16.384 B |
| 13:05 | 5 | **R5** yang sama + **R11** 4 berkas: `.deploy-head/AGENTS.md`, `.deploy-head/docs/ANTREAN.md`, `.deploy-head/docs/KONTRAK.md`, `.deploy-head/docs/PETA-KODE.md` |

R5 sudah ada sebelum program dimulai dan ditutup di batch D5 (antrean dipangkas), bukan dengan menaikkan plafon.

**R11 berasal dari luar sesi ini.** Folder `.deploy-head/` adalah salinan pohon kerja yang **untracked** (`git status` = `?? .deploy-head/`), dibuat **12:51 WIB**, dan tidak disebut oleh skrip repo mana pun. Sesi ini tidak membuat, memindahkan, atau menghapusnya. Selama folder itu ada, batch yang menuntut gate hijau tidak bisa ditutup. Tiga jalan keluar, semuanya keputusan pemilik folder: (a) hapus setelah deploy selesai; (b) nyatakan sebagai zona generated dan kecualikan R11 **dengan laporan yang terlihat** (bukan pengecualian senyap); (c) biarkan merah dan jangan tutup batch. Sesi ini tidak memilih salah satunya tanpa bukti pemiliknya.

## 7. Keputusan owner yang memicu program

Tercatat di [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) sebagai `DOCS-GEN2` (20 Okt 2026):

- **Q1 = a** — satu desain: Normal; `/cepat` dipensiunkan setelah elemennya dipindah ke kokpit owner.
- **Q2 = b** — checklist pindah ke dokumen tugas; ANTREAN satu baris per tugas; gate mengikat keduanya.
- **Q3 = a** — target konsolidasi ≤30 berkas aktif dan ≤400 KB.

## 8. Batas alat ukur ini

- Sensus ID memakai regex, bukan parser: ia menghitung **pola**, bukan makna. Karena itu ia bisa menunjukkan tabrakan, tetapi tidak bisa memutuskan ID mana yang benar.
- Mojibake dihitung dari pola byte khas salah decode; **kutipan sengaja ikut terhitung**. Gate yang akan datang butuh penanda baris, bukan pengecualian berkas.
- Rentang emoji tidak menangkap semua piktograf; angka 22 adalah batas bawah.
- Self-test pertama **gagal** karena ekspektasi uji saya salah (3 vs 4 ID), bukan karena kode salah; ekspektasi diperbaiki dan uji kini lulus. Ini bukti uji bisa gagal, bukan bukti cakupan lengkap.
- Angka di kartu ini adalah potret; mengutipnya tanpa tanggal dan tanpa perintah di §2 adalah kesalahan.

## 9. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-20 | Dibuat sebagai baseline D0 program DOCS-GEN2. Alat ukur `scripts/inventaris-docs.mjs` ditambahkan (baca-saja, ber-self-test). Tidak ada dokumen lama yang diubah. Gate tetap 1 pelanggaran (R5 ANTREAN). |
