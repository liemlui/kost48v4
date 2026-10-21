# ID-REGISTRY — nama untuk pekerjaan, fitur, temuan, dan keputusan

> **Blok baca** · Jenis: **registry nama (tier-1)** · Status: **aktif sejak 2026-10-21 (batch D1 DOCS-GEN2)** · Untuk siapa: agen + owner yang menamai pekerjaan/fitur/temuan
> · Baca kalau: membuat ID baru, memetakan ID lama, atau memeriksa arti sebuah singkatan. · **Jangan** dibaca kalau: mencari status pekerjaan (itu [ANTREAN](ANTREAN.md)) atau aturan kerja (itu [KONTRAK](KONTRAK.md)).

## 1. Mengapa berkas ini ada

Sensus dokumen 2026-10-20 menemukan **419 pola ID** dengan ≥2 kemunculan, dan sebagian token pendek menanggung lebih dari satu arti. Contoh yang nyata:

| Token | Arti pertama | Arti kedua |
|---|---|---|
| `F1` | kode kamar F1 | temuan fase F1 (`F1-12`) |
| `P1` | prioritas P1 | pertanyaan owner P1 dan temuan `P1-04` |
| `A-1` | butir adopsi doktrin | tugas antrean `A1` (beda satu tanda hubung) |
| `R1` | aturan gate | `R-1` ide yang ditolak; `R-30` rekomendasi desain |

Tanpa aturan nama, setiap batch baru menambah tabrakan. Berkas ini **tidak mengubah aturan kerja**; ia hanya menetapkan nama. Aturan yang mengikat tetap di [AGENTS](../AGENTS.md) dan [KONTRAK](KONTRAK.md).

## 2. Bentuk yang berlaku

| Prefix | Untuk | Bentuk | Contoh |
|---|---|---|---|
| `W-` | pekerjaan (antrean/dokumen tugas) | `W-<AREA>-NNN` | `W-OWN-001` |
| `FEAT-` | fitur di registry fitur | `FEAT-<AREA>-NNN` | `FEAT-ADM-012` |
| `AUD-` | temuan audit | `AUD-<YYYYMMDD>-NN` | `AUD-20261020-01` |
| `D-` | keputusan owner | `D-NNN` | `D-022` |
| `R` | aturan gate dokumen | `RNN` (dua digit) | `R12` |
| `DOC-` | pekerjaan dokumentasi | `DOC-NNN` | `DOC-007` |

**AREA** yang sah: `OWN` (owner) · `ADM` (admin) · `STF` (staff) · `TNT` (tenant) · `FIN` (uang) · `OPS` (deploy/operasional) · `DATA` (data/master) · `DOC` (dokumentasi).

### Lima aturan nama

1. **ID proses tidak boleh berbentuk satu huruf + angka.** Kode kamar `A`–`M` dan `F1`–`F2` adalah **kode domain** dan tidak berubah; justru itu alasan ID proses harus berbentuk lain.
2. **Prefix wajib terdaftar di sini sebelum dipakai.** Prefix baru = satu baris baru di §2 + alasan di riwayat.
3. **Nomor tidak didaur ulang.** ID yang sudah dipakai tetap milik objek itu walau pekerjaannya dibatalkan; statusnya `BATAL`, bukan dipakai lagi.
4. **ID lama dibekukan.** Dokumen bertanggal dan arsip tidak diubah. Pemetaan ada di §4. Saat sebuah dokumen ditulis ulang (batch D5), ID baru dipakai dan rujukannya diperbarui pada batch yang sama.
5. **Satu ID = satu objek.** Jangan menggabungkan dua pekerjaan dalam satu ID (contoh lama yang tidak boleh diulang: `A1 / F1-12`, `AO-13/14-BUKTI`).

## 3. Seri aktif

| Seri | Pemilik | Status | Catatan |
|---|---|---|---|
| `W-` | antrean | **direservasi** | diisi saat D5 menulis ulang ANTREAN |
| `FEAT-` | registry fitur | **aktif** | 58 ID dipakai; lihat [FITUR](FITUR.md) |
| `AUD-` | audit | **direservasi** | dipakai untuk temuan baru sejak D3 |
| `D-` | owner | aktif | nomor berikutnya: **D-022** |
| `R` | gate | aktif | R01–R11 sudah dipakai; R12+ untuk gate v3 |
| `DOC-` | dokumentasi | **direservasi** | pekerjaan dokumentasi di luar antrean produk |

## 4. Alias lama (dibekukan, tidak dipakai untuk objek baru)

