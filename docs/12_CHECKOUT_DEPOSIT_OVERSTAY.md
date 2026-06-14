# DOSSIER 12 — CHECKOUT, DEPOSIT & OVERSTAY
**Domain:** checkout (request + final), settlement deposit jaminan, lifecycle overstay/forced-checkout, tenant kabur, barang ditinggal. **Flow 6 + bagian Auto-Ops overstay.**
**Status:** 🟢 KUAT (checkout blokir tagihan, settlement blocking, gate inspeksi). Sisa: cancel-promoted lupa tiket + fitur baru (kabur, abandoned, paksa-checkout-nunggak).
**File inti:** `checkout-requests.service.ts` (14.1KB), `stays.service.ts` (complete:526, cancel:675, processDeposit:812), `deposit-ledger.service.ts` (469), `auto-ops.service.ts` (overstay/forced-checkout).

---
## 1. Aturan bisnis
- **Checkout request ≤ `plannedCheckOutDate`** (tak boleh extend; perpanjang via renewal dossier 11).
- **Final checkout** blokir bila ada tagihan non-PAID/CANCELLED → kamar MAINTENANCE + tiket CHECKOUT_INSPECTION (dedupe). Gate room-ready: MAINTENANCE→AVAILABLE saat tiket inspeksi ditutup (**staf kini boleh tutup** → kamar siap, guard keselamatan tetap; lihat dossier 15).
- **Deposit jaminan refundable** via settlement (FULL_REFUND/PARTIAL/FORFEIT), jurnal + ledger BLOCKING. Partial wajib habis dibagi (deduction+refund = settlement), catatan ≥8 char untuk potongan/hangus.
- **Keluar lebih awal (K-e):** sewa yang sudah dibayar HANGUS (no refund pro-rata); deposit dikembalikan normal.
- **Overstay (Auto-Ops):** reminder H-10..H-day → H-day pk 12:00 kamar publik + tiket EVICT → H+1 pk 12:00 forced checkout → kamar MAINTENANCE + `allowBookingWhileCleaning`. Tagihan belum lunas → TIDAK auto-checkout, admin dapat alert.
- **Tenant kabur (B2):** admin tandai manual bila **nunggak X hari + tak bisa dihubungi** (X konfig, mis. 7) → checkout dini + potong deposit.
- **Forced checkout nunggak (B4):** admin boleh PAKSA checkout + potong sisa dari deposit; **deposit tidak cukup → sisa jadi PIUTANG** tenant (AR), bukan write-off.
- **Barang ditinggal (B3):** batas ambil **30 hari** → status ABANDONED + notif; tindakan fisik manual.

## 2. Peta kode
| Aksi | Lokasi |
|---|---|
| Checkout request create/approve/reject + notif | `checkout-requests.service.ts:47/128/201`; notif :294/:354/:392 |
| Final checkout (blokir tagihan + tiket inspeksi) | `stays.service.ts:526`; tiket :605-654 |
| Cancel stay | `stays.service.ts:675`; **lubang B-08: promoted tak buat tiket :768-790** |
| Process deposit (jurnal+ledger blocking) | `stays.service.ts:812`; settlement :861-892; posting :928-941 |
| Deposit ledger (idempotent + reconciliationLite) | `deposit-ledger.service.ts:158/197/351` |
| Forced checkout overstay H+1 | `auto-ops.service.ts:508-685`; blokir tagihan :548; tiket+notif :605-679 |
| Sweeper noon/H+1/DP-forfeit (satu pintu) | `auto-ops.service.ts:214` cancelEndedUnpaidStay |

## 3. Temuan audit
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

## 4. Task & fitur baru
- **F1-8 · FASE 1:** guard settlement deposit (cek receipt journal) — spec di dossier 13.
- **F2-6 · FASE 2:** auto-tiket inspeksi saat `stays.cancel` stay promoted (salin dari `complete`). (B-08)
- **F3-13 · FASE 3:** B-07 (exclude+auto-cancel DRAFT saat forced checkout), B-06 (copy/meta).
- **F3-14 · FASE 3 (BARU):** tombol admin "tenant kabur" → checkout dini + potong deposit. Pemicu: nunggak X hari + tak terhubung. Field `Stay.fledMarkedAt`+reason+konfig X. (B2)
- **F3-15 · FASE 3 (BARU):** lacak `Stay.belongingsDeadline = checkout+30 hari` → status ABANDONED + notif; tindakan fisik manual. (B3)
- **F3-16 · FASE 3 (BARU):** admin paksa-checkout overstay nunggak + potong sisa dari deposit; **deposit kurang → buat AR (piutang) atas tenant**. Jurnal: 2000 menutup sebagian, sisa tetap AR 1100.

## 5. Invarian & UAT
- **Invarian:** kamar tak pernah AVAILABLE tanpa tiket inspeksi ditutup (KECUALI lubang B-08 — diperbaiki F2-6); deposit diproses tepat 1× (blocking); Σ ledger = paid − refund − deduction; selama grace renewal sah, tenant lama tak kena overstay enforcement.
- **UAT:** (1) checkout normal → inspeksi → settlement → ledger cocok (mismatch 0); (2) overstay penuh H-3→EVICT→forced H+1→kamar kotor-bisa-dipesan→settlement; (3) overstay nunggak → tidak auto-checkout + alert admin; (4) cancel stay promoted → kamar MAINTENANCE + tiket muncul (pasca F2-6); (5) paksa-checkout nunggak deposit kurang → sisa jadi piutang (pasca F3-16); (6) barang abandoned 30 hari (pasca F3-15).
- **Lintas-dossier:** jurnal deposit/forfeit → dossier 13; tiket inspeksi & tutup-oleh-staf → dossier 15; notif overstay → dossier 16.
