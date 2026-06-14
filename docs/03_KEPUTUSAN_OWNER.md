# KEPUTUSAN OWNER — 2026-06-13 (+ addendum 2026-06-14: D-18/D-19, S-2)
**Sumber:** wawancara owner 2026-06-13 + catatan owner 2026-06-14. Dokumen ini MENGIKAT; bila konflik dengan dokumen lain, file ini menang. Dossier menjelaskan status kode dan cara implementasi, bukan mengganti keputusan bisnis di sini.

## 🔴 TEMUAN BESAR DARI WAWANCARA — D-06: DATABASE MASIH DATA TESTING, BELUM PUBLISH
> Kutipan owner: *"Itu hanya testing, lebih baik data dihapus semua juga tidak masalah sebab kita belum publish kok."*

**Konsekuensi yang mengubah seluruh rencana:**
1. **Tidak ada migrasi data lama.** Deploy produksi = START BERSIH (fresh DB + seed COA + opening balance produksi), BUKAN memindahkan data UAT.
2. **Semua kekhawatiran "data lama" GUGUR:** F-24 (saldo 2000 historis), F-06/F-07 backfill deposit lama, E-2 backfill 11 stay promoted, F-15 historis — semua tidak relevan untuk data testing yang akan dihapus.
3. **Tetap perbaiki KODE-nya** (agar produksi ke depan bersih): F1-8 (guard settlement), F1-3..F1-7 (laporan) tetap wajib — yang gugur hanya tugas "perbaiki data historis".
4. **Deploy = FRESH** (drop DB → seed COA → opening balance), BUKAN migrasi. Runbook: `04_DEPLOY_AND_PWA.md`.

---

## D — KEPUTUSAN UTAMA (D-01 s/d D-20)

