# KOST48 V5 — Lifecycle Contracts
**Versi:** 2026-06-13 — ekstrak inti dari `archieve/01_CONTRACTS.md` (era V5.8.6–V5.9.9, 2489 baris).
**Tujuan:** Aturan lifecycle booking/payment/invoice/checkout/renew/deposit yang harus dipegang oleh semua aplikasi (Multi-App Shared-DB).

<!-- KOST48_DOCS_SYNC_20260612_CONTRACTS -->

---

## 1. Data Mutation Safety (Lapisan DB)

### Trigger & Constraint
- **no-overpay trigger**: mencegah pembayaran melebihi sisa invoice (lock `FOR UPDATE`).
- **Line auto-compute**: INSERT/UPDATE line otomatis recalc total invoice.
- **Prevent manual total mutation**: total invoice hanya bisa diubah oleh trigger line, bukan manual.
- **Meter monotonic**: meter baru tidak boleh < meter sebelumnya (trigger + service guard).
- **Inventory sync trigger**: qty movement otomatis sinkron ke stock (self-healing 3 jalur: gudang, kamar, movement).
- **Deposit processing guard**: validasi deposit settlement sebelum final.
- **Partial unique constraints**: 1 ACTIVE stay per tenant, 1 promoted per room, 1 PENDING_REVIEW submission per target.

### Booking Lifecycle
- Booking = Stay ACTIVE + Room RESERVED.
- **First-paid-wins**: multi-booking RESERVED TIDAK dibatasi jumlahnya (D4); yang pertama bayar DP menang, sisanya batal otomatis.
- Sewa per term dari tarif bulanan (`pricing.helper.ts`): Harian 13% · Mingguan 45% · 2-Mingguan 75% · Bulanan 100% · Semester 5,5× · Tahunan 10× (C1, owner-confirmed). Utilitas: term pendek all-in; Bulanan ke atas meter terpisah (C2).
- DP 30% dari `agreedRentAmountRupiah` (sesuai pricingTerm). DP hangus bila gagal lunas H+1 12:00.
- Deposit jaminan = `Room.defaultDepositRupiah`, **SELALU TETAP** (C3 — admin tidak boleh override; guard F1-10).
- `expiresAt` = **3 jam flat dari `createdAt` untuk SEMUA jalur** (publik & portal, D2 — bukan cutoff 21:00 WIB lagi). DP di-approve → `expiresAt` mati (null).
- Pelunasan = sisa sewa + jaminan. Approve → kamar OCCUPIED, meter promoted.
- **Verifikasi KTP wajib** sebelum aktivasi kamar (E1, fitur baru F3-17).

### Payment Lifecycle
- Upload bukti (JPG/PNG/WebP) → review admin → approve = jurnal + ledger.
- Guard: `FOR UPDATE` lock, recalc paid segar, cap rentPortion/depositPortion.
- **NO-PARTIAL MENYELURUH (D-02 2026-06-13):** nominal sah hanya (a) DP 30% persis, atau (b) pelunasan persis (sisa invoice + sisa deposit). Jalur invoice-only (renewal/utilitas) wajib LUNAS penuh. Gate dua-nominal-sah ada di createSubmission (`:122-135`); approve WAJIB re-validasi (task F1-1R). (KOREKSI: framing lama "harus ≥ invoice + deposit" diganti — itu menolak DP sah.)
- 4 jalur cancel: reverseCancelledInvoiceJournalsTx blocking (A8).

### Invoice Lifecycle
- Status: DRAFT → ISSUED → **PARTIAL** → PAID / CANCELLED. (KOREKSI: PARTIAL sebelumnya terlewat di doc ini.)
- Line type (enum AKTUAL `app.enums.ts`): **RENT, ELECTRICITY, WATER, WIFI, PENALTY, DISCOUNT, OTHER**. (KOREKSI: doc lama menulis METER_ELECTRICITY/METER_WATER/DEPOSIT_POTONG — TIDAK ADA di kode.)
- DISCOUNT mengurangi total (service + trigger konsisten).
- Cancel invoice: lock + re-validasi tx, reversal jurnal blocking (A14).

### Checkout Lifecycle
- Checkout request ≤ `plannedCheckOutDate` (tidak boleh extend — perpanjang via renewal).
- Final checkout → blokir tagihan aktif → kamar MAINTENANCE + tiket CHECKOUT_INSPECTION dedupe.
- Room readiness gate: MAINTENANCE → AVAILABLE setelah tiket inspeksi close. **(K-d/I-a 2026-06-13: STAF boleh tutup tiket inspeksi → kamar langsung siap, guard keselamatan tetap; lihat 04_KEPUTUSAN_OWNER F2-18.)**
- `allowBookingWhileCleaning=true`: kamar MAINTENANCE bisa dipesan, tapi huni menunggu tiket close.
- **Keluar lebih awal (K-e 2026-06-13):** tenant checkout sebelum kontrak habis → **sewa yang sudah dibayar HANGUS** (tidak ada refund pro-rata sisa periode); **deposit jaminan dikembalikan normal** saat settlement. Kode sekarang sudah tidak refund sewa — selaras.
- **Verifikasi KTP** (E1) wajib sebelum aktivasi; **barang ditinggal pasca forced-checkout: batas ambil 30 hari** lalu abandoned (B3).

