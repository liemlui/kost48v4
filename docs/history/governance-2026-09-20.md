# Riwayat konsolidasi governance 20 September 2026

Snapshot dashboard dan GUIDE sebelum penataan 22 September 2026; termasuk koreksi 22 Sep yang sudah ada. Status pending/roadmap di bawah bersifat historis, bukan antrean atau izin aktif. Aturan kini: [AGENTS](../../AGENTS.md); antrean: [M12](../M12_CHECKLIST_CHANGELOG.md); dashboard: [AI_MASTER](../../AI_MASTER.md).

Isi sumber dipertahankan; hanya tautan relatif disesuaikan untuk lokasi riwayat ini.

## Snapshot AI_MASTER.md

# AI Master — KOST48

Dashboard monitoring governance; bukan sumber aturan baru dan tidak menggantikan M12/M13.
Status disinkronkan 22 September 2026. **Konsolidasi lama Stage 1–5 selesai** menurut M13 20 Sep; wrapper tersedia dan audit frontend-auth sudah dibuat sebagian.
Task saat ini: DOC-GOV-20260922, perbaikan dokumentasi terbatas dan [rancangan penataan total](../../docs/plans/DOC-GOV-20260922.md). Migrasi XL menunggu persetujuan rancangan. Izin Stage 1 lama adalah riwayat, bukan pembatasan task baru.

## 1. Peta File Governance

Status dibedakan antara kondisi sekarang dan peran tujuan yang disetujui owner.
Tanggal file lama tidak disimpulkan dari tanggal yang tertulis di dalam dokumennya.

| File | Fungsi | Status saat ini | Peran tujuan / sumber kebenaran | Terakhir diubah |
|---|---|---|---|---|
| [AGENTS.md](../../AGENTS.md) | Panduan agent | Canonical — Stage 2 selesai | Satu sumber aturan agent canonical; tunduk pada prompt/M12 | 2026-09-20 |
| [CLAUDE.md](../../CLAUDE.md) | Panduan sesi Claude | Pointer aktif — Stage 3 selesai | Pointer 2 baris ke AGENTS/M12 | 2026-09-20 |
| [.clinerules](../../.clinerules) | Panduan Cline | Pointer aktif — Stage 3 selesai; tetap file tunggal | Pointer 2 baris ke AGENTS/M12 | 2026-09-20 |
| [.clineignore](../../.clineignore) | Ignore context Cline | Komentar tersinkron — Stage 3 selesai; pola tetap | Config tool, bukan sumber aturan kerja | 2026-09-20 |
| [reasonix.toml](../../reasonix.toml) | Permission tools Reasonix | Selesai Stage 5 — 7 allow dihapus; tanpa deny baru | Config tool; allow generik tetap, bukan blokir menyeluruh | 2026-09-20 |
| [AI_QUICKREF.md](../../AI_QUICKREF.md) | Cheatsheet harian | Status tooling dan batas bukti diperbarui | Ringkasan turunan AGENTS; exception uang di AGENTS §8 | 2026-09-22 |
| [AI_WORKFLOW_GUIDE.md](../../AI_WORKFLOW_GUIDE.md) | Pointer + lampiran roadmap/template | Roadmap lama diberi konteks; rancangan baru ditautkan | Pointer ke AGENTS/M12; §11–12 lampiran, bukan aturan kanonik | 2026-09-22 |
| [docs/audit/README.md](../../docs/audit/README.md) | Indeks audit modul | Satu audit parsial frontend-auth tersedia; empat placeholder | Indeks turunan; audit-map sebagai peta, M12 sebagai antrean | 2026-09-22 |
| [AI_MASTER.md](../../AI_MASTER.md) | Monitoring lintas-agent | Dashboard aktif; status disinkronkan | Dashboard, bukan canonical atau pengganti M12/M13 | 2026-09-22 |
| [.github/copilot-instructions.md](../../.github/copilot-instructions.md) | Entry panduan Copilot | Pointer aktif — Stage 3 selesai | Pointer ke AGENTS/M12 dan dashboard AI_MASTER | 2026-09-20 |
| [M00](../../docs/M00_CODEMAP.md) / [audit-map](../../docs/audit-map/) | Navigasi kode dan audit | Ada; dipertahankan, tidak diubah | Peta rujukan; bukan bukti audit otomatis PASS | UNKNOWN — belum diperiksa |
| [M12](../../docs/M12_CHECKLIST_CHANGELOG.md) | Antrean dan gate tugas | Kesiapan task diperjelas; migrasi struktur menunggu approval XL | Otoritas antrean/gate di atas AGENTS | 2026-09-22 |
| [M13](../../docs/M13_CHANGELOG.md) | Riwayat bertanggal | Entri koreksi docs dan rancangan ditambahkan; entri lama tetap | Riwayat bukti, bukan antrean baru | 2026-09-22 |