| ID | Keputusan | Dampak |
|----|-----------|--------|
| D-01 | **Alamat = Jl. Hikmah V No. 48, Surabaya Barat** (Pakuwon Mall/PTC). Frontend benar; docs lama salah "Ngagel Jaya Utara" → dikoreksi. | SEO, copy, header semua pakai Surabaya Barat. |
| D-02 | **NO PARTIAL PAYMENT di semua jalur.** Nominal pembayaran sah HANYA: (a) DP 30% persis, atau (b) pelunasan penuh = sisa invoice + sisa deposit. Jalur invoice-only (renewal/utilitas) wajib LUNAS penuh. | Task F1-1R: replikasi gate di approve. |
| D-03 | **DRAFT invoice TIDAK memblokir forced checkout.** Exclude dan auto-cancel DRAFT agar satu draft terlupakan tidak membuat overstay tertahan selamanya. Checkout normal tetap mengikuti guard invoice terbuka. | Task F3-13. |
| D-04 | **Expiry booking = 3 JAM FLAT semua jalur** (bukan cutoff 21:00 WIB). Booking malam berlaku 3 jam berikutnya. | F1-11 selesai. |
| D-05 | **Admin tidak boleh ubah deposit.** Deposit jaminan SELALU = `Room.defaultDepositRupiah`. | Task F1-10. |
| D-06 | **DATABASE MASIH TESTING → deploy FRESH.** Lihat bagian atas. | Task F1-12. |
| D-07 | **KTP wajib sebelum aktivasi kamar.** Upload foto KTP saat check-in; tanpa verified → blokir OCCUPIED. Simpan terproteksi, hapus saat keluar. Cukup FOTO (tidak baca NIK). | Task F3-17. |
| D-08 | **Deposit = dana titipan / LIABILITY, BUKAN revenue.** Jangan tampilkan di cashflow operasional; pisahkan ke section liabilitas. | Task F1-9 (F-10). |
| D-09 | **Social proof publik = rating≥4 anonim + count penghuni.** Boleh tampilkan inisial (UU PDP). | Task F3-4. |
| D-10 | **Pengumuman hanya untuk tenant OCCUPIED** (N-03). Tenant booking TIDAK terima. Kode sudah benar. | Pertahankan. |
| D-11 | **First-paid-wins tetap.** Multi-booking RESERVED diizinkan; pembayaran pertama disetujui mengunci kamar. | Pertahankan. |
| D-12 | **Retensi > akuisisi.** Prioritas: renewal F2-1 > SEO F3-3. Tapi kerjakan keduanya. | ⬆️ |
| D-13 | **Keluar lebih awal: sewa HANGUS, deposit kembali normal.** | Pertahankan. |
| D-14 | **Tenant kabur: admin tandai manual** (nunggak X hari + tak terhubung) → checkout dini + potong deposit. Deposit kurang → PIUTANG tenant (AR), bukan write-off. | Task F3-14. |
| D-15 | **Occupancy heatmap = prioritas visualisasi #1.** 12 bulan ke belakang + 3 bulan ke depan, grid kalender CSS. | Task F3-12. |
| D-16 | **RENT-LOYALTY — tenant yang perpanjang (renew) tanpa putus kontrak TIDAK mengalami kenaikan harga sewa.** Harga hanya bisa naik setelah gagal-bayar atau re-kontrak baru (tenant keluar lalu booking baru). Memperkuat retensi — tenant loyal dilindungi dari inflasi sewa. | Cross-ref dossier 11, 17, 19. |
| D-17 | **Empat area OWNER-only:** tutup/buka periode akuntansi; hapus/nonaktif user atau staf; setelan kamar dan harga; proses deposit/refund settlement. ADMIN hanya boleh membaca atau menjalankan operasi lain yang secara eksplisit diizinkan. | Task F2-16. |
| D-18 | **RENEWAL/PRABAYAR FLEKSIBEL KAPAN SAJA** (2026-06-14). Tenant boleh perpanjang / **bayar di muka 2-4 bulan ke depan dengan harga BULANAN**, KAPAN SAJA — **tak harus menunggu kontrak lama habis**. Ini menambah jalur "prabayar/perpanjang lebih awal" di samping renewal akhir-kontrak (R1-R5, prompt H-10). Prabayar >1 bulan = **pendapatan diterima di muka** (akui bertahap → F4-1 unearned revenue). Rent-lock D-16 tetap berlaku (harga tak naik selama renew berlanjut). | Backlog **F4-11**; terkait F4-1. |
| D-19 | **FAQ DETAIL + "MANUAL BOOK" DI TENANT APP** (2026-06-14). Semua aturan/flow kos di-generate jadi **FAQ sangat detail** lalu disajikan sebagai **menu "Panduan/Aturan" di tenant app** — tenant bisa baca manual aturan kos secara mandiri. **Openness, TAPI jangan bikin tenant pusing** (ringkas, terstruktur, berkategori). Sumber konten: `03_KEPUTUSAN_OWNER` + dossier flow; input tambahan via **interview owner** atau **analisa percakapan WhatsApp** (pertanyaan & keluhan tenant yang sering). Fondasi `FaqsModule` sudah ada. | Backlog **F4-12**; dossier 17/16. |
| D-20 | **PINDAH KAMAR RESMI** (2026-06-15). Stay SAMA (roomId diperbarui); deposit ikut apa adanya; harga dikunci (D-16) kecuali **override OWNER-only** (D-17); meter kamar baru di-snapshot; kamar lama→inspeksi, kamar baru→OCCUPIED. Detail di §D-20. | **F4-8 SELESAI**. |

---

## R — ATURAN RETENSI & RENEWAL (R1-R5)

| ID | Keputusan | Dampak |
|----|-----------|--------|
| R1 | Tenant lama punya **prioritas eksklusif sampai hari-H tanpa wajib DP dulu**. | F2-1 state machine. |
| R2 | DP 30% perpanjangan → **pelunasan maks H+7 dari DP.** Grace boleh lewat kontrak. | F2-1. |
| R3 | **Gagal lunas H+7 → forced checkout + DP hangus + potong deposit.** | F2-1/F3-14. |
| R4 | Prompt via **notif H-10 + tenant boleh ajukan sendiri.** | F2-2 notif. |
| R5 | **TIDAK → kamar langsung dibuka publik** mulai tanggal checkout. | F2-1 state machine. |

