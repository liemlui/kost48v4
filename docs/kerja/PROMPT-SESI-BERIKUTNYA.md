# PROMPT-SESI-BERIKUTNYA — titik masuk untuk sesi agen yang baru

> **Blok baca** · Jenis: **titik masuk sesi (salin-tempel)** · Status: **aktif (diperbarui tiap sesi besar)** · Untuk siapa: owner yang membuka sesi baru + agen yang baru masuk
> · Baca kalau: memulai sesi kerja baru di repo ini dan ingin agen langsung tahu aturan, urutan, dan jebakannya. · **Jangan** dibaca kalau: mencari keadaan terakhir yang rinci (itu [SERAH-TERIMA](SERAH-TERIMA.md)) atau memilih tugas (itu [ANTREAN](../ANTREAN.md)).

**Cara pakai.** Salin blok di §1 apa adanya ke pesan pertama sesi baru. Sesudah itu **agen wajib mengukur sendiri** keadaan repo — blok itu memuat titik masuk, **bukan** kebenaran yang diperbarui otomatis.

## 1. Salinan mulai di sini

```text
Kerjakan repo KOST48 Surabaya V5 (cwd: final_bundle). Dokumentasi & bahasa kerja: Indonesia.

Mulai dari sini, berurutan:
1. AGENTS.md — disuntik otomatis; aturan, izin, level task, gate.
2. docs/KONTRAK.md — aturan rinci, berkas berisiko, bentuk laporan, invariant.
3. docs/ANTREAN.md — SATU-SATUNYA antrean; pilih satu tugas dari §3.
4. docs/kerja/SERAH-TERIMA.md — keadaan terakhir, pelajaran, batas, langkah berikutnya.
5. docs/kerja/PROMPT-SESI-BERIKUTNYA.md (berkas ini) — jalankan perintah ukur di §3, lalu bandingkan dengan potret SERAH-TERIMA.

Sebelum menyentuh berkas apa pun: buat GOAL + TODOS untuk pekerjaan ini (AGENTS §7 · default-dev §12).
Owner memakai keduanya untuk tracking; pekerjaan tanpa keduanya dianggap tidak terlacak.

Gate — jalankan SEKALI di akhir tugas, bukan per langkah:
  docs-only            -> node scripts/check-docs.mjs
  + kartu kesehatan    -> node scripts/ukur-kekuatan-docs.mjs   (13 pemeriksaan, termasuk ratchet baris)
  + keadaan sesi       -> node scripts/ukur-serah-terima-docs.mjs
  + bukti pagar        -> node scripts/check-docs.selftest.mjs  (wajib 13/13)

Ratchet baris: total baris dokumen aktif TIDAK boleh naik. Kalau pemeriksaan M GAGAL karena Anda
menambah baris, itu bukan kegagalan palsu — putuskan sadar: pindahkan isi ke arsip, atau naikkan
`total_baris` di scripts/docs-lines.baseline.json BESERTA `alasan` pada commit yang sama.

Aturan yang paling sering dilanggar:
- Jangan menambah aturan paralel: kontrak hanya AGENTS + KONTRAK, antrean hanya ANTREAN (KONTRAK §1, R3).
- Jangan menulis angka volatil; tulis perintah pengukurnya (R1).
- Jangan menaikkan plafon byte; PINDAHKAN isi ke rumah teknisnya (KONTRAK §7).
- Jangan menyunting arsip beku (docs/arsip/**, docs/history/**, docs/audit/**): angka & nomor ganda di sana memang begitu (KONTRAK §7).
- Jangan mengangkat ulang keputusan yang sudah ditolak: KONTRAK §8 (R-1..R-6).

Lapor dengan bentuk 5 baris KONTRAK §9, dan sebutkan apa yang TIDAK dijalankan.
```

## 2. Di mana

Repo: **`final_bundle`** (KOST48 Surabaya V5 — backend NestJS, frontend React/Vite; produksi LIVE). Dokumentasi: `docs/`. Bahasa: **Indonesia**.

## 3. Keadaan yang diukur — rumahnya di berkas serah-terima (jangan disalin ke sini)

