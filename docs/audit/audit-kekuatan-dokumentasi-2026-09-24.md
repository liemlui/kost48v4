# Audit Kekuatan Dokumentasi KOST48 — 24 September 2026

> **Tanggal:** 24 September 2026. **Lingkup:** struktur `docs/`, kualitas dokumentasi kode (backend/frontend), integritas tautan. **Pelaksana:** AI (peninjau dokumen) — **read-only**.
> **Status:** bukti bertanggal. Ini **bukan** PASS audit modul, bukan bukti deployment, dan bukan bukti dampak runtime.
> **Tujuan:** satu pengukuran yang dapat direproduksi untuk menjawab "seberapa kuat dokumentasi proyek ini", menggantikan skor tunggal yang tidak dapat diverifikasi.
> **Rujukan:** [STATUS](../STATUS.md) (antrean/gate) · [AUDIT](../AUDIT.md) (titik masuk) · [AGENTS](../../AGENTS.md) §6/§8 (batas baca, verifikasi).

## 1. Metode, dan tiga kesalahan yang dihindari

**Yang diukur (perintah read-only, `git ls-files`/`ls-tree` + hitung baris/`Select-String`):** jumlah dan ukuran berkas; jumlah berkas md yang **tracked** vs artefak generated/lokal; jumlah tautan relatif dan fragmen yang resolve (resolusi ternormalisasi `[IO.Path]::GetFullPath`); jumlah JSDoc dan dekorator OpenAPI; jumlah berkas uji; keberadaan berkas konfigurasi contoh.

**Yang TIDAK dilakukan:** uji unit, build, lint, typecheck, server, atau DB — menjalankan uji unit backend memicu **full build** lewat hook pra-uji, sehingga butuh izin tersendiri. Karena itu **persentase coverage tidak diklaim** (lihat §5).

Tiga kesalahan pengukuran yang secara eksplisit dihindari di sini:

1. **Proxy bukan metrik.** Rasio jumlah berkas uji **bukan** persentase coverage; jumlah berkas di `docs/` **bukan** ukuran dokumentasi (87% di antaranya artefak generated — §2).
2. **Pola glob PowerShell.** `-Path "...\**\dto\*.ts"` **tidak** menggumpal seperti glob: perintah mengembalikan kosong secara diam-diam. Hasil kosong dari perintah yang salah bentuk adalah **UNKNOWN**, bukan "nol".
3. **Skor tunggal tanpa rubrik tidak dapat difalsifikasi.** Karena itu laporan ini memakai **verdict per dimensi + bukti angka**, tanpa skor gabungan.

## 2. Peta struktur `docs/` (terukur 24 Sep 2026)

| Kelompok | Berkas | Tracked | Catatan |
|---|---:|---|---|
| `docs/audit-map/**` | 1.126 | **0** | **generated**, di-ignore `.gitignore` L87 `docs/audit-map/`; jangan dihapus; regenerasi `node docs/audit-map/generate.cjs` |
| `docs/archieve/**` | 107 | 31 | arsip legacy; 76 lainnya di-exclude **lokal** `.git/info/exclude` L9 (di clone bersih tampak untracked) |
| `docs/arsip/**` | 12 | 12 | rumah bukti/riwayat bulk (dibuat DOCS-CLEANUP-1, 24 Sep 2026); **jangan dibaca rutin** |
| **Dokumentasi aktif** | **43** | 43 | 8 top-level + `domain/` 9, `operations/` 9, `audit/` 8, `history/` 5, `product/` 4 |
| **Total `docs/`** | **1.295** | 86 md | 9.306.766 B (≈9,3 MB) |

- **83% dari "1.295 berkas" adalah `audit-map` (generated, untracked) + `archieve` (legacy)** → mengutip angka total sebagai ukuran dokumentasi akan menyesatkan. Dokumentasi kanonik yang dipelihara = **43 berkas aktif + 12 arsip**.
- **Beban baca sesi baru:** `README` 117 + `STATUS` 154 + `ATURAN` 45 + `OPERASI` 52 = **368 baris** (ambang 1.500) — hasil langsung DOCS-CLEANUP-1.
- Top-level `docs/` = **8 berkas** (`README`, `STATUS`, `ATURAN`, `OPERASI`, `PETA-KODE`, `AUDIT`, `KEPUTUSAN-OWNER`, `M13_CHANGELOG`). Root: **6 md tracked, 0 untracked** — prompt `PROMPT-IMPACT-01.md` dihapus 24 Sep 2026 setelah task penutupnya tercatat (working tree bersih).

## 3. Verdict per dimensi

