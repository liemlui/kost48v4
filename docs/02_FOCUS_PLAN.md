# KOST48 V5 — Peta Fokus Flow Bisnis & Strategi Token
**Versi:** 2026-06-11 — di atas baseline V5.12.2. (Dahulu `07_BUSINESS_FLOW_FOCUS_2026-06-11.md`.) Companion: `01_FLOW_MAP.md` (peta kode per flow), `archieve/06_AUDIT_PASS_AB_2026-06-11.md` (temuan A1–A18, semua tertangani).
**Tujuan:** (1) Inventori lengkap flow bisnis dan menjawab "kita belum fokus kuat di bagian mana?"; (2) mencatat 4 keputusan owner hari ini (D1–D4); (3) strategi hemat token/quota untuk pengembangan ke depan.

<!-- KOST48_DOCS_SYNC_20260611_FLOW_FOCUS -->

---

## 1. Inventori Flow Bisnis — Total: 12 flow utama + 9 job otomatis

Sistem terdiri dari **12 flow bisnis utama** (penomoran mengikuti `01_FLOW_MAP.md`) dan **9 job auto-ops** ("jam biologis" yang berjalan tanpa manusia). Klasifikasi per peran bisnis:

### Kelompok UANG (jalur rupiah — prioritas tertinggi)
| # | Flow | Inti |
|---|---|---|
| 2 | Publik → Booking | Katalog publik, booking tanpa login, booking portal, DP 30%, approve/reject admin |
| 3 | Pembayaran (jantung sistem) | Upload bukti → review admin → approve = aktivasi kamar + jurnal + ledger |
| 4 | Invoice & pembayaran manual | CRUD invoice, issue/cancel, pembayaran manual admin, meter reading |
| 6 | Checkout & Deposit jaminan | Pengajuan → final checkout → inspeksi → settlement deposit + ledger |
| 11 | Akuntansi (Auto Journal Lite + tutup buku) | Jurnal otomatis dari 8+ sumber, readiness gate, auto-close bulanan |

### Kelompok WAKTU (otomatis, tanpa manusia)
| # | Flow | Inti |
|---|---|---|
| 7 | Auto-ops — **9 job** (urut sequential): | ① bookingExpiry ② roomHealer ③ roomReleaseAtNoon ④ downPaymentForfeit ⑤ contractEndReminders (H-7/H-3/H-1/H-day) ⑥ overstayEnforcement (tiket EVICT) ⑦ overstayForcedCheckout (H+1) ⑧ postCheckoutAutoCancel ⑨ accountingAutoClose |

### Kelompok OPERASIONAL FISIK
| # | Flow | Inti |
|---|---|---|
| 5 | Perpanjangan (Renew) | Pengajuan tenant → approve admin → periode baru + invoice (wajib meter) |
| 8 | Tiket & operasional staf | Tiket (manual/otomatis), rutinitas staf, laporan lapangan, KPI, review tenant→staf |
| 9 | Inventaris & barang kamar | Stok gudang, movement, barang per kamar, sinkronisasi 3 jalur |

### Kelompok PENDUKUNG
| # | Flow | Inti |
|---|---|---|
| 1 | Auth & identitas | Login, reset password, manajemen user/tenant, rate limiting (V5.12.2) |
| 10 | Keuangan operasional | Expense, WiFi sales, aset tetap + depresiasi |
| 12 | Pelaporan, analytics, AI, notifikasi | 8 laporan, dashboard finansial, AI helper, notifikasi in-app, pengumuman |

---

## 2. Matriks Fokus — di mana kuat, di mana lemah

Skala: 🟢 KUAT (sudah audit pass mendalam + fix), 🟡 SEDANG (diverifikasi ringan / ada catatan sadar-risiko), 🔴 LEMAH (belum pernah jadi fokus audit khusus).

