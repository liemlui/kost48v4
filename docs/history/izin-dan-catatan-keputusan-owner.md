# Izin & Catatan Keputusan Owner — riwayat (kelas non-keputusan register M02)

Tanggal: 2026-09-23
Status: riwayat — bukan sumber aturan aktif
Tujuan: rumah riwayat kelas isi register keputusan owner yang bukan keputusan bisnis aktif — izin/approval migrasi dokumentasi yang sudah digantikan, izin bertahap 8 Sep, dan catatan status/teknis bertanggal
Rujukan: [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) · [M02 (pointer)](../KEPUTUSAN-OWNER.md) · [STATUS](../STATUS.md) · [governance-log](governance.md) · [changelog/2026-06](../arsip/changelog-2026-06.md) · [changelog/2026-07](../arsip/changelog-2026-07.md)

> Migrasi dari docs/M02_KEPUTUSAN_OWNER.md (B7 Tahap 3, 23 Sep 2026) pada DOC-GOV-20260922; blok dipindah apa adanya — teks, tanggal, dan bukti tidak diubah.
> Status berlaku/digantikan tiap blok dibaca dari §Status keputusan di [register kanonik](../KEPUTUSAN-OWNER.md); ringkasan log governance ada di [governance-log](governance.md).
> Sub-bagian dipindah dengan heading aslinya: "Status: Sudah Terkunci di Kode" (induk `## W-00 — Decision Register`) dan "Refactor 7 Juli 2026" (induk `## Update 2026-07-07`); heading induknya tetap di register kanonik.
> Catatan 2026-06-17 dan 2026-07-08 di bawah juga punya salinan bulanan di changelog; tidak dihapus atau didedup pada batch ini.

## 2026-09-23 — Retro-approve kondisional migrasi dokumentasi DOC-GOV-20260922

Owner menyetujui secara retroaktif pelaksanaan:

- Tahap 2 (antrean + riwayat, S0–S6)
- Tahap 3 S1 (operations batch)
- Tahap 3 S2.a (M03), S2.a-fix, S2.a-fix-2
- Tahap 3 S2.b1 (9 blok `## Update` M04 → `domain/keuangan.md` + changelog)
- Tahap 3 S2.b2.a (M04 Bagian 2 / Dossier 10) dan S2.b2.b (M04 Bagian 3 / Dossier 13)

Klarifikasi 23 Sep 2026: label awal "S2.b1 (M04 Dossier 10/13)" mencampur dua batch berbeda. Cakupan yang dimaksud owner adalah **S2.b1 dan S2.b2.a/S2.b2.b (Dossier 10 dan 13)** — lihat seksi keputusan lanjutan di bawah.

Dasar: hasil konservatif (docs-only, tidak menyentuh kode/DB/server/deploy), invariant terjaga, tidak ada revert yang diperlukan.

Syarat ke depan:
- Setiap batch berikutnya (S2.b3, S2.b4, S2.c, S2.d, S3–S7, Tahap 4) WAJIB mendapat approval eksplisit owner SEBELUM eksekusi.
- Approval dicatat di M02 + AI_MASTER sebelum eksekutor mulai.
- Tanpa approval, eksekutor STOP; tidak mengasumsikan "lanjut otomatis per batch".

<a id="keputusan-izin-bertahap--8-september-2026"></a>

## Keputusan izin bertahap — 8 September 2026

Rekomendasi izin pada tabel di bawah **disetujui owner** pada sesi 8 September 2026 (rencana eksekusi diterima). Tabel ini adalah riwayat keputusan; status aktual dan bukti eksekusi tetap bertanggal di M12/M13. Izin tidak menggantikan bukti hosting/pengukuran.