## 2. Hierarki Aturan (+ KNOWN EXCEPTION gate keuangan)

Keputusan owner: **User prompt > M12 > AGENTS.md > file pointer lain > AI_MASTER.md (dashboard).**
AGENTS adalah satu-satunya aturan kanonik **untuk agent**; M12 tetap otoritas antrean/gate di atasnya.
QUICKREF adalah cheatsheet turunan; GUIDE berisi roadmap/template, bukan otoritas yang mengalahkan M12/AGENTS.
Hierarki ini mengatur dokumen proyek; config tool mengendalikan kemampuan teknis, bukan izin otomatis menjalankan setiap command.
**KNOWN EXCEPTION — gate uang, opsi C (TUNDA):** gate lama M12 tetap berlaku: full unit test backend melalui `npm run test:unit`, yang memicu full build lewat `pretest:unit`, beserta gate M04.
`pretest:unit` tidak dihapus atau diubah. Exception ini bukan perintah menjalankan test/build pada stage dokumentasi.
Jika task uang melarang full test/build, catat benturan dan minta keputusan owner; jangan melewati gate atau mengklaim verifikasi lengkap.
Drift panduan Cline lama dicatat selesai melalui pointer Stage 3 pada M13 20 Sep; tidak membuka ulang task tersebut.
Risiko permission Reasonix: allow command luas dapat melewati pembatasan sempit; dukungan deny/precedence belum diperiksa, tidak diasumsikan efektif.

## 3. Checklist Harian

Checklist monitoring turunan AGENTS; pelaksanaan kontrol teknis lintas-tool tidak dibuktikan oleh isi Markdown.

- [ ] Instruksi aktif AGENTS/M12 dipahami; QUICKREF hanya bila membantu task, tanpa pembacaan ulang konteks tersedia.
- [ ] Task punya level XS/S/M/L/XL berdasarkan risiko.
- [ ] Batas file dibaca 5/8/12/18/20 per tahap dipatuhi atau kebutuhan tambahan dijelaskan.
- [ ] Command dan efek samping sesuai scope; exception uang di §2 diperhatikan, bukan larangan full test/build universal.
- [ ] Verifikasi hanya command terdaftar yang diizinkan; docs-only cukup inspeksi.
- [ ] Diff + 3 baris ringkasan diterima, kecuali format khusus owner menggantikannya.
- [ ] Audit modul diperbarui jika modul disentuh dan scope mengizinkan.
- [ ] M12/M13 disinkronkan atau alasan pembatasan scope task saat ini dicatat.
- [ ] Implementasi, verifikasi lokal, deployment, dan dampak runtime dilaporkan terpisah.

## 4. Status Audit Modul

Referensi hasil berasal dari dokumen bertanggal; sinkronisasi 22 Sep tidak menjalankan ulang test atau audit aplikasi.
Tidak ada hitungan coverage atau klaim PASS runtime baru. Kesegaran bukti dinilai dari perubahan input relevan, bukan tanggal dashboard.

| Modul / cakupan | File audit / rujukan | Status | Tanggal audit | Freshness |
|---|---|---|---|---|
| Auth frontend | [docs/audit/frontend-auth.md](../../docs/audit/frontend-auth.md) | Diperiksa sebagian — login dengan mock | 2026-09-20 | Baseline d5d04cb; validitas terhadap diff berikutnya belum diperiksa |
| Context/sesi frontend | [M12](../../docs/M12_CHECKLIST_CHANGELOG.md) — catatan FE-057; file audit khusus: UNKNOWN — belum diperiksa | UNKNOWN — belum diperiksa | UNKNOWN — belum diperiksa | UNKNOWN — belum diperiksa |
| Auth backend | [M12](../../docs/M12_CHECKLIST_CHANGELOG.md) — catatan perbaikan terkait FE-002; file audit khusus: UNKNOWN — belum diperiksa | UNKNOWN — belum diperiksa | UNKNOWN — belum diperiksa | UNKNOWN — belum diperiksa |
| Modul lainnya | [audit-map](../../docs/audit-map/) — navigasi, bukan hasil audit | UNKNOWN — belum diperiksa | UNKNOWN — belum diperiksa | UNKNOWN — belum diperiksa |

