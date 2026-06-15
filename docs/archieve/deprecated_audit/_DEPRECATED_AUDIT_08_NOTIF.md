# NOTIFIKASI & PENJADWALAN DEEP (V3) — Coverage 22 event re-verifikasi dari source; 14/22 ternotifikasi; 4 temuan kualitas baru N-01..N-04; auto-ops 9 job TANGGUH (baca penuh 1.031 baris)
**Basis baca:** `app-notification.service.ts` (104 baris penuh), `announcements.service.ts` (:100-260), `auto-ops.service.ts` (penuh), notifikasi inline di payment-submissions/tenant-bookings/checkout-requests/tickets/renew-requests.

## Coverage Matrix 22 event (verifikasi langsung di source 2026-06-13)
| Event | Notif? | Evidence | Catatan |
|---|---|---|---|
| Payment submitted → admin | ❌ | grep createSubmission: tidak ada notif | Pola SUDAH ADA utk disalin: `checkout-requests.service.ts:294-345` notifyOwnerAdminOnCreate (Promise.allSettled per admin) |
| Payment approved → tenant | ✅ | `payment-submissions.service.ts:1488-1514` dedupe + best-effort | linkTo /portal/stay |
| Payment rejected → tenant | ✅ | `:1516-1548` + alasan (cap 500 char) | linkTo /portal/bookings |
| Booking approved / rejected → tenant | ✅ / ✅ | `tenant-bookings.service.ts:979 / :1016` dedupe + never-throw | — |
| Booking dibatalkan sweeper (expiry 3 jam / noon / H+1) → tenant | ❌ | `expireBookingTx`, `cancelEndedUnpaidStay` — nol notif | Tenant tahu booking hilang hanya saat buka portal |
| Kalah first-paid-wins (A17) → tenant | ✅ tapi 🔴 copy | `payment-submissions.service.ts:832-852` | **N-01:** copy `:843` "Tidak ada dana yang terpotong dari Anda" SALAH utk loser PENDING_REVIEW yang sudah transfer (submission di-EXPIRED :781-792) — W-B03 |
| Renew request dibuat → admin | ❌ | `renew-requests.service.ts` tanpa import AppNotification | bandingkan checkout yang punya |
| Renew approved / rejected → tenant | ❌ / ❌ | idem — NOL notifikasi seluruh file | P1 coverage: vacancy risk |
| Checkout request dibuat → admin | ✅ | `checkout-requests.service.ts:122,294-345` | pola terbaik utk disalin |
| Checkout approved / rejected → tenant | ✅ / ✅ | `:195/:244 → :354/:392` | — |
| Reminder kontrak H-7/H-3/H-1/H-day → tenant | ✅ | `auto-ops.service.ts:428-497` dedupe judul per gelombang | **B-14:** exact-match daysLeft (:457) → downtime di hari gelombang = gelombang hilang tanpa catch-up |
| Overstay EVICT → staf | ✅ via tiket | `auto-ops:789-805` (tiket, bukan notif) | staf tanpa notif assign tetap harus buka app |
| Forced checkout H+1 → tenant | ✅ | `auto-ops:665-679` di luar tx (benar: tak terkirim bila rollback) | — |
| Forced checkout BLOCKED → admin/owner | ✅ | `auto-ops:687-729` dedupe harian per admin | **B-07:** DRAFT invoice ikut memblokir → alert merah TIAP HARI selamanya |
| Room ready (tiket inspeksi closed) → admin/tenant booking | ❌ | tickets.close :700-709 ubah room tanpa notif | calon penghuni yang menunggu kamar bersih tidak diberi tahu |
| Ticket assigned → staf | ❌ | `tickets.service.ts:405-435` assign tanpa notif | staf harus buka app |
| Ticket closed → pelapor | 🟡 | hanya BARANG_PINDAH dan SALAH PENERIMA (K-8: ke actor penutup sendiri, `tickets:651-659`) | regex parse hanya utk copy — risiko rendah |
| Announcement published → audiens | ✅ | `announcements.service.ts:181-245` dedupe per user, audiens TENANT = stay aktif + room OCCUPIED | **N-02:** publish dgn `startsAt` masa depan → notif terkirim SEKARANG, item belum tayang; **N-03:** tenant fase booking (RESERVED) tak menerima — disengaja? |
| WiFi order confirmed → tenant | ❌ | `wifi-sales.service.ts` nol notif | — |
| Tenant review ≤2⭐ → admin | ✅ | `tenant-staff-reviews.service.ts:94-107` (V1 verified) | — |

