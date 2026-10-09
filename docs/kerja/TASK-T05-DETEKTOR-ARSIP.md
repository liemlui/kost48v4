# TASK-T05-DETEKTOR-ARSIP — detektor "pekerjaan terbuka tidak boleh ikut terarsip"

> **Blok baca** · Jenis: **dokumen kerja per tugas (contoh pertama, A-2)** · Status: **selesai 2026-10-07** · Untuk siapa: agen pelaksana tugas ini + peninjau
> · Baca kalau: mengerjakan atau menilai tugas ini, atau butuh bentuk contoh dokumen kerja A-2. · **Jangan** dibaca kalau: memilih tugas berikutnya (itu [ANTREAN](../ANTREAN.md)) atau mencari hasil pengukuran docs (itu [audit](../audit/audit-aturan-docs-vs-doktrin-2026-10-07.md)).

**Bukan antrean kedua.** Berkas ini **tidak memuat kotak `[ ]`** dan tidak menggantikan baris [ANTREAN](../ANTREAN.md); ia memuat langkah, jangkar, dan bukti untuk **satu** tugas. Bentuk (7 bagian) diputuskan di [ADAPTASI-DOKTRIN-DOCS §3](../rencana/ADAPTASI-DOKTRIN-DOCS.md) butir **A-2**; tugasnya berasal dari temuan **T-05** di [audit aturan docs vs doktrin §2](../audit/audit-aturan-docs-vs-doktrin-2026-10-07.md) dan pertanyaan **U-9** di §5 berkas yang sama.

## 1. Tujuan & definisi selesai

**Tujuan.** Aturan [KONTRAK §7](../KONTRAK.md) — *"pekerjaan terbuka tidak boleh ikut terarsip"* — adalah satu-satunya aturan kita yang **tidak punya detektor sama sekali**: `docs/arsip/**` dikecualikan penuh dari gate, sehingga kotak terbuka di dalam arsip tidak terlihat siapa pun (T-05). Tugas ini membuatnya **terlihat**, tanpa mengubah berkas arsip beku.

**Selesai bila:**
1. Gate mencetak jumlah kotak `[ ]` di `docs/arsip/**` beserta berkasnya — **setiap kali** dijalankan, bukan hanya saat diperiksa manual.
2. Keputusan "blocking atau tidak" **tertulis beserta alasannya** (bukan diserahkan pada ingatan sesi berikutnya), dan tercatat di audit U-9.
3. Uji negatif: terlihat **muncul** ketika sebuah berkas arsip memuat kotak, dan **tidak muncul** ketika tidak ada — tanpa mengubah exit code gate untuk keadaan bersih.
4. Tidak ada pelanggaran baru: gate tetap **BERSIH** dan kartu kekuatan tetap **11/11** sesudah perubahan.

## 2. Kondisi awal + cara mengukur ulang

Potret **2026-10-07** (perintah dijalankan dari akar repo):

| Ukuran | Nilai | Perintah pengukur |
|---|---:|---|
| Berkas `.md` di `docs/arsip/**` | 56 | `Get-ChildItem -Recurse docs/arsip -Filter *.md -File` |
| Kotak `[ ]` di dalam arsip | **244** | `Select-String -Path <arsip> -Pattern '^\s*[-*]\s*\[ \]'` |
| Berkas arsip yang memuatnya | **9** | idem, dikelompokkan per berkas |
| Kotak `[x]` di dalam arsip (pembanding) | 126 | pola `\[x\]` |
| Berkas arsip tanpa kata "beku/arsip" di 6 baris pertama | 47 | idem (temuan sampingan, lihat §6) |

Terbesar: `docs/arsip/audit-checklist-total.md` **117** kotak — memang begitu keadaannya: ia arsip checklist audit 135 ID, dan penggantinya yang tipis adalah [audit/index-cakupan.md](../audit/index-cakupan.md).

**Cara mengukur ulang sesudah tugas:** jalankan `node scripts/check-docs.mjs` dari akar dan baca baris CATATAN ARSIP; angkanya wajib sama dengan hitungan ulang independen di atas.

## 3. Langkah (dari risiko terendah)

| # | Langkah | Jangkar | Selesai bila | Perintah verifikasi |
|---|---|---|---|---|
| 1 | Sisipkan pemindaian `docs/arsip/**` untuk pola kotak terbuka (bukan sekadar menghitung) | `scripts/check-docs.mjs` — blok keluaran R3 (`DIKELUARKAN dari R3 …`) | angka + daftar berkas tercetak | `node scripts/check-docs.mjs` |
| 2 | Cetak sebagai **CATATAN**, bukan pelanggaran, dengan alasan tertulis | kepala `scripts/check-docs.mjs` (kalibrasi) | alasan "arsip beku" tertulis di kepala skrip | baca kepala skrip |
| 3 | Uji negatif dua arah | berkas uji sementara di dalam `docs/arsip/` (lalu dihapus) | muncul saat ada kotak, hilang saat tidak ada, exit code tetap 0 | jalankan gate sebelum/sesudah |
| 4 | Catat keputusan + tutup U-9 | [audit §5](../audit/audit-aturan-docs-vs-doktrin-2026-10-07.md) baris U-9 | baris U-9 menyebut keputusan dan alasannya | baca baris itu |
| 5 | Perbarui dokumentasi tugas ini | §6 dan §7 berkas ini | tabel penyimpangan + riwayat terisi | baca berkas ini |

