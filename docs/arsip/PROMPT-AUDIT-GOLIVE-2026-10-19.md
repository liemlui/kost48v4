> **ARSIP BEKU** · dipindah dari `docs/kerja/` ke `docs/arsip/` pada 2026-10-21 (DOCS-GEN2 D4d). Isi dipindah/dipertahankan sebagai referensi; **jangan dibaca rutin**.

# PROMPT — Audit kesiapan go-live/open beta + inventaris data awal + proteksi finance (potret 2026-10-19)

> **Blok baca** · Jenis: **prompt tugas (salin-tempel)** · Status: **aktif** · Untuk siapa: sesi agen berikutnya · Baca kalau: menyiapkan go-public/open beta · **Jangan** dibaca kalau: mencari status pekerjaan (itu [ANTREAN](../ANTREAN.md)) atau riwayat (itu [history](../history/README.md)).

**Tempel isi §1–§9 sebagai pesan pertama sesi baru.** Target: satu putaran audit, laporan langsung di berkas, tanpa deploy/commit.

## 1. Peran, bahasa, dan pagar

- Bahasa Indonesia. Repo ini: NestJS + React/Vite, produksi `https://kost48surabaya.com`.
- Baca **hanya** berkas ini: `AGENTS.md`, `docs/KONTRAK.md` (§2, §6, §11), `docs/operations/produksi.md`, `docs/kerja/TANYA-OWNER.md`, `docs/OPERASI.md`, `docs/ANTREAN.md` (hanya judul §3). **Jangan** membaca arsip, `.audit-map`, changelog penuh, atau seluruh `docs/`.
- **Tanpa** commit, push, deploy, ubah kode, ubah DB, atau mencetak `.env`/sandi/NIK. DB hanya `SELECT` baca-saja lewat skrip sementara yang dihapus setelah dipakai.
- Jangan menembus gate KTP, batas pembayaran, atau guard lain. Bila lingkungan menghalangi, laporkan — jangan matikan pagar.

## 2. Keadaan acuan (potret 2026-10-19 — WAJIB diverifikasi ulang, jangan dikutip sebagai fakta)

13 kamar · 11 stay ACTIVE · 11 invoice PAID / 11 pembayaran Rp 14.600.000 · 23 jurnal POSTED debit = kredit Rp 29.400.000 · COA 38 akun · periode 2026-09 & 2026-10 OPEN · 2 akun kas · 13 baris tenant dengan **0** KTP terverifikasi · akun OWNER 1 / TENANT 12 / ADMIN-STAFF 0 · gate KTP aktif · kunci Brevo tersimpan tetapi IP server ditolak (401) · build live `dyPs68LPy2yq` · T1/T2 sudah deploy · **AL-FIX-7 (guard ketersediaan) lokal, belum deploy** · P17/P18 terbuka.

**Lingkungan:** `pwsh` di sandbox `workspace-write` gagal total (exit `0xC0000142`, DLL init). Jalankan perintah dengan akses penuh **satu paket bukti per permintaan izin**; jangan mengubah kode untuk mencari jalan.

## 3. Tiga keluaran wajib

- **A. Verdict** go-public/open beta: `GO` / `CONDITIONAL` / `NO-GO` + blocker bernomor.
- **B. Inventaris data awal + blueprint wizard** (§6): apa yang wajib diisi owner, di mana disimpan, validasinya, dan urutan wizard bila perlu dibangun.
- **C. Matriks proteksi finance** (§7): kontrol, bukti, status, celah.

## 4. Gerbang kesiapan (isi status + bukti per baris)

| Gate | Yang harus dibuktikan | Cara termurah |
|---|---|---|
| G1 Keuangan | trial balance seimbang; outstanding 0; periode OPEN/CLOSED benar; saldo awal jelas; kas = jurnal | 1 skrip SQL baca-saja + 1 panggilan endpoint OWNER |
| G2 Hunian | 1 stay aktif per kamar; `Room.status` cocok dengan stay; gate KTP; alur checkout→bersih→AVAILABLE | SQL cek duplikat + `rg` guard check-in/booking |
| G3 Akses | login OWNER; ADMIN/STAFF; reset email (Brevo IP); PIN `/okupansi`; rate limit; isolasi tenant | endpoint + `rg` guard |
| G4 Operasional | build live = `version.json`; smoke publik; `/checklist`; backup DB+uploads; monitoring | curl di server + `rg` runbook |
| G5 Data | kelengkapan kamar/foto/fasilitas/tarif/deposit; tenant/KTP; email pengirim terverifikasi | SQL hitung kosong + `rg` field wajib |

Status: `PROVEN` (bukti langsung), `WEAK` (ada tapi tidak diuji/kontrak), `MISSING`, `UNKNOWN` (tidak diukur). **GO hanya bila G1–G5 `PROVEN` dan 0 blocker P0/P1.**

## 5. Pemeriksaan hemat token (gunakan ini, jangan membaca file panjang)

