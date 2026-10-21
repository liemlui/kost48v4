# BATAS KEJUJURAN — apa yang sudah dibuktikan, dan apa yang belum

> **Blok baca** · Jenis: **aturan pendamping + register batas (potret bertanggal)** · Status: **aktif (diperbarui tiap batch besar)** · Untuk siapa: agen yang akan menutup sesi/laporan + owner yang menilai klaim
> · Baca kalau: akan menulis "selesai/hijau/terverifikasi", atau menilai apakah sebuah klaim di repo ini sudah dibuktikan. · **Jangan** dibaca kalau: mencari tugas berikutnya (itu [ANTREAN](../ANTREAN.md)) atau aturan kerja penuh (itu [AGENTS](../../AGENTS.md) + [KONTRAK](../KONTRAK.md)).

**Rumah tetap** untuk disiplin yang selama ini tersebar (T-10 di [audit aturan docs vs doktrin](../arsip/audit-aturan-docs-vs-doktrin-2026-10-07.md)). Aturan **wajibnya** ada di [AGENTS §8](../../AGENTS.md) (dua kalimat yang mengikat) dan [KONTRAK §9](../KONTRAK.md); berkas ini **rincian + daftar batas yang masih berdiri** — bukan aturan kedua, dan **bukan antrean** (tanpa kotak `[ ]`).

## 1. Disiplin yang tidak berumur

1. **Klaim wajib menyebut arti buktinya.** "Hijau" bukan berarti "fiturnya bekerja": tulis *apa* yang dibuktikan (mis. "hijau = kedua halaman masih dirender di browser headless", bukan "alur pembayaran benar").
2. **Pisahkan empat hal yang berbeda:** implementasi lokal · verifikasi lokal · deployment · dampak runtime. Satu tidak pernah menggantikan yang lain.
3. **Tulis `UNKNOWN`** untuk data yang belum diperiksa. Menebak lebih buruk daripada mengaku tidak tahu.
4. **Review oleh pelaksana = `self-review`.** Jangan menyebut "review independen" bila belum ada pihak lain yang benar-benar memeriksa.
5. **Angka hanya dari keluaran perintah**, dan ditulis sebagai **potret bertanggal**; perintah pengukurnya ikut ditulis supaya bisa diulang.
6. **Artefak basi bukan PASS.** Test kosong, hasil tidak lengkap, atau bukti dari input yang sudah berubah tidak dihitung lulus.
7. **Alat ukur pun bisa salah.** Sebelum menyebut sesuatu cacat, verifikasi **sumbernya** (mis. byte berkas), bukan tampilan antara: pada 2026-10-07 satu sesi hampir "memperbaiki" kutipan mojibake yang memang sengaja ditulis sebagai bahan aturan inversi, karena keluaran konsol menampilkan UTF-8 sebagai mojibake.

## 2. Batas yang masih berdiri (potret 2026-10-10)

Yang **belum** dibuktikan, beserta sumber dan cara menutupnya. Diperbarui tiap batch besar; kalau sebuah baris sudah tertutup, ia pindah ke [bukti bertanggal](../arsip/bukti-2026-10.md) dan dihapus dari sini.

