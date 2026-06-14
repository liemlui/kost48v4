# DOSSIER 11 — BOOKING & RENEWAL
**Domain:** booking publik & portal (DP 30%, first-paid-wins) + perpanjangan kontrak (GAP #2). **Flow 2 & 5.**
**Status:** Booking 🟢 KUAT (A18). Renewal 🟢 (2026-06-14) — state machine, invoice DP terpisah, rent-loyalty, notif siklus + prompt H-10 + fallback portal, sweeper hibrida, dan **deadline-gate command service (R3)** lengkap. Catatan: FORFEITED = **flag+notif (forced checkout & potong deposit MANUAL admin)** per keputusan owner hibrida — SENGAJA override R5 auto; publikasi kamar TIDAK/EXPIRED via flow checkout normal (keputusan owner #2).
**File inti:** `tenant-bookings.service.ts` (36.9KB), `public-bookings.service.ts` (16.7KB), `renew-requests.service.ts` (194), `stays.service.ts:997` renewStayInTransaction.
**🆕 Backlog (D-18 / F4-11, 2026-06-14):** tambah jalur **renewal/prabayar fleksibel KAPAN SAJA** — tenant boleh bayar di muka 2-4 bulan ke depan (harga bulanan) tanpa menunggu kontrak habis. Prabayar >1 bulan = unearned revenue (terikat F4-1, COA 2200). Rent-lock D-16 berlaku. Detail di `03_KEPUTUSAN_OWNER §D-18`.

---
## 1. Aturan bisnis
### Booking
- **DP 30%** × sewa periode (sesuai pricingTerm), non-refundable, hangus bila gagal lunas H+1. Deposit jaminan = `Room.defaultDepositRupiah`, **SELALU tetap** (D-05; admin tak boleh override).
- **Booking expiry 3 JAM FLAT** semua jalur (D-04) — sudah diterapkan melalui `AUTO_OPS_DEADLINES.BOOKING_REVIEW_DEADLINE_HOURS`.
- **First-paid-wins**: multi-booking RESERVED tak dibatasi (D4); pembayaran pertama disetujui (DP pun) mengunci kamar + batalkan pesaing.
- Harga per term (owner-confirmed C1): Harian 13% · Mingguan 45% · 2-Mingguan 75% · Bulanan 100% · Semester 5,5× · Tahunan 10× dari tarif bulanan. Utilitas term pendek all-in; bulanan+ meter (C2).
- **KTP wajib** sebelum aktivasi (E1 — detail di dossier 18).
### Renewal (GAP #2 — TARGET, lihat desain lengkap di §5)
- Tenant lama yang menyatakan perpanjang punya **prioritas eksklusif sampai hari-H TANPA wajib DP dulu** (L2). Di hari-H belum bayar DP → kamar dibuka publik untuk orang lain (first-paid, mulai tanggal checkout L1). Tenant pilih TIDAK → kamar langsung dibuka.
- DP 30% perpanjangan → pelunasan maks **H+7 dari DP** (R2); grace boleh lewat kontrak (tenant tetap huni; gagal lunas → forced checkout + DP hangus + potong deposit, L4).
- Ditanya via **notif H-10 + boleh ajukan sendiri** (R4).
- **Rent-loyalty (D-16): tenant yang perpanjang tanpa putus kontrak TIDAK mengalami kenaikan harga sewa. Harga hanya naik setelah gagal-bayar atau re-kontrak baru (tenant keluar lalu booking baru).** Ini memperkuat retensi — tenant loyal dilindungi dari inflasi sewa.

## 2. Peta kode
| Aksi | Lokasi |
|---|---|
| Buat booking portal (DP 30%, lock Tenant+Room) | `tenant-bookings.service.ts:56`; DP :157; INSERT :173 |
| Booking publik (paritas DP/deposit) | `public-bookings.service.ts:334`; expiry :292 |
| Approve/reject booking + notif | `tenant-bookings.service.ts:247 / :506`; notif :979/:1016 |
| Renew request dua fase | `renew-requests.service.ts`: DP PAID → terbitkan invoice pelunasan; pelunasan PAID → finalisasi stay melalui `stays.service.ts` |

## 3. Temuan audit
| ID | Sev | Dampak bisnis | Lokasi | Fix/Task |
|---|---|---|---|---|
| GAP #2 / B-03 | ✅ RESOLVED | Renewal DP penuh + state machine + invoice DP terpisah + rent-loyalty + sweeper hibrida + deadline-gate command (R3) selesai 2026-06-14. | `renew-requests.service.ts` | **F2-1 selesai** |
| Renew notif / B-03 | ✅ RESOLVED | Notif siklus renewal + prompt H-10 + fallback admin tenant tanpa portal selesai 2026-06-14. | `renew-requests.service.ts` | **F2-2 selesai** |
| C3 | 🟠 P2 | Admin bisa override nominal deposit saat approve booking/check-in — owner: deposit SELALU tetap. | `tenant-bookings.service.ts:341` + `stays.create:159` | **F1-10** kunci ke `Room.defaultDepositRupiah` |
| B-10 | ✅ SELESAI | Expiry publik dan portal sama-sama memakai helper 3 jam flat. | dua helper `calculateBookingExpiry` | **F1-11 selesai** |
| M-08 | 🟡 P3 | Booking publik hardcode bookingSource=WEBSITE → kanal akuisisi tak terukur (CAC). | `public-bookings.service.ts:187` | **F3-11** dropdown lead source (detail dossier 17) |
| B-15 | ✅ RESOLVED | Prompt H-10 + fallback admin tenant tanpa portal selesai 2026-06-14. REMINDER_DAYS kini `[10,7,3,1,0]`. | `auto-ops.service.ts` | **F2-2 selesai** |

## 4. Task
- **F1-10 · FASE 1:** kunci deposit = `Room.defaultDepositRupiah`; abaikan `dto.depositAmountRupiah` di approveBooking + stays.create. (C3)
- **F1-11 · SELESAI:** expiry 3 jam flat sudah dipakai portal dan publik.
- **F2-1 · FASE 2 (SELESAI 2026-06-14):** implementasi renewal DP penuh per desain §5 — state machine, invoice DP terpisah, rent-loyalty D-16, sweeper hibrida (EXPIRED_PRIORITY/FORFEITED), deadline-gate command service (R3). **FORFEITED = flag+notif admin; forced checkout & potong deposit MANUAL admin (keputusan owner hibrida, override R5 auto).**
- **F2-2 · FASE 2 (DIPERBAIKI 2026-06-14):** notif siklus renewal membedakan terbitnya invoice pelunasan dari finalisasi setelah PAID, selain request/keputusan/DP/reject/EXPIRED/FORFEITED; prompt H-10 + fallback admin tenant tanpa portal tetap aktif.

## 5. DESAIN RENEWAL (deliverable F2-1 — state machine penuh)
**State RenewRequest:** `PENDING_DECISION → (YA) AWAITING_DP → (DP≤hari-H) DP_SECURED → (terbit invoice pelunasan, tetap DP_SECURED) → (invoice PAID≤H+7) COMPLETED`; cabang: `(TIDAK) REJECTED_BY_TENANT → kamar dibuka`; `(hari-H tanpa DP) EXPIRED_PRIORITY → kamar dibuka first-paid`; `(gagal lunas H+7) FORFEITED → ditandai + notif admin; forced checkout + DP hangus + potong deposit = MANUAL admin (owner hibrida 2026-06-14, override R5 auto)`.
**Aturan per fase:**
1. Prompt H-10..H-day "perpanjang?" (notif) ATAU tenant ajukan sendiri.
2. YA → AWAITING_DP, invoice DP 30%, kamar TIDAK dibuka publik (prioritas tenant lama s/d hari-H). **Rent-loyalty (D-16):** harga sewa renewal = harga saat ini (tidak naik).
3. TIDAK → kamar tampil publik mulai tanggal checkout.
4. DP ≤ hari-H → DP_SECURED → kamar keluar katalog + batalkan booking baru belum-bayar + notif "diperpanjang penghuni lama" (L3).
5. Hari-H lewat tanpa DP → EXPIRED_PRIORITY → kamar dibuka (first-paid orang baru, mulai tanggal checkout); tenant lama wajib checkout (overstay flow bila tetap tinggal).
6. Admin catat meter → `prepareRenewalSettlementInTransaction` menerbitkan invoice sisa sewa+utilitas dan menyimpan `settlementInvoiceId`; periode stay **belum berubah**.
7. Tenant membayar invoice pelunasan lewat proof flow. Hanya invoice `PAID` dengan `paidAt ≤ settlementDueDate` yang dapat diproses.
8. Admin finalkan → `finalizePreparedRenewalInTransaction`; periode stay baru berubah dan request menjadi `COMPLETED`.
9. Grace H+7 lewat kontrak → tenant tetap huni; gagal lunas → FORFEITED, lalu forced checkout + deposit ditangani manual sesuai keputusan owner.
**Schema additive (owner-approve):** RenewRequest.status (+5 status), downPaymentPaidAt, downPaymentDueDate (=hari-H), settlementDueDate (=DP+7), dan `settlementInvoiceId`.
**Sweeper baru (auto-ops):** AWAITING_DP lewat hari-H → EXPIRED_PRIORITY (OTOMATIS: batalkan invoice DP belum-bayar + reversal jurnal + notif tenant); DP_SECURED gagal lunas H+7 → FORFEITED.
> **KEPUTUSAN OWNER HIBRIDA (2026-06-14) — override R5 auto:** FORFEITED **hanya DITANDAI + notif admin**; forced checkout & potong deposit dilakukan **admin MANUAL lewat flow checkout normal** (BUKAN otomatis sweeper). DP terbayar = hangus (tetap revenue invoice DP PAID). Deadline digate dari `paidAt` invoice aktual: DP harus dibayar ≤ hari-H dan pelunasan ≤ H+7. Prompt keputusan mulai **H-10** + fallback admin utk tenant tanpa portal.
**Invarian:** periode menyambung tanpa gap/overlap; pemesan baru tak pernah mulai < tanggal checkout; kamar tak dibuka selama prioritas tenant lama; DP hangus hanya bila gagal lunas H+7; **rent-loyalty: harga tetap untuk tenant renew.**
**UAT (7 skenario):** (1) YA+DP H-2+lunas H+5 mulus; (2) DP hari-H persis sah; (3) tak DP s/d hari-H → kamar dibuka+overstay; (4) gagal lunas H+7 → forfeit+forced checkout; (5) TIDAK → kamar langsung publik; (6) 2 orang baru → first-paid; (7) race tenant-lama-DP vs buka-kamar → lock prioritas.

## 6. Catatan
Gamifikasi (poin perpanjangan → reward) memperkuat retensi renewal — lihat dossier 19. Auto-ops job booking-expiry & DP-forfeit menopang flow ini — lihat dossier 12 (overstay) & dossier 13 (jurnal DP forfeit). Rent-loyalty D-16 cross-ref ke dossier 03, 17, 19.
