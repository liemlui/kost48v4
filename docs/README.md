# Indeks Dokumentasi KOST48

> Titik masuk navigasi dokumentasi. Pilih bagian sesuai kebutuhan; jangan membaca seluruh `docs/` sebagai orientasi.
> Aturan operasional: [AGENTS](../AGENTS.md) · Antrean dan gate: [M12](M12_CHECKLIST_CHANGELOG.md) · Keputusan bisnis: [M02](M02_KEPUTUSAN_OWNER.md) · Dashboard governance: [AI_MASTER](../AI_MASTER.md).
> Indeks ini turunan: ia menunjuk, bukan menambah aturan, dan bukan bukti audit atau PASS perilaku.

Dibuat 22 September 2026 pada **Tahap 1** [rancangan DOC-GOV-20260922](plans/DOC-GOV-20260922.md). Status folder `docs/domain/` dan `docs/operations/` masih **rencana Tahap 3** dan belum memiliki isi.

## 1. Mulai task

| Kebutuhan | Baca |
|---|---|
| Aturan kerja, izin, batas baca, alur task, status, pemulihan | [AGENTS](../AGENTS.md) — §4 izin, §5 level, §7 tahapan kerja, §8 verifikasi |
| Cheatsheet level risiko, checklist sebelum edit | [AI_QUICKREF](../AI_QUICKREF.md) |
| Template task/audit/handoff + roadmap | [GUIDE](../AI_WORKFLOW_GUIDE.md) §11–§12 |
| Antrean aktif, gate, prasyarat, blocker | [M12](M12_CHECKLIST_CHANGELOG.md) |
| Status governance, exception gate uang, log keputusan | [AI_MASTER](../AI_MASTER.md) |
| Peta kode sebelum mencari source | [M00](M00_CODEMAP.md) · [audit-map](audit-map/README.md) · [alur lintas domain](audit-map/ALUR_LINTAS_DOMAIN.md) · [cara audit](audit-map/CARA_AUDIT.md) |

## 2. Domain

| Topik | Baca |
|---|---|
| Flow dan kontrak lintas domain | [M03](M03_FLOW_KONTRAK.md) |
| Keuangan, jurnal, tagihan | [M04](M04_KEUANGAN.md) |
| Siklus huni, check-in/checkout | [M05](M05_SIKLUS_HUNI.md) |
| Operasional harian staf | [M06](M06_OPERASIONAL.md) |
| Publik dan pertumbuhan | [M07](M07_PUBLIK_GROWTH.md) |
| AI owner/admin | [M09](M09_AI_OWNER_ADMIN.md) |
| Scope dan batas proyek | [M10](M10_PETA_SCOPE.md) |
| Data default DEV | [M11](M11_DEFAULT_DATA.md) |
| IoT (pengembangan ditunda; pencatatan utilitas tetap) | [M15](M15_IOT.md) |
| Portal ringkas | [M17](M17_PORTAL_FLOW_RINGKAS.md) |
| Aturan harga kamar | [M18](M18_ATURAN_HARGA_KAMAR.md) |
| Arah produk dan teori bisnis | [product/flow-utama.md](product/flow-utama.md) · [product/landasan-ib.md](product/landasan-ib.md) |

## 3. Operasional dan rilis

| Kebutuhan | Baca |
|---|---|
| Orientasi proyek dan konteks bisnis | [M01](M01_MASTER.md) |
| Runbook deployment dan go-live | [M08](M08_DEPLOY_GO_LIVE.md) |
| Produksi, env, backup/rollback, sisa pekerjaan owner | [M20](M20_PRODUKSI_KOST48.md) |
| Efisiensi hosting 512 MB, gate EF, tabel pengukuran | [M19](M19_EFISIENSI_HOSTING_512MB.md) |
| Checklist go-live cPanel | [GO_LIVE_CPANEL_CHECKLIST.md](GO_LIVE_CPANEL_CHECKLIST.md) |
| Formulir data go-live (satu formulir kanonik) | [FORM_ISI_DATA_GO_LIVE.md](FORM_ISI_DATA_GO_LIVE.md) |
| Runbook deploy, PWA & go-live (operasi) | [operations/deploy-go-live.md](operations/deploy-go-live.md) |
| Default & seed DEV (akun dev, perintah seed) | [operations/default-dev.md](operations/default-dev.md) |
| Produksi & operasional harian shared hosting | [operations/produksi.md](operations/produksi.md) |
| Checklist go-live cPanel (operasi) | [operations/go-live-cpanel.md](operations/go-live-cpanel.md) |
| Formulir isi data go-live (operasi) | [operations/form-go-live.md](operations/form-go-live.md) |