### Renew Lifecycle
- **TARGET (keputusan R1-R4 2026-06-13, GAP #2 — BELUM diimplementasi):** tenant ditanya H-7 (notif) ATAU ajukan sendiri → bayar **DP 30%** perpanjangan dulu → kamar tetap tampil publik sampai DP masuk → **first-paid-wins PENUH** (orang baru bisa menang) → pelunasan maks **H+7** dari DP renewal → lewat itu DP hangus + kamar lepas.
- **KODE SEKARANG (belum sesuai target):** pengajuan tenant → approve admin LANGSUNG perpanjang + invoice sewa + meter (tanpa fase DP). Guard: tolak telat (today > plannedCheckOutDate), tolak bila ada tunggakan lama. **Wajib meter** saat approve.
- Catatan: GAP #2 = ketiadaan fase DP-belum-aman (BUKAN guard tunggakan). Desain detail wajib sebelum koding (F2-1).

### Deposit Lifecycle
- DP (`downPayment*`) = uang muka pesan, **hangus** bila gagal lunas.
- Deposit jaminan (`deposit*`, dari `Room.defaultDepositRupiah`) = uang titipan, **refundable**.
- `processDeposit`: validasi aksi ketat, jurnal + ledger **blocking**.
- Settlement: refund/full, refund/partial, forfeit, deducted, pending transfer.

### Role Authorization
- OWNER, ADMIN, STAFF, TENANT. Tidak ada SUPER_ADMIN/FINANCE.
- **APP_GUARD global default-deny SUDAH TERPASANG (E-1, sejak V5.12.2)** — controller baru otomatis 401 kecuali diberi `@Public`. (KOREKSI 2026-06-13: pernyataan lama "tidak ada APP_GUARD global" SUDAH BASI.)
- Endpoint publik ditandai `@Public` (marketing rooms, faqs/public, booking publik, auth).
- Rate limit: global 300/menit/IP, auth 10/15 menit/IP.
- **OWNER-only (keputusan D3 2026-06-13):** tutup/buka periode akuntansi, hapus/nonaktif user & staf, ubah setelan kamar & harga, proses deposit & refund settlement — ADMIN tidak boleh (audit @Roles berjalan, task F2-16).

---

## 2. Akuntansi (Auto Journal Lite)

### Aturan Posting
- Jurnal otomatis idempotent per (sourceType, sourceId).
- Readiness gate: unmapped-operational menghitung penuh sebelum tutup buku.
- Auto-close bulanan: hanya bila formalStatementReady.
- Semua reversal cancellation blocking (pola A8).
- CashAccount: `currentBalanceRupiah` denormalized — service harus update saat jurnal posting (M-34).

### Sumber Jurnal
1. Pembayaran (booking DP, pelunasan, deposit)
2. DP forfeit
3. Deposit settlement (refund full/partial, forfeit)
4. Invoice issue/cancel
5. Expense create/delete
6. WiFi sales
7. Asset depreciation
8. Checkout final settlement

---

## 3. Auto-Ops (9 Job Sequential)

| # | Job | Trigger |
|---|-----|---------|
| 1 | `bookingExpiry` | Booking tidak bayar > 3 jam → batal |
| 2 | `roomHealer` | Room status inkonsisten → recover |
| 3 | `roomReleaseAtNoon` | H-day 12:00 WIB → kamar publik |
| 4 | `downPaymentForfeit` | H+1 12:00 WIB → DP hangus |
| 5 | `contractEndReminders` | H-7/H-3/H-1/H-day → pengingat in-app |
| 6 | `overstayEnforcement` | H+1 → tiket EVICT_OVERSTAY |
| 7 | `overstayForcedCheckout` | H+1 12:00 WIB → forced checkout |
| 8 | `postCheckoutAutoCancel` | Cleanup stay unpromoted habis checkout |
| 9 | `accountingAutoClose` | Tutup buku bulanan |

Aturan:
- Sequential dengan mutex `running`.
- Lock `FOR UPDATE`, re-check status sebelum mutasi.
- Skip bila ada submission PENDING/APPROVED atau invoice PAID/PARTIAL.
- Gerbang jam WIB (`jakartaHour >= 12`).
- Satu pintu cancel: `cancelEndedUnpaidStay`.

---

## 4. Notifikasi In-App

- Notifikasi hanya in-app (D2). PWA push direncanakan Phase 3.
- `AppNotification`: recipient, title, body, link, entity, status read.
- Pengingat kontrak: **H-10, H-7, H-3, H-1, H-day** (B1 — kode sekarang baru H-7/H-3/H-1/H-day; tambah H-10 = task F2-15).
- Approval/rejection booking & pembayaran.
- First-paid-wins kalah (A17) — copy dua-varian (N-01/F2-3).
- Checkout/renew approved/rejected — **renew NOTIF BELUM ADA** (F2-2).
- Tiket assignment untuk staf — **BELUM ADA** (F3-1).
- **Booking dibatalkan sweeper + alasan** (E3/F2-17) — BELUM ADA.
- Refund kalah first-paid dicatat di sistem (D-07/F2-3b).

---

## 5. File/Foto Security

- Upload: magic bytes verification (JPG/PNG/WebP), rename CSPRNG, anti path-traversal.
- Limit: 2 MB, rate limit per user/IP.
- Privat (bukti bayar, foto tiket, pengumuman): endpoint Bearer-scoped, `private, no-store`, `Vary: Authorization`.
- Publik (foto kamar): magic bytes + random name + rate limit; konten marketing.
- Canvas re-encoding di client membuang EXIF/GPS sebelum upload.

---

*Dokumen ini ringkasan kontrak lifecycle. Detail per-flow ada di `02_FLOW_MAP.md`, audit temuan di `AUDIT_00_INDEX.md` (+ `AUDIT_01..10`), keputusan owner di `04_KEPUTUSAN_OWNER.md`.*