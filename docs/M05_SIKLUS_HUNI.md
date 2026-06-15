# KOST48 V5 - Siklus Huni, Renewal, Checkout, Deposit

> File hasil pemampatan dari dokumen root `docs/`. File sumber lama sudah diarsipkan ke `docs/archieve/2026-06-16_root_docs_pre_M/`.

## Tujuan

Dokumen lifecycle penghuni dari booking/renewal sampai checkout, deposit, overstay, dan room readiness.

## Sumber Digabung

- `docs/11_BOOKING_RENEWAL.md` - konten dipertahankan
- `docs/12_CHECKOUT_DEPOSIT_OVERSTAY.md` - konten dipertahankan

## Catatan Pemakaian

- Jadikan file ini pintu masuk tematik; bila butuh detail mentah, cek file sumber di arsip yang disebut di atas.
- Heading asli dinaikkan levelnya agar tidak bertabrakan dengan struktur M-file.


## Bagian 1 - `docs/11_BOOKING_RENEWAL.md`

### DOSSIER 11 — BOOKING & RENEWAL
**Domain:** booking publik & portal (DP 30%, first-paid-wins) + perpanjangan kontrak (GAP #2). **Flow 2 & 5.**
**Status:** Booking 🟢 KUAT (A18). Renewal 🟢 (2026-06-14) — state machine, invoice DP terpisah, rent-loyalty, notif siklus + prompt H-10 + fallback portal, sweeper hibrida, dan **deadline-gate command service (R3)** lengkap. Catatan: FORFEITED = **flag+notif (forced checkout & potong deposit MANUAL admin)** per keputusan owner hibrida — SENGAJA override R5 auto; publikasi kamar TIDAK/EXPIRED via flow checkout normal (keputusan owner #2).
**File inti:** `tenant-bookings.service.ts` (36.9KB), `public-bookings.service.ts` (16.7KB), `renew-requests.service.ts` (194), `stays.service.ts:997` renewStayInTransaction.
**🆕 Backlog (D-18 / F4-11, 2026-06-14):** tambah jalur **renewal/prabayar fleksibel KAPAN SAJA** — tenant boleh bayar di muka 2-4 bulan ke depan (harga bulanan) tanpa menunggu kontrak habis. Prabayar >1 bulan = unearned revenue (terikat F4-1, COA 2200). Rent-lock D-16 berlaku. Detail di `03_KEPUTUSAN_OWNER §D-18`.

---
#### 1. Aturan bisnis
##### Booking
- **DP 30%** × sewa periode (sesuai pricingTerm), non-refundable, hangus bila gagal lunas H+1. Deposit jaminan = `Room.defaultDepositRupiah`, **SELALU tetap** (D-05; admin tak boleh override).
- **Booking expiry 3 JAM FLAT** semua jalur (D-04) — sudah diterapkan melalui `AUTO_OPS_DEADLINES.BOOKING_REVIEW_DEADLINE_HOURS`.
- **First-paid-wins**: multi-booking RESERVED tak dibatasi (D4); pembayaran pertama disetujui (DP pun) mengunci kamar + batalkan pesaing.
- Harga per term (owner-confirmed C1): Harian 13% · Mingguan 45% · 2-Mingguan 75% · Bulanan 100% · Semester 5,5× · Tahunan 10× dari tarif bulanan. Utilitas term pendek all-in; bulanan+ meter (C2).
- **KTP wajib** sebelum aktivasi (E1 — detail di dossier 18).
##### Renewal (GAP #2 — TARGET, lihat desain lengkap di §5)
- Tenant lama yang menyatakan perpanjang punya **prioritas eksklusif sampai hari-H TANPA wajib DP dulu** (L2). Di hari-H belum bayar DP → kamar dibuka publik untuk orang lain (first-paid, mulai tanggal checkout L1). Tenant pilih TIDAK → kamar langsung dibuka.
- DP 30% perpanjangan → pelunasan maks **H+7 dari DP** (R2); grace boleh lewat kontrak (tenant tetap huni; gagal lunas → forced checkout + DP hangus + potong deposit, L4).
- Ditanya via **notif H-10 + boleh ajukan sendiri** (R4).
- **Rent-loyalty (D-16): tenant yang perpanjang tanpa putus kontrak TIDAK mengalami kenaikan harga sewa. Harga hanya naik setelah gagal-bayar atau re-kontrak baru (tenant keluar lalu booking baru).** Ini memperkuat retensi — tenant loyal dilindungi dari inflasi sewa.

#### 2. Peta kode
| Aksi | Lokasi |
|---|---|
| Buat booking portal (DP 30%, lock Tenant+Room) | `tenant-bookings.service.ts:56`; DP :157; INSERT :173 |
| Booking publik (paritas DP/deposit) | `public-bookings.service.ts:334`; expiry :292 |
| Approve/reject booking + notif | `tenant-bookings.service.ts:247 / :506`; notif :979/:1016 |
| Renew request dua fase | `renew-requests.service.ts`: DP PAID → terbitkan invoice pelunasan; pelunasan PAID → finalisasi stay melalui `stays.service.ts` |

#### 3. Temuan audit
> 🔄 **SINKRON KODE (2026-06-15, audit menyeluruh):** **C3/F1-10** SUDAH SELESAI — deposit jaminan dikunci ke `Room.defaultDepositRupiah` (`tenant-bookings.service.ts:342-343` + `stays.service.ts:191-192`), admin tak bisa override. Baris 🟠 di tabel = historis, bukan TODO.
| ID | Sev | Dampak bisnis | Lokasi | Fix/Task |
|---|---|---|---|---|
| GAP #2 / B-03 | ✅ RESOLVED | Renewal DP penuh + state machine + invoice DP terpisah + rent-loyalty + sweeper hibrida + deadline-gate command (R3) selesai 2026-06-14. | `renew-requests.service.ts` | **F2-1 selesai** |
| Renew notif / B-03 | ✅ RESOLVED | Notif siklus renewal + prompt H-10 + fallback admin tenant tanpa portal selesai 2026-06-14. | `renew-requests.service.ts` | **F2-2 selesai** |
| C3 | 🟠 P2 | Admin bisa override nominal deposit saat approve booking/check-in — owner: deposit SELALU tetap. | `tenant-bookings.service.ts:341` + `stays.create:159` | **F1-10** kunci ke `Room.defaultDepositRupiah` |
| B-10 | ✅ SELESAI | Expiry publik dan portal sama-sama memakai helper 3 jam flat. | dua helper `calculateBookingExpiry` | **F1-11 selesai** |
| M-08 | 🟡 P3 | Booking publik hardcode bookingSource=WEBSITE → kanal akuisisi tak terukur (CAC). | `public-bookings.service.ts:187` | **F3-11** dropdown lead source (detail dossier 17) |
| B-15 | ✅ RESOLVED | Prompt H-10 + fallback admin tenant tanpa portal selesai 2026-06-14. REMINDER_DAYS kini `[10,7,3,1,0]`. | `auto-ops.service.ts` | **F2-2 selesai** |

#### 4. Task
- **F1-10 · FASE 1:** kunci deposit = `Room.defaultDepositRupiah`; abaikan `dto.depositAmountRupiah` di approveBooking + stays.create. (C3)
- **F1-11 · SELESAI:** expiry 3 jam flat sudah dipakai portal dan publik.
- **F2-1 · FASE 2 (SELESAI 2026-06-14):** implementasi renewal DP penuh per desain §5 — state machine, invoice DP terpisah, rent-loyalty D-16, sweeper hibrida (EXPIRED_PRIORITY/FORFEITED), deadline-gate command service (R3). **FORFEITED = flag+notif admin; forced checkout & potong deposit MANUAL admin (keputusan owner hibrida, override R5 auto).**
- **F2-2 · FASE 2 (DIPERBAIKI 2026-06-14):** notif siklus renewal membedakan terbitnya invoice pelunasan dari finalisasi setelah PAID, selain request/keputusan/DP/reject/EXPIRED/FORFEITED; prompt H-10 + fallback admin tenant tanpa portal tetap aktif.

#### 5. DESAIN RENEWAL (deliverable F2-1 — state machine penuh)
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

#### 6. Catatan
Gamifikasi (poin perpanjangan → reward) memperkuat retensi renewal — lihat dossier 19. Auto-ops job booking-expiry & DP-forfeit menopang flow ini — lihat dossier 12 (overstay) & dossier 13 (jurnal DP forfeit). Rent-loyalty D-16 cross-ref ke dossier 03, 17, 19.


## Bagian 2 - `docs/12_CHECKOUT_DEPOSIT_OVERSTAY.md`

### DOSSIER 12 — CHECKOUT, DEPOSIT & OVERSTAY
**Domain:** checkout (request + final), settlement deposit jaminan, lifecycle overstay/forced-checkout, tenant kabur, barang ditinggal. **Flow 6 + bagian Auto-Ops overstay.**
**Status:** 🟢 KUAT (checkout blokir tagihan, settlement blocking, gate inspeksi). Sisa: cancel-promoted lupa tiket + fitur baru (kabur, abandoned, paksa-checkout-nunggak).
**File inti:** `checkout-requests.service.ts` (14.1KB), `stays.service.ts` (complete:526, cancel:675, processDeposit:812), `deposit-ledger.service.ts` (469), `auto-ops.service.ts` (overstay/forced-checkout).

---
#### 1. Aturan bisnis
- **Checkout request ≤ `plannedCheckOutDate`** (tak boleh extend; perpanjang via renewal dossier 11).
- **Final checkout** blokir bila ada tagihan non-PAID/CANCELLED → kamar MAINTENANCE + tiket CHECKOUT_INSPECTION (dedupe). Gate room-ready: MAINTENANCE→AVAILABLE saat tiket inspeksi ditutup (**staf kini boleh tutup** → kamar siap, guard keselamatan tetap; lihat dossier 15).
- **Deposit jaminan refundable** via settlement (FULL_REFUND/PARTIAL/FORFEIT), jurnal + ledger BLOCKING. Partial wajib habis dibagi (deduction+refund = settlement), catatan ≥8 char untuk potongan/hangus.
- **Keluar lebih awal (K-e):** sewa yang sudah dibayar HANGUS (no refund pro-rata); deposit dikembalikan normal.
- **Overstay (Auto-Ops):** reminder H-10..H-day → H-day pk 12:00 kamar publik + tiket EVICT → H+1 pk 12:00 forced checkout → kamar MAINTENANCE + `allowBookingWhileCleaning`. Tagihan belum lunas → TIDAK auto-checkout, admin dapat alert.
- **Tenant kabur (B2):** admin tandai manual bila **nunggak X hari + tak bisa dihubungi** (X konfig, mis. 7) → checkout dini + potong deposit.
- **Forced checkout nunggak (B4):** admin boleh PAKSA checkout + potong sisa dari deposit; **deposit tidak cukup → sisa jadi PIUTANG** tenant (AR), bukan write-off.
- **Barang ditinggal (B3):** batas ambil **30 hari** → status ABANDONED + notif; tindakan fisik manual.

#### 2. Peta kode
| Aksi | Lokasi |
|---|---|
| Checkout request create/approve/reject + notif | `checkout-requests.service.ts:47/128/201`; notif :294/:354/:392 |
| Final checkout (blokir tagihan + tiket inspeksi) | `stays.service.ts:526`; tiket :605-654 |
| Cancel stay | `stays.service.ts:675`; **lubang B-08: promoted tak buat tiket :768-790** |
| Process deposit (jurnal+ledger blocking) | `stays.service.ts:812`; settlement :861-892; posting :928-941 |
| Deposit ledger (idempotent + reconciliationLite) | `deposit-ledger.service.ts:158/197/351` |
| Forced checkout overstay H+1 | `auto-ops.service.ts:508-685`; blokir tagihan :548; tiket+notif :605-679 |
| Sweeper noon/H+1/DP-forfeit (satu pintu) | `auto-ops.service.ts:214` cancelEndedUnpaidStay |

#### 3. Temuan audit
| ID | Sev | Dampak bisnis | Lokasi | Fix/Task |
|---|---|---|---|---|
| B-08 | 🟡 KODE FIXED/UAT PENDING | `stays.cancel` sudah membuat tiket CHECKOUT_INSPECTION untuk stay promoted dan dedupe tiket terbuka. UAT runtime cancel→MAINTENANCE+tiket belum tercatat. | `stays.service.ts` `cancel()` | **F2-6 belum boleh dicentang sebelum UAT** |
| B-07 | ✅ RESOLVED (F3-13, 2026-06-14) | `forceCheckoutOverstay` mengecualikan DRAFT dari blocker (pra-tx & re-cek in-tx) lalu membatalkan DRAFT tersisa di dalam tx (tanpa jurnal → aman). Overstay tak lagi tersandera DRAFT terlupakan. | `auto-ops.service.ts` `forceCheckoutOverstay` | **F3-13 selesai** |
| B-06 | ✅ RESOLVED (F3-13, 2026-06-14) | Sudah teratasi via pemisahan mode `forfeitDownPayment` (A18/G2=A): caller non-forfeit (noon-release) memakai reason netral tanpa "DP hangus"; hanya caller forfeit (H+1 `AUTO_CANCEL_DP_FORFEIT_HPLUS1`) yang menulis "DP hangus" — dan itu memang menghanguskan DP. Copy/meta tak lagi menyesatkan. | `auto-ops.service.ts` `cancelEndedUnpaidStay` callers | **F3-13 (verifikasi, tanpa kode baru)** |
| F-24 | 🔴 P1(akuntansi) | Settlement deposit tanpa cek receipt journal → akun 2000 bisa debit permanen. (Detail di dossier 13.) | `accounting-posting.service.ts:602` | **F1-8** (dossier 13) |
| F-30 | 🟡 P3 | Ledger deposit sourceId fallback stayId → setoran jaminan manual ke-2 kena dedupe → kurang catat. | `deposit-ledger.service.ts:184` | sertakan invoicePaymentId di sourceId |
| B-12 | ✅ RESOLVED (F3-13, 2026-06-14) | `stays.update` menolak `plannedCheckOutDate` < hari ini (WIB) saat tanggal diubah → tak bisa lagi tak sengaja menjadikan stay target overstay/forced-checkout instan. Keluar lebih awal lewat flow checkout. | `stays.service.ts` `update()` | **F3-13 selesai** |
| B-05 | ✅ verified | (Anti-drift) noon-release SUDAH cek `paymentSubmissions none PENDING/APPROVED` + satu pintu `cancelEndedUnpaidStay` skip invoice PAID/PARTIAL → risiko "tenant-approved-belum-promoted di-cancel" TERTUTUP. Klaim FLOW_MAP lama (job #3 tak cek submissions) BASI. | `auto-ops.service.ts:179-181, :255-262` | tidak ada aksi; jaga saat refactor auto-ops |
| (sehat) | ✅ | reconciliationLite + settlement blocking + gate inspeksi = kontrol checkout terbaik. UAT overstay PASS penuh. | — | pertahankan |

#### 4. Task & fitur baru
- **F1-8 · FASE 1:** guard settlement deposit (cek receipt journal) — spec di dossier 13.
- **F2-6 · FASE 2:** auto-tiket inspeksi saat `stays.cancel` stay promoted (salin dari `complete`). (B-08)
- **F3-13 · FASE 3:** B-07 (exclude+auto-cancel DRAFT saat forced checkout), B-06 (copy/meta).
- **F3-14 · FASE 3 (SELESAI 2026-06-14, schema approved + UAT LULUS):** DIGABUNG dgn F3-16 → `POST /stays/:id/forced-checkout` reason `TENANT_KABUR` mengisi `Stay.fledMarkedAt/fledMarkedById/fledReason`. Ambang nunggak X hari = konstanta kode. (B2)
- **F3-15 · FASE 3 (SELESAI 2026-06-14, schema approved):** `Stay.belongingsStatus/belongingsDeadline/belongingsResolvedAt` + enum `BelongingsStatus`. Deadline = checkout+30 hari (di `complete` & `forceCheckoutOverstay`); sweeper `runBelongingsAbandonment` (PENDING & lewat deadline WIB → ABANDONED + notif OWNER/ADMIN dedupe) + endpoint `run/belongings-abandonment`; admin `POST /stays/:id/belongings` (CLAIMED/ABANDONED + catatan). Tindakan fisik tetap manual. (B3)
- **F3-16 · FASE 3 (SELESAI 2026-06-14, UAT LULUS):** `POST /stays/:id/forced-checkout` (OWNER, gabung F3-14). Deposit menutup tunggakan → jurnal **DR 2000 / CR 1100** (`postForcedCheckoutDepositSettlementTx`); **deposit kurang → sisa TETAP jadi PIUTANG AR 1100** (bukan write-off); kelebihan deposit refund kas. Invoice tertutup via pembayaran non-kas (OTHER). Guard `guard_stay_deposit_processing` carve-out via GUC sesi-tx; jurnal settlement diposting dulu (tolak bila penerimaan deposit tak terjurnal). **UAT runtime 12/12 PASS** (stay 8: applied 500k, shortfall 734.200 jadi AR, trial balance seimbang selisih 0, deposit FORFEITED, ledger HELD→FORFEIT net 0).

#### 5. Invarian & UAT
- **Invarian:** kamar tak pernah AVAILABLE tanpa tiket inspeksi ditutup (KECUALI lubang B-08 — diperbaiki F2-6); deposit diproses tepat 1× (blocking); Σ ledger = paid − refund − deduction; selama grace renewal sah, tenant lama tak kena overstay enforcement.
- **UAT:** (1) checkout normal → inspeksi → settlement → ledger cocok (mismatch 0); (2) overstay penuh H-3→EVICT→forced H+1→kamar kotor-bisa-dipesan→settlement; (3) overstay nunggak → tidak auto-checkout + alert admin; (4) cancel stay promoted → kamar MAINTENANCE + tiket muncul (pasca F2-6); (5) paksa-checkout nunggak deposit kurang → sisa jadi piutang (pasca F3-16); (6) barang abandoned 30 hari (pasca F3-15).
- **Lintas-dossier:** jurnal deposit/forfeit → dossier 13; tiket inspeksi & tutup-oleh-staf → dossier 15; notif overstay → dossier 16.
