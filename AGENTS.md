# KOST48 Surabaya V5 — Aturan Kanonik Agent

Dikonsolidasikan 20 September 2026. Bahasa kerja dan dokumentasi: Indonesia.
Baca aturan yang relevan sebelum bertindak; jangan memuat ulang dokumen yang sudah ada dalam konteks.

## 1. Otoritas

- Hierarki dokumen proyek: **User prompt > M12 > AGENTS.md > file pointer lain > AI_MASTER.md (dashboard)**.
- AGENTS.md adalah satu-satunya sumber aturan operasional kanonik untuk agent.
- [M12](docs/M12_CHECKLIST_CHANGELOG.md) tetap menjadi otoritas antrean, urutan, dan gate tugas di atas AGENTS.
- [M02](docs/M02_KEPUTUSAN_OWNER.md) menyimpan keputusan bisnis/arah owner; jangan menggantinya dengan asumsi agent.
- CLAUDE.md, .clinerules, dan panduan agent-specific diarahkan menjadi pointer; konsolidasinya berlangsung bertahap.
- [AI_QUICKREF.md](AI_QUICKREF.md) adalah cheatsheet turunan; [GUIDE](AI_WORKFLOW_GUIDE.md) adalah bahan penjelasan selama transisi.
- [AI_MASTER.md](AI_MASTER.md) mencatat status governance, exception, dan keputusan; bukan sumber aturan atau pengganti M12/M13.
- Jika ada konflik, sebutkan aturan yang berbenturan dan dampaknya; jangan mengubah gate atau memperluas izin sepihak.
- Gunakan persetujuan yang sudah mencakup tindakan; tidak ada jawaban bukan persetujuan.

## 2. Arah proyek

- Prioritas **Fase EF**: target satu proses API NestJS dengan modul internal; frontend React/Vite tetap, tanpa rewrite domain.
- **Fase MA — Batas Modul & Kesiapan Ekstraksi ditunda**; jangan membuat apps/libs, app Nest baru, atau worker.
- Nama lama V5.7/V5.8/V5.9 arsitektur bukan nomor versi aplikasi.
- Status berikut berasal dari catatan 13 September 2026; bukan pengukuran runtime baru.
- EF-01/03/05 tersedia lokal; audit statis EF-01/03/04/07 selesai. Jangan ulang tanpa perubahan relevan.
- Identitas deployment terisi sebagian di M20 §2; dampak PMEM penuh belum terukur.
- Passenger teramati satu proses saat idle; dua proses sempat bersamaan setelah restart (M20 §10).
- Sisa EF-00/EF-02 membutuhkan izin baca server; pilih pekerjaan aktif melalui M12.
- Produksi LIVE 13 September 2026, kost48surabaya.com; live tidak berarti seluruh gate/sign-off selesai.
- Sisa Fase A: onboarding owner, hunian/KTP, opening balance, cron, serta rotasi secret/PIN.
- Gate AO masih terbuka; jangan klaim siap produksi dari status historis fase B–AM.

## 3. Navigasi dokumen

| Rujukan | Fungsi; baca bagian yang relevan |
|---|---|
| [M12](docs/M12_CHECKLIST_CHANGELOG.md) | Satu checklist aktif, antrean, urutan, dan gate |
| [M02](docs/M02_KEPUTUSAN_OWNER.md) | Keputusan bisnis dan arah owner |
| [M00](docs/M00_CODEMAP.md), [audit-map](docs/audit-map/) | Navigasi modul/file/simbol sebelum mencari source |
| [M01](docs/M01_MASTER.md) | Orientasi proyek |
| [M19](docs/M19_EFISIENSI_HOSTING_512MB.md) | Spesifikasi EF, bukti lokal, dan tabel pengukuran hosting |
| [M20](docs/M20_PRODUKSI_KOST48.md) | Produksi dan operasional harian server |
| [M08](docs/M08_DEPLOY_GO_LIVE.md) | Runbook deployment |
| [M13](docs/M13_CHANGELOG.md) | Riwayat bertanggal; bukan perintah mengulang pekerjaan |