## B — BISNIS & OPERASIONAL (B1-B5)

| ID | Keputusan |
|----|-----------|
| B1 | Reminder kontrak: **H-10, H-7, H-3, H-1, H-day** (tambah H-10 dari yang ada). |
| B2 | Tenant kabur ditandai manual, **nunggak X hari + tak terhubung → checkout dini + potong deposit.** |
| B3 | Barang ditinggal: **batas 30 hari → ABANDONED + notif.** Tindakan fisik manual. |
| B4 | Admin boleh **PAKSA checkout tenant nunggak + potong sisa dari deposit.** Deposit kurang = PIUTANG. |
| B5 | Overstay H+1 forced checkout; nunggak → tidak auto-checkout, admin alert. |

## E — FONDASI & KEAMANAN

- E-1: APP_GUARD global default-deny TERPASANG (V5.12.2)
- E-2: Backfill data lama TIDAK berlaku (D-06)
- E-3: Jaminan check-in manual (ledger+jurnal) — PASS
- E-4: Saldo kas dari jurnal — PASS
- E-5: Liability HELD — PASS
- E-9: Hardening — PASS
- E-6: TZ WIB → tunda F2-14
- E-7: Round-robin → tunda (1 staf)
- E-8: Test suite luas ditunda; harness finance minimum F1-T tetap wajib sebelum task uang.

## F — KEUANGAN & AKUNTANSI

- F-01: Cashflow salah deteksi AR sebagai cash → F1-3
- F-02: Operator precedence bug expense ratio → F1-4
- F-09: DRAFT masuk revenue → F1-7
- F-10: Deposit masuk operating cashflow → F1-9
- F-17: Balance sheet imbalance → F1-5
- F-18: Ratio AR sebagai cash → F1-4
- F-24: Settlement tanpa receipt journal → F1-8

## K — KPI & TIKET

- K-5: monthRange UTC → F2-14 WIB
- K-1: resolved time dari assignedAt → bagian F3-19
- K-6/K-8: notif penerima salah → F3-1

## L — LOYALITAS (BARU)

- **D-16:** Rent-loyalty — no rent hike while renewing (cross-ref D-16 di atas).

## S — APPROVAL SCHEMA

- **S-1 (2026-06-13): Owner MENYETUJUI seluruh perubahan schema ADDITIVE** untuk task ber-marker 🧬/[SCHEMA]: F2-1 (RenewRequest +status/+field), F2-3b (bukti refund), F2-18 (StaffReview.status), F3-14 (Stay.fledMarkedAt), F3-15 (Stay.belongingsDeadline+ABANDONED), F3-17 (Tenant.ktp*), F4-9 (LoyaltyPoint/Reward/Redemption). Dikerjakan berurutan sesuai prioritas `08_CHECKLIST`. **Hanya additive** (tambah enum value/kolom nullable); tak menghapus/mengubah kolom lama. Deploy fresh → schema masuk `schema.prisma` (+ `sql/bootstrap.sql` bila perlu constraint).
- **S-2 (2026-06-14): Owner MENYETUJUI seluruh schema additive Fase 4** (proposal `docs/_PROPOSAL_SCHEMA_F4.md`): **F4-2** (PushSubscription + enum PushDeliveryStatus + AppNotification.pushStatus/pushAttempts/pushedAt), **F4-1** (RentRecognitionSchedule, pakai COA 2200), **F4-9** (LoyaltyPoint/LoyaltyReward/Redemption + 3 enum), **F4-8** (RoomTransfer). Plus **izin dependency npm `web-push`** (F4-2) dan pola **outbox in-place** (kolom di AppNotification, bukan tabel terpisah). Urutan eksekusi: **F4-2 → F4-1 → F4-9 → F4-8**.

