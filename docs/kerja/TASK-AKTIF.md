# TASK-AKTIF — empat pekerjaan terbuka (FAQ, huni, sinkron aturan, UIUX)

> **Blok baca** · Jenis: **dokumen kerja tugas (gabungan, bukan antrean)** · Status: **aktif (potret 2026-10-21)** · Untuk siapa: agen yang mengerjakan salah satu dari empat tugas ini
> · Baca kalau: butuh kontrak kerja salah satu tugas aktif. · **Jangan** dibaca kalau: mencari status antrean (itu [ANTREAN](../ANTREAN.md)).

**Catatan.** Empat dokumen kerja digabung agar tidak ada pekerjaan terbuka yang diarsipkan. Status tugas tetap di [ANTREAN](../ANTREAN.md); tiap bagian mempertahankan teks aslinya, hanya heading digeser satu tingkat.

## Daftar isi

- [Bagian A — FAQ tenant](#d4f-faq)
- [Bagian B — Check-in/KTP/notifikasi](#d4f-huni)
- [Bagian C — Sinkron aturan](#d4f-sinkron)
- [Bagian D — UIUX showcase](#d4f-uiux)

<a id="d4f-faq"></a>
## Bagian A — FAQ tenant & aturan huni

> **Blok baca** · Jenis: **dokumen kerja tugas (kontrak kerja, bukan antrean)** · Status: **aktif — rencana; belum ada kode yang ditulis** · Untuk siapa: agen yang mengerjakan transparansi aturan untuk penghuni
> · Baca kalau: mengerjakan FAQ/wizard aturan tenant, atau menilai apakah aturan yang tampil sudah sesuai kode. · **Jangan** dibaca kalau: memilih tugas (itu [ANTREAN](../ANTREAN.md)) atau mencari aturan bisnis kanonik (itu [harga.md](../domain/keuangan.md#d4c-harga) · [hunian.md](../domain/hunian.md)).

Bentuk 7 bagian mengikuti konvensi [ANTREAN §3](../ANTREAN.md) butir A-2 — **tanpa kotak**, bukan antrean kedua. Status pekerjaan tetap di [ANTREAN §3](../ANTREAN.md).

### Goal & todos

**Goal.** Penghuni (dan calon penghuni) bisa menemukan **semua aturan yang mengikat mereka** — hewan, jumlah isi, prabayar, pembayaran, deposit, overstay, checkout — dengan angka yang benar, dari dalam aplikasi, tanpa bertanya ke admin.

**Definisi selesai.** Delapan butir §1 terbukti; setiap angka di konten menunjuk sumber kanonik; nol pertentangan dengan kode (daftar F di [TASK-SINKRON-ATURAN](TASK-AKTIF.md#d4f-sinkron) sudah ditutup atau ditandai sengaja).

| Langkah | Status | Bukti penutup |
|---|---|---|
| 1. Matriks konten 8 kategori + sumber angka (§2) | selesai 2026-10-21 | tabel matriks di §2 |
| 2. Model konten tunggal `frontend/src/data/tenantRules.ts` | selesai 2026-10-21 | 8 kategori bertipe + angka dari `TenantRuleContext` |
| 3. Halaman tenant (ganti `GUIDE_TABS`) | selesai 2026-10-21 | render 390/1440 px, ≤2 klik dari beranda |
| 4. Wizard terarah 4 pertanyaan | selesai 2026-10-21 | 4 jalur diuji, hasil = aturan + angka |
| 5. Kartu deposit ringkas + CTA checkout | selesai 2026-10-21 | nominal kamar (bukan konstanta) + warna CTA beda |
| 6. Dokumen 1 halaman untuk owner (rekomendasi a) | selesai 2026-10-21 — menunggu tanda tangan | [ATURAN-TENANT-1-HALAMAN](ATURAN-TENANT-1-HALAMAN.md) |
| 7. F-15/F-16/F-17 diselaraskan atau ditandai | selesai 2026-10-21 | FAQ seed + copy publik = D-24; banner hunian.md hidup |
| 8. Bukti render + jangkar tiap aturan | belum | 390/1440 px, 0 tautan mati |

### 1. Tujuan & definisi selesai

**Tujuan.** Mengganti panduan tenant yang sekarang berupa **draft AI** dengan satu sumber konten yang (a) memuat semua aturan yang mengikat, (b) memakai angka kanonik, (c) bisa dibaca dua cara: **ringkas untuk yang baru** (wizard) dan **rinci untuk yang mencari** (daftar/accordion), dan (d) **tidak pernah bertentangan dengan kode**.

**Definisi selesai (dapat diperiksa).**

1. **Delapan kategori wajib** tampil, masing-masing dengan angka: hewan & depositnya · jumlah isi penghuni & surcharge · prabayar/diskon · pembayaran (DP/pelunasan/bukti transfer) · deposit jaminan & settlement · overstay · checkout · KTP.
2. **Satu sumber**: konten dirender dari satu tabel/berkas, bukan tiga salinan (FAQ publik, panduan tenant, wizard memakai sumber yang sama).
3. **Setiap angka** punya rujukan ke aturan kanonik; tidak ada angka baru yang lahir di FAQ.
4. **Nol pertentangan** dengan kode/dokumen kanonik — daftar F-04..F-08 di [TASK-SINKRON-ATURAN](TASK-AKTIF.md#d4f-sinkron) ditutup atau dinyatakan sengaja.
5. **Bisa ditemukan**: dari beranda tenant ke aturan ≤ **2 klik**; ada pencarian atau tab; teks panjang memakai accordion.
6. **Wizard** (opsional dilewati): 4 pertanyaan → ringkasan aturan yang berlaku + angka + CTA; tidak menyimpan data pribadi.
7. **Deposit dikomunikasikan di depan**: nominal per kamar, refundable, apa yang memotong, kapan diproses — kartu ringkas di halaman aturan **dan** saat checkout.
8. **Checkout humanis**: tombol warna berbeda + copy yang mengingatkan checkout jauh hari dan menyebut konsekuensi overstay; bukti render 390 px dan 1440 px.

### 2. Kondisi awal + cara mengukur ulang

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

### 3. Langkah (dari risiko terendah)

1. **Tetapkan model konten** — kategori, judul, satu baris ringkas, rincian, rujukan kanonik. Tanpa ini, tiga permukaan akan menyalin tiga versi.
2. **Tulis 8 blok aturan** dan **perbaiki teks yang bertentangan** (F-04..F-08). Ini pekerjaan **teks**, bukan perubahan aturan.
3. **Render di halaman tenant** — ganti draft `GUIDE_TABS` dengan sumber tunggal; pertahankan tab yang sudah berguna (meter, cara bayar, kontak).
4. **Wizard 4 pertanyaan** — “sudah penghuni atau calon?” · “bawa hewan?” · “berapa orang?” · “bayar berapa lama?” → hasil: aturan + angka yang berlaku untuk kombinasi itu.
5. **Kartu deposit + CTA checkout** — nominal per kamar dari data kamar, bukan angka tetap; tombol checkout diberi warna berbeda dan copy humanis.
6. **Dokumen 1 halaman** untuk owner (rekomendasi **a** pada jawaban sebelumnya): ringkasan aturan yang bisa ditandatangani, diturunkan dari konten yang sama.
7. **Bukti** — render 390/1440 px, uji setiap aturan punya jangkar, tanpa PII di screenshot.

Setiap langkah = satu increment yang bisa di-commit sendiri.

### 4. Jebakan nyata yang sudah terukur

- **FAQ bukan sumber aturan.** Menulis angka baru di FAQ = aturan paralel; angka wajib disalin dari kanonik dan diberi rujukan.
- **Jangan mengiklankan yang tidak ditegakkan.** Contoh hari ini: tamu menginap Rp50.000/malam dan denda merokok Rp200.000 tidak punya jalur otomatis. Pilih: tegakkan (task kode) atau hapus dari teks.
- **Angka per kamar bukan konstanta.** Deposit Rp300.000–600.000 dan tarif kamar berbeda; kartu deposit wajib membaca data kamar, bukan angka tetap.
- **Wizard tidak boleh menyimpan data pribadi** (hewan/penghuni/KTP) tanpa tujuan jelas; cukup memilih cabang aturan.
- **Teks panjang di 390 px** — accordion + ringkasan satu baris; jangan tabel lebar.

### 5. Kalau macet (gejala → sebab → tindakan)

| Gejala | Sebab paling sering | Tindakan |
|---|---|---|
| Angka di FAQ berbeda antar halaman | tiga salinan konten | satukan ke satu tabel, render di tiga tempat |
| Aturan bertentangan dengan kode | teks lama/draft AI | jalankan daftar F di [TASK-SINKRON-ATURAN](TASK-AKTIF.md#d4f-sinkron), perbaiki teksnya |
| Tenant tidak menemukan aturan | terkubur di tab ke-7 | naikkan ke beranda + pencarian; ukur ≤2 klik |
| Wizard terasa interogasi | terlalu banyak pertanyaan | batasi 4; sediakan “lewati, tampilkan semua” |

### 6. Catatan penyimpangan

- **2026-10-21 — konten aturan hidup di frontend, FAQ seed tetap di backend.** `tenantRules.ts` dipakai panduan + wizard. Backend tidak mengimpornya (rootDir Nest) dan baris FAQ adalah data DB yang diedit owner — seed hanya menambah pertanyaan baru.
- **2026-10-21 — F-17 ditutup sebagai “ditandai”.** Banner salinan bertanggal di `docs/domain/hunian.md` dipertahankan; aturan bisnis di dalamnya tidak diubah.
- Setiap penyimpangan lain dari kontrak ini dicatat di sini pada sesi yang sama.

### 7. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-19 | Dibuat dari instruksi owner: semua aturan masuk FAQ + terlihat di app tenant, boleh berbentuk wizard, deposit dikomunikasikan di depan, checkout humanis, overstay diinformasikan. Menggabungkan rekomendasi **(a)** dari jawaban sebelumnya (dokumen 1 halaman). Belum ada kode ditulis. |
| 2026-10-21 | Dikerjakan: model konten `tenantRules.ts`, halaman tenant + pencarian, wizard 4 pertanyaan, kartu deposit + CTA amber, F-15..F-17, dokumen owner. Bukti: test FE 306/306, tsc FE+BE, `check-docs` BERSIH, render 390/1440. Sisa: tanda tangan owner + edit 1 baris FAQ produksi. |


<a id="d4f-huni"></a>
## Bagian B — Check-in, KTP pasca-check-in, notifikasi

> **Blok baca** · Jenis: **dokumen kerja tugas (kontrak kerja, bukan antrean)** · Status: **aktif — rencana; belum ada kode yang ditulis** · Untuk siapa: agen yang mengerjakan check-in, deposit hewan/penghuni, KTP pasca-check-in, dan pengingat
> · Baca kalau: mengerjakan checklist check-in, paritas deposit antar kanal, atau pengingat KTP/WA. · **Jangan** dibaca kalau: memilih tugas (itu [ANTREAN](../ANTREAN.md)) atau mencari aturan bisnis (itu [harga.md](../domain/keuangan.md#d4c-harga) §7–§8).

Bentuk 7 bagian mengikuti konvensi [ANTREAN §3](../ANTREAN.md) butir A-2 — **tanpa kotak**, bukan antrean kedua.

### Goal & todos

**Goal.** Saat kunci diserahkan, sistem sudah tahu **berapa orang** dan **apakah ada hewan** — sehingga deposit jaminan, deposit hewan, dan surcharge penghuni **terhitung otomatis, sekali, dan tercatat**. KTP tidak lagi menjadi penghalang masuk, tetapi menjadi **kewajiban yang dikejar** sesudahnya; pengingatnya sampai ke tenant lewat PWA, dan admin/owner bisa mengirim pengingat WA **satu klik** tanpa API.

**Definisi selesai.** Tujuh butir §1 terbukti; tidak ada kanal yang menghitung berbeda; pengingat berhenti sendiri saat kewajiban selesai.

| Langkah | Status | Bukti penutup |
|---|---|---|
| 1. Satu helper hitung deposit + surcharge | belum | unit test 3 kanal menghasilkan angka sama |
| 2. DTO + service + UI checklist check-in | belum | `occupantCount`/`hasPet` terisi; deposit tersimpan |
| 3. Paritas booking portal | belum | booking portal menagih surcharge + deposit hewan |
| 4. Status KTP + pengingat berulang | belum | 4 keadaan; pengingat berhenti saat verified |
| 5. Runbook KTP diperbarui (F-14) | belum | tidak ada lagi langkah “wajib gate ON” |
| 6. PWA aktif + tombol WA manual | belum | push diterima 1 perangkat; tombol membuka wa.me terisi |
| 7. Bukti hitung + idempotensi | belum | check-in dua kali tidak menambah deposit |

### 1. Tujuan & definisi selesai

1. **Checklist check-in** memuat: jumlah penghuni, hewan (ya/tidak), status KTP — satu layar, sebelum simpan.
2. **`Stay.occupantCount` dan `Stay.hasPet` terisi** pada semua jalur (walk-in, aktivasi booking, booking portal).
3. **Deposit dihitung otomatis**: `Room.defaultDepositRupiah + (hasPet ? OperationalSetting.petDepositRupiah : 0)`; surcharge **+20% per kepala** di atas batas gratis (STANDARD 2, LARGE 4) ikut dihitung.
4. **Tidak ada kanal yang berbeda**: booking publik, booking portal, dan walk-in memakai **helper yang sama**.
5. **KTP tidak memblokir check-in**; setelah check-in status KTP punya **4 keadaan** minimal (BELUM / MENUNGGU_VERIFIKASI / TERVERIFIKASI / DITOLAK) dan kewajibannya terlihat di portal.
6. **Pengingat KTP berulang** (7 hari, default P26) sampai terverifikasi; berhenti otomatis; tidak menyebut NIK/foto di pesan.
7. **PWA push aktif** (VAPID terisi) + **tombol “Ingatkan via WA”** di kartu urgent admin/owner yang membuka `wa.me` dengan pesan terisi — tanpa API, tanpa biaya, tetap manual.

### 2. Kondisi awal + cara mengukur ulang

| Bagian | Keadaan 19 Okt 2026 | Bukti |
|---|---|---|
| Kolom hewan/penghuni | Kolom **sudah ada** di schema (`Stay.hasPet`, `Stay.occupantCount`), deposit hewan default **Rp100.000** | `backend/prisma/schema.prisma` |
| Booking publik | **Sudah** menghitung surcharge + deposit hewan | `public-bookings.service.ts` |
| Booking portal | **Belum** — hanya `resolveRent`, tanpa surcharge/hewan | `tenant-bookings.service.ts` `createBooking` |
| Check-in walk-in | **Belum** — DTO tidak punya `occupantCount`/`hasPet`; deposit dari DTO/default | `stay.dto.ts`, `stays.service.ts` `create` |
| Gate KTP | Boolean `ktpVerificationGateEnabled` **default false**; belum ada status KTP | `schema.prisma`, `stays.service.ts` |
| PWA push | Outbox `pushStatus` + VAPID (env/DB) + sweeper dispatch **sudah ada** | `push.service.ts`, `maintenance-sweep.service.ts` |
| WA manual | Helper URL WA **sudah ada** (`buildTenantWaUrl`), dipakai halaman staf | `frontend/src/utils/whatsapp.ts` |

**Cara mengukur ulang:** `git grep -n "hasPet\|occupantCount" backend/src` · `git grep -n "buildTenantWaUrl" frontend/src` · `git grep -n "VAPID" backend/src/modules/push`.

**Catatan produksi (potret 19 Okt 2026, dari [audit go-live](../arsip/AUDIT-GOLIVE-2026-10-19.md)):** `ktpVerificationGateEnabled=true` dan **0 dari 13** tenant terverifikasi — artinya check-in berikutnya **masih diblokir** sampai gate dimatikan (tindakan owner di Settings) atau kode diubah. Task ini **tidak** mengubah setting produksi; jangan mematikan gate sebagai jalan pintas tanpa izin.

### 3. Langkah (dari risiko terendah)

1. **Satu helper** `hitungDepositDanSurcharge(room, term, occupants, hasPet)` — dipakai tiga kanal; unit test membandingkan ketiganya.
2. **DTO + service check-in** — tambah `occupantCount`, `hasPet`, `petDepositCollected`; tulis ke stay; **jangan** mengubah stay lama.
3. **UI checklist** di wizard check-in (walk-in) dan di aktivasi booking; ringkasan nominal sebelum simpan.
4. **Paritas portal** — booking portal memakai helper yang sama.
5. **Status KTP + pengingat** — default P25/P26 sudah dipakai: **pengingat saja, 7 hari**. Sekaligus perbarui runbook go-live/produksi (**F-14**) agar gate lama tidak dinyalakan lagi.
6. **PWA + tombol WA** — pastikan VAPID terisi di Pengaturan; tombol di kartu urgent membuka WA tenant (nomor dinormalisasi 62…).
7. **Bukti** — test hitung (termasuk 0 hewan, 2 kepala, 4 kepala), test idempotensi (check-in dua kali tidak menambah deposit), render checklist.

### 4. Jebakan nyata yang sudah terukur

- **Deposit dobel.** Booking publik sudah menagih deposit hewan; check-in yang menambah lagi akan menagih dua kali. Helper harus membaca **apa yang sudah dibayar** (`depositPaidAmountRupiah`), bukan menimpa.
- **Mengubah deposit stay berjalan.** Jangan retro-aktif; hanya stay baru/aktivasi.
- **Surcharge mengubah `agreedRent`** → memengaruhi DP, rent-lock, dan invoice. Putuskan: masuk `agreedRent` (seperti booking publik) atau baris tagihan terpisah; jangan dua-duanya.
- **KTP: jangan blokir check-in** — gate lama `ktpVerificationGateEnabled` harus berhenti memblokir. Verifikasi tetap pada **OWNER/ADMIN sesuai kode hari ini**; aturan dossier 18 menyebut OWNER — selisih itu **F-13**, jangan mengubah akses tanpa keputusan.
- **Pengingat berulang wajib dedupe** (pola `dedupeKey` di notifikasi) supaya tidak spam.
- **`wa.me` tanpa API** — nomor harus diawali `62`, pesan di-encode; **jangan pernah** menaruh NIK/foto/alamat di pesan.
- **PWA butuh HTTPS + izin pengguna**; jangan mengklaim “push aktif” tanpa bukti satu perangkat.

### 5. Kalau macet (gejala → sebab → tindakan)

| Gejala | Sebab paling sering | Tindakan |
|---|---|---|
| Deposit tetap Rp0 saat check-in | `hasPet` tidak terkirim dari UI | periksa payload DTO + service |
| Nominal beda antar kanal | helper belum dipakai bersama | satukan; uji tiga kanal |
| Pengingat KTP berulang tiap hari | dedupe key tidak konsisten | pakai kunci `(recipient, stayId, 'KTP_REMINDER', hari)` |
| Push tidak terkirim | VAPID kosong / izin belum diberikan | isi VAPID di Pengaturan, uji 1 perangkat |
| Tombol WA kosong | nomor tenant null | tampilkan “nomor belum ada” + arahkan isi profil |

### 6. Catatan penyimpangan

Belum ada. Setiap penyimpangan dari kontrak ini dicatat di sini pada sesi yang sama.

### 7. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-19 | Dibuat dari instruksi owner: checklist hewan saat check-in agar deposit otomatis, aturan jumlah isi penghuni, KTP opsional saat check-in lalu wajib dilengkapi dengan notifikasi, PWA aktif, pengingat WA manual satu klik. Konsekuensi KTP menunggu P25/P26. Belum ada kode ditulis. |


<a id="d4f-sinkron"></a>
## Bagian C — Sinkron aturan teks vs kode

> **Blok baca** · Jenis: **dokumen kerja tugas (kontrak kerja, bukan antrean)** · Status: **aktif — daftar temuan; perbaikan belum dikerjakan** · Untuk siapa: agen yang memperbaiki ketidaksesuaian aturan, dan owner yang memutuskan bagian uang
> · Baca kalau: mengerjakan `SINKRON-UANG`/`SINKRON-TEKS`, atau butuh daftar resmi ketidaksesuaian aturan. · **Jangan** dibaca kalau: memilih tugas (itu [ANTREAN](../ANTREAN.md)) atau mencari aturan kanonik (itu [harga.md](../domain/keuangan.md#d4c-harga)).

Bentuk 7 bagian mengikuti konvensi [ANTREAN §3](../ANTREAN.md) butir A-2. Status pekerjaan tetap di [ANTREAN §3](../ANTREAN.md).

### Goal & todos

**Goal.** Semua teks yang dibaca penghuni/admin (panduan, FAQ, prompt AI, komentar kode) **mengatakan hal yang sama** dengan kode dan aturan kanonik — dan bila tidak bisa, perbedaannya **tertulis sadar**, bukan tak sengaja.

| Langkah | Status | Bukti penutup |
|---|---|---|
| 1. Bekukan daftar F (tabel §2) | selesai | dokumen ini |
| 2. Perbaiki teks tanpa perilaku (F-04..F-10) | selesai 2026-10-21 | `MyManualPage.tsx` + `faq.prompt.ts` + komentar prabayar; `rg` frasa basi 0; `tsc --noEmit` exit 0; test 3/3; gate dokumen BERSIH |
| 3. Putuskan & perbaiki uang (F-01/F-02, P27) | belum | test uang + perilaku tiga kanal sama |
| 4. Tinjau status (tabel §6) | belum | keputusan per S-01..S-10 |

### 1. Tujuan & definisi selesai

1. Setiap temuan F punya **status akhir**: diperbaiki, atau **sengaja dibiarkan** dengan alasan tertulis.
2. Perbaikan teks **tidak mengubah aturan**; perbaikan uang **wajib** lewat gate uang backend.
3. Tidak ada teks yang menjanjikan perilaku yang tidak ada di kode (tamu menginap, denda merokok, refund 7 hari).
4. Setiap rekomendasi status (S) menjadi keputusan: dipertahankan (dan didokumentasikan) atau diubah (task baru).

### 2. Temuan tidak sinkron (F)

| ID | Temuan | Bukti | Dampak | Ukuran | Owner? |
|---|---|---|---|---|---|
| **F-01** | Deposit bisa di-override lewat API: `approveBooking` menulis `dto.depositAmountRupiah` (hanya cek ≥0); `stays.create` memakai `dto.depositAmountRupiah ?? room.defaultDepositRupiah` | `tenant-bookings.service.ts`, `stays.service.ts` | Deposit tidak lagi “selalu default kamar” (D-05); refund mengikuti nominal terbayar | S | **ya (P27)** |
| **F-02** | Kanal tidak paritas: booking publik menghitung **surcharge + deposit hewan**; booking portal & walk-in tidak | `public-bookings.service.ts` vs `tenant-bookings.service.ts` vs `stay.dto.ts` | Kamar/term sama bisa berharga beda antar kanal; surcharge tak tertagih | M | **ya (P27)** |
| **F-03** | Gate KTP default **OFF** (boolean), padahal dokumen menyebut “KTP wajib sebelum aktivasi”; tidak ada status KTP | `schema.prisma`, `stays.service.ts` | Kepatuhan UU PDP bergantung setting; tidak bisa melacak “menunggu verifikasi” | M | **ya (P25/P26)** |
| **F-04** | Panduan tenant: “1 kamar maksimal 2 orang” | `MyManualPage.tsx` | Bertentangan dengan D-24 (2+2 / 4+2) | XS | tidak |
| **F-05** | Panduan: renewal H-30, DP maks H-1, pelunasan H-7 | `MyManualPage.tsx` | Kode: prompt H-10, DP ≤ hari-H, pelunasan ≤ H+7 **setelah DP** | S | tidak |
| **F-06** | Panduan: tagihan listrik jatuh tempo 7 hari | `MyManualPage.tsx` | Kode: **24 jam** untuk semua invoice | XS | tidak |
| **F-07** | Panduan: “deposit bukan uang sewa, tidak bisa dipakai bayar sewa” | `MyManualPage.tsx` | Settlement **menutup semua invoice terbuka termasuk sewa** (Q5) | XS | tidak |
| **F-08** | Panduan: hewan dilarang, tamu menginap Rp50.000/malam, QRIS/e-wallet | `MyManualPage.tsx` | Kode mendukung `hasPet` + deposit hewan; tamu menginap **tidak ada**; pembayaran **bukti transfer manual** | M | tidak (kecuali arah tamu) |
| **F-09** | Prompt FAQ AI memuat aturan basi (minimal 1 bulan, DP “bulan pertama”, checkout H-7, WiFi gratis, hewan dilarang) | `faq.prompt.ts` | FAQ hasil AI bisa menerbitkan aturan palsu | S | tidak |
| **F-10** | Komentar prabayar menulis “5,5×/6; 10×/12”, kode memakai **5,7/11**; total prabayar tahunan bisa beda Rp4 dari harga term | `prepay-extension.service.ts` | Dokumen menyesatkan; selisih receh tetapi nyata | XS | tidak |
| **F-11** | Check-in tidak memblokir deposit belum lunas; yang dicek hanya invoice sewa PAID | `stays.service.ts` `create` | Deposit bisa tertagih belakangan | S | tidak (perbaiki di follow-up) |
| **F-12** | Walk-in check-in tidak punya `occupantCount`/`hasPet` di DTO meski kolomnya ada | `stay.dto.ts` | Akar keluhan owner: deposit hewan/surcharge tidak bisa otomatis | M | tidak |
| **F-13** | Akses verifikasi KTP: aturan dossier 18 menyebut **verifikasi OWNER**, controller memasang `@Roles(OWNER, ADMIN)` | `tenants.controller.ts` vs [operasional.md](../domain/hunian.md#d4c-operasional) | Wewenang verifikasi PII tidak konsisten; audit bisa mencatat ADMIN sebagai verifikator | XS | **ya — putuskan OWNER-only atau OWNER+ADMIN** |
| **F-14** | Runbook go-live/produksi masih **mewajibkan** `KTP_ACTIVATION_GATE_ENABLED=true` dan menguji “aktivasi tanpa KTP → DITOLAK”; keputusan 19 Okt 2026 menghapus blokir itu | [produksi Bagian C](../operations/produksi.md#d4b-cpanel), [produksi Bagian D](../operations/produksi.md#d4b-ktp), [produksi.md](../operations/produksi.md) | Operator berikutnya bisa menyalakan gate dan memblokir check-in sesuai kebijakan lama | S | tidak — ikut task KTP (F-14) |
| **F-15** | FAQ seed masih menulis “1–2 orang”, dan baris FAQ di DB produksi kemungkinan sudah ter-seed dengan teks lama | `backend/src/modules/faqs/faqs.service.ts` (`DEFAULT_FAQS`) | Panduan tenant yang sudah dikoreksi bisa tetap dibaca bersama FAQ lama; mengubah kode tidak memperbarui baris DB | S | **selesai 2026-10-21** — seed = D-24; baris DB diedit admin lewat menu FAQ (seed idempoten per pertanyaan, tidak menimpa) |
| **F-16** | Copy publik memakai “1–2 orang” dan “maks 2 orang” | `frontend/src/data/officialKost48Content.ts`, `frontend/src/components/public/GuestPreferenceWizard.tsx` | Bertentangan dengan D-24 (STANDARD 2+2 / LARGE 4+2) di permukaan publik | XS | **selesai 2026-10-21** — kedua berkas memakai STANDARD 2/4 dan LARGE 4/6 |
| **F-17** | `docs/domain/hunian.md` §Aturan & Panduan Tenant (2026-06-17) masih memuat deposit Rp300.000, maksimal 2 orang, denda merokok Rp200.000, dan aturan hewan versi lama | `docs/domain/hunian.md` | Salinan bertanggal yang bisa dipakai ulang sebagai aturan paralel; bukan aturan kanonik | M | **ditutup sebagai ditandai** — banner “Salinan bertanggal” hidup (commit `68766d98`); aturan bisnis tidak diubah |

**Riwayat ringkas W-FIN-002 (2026-10-21).** F-04..F-10 ditutup di `MyManualPage.tsx`, `faq.prompt.ts`, dan komentar prabayar; rincian di [ANTREAN](../ANTREAN.md) baris W-FIN-002 + [changelog 21 Okt](../history/changelog/2026-10.md).

**Matriks konten W-TNT-001 (potret 2026-10-21).** Setiap angka menunjuk sumber kanonik; klaim yang tidak ditegakkan kode (tamu Rp50.000/malam, denda merokok Rp200.000, refund 7 hari kerja, QRIS/e-wallet) **tidak** dimasukkan.

| Kategori | Ringkasan | Angka | Sumber kanonik |
|---|---|---|---|
| hewan | Diizinkan dengan pemberitahuan; deposit refundable | deposit hewan dari `petDepositRupiah` (default 100.000) | `booking-charges.helper.ts`; `settings.service.ts` |
| penghuni | Batas gratis + surcharge per kepala | STANDARD 2 gratis/4 maks; LARGE 4/6; +20% per kepala ekstra; bulat Rp5.000 | `pricing.helper.ts`; [keuangan.md §8](../domain/keuangan.md#d4c-harga) |
| prabayar | Bayar di muka; diskon term panjang | 2 minggu 0,75×; 6 bulan 5,7×; 1 tahun 11×; bulat Rp5.000; 1–24 bulan | `pricing.helper.ts`; keuangan.md §2/§10 |
| pembayaran | DP, pelunasan, bukti transfer | DP 30% × tarif periode; pelunasan sisa 70% + deposit; jatuh tempo 24 jam; booking 3 jam | keuangan.md §7; [hunian.md](../domain/hunian.md#dossier-11--booking--renewal-normatif); `auto-ops.constants.ts` |
| deposit | Jaminan kamar + hewan, settlement | nominal `Room.defaultDepositRupiah` (+ hewan); refundable; menutup tagihan terbuka | keuangan.md §7; `stays.service.ts` `processDeposit` |
| overstay | Konsekuensi lewat tanggal keluar | pengingat H-10/H-7/H-3/H-1/H-day; kamar dilepas 12.00 WIB hari-H; checkout paksa 12.00 WIB H+1; barang 30 hari | [hunian.md Dossier 12](../domain/hunian.md#dossier-12--checkout-deposit--overstay-normatif); `stay-sweep.service.ts` |
| checkout | Syarat & urutan keluar | ajukan minimal H+1; batas ≤ tanggal rencana keluar; tagihan non-meter wajib lunas | hunian.md Dossier 12; `checkoutReadiness.ts`; `CheckoutRequestModal.tsx` |
| ktp | Identitas & PDP | 1 foto KTP; 2 peran verifikator (OWNER/ADMIN); data dihapus saat checkout | `tenants.controller.ts`; `stays.service.ts` `cleanupTenantKtpOnCheckout` |

**Status penutupan teks 2026-10-21.** F-04..F-10 **selesai** di permukaan yang disebut: `MyManualPage.tsx`, `faq.prompt.ts`, dan komentar `prepay-extension.service.ts`; rujukan kanonik sudah diverifikasi. F-15..F-17 **tetap terbuka** (FAQ seed/DB, copy publik, salinan `hunian.md`). F-01/F-02 sudah selesai di kode (commit `b56d4b83`/`56c84a68`); F-03/F-11..F-14 tetap terbuka.

### 3. Langkah prioritas

1. **F-09/F-10/F-04..F-08** — teks & komentar (tanpa perilaku), satu batch.
2. **F-01/F-02** — **P27 sudah dijawab: tegakkan di semua kanal**; gate uang backend; helper tunggal untuk tiga kanal.
3. **F-03/F-12/F-11** — masuk [TASK-HUNI-FOLLOWUP](TASK-AKTIF.md#d4f-huni) (check-in, KTP).
4. **S-01..S-10** (§6) — tinjau, lalu hanya yang disetujui menjadi task.

### 4. Jebakan

- **Jangan “memperbaiki” teks dengan mengubah aturan.** Kalau teks dan kode berbeda, yang benar adalah kanonik — bukan yang lebih mudah ditulis.
- **F-01/F-02 menyentuh uang**: perubahan wajib lewat gate uang; jangan menyelipkan ke batch teks.
- **Deposit lama jangan di-retro**; perbaikan hanya untuk stay baru/aktivasi.
- **Prompt AI bukan tempat aturan**; setelah diperbaiki, ia harus membaca aturan dari sumber, bukan menyalin angka.

### 5. Kalau macet

| Gejala | Sebab | Tindakan |
|---|---|---|
| Teks berubah tiap batch | tidak ada sumber tunggal | pakai tabel konten di [TASK-FAQ-TENANT](TASK-AKTIF.md#d4f-faq) |
| Test uang merah setelah patch | perilaku lama diuji | perbarui test **bersama** keputusan, bukan menghapus test |
| Owner belum menjawab P27 | menunggu | kerjakan F-04..F-10 lebih dulu |

### 6. Status & transisi: yang lemah (jawaban atas pertanyaan owner)

| ID | Kelemahan | Bukti | Risiko | Rekomendasi |
|---|---|---|---|---|
| **S-01** | `StayStatus` hanya ACTIVE/COMPLETED/CANCELLED; “sudah check-in” adalah **flag** `initialMetersPromotedAt` | `app.enums.ts`, `stays.service.ts` | Query “stay aktif” punya dua arti; pernah salah (V-03) | pertahankan + wajibkan satu helper filter; jangan menambah status tanpa kebutuhan |
| **S-02** | `CANCELLED` mencampur kedaluwarsa, gagal lunas, dan batal manual; alasannya teks bebas | `booking-sweep.service.ts` | Laporan churn vs forfeit tidak bisa dipisah | tambah `cancelReasonCode` terstruktur (additive) |
| **S-03** | Tidak ada status OVERSTAY/GRACE; overstay disimpulkan dari tanggal | `stay-sweep.service.ts` | Sweeper dan UI bisa berbeda tafsir; grace renewal H+7 tidak terlihat di stay | turunan status di API (bukan kolom) + satu definisi |
| **S-04** | `MAINTENANCE` menampung “kotor”, “rusak”, dan “diblokir”; `allowBookingWhileCleaning` membuat kamar **bisa dipesan tapi tidak bisa dihuni** | `app.enums.ts`, `room-booking.util.ts` | Salah label di katalog/operasional | pertahankan, tetapi tampilkan alasan maintenance |
| **S-05** | `RESERVED` tidak membedakan DP vs lunas | [keuangan.md](../domain/keuangan.md) | UI bisa menulis “lunas” padahal DP | sudah disengaja; jangan tambah status, cukup label dari invoice |
| **S-06** | `DepositStatus.HELD` tidak membedakan “belum dibayar” dan “ditahan”; deposit parsial legacy dibiarkan HELD | `booking-sweep.service.ts` | Settlement manual bisa buntu | tambah `depositPaidAmountRupiah` sebagai sumber (sudah), tampilkan selisih |
| **S-07** | `RenewRequest` menyimpan status lama (PENDING/APPROVED/REJECTED) bersama 10 status baru | `app.enums.ts` | Filter laporan bisa salah hitung | dokumentasikan sebagai legacy + filter kanonik |
| **S-08** | Tidak ada status REFUND_PENDING pada submission yang sudah ditransfer lalu ditolak | `payment-submissions.service.ts` | Refund bergantung ingatan admin | tambah penanda refund (kecuali loss-refund yang sudah ada) |
| **S-09** | KTP tidak punya status (hanya `ktpVerifiedAt`/`ktpDeletedAt` + boolean gate) | `schema.prisma` | Tidak bisa “menunggu verifikasi”/“ditolak” | **wajib** untuk alur baru (P25/P26) |
| **S-10** | Checkout dua langkah: persetujuan mengubah `plannedCheckOutDate`; bila final checkout tidak dilakukan, sweeper bisa memperlakukannya sebagai overstay | `checkout-requests.service.ts`, `stay-sweep.service.ts` | Tenant yang berniat keluar bisa dipaksa keluar | tambah penanda “checkout in progress” pada pemeriksaan overstay |

**Kesimpulan singkat:** yang **paling lemah** dan berdampak nyata adalah **S-03/S-09/S-10** (status tidak mampu menyatakan keadaan yang penting) dan **S-02** (alasan batal tidak terstruktur). Yang **cukup dipertahankan** adalah S-01/S-04/S-05 selama ada satu helper dan label yang jujur.

### 7. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-19 | Dibuat: 14 temuan tidak sinkron (F-01..F-14) + 10 titik lemah status (S-01..S-10) dari pembacaan kode; belum ada perbaikan. F-01/F-02/F-03/F-13 menunggu keputusan; F-14 ikut task KTP. |
| 2026-10-21 | F-04..F-10 teks diselaraskan di `MyManualPage.tsx`, `faq.prompt.ts`, dan komentar `prepay-extension.service.ts`; F-15..F-17 dicatat terbuka; bukti `rg` 0 + `tsc --noEmit` + test 3/3 + `check-docs` BERSIH. |


<a id="d4f-uiux"></a>
## Bagian D — UIUX showcase beranda & katalog

> **Blok baca** · Jenis: **dokumen kerja tugas (kontrak kerja + catatan goal/todos, bukan antrean)** · Status: **aktif — implementasi selesai lokal; bukti browser belum** · Untuk siapa: agen yang merawat permukaan publik
> · Baca kalau: mengerjakan atau menilai `UIUX-SHOWCASE`, atau butuh tahu mengapa foto unggahan sekarang bisa tampil utuh. · **Jangan** dibaca kalau: memilih tugas (itu [ANTREAN](../ANTREAN.md) §3) atau mencari aturan domain publik (itu [domain/publik.md](../domain/publik.md)).

### Goal & todos

**Goal.** Halaman depan dan katalog kamar menjual dengan urutan **kebutuhan → bukti → jaminan → aksi**; seluruh angka yang tampil berasal dari data sistem; foto unggahan rasio apa pun **tidak lagi terpotong** di tampilan publik, dan panel upload menyebutkan rasio yang disarankan. **Tanpa** endpoint/API baru, **tanpa** dependency baru, **tanpa** perubahan skema.

**Definisi selesai.**

1. Beranda punya section "mulai dari kebutuhan" yang tautannya mendarat di filter katalog yang sudah didukung, dan strip "empat hal yang sudah tertulis".
2. Katalog punya urutan **Rekomendasi** (ketersediaan lebih dulu, lalu tarif) dan chip kategori ber-count; parameter `category` dipahami.
3. Foto potret/panorama/brosur A4 tampil **utuh** (contain + latar blur) di kartu beranda, kartu katalog, dan galeri; galeri detail & thumbnail fasilitas memakai contain.
4. Panel upload (`ResourceFormModal`, tiga panel owner) menampilkan rekomendasi rasio + peringatan **non-blokir** per berkas.
5. Typecheck, test frontend, dan bundling Vite lulus.
6. Baris [ANTREAN](../ANTREAN.md) §3 + [changelog](../history/changelog/2026-10.md) terisi.

**Bukti penutup — potret 2026-10-18.** `npx tsc -b` exit 0 · `npx tsc --noEmit -p tsconfig.json` exit 0 · test baru `imageFrame.test.ts` + `frameImage.test.tsx` **19/19 lulus** · seluruh test frontend **274/274 di 50 berkas** · `npx vite build` exit 0 (1 m 2 s). **Batas:** `npm run build` penuh **sengaja tidak dijalankan** karena ia menjalankan `stamp-pwa-build.mjs` (mengubah ID/PWA build) — di luar lingkup perubahan tampilan; yang dibuktikan bundling `vite build` saja.

| # | Langkah | Status |
|---:|---|---|
| 1 | Recon sumber crop + panel upload | selesai |
| 2 | Util rasio murni + test | selesai |
| 3 | Komponen `FrameImage` + `ImageRatioHint` | selesai |
| 4 | Terapkan di kartu beranda/katalog/galeri + galeri detail + fasilitas | selesai |
| 5 | Section kebutuhan & jaminan di beranda | selesai |
| 6 | Urutan Rekomendasi, chip kategori, ringkasan hasil katalog | selesai |
| 7 | Rekomendasi rasio di panel upload | selesai |
| 8 | Typecheck + test + bundling | selesai |
| 9 | Dokumen: berkas ini, ANTREAN, changelog, gate dokumen | selesai |
| 10 | Bukti browser 390/768/1440 px (foto potret, chip, tautan kebutuhan) | belum |

### 1. Tujuan & definisi selesai

Tujuan pemilik: beranda + katalog harus **mengundang** calon penghuni (bukan daftar fitur), dan foto yang diunggah dari HP/brosur tidak boleh tampil terpotong. Definisi selesai ada di boks Goal & todos; yang **bukan** bagian tugas ini: perubahan alur booking, perubahan harga/nominal, penambahan foto/aset baru, dan keputusan hak pakai foto (tetap di `AO-19`).

### 2. Kondisi awal + cara mengukur ulang

Fakta yang diverifikasi dari kode (bukan ingatan):

| Fakta | Bukti (kutipan, bukan nomor baris) |
|---|---|
| Sumber crop = CSS, bukan upload | `.gx-room-image { object-fit: cover }`, `.rm-card-img { object-fit: cover }`, `.gx-gallery-img { aspect-ratio: 16/9; object-fit: cover }`, `.gx-facility-photo { width: 3rem; object-fit: cover }`, `.room-detail-gallery-image { object-fit: cover }`, `.gx-hero-bg { background-size: cover }` |
| Kompresi klien tidak mengubah rasio | `frontend/src/utils/compressImageFile.ts` hanya mengecilkan `maxSide`, tidak memotong |
| Panel upload tidak menyebut rasio | `ResourceFormModal.tsx` (`Form.Text` kamar/pengumuman), `OwnerSettingsPanels.tsx` (fasilitas, aset marketing, foto kamar) |
| Angka katalog hardcoded | teks empty-state sebelumnya memuat "Katalog memiliki 22 kamar" — diganti kalimat tanpa angka |

**Cara mengukur ulang:** `npx tsc -b` · `npx vitest run` · `npx vite build` (cwd `frontend`). Ketiganya memerlukan spawn proses (esbuild/vitest) yang **diblokir sandbox `workspace-write`** dengan `Error: spawn EPERM`; jalankan dengan izin akses penuh **satu kali** untuk satu rencana bukti, jangan minta berulang per potongan.

### 3. Langkah yang dikerjakan

1. `frontend/src/utils/imageFrame.ts` — fungsi murni: `imageRatio`, `frameModeForRatio`, `frameModeForDimensions`, `evaluateUploadRatio`, `readImageDimensions`, `UPLOAD_RATIO_GUIDES` (6 target: kartu, detail, hero, fasilitas, galeri, marketing).
2. `frontend/src/components/common/FrameImage.tsx` — `<img>` yang memilih `cover`/`contain` dari rasio asli setelah `load`; contain memakai salinan blur dekoratif. Default `cover` sampai foto terbaca (tata letak lama tidak berubah).
3. `frontend/src/components/common/ImageRatioHint.tsx` — baris rekomendasi + hook `useUploadRatioCheck` (`checkFile`/`checkFiles`) + `UploadRatioNotice`. Peringatan **tidak** memblokir unggahan.
4. Penerapan: `publicGuestShared.tsx` (kartu beranda), `RoomCard.tsx` (carousel katalog), `PublicGuestDashboardPage.tsx` (galeri brosur), `07-public.css` (galeri detail), `11-public-pages.css` (thumbnail fasilitas).
5. Beranda: section `gx-fit-*` (3 kebutuhan dengan count nyata + deep-link filter), strip `gx-guarantee-*` (DP 30%, listrik pascabayar, perbaikan wajar gratis, harga tertera = ditagih), baris `gx-hero-trust`.
6. Katalog: `sort=recommended`, chip kategori `Ekonomi/Standar/Deluxe (n)` dari data, `category` di URL, ringkasan hasil `role="status"` + tarif mulai, label grup filter "Harga" → "Urutkan".
7. Panel upload: `ImageRatioHint` + `UploadRatioNotice` di empat tempat; pemeriksaan rasio dijalankan sebelum unggah.

**Landasan pemasaran yang dipakai — dan batasnya.** Kerangka berikut dipakai sebagai **lensa desain**, bukan bukti empiris: model hierarki efek (perhatian → minat → keinginan → aksi) menentukan urutan section; *signaling* menjelaskan mengapa foto asli, status kamar live, dan angka jujur lebih kuat daripada klaim; *elaboration likelihood* memisahkan rute sentral (spesifikasi kamar, aturan DP/listrik) dari rute periferal (visual, bukti sosial); *jobs-to-be-done* menjadi dasar section "mulai dari kebutuhan"; *choice architecture* menjadi dasar urutan + chip + count; *risk reversal* menjadi dasar strip jaminan; kelangkaan hanya dipakai bila angkanya berasal dari data. **Tidak ada uji A/B, tidak ada sitasi formal, dan tidak ada klaim efek konversi di repo ini** — bila dokumen ini dipakai untuk tugas akademik, sumber primer wajib diverifikasi terpisah.

### 4. Jebakan nyata yang sudah terukur

- **Spesifisitas CSS mobile.** `@media (max-width: 480px)` di `11-public-pages.css` memasang `object-fit: cover` pada `.gx-room-image` (dua kelas). Aturan contain karena itu memakai `.frame-image.frame-image-contain { object-fit: contain !important }`; tanpa `!important` foto potret kembali terpotong di HP.
- **Dua salinan handler di `ResourceFormModal.tsx`.** Berkas ini memuat handler unggah **dua kali**; yang dipakai JSX adalah salinan **di dalam** `config.fields.map` (menutupi yang di luar). Menyunting hanya salinan luar = perubahan tidak berpengaruh. Kedua salinan disamakan; duplikasi lama **tidak dirapikan** (di luar lingkup).
- **Jangan `npm run build` untuk perubahan UI.** Skrip itu menjalankan `stamp-pwa-build.mjs` + `verify-pwa.mjs` sehingga ID PWA berubah; untuk validasi CSS/bundling cukup `npx vite build`.
- **Brosur A4 vs galeri 16:9.** Rasio potret 0,71 berada di luar toleransi 4:3, jadi `UPLOAD_RATIO_GUIDES.gallery` punya rentang alternatif eksplisit; tanpa itu panel akan memperingatkan brosur yang justru sah.
- **Angka hardcoded.** Empty-state katalog menyebut jumlah kamar tetap; jumlah kamar berubah tanpa kode — diganti kalimat tanpa angka.

### 5. Kalau macet (gejala → sebab → tindakan)

| Gejala | Sebab paling sering | Tindakan |
|---|---|---|
| Foto potret tetap terpotong | hanya CSS yang diubah, `FrameImage` belum dipakai di elemen itu | bungkus `<img>` dengan `FrameImage` di komponen kartu yang bersangkutan |
| Latar blur menutupi foto/badge | `z-index` ditambahkan ke backdrop | biarkan backdrop `z-index: auto` dan img utama `position: relative` tanpa z-index; badge/overlay sesudahnya tetap di atas |
| Peringatan rasio muncul untuk foto yang benar | target panduan salah (mis. brosur memakai target `hero`) | pakai target yang sesuai; tambah rentang alternatif, jangan melonggarkan toleransi global |
| Test gagal `spawn EPERM` | sandbox menolak spawn esbuild | minta akses penuh sekali untuk satu rencana bukti; jangan mengubah kode untuk mencari jalan |

### 6. Catatan penyimpangan

- **Tumpang-tindih dengan `AO-18`/`AO-19`.** Tugas ini menambah section dan menstandarkan perilaku foto; keputusan owner pada `AO-19` (hak pakai foto, izin optimasi, keseragaman aset) **tetap terbuka** dan tidak diambil alih.
- **Default urutan katalog tidak diubah.** "Rekomendasi" hanya tersedia sebagai pilihan; menjadikannya default = perubahan perilaku pengguna yang harus diputuskan owner.
- **`PETA-KODE.md` tidak disentuh.** Berkas tangga itu sudah di dekat plafon 16 KB; peta berkas baru dicatat di dokumen ini.
- **`scripts/docs-lines.baseline.json` tidak diubah.** Ratchet baris hanya naik dengan keputusan owner; kenaikan baris dari dokumen ini menunggu keputusan itu.
- **Tidak ada perubahan backend/API/skema** dan tidak ada dependency baru.

### 7. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-18 | Dibuat setelah implementasi selesai lokal. Implementasi: util + komponen + section beranda + katalog + panel upload. Verifikasi: typecheck, 19 test baru, 274/274 seluruh frontend, `vite build` exit 0. Belum: bukti browser, `npm run build` penuh, mutasi bukti pagar. |

<a id="prioritas"></a>
## Bagian E — Prioritas & penanggung jawab

### Prioritas & penanggung jawab

| # | Task | Penanggung jawab / kesiapan | Prasyarat dan bukti penutupan |
|---|------|-----------------------------|------------------------------|
| 1 | Onboarding 13 hunian + verifikasi KTP | Owner / menunggu data | Bulan masuk, meter kWh, deposit; penutupan mengikuti gate Fase A. Keputusan owner 23 Sep: gerbang KTP produksi **ditunda**, risiko aktivasi tanpa KTP terverifikasi diterima sementara dan wajib ditinjau sebelum onboarding nyata ([KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md)) |
| 2 | Opening balance produksi | Owner / menunggu angka cutover | Kas/bank per cutover; bukti rekonsiliasi sesuai aturan keuangan |
| 3 | Cron AutoOps di cPanel | Owner / menunggu pelaksanaan dan bukti | Konfigurasi cron + bukti eksekusi ([OPERASI](../operations/produksi.md#d4b-cpanel)); keberadaan token saja belum cukup |
| 4 | Ganti password OWNER + PIN owner | Owner / belum ada bukti | Bukti perubahan tanpa nilai secret; rotasi DB/JWT 20 Sep tidak membuktikan password OWNER/PIN selesai |
| 5 | Audit modul kedua — backend auth / BE-002 | AI / **audit statis selesai 24 Sep; addendum T6/T7 25 Sep** | [Laporan](../arsip/backend-auth-2026-09-24.md): T1/T2 tetap tertutup; T6 (claim reset token) dan logout–refresh T7 tertutup secara statis + unit lewat addendum 25 Sep (build + 12/12 test lulus); interleaving transaksi DB dan runtime/UAT belum dibuktikan. Audit uang P1-04..P1-09 sudah diperiksa 25 Sep (statis, docs-only): P1-04 & P1-05 masih ada, P1-06 & P1-07 indikasi diperbaiki, P1-08 sempit, P1-09 terverifikasi — [laporan](../arsip/p1-uang-verifikasi-2026-09-25.md); perbaikan source butuh keputusan/izin terpisah |
| 6 | Deploy commit lokal ke produksi | AI + Owner / perlu rencana rilis | Artefak/SHA, diff rilis, target, rollback, izin deploy, bukti smoke |
| 7 | Uji dependency hilang & test nol pada wrapper | AI / **selesai 24 Sep** | Fixture terisolasi membuktikan dependency hilang ditolak exit 4 dan laporan valid dengan 0 test ditolak exit 1; fixture sudah dibersihkan |
| 8 | **Konsolidasi dokumen** | AI / **selesai 25 Sep** | Tahap 3 + Fase 2 + Fase 3 + DOCS-CLEANUP-1 + Tahap 4 selesai. Review akhir menyelaraskan status P1, rumah arsip, dan label path lama; tidak mengubah aturan bisnis. |
| 9 | **IMPACT-01 — ringkasan dampak sebelum/sesudah approve pembayaran** | AI / **implementasi + review independen + FIX-A selesai lokal 25 Sep** | Implementasi awal commit `933bdff5`; review menemukan preview gagal tidak memblokir approve, lalu FIX-A menjadikan preview backend gate wajib di UI. Frontend 3/3 dan gate uang backend 147/147 lulus. **Runtime/browser/DB belum diukur.** Bukti: [review IMPACT-01](../arsip/payment-impact-review-2026-09-25.md) |
| 10 | **MODE-CEPAT — dua halaman berdampingan (Mode Cepat `/cepat` + Normal) dan agenda AI OWNER** | AI / **dokumentasi + keputusan arah selesai 25 Sep; implementasi belum** | Keputusan owner 25 Sep: dua mode berdampingan; shell paralel `/cepat`, halaman Normal **tidak disentuh**; AI hanya OWNER dan dihitung **terjadwal 1×/hari** lalu disimpan; biaya ditampilkan hanya ke OWNER (target ≤ Rp 50.000/bulan, rupiah menyusul); AI mati → kartu aturan tetap penuh. Rancangan: [mode-cepat.md](../arsip/mode-cepat.md); kontrak kartu: [portal-owner-admin §10](../product/product.md#d4d-portal); aturan: [domain/ai.md §G10](../domain/ai.md); recon: [audit AI 25 Sep](../arsip/ai-agenda-recon-2026-09-25.md). Item `AIDL-01`..`AIDL-06` + `AI-USAGE-01` di §3. **Benturan aturan sudah diselesaikan** (`CEPAT-AI-JADWAL`); sisa ketergantungan: pemicu terjadwal (cron AutoOps, prasyarat #3) |

**Aturan prioritas:** kerjakan task teratas yang prasyaratnya terpenuhi dan lingkupnya diizinkan. Bila teratas BLOCKED, lanjutkan pekerjaan independen yang diizinkan. Tabel ini tidak memberi izin baru.



<a id="backlog"></a>
## Bagian F — Backlog di luar antrean

### Backlog di luar antrean (belum dijadwalkan)

Butir di bawah **bukan** antrean aktif — sengaja **tanpa kotak `[ ]` dan tanpa gate**, karena belum diputuskan atau butuh task tersendiri. Menaruhnya sebagai kotak akan berpura-pura bahwa ia sudah dijadwalkan.

- **4 kandidat serap arsip legacy** — keputusan owner P3: **tidak diserap** ke dokumen aktif, masuk backlog tersendiri (isi belum ditinjau):
  - [arsip/legacy/2026-06-16_root_docs_pre_M/04_DEPLOY_AND_PWA.md](../arsip/legacy/2026-06-16_root_docs_pre_M/04_DEPLOY_AND_PWA.md) (18 KB)
  - [arsip/legacy/_previous_cycles/M17_AUDIT_360_P3_P8.md](../arsip/legacy/_previous_cycles/M17_AUDIT_360_P3_P8.md) (2,2 KB)
  - [arsip/legacy/2026-06-16_root_docs_pre_M/17_PUBLIK_MARKETING_UIUX.md](../arsip/legacy/2026-06-16_root_docs_pre_M/17_PUBLIK_MARKETING_UIUX.md) (7,8 KB)
  - [arsip/legacy/AUDIT_INVENTARIS_LENGKAP.md](../arsip/legacy/AUDIT_INVENTARIS_LENGKAP.md) (11 KB)
- **Kredensial DEV di kode** (temuan 2026-10-05, di luar lingkup rombak dokumentasi) — kata sandi DEV ter-hardcode di `backend/scripts/seed-dev-reset.js` (**tracked**, 3 titik), `backend/scripts/seed-dev-real.js` (untracked, 3), `backend/scripts/seed-facilities-inventory.js` (1), `.audit-runtime/check-login.js` (5), `.audit-runtime/check-login-2.js` (2), `.audit-runtime/create-local-accounts.js` (1). Keputusan yang dibutuhkan: pindahkan ke env var (mengubah alur seed + skrip lokal) **atau** sahkan sebagai tooling DEV. Nilai tidak ditulis di sini; daftar kanonik DEV ada di [operations/default-dev.md](../operations/default-dev.md).
- **`AI_MASTER.md`** — **SELESAI 2026-10-07 (sensus dokumen):** dipindah ke [arsip/AI_MASTER.md](../arsip/AI_MASTER.md) **setelah** seluruh rujukan hidupnya dialihkan, sehingga syarat keputusan 2026-10-05 ("hapus hanya bila rujukan itu dialihkan lebih dulu") dipenuhi. Dua pointer lama lain — `AI_QUICKREF.md` dan `AI_WORKFLOW_GUIDE.md` — ikut diarsipkan pada batch yang sama. Bukti + ledger konservasi: [sensus dokumen](../arsip/sensus-dokumen-2026-10-07.md).
- **Pre-commit hook `check:docs`** (keputusan owner P24b: ditinjau setelah B8) — **tidak dipasang**. Alasan: hook yang bisa dibagikan butuh dependency baru (dilarang aturan §4), sedangkan hook lokal `.git/hooks/` tidak ikut repo sehingga tidak menjaga siapa pun selain mesin ini. Penggantinya: `npm run check:docs` (tersedia di root `package.json` sejak 2026-10-05) dijalankan sebelum menutup batch dokumentasi — sudah menjadi aturan di [KONTRAK §7](../KONTRAK.md).

## Checklist

<!-- checklist-otoritatif -->

### W-TNT-001 — FAQ-TENANT
- [ ] Aturan huni (hewan, isi penghuni, prabayar, pembayaran, deposit, overstay, checkout) tampil di FAQ + app tenant
- [ ] Wizard terarah + CTA checkout; 0 angka bertentangan dengan kode

### W-TNT-002 — CHECKIN-PET
- [ ] Checklist hewan + jumlah penghuni saat check-in
- [ ] Deposit hewan & surcharge dihitung otomatis; test 3 kanal

### W-TNT-003 — KTP-PASCA-CHECKIN
- [ ] KTP tidak memblokir check-in; status 4 keadaan + pengingat berulang
- [ ] Gate lama tidak memblokir; akses verifikasi tidak berubah (P28)

### W-TNT-004 — NOTIF-PWA-WA
- [ ] PWA push aktif + tombol WA manual; tanpa API dan tanpa NIK

### W-FIN-001 — SINKRON-UANG
- [ ] Satu helper deposit/surcharge untuk booking publik, portal, walk-in
- [ ] Gate uang backend lulus

### W-FIN-002 — SINKRON-TEKS
- [ ] Panduan tenant, prompt FAQ AI, dan komentar kode selaras aturan kanonik

### W-OWN-011 — UIUX-SHOWCASE
- [ ] Bukti browser 390/768/1440 px; foto utuh; chip kategori berfungsi
