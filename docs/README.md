# Indeks Dokumentasi KOST48

> Titik masuk navigasi dokumentasi. Pilih bagian sesuai kebutuhan; jangan membaca seluruh `docs/` sebagai orientasi.
> Aturan operasional: [AGENTS](../AGENTS.md) · Antrean, gate, dan status: [STATUS](STATUS.md) · Keputusan bisnis: [KEPUTUSAN-OWNER](KEPUTUSAN-OWNER.md).
> Indeks ini turunan: ia menunjuk, bukan menambah aturan, dan bukan bukti audit atau PASS perilaku. Status penataan dokumen hanya ada di [STATUS §8](STATUS.md#8-struktur-dokumen-tujuan-konsolidasi) dan [mapping Tahap 3](history/DOC-GOV-20260922-mapping.md); indeks ini tidak menyimpan status sendiri.

Dibuat 22 September 2026 pada **Tahap 1** [rancangan DOC-GOV-20260922](plans/DOC-GOV-20260922.md); **ditulis ulang 23 September 2026 (batch B10)** dari daftar nomor M menjadi indeks berbasis kebutuhan menuju rumah kanonik. Path lama tetap tersedia di §6.

## 0. Rumah kanonik: 7 file utama + 1 arsip

Dokumen dirapikan menjadi sedikit file utama tanpa penomoran M. Tabel ini menyebut **lokasi kanonik saat ini**; nama file yang belum ada ditandai *(target)*.

| File utama | Isi | Lokasi sekarang |
|---|---|---|
| [AGENTS](../AGENTS.md) | Aturan kerja agent: izin, batas baca, level, verifikasi | tetap di root |
| [STATUS](STATUS.md) | Antrean, gate, invariant, keputusan owner ringkas | tetap — menggantikan M12, AI_MASTER, ringkasan M13 |
| `docs/ATURAN.md` *(target)* | Aturan domain: uang, huni, operasional, harga, publik, AI/IoT | [domain/](domain/) |
| `docs/OPERASI.md` *(target)* | Runbook: deploy, produksi, go-live, env, default dev, data master | [operations/](operations/) |
| [PETA-KODE](PETA-KODE.md) | Peta modul dan file kode | tetap — menggantikan M00 |
| `docs/AUDIT.md` *(target)* | Status audit, temuan, dan bukti bertanggal | [audit/](audit/) |
| [KEPUTUSAN-OWNER](KEPUTUSAN-OWNER.md) | Register keputusan bisnis owner | tetap — menggantikan M02 |
| `docs/arsip/` *(target)* | Riwayat, fase, changelog bulanan, dokumen lama | [history/](history/) + `docs/archieve/` |

## 1. Mulai task

| Kebutuhan | Baca |
|---|---|
| Aturan kerja, izin, batas baca, alur task, pemulihan | [AGENTS](../AGENTS.md) — §4 izin, §5 level, §7 tahapan kerja, §8 verifikasi |
| Cheatsheet level risiko, checklist sebelum edit | [AI_QUICKREF](../AI_QUICKREF.md) |
| Template task/audit/handoff + roadmap | [GUIDE](../AI_WORKFLOW_GUIDE.md) §11–§12 |
| Antrean aktif, gate, prasyarat, blocker, invariant | [STATUS](STATUS.md) — §2 antrean, §3 task terbuka, §7 invariant |
| Keputusan owner ringkas | [STATUS §6](STATUS.md#6-keputusan-owner-yang-mengikat-ringkas) · register lengkap: [KEPUTUSAN-OWNER](KEPUTUSAN-OWNER.md) |
| Peta kode sebelum mencari source | [PETA-KODE](PETA-KODE.md) · [audit-map](audit-map/README.md) · [alur lintas domain](audit-map/ALUR_LINTAS_DOMAIN.md) · [cara audit](audit-map/CARA_AUDIT.md) |

## 2. Domain (aturan bisnis)

Aturan kanonik per topik. Ringkasan produk ada di `product/` dan tidak menggantikan aturan di sini.

| Topik | Baca |
|---|---|
| Flow dan kontrak lintas domain | [domain/flow.md](domain/flow.md) · [domain/kontrak.md](domain/kontrak.md) |
| Keuangan, jurnal, tagihan | [domain/keuangan.md](domain/keuangan.md) |
| Siklus huni, check-in/checkout, deposit | [domain/hunian.md](domain/hunian.md) |
| Operasional harian staf, konstanta owner-settable | [domain/operasional.md](domain/operasional.md) |
| Harga kamar, DP, deposit, surcharge | [domain/harga.md](domain/harga.md) |
| Publik dan pertumbuhan | [domain/publik.md](domain/publik.md) |
| AI owner/admin | [domain/ai.md](domain/ai.md) |
| IoT (pengembangan ditunda; pencatatan utilitas tetap) | [domain/iot.md](domain/iot.md) · runbook: [operations/iot-tuya-setup.md](operations/iot-tuya-setup.md) · [operations/iot-water-meter-esp32.md](operations/iot-water-meter-esp32.md) · [operations/iot-handoff.md](operations/iot-handoff.md) |
| Scope dan batas proyek per role/flow | [product/scope.md](product/scope.md) |
| Portal ringkas owner/admin | [product/portal-owner-admin.md](product/portal-owner-admin.md) |
| Arah produk dan landasan bisnis | [product/flow-utama.md](product/flow-utama.md) · [product/landasan-ib.md](product/landasan-ib.md) |
| Data default & seed DEV | [operations/default-dev.md](operations/default-dev.md) · referensi master: [operations/data-master.md](operations/data-master.md) |

## 3. Operasional dan rilis

| Kebutuhan | Baca |
|---|---|
| Orientasi proyek dan konteks bisnis | [product/orientasi.md](product/orientasi.md) |
| Runbook deployment, PWA, dan go-live | [operations/deploy-go-live.md](operations/deploy-go-live.md) |
| Produksi, env, backup/rollback, sisa pekerjaan owner | [operations/produksi.md](operations/produksi.md) |
| Checklist go-live cPanel | [operations/go-live-cpanel.md](operations/go-live-cpanel.md) |
| Formulir isi data go-live (satu formulir kanonik) | [operations/form-go-live.md](operations/form-go-live.md) |
| Efisiensi hosting 512 MB, gate EF, tabel pengukuran | [operations/efisiensi-hosting.md](operations/efisiensi-hosting.md) |
| Harness verifikasi keuangan — invarian, DO-NOT-TOUCH, uji unit, gate per-task | [operations/verifikasi-keuangan.md](operations/verifikasi-keuangan.md) |
| Data master: kamar, fasilitas, konstanta, FAQ kanonik | [operations/data-master.md](operations/data-master.md) |
| Default & seed DEV (akun dev, perintah seed) | [operations/default-dev.md](operations/default-dev.md) |

## 4. Audit

Indeks dan status ringkasan audit: [audit/README.md](audit/README.md). Hasil audit lama berlaku pada lingkup/waktu yang disebut; bukan PASS untuk perubahan baru dan bukan bukti deployment atau runtime.

| Kebutuhan | Baca |
|---|---|
| Indeks, status ringkasan, dan contoh hasil audit modul | [audit/README.md](audit/README.md) · contoh: [audit/frontend-auth.md](audit/frontend-auth.md) |
| Cakupan audit total 135 ID | [audit/audit-checklist-total.md](audit/audit-checklist-total.md) |
| Audit UI/UX lintas portal + status/gate AO | [audit/audit-uiux-lintas-portal-2026-07.md](audit/audit-uiux-lintas-portal-2026-07.md) · [audit/status-ao-lintas-portal.md](audit/status-ao-lintas-portal.md) |
| Audit UI/UX 12 Sep 2026 (total dan ulang) | [audit/audit-uiux-total-2026-09-12.md](audit/audit-uiux-total-2026-09-12.md) · [audit/audit-uiux-ulang-2026-09-12.md](audit/audit-uiux-ulang-2026-09-12.md) |
| Audit homepage produksi 15 Sep 2026 | [audit/audit-homepage-produksi-2026-09-15.md](audit/audit-homepage-produksi-2026-09-15.md) |
| Audit operasional dan lintas scope Juli 2026 | [audit/audit-operasional-2026-07.md](audit/audit-operasional-2026-07.md) · [audit/audit-lintas-scope-2026-07-29.md](audit/audit-lintas-scope-2026-07-29.md) |
| Audit 360° uang dan huni + status temuan | [audit/audit-360-uang-2026-07.md](audit/audit-360-uang-2026-07.md) · [audit/audit-360-huni-2026-07.md](audit/audit-360-huni-2026-07.md) · [audit/p1-uang-status-2026-09-23.md](audit/p1-uang-status-2026-09-23.md) |
| Audit dokumentasi dan urutan kerja (termasuk catatan migrasi dokumen Tahap 2) | [audit/audit-dokumentasi-2026-09.md](audit/audit-dokumentasi-2026-09.md) · [audit/audit-menyeluruh-2026-07.md](audit/audit-menyeluruh-2026-07.md) |
| Peta hasil audit per cabang (generated) | [audit-map/](audit-map/README.md) |
| Lampiran audit portal tenant 2 Jul 2026 | [history/lampiran-audit-portal-tenant-2026-07-02.md](history/lampiran-audit-portal-tenant-2026-07-02.md) |

## 5. Riwayat

| Kebutuhan | Baca |
|---|---|
| Riwayat bertanggal (10 entri terbaru + indeks per bulan) | [M13](M13_CHANGELOG.md) |
| Changelog September 2026 (rotasi entri M13 dan riwayat September) | [history/changelog/2026-09.md](history/changelog/2026-09.md) |
| Changelog Agustus 2026 | [history/changelog/2026-08.md](history/changelog/2026-08.md) |
| Changelog Juli 2026 (+ Release 23 Jul) | [history/changelog/2026-07.md](history/changelog/2026-07.md) |
| Snapshot governance 20 Sep 2026 | [history/governance-2026-09-20.md](history/governance-2026-09-20.md) |
| Izin dan catatan keputusan owner yang sudah digantikan | [history/izin-dan-catatan-keputusan-owner.md](history/izin-dan-catatan-keputusan-owner.md) |
| Riwayat fase lama, ledger historis, Fase AN/MA/A/B-AL | [history/fase-lama.md](history/fase-lama.md) |
| Fase AO — audit & hardening UI/UX lintas portal | [history/fase-ao.md](history/fase-ao.md) |
| Fase EF — efisiensi shared hosting 512 MB | [history/fase-ef.md](history/fase-ef.md) |
| Roadmap 30 hari & log keputusan historis | [history/governance-log.md](history/governance-log.md) |
| Bukti migrasi dokumen per sub-langkah | [history/DOC-GOV-20260922-mapping.md](history/DOC-GOV-20260922-mapping.md) |
| Rancangan penataan dokumentasi (status mengikuti [STATUS](STATUS.md)) | [plans/DOC-GOV-20260922.md](plans/DOC-GOV-20260922.md) |
| Forensik dokumen lama (ejaan folder dipertahankan; status arsip di [STATUS §8](STATUS.md#8-struktur-dokumen-tujuan-konsolidasi)) | `docs/archieve/` — hanya bila benar-benar perlu |

## 6. Pintu masuk lama (kompatibilitas)

Path lama dipertahankan sebagai pointer sehingga tautan dan bookmark lama tetap resolve. Isi kanoniknya ada di rumah pada §0–§5, bukan di file-file ini.

- Seri M: [M00](M00_CODEMAP.md) · [M01](M01_MASTER.md) · [M02](M02_KEPUTUSAN_OWNER.md) · [M03](M03_FLOW_KONTRAK.md) · [M04](M04_KEUANGAN.md) · [M05](M05_SIKLUS_HUNI.md) · [M06](M06_OPERASIONAL.md) · [M07](M07_PUBLIK_GROWTH.md) · [M08](M08_DEPLOY_GO_LIVE.md) · [M09](M09_AI_OWNER_ADMIN.md) · [M10](M10_PETA_SCOPE.md) · [M11](M11_DEFAULT_DATA.md)
- Seri M (lanjutan): [M12](M12_CHECKLIST_CHANGELOG.md) · [M13](M13_CHANGELOG.md) · [M14](M14_AUDIT_UI_UX.md) · [M15](M15_IOT.md) · [M16](M16_AUDIT_MENYELURUH.md) · [M17](M17_PORTAL_FLOW_RINGKAS.md) · [M18](M18_ATURAN_HARGA_KAMAR.md) · [M19](M19_EFISIENSI_HOSTING_512MB.md) · [M20](M20_PRODUKSI_KOST48.md)
- Non-M: [CHECKLIST_AUDIT_TOTAL](CHECKLIST_AUDIT_TOTAL.md) · [AUDIT_UIUX_TOTAL_2026-09-12](AUDIT_UIUX_TOTAL_2026-09-12.md) · [GO_LIVE_CPANEL_CHECKLIST](GO_LIVE_CPANEL_CHECKLIST.md) · [FORM_ISI_DATA_GO_LIVE](FORM_ISI_DATA_GO_LIVE.md) · [AI_MASTER](../AI_MASTER.md) (dashboard lama, isi kini di [STATUS](STATUS.md))

## 7. Batas indeks ini

- Indeks tidak menggantikan [STATUS](STATUS.md) (antrean/gate), [KEPUTUSAN-OWNER](KEPUTUSAN-OWNER.md) (keputusan bisnis), atau [AGENTS](../AGENTS.md) (aturan); urutan kerja tetap dari STATUS §2.
- Status penataan dokumen — batch, sisa pekerjaan, arsip — hanya ada di [STATUS §8](STATUS.md#8-struktur-dokumen-tujuan-konsolidasi) dan [mapping Tahap 3](history/DOC-GOV-20260922-mapping.md); indeks ini tidak menyimpan status sendiri agar tidak ada dua sumber.
- `docs/ATURAN.md`, `docs/OPERASI.md`, dan `docs/AUDIT.md` adalah **target** konsolidasi (Fase 2, menunggu approval owner); selama belum dibuat, rumahnya adalah `docs/domain/`, `docs/operations/`, dan `docs/audit/`.
- Path lama (seri M dan empat berkas non-M) tetap ada sebagai pointer agar tautan lama resolve; penghapusannya menunggu tidak ada rujukan lagi (Fase 3).
- Bila ada tautan di indeks ini yang tidak cocok, laporkan ke [STATUS](STATUS.md); jangan perbaiki di luar scope batch yang berjalan.