---

## D-18/D-19 — DETAIL TAMBAHAN (2026-06-14)

### D-18 — Renewal / prabayar fleksibel kapan saja (backlog F4-11)
- **Aturan:** tenant boleh memperpanjang atau **membayar di muka untuk 2-4 bulan ke depan** dengan **harga bulanan**, **kapan saja** — tidak harus menunggu kontrak lama hampir/sudah habis.
- **Hubungan dengan renewal yang ada (R1-R5):** ini jalur TAMBAHAN ("early renewal / prepay"), bukan pengganti. Prompt H-10 + prioritas tenant lama (R1) tetap berlaku untuk renewal mendekati akhir kontrak; D-18 memperluas agar tenant bisa inisiatif lebih awal.
- **Akuntansi:** prabayar lebih dari 1 bulan = **pendapatan diterima di muka (unearned revenue, COA 2200)** → diakui bertahap per bulan. **Terikat ke F4-1** (RentRecognitionSchedule). Jangan akui seluruh prabayar sebagai pendapatan bulan berjalan.
- **Harga:** mengikuti **rent-lock D-16** — selama tenant terus renew tanpa putus kontrak, harga tidak naik.
- **Desain yang perlu (saat F4-11 dimulai):** titik masuk UI kapan saja (tenant app), pilih jumlah bulan, hitung total = bulan × tarif bulanan, alur pembayaran (no-partial D-02), perpanjangan `plannedCheckOutDate` stay, dan penjadwalan pengakuan pendapatan.

### D-20 — Pindah kamar resmi (F4-8, keputusan desain 2026-06-15)
- **Stay yang SAMA** dipertahankan (hanya `roomId` diperbarui + dicatat `RoomTransfer`) → histori/loyalitas/masa sewa utuh, tak putus kontrak.
- **Deposit jaminan ikut pindah apa adanya** (tak dihitung ulang; tak ada transaksi uang deposit saat pindah).
- **Harga sewa dikunci** (rent-loyalty D-16) **kecuali override manual oleh OWNER** (mis. upgrade VIP yang tenant setujui; ADMIN tak boleh ubah harga — D-17).
- **Meter kamar baru di-snapshot baseline** saat pindah (seperti check-in).
- **Kamar lama → MAINTENANCE + tiket CHECKOUT_INSPECTION** (lalu AVAILABLE saat inspeksi ditutup); **kamar baru → OCCUPIED**.

### D-19 — FAQ detail + "manual book" tenant app (backlog F4-12)
- **Tujuan:** tenant dapat membaca **manual/aturan kos** secara mandiri di tenant app → transparansi (openness) + mengurangi pertanyaan berulang ke admin/staf (selaras filosofi tenant-pengawas).
- **Konten:** FAQ **sangat detail**, di-generate dari **semua aturan/flow** (`03_KEPUTUSAN_OWNER` + dossier 10-19) — pembayaran, DP vs deposit, booking, renewal, checkout, deposit refund, overstay, KTP, tiket/keluhan, dll.
- **Penyajian:** menu **"Panduan / Aturan"** di tenant app, **ringkas & berkategori**, JANGAN bikin tenant pusing (hindari tembok teks; pakai kategori + ekspandable + bahasa sederhana).
- **Sumber input tambahan:** (a) **interview owner** soal kemungkinan pertanyaan tenant; (b) owner **paste percakapan WhatsApp** untuk dianalisa (pertanyaan & keluhan yang sering muncul) → diangkat jadi FAQ.
- **Fondasi teknis:** `FaqsModule` (backend `src/modules/faqs/`) sudah ada. Dossier acuan: 17 (publik/UIUX) + 16 (komunikasi).

---

**Akhir dokumen.** Semua keputusan di atas mengikat. Detail implementasi & kode spesifik → dossier domain `10`-`19`. Peta fase → `00_BLUEPRINT.md §4`.