**Skor coverage: 14 ✅ / 2 🟡 / 6 ❌** (V1: 13/22 — checkout-create ditemukan sudah ada).

## Temuan kualitas notifikasi BARU
| # | Sev | Issue | Fix |
|---|---|---|---|
| N-01 | 🔴 | Copy A17 menyangkal dana loser yang sudah transfer (lihat atas) | W-B03 segera; bedakan loser ber-submission EXPIRED vs tanpa submission |
| N-02 | 🟡 | Publish announcement ber-`startsAt` masa depan → notif instan, konten belum tampil di portal (window filter) | Tunda notif sampai startsAt (atau larang publish sebelum startsAt) |
| N-03 | INFO | Audiens TENANT disaring room OCCUPIED (`announcements:188-204`) — tenant booking/baru bayar DP tidak dapat pengumuman | Konfirmasi kebijakan owner |
| N-04 | INFO | `appNotification` tanpa retensi/pembersihan — tumbuh tanpa batas; broadcast ALL × user × pengumuman | Job pruning >90 hari (Fase 3/PWA outbox) |

## Auto-Ops Reliability — 9 job (verifikasi penuh)
| Check | Status | Evidence |
|---|---|---|
| Mutex + sequential | ✅ | `running` :89-92; urutan :94-105 (expiry → reminders → DP-forfeit → forced-checkout → H+1 cancel → noon → healer → evict → auto-close) |
| Try/catch per item | ✅ | :150-153, :197-199, :415-417, :534-536, :860-862 |
| Take limit | ✅ | 100 (:143,184,400,762,847,875), 200 (:448 reminder), 50 (:526 forced-checkout) |
| Gerbang WIB pk 12 | ✅ | `jakartaHour >= 12` :166, :380, :510, :741 |
| Lock FOR UPDATE + re-cek dalam tx | ✅ | :230-242, :558-575, :935-956 |
| Uang masuk = stop otomatisasi | ✅ | submission PENDING/APPROVED & invoice PAID/PARTIAL guard :246-262, :944-956 |
| Reversal jurnal blocking | ✅ | :287-293, :989-995 |
| Satu pintu cancel (noon vs H+1) | ✅ | `cancelEndedUnpaidStay:214-370` dipakai 3 job; kebijakan identik | 
| Interval & enable | ✅ | env AUTO_OPS_ENABLED + min 60 dtk :42 |
| Sisa risiko | 🟡 | B-06 copy "DP hangus" di job non-forfeit; B-07 DRAFT blokir; B-14 gelombang reminder tanpa catch-up; in-memory interval = single-instance only (selaras rate-limit) |

## Kalender & antrian (tetap kosong — verifikasi grep frontend)
| Item | Status |
|---|---|
| Occupancy heatmap kalender (admin) | ❌ grep `calendar|heatmap` komponen = 0 — rekomendasi #1 di `AUDIT_10_VISUALIZATION.md` |
| Calendar picker ketersediaan (tenant) | ❌ input tanggal polos |
| Queue dashboard (umur PENDING_REVIEW, booking→approve) | ❌ hanya count di businessHealth — F3-8 |

