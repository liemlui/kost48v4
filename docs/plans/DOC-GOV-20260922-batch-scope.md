# DOC-GOV-20260922 — Memo Scope Batch Lanjutan (S2.b3 / S2.b4)

Tanggal: 23 September 2026. Status: **DRAFT — usulan, BELUM approval.**
Otoritas: [M12](../M12_CHECKLIST_CHANGELOG.md) (antrean/gate) dan [M02](../M02_KEPUTUSAN_OWNER.md) (keputusan owner).
Sifat dokumen: **recon read-only.** Tidak ada isi yang dipindahkan, tidak ada approval yang diklaim, tidak ada test/build/server.

## 1. Mengapa memo ini ada

- Label batch `S2.b3`, `S2.b4`, `S2.c`, `S2.d` dirujuk di [M02:15](../M02_KEPUTUSAN_OWNER.md), [M12:37 dan :55](../M12_CHECKLIST_CHANGELOG.md), serta [§0 rancangan](DOC-GOV-20260922.md#0-status-pelaksanaan-per-tahap) — tetapi **belum pernah punya definisi/scope tertulis**.
- Syarat owner 23 Sep: setiap batch wajib approval eksplisit **sebelum** eksekusi. Approval tidak sah bila scope-nya sendiri belum jelas.
- Sisa isi `docs/M04_KEUANGAN.md` (180 baris) tinggal dua blok; keduanya belum dimigrasikan.

## 2. Inventaris sisa M04 (bukti baris)

| Section | Baris | Isi | Sifat |
|---|---:|---|---|
| `## Updates — dipindah` | 23–27 | Pointer ke history/domain | Sudah pointer — jangan diubah |
| `## Bagian 1 - archieve 05_VERIFIKASI_KEUANGAN` | 29–141 | §1 delapan invarian keuangan; §2 tabel DO-NOT-TOUCH (peta kode + nomor baris); §3 unit test zero-dependency (2 file siap pakai + 1 file TODO); §4 tabel harness rekonsiliasi endpoint; §5 skenario emas berangka eksak; §6 gate per-task dengan **5 `[ ]`** | Normatif + runbook eksekutor |
| `## Bagian 2` / `## Bagian 3` | 143–151 | Sudah pointer (S2.b2.a/b) | Selesai |
| `## Audit 360° Flow Uang (Jul 2026)` | 154–180 | Status 90% sehat; tabel "8 Invarian Keuangan — Status Terkini"; temuan HIGH `P1-01..P1-03` (ditandai **P0 sebelum go-live**), MEDIUM `P1-04..P1-07`, LOW `P1-08..P1-09` | Bukti bertanggal + status |

## 3. Seam yang sudah ada (temuan inti memo ini)

1. **Duplikasi tabel status.** `docs/domain/keuangan.md:117–130` sudah memuat `## Status Audit Invarian Keuangan (per Jul 2026)`, sementara `M04:158–169` memuat tabel `8 Invarian Keuangan — Status Terkini`. Dua tabel dengan fungsi sama di dua tempat — persis kelas masalah yang sedang diperbaiki.
2. **Pernyataan kanonik yang membatasi migrasi.** `domain/keuangan.md:118` berbunyi: *"Daftar invarian kanonik dan aturan normatif tetap di docs/M04_KEUANGAN.md §1."* Artinya memindahkan Bagian 1 **bukan** pekerjaan mekanis: pernyataan kanonik itu harus ikut diubah, dan rujukan masuk ke M04 §1 harus diperiksa lebih dulu.
3. **Konsekuensi:** S2.b3/S2.b4 adalah keputusan tentang **rumah kanonik harness verifikasi uang**, bukan sekadar "pindahkan sisanya".

## 4. Opsi

| Opsi | Isi | Kelebihan | Risiko / biaya |
|---|---|---|---|
| **A — status quo** | Harness tetap di M04; hanya blok Audit 360° yang dimigrasikan | Perubahan terkecil; rujukan masuk aman | M04 tetap campur (aturan + runbook ±113 baris); dua tabel status harus dijaga sinkron |
| **B — pindah ke operations** | Harness → `docs/operations/verifikasi-keuangan.md`; M04 jadi pointer; `keuangan.md:118` diperbarui | Konsisten dengan pola "runbook → operations"; M04 ringkas | File operations baru; semua rujukan masuk ke M04 §1 wajib diperiksa lebih dulu |
| **C — dedup minimal** | Satukan dua tabel status menjadi satu (kanonik di `domain/keuangan.md`); M04 §1 ditandai kanonik eksplisit; tidak memindahkan blok besar | Menghapus duplikasi nyata tanpa risiko tautan | M04 tetap panjang; belum menyelesaikan pemisahan peran file |

**Usulan saya:** kerjakan **C lebih dulu sebagai S2.b3** (XS, menghapus duplikasi, tanpa risiko rujukan), lalu **B sebagai S2.b4** setelah pemeriksaan rujukan masuk (S). Blok Audit 360° (temuan `P1-01..P1-09`) dimigrasikan sebagai bukti bertanggal ke `docs/audit/`.

## 5. Acceptance usulan (draft)

**S2.b3:**
- Hanya satu tabel status invarian yang berlaku; tabel kedua menjadi pointer eksplisit atau dihapus setelah isinya tergabung.
- M04 §1 ditandai tegas sebagai kanonik (atau ditandai akan dipindah pada S2.b4) — tanpa mengubah isi aturan.
- Invariant M12 tidak berubah: `[ ]` = 23, `[x]` = 101.
- **Konservasi 5 `[ ]`** gate M04 terdaftar dan tetap dapat ditemukan (aturan proyek: 78 `[ ]` + 22 `[x]` lintas sumber; M12 + history = 23/101).
- 0 tautan rusak pada baris yang diubah; `git diff --check` exit 0; tanpa npm/build/test/lint/server.

**S2.b4:**
- Harness pindah apa adanya ke `docs/operations/verifikasi-keuangan.md`; M04 menyisakan pointer.
- `domain/keuangan.md:118` dan **seluruh rujukan masuk** ke M04 §1 diperbarui (bukti daftar rujukan dilampirkan).
- Nomor baris kode di tabel DO-NOT-TOUCH **tidak diperbarui tanpa verifikasi kode** — jika tidak diverifikasi, tandai `perlu verifikasi`, jangan diubah.
- Temuan `P1-01..P1-09` masuk `docs/audit/` dengan status per temuan: terbukti selesai / UNKNOWN.

## 6. Pertanyaan yang butuh keputusan owner (bukan teknis)

1. **Rumah kanonik harness verifikasi uang:** tetap di M04, atau pindah ke `docs/operations/`? Ini menentukan file mana yang wajib dibaca AI sebelum task uang.
2. **Blok Audit 360° (Jul 2026):** jadikan laporan bertanggal di `docs/audit/`, atau cukup riwayat di `history/`?
3. **Temuan `P1-01..P1-03` berlabel "P0 sebelum go-live"** (jurnal & deposit ledger best-effort). Produksi sudah LIVE sejak 13 Sep. Status perbaikan ketiganya **belum terbukti** dari dokumen ini — perlu verifikasi kode sebelum diklaim aman. Ini risiko uang, bukan sekadar kerapian dokumen.
4. **5 `[ ]` gate M04:** tetap sebagai checklist aktif di file harness, atau dipindah ke M12/operations?

## 7. Batas memo

Recon ini membaca `docs/M04_KEUANGAN.md`, `docs/domain/keuangan.md`, `docs/plans/DOC-GOV-20260922.md`, dan `docs/M12_CHECKLIST_CHANGELOG.md`. Tidak ada pemindahan isi, tidak ada perubahan source, DB, server, atau deployment. Approval batch tetap diperlukan sebelum eksekusi.