- Dokumen aktif: seri M00–M20 dan [formulir go-live kanonik](docs/FORM_ISI_DATA_GO_LIVE.md).
- M03 flow; M04 keuangan; M05 huni; M06 operasional; M07 publik; M09 AI; M10 scope; M11 default.
- M14 UI/UX; M15 IoT; M16 audit; M17 portal; M18 harga. Pilih sesuai domain task.
- Form lama berada di docs/archieve/2026-09-07_docs_cleanup/; jangan dibuat ulang sebagai formulir aktif.
- Gunakan peta/audit yang sudah ada; jangan menganggap inventaris atau audit lama sebagai bukti PASS untuk diff baru.
- Statistik model/test dan memory dapat usang; utamakan source relevan dan hasil bertanggal.

## 4. Scope/izin

- Terapkan **Smallest Safe Change**: satu tujuan, acceptance jelas, diff terkecil yang menyelesaikan penyebab.
- Tetapkan scope implementasi, test, dan dokumentasi sebelum edit; cleanup/refactor sampingan masuk backlog.
- Pertahankan kontrak publik; nilai dampak pada konsumen langsung sebelum mengubah perilaku.
- Izin edit docs mencakup dokumen yang disetujui, bukan otomatis kode, server, atau DB.
- Instruksi owner yang mempersempit scope file mengungguli kewajiban dokumentasi umum; catat penundaan.
- Jaga seluruh perubahan lama termasuk untracked; dirty tree tidak mewajibkan commit WIP.
- Jangan reset, stash, atau memindahkan perubahan tanpa izin.
- Commit hanya jika diminta; satu task = satu commit terarah bila diizinkan. Jangan push/deploy tanpa izin.
- Jangan tambah dependency, mutasi DB produksi, atau menampilkan secret.
- Izin command verifikasi harus mencakup prasyarat dan efek sampingnya; nama script tidak membuktikan keamanan/biaya.
- DB UAT tercatat pada port 5433, kost48_v3_pro; identitas DB produksi melalui M19, bukan asumsi nama/port.
- Jika informasi nonkritis belum tersedia, nyatakan asumsi; tanyakan hanya keputusan yang menghambat atau memperluas izin.

## 5. Klasifikasi XS–XL

Pilih level berdasarkan risiko dan jangkauan perilaku, bukan jumlah baris saja.
Batas baca mencakup file unik per tahap; anggaran token indikatif bukan jaminan kuota layanan.

| Level | Contoh/cakupan | Maks. file | Test | Build | Token indikatif |
|---|---|---:|---|---|---|
| XS | Typo/copy/style lokal tanpa logika | 5 | Tidak | Tidak | 1–3 ribu |
| S | Satu fungsi, satu file implementasi | 8 | File terkait saja | Tidak full build | 3–7 ribu |
| M | Beberapa file, satu modul | 12 | Modul terkait saja | Default tidak; target terisolasi bila perlu dan diizinkan | 7–15 ribu |
| L | Lintas modul/kontrak bersama | 18 | Modul terdampak + kontrak | Entry/package terkait bila perlu dan diizinkan | 15–30 ribu |
| XL | Arsitektur/schema/runtime besar | 20 per tahap | Bertahap sesuai risiko | Sesuai tahap yang disetujui | 10–25 ribu/tahap |

- XS: pastikan kondisi, event, permission, query, dan nilai bisnis tidak berubah; setelah izin, langsung edit.
- Style global, tombol kritis, uang, auth, atau shared contract dapat memerlukan level lebih tinggi.
- S: baca fungsi, pemanggil/kontrak, dan test relevan; file test/dokumentasi tambahan tidak otomatis menjadikannya M.
- M: tentukan daftar file implementasi/test modul; perubahan kontrak bersama memicu penilaian ulang level/izin.
- L: petakan producer → kontrak → consumer; batas entry build harus benar-benar tersedia.
- XL: rencana konkret wajib disetujui sebelum implementasi; pecah menjadi tahap dengan acceptance dan bukti sendiri.
- Label ini tidak menggantikan ID audit FE/BE atau klasifikasi K1–K4; exception uang pada §8 tetap berlaku.

## 6. Batas baca