## 4. Audit

| Kebutuhan | Baca |
|---|---|
| Indeks dan status ringkasan audit modul | [audit/README.md](audit/README.md) · contoh hasil: [audit/frontend-auth.md](audit/frontend-auth.md) |
| Cakupan audit total 135 ID | [CHECKLIST_AUDIT_TOTAL.md](CHECKLIST_AUDIT_TOTAL.md) |
| Audit UI/UX dan tindak lanjut AO | [M14](M14_AUDIT_UI_UX.md) |
| Laporan audit UI/UX 12 Sep 2026 | [AUDIT_UIUX_TOTAL_2026-09-12.md](AUDIT_UIUX_TOTAL_2026-09-12.md) |
| Audit menyeluruh dan temuan tata dokumen | [M16](M16_AUDIT_MENYELURUH.md) |
| Peta hasil audit per cabang (generated) | [audit-map/](audit-map/README.md) |
| Catatan migrasi dokumen Tahap 2 (bukan audit aplikasi) | [M16 §0 pembaruan Tahap 2](M16_AUDIT_MENYELURUH.md#pembaruan-tahap-2-doc-gov-20260922) |

Hasil audit lama berlaku pada lingkup/waktu yang disebut; bukan PASS untuk perubahan baru dan bukan bukti deployment atau runtime.

## 5. Riwayat

| Kebutuhan | Baca |
|---|---|
| Riwayat bertanggal (entri terbaru) | [M13](M13_CHANGELOG.md) |
| Snapshot governance 20 Sep 2026 | [history/governance-2026-09-20.md](history/governance-2026-09-20.md) |
| Riwayat fase lama, ledger historis, Fase AN/MA/A/B-AL | [history/fase-lama.md](history/fase-lama.md) |
| Fase AO - audit & hardening UI/UX lintas portal | [history/fase-ao.md](history/fase-ao.md) |
| Fase EF - efisiensi shared hosting 512 MB | [history/fase-ef.md](history/fase-ef.md) |
| Changelog September 2026 (lanjutan M13) | [history/changelog/2026-09.md](history/changelog/2026-09.md) |
| Changelog Agustus 2026 | [history/changelog/2026-08.md](history/changelog/2026-08.md) |
| Changelog Juli 2026 (+ Release 23 Jul) | [history/changelog/2026-07.md](history/changelog/2026-07.md) |
| Roadmap 30 hari & log keputusan historis | [history/governance-log.md](history/governance-log.md) |
| Bukti migrasi Tahap 2 per sub-langkah | [history/DOC-GOV-20260922-mapping.md](history/DOC-GOV-20260922-mapping.md) |
| Rancangan penataan dokumentasi (status mengikuti M12) | [plans/DOC-GOV-20260922.md](plans/DOC-GOV-20260922.md) |
| Forensik dokumen lama | `docs/archieve/` — hanya bila benar-benar perlu |

## 6. Batas indeks ini

- Indeks tidak menggantikan M12 (antrean/gate), M02 (keputusan bisnis), atau AGENTS (aturan); urutan kerja tetap dari M12.
- Folder `docs/product/`, `docs/history/`, dan `docs/plans/` berisi artefak baru 22 Sep 2026; **Tahap 2 (S0-S6) selesai** dan memindahkan riwayat M12/M13 serta log AI_MASTER ke `docs/history/` tanpa mengubah isi. **Tahap 3 berjalan** — S1, S2.a (+fix), S2.b1, S2.b2.a, S2.b2.b DONE; sisa S2.b3, S2.b4, S2.c, S2.d, S3–S7; Tahap 4 belum dijalankan. Status lengkap: [M12](M12_CHECKLIST_CHANGELOG.md) dan [§0 rancangan](plans/DOC-GOV-20260922.md#0-status-pelaksanaan-per-tahap).
- Anchor lama M12/M13 dipertahankan sebagai pointer setelah migrasi Tahap 2; bila ada tautan tidak cocok, laporkan ke M12, jangan perbaiki di luar scope.
