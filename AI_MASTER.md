# AI Master — KOST48

Dashboard monitoring governance; bukan sumber aturan baru dan tidak menggantikan M12/M13.
Tanggal pencatatan: 20 September 2026. **Stage 1 selesai; Stage 2–5 pending.**
Otorisasi eksekusi saat ini: hanya membuat file ini; berhenti untuk review owner sebelum Stage 2.

## 1. Peta File Governance

Status dibedakan antara kondisi sekarang dan peran tujuan yang disetujui owner.
Tanggal file lama tidak disimpulkan dari tanggal yang tertulis di dalam dokumennya.

| File | Fungsi | Status saat ini | Peran tujuan / sumber kebenaran | Terakhir diubah |
|---|---|---|---|---|
| [AGENTS.md](AGENTS.md) | Panduan agent | Canonical — Stage 2 selesai | Satu sumber aturan agent canonical; tunduk pada prompt/M12 | 2026-09-20 |
| [CLAUDE.md](CLAUDE.md) | Panduan sesi Claude | Pointer aktif — Stage 3 selesai | Pointer 2 baris ke AGENTS/M12 | 2026-09-20 |
| [.clinerules](.clinerules) | Panduan Cline | Pointer aktif — Stage 3 selesai; tetap file tunggal | Pointer 2 baris ke AGENTS/M12 | 2026-09-20 |
| [.clineignore](.clineignore) | Ignore context Cline | Komentar tersinkron — Stage 3 selesai; pola tetap | Config tool, bukan sumber aturan kerja | 2026-09-20 |
| [reasonix.toml](reasonix.toml) | Permission tools Reasonix | Selesai Stage 5 — 7 allow dihapus; tanpa deny baru | Config tool; allow generik tetap, bukan blokir menyeluruh | 2026-09-20 |
| [AI_QUICKREF.md](AI_QUICKREF.md) | Cheatsheet harian | Active cheatsheet — Stage 4 selesai; rujukan diperbarui | Ringkasan turunan AGENTS; exception uang di AGENTS §8 | 2026-09-20 |
| [AI_WORKFLOW_GUIDE.md](AI_WORKFLOW_GUIDE.md) | Pointer + lampiran roadmap/template | Stage 4 selesai | Pointer ke AGENTS/M12; §11–12 lampiran, bukan aturan kanonik | 2026-09-20 |
| [docs/audit/README.md](docs/audit/README.md) | Indeks placeholder audit modul | Aktif — Stage 4 selesai; ringkasan modul belum dibuat | Indeks turunan; audit-map sebagai peta, M12 sebagai antrean | 2026-09-20 |
| [AI_MASTER.md](AI_MASTER.md) | Monitoring lintas-agent | Dashboard aktif — Stage 1 | Dashboard, bukan canonical atau pengganti M12/M13 | 2026-09-20 — dibuat Stage 1 |
| [.github/copilot-instructions.md](.github/copilot-instructions.md) | Entry panduan Copilot | Pointer aktif — Stage 3 selesai | Pointer ke AGENTS/M12 dan dashboard AI_MASTER | 2026-09-20 |
| [M00](docs/M00_CODEMAP.md) / [audit-map](docs/audit-map/) | Navigasi kode dan audit | Ada; dipertahankan, tidak diubah | Peta rujukan; bukan bukti audit otomatis PASS | UNKNOWN — belum diperiksa |
| [M12](docs/M12_CHECKLIST_CHANGELOG.md) | Antrean dan gate tugas | Selesai Stage 5 — paragraf governance 2 baris ditambahkan | Otoritas antrean/gate di atas AGENTS | 2026-09-20 |
| [M13](docs/M13_CHANGELOG.md) | Riwayat bertanggal | Selesai Stage 5 — entri konsolidasi ditambahkan; entri lama tetap | Riwayat bukti, bukan antrean baru | 2026-09-20 |

## 2. Hierarki Aturan (+ KNOWN EXCEPTION gate keuangan)

