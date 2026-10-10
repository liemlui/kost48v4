# BATAS KEJUJURAN — apa yang sudah dibuktikan, dan apa yang belum

> **Blok baca** · Jenis: **aturan pendamping + register batas (potret bertanggal)** · Status: **aktif (diperbarui tiap batch besar)** · Untuk siapa: agen yang akan menutup sesi/laporan + owner yang menilai klaim
> · Baca kalau: akan menulis "selesai/hijau/terverifikasi", atau menilai apakah sebuah klaim di repo ini sudah dibuktikan. · **Jangan** dibaca kalau: mencari tugas berikutnya (itu [ANTREAN](../ANTREAN.md)) atau aturan kerja penuh (itu [AGENTS](../../AGENTS.md) + [KONTRAK](../KONTRAK.md)).

**Rumah tetap** untuk disiplin yang selama ini tersebar (T-10 di [audit aturan docs vs doktrin](../audit/audit-aturan-docs-vs-doktrin-2026-10-07.md)). Aturan **wajibnya** ada di [AGENTS §8](../../AGENTS.md) (dua kalimat yang mengikat) dan [KONTRAK §9](../KONTRAK.md); berkas ini **rincian + daftar batas yang masih berdiri** — bukan aturan kedua, dan **bukan antrean** (tanpa kotak `[ ]`).

## 1. Disiplin yang tidak berumur

1. **Klaim wajib menyebut arti buktinya.** "Hijau" bukan berarti "fiturnya bekerja": tulis *apa* yang dibuktikan (mis. "hijau = kedua halaman masih dirender di browser headless", bukan "alur pembayaran benar").
2. **Pisahkan empat hal yang berbeda:** implementasi lokal · verifikasi lokal · deployment · dampak runtime. Satu tidak pernah menggantikan yang lain.
3. **Tulis `UNKNOWN`** untuk data yang belum diperiksa. Menebak lebih buruk daripada mengaku tidak tahu.
4. **Review oleh pelaksana = `self-review`.** Jangan menyebut "review independen" bila belum ada pihak lain yang benar-benar memeriksa.
5. **Angka hanya dari keluaran perintah**, dan ditulis sebagai **potret bertanggal**; perintah pengukurnya ikut ditulis supaya bisa diulang.
6. **Artefak basi bukan PASS.** Test kosong, hasil tidak lengkap, atau bukti dari input yang sudah berubah tidak dihitung lulus.
7. **Alat ukur pun bisa salah.** Sebelum menyebut sesuatu cacat, verifikasi **sumbernya** (mis. byte berkas), bukan tampilan antara: pada 2026-10-07 satu sesi hampir "memperbaiki" kutipan mojibake yang memang sengaja ditulis sebagai bahan aturan inversi, karena keluaran konsol menampilkan UTF-8 sebagai mojibake.

## 2. Batas yang masih berdiri (potret 2026-10-07)

Yang **belum** dibuktikan, beserta sumber dan cara menutupnya. Diperbarui tiap batch besar; kalau sebuah baris sudah tertutup, ia pindah ke [bukti bertanggal](bukti-2026-10.md) dan dihapus dari sini.

