> **ARSIP — dibekukan 2026-10-22 (batch D9 DOCS-GEN2).** Kontrak program DOCS-GEN2 (D0–D9) **selesai**; berkas dipindah dari `docs/kerja/` ke sini setelah `W-DOC-001` ditutup di [ANTREAN](../ANTREAN.md). Angka di dalamnya adalah potret saat batch berjalan, **bukan** status terkini. Ledger konservasi: SHA-256 `32b2cc3b…b512`, 34.057 byte, 350 baris (sebelum banner); transformasi yang dicatat = banner ini + penutupan status D6–D9/checklist. Aturan yang lahir dari batch ini tetap hidup di [default-dev §13](../operations/default-dev.md#d4b-register) dan gate **v3.0**.

# TASK — DOCS-GEN2: tata ulang dokumen generasi kedua

> **Blok baca** · Jenis: **dokumen kerja program** (bukan antrean) · Status: **aktif sejak 2026-10-21** · Untuk siapa: agen pelaksana batch D0–D9
> · Baca kalau: memulai batch berikutnya, menilai acceptance, atau mencari jebakan program ini. · **Jangan** dibaca kalau: mencari status satu tugas (itu [ANTREAN](../ANTREAN.md)) atau aturan kerja (itu [KONTRAK](../KONTRAK.md)).

> Status pekerjaan tetap di [ANTREAN](../ANTREAN.md) baris `DOCS-GEN2`. Berkas ini memuat kontrak per batch, acceptance, dan jebakan — **bukan antrean kedua**.

## 1. Goal & definisi selesai

**Goal.** Menurunkan biaya baca sesi baru dan menghapus ambiguitas nama/aturan, tanpa menulis ulang aturan bisnis.

**Selesai bila seluruh butir ini benar:**

1. Dokumen aktif **≤30 berkas** dan **≤400 KB** (potret akhir, diukur `node scripts/inventaris-docs.mjs`).
2. **Satu desain**: Normal adalah satu-satunya shell; `/cepat` dinyatakan deprecated dan tiga elemennya (antrean keputusan, metrik ringkas, aksi satu klik) dipindah ke kokpit OWNER. Pemindahan kode adalah task terpisah.
3. **Checklist per tugas** hidup di dokumen tugas; ANTREAN satu baris per tugas; gate mengikat keduanya (Q2=b).
4. Gate v3 (**R13–R16**; R12 sudah dipakai batch D5, tidak dinomori ulang) terpasang dan **terbukti bisa gagal** lewat self-test.
5. **0 aturan normatif tanpa detektor** — aturan yang tidak bisa diperiksa turun menjadi panduan.
6. **0 emoji tier-0**, **0 mojibake tak bertanda**.

## 2. Keputusan yang mengikat (20 Okt 2026)

| Kode | Isi | Konsekuensi yang sudah diterima |
|---|---|---|
| Q1 = a | Satu desain: Normal | Membalik pilihan "dua mode" 25 Sep; `/cepat` dipensiunkan |
| Q2 = b | Checklist di dokumen tugas | KONTRAK/ANTREAN/gate disesuaikan di D5; sampai itu aturan lama mengikat |
| Q3 = a | Target ≤30 berkas/≤400 KB | Konsolidasi agresif; detail dipindah, bukan dipangkas |

Rujukan: [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) entri `DOCS-GEN2`; baseline: [inventaris 2026-10-20](../arsip/inventaris-docs-2026-10-20.md).

## 3. Status batch (potret 2026-10-21)

| Batch | Isi | Status | Bukti |
|---|---|---|---|
| D0 | baseline + alat ukur + kartu audit | **selesai** | `scripts/inventaris-docs.mjs`; [kartu baseline](../arsip/inventaris-docs-2026-10-20.md) |
| D1 | konstitusi ID + registry + emoji tier-0 | **selesai** | [id-registry](../id-registry.md); emoji tier-0 0; gate 1 pelanggaran R5 (pra-eksisting) |
| D2 | peta peran + satu desain | **selesai** | [peran](../product/peran.md) — 79 rute, 0 TIDAK TERPETAKAN; bukti gate di [changelog 2026-10-21](../history/changelog/2026-10.md) |
| D3 | registry fitur `FEAT-` | **selesai** | [FITUR](../FITUR.md) — 58 fitur, 79/79 rute; checker `scripts/check-fitur.mjs` |
| D4 | konsolidasi 89 → 33 berkas (target ≤30 belum tercapai) | **D4a–D4e selesai 21 Okt; gap 6 berkas dilaporkan** | ledger [D4a](../arsip/D4a-ledger-konservasi.md) · [D4b](../arsip/D4b-ledger-konservasi.md) · [D4c](../arsip/D4c-ledger-konservasi.md) · [D4d](../arsip/D4d-ledger-konservasi.md); 33/769,3 KB |
| D5 | ANTREAN ≤16 KB + checklist di dokumen tugas + migrasi ID | **selesai 21 Okt** | ANTREAN 14.081 B; R12; `id-registry` §5a |
| D6 | register aturan (tanpa detektor → panduan) | **selesai 22 Okt** | [default-dev §13](../operations/default-dev.md#d4b-register) · KONTRAK §11 → §11a |
| D7 | anggaran baca + aturan DeepSeek | **selesai 22 Okt** | [default-dev §12a](../operations/default-dev.md#d4b-baca) · `ukur-jalur-baca.mjs --baca` |
| D8 | gate v3 R12–R16 + self-test | **selesai 22 Okt** | gate **v3.0** R13–R16 · selftest 21/21 · `scripts/docs-tier.baseline.json` |
| D9 | tutup: ukur sebelum/sesudah, arsipkan rencana | **selesai 22 Okt** | berkas ini diarsipkan; `W-DOC-001` ditutup |

## Rencana D4 per folder (potret 2026-10-21)

D4 adalah **XL**: rencana per folder ditulis lebih dulu, lalu tiap sub-batch dieksekusi dan **berhenti di checkpoint**. Angka "sekarang" = potret 2026-10-21 dari `node scripts/inventaris-docs.mjs` (89 berkas / 1.395,1 KB). Target owner Q3=a: **≤30 berkas / ≤400 KB**.

| Sub | Folder | Sekarang | Target | Cara |
|---|---|---:|---:|---|
| D4a | audit + history | 17 / 200,3 · 8 / 212,4 | 3 / 22,6 · 3 / 47,1 | arsipkan kartu bertanggal; pertahankan indeks, `index-cakupan` (R7), `batas-kejujuran`, changelog bulan berjalan, dan **status kerja terbuka** |
| D4b | operations | 12 / 251,7 | 4 | gabung runbook deploy/produksi, IoT, data-master; log/deploy historis ke arsip |
| D4c | domain | 10 / 236,8 | 4–5 | gabung keuangan+harga, hunian+operasional, publik+flow+kontrak, ai+iot; peta kode/narasi historis ke arsip; aturan/invarian tetap |
| D4d | product · kerja · rencana | 7 / 98,4 · 20 / 200,6 · 6 / 75,1 | 3 · 3 · 1 | product digabung; task selesai diarsipkan (sisakan TASK-DOCS-GEN2, TANYA-OWNER, SERAH-TERIMA); rencana jadi satu |
| D4e | root docs + final | 9 / 119,7 | 9 | KONTRAK/ANTREAN/PETA/KEPUTUSAN/ATURAN/AUDIT/OPERASI/id-registry/FITUR; ukur ulang seluruh korpus |

**Keputusan D4a (dieksekusi pada putaran ini).** Arsipkan **14 kartu audit** + **5 berkas history** ke `docs/arsip/` (datar, sehingga kedalaman tautan relatif tidak berubah), beri banner, dan catat ledger SHA-256. Yang **tetap aktif**: `docs/audit/README.md`, `docs/audit/index-cakupan.md` (wajib R7), `docs/audit/status-ao-lintas-portal.md` (**27 gate terbuka — bukan kartu bertanggal, tidak boleh diarsipkan**), `docs/history/README.md`, `docs/history/batas-kejujuran.md`, dan `docs/history/changelog/2026-10.md` (bulan berjalan; tidak ada entri bulan lain untuk dirotasi).

**Aturan eksekusi:** pindahkan (jangan hapus) · banner di baris atas · nama berkas tidak diganti · angka di arsip tidak diperbarui · pekerjaan terbuka dipindah ke ANTREAN/TASK pada putaran yang sama · perbarui seluruh tautan masuk · gate `check-docs` + `inventaris-docs` + `check-fitur` setelah tiap sub-batch · jangan commit. **D4b–D4e menunggu persetujuan owner di checkpoint D4a** karena memindahkan aturan normatif mengubah akses.

## Goal & todos D4a

| Langkah | Status |
|---|---|
| Rencana D4 per folder ditulis sebelum pemindahan | selesai |
| 19 berkas dipindah + banner + nama tidak diganti | selesai |
| Ledger konservasi SHA-256 / byte / baris non-kosong | selesai |
| Indeks `audit/README`, `history/README`, `arsip/README` + 118 tautan masuk | selesai |
| Gate `check-docs` + `inventaris-docs` + `check-fitur` | selesai (1 R5 ANTREAN pra-eksisting) |
| Entri changelog 2026-10 + laporan 5 baris | selesai |
| Keputusan owner 1a/2a/3a/4b/5c dicatat di register | selesai |
| 13 tautan arsip beku diperbaiki + addendum hash | selesai |
| Rencana D4b rinci (12 berkas operations → 4) | selesai — menunggu approval |
| D4b eksekusi · D4c domain · D4d product/kerja/rencana · D4e root + final | selesai — D4b 4, D4c 5, D4d product 3/kerja 5/rencana 1, D4e final |
| Target Q3=a ≤30 berkas | **belum tercapai**: 33 berkas; 3 berkas terakhir butuh keputusan owner karena menyangkut pekerjaan terbuka/berkas wajib |

## Goal & todos D5

| Langkah | Status |
|---|---|
| Rencana D5 disetujui owner (a) | selesai |
| ANTREAN ≤16.384 byte | selesai — **14.081 byte** |
| §2 prioritas + backlog pindah ke TASK-AKTIF | selesai |
| 36 baris tugas memakai `W-` + alias | selesai — `id-registry` §5a |
| R3 diperbarui + R12 baru + self-test | selesai — selftest 15/15 |
| Gate `check-docs` | **BERSIH 0** (R5 ANTREAN 0, R12 0) |
| D6–D9 | belum — menunggu keputusan owner |

## D5 — rencana dan hasil (potret 2026-10-21)

> **Status:** disetujui owner **(a)** dan **dieksekusi 21 Okt 2026**. Hasil: ANTREAN **14.081 byte**, 36 baris `W-`, R12 aktif, gate **BERSIH 0**. Rencana di bawah dipertahankan sebagai kontrak batch.

**Keputusan owner:** **1a** plan-first · **2a** checklist di dokumen tugas yang sudah ada · **3a** migrasi hanya ID aktif/terbuka. KONTRAK/ANTREAN/gate/`check-docs` **sudah** disesuaikan dalam batch ini.

**Baseline terukur.** `docs/ANTREAN.md` **19.547 byte** (batas 16.384; lebih 3.163 B). Rincian: kepala + §1 = 2.072 B · §2 prioritas = 3.774 B · §3 task/gate = 11.218 B · backlog = 2.009 B. Tugas terbuka **35**, selesai 7. Gate saat ini 1 pelanggaran R5 (ANTREAN).

**Target D5.** ANTREAN **≤16.384 B**; checklist tiap tugas yang punya dokumen tugas terikat ke ANTREAN; **35 ID terbuka** bermigrasi ke `W-`; gate **R12** (ikatan antrean↔checklist) terpasang dan self-test bisa gagal; **0 pelanggaran baru**.

### Langkah yang akan dieksekusi (setelah disetujui)

1. **Pindahkan §2 + backlog ke `TASK-AKTIF.md`** sebagai bagian “Prioritas & penanggung jawab” dan “Backlog di luar antrean”. Keduanya **tetap aktif** (bukan arsip), hanya berpindah rumah; ANTREAN menyisakan pointer 2–3 baris. Perkiraan ANTREAN: **±14,2 KB** (headroom ±2,2 KB).
2. **Reformat §3** menjadi satu baris per tugas: `- [ ] W-<AREA>-NNN — <judul> | pemilik: … | checklist: <path>#<anchor>`. Gate rinci yang panjang dipindah ke `## Checklist` dokumen tugas; tugas tanpa dokumen tetap memakai satu baris `Gate:` ringkas.
3. **Checklist di dokumen tugas.** Tambah `## Checklist` + penanda `<!-- checklist-otoritatif -->` di `TASK-AKTIF.md` (4 tugas) dan `TASK-DOCS-GEN2.md`. Format butir: `- [ ] W-… — langkah | gate: …`. Tugas tanpa dokumen **tidak** dibuatkan dokumen baru (akan melanggar target berkas); gate-nya tetap satu baris di ANTREAN.
4. **Migrasi ID aktif.** Tabel lengkap 35 baris ditulis di `id-registry` §5 sebelum edit: `W-OPS-NNN` (operasional/deploy), `W-OWN-NNN` (owner), `W-ADM-NNN` (admin), `W-STF-NNN` (staf), `W-TNT-NNN` (penghuni), `W-FIN-NNN` (uang), `W-DATA-NNN` (data). ID lama menjadi alias di §4; arsip/historis tidak disentuh. Nomor tidak didaur ulang.
5. **Ubah aturan + gate dalam batch yang sama.** KONTRAK §7: R3 mengizinkan kotak **hanya** di ANTREAN dan di dalam `## Checklist` bertanda `<!-- checklist-otoritatif -->`; tambah **R12** “setiap baris ANTREAN yang menunjuk checklist harus punya anchor yang ada, dan setiap checklist aktif harus dirujuk satu baris ANTREAN”. AGENTS §9: R1–R12. `scripts/check-docs.mjs`: R3 diperbarui + R12 baru; `check-docs.selftest.mjs` ditambah mutasi (checklist hilang, anchor salah, baris ANTREAN ganda).
6. **Verifikasi.** `check-docs` (target R5 = 0, R12 = 0, 0 baru) · `inventaris` (33 berkas; ukuran ANTREAN) · `check-fitur` · `check-docs.selftest` (wajib lulus, termasuk kasus gagal) · `rg` memastikan tidak ada ID lama tersisa di ANTREAN/task doc aktif.

### Acceptance

- ANTREAN **≤16.384 byte**, R5 ANTREAN **0**.
- 35 tugas terbuka punya ID `W-` tunggal; alias lama terdokumentasi; 0 rujukan ID lama di ANTREAN/task doc aktif.
- Setiap tugas yang punya dokumen tugas punya anchor `## Checklist`; R12 = 0.
- `check-docs.selftest` lulus dan terbukti bisa gagal pada 3 mutasi baru.
- `docs/FITUR.md` + `docs/product/peran.md` tetap valid; 0 pekerjaan terbuka diarsipkan; tidak ada kode aplikasi/commit.

### Risiko yang harus dijaga

- **R3 dilonggarkan** → wajib penanda `<!-- checklist-otoritatif -->`; tanpa penanda, gate tetap menolak.
- **Migrasi ID** → tabel + alias ditulis **sebelum** edit; arsip/historis tidak disentuh; link diperiksa R2/R6.
- **Pindah §2/backlog** → isinya tetap aktif di TASK-AKTIF; pointer di ANTREAN wajib ada agar tidak “hilang”.
- **Byte** → setelah langkah 1–3, ukur; bila >16.384, pindahkan detail §3 berikutnya ke checklist, jangan memangkas isi.

**Checkpoint:** D5 dieksekusi dan gate BERSIH 0; D6–D9 belum dijalankan.

## D6–D9 — rencana (potret 2026-10-21, menunggu approval owner)

> **Status:** D6–D9 **belum dieksekusi**. Bagian ini menggantikan baris ringkas §5 untuk D6–D8. Angka "sekarang" di bawah adalah **potret dokumentasi terakhir (D5)**; sesi ini **belum** mengukurnya ulang karena shell mati (`pwsh` exit 3221225794, STATUS_DLL_INIT_FAILED) — lihat laporan sesi. **Tidak ada** suntingan KONTRAK/ATURAN/AGENTS/`scripts/check-docs.mjs` sebelum approval.
>
> **Approval owner (21 Okt 2026, jawaban a):** rencana D6–D8 disetujui apa adanya — register di `default-dev` §13 tanpa berkas baru, KONTRAK §11 dipindah ke `default-dev` §11 (plafon tidak dinaikkan), anggaran baca turunan token×4 + `BACA: n/KB`, gate v3 **R13–R16** dengan R16 ratchet dan self-test dua arah. Bukti: [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) entri DOCS-GEN2 D6–D8. **Eksekusi belum mulai**: menunggu shell hidup (gate/ukuran wajib lebih dulu).

### D6 — register aturan: detektor atau PANDUAN

**Hasil yang diminta:** satu register yang menunjuk, untuk tiap aturan normatif, (a) detektor yang **bisa gagal**, atau (b) status `PANDUAN` + pemilik + alasan.

**Rumah register (tanpa berkas baru):** `docs/operations/default-dev.md` **§13** "Register aturan normatif".

- Dipilih karena: sudah rumah gate/verifikasi (§11) dan otoritas keputusan (§12); punya daftar isi berjangkar; tidak menambah berkas (target ≤30 sudah lewat 3 — bukan alasan menambah).
- Ditolak: **KONTRAK §7** (sisa 6 byte; register ±40 baris), **ATURAN.md** (menyatakan dirinya bukan tempat aturan kerja), **berkas baru** (dilarang prompt D6).

**Granularitas (usul):** satu baris per aturan **berbutir** di tier-0/1 governance — AGENTS §1–§9 · KONTRAK §1–§11 · ATURAN §1–§3 · OPERASI §1–§3 · default-dev §10–§12 · id-registry §2/§5 · aturan registry FITUR · batas-kejujuran; **satu baris per topik** untuk `docs/domain/*` dan `docs/operations/*` (bukan per kalimat). Alasan: aturan bisnis milik owner tidak bisa digate; yang dicari adalah "tidak ada aturan **proses** yang mengaku wajib tetapi tak terperiksa".

**Kolom:** `Aturan` (rumah + kutipan satu frasa) · `Detektor` (`R1…R16`, `check-fitur`, `ukur-*`, `inventaris`, atau `—`) · `Status` (`DIPERIKSA` | `PANDUAN`) · `Pemilik & alasan`.

- `PANDUAN` **tidak menghapus kewajiban**; ia menyatakan aturan itu dijaga manusia dan gate tidak menjaganya.

**Langkah:**

1. Sensus aturan bertanda di 4 berkas aturan + default-dev (`rg`), hasil = daftar kandidat baris (angka final dihitung saat eksekusi, bukan ditebak).
2. Petakan ke detektor yang **sudah ada**: R1–R12, `check-fitur`, `ukur-kekuatan/kesegaran/serah-terima`, `inventaris`. Detektor baru hanya dari D8.
3. Baris tanpa detektor → `PANDUAN` + pemilik + alasan; **jangan** mengarang detektor yang belum bisa gagal.
4. Contoh **"4 vs 5 hal"** (ditemukan `rg`, bukan tebakan): aturan kanonik **lima hal** ada di AGENTS §4, KONTRAK §2, default-dev §12; versi **empat hal** hanya di **arsip beku** (ADAPTASI-DOKTRIN butir A-5, PROMPT-SESI-BERIKUTNYA). Tindakan: satu baris register + satu baris KONTRAK §8; arsip **tidak** disunting.
5. Ruang byte KONTRAK: pindahkan **§11 (invariant & cara memeriksa)** utuh ke `default-dev` §11 (rumah verifikasi; preseden pemindahan §5), pertahankan anchor `#d4b-gate-11`, perbarui 2 rujukan aktif (ANTREAN baris "Fakta", SERAH-TERIMA). Estimasi bebas 1,6–2,0 KB — cukup untuk pointer + baris §8 tanpa menaikkan plafon.
6. Gate + ukur; catat hasil di TASK + changelog.

**Acceptance D6:** register ada di default-dev §13; 100% baris punya detektor atau `PANDUAN`+pemilik; "4 vs 5" tercatat dan **tidak ada** dokumen aktif yang memakai "empat hal"; KONTRAK ≤16.384 B; 0 berkas baru; 0 aturan hilang (diff per hunk); gate BERSIH.

### D7 — anggaran baca per level + aturan DeepSeek

**Angka diturunkan, bukan dikarang.** Sumber: AGENTS §5 "Token indikatif" (XS 1–3 · S 3–7 · M 7–15 · L 15–30 · XL 10–25 ribu/tahap) dikali 4 — KONTRAK §3 menetapkan token ≈ byte/4. Kolom berkas memakai "maks. berkas" AGENTS §5.

| Level | Berkas (maks) | Anggaran baca | Catatan |
|---|---:|---|---|
| XS | 5 | 4–12 KB | typo/copy lokal |
| S | 8 | 12–28 KB | satu fungsi/berkas |
| M | 12 | 28–60 KB | satu modul |
| L | 18 | 60–120 KB | lintas modul |
| XL | 20/tahap | 40–100 KB/tahap | arsitektur; per tahap |

**Cara mencatat:** satu baris di laporan: `BACA: <n> berkas / <KB>` — **model menilai** berkas mana yang masuk konteks, **skrip menghitung** byte-nya lewat `node scripts/ukur-jalur-baca.mjs --baca <path...>` (mode baru di skrip yang sudah ada; **bukan** berkas baru). Anggaran menghitung bacaan **tambahan** selama tugas; AGENTS yang disuntik tidak dihitung, dan jalur wajib (KONTRAK+ANTREAN) sudah memakan sebagian besar anggaran XS/S — itu fakta yang harus terlihat, bukan alasan menaikkan angka.

**Kelebihan anggaran:** dilaporkan, **tidak** diblokir gate (gate tidak bisa melihat konteks sesi); lebih dari 20% di atas anggaran wajib satu baris alasan. Ditulis di default-dev §12 + satu baris AGENTS §6.

**Acceptance D7:** tabel anggaran ada; `--baca` mencetak angka yang sama dengan ukuran berkas (diuji dengan fixture kecil); format `BACA: n/KB` dipakai di laporan D7–D9; 0 berkas baru.

### D8 — gate v3: R13–R16 (R12 tidak dinomori ulang)

**Usul definisi — butuh konfirmasi owner di checkpoint 3, jangan diam-diam ditetapkan:**

- **R13 encoding/emoji tier.** Pakai ulang `MOJIBAKE` dan `EMOJI` dari `scripts/inventaris-docs.mjs`; cakupan **tier-0** (5 berkas: AGENTS, KONTRAK, ANTREAN, PETA-KODE, KEPUTUSAN-OWNER) + **tier-1** (`docs/*.md` akar). Ambang: **0 emoji**; mojibake sah **hanya** pada baris yang memuat kata `mojibake` atau penanda `[kutipan-disengaja]`. Sensus dulu (inventaris sudah mencetak hit per berkas); pengecualian hanya untuk kutipan yang terbukti sengaja.
- **R14 registry ID.** Setiap token ID di dokumen aktif harus berprefix terdaftar di id-registry §2 (aktif) **atau** §4 (alias beku); daftar noise dipakai ulang dari inventaris. **Sensus prefix dulu** — temuan yang harus ditangani sebelum aturan dinyalakan: `AO-`, `EF-`, `AIDL-`, `F1-`, `BE-`, `P-`, `A-`, `Z-` masih dipakai di dokumen aktif; sah hanya bila tercatat sebagai alias.
- **R15 jangkar fitur/rute.** Rute yang ditulis di `docs/product/peran.md` harus ada di `frontend/src/App.tsx`; path `frontend/…` di peran.md/FITUR harus ada di disk. `check-fitur` tetap memeriksa registry FITUR; **R15 menutup celah peran.md** yang sekarang belum diperiksa siapa pun.
- **R16 plafon tier.** Tabel tier eksplisit + cap per tier; cap bersifat **ratchet** (total terukur hari ini, hanya boleh turun), **bukan** angka karangan. Butuh pengukuran → dikerjakan setelah shell hidup.

**Self-test dua arah (wajib):** baseline bersih harus LULUS; tiap aturan disuntik satu pelanggaran dan harus tertangkap sebagai **assertion** (`— RNN … : n`, bukan crash) — mutan: emoji di tier-0 · mojibake tanpa penanda · prefix asing `XYZ-999` · rute `/tidak-ada` + path `frontend/src/tidak-ada.tsx` · berkas melebihi cap tier. Dua uji R12 tetap ada; R12 tidak dinomori ulang.

**Dokumen:** KONTRAK §7 (daftar aturan + pointer) dan AGENTS §9 (R1–R16). Ruang byte KONTRAK berasal dari langkah D6 — **tidak** menaikkan plafon.

**Acceptance D8:** `check-docs` BERSIH dengan R13–R16 = 0; selftest LULUS (semua mutan tertangkap, baseline bersih); KONTRAK ≤16.384 B; AGENTS ≤12 KB; 0 pelanggaran baru di R1–R12.

### D9 — tutup

1. Ukur ulang: `check-docs`, `inventaris-docs`, `check-fitur`, `check-docs.selftest`, `ukur-kekuatan-docs`, `ukur-serah-terima-docs` — exit code + angka dicatat apa adanya (termasuk yang gagal).
2. Arsipkan **rencana batch yang sudah selesai** (TASK-DOCS-GEN2 beserta rencana D4b/D5/D6–D8) ke `docs/arsip/` dengan banner + ledger SHA-256 — bukan dokumen aturan; pekerjaan terbuka (`status-ao`, `batas-kejujuran`, changelog berjalan) **tidak** ikut.
3. Tutup `W-DOC-001` **hanya bila** D6–D9 benar-benar selesai; hapus pointer `checklist:` di ANTREAN pada baris yang sama (kalau tidak, R12 merah), catat gap ≤30 berkas sebagai **keputusan owner** (bukan kegagalan yang disembunyikan).
4. Perbarui changelog 2026-10 + SERAH-TERIMA + laporan akhir 5 baris.

**Catatan risiko D9:** rencana ini menambah baris ke dokumen aktif; ratchet baris (pemeriksaan **M** kartu kekuatan) bisa naik. Sesuai KONTRAK §7, baseline hanya dinaikkan dengan keputusan owner + `alasan`; bila belum ada keputusan, **laporkan M gagal** — jangan naikkan diam-diam.

## D4b — rencana rinci (potret 2026-10-21, belum dieksekusi)

**Keputusan owner:** **1a** — rencana ini disusun dulu; **belum ada berkas operations yang dipindah** sampai owner menyetujuinya. **5c** — setelah D4b disetujui, D4c–D4e dijalankan terus sampai laporan akhir, tanpa checkpoint per sub-batch.

**Keadaan.** `docs/operations/` **12 berkas / 251,7 KB**. Indeks [operations/README.md](../operations/README.md) sudah basi: tidak memuat `backup-restore.md` dan menulis `efisiensi-hosting.md` 36,6 KB (sekarang 38,9 KB). Indeks akan dibuat ulang pada eksekusi.

**Target: 4 berkas total (termasuk README).** Rekomendasi: tiga dokumen isi + indeks.

| Akhir | Isi | Perkiraan |
|---|---|---:|
| `README.md` | indeks folder, dibuat ulang | ~2 KB |
| `produksi.md` | produksi harian + deploy + akses SSH + backup/restore + setup cPanel + aturan kapasitas RAM + lampiran verifikasi uang | ~75 KB |
| `default-dev.md` | default & seed DEV + **data master/nilai default** (isi `data-master.md`) | ~48 KB |
| `iot.md` | runbook Tuya KWH + spesifikasi/prosedur water meter ESP32 | ~42 KB |

### Pemetaan per berkas

| Sumber | Tindakan | Rumah tujuan |
|---|---|---|
| `produksi.md` | pertahankan; tambah bagian | target utama |
| `akses-ssh.md` | gabung **utuh** (identitas server, autentikasi, perintah, peta server, larangan, jebakan) | `produksi.md` bagian “Akses server (SSH/scp)” |
| `backup-restore.md` | gabung **utuh** (dump, cron/retensi, uji restore, bukti) | `produksi.md` §9 “Backup, rollback, pemulihan” |
| `go-live-cpanel.md` | ambil yang masih berlaku: Appendix B (setup cPanel), §C/D (persiapan + urutan), §F.1 (cek gate KTP), §G–J (release/rollback/jebakan); bagian status historis A–F/forms → arsip | `produksi.md` “Setup cPanel pertama kali” + “Release berikutnya” |
| `deploy-go-live.md` | **arsip utuh** — isinya VPS/legacy 2026-06 + 2026-07-23; bertentangan dengan shared hosting (port 5432, `app.` canonical) dan sudah digantikan `produksi.md` §6 + cPanel Appendix B | `docs/arsip/` |
| `efisiensi-hosting.md` | pindahkan **§11 aturan kapasitas RAM 512 MB** (normatif, dirujuk AGENTS §2) ke produksi; audit/rencana/EF-00..EF-09 yang historis → arsip | `produksi.md` “Kapasitas RAM” + `docs/arsip/` |
| `verifikasi-keuangan.md` | gabung sebagai **lampiran** “Harness verifikasi uang” (8 invarian, DO-NOT-TOUCH, test, rekonsiliasi, skenario emas, 5 gate); jangan arsipkan aturannya | `produksi.md` lampiran |
| `data-master.md` | gabung **utuh** (kamar, fasilitas, konstanta, layanan, FAQ, perintah seed); pertahankan anchor lama | `default-dev.md` bagian “Data master & nilai default” |
| `default-dev.md` | pertahankan nama + anchor §10–§12 (dirujuk AGENTS/KONTRAK); judul diperluas, isi data master ditambahkan | target utama |
| `iot-tuya-setup.md` + `iot-water-meter-esp32.md` | gabung **utuh** ke `iot.md` baru; Part C/D/E + anchor dipertahankan | `iot.md` |
| `README.md` | dibuat ulang dari 3 berkas isi | indeks |

**Berkas yang diarsipkan (9):** `deploy-go-live.md` · `go-live-cpanel.md` · `efisiensi-hosting.md` · `akses-ssh.md` · `backup-restore.md` · `verifikasi-keuangan.md` · `data-master.md` · `iot-tuya-setup.md` · `iot-water-meter-esp32.md`. Masing-masing: banner, nama tidak diganti, ledger SHA-256 + alasan + “isi dipindah ke …”, dan bukti 0 baris non-kosong hilang.

### Risiko dan pagar

1. **Ukuran.** `produksi.md` ~75 KB dan `default-dev.md` ~48 KB melewati plafon rujukan 48 KB; keduanya **wajib** punya daftar isi berjangkar di 80 baris pertama (R5/D3). Tanpa itu gate merah.
2. **R9 nomor bagian.** `data-master.md` punya `## 9`; `default-dev.md` juga punya `## 9`. Saat digabung, bagian data master diberi penomoran/lampiran baru **tanpa** memakai ulang nomor yang sudah ada; anchor lama dipertahankan lewat `<a id="…">`.
3. **Normatif jangan ikut arsip.** §11 kapasitas RAM, gate KTP, backup/restore, 5 gate verifikasi uang, dan aturan data master harus ada di berkas aktif **sebelum** berkas asal diarsipkan. Pekerjaan terbuka: PIN/password/opening balance/cron/PostgreSQL sudah tercatat di ANTREAN; **pertanyaan `uploads/` (`go-live-cpanel` §C) belum** — pindahkan ke ANTREAN pada putaran yang sama sebelum berkas diarsipkan. Jangan arsipkan `F.1` gate KTP sebagai temuan historis; pindahkan perintah verifikasinya ke produksi/ANTREAN #1.
4. **PII.** `produksi.md` dan `data-master.md` memuat data lapangan/PII. Penggabungan **tidak boleh** menggandakan NIK/foto/kredensial; blok data tetap di satu rumah, batas DEV/UAT/produksi dipertahankan.
5. **Tautan.** `default-dev.md`, `efisiensi-hosting.md`, `akses-ssh.md`, `backup-restore.md`, `data-master.md`, dan `deploy-go-live.md` punya rujukan masuk dari AGENTS/KONTRAK/OPERASI/ANTREAN/domain/kerja. Semua dihitung ulang dan dibuktikan `check-docs` R2/R6 = 0.
6. **Indeks basi.** `operations/README.md` dibuat ulang **setelah** pemindahan, bukan sebelum.

### Urutan eksekusi (setelah disetujui)

1. Catat baseline SHA-256/byte/baris non-kosong 9 berkas arsip + isi blok yang akan dipindah.
2. Bangun `iot.md` (Part C + D + E, TOC berjangkar).
3. Sisipkan bagian ke `produksi.md` (urutan: akses → deploy/cPanel → backup → kapasitas → verifikasi uang); pertahankan teks asli per blok.
4. Sisipkan data master ke `default-dev.md`; selesaikan penomoran + anchor.
5. Arsipkan 9 berkas dengan banner + ledger; daftarkan di [arsip/README](../arsip/README.md).
6. Buat ulang `operations/README.md`; perbarui seluruh tautan masuk.
7. Gate `check-docs` + `inventaris-docs` + `check-fitur`; ukur sebelum/sesudah.

**Acceptance D4b:** 4 berkas operations (README + 3 isi) · 0 tautan aktif rusak · 0 pelanggaran gate baru (R5 ANTREAN pra-eksisting boleh 1) · 9 berkas arsip terdaftar + ledger · 0 aturan normatif hilang · 0 pekerjaan terbuka ikut terarsip · `docs/FITUR.md`/`docs/product/peran.md` tetap valid.

**Checkpoint:** rencana ini **berhenti di sini**. Tidak ada berkas operations yang dipindah/diubah sampai owner menyetujui pemetaan di atas.

## 4. D2 — peta peran & satu desain

**Tujuan.** Satu berkas yang menjawab: role apa saja, layar intinya apa, data apa yang dimiliki, aksi apa yang terlarang — dan memastikan setiap rute di kode punya role.

**Baca (maks 5 berkas, berhenti setelah cukup):**
`frontend/src/App.tsx` · `frontend/src/config/navigation.ts` · *docs/product/peran.md* (bila sudah ada) · [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) entri `DOCS-GEN2` · [id-registry](../id-registry.md).

**Langkah:**
1. Ekstrak setiap `<Route>` dari `App.tsx`: path, guard (`RequireRoles allowed=[...]`), publik/tidak. Catat rute anak yang mewarisi guard induk dan rute redirect.
2. Tulis *docs/product/peran.md* ≤12 KB: empat kartu (OWNER/ADMIN/STAFF/TENANT) — tujuan, layar inti, data yang dimiliki, aksi terlarang, metrik yang dibaca.
3. Tambahkan **matriks rute → role** yang diturunkan dari langkah 1, bukan dikarang. Rute yang tidak terpetakan ditandai `TIDAK TERPETAKAN` dan dihitung.
4. Nyatakan `/cepat` **deprecated** beserta tiga elemen yang harus dipindah ke kokpit OWNER. **Jangan** mengubah kode di D2.
5. Perbarui changelog satu entri; jalankan gate.

**Acceptance (bisa diperiksa):**
- Jumlah rute di matriks = jumlah `<Route path=...>` di `App.tsx`; 0 rute tanpa role.
- Empat kartu ada; tiap kartu ≤15 baris.
- `/cepat` tercatat deprecated + daftar 3 elemen.
- Gate: 0 pelanggaran baru; R3 0 (tidak ada kotak di berkas ini); R2 0.
- 0 emoji di berkas baru.

**Jebakan yang sudah terbukti:**
- `RequireRoles` melakukan **redirect + toast**, bukan 403 — rute yang "ditolak" tetap ada di kode; jangan menghitungnya sebagai milik role itu.
- OWNER punya dua mode (`/owner-dashboard` dan `/admin-dashboard`); jangan menggabungkan keduanya menjadi satu baris tanpa menyebut modenya.
- Navigasi (`navigation.ts`) dan rute (`App.tsx`) adalah dua daftar berbeda; selisihnya adalah temuan, bukan kesalahan.
- Jangan menyimpulkan role dari nama folder halaman.

## 5. Batch berikutnya (ringkas)

### D3 — registry fitur `FEAT-` (kontrak)

**Tujuan.** Satu registry yang menjawab: fitur apa, untuk role apa, di rute mana, statusnya apa, dan kode mana jangkarnya.

**Satuan fitur.** Satu layar/alur dengan satu komponen utama. Alias/redirect menempel ke fitur induk; halaman detail menempel ke fitur daftar. Rute tidak boleh muncul di dua fitur.

**ID.** `FEAT-<AREA>-NNN`; AREA = `OWN/ADM/STF/TNT/FIN/OPS/DATA`; nomor tidak didaur ulang. Satu fitur lintas-role memakai area domain, bukan area role.

**Kolom.** ID · Fitur · Role · Rute · Status · Jangkar kode.

**Status.** `aktif` · `stub` · `redirect` · `deprecated`; diturunkan dari komentar kode dan perilaku rute.

**Jangkar.** Path komponen (bukan nomor baris). Untuk `ConfiguredResourcePage`, sebut nama `resource` di teks, bukan sebagai path palsu.

**Acceptance.** Seluruh `<Route path=...>` di `App.tsx` muncul tepat sekali; 0 rute tak terpetakan; semua ID unik dan berformat sah; semua status sah; semua path jangkar ada di disk; 0 emoji; checker mandiri `node scripts/check-fitur.mjs` lulus; gate dokumen 0 pelanggaran baru.

**Bukti.** `docs/FITUR.md`, checker, entri changelog 2026-10-21.

- **D4** — konsolidasi: gabung domain, arsipkan bukti bertanggal, rotasi changelog; ledger konservasi; target ≤30/≤400 KB.
- **D5** — ANTREAN ≤16 KB; pindahkan kotak ke dokumen tugas; migrasi ID terbuka ke `W-`; gate mengikat antrean↔dokumen.
- **D6** — register aturan: setiap aturan punya detektor atau status `PANDUAN`; bereskan contoh "4 vs 5 hal".
- **D7** — anggaran baca per level + aturan DeepSeek (model menilai, skrip menghitung); catat `BACA: n berkas/KB`.
- **D8** — gate v3 **R13–R16** (R12 dipakai D5): R13 encoding/emoji tier, R14 registry ID, R15 jangkar fitur/rute, R16 plafon tier; self-test dua arah.
- **D9** — ukur sebelum/sesudah, arsipkan rencana, tutup `DOCS-GEN2` di ANTREAN.

## 6. Batas dan ketergantungan

- D2 **tidak** mengubah kode; penghapusan `/cepat` adalah task kode terpisah setelah D2.
- D5 mengubah aturan (Q2=b), jadi butuh KONTRAK + gate disentuh pada batch yang sama; jangan setengah jalan.
- D4 adalah batch termahal; kerjakan per folder, tanpa membaca arsip, dan catat ledger konservasi.
- Setiap batch berhenti di checkpoint; gate diperiksa **sebelum** menutup, bukan sesudah commit.
- Perubahan sesi lain di pohon kerja tidak boleh dikembalikan atau diklaim.

## 7. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-21 | Dibuat setelah D1: goal, keputusan Q1–Q3, status batch, kontrak D2, ringkasan D3–D9, batas. |
| 2026-10-21 | D2 dijalankan: [peta peran](../product/peran.md) 79 rute dari `App.tsx`; `/cepat` deprecated + tiga elemen; status D2 selesai. |
| 2026-10-21 | D3 dijalankan: [FITUR](../FITUR.md) 58 fitur/79 rute; checker `scripts/check-fitur.mjs`; status D3 selesai. |
| 2026-10-21 | **D4a dijalankan:** 19 kartu audit/history dipindah ke [arsip](../arsip/README.md) (13 identik, 6 dengan 26 tautan di-rebase), ledger [D4a](../arsip/D4a-ledger-konservasi.md); 89 → 70 berkas; gate 1 R5 pra-eksisting. Potret akhir setelah addendum + register + rencana D4b: **70/1.065,7 KB**. |
| 2026-10-21 | **Checkpoint D4a dijawab owner 1a/2a/3a/4b/5c:** `status-ao` tetap di audit; angka D4a diterima; 13 tautan arsip beku diperbaiki + [addendum](../arsip/D4a-addendum-tautan-arsip.md); D4b rencana rinci disusun, **belum dieksekusi**; D4c–e setelah D4b disetujui. |
| 2026-10-21 | **D4b–D4e dieksekusi (owner a + 5c):** operations 12→4 ([ledger D4b](../arsip/D4b-ledger-konservasi.md)), domain 10→5 ([D4c](../arsip/D4c-ledger-konservasi.md)), product 7→3 + kerja 21→8 + rencana 6→1 ([D4d](../arsip/D4d-ledger-konservasi.md)), root 9 dipertahankan. Hasil **33 berkas/769,3 KB/10.548 baris**; target ≤30 belum tercapai karena 4 task terbuka + 3 dokumen wajib. |
| 2026-10-21 | **D5 dieksekusi (owner a):** ANTREAN 19.547 → **14.081 byte**; §2 + backlog pindah ke TASK-AKTIF; 36 baris `W-`; R3 diperluas + **R12**; self-test 15/15; gate **BERSIH 0**. |

<a id="checklist"></a>
## Checklist

<!-- checklist-otoritatif -->

- [x] W-DOC-001 — D5: ANTREAN ≤16 KB, checklist terikat, ID W- aktif
- [x] W-DOC-001 — D6: register aturan; aturan tanpa detektor jadi PANDUAN
- [x] W-DOC-001 — D7: anggaran baca per level + aturan DeepSeek
- [x] W-DOC-001 — D8: gate v3 R13–R16 + self-test dua arah
- [x] W-DOC-001 — D9: ukur akhir, arsipkan rencana, tutup DOCS-GEN2

## D6–D9 — hasil (2026-10-22)

| Batch | Hasil terukur |
|---|---|
| D6 | Register aturan di [default-dev §13](../operations/default-dev.md#d4b-register) — 60 baris, 100% berdetektor atau `PANDUAN`+pemilik. KONTRAK §11 dipindah **utuh** ke [default-dev §11a](../operations/default-dev.md#d4b-invariant); KONTRAK 16.378 → **15.869 B** (plafon tidak dinaikkan). Konflik "4 vs 5 hal" ditutup di register + [KONTRAK §8](../KONTRAK.md). |
| D7 | Tabel anggaran baca XS–XL + aturan >20% di [default-dev §12a](../operations/default-dev.md#d4b-baca); mode `--baca <path...> [--level=]` mencetak `BACA: n berkas / KB (B)` dan membandingkan anggaran. Diuji dengan fixture 22 B. |
| D8 | Gate **v3.0**: R13 emoji/mojibake tier-0/1 · R14 prefix ID vs id-registry §2/§4 · R15 rute/path peran.md↔`App.tsx`/disk · R16 cap byte per tier (ratchet, `scripts/docs-tier.baseline.json`). Self-test **21/21** — tiap mutan R13–R16 tertangkap. |
| D9 | `check-docs` **BERSIH** (16 aturan) · `check-fitur` 58 fitur/80 rute · `inventaris` 35 berkas/824,5 KB · `kekuatan` 10/13 (C/E/H pra-eksisting) · `selftest` 21/21 · `serah-terima` COCOK sesudah blok state diperbarui. |

**Gap yang tidak ditutup:** target Q3=a **≤30 berkas** belum tercapai (35 berkas aktif di `docs/`, di luar akar repo) — sisa gap = berkas wajib + pekerjaan terbuka; keputusannya milik owner, bukan sesuatu yang ditutup dengan mengarsipkan pekerjaan terbuka.