- Read-Before-Write terbatas: baca instruksi aktif, satu peta/audit relevan, lalu target dan dependensi langsung.
- Sebelum pembacaan tambahan, nyatakan pertanyaan yang ingin dijawab; tanpa kebutuhan baru, jangan membaca ulang.
- Maksimal satu listing terarah per task; setelah path diketahui, gunakan pencarian isi pada scope tersebut.
- Dahulukan rg untuk simbol/import/error, lalu baca potongan yang menjawab pertanyaan.
- Hitung setiap file yang isinya masuk konteks, termasuk docs/config dan hasil rg; nama hasil listing tidak dihitung.
- Jangan memuat seluruh M00–M20, riwayat M12/M13, lockfile, atau semua source sebagai orientasi.
- docs/archieve/*, reference/*, backend/src/generated/*, dan seluruh node_modules tidak dibaca rutin.
- Jika batas tercapai sebelum dampak dipahami, pecah tahap atau nilai ulang level; jangan menebak agar masuk anggaran.
- Instruksi wajib tetap dibaca; jelaskan bila kebutuhan tersebut melampaui batas konteks.
- Gunakan ringkasan modul sebagai navigasi; pastikan bukti masih sesuai source/config/dependensi yang relevan.
- Memory, bila tersedia, hanya petunjuk; jangan menganggapnya lebih baru dari M12. Tanpa memory, lanjut dari dokumen lokal.
- Simpan fakta lintas sesi hanya bila tool tersedia; mulai sesi baru saat konteks panjang/topik berubah besar.
- Handoff membawa tujuan, izin, perubahan, bukti, dan langkah berikutnya; jangan mengulang pekerjaan yang sudah selesai.
- Jika token aktual tidak tersedia, gunakan proksi file/baris, output tool, command, dan retry; jangan mengarang angka kuota.

## 7. Tahapan kerja

Kontrak task memuat tujuan, scope, level, acceptance, batas baca, larangan, command yang diizinkan, dan format output.
Gunakan izin eksplisit yang sudah diberikan; jika owner menetapkan PLAN/approval, berhenti di checkpoint tersebut.

| Tahap | Tindakan | Checkpoint |
|---|---|---|
| Recon | Baca minimal; rencana maksimal 10 baris kecuali format owner berbeda | Dampak, target, command, asumsi, dan risiko jelas |
| Plan approval | Sajikan rencana konkret; gunakan persetujuan yang sudah mencakupnya | Scope/verifikasi diizinkan; XL perlu approval rencana |
| Eksekusi | Edit hanya target; pertahankan perubahan lama | Diff menjawab acceptance; temuan sampingan masuk backlog |
| Verifikasi | Pilih bukti terkecil yang memenuhi §8 | Hasil jelas atau keterbatasan dinyatakan |
| Dokumentasi | Update audit modul dan M12/M13 sesuai scope | Bukti dapat dipakai sesi berikutnya; tanpa klaim runtime palsu |

- Sebelum edit: pastikan instruksi aktif, satu acceptance, level, scope, dan anggaran sudah dipahami.
- Periksa freshness audit dan perubahan lokal; pastikan larangan task serta kebutuhan approval tercatat.
- Sebelum command: pahami cwd, script, hook pre/post, fixture, efek samping, dan kesegaran artefak.
- Tetapkan kriteria berhenti; jangan mengulang verifikasi lulus tanpa perubahan atau risiko baru yang relevan.
- Jika task bertahap mengharuskan berhenti, laporkan hasil stage dan tunggu instruksi berikutnya.
- Command macet/tanpa ringkasan bukan PASS; jangan meluncurkan runner kedua bersamaan atau menghentikan proses pengguna.

## 8. Verifikasi/exception

Confidence Gate menggunakan bukti yang dapat diperiksa, bukan persentase keyakinan subjektif.

| Gate | Pemeriksaan sebelum melanjutkan |
|---|---|
| G0 — Otorisasi | Task mengizinkan command; larangan eksplisit berlaku |
| G1 — Dampak | Acceptance, kontrak, dan konsumen yang berubah diketahui |
| G2 — Relevansi | Test membuktikan perilaku tersebut; fixture/layanan dipahami |
| G3 — Biaya | Hook pre/post, build, generate, install, dan efek samping diketahui |
| G4 — Kesegaran | Source/artefak yang diuji sesuai perubahan saat ini |
| G5 — Stop | Hasil lengkap, jumlah test terpilih > 0, acceptance terpenuhi |

- XS/docs-only: inspeksi isi, ejaan, tautan, scope, dan diff; jangan test/build/lint/typecheck atau memulai server.
- Style: inspeksi visual pada sesi yang tersedia jika diizinkan; tanpa inspeksi, tulis visual belum diverifikasi.
- S/M: test file/modul terkait saja; tambah regresi bila perlu membuktikan bug perilaku, bukan untuk typo/style reversibel.
- L: test kedua sisi kontrak; build hanya entry/package terkait yang tersedia dan diizinkan.
- Test kosong, artefak basi, atau hasil tidak lengkap tidak boleh dilaporkan PASS.
- Jika test memerlukan dist yang belum segar, nyatakan keterbatasan; jangan memakai output lama sebagai bukti source baru.
- Jalur build per modul belum terbukti tersedia; jangan mengklaim build:module ada atau fallback diam-diam ke full suite.
- Hasil lama dapat dipakai hanya bila input relevan masih sama; perubahan source/config/dependensi/fixture membatalkan bukti terkait.
- Baca lifecycle script sebelum memanggilnya: pretest:unit backend menjalankan npm run build.
- **KNOWN EXCEPTION — gate uang, opsi C (TUNDA):** ikuti M12 dan gate M04; npm run test:unit backend tetap wajib untuk task uang.
- Command tersebut memicu full build melalui pretest:unit; jangan hapus/ubah hook atau menggantinya sepihak dengan subset.
- Jika task uang melarang full test/build, catat konflik dan minta keputusan owner; jangan eksekusi diam-diam atau tutup sebagai tervalidasi penuh.
- Exception uang tidak memerintahkan test/build untuk task dokumentasi; status exception juga dicatat di AI_MASTER §2.

Referensi command berikut bukan izin eksekusi atau daftar yang wajib dijalankan setiap task; gunakan PowerShell dari cwd yang disebut.

| Cwd | Tujuan bila diperlukan dan diizinkan | Command |
|---|---|---|
| backend | Typecheck tanpa incremental cache | npx tsc --noEmit --incremental false |
| backend | Build / unit lengkap sesuai gate | npm run build / npm run test:unit |
| frontend | Build / test terpilih dengan path nyata | npm run build / npm run test -- <path-test> |
| frontend | Suite unit lengkap bila diizinkan | npx vitest run |
| backend / frontend | Dev bila task membutuhkan | npm run start:dev / npm run dev |
| root | Artefak deploy lokal bila diminta | npm run bundle:deploy:fast / npm run make-deploy:fast |

Typecheck bukan build; build bukan UAT; pembuatan artefak bukan deployment; test lokal bukan bukti dampak runtime.

## 9. Pelaporan

- Default: diff sesuai scope + tiga baris perubahan/verifikasi/batasan; format eksplisit owner mengungguli default.
- Pisahkan implementasi lokal, verifikasi lokal, deployment, dan dampak runtime.
- Sebut jenis pemeriksaan yang benar-benar dilakukan; command/cwd, exit code, dan jumlah test bila dijalankan.
- Jangan menampilkan log panjang; ambil hasil, error relevan, dan bukti yang diperlukan untuk menilai acceptance.
- Tulis tidak dijalankan beserta alasan untuk verifikasi yang dilewati; UNKNOWN untuk data yang belum diperiksa.
- Update M12 + entri M13 sesuai bukti; audit modul hanya bagian terdampak, jangan salin ulang seluruh riwayat.
- Jika owner melarang edit dokumen tersebut, catat penundaan dan alasannya; jangan mengubah file di luar scope.
- Jangan menganggap task selesai terverifikasi bila gate wajib belum dipenuhi; pisahkan implementasi selesai dari bukti yang kurang.
- Hasil audit lama, typecheck, build, deployment, dan runtime tidak boleh saling menggantikan klaim.

## 10. Perubahan governance

- Owner menetapkan perubahan kebijakan; agent menerapkan scope/stage yang telah disetujui.
- Aturan operasional dipelihara di AGENTS; M12 tetap antrean/gate, M13 tetap riwayat, AI_MASTER tetap dashboard.
- Pointer agent-specific diarahkan ke AGENTS/M12; jangan menduplikasi aturan ke setiap file.
- .clineignore tetap config ignore context; reasonix.toml tetap permission tools, bukan izin otomatis menjalankan command.
- GUIDE dilipat bertahap; QUICKREF dipertahankan sebagai ringkasan turunan, bukan otoritas baru.
- Keputusan gate uang opsi C tetap sampai owner memutuskan perubahan; tidak diubah demi menghemat token.
- Stage yang belum diizinkan tidak dijalankan; ikuti checkpoint review/OK/LANJUT yang ditetapkan owner.
- Catat perubahan governance dan status penerapannya hanya pada dokumen yang diizinkan; jika dibatasi, laporkan penundaan.
- Konsolidasi ini tidak mengizinkan implementasi tooling, dependency, perubahan source, DB, atau deployment di luar task.