| Batas | Sumber (klaim yang berlaku) | Cara menutup |
|---|---|---|
| Dampak **runtime/browser/DB** dashboard OWNER (Z-19) | [audit Z-19](../audit/owner-dashboard-z19-2026-09-25.md) · [ANTREAN](../ANTREAN.md) §3 | UAT + visual regression OWNER 1024/1280/1440 px |
| Dampak runtime **IMPACT-01** (preview wajib sebelum approve) | [review IMPACT-01](../audit/payment-impact-review-2026-09-25.md) | UAT alur approve dengan preview gagal |
| **Interleaving transaksi DB nyata** T6/T7 (reset token, refresh) | [audit BE-002](../audit/backend-auth-2026-09-24.md) | test integrasi dua pool ke Postgres UAT `:5433` |
| **Coverage frontend** | bukti 25 Sep (P4) di [bukti-2026-10](bukti-2026-10.md) | provider coverage Vitest (butuh dependency → keputusan owner) |
| **Rotasi** password OWNER + PIN owner | [ANTREAN](../ANTREAN.md) §2 #4 + §3 `A4` | bukti rotasi tanpa mencatat nilai rahasia |
| **Opening balance** produksi | [ANTREAN](../ANTREAN.md) §2 #2 + §3 `A5` | angka cutover atau dokumentasi nol |
| **Smoke produksi** (login, public rooms, trial balance, recon) | [ANTREAN](../ANTREAN.md) §3 `A6` | trial balance `isBalanced`, recon mismatch 0 |
| **Mode Cepat / lapisan kartu AI** (`AIDL-01`…`06`, `AI-USAGE-01`) | [ANTREAN](../ANTREAN.md) §3 | implementasi + gate per kartu |
| Baseline **resource/fault host** (EF-00/02/06/08) | [ANTREAN](../ANTREAN.md) §3 | butuh izin server + artefak tercatat |
| **`.design-audit/` 36 MB** masih di dalam repo (untracked) | [audit §5 U-5c](../audit/audit-aturan-docs-vs-doktrin-2026-10-07.md) | keputusan owner (data untracked milik sesi lain) |
| **NIK penghuni** tetap ada di runbook produksi | exception owner `PII-DOC-TENANT` ([KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) §6) | keputusan owner; risiko diterima, jejak di riwayat git tidak hilang dengan meredaksi |
| **Kesegaran isi docs** — `% segar` mengukur urutan commit, bukan kebenaran isi | [kartu kesegaran](../rencana/ALAT-UKUR-KESEGARAN-DOCS.md) §6 | tinjauan manusia per dokumen (doktrin TUGAS A-a), hasilnya kartu audit bertanggal |
| **24 rujukan kode yang tak bisa diselesaikan** pada potret kesegaran pertama | [kartu kesegaran](../rencana/ALAT-UKUR-KESEGARAN-DOCS.md) §6 | periksa satu per satu; 2 sudah terverifikasi basi dan diperbaiki ([PETA-KODE](../PETA-KODE.md)) |
| **101 rujukan nomor baris** di 9 dokumen kontrak aktif (potret 2026-10-09) — kebijakan "kutipan, bukan nomor baris" ada ([KONTRAK §7](../KONTRAK.md)), detektornya ada (INFO gate), **konversi otomatis DIHENTIKAN** karena merusak (4 kerusakan terukur; semuanya dipulihkan, **0 perubahan di-commit**) | INFO `CATATAN NOMOR BARIS` di `node scripts/check-docs.mjs` + prosedur aman di [default-dev §10a](../operations/default-dev.md) | konversi **manual per rujukan** dengan verifikasi kode pada simbol yang dituju — **bukan** pekerjaan mesin |
| **`node scripts/ukur-serah-terima-docs.mjs`** hanya memeriksa **kecocokan** blok keadaan (HEAD + keberadaan berkas) — **bukan** benar-tidaknya isi potret | [kontrak batch SERAH-SESI](../rencana/SERAH-SESI-DOCS.md) §2 | tinjauan manusia saat menutup sesi: apakah angka `gate`/`kartu` di blok itu masih hasil pengukuran terakhir |

## 3. Cara memakai berkas ini sebelum menutup sesi

1. Baca §1, lalu tulis laporan dengan bentuk di [KONTRAK §9](../KONTRAK.md) — termasuk baris "yang TIDAK dijalankan".
2. Periksa §2: bila pekerjaanmu menutup salah satu baris, **hapus baris itu** dan catat penutupannya di [bukti bertanggal](bukti-2026-10.md).
3. Bila pekerjaanmu **menambah** batas baru (mis. sesuatu yang belum pernah dijalankan), tambahkan barisnya di sini — itu bagian dari menutup pekerjaan, bukan kerapian opsional.
