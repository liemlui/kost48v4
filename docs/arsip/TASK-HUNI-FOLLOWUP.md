> **ARSIP BEKU** · dipindah dari `docs/kerja/` ke `docs/arsip/` pada 2026-10-21 (DOCS-GEN2 D4d addendum). Isi dipindah ke `TASK-AKTIF.md`; **jangan dibaca rutin**.

# TASK-HUNI-FOLLOWUP — check-in yang menghitung sendiri, dan KTP yang menyusul

> **Blok baca** · Jenis: **dokumen kerja tugas (kontrak kerja, bukan antrean)** · Status: **aktif — rencana; belum ada kode yang ditulis** · Untuk siapa: agen yang mengerjakan check-in, deposit hewan/penghuni, KTP pasca-check-in, dan pengingat
> · Baca kalau: mengerjakan checklist check-in, paritas deposit antar kanal, atau pengingat KTP/WA. · **Jangan** dibaca kalau: memilih tugas (itu [ANTREAN](../ANTREAN.md)) atau mencari aturan bisnis (itu [harga.md](../domain/keuangan.md#d4c-harga) §7–§8).

Bentuk 7 bagian mengikuti konvensi [ANTREAN §3](../ANTREAN.md) butir A-2 — **tanpa kotak**, bukan antrean kedua.

## Goal & todos

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

## 1. Tujuan & definisi selesai

1. **Checklist check-in** memuat: jumlah penghuni, hewan (ya/tidak), status KTP — satu layar, sebelum simpan.
2. **`Stay.occupantCount` dan `Stay.hasPet` terisi** pada semua jalur (walk-in, aktivasi booking, booking portal).
3. **Deposit dihitung otomatis**: `Room.defaultDepositRupiah + (hasPet ? OperationalSetting.petDepositRupiah : 0)`; surcharge **+20% per kepala** di atas batas gratis (STANDARD 2, LARGE 4) ikut dihitung.
4. **Tidak ada kanal yang berbeda**: booking publik, booking portal, dan walk-in memakai **helper yang sama**.
5. **KTP tidak memblokir check-in**; setelah check-in status KTP punya **4 keadaan** minimal (BELUM / MENUNGGU_VERIFIKASI / TERVERIFIKASI / DITOLAK) dan kewajibannya terlihat di portal.
6. **Pengingat KTP berulang** (7 hari, default P26) sampai terverifikasi; berhenti otomatis; tidak menyebut NIK/foto di pesan.
7. **PWA push aktif** (VAPID terisi) + **tombol “Ingatkan via WA”** di kartu urgent admin/owner yang membuka `wa.me` dengan pesan terisi — tanpa API, tanpa biaya, tetap manual.

## 2. Kondisi awal + cara mengukur ulang

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

## 3. Langkah (dari risiko terendah)

1. **Satu helper** `hitungDepositDanSurcharge(room, term, occupants, hasPet)` — dipakai tiga kanal; unit test membandingkan ketiganya.
2. **DTO + service check-in** — tambah `occupantCount`, `hasPet`, `petDepositCollected`; tulis ke stay; **jangan** mengubah stay lama.
3. **UI checklist** di wizard check-in (walk-in) dan di aktivasi booking; ringkasan nominal sebelum simpan.
4. **Paritas portal** — booking portal memakai helper yang sama.
5. **Status KTP + pengingat** — default P25/P26 sudah dipakai: **pengingat saja, 7 hari**. Sekaligus perbarui runbook go-live/produksi (**F-14**) agar gate lama tidak dinyalakan lagi.
6. **PWA + tombol WA** — pastikan VAPID terisi di Pengaturan; tombol di kartu urgent membuka WA tenant (nomor dinormalisasi 62…).
7. **Bukti** — test hitung (termasuk 0 hewan, 2 kepala, 4 kepala), test idempotensi (check-in dua kali tidak menambah deposit), render checklist.

## 4. Jebakan nyata yang sudah terukur

- **Deposit dobel.** Booking publik sudah menagih deposit hewan; check-in yang menambah lagi akan menagih dua kali. Helper harus membaca **apa yang sudah dibayar** (`depositPaidAmountRupiah`), bukan menimpa.
- **Mengubah deposit stay berjalan.** Jangan retro-aktif; hanya stay baru/aktivasi.
- **Surcharge mengubah `agreedRent`** → memengaruhi DP, rent-lock, dan invoice. Putuskan: masuk `agreedRent` (seperti booking publik) atau baris tagihan terpisah; jangan dua-duanya.
- **KTP: jangan blokir check-in** — gate lama `ktpVerificationGateEnabled` harus berhenti memblokir. Verifikasi tetap pada **OWNER/ADMIN sesuai kode hari ini**; aturan dossier 18 menyebut OWNER — selisih itu **F-13**, jangan mengubah akses tanpa keputusan.
- **Pengingat berulang wajib dedupe** (pola `dedupeKey` di notifikasi) supaya tidak spam.
- **`wa.me` tanpa API** — nomor harus diawali `62`, pesan di-encode; **jangan pernah** menaruh NIK/foto/alamat di pesan.
- **PWA butuh HTTPS + izin pengguna**; jangan mengklaim “push aktif” tanpa bukti satu perangkat.

## 5. Kalau macet (gejala → sebab → tindakan)

| Gejala | Sebab paling sering | Tindakan |
|---|---|---|
| Deposit tetap Rp0 saat check-in | `hasPet` tidak terkirim dari UI | periksa payload DTO + service |
| Nominal beda antar kanal | helper belum dipakai bersama | satukan; uji tiga kanal |
| Pengingat KTP berulang tiap hari | dedupe key tidak konsisten | pakai kunci `(recipient, stayId, 'KTP_REMINDER', hari)` |
| Push tidak terkirim | VAPID kosong / izin belum diberikan | isi VAPID di Pengaturan, uji 1 perangkat |
| Tombol WA kosong | nomor tenant null | tampilkan “nomor belum ada” + arahkan isi profil |

## 6. Catatan penyimpangan

Belum ada. Setiap penyimpangan dari kontrak ini dicatat di sini pada sesi yang sama.

## 7. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-19 | Dibuat dari instruksi owner: checklist hewan saat check-in agar deposit otomatis, aturan jumlah isi penghuni, KTP opsional saat check-in lalu wajib dilengkapi dengan notifikasi, PWA aktif, pengingat WA manual satu klik. Konsekuensi KTP menunggu P25/P26. Belum ada kode ditulis. |