| Dimensi | Verdict | Bukti |
|---|---|---|
| Hierarki otoritas & governance | **Kuat** | `AGENTS.md` §1 hierarki eksplisit; `STATUS` = antrean/gate; `KEPUTUSAN-OWNER` = register; tidak ada aturan paralel |
| Struktur & indeks dokumen | **Kuat** | 7 hub kanonik + indeks berbasis kebutuhan; rincian terpisah dari hub; arsip terpisah dari jalur kerja |
| Pengetahuan domain (aturan bisnis) | **Kuat** | `docs/domain/` 9 berkas; invarian uang/huni punya rumah kanonik tunggal (DEDUP-UANG, DEDUP-QUOTA) |
| Audit trail & bukti bertanggal | **Kuat** | 135 ID cakupan audit; 16 baris bukti bertanggal di `AUDIT.md` §4; setiap temuan punya tanggal + lingkup |
| Integritas tautan | **Cukup** | 63 berkas/1.274 tautan lokal diperiksa → **26 temuan docs-scope (27 termasuk `.github/`), 0 baru**; 12 di antaranya kelas slug em dash di `arsip/fase-lama.md` (known exception terdokumentasi) |
| Dokumentasi API (OpenAPI/Swagger) | **Cukup (asimptris)** | `@ApiOperation` **392**, `@ApiProperty` **108**, `@ApiTags` **62**, `@ApiBearerAuth` **61**, Swagger aktif di `backend/src/main.ts` — **tetapi `@ApiResponse` = 0** |
| Dokumentasi inline (JSDoc) | **Lemah** | 81/316 berkas `backend/src/modules` (26%) punya JSDoc, 292 blok; **19 dari 46 modul nol** (§5) |
| Dokumentasi komponen frontend | **Lemah** | 3 Storybook stories untuk 182 berkas di `frontend/src/components` (≈1,6%); 289 `.tsx` total |
| Onboarding lingkungan | **Lemah** | `backend/.env.example` **tidak ada** (frontend ada) |
| Bukti cakupan uji | **UNKNOWN** | 52 berkas uji backend (+1 spec) + 35 frontend; **coverage tidak diukur** — tidak boleh diklaim dari rasio berkas |
| Titik masuk untuk pendatang baru | **Cukup** | Tidak ada `README.md` di root — **tetapi** `AGENTS.md` (aturan kanonik) + `docs/README.md` (indeks) adalah titik masuk yang memang dirancang; menambah root README = perubahan **governance** (§7 P6) |

## 4. Lima kekuatan (terverifikasi)

1. **Arsitektur dokumen berlapis dan hemat:** 8 hub top-level → rincian per domain → arsip di luar jalur baca. Beban baca sesi baru 368 baris (dari 17.309 baris aktif sebelum konsolidasi).
2. **Governance AI yang dapat diaudit:** setiap batch penataan punya bukti konservasi (multiset baris non-kosong 0 hilang), offset blok, dan invariant yang dihitung pada tree yang di-commit — bukan klaim naratif.
3. **Invarian bisnis punya rumah tunggal:** dedup uang/harga dan kuota utilitas diputuskan owner dan dieksekusi dengan bukti nilai pindah ke lokasi kanonik.
4. **Disiplin bukti berjenjang:** `AUDIT.md` §5 menegaskan "audit statis bukan UAT"; status UNKNOWN dipakai apa adanya (P1-04..P1-09).
5. **Pemeliharaan tautan terukur:** checker ternormalisasi + pembandingan himpunan temuan terhadap worktree HEAD → "0 temuan baru" dapat direproduksi.

## 5. Enam gap nyata (terverifikasi, berurutan menurut risiko)

| # | Gap | Angka | Sifat |
|---|---|---|---|
| G1 | **Tidak ada skema respons API** (`@ApiResponse` = 0) | 0 dari 392 operasi | Dokumentasi kontrak **output** hilang; konsumen hanya melihat input |
| G2 | **19/46 modul backend nol JSDoc** — termasuk modul uang: `deposit-ledger`, `expenses`, `finance`, `invoice-payments`, `invoices` | 19 modul | Fungsi yang menyentuh jurnal/invarian tidak menjelaskan dirinya |
| G3 | **`backend/.env.example` tidak ada** | 0 | Onboarding & risiko salah konfigurasi; `frontend/.env.example` ada sebagai pembanding |
| G4 | **Coverage uji UNKNOWN** | 52 + 1 berkas uji backend, 35 frontend | Tidak ada angka coverage; jangan diklaim dari jumlah berkas |
| G5 | **Storybook 3 cerita / 182 komponen** | ≈1,6% | Katalog komponen praktis kosong |
| G6 | **26 temuan tautan pra-eksisting** | 12 × `arsip/fase-lama.md` (em dash), sisanya fragmen lama | Known exception; **0 baru**; perbaikan butuh batch tersendiri karena menyentuh berkas riwayat |