## 5. Utang Tooling

| Usulan | Status / batas | Owner implementasi | Target |
|---|---|---|---|
| ~~`scripts/verify-module.mjs`~~ | Selesai Stage tooling 1 — 2026-09-20; manifest 1 modul (frontend-auth); mode test/build/audit | — | Selesai |
| `test:module`, `build:module`, `audit:module` | Alias tersedia. Mode build hanya melapor exit 3; mode audit memeriksa keberadaan path, bukan kesegaran/PASS audit | — | Implementasi build belum tersedia |
| Manifest `frontend-auth` | Aktif; bukti historis loginPage: 5 test, exit 0 pada 20 Sep; audit parsial tersedia, modul kedua belum ditetapkan | — | Manifest pertama tersedia |
| Jalur dependency hilang / test nol | Belum dibuktikan menurut audit frontend-auth; perlu uji terisolasi sesuai task M12 | AI setelah scope uji ditetapkan | Terbuka |
| ~~`docs/audit/README.md`~~ | Indeks tersedia dan menunjuk audit parsial frontend-auth; empat placeholder tersisa | UNKNOWN — belum diperiksa | Sinkron 2026-09-22 |
| ~~Permission Reasonix~~ | Selesai Stage 5 — 7 allow dihapus; build/test/install tetap; allow generik masih terbuka | UNKNOWN — belum diperiksa | Selesai Stage 5 — 2026-09-20 |

## 6. Roadmap 30 Hari

