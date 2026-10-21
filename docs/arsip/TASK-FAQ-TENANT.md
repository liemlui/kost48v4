> **ARSIP BEKU** · dipindah dari `docs/kerja/` ke `docs/arsip/` pada 2026-10-21 (DOCS-GEN2 D4d addendum). Isi dipindah ke `TASK-AKTIF.md`; **jangan dibaca rutin**.

# TASK-FAQ-TENANT — aturan huni yang terbaca, terarah, dan tidak bertentangan

> **Blok baca** · Jenis: **dokumen kerja tugas (kontrak kerja, bukan antrean)** · Status: **aktif — rencana; belum ada kode yang ditulis** · Untuk siapa: agen yang mengerjakan transparansi aturan untuk penghuni
> · Baca kalau: mengerjakan FAQ/wizard aturan tenant, atau menilai apakah aturan yang tampil sudah sesuai kode. · **Jangan** dibaca kalau: memilih tugas (itu [ANTREAN](../ANTREAN.md)) atau mencari aturan bisnis kanonik (itu [harga.md](../domain/keuangan.md#d4c-harga) · [hunian.md](../domain/hunian.md)).

Bentuk 7 bagian mengikuti konvensi [ANTREAN §3](../ANTREAN.md) butir A-2 — **tanpa kotak**, bukan antrean kedua. Status pekerjaan tetap di [ANTREAN §3](../ANTREAN.md).

## Goal & todos

**Goal.** Penghuni (dan calon penghuni) bisa menemukan **semua aturan yang mengikat mereka** — hewan, jumlah isi, prabayar, pembayaran, deposit, overstay, checkout — dengan angka yang benar, dari dalam aplikasi, tanpa bertanya ke admin.

**Definisi selesai.** Delapan butir §1 terbukti; setiap angka di konten menunjuk sumber kanonik; nol pertentangan dengan kode (daftar F di [TASK-SINKRON-ATURAN](TASK-SINKRON-ATURAN.md) sudah ditutup atau ditandai sengaja).

| Langkah | Status | Bukti penutup |
|---|---|---|
| 1. Model konten tunggal (kategori + sumber angka) | belum | tabel konten + pemetaan ke berkas kanonik |
| 2. Tulis 8 blok aturan + perbaiki teks yang bertentangan | belum | 0 temuan F-04..F-08 tersisa |
| 3. Halaman tenant (ganti draft `GUIDE_TABS`) | belum | render 390/1440 px, ≤2 klik dari beranda |
| 4. Wizard terarah 4 pertanyaan | belum | 4 jalur diuji, hasil = aturan + angka |
| 5. Kartu deposit ringkas + CTA checkout | belum | copy + warna terbukti di layar |
| 6. Dokumen 1 halaman untuk owner (rekomendasi a) | belum | ditandatangani owner |
| 7. Bukti render + jangkar tiap aturan | belum | 390/1440 px, 0 tautan mati |

## 1. Tujuan & definisi selesai

**Tujuan.** Mengganti panduan tenant yang sekarang berupa **draft AI** dengan satu sumber konten yang (a) memuat semua aturan yang mengikat, (b) memakai angka kanonik, (c) bisa dibaca dua cara: **ringkas untuk yang baru** (wizard) dan **rinci untuk yang mencari** (daftar/accordion), dan (d) **tidak pernah bertentangan dengan kode**.

**Definisi selesai (dapat diperiksa).**

1. **Delapan kategori wajib** tampil, masing-masing dengan angka: hewan & depositnya · jumlah isi penghuni & surcharge · prabayar/diskon · pembayaran (DP/pelunasan/bukti transfer) · deposit jaminan & settlement · overstay · checkout · KTP.
2. **Satu sumber**: konten dirender dari satu tabel/berkas, bukan tiga salinan (FAQ publik, panduan tenant, wizard memakai sumber yang sama).
3. **Setiap angka** punya rujukan ke aturan kanonik; tidak ada angka baru yang lahir di FAQ.
4. **Nol pertentangan** dengan kode/dokumen kanonik — daftar F-04..F-08 di [TASK-SINKRON-ATURAN](TASK-SINKRON-ATURAN.md) ditutup atau dinyatakan sengaja.
5. **Bisa ditemukan**: dari beranda tenant ke aturan ≤ **2 klik**; ada pencarian atau tab; teks panjang memakai accordion.
6. **Wizard** (opsional dilewati): 4 pertanyaan → ringkasan aturan yang berlaku + angka + CTA; tidak menyimpan data pribadi.
7. **Deposit dikomunikasikan di depan**: nominal per kamar, refundable, apa yang memotong, kapan diproses — kartu ringkas di halaman aturan **dan** saat checkout.
8. **Checkout humanis**: tombol warna berbeda + copy yang mengingatkan checkout jauh hari dan menyebut konsekuensi overstay; bukti render 390 px dan 1440 px.

## 2. Kondisi awal + cara mengukur ulang

| Bagian | Keadaan 19 Okt 2026 | Bukti |
|---|---|---|
| Panduan tenant | **Draft AI 7 tab** di halaman portal, sebagian angka bertentangan dengan sistem (maks 2 orang, deposit Rp300.000 rata, renewal H-30/H-1/H-7, listrik 7 hari, hewan dilarang) | [MyManualPage.tsx](../../frontend/src/pages/portal/MyManualPage.tsx) |
| FAQ publik | Modul FAQ ada (kategori + urutan), isi awal statis di service | `backend/src/modules/faqs/faqs.service.ts` |
| Aturan kanonik | Harga/DP/deposit di [harga.md](../domain/keuangan.md#d4c-harga); siklus & overstay di [hunian.md](../domain/hunian.md); quota meter di [keuangan.md](../domain/keuangan.md); konstanta di [operasional.md](../domain/hunian.md#d4c-operasional) | — |
| Teks aturan di dokumen | Aturan rumah (bulanan vs harian) sudah ditulis, tetapi belum tentu sama dengan kode | [operasional.md](../domain/hunian.md#d4c-operasional) § Aturan & Panduan Tenant |
| Wizard | **Belum ada** | — |
| Visual alur | Diagram 1000×660 siap dipakai di halaman aturan/wizard | [DIAGRAM-HUNI-KOST48](DIAGRAM-HUNI-KOST48.svg) |
| Prompt FAQ AI | Memuat aturan basi (minimal 1 bulan, DP “bulan pertama”, checkout H-7, WiFi gratis, hewan dilarang) | `backend/src/modules/owner-ai/prompts/faq.prompt.ts` |

**Cara mengukur ulang:** `git grep -n "GUIDE_TABS" frontend/src` · `git grep -n "Tidak ada denda keterlambatan" backend/src` · bandingkan setiap angka konten dengan [harga.md](../domain/keuangan.md#d4c-harga) §2/§7/§8 dan [hunian.md](../domain/hunian.md) Dossier 11–12.

## 3. Langkah (dari risiko terendah)

1. **Tetapkan model konten** — kategori, judul, satu baris ringkas, rincian, rujukan kanonik. Tanpa ini, tiga permukaan akan menyalin tiga versi.
2. **Tulis 8 blok aturan** dan **perbaiki teks yang bertentangan** (F-04..F-08). Ini pekerjaan **teks**, bukan perubahan aturan.
3. **Render di halaman tenant** — ganti draft `GUIDE_TABS` dengan sumber tunggal; pertahankan tab yang sudah berguna (meter, cara bayar, kontak).
4. **Wizard 4 pertanyaan** — “sudah penghuni atau calon?” · “bawa hewan?” · “berapa orang?” · “bayar berapa lama?” → hasil: aturan + angka yang berlaku untuk kombinasi itu.
5. **Kartu deposit + CTA checkout** — nominal per kamar dari data kamar, bukan angka tetap; tombol checkout diberi warna berbeda dan copy humanis.
6. **Dokumen 1 halaman** untuk owner (rekomendasi **a** pada jawaban sebelumnya): ringkasan aturan yang bisa ditandatangani, diturunkan dari konten yang sama.
7. **Bukti** — render 390/1440 px, uji setiap aturan punya jangkar, tanpa PII di screenshot.

Setiap langkah = satu increment yang bisa di-commit sendiri.

## 4. Jebakan nyata yang sudah terukur

- **FAQ bukan sumber aturan.** Menulis angka baru di FAQ = aturan paralel; angka wajib disalin dari kanonik dan diberi rujukan.
- **Jangan mengiklankan yang tidak ditegakkan.** Contoh hari ini: tamu menginap Rp50.000/malam dan denda merokok Rp200.000 tidak punya jalur otomatis. Pilih: tegakkan (task kode) atau hapus dari teks.
- **Angka per kamar bukan konstanta.** Deposit Rp300.000–600.000 dan tarif kamar berbeda; kartu deposit wajib membaca data kamar, bukan angka tetap.
- **Wizard tidak boleh menyimpan data pribadi** (hewan/penghuni/KTP) tanpa tujuan jelas; cukup memilih cabang aturan.
- **Teks panjang di 390 px** — accordion + ringkasan satu baris; jangan tabel lebar.

## 5. Kalau macet (gejala → sebab → tindakan)

| Gejala | Sebab paling sering | Tindakan |
|---|---|---|
| Angka di FAQ berbeda antar halaman | tiga salinan konten | satukan ke satu tabel, render di tiga tempat |
| Aturan bertentangan dengan kode | teks lama/draft AI | jalankan daftar F di [TASK-SINKRON-ATURAN](TASK-SINKRON-ATURAN.md), perbaiki teksnya |
| Tenant tidak menemukan aturan | terkubur di tab ke-7 | naikkan ke beranda + pencarian; ukur ≤2 klik |
| Wizard terasa interogasi | terlalu banyak pertanyaan | batasi 4; sediakan “lewati, tampilkan semua” |

## 6. Catatan penyimpangan

Belum ada. Setiap penyimpangan dari kontrak ini dicatat di sini pada sesi yang sama.

## 7. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-19 | Dibuat dari instruksi owner: semua aturan masuk FAQ + terlihat di app tenant, boleh berbentuk wizard, deposit dikomunikasikan di depan, checkout humanis, overstay diinformasikan. Menggabungkan rekomendasi **(a)** dari jawaban sebelumnya (dokumen 1 halaman). Belum ada kode ditulis. |