| Flow | Fokus | Bukti / yang sudah dilakukan | Yang BELUM |
|---|---|---|---|
| 3 Pembayaran | 🟢 | Pass A penuh; A1,A2,A6–A12,A14,A16,A17 fixed; reversal seragam (A8) | Idempotensi approve di-retry (catatan flow map) |
| 7 Auto-ops | 🟢 (kode) / 🔴 (runtime) | Pass B; A3–A5 redesign V5.12.0–.1; job sequential | **Belum pernah diuji end-to-end di UAT** — 9 job baru/diubah |
| 6 Checkout & deposit | 🟢 | Pass C; ledger idempotent; fix forfeit sweeper tercatat di ledger | `reconciliationLite` belum dijalankan di data nyata |
| 2 Booking & DP | 🟢 | A18 redesign penuh (DP vs jaminan terpisah, backend+frontend) | Paritas validasi jalur publik vs portal perlu verifikasi ringan |
| 4 Invoice manual | 🟢 | A6/A12/A14/A16 fixed | A13 (hapus payment pada invoice PAID, kamar tetap OCCUPIED) = sadar-risiko |
| 11 Akuntansi | 🟢 (desain) / 🟡 (data) | A8+A11 verified; auto-close ter-gate readiness | Backfill/rekonsiliasi **belum dijalankan di DB nyata** (Pass G) |
| 1 Auth | 🟡 | Rate limiting global+auth (V5.12.2) | Refresh token absen; sesi tidak invalid saat suspend; matriks @Roles per endpoint belum diaudit menyeluruh |
| 9 Inventaris | 🟡 | Pass F ringan; lock qty di movement; self-healing sync | Skenario double-apply field-report→ticket-close (risiko rendah, dipantau) |
| 10 Keuangan ops | 🟡 | Posting jurnal terhubung | Delete expense/wifi → reversal jurnal? Depresiasi dobel-run? (pertanyaan flow map §10 belum dijawab eksplisit) |
| **5 Renew** | 🔴 | Hanya guard dasar (tolak telat, tolak tunggakan) | **Belum pernah ada audit pass khusus.** Race renew-approve vs noon-release pk 12:00; interaksi renew dengan model DP 30% (perpanjangan perlu DP lagi atau tidak?); denda → diputuskan D1 (tanpa denda) |
| **8 Tiket & staf** | 🔴 | Dipetakan di flow map | **Belum pernah ada audit pass khusus.** Parsing regex deskripsi tiket rapuh; auto-assign selalu ke staf id terkecil (beban timpang); guard role markDone vs close belum diverifikasi |
| **12 Pelaporan & notifikasi** | 🔴 | Reports tersedia; reminder in-app jalan | **Angka reports (raw SQL) belum pernah di-cross-check vs trial balance accounting**; endpoint AI belum diaudit (akses, biaya, input); jangkauan notifikasi → keputusan D2 |

### Kesimpulan: 5 area fokus terlemah (urutan prioritas)
1. **Verifikasi runtime & data (Pass G)** — semua fix V5.11–V5.12 baru terbukti di level kode, belum di data nyata. Ini bukan satu flow, tapi payung di atas semuanya. → diputuskan D3 sebagai prioritas berikutnya.
2. **Flow 5 Renew** — satu-satunya flow uang yang belum pernah diaudit khusus, padahal menyentuh invoice + periode + race dengan auto-ops.
3. **Flow 8 Tiket & staf** — gerbang MAINTENANCE→AVAILABLE bergantung padanya; belum diaudit.
4. **Flow 12 cross-check laporan** — owner mengambil keputusan dari angka yang belum pernah diuji silang dengan jurnal.
5. **Kedalaman keamanan (sisa Pass E)** — refresh token, invalidasi sesi, matriks role.

---

## 3. Keputusan Owner — 2026-06-11 (D1–D4)

| # | Keputusan | Konsekuensi implementasi |
|---|---|---|
| **D1** | **Tanpa denda keterlambatan.** Kebijakan yang berlaku: forced checkout H+1 + DP hangus + renewal diblokir bila ada tunggakan. | Kata "denda" dihapus dari copy reminder (`reminder-preview.service.ts:207` — ✅ dikerjakan hari ini). Tipe line invoice `PENALTY` tetap ada untuk potongan manual (mis. kunci hilang). Akun COA 4400 tetap (dipakai potongan manual). |
| **D2** | **Notifikasi in-app saja dulu**; rencana ke depan: **PWA dengan push notification**. | Tidak ada integrasi WA/email sekarang. Saat PWA digarap: service worker + Web Push (VAPID) untuk pengingat H-7/H-3/H-1/H-day, jatuh tempo, dan forced checkout. Sampai saat itu, sadari risiko: tenant yang tak membuka portal tidak melihat pengingat. |
| **D3** | **Prioritas berikutnya: UAT end-to-end + rekonsiliasi data.** | Lihat §4 — rencana UAT. |
| **D4** | **Rapikan docs penuh** untuk hemat token. | `00_GROUND_STATE.md` & `CHECKLIST.md` basi (V5.10.0) diarsipkan & ditulis ulang ringkas; `CLAUDE.md` dibuat sebagai pintu masuk sesi. Lanjutan: 01_CONTRACTS/02_PLAN/03_DECISIONS_LOG/04_JOURNAL + CHANGELOG lama diarsipkan; docs aktif dipadatkan jadi 5 file (✅ dikerjakan hari ini). |

