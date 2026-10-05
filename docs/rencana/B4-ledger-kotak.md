# B4 — ledger kebijakan kotak & indeks cakupan (potret 2026-10-05)

> **Blok baca** · Jenis: **kartu bukti batch** · Status: **beku setelah B4** · Untuk siapa: owner + agen verifikator
> · Baca kalau: mempertanyakan mengapa sebuah kotak `[ ]` tidak lagi dihitung sebagai antrean, atau mencari indeks cakupan audit.

Rumah aturan: [RENCANA-ROMPAK-DOCS.md](RENCANA-ROMPAK-DOCS.md) §4 (B4) · keputusan owner: [PERTANYAAN-ROMPAK.md](PERTANYAAN-ROMPAK.md) (Q12, Q13, P16, P17).

## 1. Masalah yang ditutup

Gate menemukan **368 kotak `[ ]` di 12 berkas** di luar rumah antrean. Kotak di berkas aturan/runbook/riwayat terlihat seperti daftar tugas, padahal bukan — itu sumber kebingungan "apakah ini pekerjaan yang menunggu?". Q12: kotak di luar antrean **non-otoritatif**; P16 memilih perlakuannya per berkas.

## 2. Perlakuan per berkas (keputusan + hasil)

| Berkas | Kotak | Perlakuan | Hasil |
|---|---:|---|---|
| `docs/audit/audit-checklist-total.md` | 117 | **dipindah ke arsip** (Q13) + banner + inventaris | 110 KB keluar dari folder aktif; digantikan [audit/index-cakupan.md](../audit/index-cakupan.md) |
| `docs/operations/deploy-go-live.md` | 52 | **penanda non-otoritatif** (P16 opsi b) | kotak tetap, dikenali gate sebagai bukan antrean |
| `docs/domain/iot.md` | 42 | **konversi ke daftar biasa** (P16 opsi a — disetujui owner) | 42 baris jadi `- …`; `[x]` 2 dibiarkan |
| `docs/STATUS.md` | 29 | **rumah antrean** (sementara sampai B5) | tidak diubah; gate mengecualikan berkas ini |
| `docs/audit/status-ao-lintas-portal.md` | 27 | **catatan bertanggal** (audit/) | tidak diubah; dikeluarkan dari R3 |
| `docs/operations/iot-water-meter-esp32.md` | 26 | konversi ke daftar biasa (P16 a) | 26 baris |
| `docs/operations/go-live-cpanel.md` | 18 | **penanda non-otoritatif** (deviasi teknis — lihat §4) | kotak tetap, bukan antrean |
| `docs/operations/iot-tuya-setup.md` | 18 | konversi ke daftar biasa (P16 a) | 18 baris |
| `AI_QUICKREF.md` | 17 | konversi ke daftar biasa (P16 a) | 17 baris |
| `docs/history/governance.md` | 9 | **catatan bertanggal** (history/) | tidak diubah; dikeluarkan dari R3 |
| `docs/operations/produksi.md` | 8 | **penanda non-otoritatif** (deviasi teknis — lihat §4) | kotak tetap, bukan antrean |
| `docs/operations/verifikasi-keuangan.md` | 5 | konversi ke daftar biasa (P16 a) | 5 baris |

Ringkas: **117 kotak keluar ke arsip** · **108 dikonversi** (42+26+18+5+17) · **78 dipertahankan sebagai langkah operasional bertanda** (52+18+8) · **65 direklasifikasi sebagai catatan/antrean** (29+27+9).

## 3. Bukti konversi (bukan klaim)

- Sebelum konversi, 5 berkas dicadangkan ke `.design-audit/B4-pre/`.
- Setelah konversi, isi berkas dibandingkan dengan cadangan **setelah menormalkan pola `[-*] [ ] ` → `- `**: hasilnya **identik 5/5**. Artinya hanya penanda kotak yang hilang — tidak satu kata pun berubah.
- Jumlah baris tiap berkas tidak berubah (mis. `domain/iot.md` tetap 822 baris).
- `[x]` **tidak** disentuh (di `domain/iot.md` tersisa 2) — riwayat penyelesaian di dalam aturan tidak dihapus.

## 4. Aturan gate yang ditambahkan (v1.5 + R7)

| Aturan | Isi |
|---|---|
| **R3 (direvisi)** | Kotak `[ ]` hanya otoritatif di **rumah antrean** (`docs/ANTREAN.md`; sementara `docs/STATUS.md` sampai B5). Dikecualikan: **catatan bertanggal** (`docs/history/**`, `docs/audit/**`, `docs/arsip/**`) dan berkas ber-penanda `<!-- kotak-non-otoritatif -->`. |
| **R3 (transparansi)** | Berkas yang dikecualikan **tetap dicetak** beserta jumlah kotaknya dan sebabnya. Pengurangan pelanggaran tidak boleh senyap. |
| **R7 (baru)** | `docs/audit/index-cakupan.md` **wajib ada** dan **tidak boleh** memuat kotak otoritatif (Q13/P17). |

Sesudah B4 gate melaporkan: R1 2 · R2 **0** · R3 **0** · R4 4 · R5 4 · R7 **0** → **10 pelanggaran + 1 dilewati** (sebelumnya 23 + 1), dengan **143 kotak di 6 berkas** dinyatakan bukan antrean secara terbuka.

**Deviasi teknis yang saya putuskan sendiri (bentuk sama, pilihan per berkas):** P16 menyebut opsi (b) penanda untuk `deploy-go-live.md` dan (a) konversi untuk "10 berkas lain". Untuk **dua runbook lain yang dijalankan manusia langkah demi langkah** (`go-live-cpanel.md`, `produksi.md`) saya memakai **penanda (b)**, bukan konversi — menghapus kotak dari runbook yang sedang dipakai menurunkan utilitasnya, sedangkan penanda menyelesaikan ambiguitas yang sama. Kalau owner ingin ketiganya dikonversi, satu perintah cukup.

## 5. Indeks cakupan pengganti

[audit/index-cakupan.md](../audit/index-cakupan.md) — ±60 baris, **tanpa kotak**: potret cakupan per bagian (Backend 51/52 belum, Frontend 50/67, Database 1/1, Pengujian 8/8, Tooling 7/7) + jalan masuk ke checklist yang diarsipkan + aturan "indeks ini bukan antrean". Dijaga **R7**.

## 6. Tautan yang direbase

Pemindahan checklist memutus **46 tautan**. Semuanya diperbaiki dengan **rebase tujuan** (isi catatan tidak disentuh, pola yang sama dipakai Fase 3): **49 tautan** di 8 berkas (terbanyak `history/changelog/2026-09.md` 39 tautan) + **5 sebutan path** repo-relatif. Sesudahnya **R2 = 0**.

## 7. Yang belum dikerjakan dari B4

- **Pindah butir yang benar-benar pekerjaan terbuka ke antrean** (P16 opsi c): butuh pemilahan baris-per-baris; dilakukan saat **B5** menyusun `docs/ANTREAN.md` — bukan pemilahan otomatis.
- **DITUTUP 2026-10-05:** 5 rujukan ke `08_CHECKLIST`/`tenant-data-template.tsv` — dua di dokumen operasional kini menunjuk jalur nyatanya di `.docs-legacy/`, sisanya di catatan historis dibiarkan — [kartu penutup](PENUTUP-SITASI-RUSAK.md) §5.

## 8. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-05 | Dibuat saat B4: 117 kotak ke arsip, 108 dikonversi (bukti normalisasi 5/5 identik), 78 bertanda, 65 direklasifikasi; gate v1.5 + R7; indeks cakupan dibuat; 49 tautan direbase. |
