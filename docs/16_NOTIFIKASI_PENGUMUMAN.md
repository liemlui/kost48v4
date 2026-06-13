# DOSSIER 16 — NOTIFIKASI & PENGUMUMAN
**Domain:** notifikasi in-app, pengumuman, coverage event, rencana push (PWA Phase 3). **Flow 14.**
**Status:** 🟡 14/22 event ternotifikasi; renew NOL; copy A17 menyesatkan. Primitif notif benar; coverage bolong di titik retensi & kepercayaan.
**File inti:** `app-notification.service.ts` (104), `announcements.service.ts` (:100-260), notif inline di payment-submissions/tenant-bookings/checkout-requests/auto-ops/tickets.

---
## 1. Aturan bisnis
- **Notif in-app saja** (D2); PWA push direncanakan Phase 3.
- **Pengumuman: Admin + Owner** boleh publish (J-c). Audiens TENANT = hanya yang OCCUPIED (N-03/D-10: tenant booking TIDAK terima — kode benar).
- **Reminder kontrak: H-10, H-7, H-3, H-1, H-day** (B1 — kode sekarang baru H-7/H-3/H-1/H-day, tambah H-10).
- **Push Phase 3 (J-d): 4 kelompok event prioritas** — (1) pengingat kontrak, (2) pembayaran disetujui/ditolak, (3) booking dibatalkan/DP hangus/kalah cepat, (4) tiket baru utk staf + ajakan tenant menilai. Selaras model tenant-pengawas.
- Notif TIDAK pernah ditulis di dalam tx yang bisa rollback (pola forced-checkout di LUAR tx).

## 2. Coverage matrix (verifikasi grep)
✅ ada: payment approved/rejected, booking approved/rejected, checkout created/approved/rejected, reminder H-x, forced-checkout, A17 kalah-cepat, announcement, review ≤2, overstay-blocked admin.
❌ bolong: payment-submitted→admin, booking-dibatalkan-sweeper, **renew (request/approve/reject) — NOL**, room-ready, ticket-assigned→staf, wifi-order, prompt-review tenant.
🟡 cacat: A17 copy (N-01), ticket-closed BARANG_PINDAH penerima salah (K-8).

## 3. Temuan audit
| ID | Sev | Dampak bisnis | Lokasi | Fix/Task |
|---|---|---|---|---|
| N-01 | 🔴 P1 | Copy A17 "Tidak ada dana terpotong dari Anda" SALAH untuk loser yang sudah transfer DP → risiko kepercayaan/UUPK. | `payment-submissions.service.ts:843` | **F2-3** dua varian copy + (F2-3b) catat refund di sistem |
| Renew notif | 🔴 P1 | NOL notif renew → tenant tak tahu nasib perpanjangan = vacancy/churn. | `renew-requests.service.ts` | **F2-2** salin pola checkout-requests:294-422 |
| Sweeper-cancel | 🟠 P2 | Booking dibatalkan otomatis (expiry/H+1) tanpa notif tenant + alasan (E3). | `cancelEndedUnpaidStay`/`expireBookingTx` | **F2-17** notif di LUAR tx |
| N-02 | 🟡 P3 | Publish announcement ber-startsAt masa depan → notif instan, konten belum tayang. | `announcements.service.ts:116` | **F3-13** tunda notif sampai startsAt |
| Coverage 5 | 🟡 P3 | ticket-assigned→staf, wifi-order, room-ready, payment-submitted→admin, K-8 penerima. | berbagai | **F3-1/F3-2** best-effort + dedupe |
| N-04 | INFO | AppNotification tanpa retensi → tumbuh tanpa batas (broadcast ALL). | `app-notification.service.ts` | **F4-7** pruning >90 hari |
| B-14 | 🟡 P3 | Reminder exact-match daysLeft → downtime di hari gelombang = gelombang hilang. | `auto-ops.service.ts:451-457` | **F3-13** window `<=` + dedupe gelombang |

## 4. Task
- **F2-2 · FASE 2:** notif renew (request→admin, approve/reject→tenant, prompt H-10) + fallback antrean admin untuk tenant tanpa portal.
- **F2-3 · FASE 2:** copy A17 dua varian (loser sudah-transfer vs belum). **F2-3b:** field bukti refund di sistem (lihat dossier 10/12).
- **F2-17 · FASE 2:** notif booking-dibatalkan-sweeper + alasan.
- **F3-1 · FASE 3:** coverage 5 event (ticket-assign+K-8 penerima, wifi, room-ready, sweeper) best-effort+dedupe. **F3-2:** inbox admin payment-submitted (pola notifyOwnerAdminOnCreate).
- **F3-13:** N-02 + B-14. **F4-7:** pruning. **F4-2 (Phase 3):** push 4 kelompok (J-d) via outbox.

## 5. Konvensi & invarian
- **Konvensi event baru:** penerima eksplisit; linkTo terdalam relevan; dedupe key (recipient, entityType, entityId, title); best-effort never-throw; di LUAR tx bila pasca-commit.
- **Util target:** `notifySafe({recipient,dedupeKey,...})` terpusat (Langkah 1 murah) sebelum outbox push (Phase 3).
- **Prioritas penutupan:** renew (vacancy) > A17 copy (kepercayaan) > payment-submitted (kecepatan kas) > ticket-assign (SLA) > room-ready > wifi.
- **Pola terbaik (template):** `checkout-requests.service.ts:294-345` notifyOwnerAdminOnCreate.