---

## 4. Rencana UAT + Rekonsiliasi (eksekusi D3) — checklist siap pakai

Urutan disarankan (jalankan di UAT `kost48_v3_pro` port 5433 dulu):

### 4.1 Siklus DP → pelunasan (flow 2+3)
- [ ] Booking portal pilih "DP 30%" → bayar DP → approve → kamar terkunci (RESERVED, pesaing batal, expiresAt mati).
- [ ] Pelunasan sisa sewa + jaminan → approve → kamar OCCUPIED, meter promoted, `downPaymentPaidRupiah` & `depositPaid` terisi benar (dua field terpisah!).
- [ ] Booking kedua di kamar sama saat fase DP: first-paid-wins + notifikasi tenant kalah (A17).
- [ ] DP dibayar tapi TIDAK dilunasi → H+1 pk 12:00 `runDownPaymentForfeit`: stay batal, jurnal `DP_FORFEIT`, jaminan tak tersentuh.
- [ ] Booking tanpa bayar sama sekali → expired 3 jam → kamar lepas.
- [ ] Pembayaran manual admin pada invoice booking → harus DITOLAK/diarahkan ke review pembayaran (regresi A1).

### 4.2 Siklus kontrak habis → overstay (flow 7)
- [ ] Pengingat in-app muncul H-7/H-3/H-1/H-day (set tanggal stay buatan).
- [ ] H-day pk 12:00: kamar terbuka untuk publik; tiket EVICT_OVERSTAY terbit.
- [ ] H+1 pk 12:00: forced checkout otomatis → kamar MAINTENANCE + `allowBookingWhileCleaning=true` → katalog "Bisa dipesan · dibersihkan".
- [ ] Tenant overstay masih punya tagihan belum lunas → TIDAK auto-checkout, admin dapat 🚨.
- [ ] Booking + DP di kamar kotor diterima; pelunasan/check-in DIBLOKIR sampai tiket pembersihan ditutup; tutup tiket → flag reset → pelunasan bisa di-approve.

### 4.3 Renew & checkout normal (flow 5+6)
- [ ] Renew sebelum H-day: invoice meter+sewa, periode menyambung tanpa gap.
- [ ] Renew yang di-approve menjelang pk 12:00 H-day — pastikan tidak bertabrakan dengan noon-release (race yang belum diaudit!).
- [ ] Checkout normal: inspeksi → settlement deposit (refund penuh / potong / hangus) → ledger cocok.

### 4.4 Rekonsiliasi data (Pass G — tools sudah ada, tinggal dijalankan)
- [ ] `GET /api/deposit-ledger/reconciliation-lite` → selisih = 0.
- [ ] `GET /api/deposit-ledger/backfill-dry-run` → review → eksekusi bila perlu.
- [ ] `GET /api/accounting/deposit-backfill-dry-run` lalu `accounting/backfill-auto-journal`.
- [ ] Cross-check: laporan P&L (`reports/profit-loss`) vs trial balance accounting untuk bulan yang sama (sisa Pass D).
- [ ] Baru setelah semua nol/terjawab: biarkan auto-close menutup buku bulan berjalan.

### 4.5 Setelah UAT lulus → kandidat pass audit berikutnya
1. Pass H — Flow 5 Renew (race noon-release, interaksi DP).
2. Pass I — Flow 8 Tiket & staf (guard role, auto-assign, regex parsing).
3. Pass J — Flow 12 cross-check laporan + audit endpoint AI.
4. Sisa Pass E — refresh token + invalidasi sesi + matriks @Roles.

---

## 5. Strategi Hemat Token & Quota (eksplorasi D4)