## RECOMMENDATIONS (ordered)
1. N-01/W-B03: perbaiki copy A17 (3 baris, dampak kepercayaan uang).
2. Notif renew (request→admin, approved/rejected→tenant) — salin pola checkout-requests verbatim (F2-2; P1 karena vacancy risk).
3. Notif ticket-assigned → staf (`tickets.assign:421` + best-effort create) + perbaiki penerima K-8.
4. Notif booking-dibatalkan-sweeper → tenant (best-effort di `cancelEndedUnpaidStay`/`expireBookingTx`, di LUAR tx).
5. Inbox admin payment-submitted (salin notifyOwnerAdminOnCreate) + WiFi order + room-ready.
6. B-14: reminder window `<=` + dedupe gelombang (tahan downtime).
7. Pruning notifikasi >90 hari sebelum PWA push (hindari outbox membengkak).

## OPEN QUESTIONS → sebagian TERJAWAB 2026-06-13 (`04_KEPUTUSAN_OWNER.md`)
- N-03 pengumuman utk tenant fase booking? → **TIDAK, cukup tenant huni** (D-10) → kode sekarang benar, tutup tanpa perubahan.
- Prioritas event PWA push Phase 3 → ✅ TERJAWAB (J-d): **4 kelompok** = (1) pengingat kontrak H-10..H-day, (2) pembayaran disetujui/ditolak, (3) booking dibatalkan/DP hangus/kalah cepat, (4) tiket baru utk staf + ajakan tenant menilai. Selaras model tenant-pengawas.

---

## LAMPIRAN A — Audit per-file domain notifikasi (format V3 §5)

### backend/src/modules/notifications/app-notification.service.ts (104 baris — dibaca penuh)
- **Function:** Primitif notifikasi: create, listMine (paging + unreadCount), markRead, markAllRead.
- **Audit:** kepemilikan dicek saat markRead (:66-73) ✅; idempotent-read (:75-81) ✅; tanpa retensi (N-04); tanpa konsep prioritas/kategori (semua flat — cukup utk sekarang, jadi penting saat push).
- **Theory ref:** Inbox pattern.
- **Verdict:** ✅ sederhana & benar.

### backend/src/modules/announcements/announcements.service.ts (:100-260 — dibaca)
- **Function:** CRUD pengumuman + publish + broadcast notifikasi ber-dedupe.
- **Audit:** transisi publish terdeteksi di create/update/publish (3 jalur, konsisten) ✅; broadcast per-user try/catch individual (:212-244) — satu gagal tidak memblok ✅; N-02 (notif instan utk startsAt masa depan, :116/:150/:161 memanggil notifyPublished tanpa cek startsAt); N-03 (audiens TENANT = room OCCUPIED only :188-204); validateWindow menolak startsAt lampau (:247-257).
- **Theory ref:** Broadcast dedupe; eventual consistency.
- **Verdict:** ✅ dengan 2 kebijakan perlu konfirmasi.

### backend/src/modules/notifications/reminder-preview.service.ts + reminder-mock.service.ts (V1 + spot-check)
- **Function:** Pratinjau & mock pengiriman reminder (alat admin, bukan jalur produksi).
- **Audit:** terpisah dari jalur auto-ops nyata — aman; tidak ada temuan baru.
- **Verdict:** ✅.

### Notifikasi inline di service lain (pola terverifikasi satu-satu)
| Lokasi | Pola | Nilai |
|---|---|---|
| payment-submissions :1488/:1516 | dedupe by (recipient,entity,title) + catch kosong | ✅ baku |
| tenant-bookings :959-1025 | idem + komentar "never throw" | ✅ baku |
| checkout-requests :294-345 | broadcast admin Promise.allSettled | ✅ TERBAIK — template F2-2/F3-2 |
| auto-ops :482 reminder | dedupe per judul-gelombang | ✅ + B-14 |
| auto-ops :665-679 forced-checkout | dikirim DI LUAR tx | ✅ pola benar utk notif pasca-commit |
| auto-ops :687-729 blocked-checkout | dedupe HARIAN per admin | ✅ + B-07 frekuensi |
| tickets :651-659 BARANG_PINDAH | penerima = actor sendiri | ❌ K-8 |