Dulu bagian ini memuat tabel potret sendiri. Tabel itu **dihapus 2026-10-11**: ia duplikat fakta yang sudah punya rumah ber-mesin, dan duplikatnya terbukti **bertentangan** dengan potret yang lebih baru (masih menulis kartu kekuatan "10/11", "85 rujukan nomor baris di 9 berkas", "pohon kerja kotor 69 berkas"). Dua tempat menyimpan angka yang sama = dua tempat yang bisa saling menyalahkan.

**Rumah potretnya satu:** [SERAH-TERIMA](SERAH-TERIMA.md) §2, dijaga blok `@kost48-state` yang **diperiksa mesin**. Perintah pengukurnya ada di §1 di atas, dan keadaan sesi yang menyimpang dari kenyataan **selalu dimenangkan kenyataan**.

## 4. Urutan pekerjaan yang mengikat

1. **Satu tugas dikerjakan sampai tuntas, lalu lapor satu kali** ([default-dev §11](../operations/default-dev.md) — gate G0–G5).
2. **Satu task ACTIVE**; tahapan DRAFT → READY → ACTIVE → VERIFY → DONE di [AGENTS §7](../../AGENTS.md).
3. **Berkas risiko** (uang, auth, schema DB, kontrak API) tidak disentuh tanpa izin eksplisit + rencana ([KONTRAK §6](../KONTRAK.md)).
4. **Bertanya hanya untuk empat hal**: uang · perilaku pengguna · hapus data · deploy/secret. Di luar itu putuskan sendiri + catat satu baris ([KONTRAK §2](../KONTRAK.md)).
5. **Tugas level ≥S boleh punya dokumen kerja** `docs/kerja/TASK-<ID>.md` — 7 bagian, tanpa kotak, bukan antrean kedua ([ANTREAN §3](../ANTREAN.md)).
6. **Goal + todos wajib dibuat sebelum bekerja** dan diperbarui selama bekerja ([AGENTS §7](../../AGENTS.md) · [default-dev §12](../operations/default-dev.md)); goal ditutup hanya bila definisi selesainya terpenuhi.

## 5. Jebakan yang sudah terverifikasi (jangan terperangkap lagi)

Daftar penuh: [default-dev §10a](../operations/default-dev.md) (mesin) + [produksi §10](../operations/produksi.md) (produksi) + [SERAH-TERIMA §3](SERAH-TERIMA.md) (dokumentasi). Tiga yang paling sering menggigit **kerja dokumentasi**:

1. **Suntingan teks besar tumbuh tak terduga.** Ukur byte **per bagian sebelum** menyunting (`[IO.File]::ReadAllBytes`); pada 2026-10-07 §7/§8 KONTRAK tumbuh ~2× perkiraan dan plafon 16 KB terlewati tanpa terasa.
2. **Gate dulu, tebakan kemudian.** Contoh sintaks di dalam backtick pernah dihitung tautan mati, dan slug anchor berbeda antara GitHub dan slugifier lama — jangan "memperbaiki" temuan sebelum memverifikasi sumbernya (kalibrasi v1.1/v1.4/v1.7 di kepala gate).
3. **Keluaran konsol bisa memojibakekan UTF-8.** Untuk menilai berkas benar-benar rusak, ukur byte — dan jangan "perbaiki" kutipan mojibake yang memang sengaja (tabel inversi B12).

## 6. Yang sengaja tetap seperti sekarang (jangan diusulkan lagi)

- **Tanpa pre-commit hook** ([ANTREAN](../ANTREAN.md) backlog): hook yang bisa dibagikan butuh dependency baru; penggantinya `npm run check:docs` sebelum menutup batch.
- **Tanpa berkas router di akar `docs/`** (ide itu sudah ditolak, R-3): router ada di [AGENTS §3](../../AGENTS.md) yang disuntik tiap request.
- **Tanpa kontrak/antrean kedua**: R-1…R-4 di [KONTRAK §8](../KONTRAK.md).
- **Plafon byte tidak dinaikkan**; isi dipindahkan.

## 7. Riwayat berkas ini

| Tanggal | Perubahan |
|---|---|
| 2026-10-07 | Dibuat pada batch [SERAH-SESI-DOCS](../rencana/SERAH-SESI-DOCS.md) butir **A-8**, berpasangan dengan [SERAH-TERIMA](SERAH-TERIMA.md). Isinya diturunkan dari aturan yang sudah berlaku (AGENTS/KONTRAK/ANTREAN + default-dev) — **tidak ada aturan baru** di berkas ini, hanya urutan masuk dan jebakan. |