Keputusan owner: **User prompt > M12 > AGENTS.md > file pointer lain > AI_MASTER.md (dashboard).**
AGENTS menjadi satu-satunya aturan kanonik **untuk agent** setelah Stage 2; M12 tetap otoritas antrean/gate di atasnya.
QUICKREF adalah cheatsheet turunan; GUIDE masih usulan hingga konsolidasi, bukan otoritas yang mengalahkan M12/AGENTS.
Hierarki ini mengatur dokumen proyek; config tool mengendalikan kemampuan teknis, bukan izin otomatis menjalankan setiap command.
**KNOWN EXCEPTION — gate uang, opsi C (TUNDA):** gate lama M12 tetap berlaku: full unit test backend melalui `npm run test:unit`, yang memicu full build lewat `pretest:unit`, beserta gate M04.
`pretest:unit` tidak dihapus atau diubah. Exception ini bukan perintah menjalankan test/build pada stage dokumentasi.
Jika task uang melarang full test/build, catat benturan dan minta keputusan owner; jangan melewati gate atau mengklaim verifikasi lengkap.
Drift yang belum diterapkan perbaikannya: Cline masih M00–M19/deployment UNKNOWN, sementara CLAUDE/AGENTS merujuk M00–M20/LIVE; diselesaikan lewat pointer Stage 3.
Risiko permission Reasonix: allow command luas dapat melewati pembatasan sempit; dukungan deny/precedence belum diperiksa, tidak diasumsikan efektif.

## 3. Checklist Harian

Checklist monitoring target; tidak mengklaim semua aturan sudah dikonsolidasikan atau otomatis berlaku di semua tool.

- [ ] Sesi dimulai: AI_QUICKREF dibaca bila belum tersedia, bukan GUIDE penuh; instruksi aktif AGENTS/M12 tetap dipahami.
- [ ] Task punya level XS/S/M/L/XL berdasarkan risiko.
- [ ] Batas file dibaca 5/8/12/18/20 per tahap dipatuhi atau kebutuhan tambahan dijelaskan.
- [ ] Larangan full test/build tercatat di prompt; exception uang di §2 diperhatikan.
- [ ] Verifikasi hanya command terdaftar yang diizinkan; docs-only cukup inspeksi.
- [ ] Diff + 3 baris ringkasan diterima, kecuali format khusus owner menggantikannya.
- [ ] Audit modul diperbarui jika modul disentuh dan scope mengizinkan.
- [ ] M12/M13 disinkronkan atau penundaan dicatat; Stage 1 menunda karena izin satu file saja.
- [ ] Implementasi, verifikasi lokal, deployment, dan dampak runtime dilaporkan terpisah.

## 4. Status Audit Modul

Referensi hasil berasal dari konteks/recon sebelumnya; source dan audit modul tidak diperiksa ulang pada Stage 1.
Tidak ada hitungan coverage atau klaim PASS baru; `docs/audit/` belum dibuat pada stage ini.

| Modul / cakupan | File audit / rujukan | Status | Tanggal audit | Freshness |
|---|---|---|---|---|
| Auth frontend | [M12](docs/M12_CHECKLIST_CHANGELOG.md) — catatan FE-002; file audit khusus: UNKNOWN — belum diperiksa | UNKNOWN — belum diperiksa | UNKNOWN — belum diperiksa | UNKNOWN — belum diperiksa |
| Context/sesi frontend | [M12](docs/M12_CHECKLIST_CHANGELOG.md) — catatan FE-057; file audit khusus: UNKNOWN — belum diperiksa | UNKNOWN — belum diperiksa | UNKNOWN — belum diperiksa | UNKNOWN — belum diperiksa |
| Auth backend | [M12](docs/M12_CHECKLIST_CHANGELOG.md) — catatan perbaikan terkait FE-002; file audit khusus: UNKNOWN — belum diperiksa | UNKNOWN — belum diperiksa | UNKNOWN — belum diperiksa | UNKNOWN — belum diperiksa |
| Modul lainnya | [audit-map](docs/audit-map/) — navigasi, bukan hasil audit | UNKNOWN — belum diperiksa | UNKNOWN — belum diperiksa | UNKNOWN — belum diperiksa |