| ID lama | Arti aslinya | Mengapa ambigu | Untuk objek baru pakai |
|---|---|---|---|
| `F1-12`, `F1-2` | temuan fase F1 | sama dengan kamar F1 | `AUD-<tanggal>-NN` |
| `P1` | prioritas P1 / pertanyaan P1 | dua arti dalam satu repo | `W-` (pekerjaan) atau `D-` (keputusan) |
| `P1-04`…`P1-09` | temuan uang | mirip prioritas/pertanyaan | `AUD-<tanggal>-NN` |
| `A-1`…`A-7` | butir adopsi doktrin | mirip `A1` tugas | `DOC-` |
| `A1`, `A4`, `A5`, `A6` | tugas antrean | mirip `A-1` | `W-OPS-NNN` |
| `R1` | aturan gate | `R-1` ide ditolak; `R-30` rekomendasi | `R01` untuk aturan; `D-` untuk keputusan |
| `R-1`…`R-6` | ide/aturan yang ditolak | mirip aturan gate | tetap sebagai label historis |
| `M13`, `M19` | milestone | mirip kamar M | `AUD-` |
| `AO-xx` | fase audit UI/UX | label historis | tidak dipakai untuk pekerjaan baru |
| `EF-xx` | fase efisiensi hosting | label historis | tidak dipakai untuk pekerjaan baru |
| `AIDL-xx` | agenda keputusan AI | label historis | `W-` untuk lanjutannya |

## 5. Simbol

- **Tier-0 dan tier-1 tanpa emoji.** Status ditulis kata: `BUKA` · `JALAN` · `SELESAI` · `BLOKIR` · `BATAL`.
- **Mojibake hanya sah sebagai kutipan.** Baris yang memang mengutip teks rusak wajib memuat kata **mojibake** atau penanda `[kutipan-disengaja]`; selain itu dianggap kerusakan. (Detektornya dipasang di gate v3, batch D8.)
- **Tidak ada karakter hiasan sebagai pengganti status.** Centang, bintang, dan ikon tidak dipakai untuk menyatakan keadaan.

## 5a. Pemetaan ID D5 (21 Okt 2026)

43 baris aktif di [ANTREAN](ANTREAN.md) dipetakan ke `W-`. ID lama tetap **alias beku**; arsip dan dokumen bertanggal tidak diubah. Nomor tidak didaur ulang.

| ID lama | ID baru |
|---|---|
| `ONBOARDING-HUNIAN` | `W-OPS-001` |
| `EF-00` | `W-OPS-002` |
| `EF-02` | `W-OPS-003` |
| `EF-06` | `W-OPS-004` |
| `EF-07` | `W-OPS-005` |
| `EF-08` | `W-OPS-006` |
| `EF-09` | `W-OPS-007` |
| `MA` | `W-OPS-008` |
| `A1` | `W-OPS-009` |
| `F1-12` | `W-OPS-010` |
| `A4` | `W-OPS-011` |
| `A5` | `W-OPS-012` |
| `A6` | `W-OPS-013` |
| `GOLIVE-UPLOADS` | `W-OPS-014` |
| `CHECKLIST-GOLIVE` | `W-OPS-015` |
| `EF-04` | `W-OPS-016` |
| `BACKUP-DB-01` | `W-OPS-017` |
| `Z-19` | `W-OWN-001` |
| `AO-03` | `W-OWN-002` |
| `AO-13` | `W-OWN-003` |
| `AO-13/14-BUKTI` | `W-OWN-004` |
| `AO-14` | `W-OWN-005` |
| `AO-18` | `W-OWN-006` |
| `AO-19` | `W-OWN-007` |
| `AO-20` | `W-OWN-008` |
| `AO-21` | `W-OWN-009` |
| `AO-23` | `W-OWN-010` |
| `UIUX-SHOWCASE` | `W-OWN-011` |
| `AIDL-04` | `W-OWN-012` |
| `AIDL-06` | `W-OWN-013` |
| `AIDL-01` | `W-OWN-014` |
| `AIDL-02` | `W-OWN-015` |
| `AIDL-03` | `W-OWN-016` |
| `AIDL-05` | `W-OWN-017` |
| `AI-USAGE-01` | `W-OWN-018` |
| `FAQ-TENANT` | `W-TNT-001` |
| `CHECKIN-PET` | `W-TNT-002` |
| `KTP-PASCA-CHECKIN` | `W-TNT-003` |
| `NOTIF-PWA-WA` | `W-TNT-004` |
| `SINKRON-UANG` | `W-FIN-001` |
| `SINKRON-TEKS` | `W-FIN-002` |
| `DB-BANDING-TARIF` | `W-DATA-001` |
| `DOCS-GEN2` | `W-DOC-001` |

## 6. Batas

- Registry **tidak** menyatakan status pekerjaan; status tetap di [ANTREAN](ANTREAN.md).
- Registry **tidak** menghapus ID lama dari dokumen bertanggal. Membekukan berarti tidak menambah pemakaian baru, bukan menyunting arsip.
- Angka sensus di §1 adalah **potret 2026-10-20**; perintah pengukurnya ada di [kartu baseline](arsip/inventaris-docs-2026-10-20.md).

## 7. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-21 | Dibuat pada batch D1 DOCS-GEN2: tabel prefix, lima aturan nama, seri aktif, alias lama, aturan simbol. Belum ada ID `W-`/`FEAT-` yang dipakai; pengisian di D3 dan D5. |
| 2026-10-21 | D3 mengisi seri `FEAT-`: 58 ID di [FITUR](FITUR.md); `W-` masih menunggu D5. |
| 2026-10-21 | D5 memetakan 43 baris aktif ANTREAN ke `W-`; area `DOC` ditambahkan; alias lama tetap di §4. |
