# DOSSIER 16 — NOTIFIKASI & PENGUMUMAN
**Domain:** notifikasi in-app, pengumuman, coverage event, rencana push (PWA Phase 3). **Flow 14.**
**Status:** 🟢 Coverage solid — notif siklus renewal, copy A17 dua-varian, inbox payment-submitted, prompt review tenant, prompt renewal H-10, fallback admin tenant tanpa portal, booking-dibatalkan-sweeper, **dan F3-1 (ticket-assign→assignee, room-ready→OWNER/ADMIN, K-6/K-8 BARANG_PINDAH→staf assignee)** sudah SELESAI (2026-06-14). wifi-order = lewat WhatsApp, tak ada event in-app. Tersisa: hanya N-02/B-14 (F3-13) + push PWA (F4-2).
**File inti:** `app-notification.service.ts` (104), `announcements.service.ts` (:100-260), notif inline di payment-submissions/tenant-bookings/checkout-requests/auto-ops/tickets.

---
## 1. Aturan bisnis
- **Notif in-app saja** (D2); PWA push direncanakan Phase 3.
- **Pengumuman: Admin + Owner** boleh publish (J-c). Audiens TENANT = hanya yang OCCUPIED (N-03/D-10: tenant booking TIDAK terima — kode benar).
- **Reminder kontrak: H-10, H-7, H-3, H-1, H-day** (B1 — ✅ SELESAI 2026-06-14, `runContractEndReminders` REMINDER_DAYS `[10,7,3,1,0]`).
- **Push Phase 3 (J-d): 4 kelompok event prioritas** — (1) pengingat kontrak, (2) pembayaran disetujui/ditolak, (3) booking dibatalkan/DP hangus/kalah cepat, (4) tiket baru utk staf + ajakan tenant menilai. Selaras model tenant-pengawas.
- Notif TIDAK pernah ditulis di dalam tx yang bisa rollback (pola forced-checkout di LUAR tx).

## 2. Coverage matrix (verifikasi grep)
✅ ada: payment approved/rejected, booking approved/rejected, checkout created/approved/rejected, reminder H-10/H-7/H-3/H-1/H-day, forced-checkout, A17 dua-varian, notif siklus renewal, booking-dibatalkan-sweeper, announcement, review ≤2, overstay-blocked admin, prompt renewal H-10 + fallback admin tenant tanpa portal.
✅ baru (F3-1): ticket-assigned→assignee (saat assignee berubah, skip self), room-ready→OWNER/ADMIN (CHECKOUT_INSPECTION close → kamar AVAILABLE, dedupe).
❌ bolong: wifi-order TIDAK ADA event in-app (tenant pesan via WhatsApp di `WifiOrderPage`).
✅ baru: payment-submitted→OWNER/ADMIN dan prompt-review tenant setelah tiket selesai, keduanya best-effort + dedupe.
✅ RESOLVED (K-6/K-8): ticket-closed BARANG_PINDAH kini ke staf assignee (di luar tx).

## 3. Temuan audit
| ID | Sev | Dampak bisnis | Lokasi | Fix/Task |
|---|---|---|---|---|
| N-01 | ✅ RESOLVED | Copy A17 sudah dua varian berdasarkan keberadaan submission/DP; pencatatan refund lossRefund* sudah task F2-3b SELESAI. | `payment-submissions.notifyLosingTenants` | **F2-3 selesai; F2-3b selesai** |
| Renew notif | ✅ RESOLVED | Notif siklus renewal + prompt H-10 + fallback admin tenant tanpa portal sudah selesai 2026-06-14. | `renew-requests.service.ts`, `auto-ops.service.ts` | **F2-2 selesai** |
| Sweeper-cancel | ✅ RESOLVED | Booking yang dibatalkan expiry/H+1/DP-forfeit mengirim notif tenant di luar transaksi; UAT tercatat lulus. | `cancelEndedUnpaidStay`/`expireBookingTx` | **F2-17 selesai** |
| N-02 | ✅ RESOLVED (F3-13, 2026-06-14) | `notifyPublished` menahan notif bila `startsAt` masih di masa depan → tak ada lagi notif instan ke konten yang belum tayang. (Pengiriman tepat di `startsAt` butuh sweeper terjadwal = lanjutan.) | `announcements.service.ts` `notifyPublished` | **F3-13 (N-02 selesai)** |
| Coverage 5 | 🟡 PARSIAL | payment-submitted→OWNER/ADMIN dan prompt-review tenant sudah selesai; tersisa ticket-assigned→staf, wifi-order, room-ready, dan K-8 penerima. | berbagai | **F3-2 selesai**; lanjut **F3-1** |
| N-04 | INFO | AppNotification tanpa retensi → tumbuh tanpa batas (broadcast ALL). | `app-notification.service.ts` | **F4-7** pruning >90 hari |
| B-14 | 🟡 P3 | Reminder exact-match daysLeft → downtime di hari gelombang = gelombang hilang. | `auto-ops.service.ts:451-457` | **F3-13** window `<=` + dedupe gelombang |

## 4. Task
- **F2-2 · FASE 2 (SELESAI 2026-06-14):** notif renew (request→admin, approve/reject→tenant, prompt H-10) + fallback antrean admin untuk tenant tanpa portal. UAT: stay H-10 → notif tenant; tenant non-portal → notif 3 admin.
- **F2-3 · FASE 2 (SELESAI 2026-06-14):** copy A17 dua varian (loser sudah-transfer vs belum). **F2-3b (SELESAI 2026-06-14):** field bukti refund di sistem — enum `RefundStatus` + 7 field `Stay.lossRefund*` + endpoint OWNER proses refund.
- **F2-17 · FASE 2 (SELESAI 2026-06-14):** notif booking-dibatalkan-sweeper + alasan. UAT: sweeper batalkan → tenant terima "Booking dibatalkan otomatis".
- **F3-1 · FASE 3:** coverage tersisa (ticket-assign+K-8 penerima, wifi, room-ready, sweeper) best-effort+dedupe.
- **F3-2 · FASE 3 (SELESAI 2026-06-14):** submission pembayaran yang sudah commit mengirim inbox dedupe ke seluruh OWNER/ADMIN aktif dengan deep-link review. UAT rollback: 3 penerima, dua pemanggilan tetap 3 notifikasi, residu 0.
- **F3-20 · FASE 3 (SELESAI 2026-06-14):** tiket tenant ber-assignee STAFF pada DONE/CLOSED mengirim ajakan review dedupe ke portal tenant. UAT rollback tiket #12: dua pemanggilan tetap 1 notifikasi, residu 0.
- **F3-13:** N-02 + B-14. **F4-7:** pruning. **F4-2 (Phase 3):** push 4 kelompok (J-d) via outbox.

## 5. Konvensi & invarian
- **Konvensi event baru:** penerima eksplisit; linkTo terdalam relevan; dedupe key (recipient, entityType, entityId, title); best-effort never-throw; di LUAR tx bila pasca-commit.
- **Util target:** `notifySafe({recipient,dedupeKey,...})` terpusat (Langkah 1 murah) sebelum outbox push (Phase 3).
- **Prioritas penutupan:** renew (vacancy) > A17 copy (kepercayaan) > payment-submitted (kecepatan kas) > ticket-assign (SLA) > room-ready > wifi.
- **Pola terbaik (template):** `checkout-requests.service.ts:294-345` notifyOwnerAdminOnCreate.
