# AI Master — KOST48

Dashboard monitoring governance; bukan sumber aturan baru dan tidak menggantikan M12/M13.
Status disinkronkan 23 September 2026 (DOC-GOV-FIX-01, DOC-GOV-FIX-02). **Konsolidasi lama Stage 1–5 selesai** menurut M13 20 Sep; wrapper tersedia dan audit frontend-auth sudah dibuat sebagian.
Task saat ini: DOC-GOV-20260922 ([rancangan penataan total](docs/plans/DOC-GOV-20260922.md)). **Pelaksanaan (sumbu A):** Tahap 1 DONE — indeks [docs/README.md](docs/README.md) dibuat, AGENTS/GUIDE/QUICKREF/M12/M13 diselaraskan; Tahap 2 (S0–S6) DONE; Tahap 3 berjalan — S1, S2.a, S2.b1, S2.b2.a, S2.b2.b DONE, sisa S2.b3, S2.b4, S2.c, S2.d, S3–S7; Tahap 4 belum dijalankan. **Izin/approval (sumbu B, otoritas owner):** Tahap 1 disetujui owner 22 Sep; Tahap 2 (S0–S6) + S1 + S2.a (+fix) + S2.b1 + S2.b2.a + S2.b2.b retro-approve kondisional 23 Sep ([M02](docs/M02_KEPUTUSAN_OWNER.md)); prioritas owner 23 Sep = menyelesaikan migrasi dokumentasi; persetujuan penuh rancangan XL dan batch S2.b3, S2.b4, S2.c, S2.d, S3–S7, Tahap 4 belum tercatat — wajib approval per batch. Izin Stage 1 lama adalah riwayat, bukan pembatasan task baru.

## 1. Peta File Governance

Status dibedakan antara kondisi sekarang dan peran tujuan yang disetujui owner.
Tanggal file lama tidak disimpulkan dari tanggal yang tertulis di dalam dokumennya.

| File | Fungsi | Status saat ini | Peran tujuan / sumber kebenaran | Terakhir diubah |
|---|---|---|---|---|
| [AGENTS.md](AGENTS.md) | Panduan agent | Canonical — arah produk dan alur kerja diperbarui 22 Sep | Satu sumber aturan agent canonical; tunduk pada prompt/M12 | 2026-09-22 |
| [CLAUDE.md](CLAUDE.md) | Panduan sesi Claude | Pointer aktif — Stage 3 selesai | Pointer 2 baris ke AGENTS/M12 | 2026-09-20 |
| [.clinerules](.clinerules) | Panduan Cline | Pointer aktif — Stage 3 selesai; tetap file tunggal | Pointer 2 baris ke AGENTS/M12 | 2026-09-20 |
| [.clineignore](.clineignore) | Ignore context Cline | Komentar tersinkron — Stage 3 selesai; pola tetap | Config tool, bukan sumber aturan kerja | 2026-09-20 |
| [reasonix.toml](reasonix.toml) | Permission tools Reasonix | Selesai Stage 5 — 7 allow dihapus; tanpa deny baru | Config tool; allow generik tetap, bukan blokir menyeluruh | 2026-09-20 |
| [AI_QUICKREF.md](AI_QUICKREF.md) | Cheatsheet harian | Status tooling dan batas bukti diperbarui | Ringkasan turunan AGENTS; exception uang di AGENTS §8 | 2026-09-22 |
| [AI_WORKFLOW_GUIDE.md](AI_WORKFLOW_GUIDE.md) | Pointer + lampiran roadmap/template | Roadmap lama diberi konteks; rancangan baru ditautkan | Pointer ke AGENTS/M12; §11–12 lampiran, bukan aturan kanonik | 2026-09-22 |
| [docs/audit/README.md](docs/audit/README.md) | Indeks audit modul | Satu audit parsial frontend-auth tersedia; empat placeholder | Indeks turunan; audit-map sebagai peta, M12 sebagai antrean | 2026-09-22 |
| [docs/README.md](docs/README.md) | Indeks dokumentasi berbasis kebutuhan | Dibuat 22 Sep (Tahap 1 DOC-GOV-20260922) | Titik masuk navigasi docs; turunan, bukan sumber aturan | 2026-09-22 |
| [AI_MASTER.md](AI_MASTER.md) | Monitoring lintas-agent | Dashboard aktif; status disinkronkan | Dashboard, bukan canonical atau pengganti M12/M13 | 2026-09-23 |
| [.github/copilot-instructions.md](.github/copilot-instructions.md) | Entry panduan Copilot | Pointer aktif — Stage 3 selesai | Pointer ke AGENTS/M12 dan dashboard AI_MASTER | 2026-09-20 |
| [M00](docs/M00_CODEMAP.md) / [audit-map](docs/audit-map/) | Navigasi kode dan audit | Ada; dipertahankan, tidak diubah | Peta rujukan; bukan bukti audit otomatis PASS | UNKNOWN — belum diperiksa |
| [M12](docs/M12_CHECKLIST_CHANGELOG.md) | Antrean dan gate tugas | Pelaksanaan: Tahap 1–2 DOC-GOV DONE, Tahap 3 berjalan, Tahap 4 belum dijalankan; izin: Tahap 2 (S0–S6) + S1 + S2.a (+fix) + S2.b1 + S2.b2.a + S2.b2.b retro-approve kondisional 23 Sep, batch lanjutan wajib approval per batch | Otoritas antrean/gate di atas AGENTS | 2026-09-23 |
| [M13](docs/M13_CHANGELOG.md) | Riwayat bertanggal | Entri koreksi docs dan rancangan ditambahkan; entri lama tetap | Riwayat bukti, bukan antrean baru | 2026-09-22 |
| [docs/history/](docs/history/) | Riwayat fase, changelog bulanan, log governance | Dibuat 22 Sep (Tahap 2 DOC-GOV) | Riwayat; bukan antrean atau sumber aturan | 2026-09-22 |
| [mapping migrasi DOC-GOV](docs/history/DOC-GOV-20260922-mapping.md) | Bukti perpindahan blok Tahap 2 + status Tahap 3 | Dicatat per sub-langkah S0-S6 (Tahap 2) dan S1–S2.b2 (Tahap 3) | Bukti migrasi; bukan spesifikasi baru | 2026-09-23 |

