# Indeks Dokumentasi KOST48

> Titik masuk navigasi dokumentasi. Pilih bagian sesuai kebutuhan; jangan membaca seluruh `docs/` sebagai orientasi.
> Aturan operasional: [AGENTS](../AGENTS.md) · Antrean, gate, dan status: [STATUS](STATUS.md) · Keputusan bisnis: [KEPUTUSAN-OWNER](KEPUTUSAN-OWNER.md).
> Indeks ini turunan: ia menunjuk, bukan menambah aturan, dan bukan bukti audit atau PASS perilaku. Status penataan dokumen hanya ada di [STATUS §8](STATUS.md#8-struktur-dokumen-tujuan-konsolidasi) dan [mapping Tahap 3](arsip/DOC-GOV-20260922-mapping.md); indeks ini tidak menyimpan status sendiri.

Dibuat 22 September 2026 pada **Tahap 1** [rancangan DOC-GOV-20260922](arsip/DOC-GOV-20260922.md); **ditulis ulang 23 September 2026 (batch B10)** dari daftar nomor M menjadi indeks berbasis kebutuhan menuju rumah kanonik. Diperbarui 24 Sep 2026 (DOCS-CLEANUP-1): `docs/arsip/` dibuat sebagai rumah bukti/riwayat bulk (11 berkas pindah, 8 gabungan); beban baca sesi baru = README + STATUS + maksimum 2 berkas topik. Path lama tetap tersedia di §6.

## 0. Rumah kanonik: 7 file utama + 1 arsip

Dokumen dirapikan menjadi sedikit file utama tanpa penomoran M. Tabel ini menyebut **lokasi kanonik saat ini**; nama file yang belum ada ditandai *(target)*.

| File utama | Isi | Lokasi sekarang |
|---|---|---|
| [AGENTS](../AGENTS.md) | Aturan kerja agent: izin, batas baca, level, verifikasi | tetap di root |
| [STATUS](STATUS.md) | Antrean, gate, invariant, keputusan owner ringkas | tetap — menggantikan M12, AI_MASTER, ringkasan M13 |
| [ATURAN](ATURAN.md) | Aturan domain: uang, huni, operasional, harga, publik, AI/IoT | kanonik sejak Fase 2 (23 Sep 2026) — rincian per topik di [domain/](domain/) |
| [OPERASI](OPERASI.md) | Runbook: deploy, produksi, go-live, env, default dev, data master | kanonik sejak Fase 2 — rincian di [operations/](operations/) |
| [PETA-KODE](PETA-KODE.md) | Peta modul dan file kode | tetap — menggantikan M00 |
| [AUDIT](AUDIT.md) | Status audit, temuan, dan bukti bertanggal | kanonik sejak Fase 2 — rincian di [audit/](audit/) |
| [KEPUTUSAN-OWNER](KEPUTUSAN-OWNER.md) | Register keputusan bisnis owner | tetap — menggantikan M02 |
| [arsip/](arsip/README.md) | Bukti/riwayat bulk: fase lama, changelog bulanan lampau, audit bulk, rancangan selesai — **jangan dibaca rutin** | dibuat DOCS-CLEANUP-1 (24 Sep 2026) |

## 1. Mulai task

| Kebutuhan | Baca |
|---|---|
| Aturan kerja, izin, batas baca, alur task, pemulihan | [AGENTS](../AGENTS.md) — §4 izin, §5 level, §7 tahapan kerja, §8 verifikasi |
| Cheatsheet level risiko, checklist sebelum edit | [AI_QUICKREF](../AI_QUICKREF.md) |
| Template task/audit/handoff + roadmap | [GUIDE](../AI_WORKFLOW_GUIDE.md) §11–§12 |
| Antrean aktif, gate, prasyarat, blocker, invariant | [STATUS](STATUS.md) — §2 antrean, §3 task terbuka, §7 invariant |
| Keputusan owner ringkas | [STATUS §6](STATUS.md#6-keputusan-owner-yang-mengikat-ringkas) · register lengkap: [KEPUTUSAN-OWNER](KEPUTUSAN-OWNER.md) |
| Aturan domain sebelum menyentuh uang/huni/harga | [ATURAN](ATURAN.md) — titik masuk; rincian per topik di `docs/domain/` |
| Runbook deploy, produksi, dan go-live | [OPERASI](OPERASI.md) — titik masuk; rincian di `docs/operations/` |
| Status audit, temuan, dan gate verifikasi | [AUDIT](AUDIT.md) — titik masuk; rincian di `docs/audit/` |
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
| IoT (pengembangan ditunda; pencatatan utilitas tetap) | [domain/iot.md](domain/iot.md) · runbook: [operations/iot-tuya-setup.md](operations/iot-tuya-setup.md) (termasuk handoff Part E, DOCS-CLEANUP-1) · [operations/iot-water-meter-esp32.md](operations/iot-water-meter-esp32.md) |
| Scope dan batas proyek per role/flow | [product/scope.md](product/scope.md) |
| Portal ringkas owner/admin | [product/portal-owner-admin.md](product/portal-owner-admin.md) |
| Arah produk dan landasan bisnis | [product/arah-produk.md](product/arah-produk.md) — flow utama OWNER/ADMIN + landasan IB (gabungan, DOCS-CLEANUP-1) |
| Data default & seed DEV | [operations/default-dev.md](operations/default-dev.md) · referensi master: [operations/data-master.md](operations/data-master.md) |

## 3. Operasional dan rilis

| Kebutuhan | Baca |
|---|---|
| Orientasi proyek dan konteks bisnis | [product/orientasi.md](product/orientasi.md) |
| Runbook deployment, PWA, dan go-live | [operations/deploy-go-live.md](operations/deploy-go-live.md) |
| Produksi, env, backup/rollback, sisa pekerjaan owner | [operations/produksi.md](operations/produksi.md) |
| Checklist go-live cPanel + formulir isi data go-live (**satu formulir kanonik**) | [operations/go-live-cpanel.md](operations/go-live-cpanel.md) |
| Efisiensi hosting 512 MB, gate EF, tabel pengukuran | [operations/efisiensi-hosting.md](operations/efisiensi-hosting.md) |
| Harness verifikasi keuangan — invarian, DO-NOT-TOUCH, uji unit, gate per-task | [operations/verifikasi-keuangan.md](operations/verifikasi-keuangan.md) |
| Data master: kamar, fasilitas, konstanta, FAQ kanonik | [operations/data-master.md](operations/data-master.md) |
| Default & seed DEV (akun dev, perintah seed) | [operations/default-dev.md](operations/default-dev.md) |

## 4. Audit

Indeks dan status ringkasan audit: [audit/README.md](audit/README.md). Hasil audit lama berlaku pada lingkup/waktu yang disebut; bukan PASS untuk perubahan baru dan bukan bukti deployment atau runtime.

| Kebutuhan | Baca |
|---|---|
| Indeks, status ringkasan, dan contoh hasil audit modul | [audit/README.md](audit/README.md) · contoh: [audit/audit-modul-2026.md](audit/audit-modul-2026.md) |
| Cakupan audit total 135 ID | [audit/audit-checklist-total.md](audit/audit-checklist-total.md) |
| Audit UI/UX lintas portal + status/gate AO | [arsip/audit-uiux-lintas-portal-2026-07.md](arsip/audit-uiux-lintas-portal-2026-07.md) (bukti bulk) · [audit/status-ao-lintas-portal.md](audit/status-ao-lintas-portal.md) (status aktif) |
| Audit UI/UX 12 Sep 2026 + homepage produksi 15 Sep 2026 + audit dokumentasi | [audit/audit-2026-09.md](audit/audit-2026-09.md) · laporan total (bukti bulk): [arsip/audit-uiux-total-2026-09-12.md](arsip/audit-uiux-total-2026-09-12.md) |
| Audit operasional dan lintas scope Juli 2026 | [audit/audit-operasional-2026-07.md](audit/audit-operasional-2026-07.md) · [audit/audit-lintas-scope-2026-07-29.md](audit/audit-lintas-scope-2026-07-29.md) |
| Audit 360° uang + huni + status temuan P1 | [audit/audit-uang-huni-2026-07.md](audit/audit-uang-huni-2026-07.md) — gabungan 3 berkas (DOCS-CLEANUP-1) |
| Audit dokumentasi dan urutan kerja (termasuk catatan migrasi Tahap 2) | [audit/audit-2026-09.md](audit/audit-2026-09.md) |
| Audit menyeluruh kode 30 Jul 2026 + audit modul pertama (frontend-auth) | [audit/audit-modul-2026.md](audit/audit-modul-2026.md) |
| Peta hasil audit per cabang (generated) | [audit-map/](audit-map/README.md) |
| Lampiran audit portal tenant 2 Jul 2026 (bukti bulk) | [arsip/lampiran-audit-portal-tenant-2026-07-02.md](arsip/lampiran-audit-portal-tenant-2026-07-02.md) |

## 5. Riwayat

| Kebutuhan | Baca |
|---|---|
| Riwayat bertanggal (10 entri terbaru + indeks per bulan) | [M13](M13_CHANGELOG.md) |
| Changelog September 2026 (rotasi entri M13 dan riwayat September) | [history/changelog/2026-09.md](history/changelog/2026-09.md) |
| Changelog Agustus 2026 (arsip) | [arsip/changelog-2026-08.md](arsip/changelog-2026-08.md) |
| Changelog Juli 2026 (+ Release 23 Jul; arsip) | [arsip/changelog-2026-07.md](arsip/changelog-2026-07.md) |
| Snapshot governance 20 Sep 2026 + log roadmap/keputusan historis (gabungan) | [history/governance.md](history/governance.md) |
| Izin dan catatan keputusan owner yang sudah digantikan | [history/izin-dan-catatan-keputusan-owner.md](history/izin-dan-catatan-keputusan-owner.md) |
| Riwayat fase lama, ledger historis, Fase AN/MA/A/B-AL (arsip) | [arsip/fase-lama.md](arsip/fase-lama.md) |
| Fase AO (audit & hardening UI/UX lintas portal) + Fase EF (efisiensi shared hosting 512 MB) | [history/fase-ao-ef.md](history/fase-ao-ef.md) |
| Bukti migrasi dokumen per sub-langkah (arsip) | [arsip/DOC-GOV-20260922-mapping.md](arsip/DOC-GOV-20260922-mapping.md) |
| Rancangan penataan dokumentasi (selesai; di arsip) | [arsip/DOC-GOV-20260922.md](arsip/DOC-GOV-20260922.md) |
| Indeks rumah arsip — **jangan dibaca rutin** | [arsip/README.md](arsip/README.md) |
| Forensik dokumen lama (ejaan folder dipertahankan; status arsip di [STATUS §8](STATUS.md#8-struktur-dokumen-tujuan-konsolidasi)) | `docs/archieve/` — hanya bila benar-benar perlu |

## 6. Pintu masuk lama (sudah dihapus)

Path lama (seri `M00`–`M20` dan empat berkas non-M) **sudah dihapus di Fase 3 (23 Sep 2026)** setelah seluruh tautan dialihkan ke rumah kanonik pada §0–§5; bookmark atau URL lama ke path itu **tidak lagi resolve**. Peta pengalihan lengkap: [mapping §7.2 butir 23](arsip/DOC-GOV-20260922-mapping.md).

Ringkasan pemetaan (dulu → sekarang): M00 → [PETA-KODE](PETA-KODE.md) · M01 → [orientasi produk](product/orientasi.md) · M02 → [KEPUTUSAN-OWNER](KEPUTUSAN-OWNER.md) · M03 → [flow](domain/flow.md) + [kontrak](domain/kontrak.md) · M04 → [keuangan](domain/keuangan.md) · M05 → [hunian](domain/hunian.md) · M06 → [operasional](domain/operasional.md) · M07 → [publik](domain/publik.md) · M08 → [deploy & go-live](operations/deploy-go-live.md) · M09 → [AI owner/admin](domain/ai.md) · M10 → [scope](product/scope.md) · M11 → [data DEV](operations/default-dev.md) + [data master](operations/data-master.md) · M12 → [STATUS](STATUS.md) · M13 → [M13](M13_CHANGELOG.md) (**tetap aktif**) · M14 → [status Fase AO](audit/status-ao-lintas-portal.md) · M15 → [IoT](domain/iot.md) · M16 → [audit menyeluruh](audit/audit-modul-2026.md) · M17 → [portal owner/admin](product/portal-owner-admin.md) · M18 → [harga](domain/harga.md) · M19 → [efisiensi hosting](operations/efisiensi-hosting.md) · M20 → [produksi](operations/produksi.md) · CHECKLIST_AUDIT_TOTAL → [checklist audit total](audit/audit-checklist-total.md) · AUDIT_UIUX_TOTAL_2026-09-12 → [audit UI/UX total 12 Sep 2026](arsip/audit-uiux-total-2026-09-12.md) · GO_LIVE_CPANEL_CHECKLIST → [checklist go-live cPanel](operations/go-live-cpanel.md) · FORM_ISI_DATA_GO_LIVE → [formulir isi data go-live](operations/go-live-cpanel.md).

## 7. Batas indeks ini

- Indeks tidak menggantikan [STATUS](STATUS.md) (antrean/gate), [KEPUTUSAN-OWNER](KEPUTUSAN-OWNER.md) (keputusan bisnis), atau [AGENTS](../AGENTS.md) (aturan); urutan kerja tetap dari STATUS §2.
- Status penataan dokumen — batch, sisa pekerjaan, arsip — hanya ada di [STATUS §8](STATUS.md#8-struktur-dokumen-tujuan-konsolidasi) dan [mapping Tahap 3](arsip/DOC-GOV-20260922-mapping.md); indeks ini tidak menyimpan status sendiri agar tidak ada dua sumber.
- [ATURAN](ATURAN.md), [OPERASI](OPERASI.md), dan [AUDIT](AUDIT.md) adalah rumah kanonik sejak **Fase 2 (23 Sep 2026)**; rinciannya tetap di `docs/domain/`, `docs/operations/`, dan `docs/audit/` dan tidak digandakan ke sana. Rumah `docs/arsip/` **sudah dibuat** (DOCS-CLEANUP-1, 24 Sep 2026).
- Path lama (seri M dan empat berkas non-M) **sudah dihapus di Fase 3** (23 Sep 2026); seluruh tautan dialihkan ke rumah kanonik §0–§5, dan bookmark/URL lama ke path itu tidak lagi resolve (peta: [mapping §7.2 butir 23](arsip/DOC-GOV-20260922-mapping.md)).
- Bila ada tautan di indeks ini yang tidak cocok, laporkan ke [STATUS](STATUS.md); jangan perbaiki di luar scope batch yang berjalan.