1. Ringkasan [GUIDE §11](../../AI_WORKFLOW_GUIDE.md#11-roadmap-migrasi-workflow-30-hari); **bukan izin implementasi**, tidak mengganti prioritas EF/onboarding M12.
2. Hari 1–7: kontrak prompt, klasifikasi 5 task, baseline biaya/command, dan pemetaan prasyarat test satu modul; exception uang tetap berlaku.
3. Hari 8–14: ringkas 3 modul sering disentuh dari bukti lama; petakan test, owner, freshness, serta prasyarat; eksekusi hanya setelah izin.
4. Hari 15–21: setelah approval tooling, wrapper tanpa dependency baru; test/audit dahulu, build hanya target tersedia; tanpa fallback full suite.
5. Hari 22–30: terapkan pada 5–10 task tambahan, bandingkan task selevel, perbaiki batas baca/handoff, laporkan hasil hari 30.
6. Ukur token aktual bila tersedia atau proksi konteks/durasi/retry/regresi; target awal konteks XS/S turun 30%, bukan klaim hasil; gate tidak dilewati.

## 7. Aturan Perubahan

Aturan perubahan mengikuti [AGENTS §10](../../AGENTS.md#10-perubahan-governance). Konsolidasi Stage 1–5 tanggal 20 Sep selesai; checkpoint per-stage pada log di bawah hanya merekam keadaan saat keputusan dibuat.
Permintaan owner 22 Sep mengizinkan perbaikan temuan dokumentasi dan penyusunan alur kerja aman. [Rancangan DOC-GOV-20260922](../../docs/plans/DOC-GOV-20260922.md) memisahkan perbaikan langsung dari migrasi XL yang memerlukan persetujuan rencana menurut AGENTS §5.
Scope sesi ini dokumentasi lokal; source aplikasi, konfigurasi permission, DB, dan deployment tidak diubah.

## 8. Log Keputusan

Log historis append-only. Status pending pada baris lama dibaca sesuai tanggal/urutannya; ringkasan kondisi saat ini ada di atas. Log tidak memberi izin baru.

| Tanggal | Keputusan owner | Alasan | Dampak / status penerapan |
|---|---|---|---|
| 2026-09-20 | Hierarki User > M12 > AGENTS > pointer > dashboard; AGENTS satu sumber aturan agent | Konsistensi lintas-agent, kurangi duplikasi | Disetujui; konsolidasi pending Stage 2–4 |
| 2026-09-20 | Gate uang opsi C — TUNDA perubahan | Pertahankan gate lama | KNOWN EXCEPTION dicatat §2; full test+build via pretest:unit tetap, tanpa eksekusi pada stage ini |
| 2026-09-20 | Drift Cline opsi A — sinkronkan melalui pointer | Hindari status M00–M19/deployment lama | Pending Stage 3; referensi mengikuti AGENTS/M12 dan seri M00–M20 |
| 2026-09-20 | Reasonix opsi C — tighten command berbahaya saja | Batasi delete/migrate/deploy/drop tanpa memperluas scope | Pending Stage 5; build/test/install dibiarkan; efektivitas permission belum diperiksa |
| 2026-09-20 | .clinerules opsi A — tetap file tunggal | Entry Cline sederhana tanpa duplikasi aturan | Pending Stage 3; isi akan menjadi pointer 2–3 baris |
| 2026-09-20 | Eksekusi Stage 1 saja: buat AI_MASTER.md | Dashboard dapat direview sebelum konsolidasi | **Stage 1 selesai; Stage 2–5 pending**; M12/M13 belum disinkronkan; menunggu review owner |
| 2026-09-20 | Stage 2 selesai — konsolidasi AGENTS.md | Satu sumber aturan agent, 10 heading, sesuai outline owner | AGENTS canonical; hanya baris AGENTS §1 dan entri ini diperbarui; Stage 3–5 pending, M12/M13 ditunda; menunggu review owner |
| 2026-09-20 | Stage 3 selesai — pointer diselaraskan dan komentar ignore diperbarui | Kurangi duplikasi panduan agent dan ganti referensi dokumen lama | CLAUDE/Cline/Copilot menjadi pointer; pola ignore tetap; Stage 4–5 pending, M12/M13 ditunda; menunggu review owner |
| 2026-09-20 | Stage 4 selesai — GUIDE diringkas, QUICKREF dirujukkan ke AGENTS, indeks audit dibuat | Pertahankan roadmap/template dan navigasi audit tanpa duplikasi aturan | Hanya empat file scope Stage 4 diubah/dibuat; ringkasan modul belum dibuat; Stage 5 pending, M12/M13 ditunda; menunggu review owner |
| 2026-09-20 | Stage 5 selesai — konsolidasi governance Stage 1–5 selesai | Hapus tepat 7 allow berbahaya tanpa deny baru; tambahkan rujukan M12 dan entri M13 | Empat file scope Stage 5 diperbarui; konten lama tetap; allow generik belum memblokir semua jalur mutasi; tanpa eksekusi aplikasi atau deployment |
| 2026-09-20 | Tooling: verify-module.mjs + 3 script root (test:module/build:module/audit:module) | Utang tooling Stage 1-5 ditutup; AI_MASTER §5 | verify-module.mjs 128 baris, 6 skenario verifikasi lulus; manifest 1 modul (frontend-auth); audit doc & module 2+ pending |
| 2026-09-20 | Audit modul pertama: frontend-auth (docs/audit/frontend-auth.md) | Gap audit doc pertama ditutup; wrapper audit:module terverifikasi melihat doc | Status "diperiksa sebagian"; 86 baris; 5 test coverage; gap login e2e/error/role lain/refresh belum diperiksa |
| 2026-09-22 | Owner meminta alur pengembangan AI yang aman, penataan total docs, dan perbaikan temuan audit dokumentasi | Kurangi status bertentangan, konteks berlebih, dan risiko perubahan | Koreksi status/indeks/petunjuk dan kesiapan task diterapkan; rancangan XL disiapkan, migrasi belum dijalankan |


## Snapshot AI_WORKFLOW_GUIDE.md

Baca [AGENTS.md](../../AGENTS.md) sebagai sumber aturan kanonik agent.
Untuk antrean dan gate tugas, ikuti [M12](../../docs/M12_CHECKLIST_CHANGELOG.md).

Penataan menyeluruh yang diminta 22 Sep 2026 memiliki [rancangan DOC-GOV-20260922](../../docs/plans/DOC-GOV-20260922.md), menunggu persetujuan XL. Roadmap di bawah adalah usulan historis 20 Sep; status pelaksanaannya dibaca dari M12/AI_MASTER, bukan dari nomor minggu.

## 11. Roadmap Migrasi Workflow (30 hari)

Roadmap adalah usulan urutan, **bukan izin implementasi**; prioritas EF/onboarding tetap mengikuti M12.

| Periode | Pekerjaan | Deliverable / checkpoint |
|---|---|---|
| Minggu 1, hari 1–7 | Kontrak prompt; klasifikasi 5 task; catat biaya/command; tinjau prasyarat test satu modul | Baseline 5 task; XS tanpa test/build; exception uang AGENTS §8 tetap |
| Minggu 2, hari 8–14 | Ringkas 3 modul sering disentuh dari bukti existing; petakan test dan prasyarat | 3 ringkasan dengan owner/freshness; contoh test FE/BE hanya setelah izin |
| Minggu 3, hari 15–21 | Setelah approval tooling, wrapper tanpa dependency baru; test/audit dahulu | Tolak ID/test kosong dan artefak basi; build hanya target tersedia; tanpa fallback full suite |
| Minggu 4, hari 22–30 | Terapkan pada 5–10 task tambahan; bandingkan task selevel; perbaiki batas baca/handoff | Laporan hari 30: median biaya, full validation, regresi, dan keputusan kebijakan |

Metrik: level, acceptance, file/baris terbaca, token aktual bila tersedia atau proksi konteks, command, durasi, retry, hasil, dan regresi.
Target awal: 100% XS tanpa test/build; 0 PASS untuk test kosong/artefak basi; 3 ringkasan dipakai ulang; median proksi konteks XS/S turun 30%.
Target bukan hasil terukur; kalibrasi setelah baseline. Jika regresi meningkat, perkuat subset relevan tanpa menurunkan gate keamanan/keuangan.

## 12. Lampiran: Template Siap Pakai

Isi placeholder dengan bukti; data yang belum tersedia ditulis UNKNOWN — belum diperiksa. Aturan tetap merujuk AGENTS/M12.

### 12.1 Template audit modul

```text
Modul/ID audit: [...]; status: [belum diperiksa/sebagian/bukti tersedia/kedaluwarsa]; tanggal: [...].
Tujuan, invariant, dan batas scope: [...].
File/simbol dan tanggung jawab: [...]; producer → kontrak → consumer: [...].
Dependensi masuk/keluar dan dampak perubahan: [...].
Owner bisnis/teknis: [nama/peran atau belum ditetapkan].
Sumber audit/peta/domain: [...]; identitas bukti: [commit + cakupan dirty tree / hash file relevan].
Acceptance/risiko → file test nyata → cwd + command → tanggal, exit, jumlah test: [...].
Prasyarat/hook, source atau dist, kesegaran artefak, kebutuhan/target build: [...].
Risiko/level, pemicu eskalasi, temuan terbuka/gap, pemicu invalidasi bukti: [...].
Delta: implementasi lokal [...]; verifikasi [...]; deployment [...]; dampak runtime [...].
```

### 12.2 Template prompt task harian

```text
Task dan acceptance: [satu tujuan; input/kondisi → hasil].
Scope edit: [implementasi/test/docs]; di luar scope: [...].
Level: [XS/S/M/L/XL]; batas baca: [5/8/12/18/20] file/tahap; anggaran: [...].
Audit relevan: [tautan/belum tersedia]; maksimal satu listing terarah.
Dilarang: [full test/build, install, refactor di luar scope, commit/push/deploy].
Verifikasi diizinkan: [cwd + command persis / inspeksi saja]; exception uang: AGENTS §8.
Persetujuan: [rencana dahulu / scope sudah diizinkan]; konflik gate/prasyarat: laporkan sebelum command tambahan.
Asumsi nonkritis: [...]; dokumentasi penutup: [audit + M12/M13 / pengecualian eksplisit].
Output: diff terbatas + 3 baris perubahan/verifikasi/risiko; pisahkan status deployment/runtime.
```

### 12.3 Template laporan perubahan

```text
Perubahan: [hasil, path, level]; acceptance [terpenuhi/parsial].
Verifikasi: [cwd + command, exit, jumlah test / inspeksi / tidak dijalankan + alasan].
Risiko/batasan: [...]; deployment [status]; runtime [belum diukur/bukti].
```

### 12.4 Template handoff sesi

```text
Tujuan/level dan izin yang sudah ada: [...].
Larangan dan batas scope: [...].
File berubah serta perubahan lama yang harus dijaga: [...].
Audit/peta relevan: [...]; invariant/kontrak: [...].
Keputusan dan asumsi: [...].
Bukti terakhir + tanggal + identitas source/config: [...].
Command belum selesai/gagal dan gap verifikasi: [...].
Temuan di luar scope serta langkah berikutnya: [...].
Jangan ulang: [audit/test yang masih sah].
```