## 2. Hierarki Aturan (+ KNOWN EXCEPTION gate keuangan)

Keputusan owner: **User prompt > M12 > AGENTS.md > file pointer lain > AI_MASTER.md (dashboard).**
Aturan kanonik agent: [AGENTS.md](AGENTS.md); antrean/gate: [M12](docs/M12_CHECKLIST_CHANGELOG.md); riwayat: [M13](docs/M13_CHANGELOG.md); cheatsheet: [AI_QUICKREF.md](AI_QUICKREF.md).
**KNOWN EXCEPTION - gate uang, opsi C (TUNDA):** full unit test backend via `npm run test:unit`, yang memicu full build lewat `pretest:unit`, beserta gate M04. `pretest:unit` tidak dihapus/diubah; exception ini bukan perintah menjalankan test/build pada stage dokumentasi. Bila task uang melarang full test/build, catat benturan dan minta keputusan owner.
Config tool (`.clineignore`, `reasonix.toml`) mengendalikan kemampuan teknis, bukan izin otomatis; allow generik belum terbukti memblokir semua jalur mutasi.

## 3. Checklist Harian

Dipindah ke [AI_QUICKREF.md](AI_QUICKREF.md#checklist-harian-monitoring) - 9 checkbox monitoring; dashboard menyimpan status, bukan daftar periksa. Pelaksanaan kontrol teknis lintas-tool tidak dibuktikan oleh isi Markdown.

## 4. Status Audit Modul

Rujukan hasil berasal dari dokumen bertanggal; sinkronisasi 22 Sep tidak menjalankan ulang test atau audit aplikasi. Tidak ada hitungan coverage atau klaim PASS runtime baru; kesegaran bukti dinilai dari perubahan input relevan. Indeks: [docs/audit/README.md](docs/audit/README.md).

| Modul / cakupan | File audit / rujukan | Status | Tanggal audit | Freshness |
|---|---|---|---|---|
| Auth frontend | [docs/audit/frontend-auth.md](docs/audit/frontend-auth.md) | Diperiksa sebagian — login dengan mock | 2026-09-20 | Baseline d5d04cb; validitas terhadap diff berikutnya belum diperiksa |
| Context/sesi, auth backend, modul lainnya | [audit-map](docs/audit-map/) - navigasi, bukan hasil audit | UNKNOWN - belum diperiksa | UNKNOWN - belum diperiksa | UNKNOWN - belum diperiksa |

## 5. Utang Tooling

Rincian antrean: [M12](docs/M12_CHECKLIST_CHANGELOG.md) - Task Terbuka & Gate #7. Alias `test:module`/`build:module`/`audit:module` tersedia; `build:module` hanya exit 3 (tidak membangun) dan `audit:module` memeriksa keberadaan path, bukan kesegaran atau PASS.

| Usulan | Status / batas | Owner implementasi | Target |
|---|---|---|---|
| ~~`scripts/verify-module.mjs`~~ | Selesai Stage tooling 1 — 2026-09-20; manifest 1 modul (frontend-auth); mode test/build/audit | — | Selesai |
| Manifest `frontend-auth` | Aktif; bukti historis loginPage: 5 test, exit 0 pada 20 Sep; audit parsial tersedia, modul kedua belum ditetapkan | — | Manifest pertama tersedia |
| Jalur dependency hilang / test nol | Belum dibuktikan menurut audit frontend-auth; perlu uji terisolasi sesuai task M12 | AI setelah scope uji ditetapkan | Terbuka |
| ~~Permission Reasonix~~ | Selesai Stage 5 — 7 allow dihapus; build/test/install tetap; allow generik masih terbuka | UNKNOWN — belum diperiksa | Selesai Stage 5 — 2026-09-20 |

## 6. Roadmap 30 Hari

Dipindah ke [docs/history/governance-log.md](docs/history/governance-log.md) pada Tahap 2 tanpa mengubah isi. Roadmap bukan izin implementasi dan tidak mengganti prioritas M12.

## 7. Aturan Perubahan

Aturan perubahan mengikuti [AGENTS §10](AGENTS.md#10-perubahan-governance). Scope Tahap 2 adalah dokumentasi lokal; source aplikasi, konfigurasi permission, DB, dan deployment tidak diubah. Checkpoint per-stage pada [log historis](docs/history/governance-log.md) hanya merekam keadaan saat keputusan dibuat.

## 8. Log Keputusan

Log historis append-only ada di [docs/history/governance-log.md](docs/history/governance-log.md); dashboard menyimpan keputusan terbaru (riwayat penuh di log historis). Log tidak memberi izin baru.

| Tanggal | Keputusan owner | Alasan | Dampak / status penerapan |
|---|---|---|---|
| 2026-09-22 | Owner meminta alur pengembangan AI yang aman, penataan total docs, dan perbaikan temuan audit dokumentasi | Kurangi status bertentangan, konteks berlebih, dan risiko perubahan | Koreksi status/indeks/petunjuk dan kesiapan task diterapkan; rancangan XL disiapkan, migrasi belum dijalankan |
| 2026-09-22 | Owner menyetujui [rancangan DOC-GOV-20260922](docs/plans/DOC-GOV-20260922.md) Tahap 1 | Menutup rujukan `docs/README.md` yang belum ada dan memperjelas alur task/DoR/DoD | Tahap 1 diterapkan: `docs/README.md` dibuat; AGENTS/GUIDE/QUICKREF/AI_MASTER dan entri M12/M13 diselaraskan; tahap 2–4 pending; tanpa commit/push |
| 2026-09-23 | Retro-approve kondisional DOC-GOV-20260922 Tahap 2 + S2.a/b. Wajib approval eksplisit per batch berikutnya. | — | — |
| 2026-09-23 | Prioritas 30 hari: menyelesaikan migrasi DOC-GOV; cakupan retro-approve diklarifikasi (Tahap 2 S0–S6, S1, S2.a + fix, S2.b1, S2.b2.a, S2.b2.b); gerbang KTP produksi ditunda dengan risiko diterima; keenam flow utama tetap dalam cakupan FLOW-CORE-01 | Menutup ambiguitas cakupan izin dan menetapkan urutan kerja | Dicatat di [M02](docs/M02_KEPUTUSAN_OWNER.md); status disinkronkan di M12/plans/AI_MASTER; approval per batch tetap wajib |