| Pekerjaan | Izin | Batas |
|---|---|---|
| EF-00/EF-02 | Lanjutkan pengumpulan bukti hosting + observasi pasif | Tetap **BLOCKED** sampai data tersedia; izin bukan pengganti bukti. |
| AO-03 → AO-13 (→ AO-14 setelah dependensi) | **Provisioning akun/fixture audit non-personal + crawl khusus UAT disetujui** | Prasyarat: target API/DB UAT diverifikasi (lokal `localhost:5433` `kost48_v3_pro`); tanpa reset/hapus data lama; AO-14 tetap terbuka. |
| EF-07 | Uji env lokal terhadap nilai DB simulasi (mock, tanpa sentuhan DB) | Audit statis selesai tidak diulang. |
| EF-08 | Rehearsal pada proses lokal khusus pengujian | Pengujian job yang menulis DB memerlukan fixture UAT terlokalis; restart host ditunda. |
| EF-04 | Implementasi ditunda | Baseline + kemampuan routing host jelas, lalu izin implementasi lokal. |
| AL H1–H15 | Cocokkan status temuan dengan perbaikan terbaru; pilih yang masih terbuka | Ditunda izin implementasi menyeluruh. |
| Fase A | Lanjutkan pengumpulan data + keputusan owner | Provisioning produksi/deploy menunggu target serta rencana konkret. |

### Koreksi lingkup AO (8 September 2026)

- Fixture tenant untuk crawler wajib **eksplisit non-personal**; skrip `seed-audit-users.js` tidak lagi memilih tenant existing otomatis. Akun TENANT stay-aktif menggunakan `AUDIT_TENANT_ACTIVE_ID` yang ditunjuk owner; tenant tanpa stay default = tenant dummy audit NIK `9000000000000001`. Skrip tidak membuat stay/invoice/payment.
- Skrip memakai OWNER existing hanya untuk login (tidak buat/ubah password/role OWNER); efek maksimal: membuat ADMIN/STAFF bila belum ada, maksimal dua portal-access tenant, maksimal satu tenant dummy.
- Login nyata memperbarui `User.lastLoginAt` dan membuat `RefreshToken` — crawl bukan operasi DB read-only; lingkup UAT mencakup sesi autentikasi di lingkungan non-produksi.
- Target provisioning dibatasi ke lingkungan UAT (guard non-lokal tolak tanpa `AUDIT_ALLOW_REMOTE=1`); kredensial audit non-personal tidak pernah dicetak atau disimpan di repo.

## Update 2026-06-17 — AUDIT KEUANGAN ULTRA ✅

Semua keputusan owner terkait keuangan (no-partial, DP 30%, deposit=Room.defaultDepositRupiah, PSAK 72, DRAFT≠revenue, meter pascabayar, settlement guard) **terverifikasi TERIMPLEMENTASI** di kode. Audit 5 jalur: LULUS. Detail: `docs/M04_KEUANGAN.md` Update 2026-06-17.

## Update 2026-07-08 — GATE-KTP-ENV fix + AU-01..AU-03

- **GATE-KTP-ENV:** Gate KTP diam-diam OFF di produksi karena `OperationalSetting.ktpVerificationGateEnabled` default `false` mengalahkan env. Fix: `settings.service.ts` semai nilai awal row dari env. Docs deploy diperbarui.
- **AU-01..AU-03:** Fix UX Admin/Owner — `SimpleCrudPage.tsx` delete confirm dialog + onError toast; `StaysPage.tsx` mutation booking/checkout onError toast; `OwnerSettingsPage.tsx` "Hapus key" DeepSeek confirm.

### Status: ✅ Sudah Terkunci di Kode

| Keputusan | Status | Implementasi |
|-----------|--------|-------------|
| STAFF boleh lihat `analytics/finance/summary`? | **TIDAK** — OWNER/ADMIN only | `@Roles(OWNER, ADMIN)` di controller ✅ |
| STAFF boleh lihat `wifi-sales`? | **READ-ONLY** — GET, tidak create/update/delete | ✅ |
| `RoomStatus.BOOKING` dihapus? | **SUDAH** — tidak ada di schema/enum sejak migrasi Fase V | ✅ |

### Refactor 7 Juli 2026
| Refactor | Status | File |
|----------|--------|------|
| Unifikasi `dateOnly()` — 1 shared utility | ✅ Selesai | `backend/src/common/utils/date-only.ts` |
| `@ApiProperty` di DTO invoice + stays + room-transfer | ✅ Selesai | 3 file DTO |