## LAMPIRAN B — Desain target arsitektur notifikasi (menuju PWA push, bahan diskusi)
1. **Sekarang (in-app):** create langsung di service — cukup, tapi pola tersebar di 8 file dgn 3 varian dedupe.
2. **Langkah 1 (murah):** util `notifySafe({recipient, dedupeKey, ...})` di NotificationsModule — satukan dedupe + catch + logging; migrasi bertahap per file saat file tsb disentuh task lain.
3. **Langkah 2 (pra-push):** tabel outbox (event → fanout) HANYA saat Phase 3 PWA; jangan bangun sekarang (YAGNI).
4. **Aturan tetap:** notif TIDAK pernah ditulis di dalam tx yang bisa rollback, KECUALI memang ingin ikut rollback (kasus reminder dlm loop aman karena bukan tx).

## LAMPIRAN B2 — Kontrak event notifikasi yang ADA (referensi penerima/link/dedupe utk F2-2/F3-1)
| Event | Penerima | linkTo | Dedupe key |
|---|---|---|---|
| payment approved | tenant pemilik | /portal/stay | (recipient, PAYMENT_SUBMISSION, id, title) |
| payment rejected | tenant | /portal/bookings | idem |
| booking approved/rejected | tenant | /portal/bookings | (recipient, Stay, id, title) |
| A17 kalah cepat | tenant loser | /rooms | tanpa dedupe formal (loop sekali) |
| checkout created | semua admin/owner aktif | /stays | per request |
| checkout approved/rejected | tenant | /portal/stay | per request |
| reminder H-x | tenant promoted | /portal/stay | (recipient, Stay, id, judul-berisi-daysLeft) |
| forced checkout | tenant | /portal/stay | sekali (pasca-tx) |
| blocked checkout | admin/owner | /stays | (…, title, createdAt ≥ hari ini WIB) |
| announcement | audiens | /portal/announcements vs /announcements per role | (recipient, ANNOUNCEMENT, id) |
| review ≤2⭐ | admin | tiket terkait | per review |
- Konvensi utk event BARU (F2-2/F3-1): ikuti tabel ini — penerima eksplisit, linkTo terdalam yang relevan, dedupe (recipient, entityType, entityId, title).

## LAMPIRAN C — Prioritas penutupan 6 lubang coverage (urut dampak bisnis)
1. Renew (3 event) — vacancy & churn risk langsung (F2-2).
2. Payment-submitted → admin — kecepatan approve = kecepatan kas masuk (F3-2).
3. Sweeper-cancel → tenant — komplain "booking saya hilang tanpa kabar" (F3-1).
4. Ticket-assigned → staf — SLA pengerjaan (F3-1).
5. Room-ready — pengalaman calon penghuni yang menunggu (F3-1).
6. WiFi order — kecil tapi murah (F3-1).

## Definisi selesai notifikasi "hijau penuh"
1. 20/22 event ternotifikasi (sisa 2 = keputusan owner sadar utk tidak dikirim).
2. Copy A17 tidak pernah menyangkal fakta uang (N-01 fix terverifikasi dua varian).
3. Util `notifySafe` terpusat dipakai ≥80% jalur (dedupe + catch + log seragam).
4. Job pruning notifikasi >90 hari aktif (tabel tidak tumbuh tanpa batas).
5. Auto-ops 9 job tetap lulus 9 check reliability (regression: jangan turun).
6. Heatmap okupansi + queue dashboard tersedia (mengisi kekosongan kalender).

## Catatan penutup domain
Lapisan notifikasi adalah area dengan **jarak terjauh antara "secara teknis ada" dan "lengkap secara produk"**: primitifnya benar dan beberapa jalur (checkout) sudah teladan, tetapi coverage bolong di titik-titik yang justru paling memengaruhi retensi (renew) dan kepercayaan (A17). Kabar baiknya, semua perbaikan adalah penyalinan pola yang SUDAH ada di codebase — risiko implementasi rendah, nilai bisnis tinggi. Auto-ops sendiri tidak perlu disentuh secara struktural; hanya 4 sentuhan copy/kebijakan kecil (B-06/B-07/B-14/N-02).