Tidak ada ERD/diagram arsitektur sebagai berkas: peta kode ada di `PETA-KODE.md` + `audit-map` (generated). Ini **pilihan** yang konsisten dengan "jangan membaca semua source", bukan kekurangan yang otomatis harus ditambal.

## 6. Koreksi terhadap audit eksternal (artefak di luar repo)

Audit ringkas dari sesi lain (artefak `docs_strength_audit.md` — **tidak ada di repo ini**, jadi hanya ringkasannya yang dapat diperiksa) menyimpulkan skor **7,2/10** dengan lima kelemahan kritis. Empat di antaranya tidak lolos verifikasi:

| Klaim audit eksternal | Hasil verifikasi |
|---|---|
| "JSDoc **0**" → kode tidak menjelaskan dirinya | **Salah pada tingkat repo:** 81/316 berkas (26%) punya JSDoc, 292 blok. Versi yang benar dan lebih tajam: **19/46 modul nol** (G2) |
| "Backend test coverage ~7% — 15 test file untuk 46 modul" | **Salah angka:** 52 berkas uji backend (+1 spec). **Inferensi tidak sah:** rasio berkas → coverage. Coverage = **UNKNOWN** (G4) |
| "Konsolidasi … **0 tautan rusak**" | **Salah:** 26 temuan docs-scope (27 dengan `.github/`) — semua pra-eksisting. Yang benar: **0 temuan baru** |
| "1.295 berkas / 9,3 MB di `docs/`" sebagai skala dokumentasi | **Benar angkanya, menyesatkan maknanya:** 83% adalah generated (`audit-map`) + legacy (`archieve`); dokumentasi aktif 43 berkas |
| "Tidak ada README root" sebagai kelemahan | **Benar literal, salah kesimpulan:** `AGENTS.md` + `docs/README.md` adalah titik masuk yang dirancang (§3 baris terakhir) |
| Penyebab kesalahan | Perintah dengan glob `**` (kosong diam-diam → dibaca sebagai "nol"), dua subagent dihentikan lalu disimpulkan "semua data ada", dan skor tunggal tanpa rubrik |

Yang **tetap sah** dari audit itu: 3 Storybook stories, `backend/.env.example` hilang, `289 .tsx`, "tidak ada README root" — semuanya cocok dengan pengukuran di §3/§5.

## 7. Rekomendasi berprioritas

| # | Tindakan | Pemilik / izin |
|---|---|---|
| P1 | Tambahkan **`@ApiResponse`/DTO respons** pada endpoint uang & pembayaran lebih dulu (G1) | Task kode tersendiri (bukan docs-only) |
| P2 | **JSDoc minimal** pada 19 modul, urutan: modul uang (G2) | Task kode; bisa dipecah per modul |
| P3 | **SELESAI 24 Sep 2026 (`5cd9c193`)** — `backend/.env.example` dibuat: **85 nama kunci, 0 nilai**, dikelompokkan 12 bagian, kunci library/OS dipisah; dirujuk dari `docs/OPERASI.md` §1 (G3) | selesai |
| P4 | Ukur **coverage nyata** backend + frontend sekali, lalu catat angkanya di `AUDIT.md` (G4) | Butuh izin; menjalankan uji unit backend memicu full build |
| P5 | Storybook: putuskan apakah katalog komponen dijadikan target, atau dinyatakan tidak dipakai (G5) | **Keputusan produk** |
| P6 | Root `README.md`: buat **pointer tipis** ke `AGENTS.md` + `docs/README.md`, atau nyatakan tidak perlu | **Keputusan owner** — perubahan governance (AGENTS §10) |

## 8. UNKNOWN (tidak diklaim)

- Persentase coverage uji backend/frontend (belum dijalankan).
- Kualitas runtime, performa, dan aksesibilitas (tidak diukur di sini).
- Isi lengkap artefak audit eksternal (tidak ada di repo).
- Apakah `@ApiProperty` 108 menutupi seluruh DTO (hanya jumlah dekorator yang diukur, bukan cakupan per-DTO).
- Apakah nilai JSDoc 292 blok berkualitas (hanya keberadaan yang diukur, bukan isi).

**Batas laporan ini:** pengukuran struktur dan keberadaan dokumentasi. **Bukan** penilaian kebenaran isi aturan bisnis, dan **bukan** pengganti audit modul (K1–K4) atau gate DoD mana pun.