## 4. Jebakan nyata yang sudah terukur

1. **Aturan ini tidak bisa dijadikan pelanggaran yang memblokir.** 244 kotak tersebar di 9 berkas arsip **beku**; menutupnya berarti menyunting berkas yang oleh [KONTRAK §7](../KONTRAK.md) dinyatakan beku (nama tidak diganti, angka tidak diperbarui) dan yang ikut dijaga **ledger konservasi SHA-256** — normalisasi apa pun akan membuat ledger itu tidak lagi cocok. Pelanggaran yang tidak bisa ditutup = gate yang selalu merah, dan itu dilarang oleh aturan kerja batch ini.
2. **Exit code gate tidak boleh berubah.** "BERSIH" berarti 0 pelanggaran **dan** 0 pemeriksaan dilewati; menambahkan aturan baru ke daftar R akan mengubah janji yang sudah ditulis di [KONTRAK §7](../KONTRAK.md) (11 aturan R1–R11). Karena itu bentuk yang dipilih adalah **CATATAN/INFO**, bukan R12.
3. **Berkas uji di dalam `docs/arsip/` mengubah inventaris arsip** (item H kartu kekuatan). Berkas uji wajib dihapus **sebelum** menjalankan kartu kekuatan, kalau tidak akan lahir kegagalan palsu.
4. **Jangan menyalin aturan arsip ke berkas baru** — AGENTS §1 melarang aturan paralel; aturannya tetap di KONTRAK §7, yang ditambah di sini hanyalah **detektor** dan alasan kalibrasinya di kepala gate.

## 5. Kalau macet (gejala → sebab → tindakan)

| Gejala | Sebab | Tindakan |
|---|---|---|
| Gate mencetak 0 kotak padahal berkas uji berisi kotak | pola tidak cocok karena indentasi/tanda `*` berbeda | pakai pola `^\s*[-*]\s*\[ \]`; uji dengan dua bentuk (`- [ ]` dan `  * [ ]`) |
| Kartu kekuatan gagal item H sesudah uji | berkas uji di `docs/arsip/` belum dihapus | hapus berkas uji, jalankan ulang kartu |
| Angka berbeda dengan hitungan independen | pemindaian menghitung berkas `README.md` arsip (inventaris) juga | sama-sama dihitung; selisih wajib nol, kalau tidak periksa cakupan glob |

## 6. Catatan penyimpangan

| # | Yang direncanakan | Yang terjadi | Alasan / keputusan |
|---|---|---|---|
| 1 | Keputusan "blocking atau tidak" diserahkan ke audit U-9 | diputuskan **CATATAN/INFO, bukan pelanggaran** | memblokir mustahil tanpa menyunting arsip beku (§4 jebakan 1); angka tetap dicetak tiap gate supaya tidak senyap lagi |
| 2 | Dokumen kerja A-2 "dirujuk dari baris ANTREAN" | dirujuk dari baris prioritas [spec §7](../rencana/ALAT-UKUR-KESEGARAN-DOCS.md) dan baris U-9 audit, **bukan** dari ANTREAN | tugas ini bukan tugas produk, jadi tidak ada baris ANTREAN untuk dirujuki; konvensi A-2 di ANTREAN §3 tetap ditulis untuk tugas produk berlevel ≥S |
| 3 | — | temuan sampingan baru: **47 berkas arsip tanpa banner "beku"** di 6 baris pertama | tidak diperbaiki di tugas ini (menyunting 47 berkas beku = kelas risiko yang sama dengan jebakan 1); dicatat sebagai butir keputusan owner di laporan batch |
| 4 | — | **11 tautan mati di berkas ini sendiri** (kedalaman relatif salah: `../../` padahal dari `docs/kerja/` cukup `../`) | ditemukan gate R2 pada jalan pertama, bukan oleh mata; diperbaiki, lalu gate BERSIH. Dicatat karena ini pola yang mudah terulang di folder baru: folder `docs/kerja/` berada **satu** tingkat di bawah `docs/` |

**Hasil uji negatif (dijalankan 2026-10-07, berkas uji di `docs/arsip/` lalu dihapus):**

| Keadaan | CATATAN ARSIP | Exit code |
|---|---|---|
| Baseline | 244 kotak di 9 berkas | 0 |
| + berkas uji berisi `- [ ]` **dan** `  * [ ]` (plus satu `[x]`) | **246 kotak di 10 berkas** | 0 |
| berkas uji sama, isinya hanya `[x]` | **244 kotak di 9 berkas** | 0 |
| sesudah berkas uji dihapus | 244 kotak di 9 berkas | 0 |

Artinya: kedua gaya penulisan kotak terdeteksi, kotak selesai tidak dihitung, dan exit code tidak pernah berubah karena arsip.

## 7. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-07 | Dibuat **sebelum** pekerjaannya sebagai contoh nyata pertama dokumen kerja A-2 (§1–§5), lalu diisi sesudah eksekusi (§6–§7). Keputusan bentuk: CATATAN di gate, bukan aturan R12. |
| 2026-10-07 | Eksekusi selesai: pemindaian `docs/arsip/**` dipasang di `scripts/check-docs.mjs` (kalibrasi 13), diuji negatif dua arah, U-9 ditutup di [audit §5](../audit/audit-aturan-docs-vs-doktrin-2026-10-07.md), gate BERSIH. Sisa butir keputusan owner: banner 47 berkas arsip dan CRLF pada 8 berkas arsip (lihat laporan batch). |