| Batas | Sumber (klaim yang berlaku) | Cara menutup |
|---|---|---|
| Dampak **runtime/browser/DB** dashboard OWNER (Z-19) | [audit Z-19](../arsip/owner-dashboard-z19-2026-09-25.md) · [ANTREAN](../ANTREAN.md) §3 | UAT + visual regression OWNER 1024/1280/1440 px |
| Dampak runtime **IMPACT-01** (preview wajib sebelum approve) | [review IMPACT-01](../arsip/payment-impact-review-2026-09-25.md) | UAT alur approve dengan preview gagal |
| **Interleaving transaksi DB nyata** T6/T7 (reset token, refresh) | [audit BE-002](../arsip/backend-auth-2026-09-24.md) | test integrasi dua pool ke Postgres UAT `:5433` |
| **Coverage frontend** | bukti 25 Sep (P4) di [bukti-2026-10](../arsip/bukti-2026-10.md) | provider coverage Vitest (butuh dependency → keputusan owner) |
| **Rotasi** password OWNER + PIN owner | [ANTREAN](../ANTREAN.md) §2 #4 + §3 `A4` | bukti rotasi tanpa mencatat nilai rahasia |
| **Opening balance** produksi | [ANTREAN](../ANTREAN.md) §2 #2 + §3 `A5` | angka cutover atau dokumentasi nol |
| **Smoke produksi** (login, public rooms, trial balance, recon) | [ANTREAN](../ANTREAN.md) §3 `A6` | trial balance `isBalanced`, recon mismatch 0 |
| **Mode Cepat / lapisan kartu AI** (`AIDL-01`…`06`, `AI-USAGE-01`) | [ANTREAN](../ANTREAN.md) §3 | implementasi + gate per kartu |
| Baseline **resource/fault host** (EF-00/02/06/08) | [ANTREAN](../ANTREAN.md) §3 | butuh izin server + artefak tercatat |
| **`.design-audit/` 36 MB** masih di dalam repo (untracked) | [audit §5 U-5c](../arsip/audit-aturan-docs-vs-doktrin-2026-10-07.md) | keputusan owner (data untracked milik sesi lain) |
| **NIK penghuni** tetap ada di runbook produksi | exception owner `PII-DOC-TENANT` ([KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) §6) | keputusan owner; risiko diterima, jejak di riwayat git tidak hilang dengan meredaksi |
| **Kesegaran isi docs** — `% segar` mengukur urutan commit, bukan kebenaran isi | [kartu kesegaran](../arsip/ALAT-UKUR-KESEGARAN-DOCS.md) §6 | tinjauan manusia per dokumen (doktrin TUGAS A-a), hasilnya kartu audit bertanggal |
| **Rujukan kode yang tak bisa diselesaikan** — 41 pada potret 2026-10-10, **diklasifikasikan 2026-10-10**: 20 sah di luar repo (dependency npm, bundel deploy, artefak zona ter-ignore) · 7 di catatan bertanggal (jangan disunting) · 11 ambigu yang bisa diputuskan (**1 tetap UNKNOWN**) · **3 rusak di dokumen hidup dan sudah diperbaiki** | [kartu kesegaran](../arsip/ALAT-UKUR-KESEGARAN-DOCS.md) §6 | ulangi klasifikasi bila angkanya bergerak; yang rusak di dokumen hidup diperbaiki, yang di catatan beku dibiarkan |
| **Detektor nomor baris punya titik buta** — pola di `scripts/check-docs.mjs` hanya mengenal `tsx?\|jsx?\|mjs\|cjs\|prisma\|sql\|ps1`, **tanpa `css\|html\|json\|md`**; 3 rujukan `.css` di `publik.md` karena itu tidak pernah muncul di INFO gate (ditemukan manual 2026-10-10, sudah dikonversi) | temuan sesi 2026-10-10 ([bukti](../arsip/bukti-2026-10.md)) | perluas pola + uji negatif seperti R8–R11; **mengubah pagar = keputusan sendiri**, bukan pekerjaan sampingan |
| **`backend/package.json` `golive:setup` menunjuk skrip yang sudah dihapus** (`node scripts/golive-setup.js`, tidak ada sejak `f815213a` 2026-07-08) — perintah npm itu **mati**, padahal runbook go-live masih menyarankannya | temuan 2026-10-10 ([bukti](../arsip/bukti-2026-10.md)) | keputusan owner: hapus perintahnya, atau arahkan ke `seed-owner.js`/jalur bootstrap; **bukan** dokumen — butuh izin + build/test |
| **`design/` tidak ikut git** (untracked, tidak di-ignore) — klaim bukti di [mode-cepat](../arsip/mode-cepat.md) menyandar pada `design/.preview/check-alur.mjs` yang tidak bisa diperiksa pembaca dengan clone bersih | klasifikasi 41 rujukan 2026-10-10 | keputusan owner: track `design/` atau tandai bukti itu sebagai lokal |
| **GAP #1 / GAP #3** ([flow.md](../domain/publik.md#d4c-flow) §15) kini tampak **sudah ditutup di kode**, tetapi statusnya hanya **pembacaan kode** — tidak ada test/alur runtime yang dijalankan | catatan status 2026-10-10 di [flow.md](../domain/publik.md#d4c-flow) | keputusan owner mencabut GAP + verifikasi runtime bila diperlukan |
| **`node scripts/ukur-serah-terima-docs.mjs`** hanya memeriksa **kecocokan** blok keadaan (HEAD + keberadaan berkas) — **bukan** benar-tidaknya isi potret | [kontrak batch SERAH-SESI](../arsip/SERAH-SESI-DOCS.md) §2 | tinjauan manusia saat menutup sesi: apakah angka `gate`/`kartu` di blok itu masih hasil pengukuran terakhir |

## 3. Cara memakai berkas ini sebelum menutup sesi

1. Baca §1, lalu tulis laporan dengan bentuk di [KONTRAK §9](../KONTRAK.md) — termasuk baris "yang TIDAK dijalankan".
2. Periksa §2: bila pekerjaanmu menutup salah satu baris, **hapus baris itu** dan catat penutupannya di [bukti bertanggal](../arsip/bukti-2026-10.md).
3. Bila pekerjaanmu **menambah** batas baru (mis. sesuatu yang belum pernah dijalankan), tambahkan barisnya di sini — itu bagian dari menutup pekerjaan, bukan kerapian opsional.
