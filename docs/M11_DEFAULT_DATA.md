# M11 — Default Data (Pintu Masuk Tematik)

> **Rujukan arah aktif (6 Sep 2026):** [M02](M02_KEPUTUSAN_OWNER.md) untuk keputusan owner; [M12](M12_CHECKLIST_CHANGELOG.md#antrian-eksekusi-aktif) untuk satu checklist/urutan kerja; [M19](M19_EFISIENSI_HOSTING_512MB.md) untuk Fase EF. **EF diprioritaskan, satu proses API sebagai target, Fase MA ditunda.**
> Dokumen ini adalah **pintu masuk tematik**; isi rinci sudah dipindah ke lokasi kanonik di bawah. Status PASS/selesai pada audit lama hanya berlaku pada lingkup/waktu yang disebut, bukan bukti deployment atau runtime terbaru. Judul sumber pra-konsolidasi adalah riwayat; jangan membuat ulang file lama atau mengulang checklist selesai.

> **Sumber kebenaran untuk nilai default dan referensi lapangan, bukan instruksi seed produksi.**
> Seed scripts (`seed-dev-reset.js`, `seed-dev-via-api.js`) dan service seed (`faqs.service.ts`)
> HARUS konsisten dengan nilai default yang relevan dalam file ini. Data penghuni nyata tidak boleh dimasukkan otomatis ke database produksi.
>
> Diperbarui: 2026-07-23

<a id="1-akun--kredensial"></a>
<a id="1a-akun-fondasi-seed-dev-khusus-database-pengembangan-port-5433"></a>
<a id="1b-akun-audit-uat-non-personal-ao-03--password-tidak-ditulis-di-docs"></a>
<a id="1c-data-tenant-produksi-go-live"></a>
<a id="status-penggunaan-data-untuk-go-live"></a>
<a id="2-kamar-13-kamar-nyata"></a>
<a id="catatan-fisik-kamar"></a>
<a id="fasilitas-per-kamar-seed-via-post-roomsidfacilities"></a>
<a id="3-fasilitas-umum"></a>
<a id="3a-data-lapangan-produksi-owner--belum-otomatis-masuk-db"></a>
<a id="4-konstanta-operasional-operationalsetting-id1"></a>
<a id="5-layanan-tambahan-additionalservice"></a>
<a id="6-faq-lengkap-37-faq"></a>
<a id="7-data-tenant-produksi--skenario-per-kamar"></a>
<a id="7b-data-audit-fasilitas-lapangan"></a>
<a id="8-deepseek-ai--api-key--konfigurasi"></a>
<a id="9-ringkasan-perintah-seed"></a>
<a id="appendix--seed-master-data-diarsipkan"></a>

## Isi & lokasi kanonik

| Topik | Lokasi kanonik | Catatan |
|---|---|---|
| § Status penggunaan data untuk go-live | [operations/produksi.md](operations/produksi.md) | Batas produksi sebelum go-live |
| §1a Akun Fondasi seed-dev, §1b Akun Audit UAT Non-Personal, §9 Ringkasan Perintah Seed | [operations/default-dev.md](operations/default-dev.md) | DEV + fixture UAT; kredensial tidak ditulis di docs |
| §1c Data Tenant Produksi (GO-LIVE), §7 Data Tenant Produksi per kamar | [operations/produksi.md](operations/produksi.md) | Data penghuni nyata; input lewat UI Owner |
| §2 Kamar (13 kamar nyata), Catatan Fisik Kamar, Fasilitas Per Kamar | [operations/data-master.md](operations/data-master.md) | Nilai master lapangan |
| §3 Fasilitas Umum | [operations/data-master.md](operations/data-master.md) | Referensi fasilitas |
| §3a Data Lapangan Produksi Owner, §7b Data Audit Fasilitas Lapangan | [operations/produksi.md](operations/produksi.md) | Ground truth/audit lapangan; belum otomatis masuk DB |
| §4 Konstanta Operasional (`OperationalSetting` id=1), §5 Layanan Tambahan | [operations/data-master.md](operations/data-master.md) | Nilai default sistem |
| §6 FAQ Lengkap (37 FAQ) | [operations/data-master.md](operations/data-master.md) | Sumber kanonik: `backend/src/modules/faqs/faqs.service.ts` |
| §8 DeepSeek AI — API Key & Konfigurasi | [operations/produksi.md](operations/produksi.md) | Nilai key TIDAK disalin; hanya lokasi |

## Catatan Pemakaian

- Jadikan file ini pintu masuk tematik; bila butuh detail mentah, buka lokasi kanonik di tabel atas.
- Heading asli (`## 1. Akun & Kredensial` … `## 9. Ringkasan Perintah Seed`) dipertahankan di file tujuan; file ini hanya pintu masuk agar tautan lama tetap resolve.
- **Batas DEV/UAT/produksi tetap eksplisit di tujuan:** DEV di `operations/default-dev.md`, UAT non-personal mengikuti berkas audit AO-03, dan data produksi/audit lapangan di `operations/produksi.md`.
- **Keselamatan data:** file ini dan file tujuan memuat NIK penghuni serta kredensial DEV. Nilai tersebut tidak boleh disalin ke paket deploy, log, atau artefak publik; API key §8 tetap ditulis sebagai lokasi, bukan nilainya.

## 9. Ringkasan Perintah Seed
Isi lengkap: [operations/default-dev.md](operations/default-dev.md)

## Appendix — Seed Master Data (diarsipkan)
Prosedur "Patch Tenant Aman" (2026-07-08) sudah tidak tersedia.
Arsip: [m11-seed-master-data-appendix-2026-07-08.md](history/m11-seed-master-data-appendix-2026-07-08.md).