## 5. Utang Tooling

| Usulan | Status / batas | Owner implementasi | Target |
|---|---|---|---|
| `scripts/verify-module.mjs` | Belum dibuat pada recon; rencana terdahulu belum dieksekusi; di luar Stage 1–5 governance | UNKNOWN — belum diperiksa | UNKNOWN — belum diperiksa |
| `test:module`, `build:module`, `audit:module` | Masih usulan; package.json tidak diubah dalam stage ini | UNKNOWN — belum diperiksa | UNKNOWN — belum diperiksa |
| Manifest `frontend-auth` | Rencana satu test existing; hasil eksekusi wrapper belum tersedia | UNKNOWN — belum diperiksa | UNKNOWN — belum diperiksa |
| ~~`docs/audit/README.md`~~ | Selesai Stage 4 — indeks dibuat; lima placeholder belum dibuat, tidak menggandakan audit-map | UNKNOWN — belum diperiksa | Selesai Stage 4 — 2026-09-20 |
| ~~Permission Reasonix~~ | Selesai Stage 5 — 7 allow dihapus; build/test/install tetap; allow generik masih terbuka | UNKNOWN — belum diperiksa | Selesai Stage 5 — 2026-09-20 |

## 6. Roadmap 30 Hari

1. Ringkasan [GUIDE §11](AI_WORKFLOW_GUIDE.md#11-roadmap-migrasi-workflow-30-hari); **bukan izin implementasi**, tidak mengganti prioritas EF/onboarding M12.
2. Hari 1–7: kontrak prompt, klasifikasi 5 task, baseline biaya/command, dan pemetaan prasyarat test satu modul; exception uang tetap berlaku.
3. Hari 8–14: ringkas 3 modul sering disentuh dari bukti lama; petakan test, owner, freshness, serta prasyarat; eksekusi hanya setelah izin.
4. Hari 15–21: setelah approval tooling, wrapper tanpa dependency baru; test/audit dahulu, build hanya target tersedia; tanpa fallback full suite.
5. Hari 22–30: terapkan pada 5–10 task tambahan, bandingkan task selevel, perbaiki batas baca/handoff, laporkan hasil hari 30.
6. Ukur token aktual bila tersedia atau proksi konteks/durasi/retry/regresi; target awal konteks XS/S turun 30%, bukan klaim hasil; gate tidak dilewati.

## 7. Aturan Perubahan

Bagian ini mencatat keputusan proses owner dan menautkan [AGENTS](AGENTS.md); bukan aturan kanonik tambahan.
Owner menetapkan keputusan; agent menerapkan hanya stage yang diizinkan, mempertahankan perubahan lama, dan melaporkan bukti inspeksi.
Persetujuan rencana tidak otomatis mengizinkan seluruh eksekusi: Stage 1 hanya file ini; setelah selesai berhenti untuk review sebelum Stage 2.
Urutan disetujui: Stage 2 AGENTS; Stage 3 pointer CLAUDE/Cline/Copilot + komentar ignore; Stage 4 GUIDE/QUICKREF + indeks audit; Stage 5 Reasonix + M12/M13.
Setelah tiap stage, laporkan file/alasan/inspeksi dan tunggu LANJUT; pembaruan status dashboard hanya dalam scope stage yang diizinkan.
Stage 1 tidak mengubah docs, config agent, source, package/lockfile, hook, atau DB; tanpa build/test/lint/typecheck/install/server/commit/push.
Sinkronisasi M12/M13 ditunda ke Stage 5 sesuai rencana dan pembatasan owner; tidak dianggap sudah selesai.

## 8. Log Keputusan

Tanggal berikut adalah tanggal pencatatan keputusan sesi ini, bukan hasil inspeksi waktu perubahan file lama.

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