- Setting & rahasia: `rg -n "process\.env\.|getOperational|brevoApiKey|ktpVerificationGateEnabled|mailFrom" backend/src/modules/settings backend/src/common/config`.
- COA & akun kas: `rg -n "DEFAULT_COA|cashAccount|currentBalanceRupiah" backend/src/modules/accounting`.
- Jurnal & posting: `rg -n "postJournal|assertReady|debitRupiah|creditRupiah|period.*OPEN|CLOSED" backend/src/modules/accounting`.
- Invoice/bayar: `rg -n "status.*PAID|outstanding|idempoten|unique|reversal|delete" backend/src/modules/{invoices,invoice-payments}`.
- Stay/kamar: `rg -n "existingRoomStay|RoomStatus\.|initialMetersPromotedAt|allowBookingWhileCleaning" backend/src/modules/{stays,marketing,rooms}`.
- Skema/constraint: `rg -n "@@unique|@@index|onDelete" backend/prisma/schema.prisma`; constraint nyata: `SELECT conname, contype FROM pg_constraint` untuk tabel uang.
- Satu skrip SQL (read-only) untuk: jurnal tidak seimbang per entry, duplikat stay aktif per kamar, `Room.status` vs stay, opening balance batch, field kosong (foto/fasilitas/tarif).
- Satu skrip health untuk: `/version.json`, `/api/public/rooms`, `/login`, `/checklist/`, dan satu panggilan OWNER (`monthly-income`, `cash-accounts`).

## 6. Inventaris data awal + blueprint wizard

**Inventaris.** Telusuri sumbernya lalu isi tabel: `field | wajib? | sumber (env/DB/UI) | validasi | nilai sekarang (terisi/kosong) | akibat bila kosong`. Cakup minimal: identitas kos & rekening; kamar (kode, tarif, deposit, foto, fasilitas); COA + saldo awal kas/bank per tanggal; akun OWNER/ADMIN/STAFF; email pengirim + IP Brevo; gate KTP; PIN `/okupansi`; kontak publik/WhatsApp; jam operasional; kebijakan DP/pembatalan. Sebut **mana yang sudah punya UI** dan mana yang hanya bisa lewat env/seed.

**Wizard.** Rancang 6–7 langkah berurutan (mis. 1 identitas+rekening → 2 kamar+tarif+deposit → 3 COA+saldo awal → 4 staf+role → 5 email+uji kirim → 6 KTP+gate → 7 publikasi katalog). Tiap langkah: field, validasi, idempotensi (aman diulang), rollback, permission, bukti "selesai", dan ketergantungan ke langkah lain. Nyatakan bagian mana yang **sudah ada** vs **harus dibangun**.

## 7. Proteksi finance terkuat (isi ≥12 baris)

Periksa minimal: (1) jurnal seimbang di level DB, bukan hanya aplikasi; (2) entry POSTED tidak bisa diubah/dihapus; (3) periode terkunci menolak posting; (4) satu jalur posting; (5) idempotensi sumber (unique sourceType+sourceId); (6) bayar tidak melebihi sisa tagihan; (7) hapus pembayaran ditolak, koreksi lewat reversal; (8) deposit liability seimbang; (9) pembulatan rupiah terpusat; (10) rekonsiliasi kas vs jurnal; (11) audit log mutasi uang; (12) transaksi atomik/row lock untuk konkurensi; (13) backup + uji restore; (14) guard role & isolasi tenant.

Tabel: `kontrol | mekanisme | bukti (file/constraint/test) | status | celah | perbaikan terkecil`. Status `PROVEN` hanya bila ada bukti yang bisa gagal (constraint/trigger/uji), bukan sekadar nama fungsi.

## 8. Format laporan (wajib, urutan ini, ≤300 baris)

1. **Verdict** 10 baris: keputusan + 3 risiko terbesar + syarat minimum untuk naik ke GO.
2. **Tabel gate G1–G5**: status, bukti (perintah/berkas), blocker.
3. **Blocker**: ID, severity (P0/P1/P2), dampak uang/data/pengguna, pemilik keputusan, perbaikan, estimasi.
4. **Inventaris data awal**: tabel penuh + ringkasan "yang paling sering kosong".
5. **Blueprint wizard**: langkah, field, validasi, idempotensi, UI ada/belum.
6. **Matriks finance**: 12+ baris + 3 celah terbesar.
7. **Yang TIDAK diperiksa** + alasannya (jujur; jangan mengklaim "aman" untuk yang tidak diukur).
8. **Pertanyaan owner**: format lima unsur (konteks · pilihan a/b/c · konsekuensi+risiko · rekomendasi · default), **ditulis dulu** ke `docs/kerja/TANYA-OWNER.md`, baru dipaparkan di chat.

Aturan bukti: setiap klaim "aman/kuat/lengkap" wajib menunjuk bukti; tanpa bukti tulis `UNKNOWN`. Pisahkan implementasi · verifikasi · deployment · dampak runtime.

## 9. Definisi selesai

- G1–G5 berstatus dengan bukti; ≥12 kontrol finance; ≥25 baris inventaris; wizard ≥6 langkah; 0 klaim tanpa bukti; bila menulis dokumen, `node scripts/check-docs.mjs` hijau.
- Berhenti dan laporkan bila: akses server gagal, DB tidak bisa dibaca, atau ada blocker P0 yang butuh keputusan owner.