Masalah terukur hari ini: docs aktif ±650 KB (≈170k token bila dibaca semua). Dua file terbesar (`CHECKLIST.md` 98 KB, `CHANGELOG.md` 102 KB) + dua file basi yang menyesatkan (`00_GROUND_STATE.md`, `CHECKLIST.md` masih V5.10.0). Biaya terbesar sesi AI bukan menulis kode — tapi **membaca konteks berulang** dan **rework karena salah arah**.

### 5.1 Struktur dokumen (sudah diterapkan hari ini)
- **Hanya 5 docs aktif** (±60 KB total): `00_GROUND_STATE`, `01_FLOW_MAP`, `02_FOCUS_PLAN`, `CHECKLIST`, `CHANGELOG`. Sisanya (contracts/plan/decisions/journal era pra-audit + changelog lama) di `docs/archieve/`.
- **`CLAUDE.md` di root** (<3 KB) — dimuat otomatis tiap sesi. Isinya: pintu masuk, perintah build, aturan baca docs. JANGAN ditumbuhi konten; tetap kecil.
- **`01_FLOW_MAP.md` = peta tunggal** untuk audit/perubahan logika. Sesi audit cukup baca ini + file kode target.
- **`CHANGELOG.md` prepend-only** — hanya entri V5.11.0+ (era audit); entri lebih lama di `archieve/CHANGELOG_PRE_V5110.md`.
- **Docs basi diarsipkan** ke `docs/archieve/`, bukan dihapus — sejarah tetap ada tanpa membebani sesi.
- Target: **working set docs per sesi ≤ 50 KB**.

### 5.2 Pola kerja per sesi
- **Satu tugas = satu sesi.** Sesi panjang multi-topik memaksa model menyeret konteks tak relevan; `/clear` di antara tugas.
- **Plan Mode untuk tugas besar** (Shift+Tab) — rework akibat salah arah adalah pemborosan token terbesar; rencana yang disetujui dulu jauh lebih murah.
- **Sebut target spesifik**: "perbaiki `auto-ops.service.ts:365` runDownPaymentForfeit" jauh lebih murah daripada "cek auto-ops". `file:baris` di FLOW_MAP ada justru untuk ini.
- **Batch pertanyaan keputusan** dalam satu AskUserQuestion (seperti D1–D4 hari ini), bukan bolak-balik per pertanyaan.
- **Hindari subagent/agent spawn** kecuali benar-benar perlu — tiap agent mulai dari nol dan membaca ulang konteks.
- **Jangan minta baca seluruh folder** — selalu Grep berpola di `backend/src` / `frontend/src` (tidak pernah menyentuh `node_modules`).

### 5.3 Routing model (hemat quota langganan)
| Jenis tugas | Model |
|---|---|
| Audit logika, desain arsitektur, race condition | Model utama (default) |
| Edit mekanis: copy/label, rename, sync docs, terjemahan | `/model haiku` atau sonnet — 3–10× lebih hemat |
| Eksplorasi besar baca-saja | Boleh subagent Explore (konteksnya dibuang setelah selesai, tidak membebani sesi utama) |

### 5.4 Kebersihan berkelanjutan
- Setiap rilis: update **bagian atas** GROUND_STATE (ringkas) + prepend CHANGELOG; jangan biarkan dua sumber kebenaran berbeda versi (akar masalah drift V5.10 vs V5.12).
- Bila satu file docs > 30 KB → pecah/arsipkan bagian lama.
- Fakta lintas-sesi yang bukan milik repo (preferensi, keputusan gaya kerja) → memory directory Claude, bukan docs.

---

## 6. Ringkasan satu paragraf
Sistem punya 12 flow bisnis + 9 job otomatis. Jalur uang (booking-DP, pembayaran, checkout-deposit, akuntansi) dan mesin waktu (auto-ops) sudah KUAT di level kode setelah audit pass A/B/C/E dan redesign V5.12.x — tetapi SEMUA itu belum pernah dibuktikan di runtime/data nyata, dan tiga flow belum pernah disentuh audit khusus: **Renew (5), Tiket & staf (8), serta cross-check Laporan (12)**. Keputusan owner hari ini: tanpa denda (D1), notifikasi in-app dulu menuju PWA push (D2), prioritas UAT + rekonsiliasi data (D3, checklist di §4), dan perampingan docs untuk hemat token (D4, diterapkan).
