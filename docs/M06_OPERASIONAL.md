# KOST48 V5 - Operasional, Inventaris, Staf, Notifikasi, Auth

> File hasil pemampatan dari dokumen root `docs/`. File sumber lama sudah diarsipkan ke `docs/archieve/2026-06-16_root_docs_pre_M/`.

## Tujuan

Operasional harian: inventaris, staf/tiket/KPI, notifikasi/pengumuman, auth/onboarding, dan proposal meter listrik/air.

## Sumber Digabung

- `docs/14_INVENTARIS.md` - konten dipertahankan
- `docs/15_STAF_TIKET_KPI.md` - konten dipertahankan
- `docs/16_NOTIFIKASI_PENGUMUMAN.md` - konten dipertahankan
- `docs/18_AUTH_FONDASI_ONBOARDING.md` - konten dipertahankan
- `docs/_PROPOSAL_METER_LISTRIK_AIR.md` - konten dipertahankan

## Catatan Pemakaian

- Jadikan file ini pintu masuk tematik; bila butuh detail mentah, cek file sumber di arsip yang disebut di atas.
- Heading asli dinaikkan levelnya agar tidak bertabrakan dengan struktur M-file.


## Bagian 1 - `docs/14_INVENTARIS.md`

### DOSSIER 14 — INVENTARIS & BARANG KAMAR
**Domain:** stok gudang, pergerakan (movement), barang per kamar (RoomItem), laporan kondisi staf, sinkronisasi 3 jalur. **Flow 9.**
**Status:** 🟢 SEHAT — qty single-writer via trigger DB; ghost-stock TIDAK ada di jalur resmi. 1 lubang nyata (I-02) di jalur admin-review.
**File inti:** `inventory-movements.service.ts` (176), `room-items.service.ts` (284), `staff-field-reports.service.ts` (651), `inventory-items.service.ts` (16.5KB), trigger `sql/bootstrap.sql:558-622`.

---
#### 1. Aturan bisnis
- **Qty single-writer:** satu-satunya pengubah qty = trigger DB `inventory_movement_sync_qty_trg`; service hanya self-healing (tulis bila beda), bukan penambah kedua.
- **Movement tak boleh diedit** (wajib mutasi koreksi); catatan ≥8 char; ADJUSTMENT ditolak.
- **RoomItem create/ubah-qty langsung DIBLOKIR** — hanya via movement ASSIGN/RETURN.
- **Staf** hanya boleh LAPOR status (DAMAGED/MAINTENANCE/MISSING) + wajib catatan/foto; status final menunggu admin.
- **Status barang saat ASSIGN ditentukan admin**, bukan auto-GOOD.
- **Riwayat barang ditarik (qty 0): hapus record RoomItem**; jejak tetap ada di movement, AuditLog, dan tiket.

#### 2. Peta kode (3 jalur sinkron qty)
| Jalur | Lokasi | Lock | Validasi RETURN | Status |
|---|---|---|---|---|
| 1. Movement resmi | `inventory-movements.service.ts:43-70` | ✅ `:88` | ✅ `:94-103` | 🟢 RUJUKAN EMAS |
| 2. Laporan staf (status only) | `room-items.service.ts:115-274` | n/a | n/a | 🟢 |
| 3. Admin-review field report (boleh buat movement) | `staff-field-reports.service.ts:478-505` | ❌ | ❌ | 🔴 I-02 |

#### 3. Temuan audit
> 🔄 **SINKRON KODE (2026-06-15, audit menyeluruh):** 🔴 **I-02/F2-5 SUDAH DITUTUP** — `adminReview` kini pakai util bersama `common/utils/room-booking.util` (`assertRoomItemQtyAvailableTx`/`syncRoomItemTx`) dgn lock + validasi qty RETURN (`staff-field-reports.service.ts:11,488-489`). Ghost-stock via admin-review tertutup; helper terkonsolidasi (X-01/X-03/I-03 ikut beres). Baris 🔴/🟠 di tabel = historis, bukan TODO.
| ID | Sev | Dampak bisnis | Lokasi | Fix/Task |
|---|---|---|---|---|
| I-02 | 🔴 P2 | adminReview buat movement TANPA lock + TANPA validasi qty-kamar RETURN → bisa ghost-stock (kamar 1 kasur, RETURN qty 3 → gudang +2 fiktif). Satu-satunya vektor ghost-stock nyata. | `staff-field-reports.service.ts:478-505,563-597` | **F2-5** pakai util movement resmi (lock+validasi) |
| I-03 | 🟡 P3 | Dua salinan syncRoomItem beda kebijakan status (review set GOOD, resmi tidak). | `staff-field-reports.service.ts:629-632` | **F2-5** satukan; admin pilih status |
| I-01 | 🟡 P3 | Dedupe tiket laporan barang fuzzy match by-nama → barang mirip ("Kasur"/"Kasur Busa") tiketnya tercampur. | `room-items.service.ts:170-183` | prioritaskan `linkedRoomItemId` saja |
| I-05 | 🟡 P3 | Admin update status barang tanpa wajib catatan (staf justru wajib) — keadilan jejak. | `room-items.service.ts:103-113` | wajibkan note ≥8 char admin |
| X-01 | 🟡 P3 | `syncRoomItem`/`generateTicketNumber`/`releaseRoomAfterBookingCancelTx` ada 2-3 salinan → kebijakan mulai drift. | beberapa file | **F2-5** konsolidasi util bersama |
| I-04/I-06/I-07 | INFO | RoomItem delete saat qty 0; movementDate bebas; generateTicketNumber duplikat. | — | sadar/ikut F2-5 |
| (sehat) | ✅ | trigger DB single-writer + edit-movement diblokir = inventaris lebih disiplin dari kebanyakan sistem kos. | — | pertahankan |

#### 4. Task
- **F2-5 · FASE 2 🔴:** tutup ghost-stock — ekstrak `lockInventoryQtyTx`+`assertRoomItemQtyAvailableTx`+`ensureInventoryQtySyncedTx`+`syncRoomItem` ke util bersama; `adminReview` pakai util sama. Sekalian konsolidasi `generateTicketNumber` + `releaseRoomAfterBookingCancelTx`. Kriteria: RETURN qty>kamar via adminReview → 409; race 2 admin → 1 sukses 1 konflik.
- I-01/I-05 menumpang sesi F2-5 (file sama).

#### 5. Invarian, verifikasi, tools
- **Invarian:** `qtyOnHand = stok awal + Σ delta movement` (trigger=single writer); `RoomItem.qty` per (item,kamar) = ΣASSIGN−ΣRETURN, tak pernah negatif; tiap perubahan qty berjejak movement+AuditLog; movement tak pernah diedit (koreksi=movement lawan).
- **UAT regresi F2-5:** (1) kamar 1 kasur + adminReview RETURN qty 3 → HARUS 409; (2) 2 admin paralel approve item sama → 1 sukses 1 konflik; (3) movement resmi RETURN>kamar → 409 (regresi tetap).
- **Pemeriksaan historis I-02:** query InventoryMovement RETURN dari relatedMovement adminReview → cek selisih (belum-publish: dampak retroaktif nihil; tetap fix kode).
- **Tools belum ada (rekomendasi):** inventory turnover, dead-stock (item tanpa movement >90 hari). EOQ tidak relevan (consumable sedikit).
- **Pelajaran arsitektural** (layak masuk CLAUDE.md): setiap penulis qty baru WAJIB lewat util movement resmi — jangan tulis versi longgar.


## Bagian 2 - `docs/15_STAF_TIKET_KPI.md`

### DOSSIER 15 — STAF, TIKET & KPI
**Domain:** manajemen tiket operasional, work queue staf, staff performance KPI, round-robin assignment. **Flow 11.**
**Status:** 🟡 Tiket/KPI parsial — STAFF close dibatasi ke CHECKOUT_INSPECTION, prompt review tenant aktif, dan **workflow verifikasi review (≤2 → PENDING_VERIFICATION → owner verify, KPI hanya hitung VISIBLE) SUDAH** (F2-18, 2026-06-14). Sisa utama: SLA/KPI per kategori (F3-19).
**File inti:** `tickets.service.ts` (assign/close/auto-create), `tickets.controller.ts`, KPI data dari `reviews` + `tickets`.
**🆕 Backlog (F4-14, ide owner 2026-06-15):** **tip ke staf** setelah keluhan tenant selesai — tenant beri tip langsung via link **GoPay/OVO/Bank/DANA milik staf**. **Owner HANYA sediakan fitur/link; aliran uang TIDAK direkap/dijurnal** (P2P tenant→staf, di luar buku kos — JANGAN buat jurnal). Perlu field rekening/e-wallet di profil staf + UI link di tiket selesai.

---
#### 1. Aturan bisnis
- **Tiket lifecycle aktual:** OPEN → IN_PROGRESS → DONE → CLOSED, dengan CANCELLED dari kondisi yang diizinkan.
- **Kategori:** CHECKOUT_INSPECTION, EVICT_OVERSTAY, BARANG_PINDAH, AUDIT_INVENTARIS, PEMERIKSAAN, MAINTENANCE, KEBERSIHAN, KUNCI, INVENTARIS, KERUSAKAN.
- **Auto-created:** CHECKOUT_INSPECTION (setelah final checkout), EVICT_OVERSTAY (H-day overstay).
- **Staff boleh close** tiket CHECKOUT_INSPECTION → room MAINTENANCE → AVAILABLE (guard keselamatan tetap).
- **Room readiness gate:** tidak AVAILABLE jika: active stay lain, room ≠ MAINTENANCE, kondisi tidak aman.
- **Round-robin assignment (F2-10):** ✅ DISIAPKAN & DORMAN (2026-06-15). `pickStaffAssigneeTx` di `createTicketRecord` — 1 staf → semua ke dia; **≥2 staf → round-robin berbasis beban** (otomatis aktif). **Leaderboard (F3-5):** ✅ `getLeaderboard` + `GET /admin/staff-performance/leaderboard` (`active=false` saat <2 staf; auto-aktif ≥2).

#### 2. Peta kode
| Aksi | Lokasi |
|---|---|
| Ticket CRUD + assign/close | `tickets.service.ts` |
| Auto-create CHECKOUT_INSPECTION | `stays.service.ts:605-654` (dedupe) |
| Staff work queue | `tickets.controller.ts` GET endpoint |
| KPI calculation (resolved rate, avg time) | `tickets.service.ts` / frontend dashboard |
| Staff review (tenant rating) | `reviews` module |

#### 3. Temuan audit
> 🔄 **SINKRON KODE (2026-06-15, audit menyeluruh):** **K-5/F2-14 SUDAH SELESAI** — `monthRange` dihitung dalam WIB (`staff-performance.service.ts:9-22`), laporan bulanan tak bergeser hari. Round-robin tiket SISTEM (AUD-5/F5-3) kini juga aktif (util bersama `pickRoundRobinStaffTx`); tiket cuci AC dibuat tanpa assignee + bisa ditandai vendor. Baris di tabel/task = historis.
| ID | Sev | Dampak bisnis | Lokasi | Fix/Task |
|---|---|---|---|---|
| K-1 | ✅ RESOLVED (F3-19, 2026-06-14) | Waktu penyelesaian KPI dihitung dari `assignedAt` (bukan `createdAt`) via `avgResolutionHours` di staff summary — idle antrean tak menghukum staf. | `staff-performance.service.ts` | **F3-19** |
| K-2 | ✅ RESOLVED (F3-19, 2026-06-14) | SLA per kategori (`Ticket.dueAt`, `ticket-sla.ts`) + eskalasi `runTicketSlaEscalation` (L0→1 admin, L1→2 owner). | `tickets.service.ts`, `auto-ops.service.ts` | **F3-19** |
| K-3 | 🟡 BACKEND DONE / FE polish (F3-19) | Backend ekspos `ticketsDoneByCategory` + `slaOnTime/slaBreached`; tampilan breakdown di dashboard FE = polish lanjutan. | `staff-performance.service.ts` (+FE) | **F3-19** |
| K-4 | 🟡 P3 | Review tenant ≤2⭐ wajib kategori komplain — verified OK (V5.10.0). | `TenantStaffReviewPrompt` | pertahankan |
| K-5 | 🟡 P3 | **MonthRange menggunakan UTC/server time, bukan WIB** sehingga laporan bulanan bisa bergeser hari. | `staff-performance.service.ts`/rutinitas | **F2-14** |
| K-6 | 🟡 P3 | Ticket BARANG_PINDAH closed → penerima notif salah. | `tickets.service.ts` notif | **F3-1** |
| K-7 | 🟡 P3 | Admin alert rating < 3 → auto panel merah — verified OK (V5.10.0). | Frontend | pertahankan |
| K-8 | 🟡 P3 | Ticket-closed BARANG_PINDAH notification penerima salah (cross-ref K-6). | `tickets.service.ts` | **F3-1** |

#### 4. Task
- **F2-9 · FASE 2:** hilangkan double-count ticketsDone; dasar hitung = `resolvedAt` dalam bulan.
- **F2-14 · FASE 2:** monthRange WIB timezone fix. (K-5)
- **F2-18 · FASE 2:** model tenant-pengawas dan staff boleh close inspeksi dengan guard keselamatan.
- **F3-1 · FASE 3:** fix notification recipient untuk ticket BARANG_PINDAH. (K-6/K-8)
- **F3-19 · FASE 3 (SELESAI backend 2026-06-14):** `Ticket.assignedAt/dueAt/escalationLevel/escalatedAt`. SLA per kategori (`ticket-sla.ts`, 24j/3h/7h) di-set saat assign pertama (`assign`/`start`); KPI resolved-time dari `assignedAt` + `slaOnTime/slaBreached/avgResolutionHours/ticketsDoneByCategory`; eskalasi sweeper `runTicketSlaEscalation` (L0→1 admin, L1→2 owner, dedupe per level) + endpoint `POST /auto-ops/run/ticket-sla`. tsc 0 · unit 26/26. (Tampilan FE = polish.)
- **F3-20 · FASE 3 (SELESAI 2026-06-14):** tiket tenant ber-assignee STAFF memicu notifikasi ajakan review pada DONE dan CLOSED. Dedupe memakai recipient+title+entity; deep-link membuka `/portal/tickets`, tempat `TenantStaffReviewPrompt` mengambil tiket eligible.
- **F2-10/F3-5 · DITUNDA:** round-robin dan leaderboard antar-staf selama staf hanya satu.

#### 5. Invarian & UAT
- **Invarian:** tiket inspeksi dedupe per stay/room; staff close hanya CHECKOUT_INSPECTION; room tidak AVAILABLE tanpa close safe.
- **UAT:** (1) final checkout → tiket inspeksi muncul; (2) staff close inspeksi → room AVAILABLE; (3) KPI dashboard filter category bekerja; (4) monthRange WIB benar (pasca F2-14).

**Lintas-dossier:** tiket inspeksi → dossier 12 (checkout); staff report inventory → dossier 14; review tenant → dossier 17.


## Bagian 3 - `docs/16_NOTIFIKASI_PENGUMUMAN.md`

### DOSSIER 16 — NOTIFIKASI & PENGUMUMAN
**Domain:** notifikasi in-app, pengumuman, coverage event, rencana push (PWA Phase 3). **Flow 14.**
**Status:** 🟢 Coverage solid — notif siklus renewal, copy A17 dua-varian, inbox payment-submitted, prompt review tenant, prompt renewal H-10, fallback admin tenant tanpa portal, booking-dibatalkan-sweeper, **dan F3-1 (ticket-assign→assignee, room-ready→OWNER/ADMIN, K-6/K-8 BARANG_PINDAH→staf assignee)** sudah SELESAI (2026-06-14). wifi-order = lewat WhatsApp, tak ada event in-app. **F4-2 PWA Web Push SELESAI (2026-06-15)** — semua notif in-app diantre & dikirim sebagai push. Coverage notifikasi domain ini LENGKAP.
**File inti:** `app-notification.service.ts` (104), `announcements.service.ts` (:100-260), notif inline di payment-submissions/tenant-bookings/checkout-requests/auto-ops/tickets.

---
#### 1. Aturan bisnis
- **Notif in-app + PWA Web Push** (D2; push AKTIF sejak F4-2, 2026-06-15). Tenant/staf aktifkan via menu Notifikasi (opt-in, izin browser).
- **Pengumuman: Admin + Owner** boleh publish (J-c). Audiens TENANT = hanya yang OCCUPIED (N-03/D-10: tenant booking TIDAK terima — kode benar).
- **Reminder kontrak: H-10, H-7, H-3, H-1, H-day** (B1 — ✅ SELESAI 2026-06-14, `runContractEndReminders` REMINDER_DAYS `[10,7,3,1,0]`).
- **Push (J-d) SELESAI (F4-2): 4 kelompok event prioritas** — (1) pengingat kontrak, (2) pembayaran disetujui/ditolak, (3) booking dibatalkan/DP hangus/kalah cepat, (4) tiket baru utk staf + ajakan tenant menilai. Implementasi memush SEMUA notif in-app (pushStatus=PENDING saat create) → cakupan ≥ 4 kelompok. Selaras model tenant-pengawas.
- Notif TIDAK pernah ditulis di dalam tx yang bisa rollback (pola forced-checkout di LUAR tx).

#### 2. Coverage matrix (verifikasi grep)
✅ ada: payment approved/rejected, booking approved/rejected, checkout created/approved/rejected, reminder H-10/H-7/H-3/H-1/H-day, forced-checkout, A17 dua-varian, notif siklus renewal, booking-dibatalkan-sweeper, announcement, review ≤2, overstay-blocked admin, prompt renewal H-10 + fallback admin tenant tanpa portal.
✅ baru (F3-1): ticket-assigned→assignee (saat assignee berubah, skip self), room-ready→OWNER/ADMIN (CHECKOUT_INSPECTION close → kamar AVAILABLE, dedupe).
❌ bolong: wifi-order TIDAK ADA event in-app (tenant pesan via WhatsApp di `WifiOrderPage`).
✅ baru: payment-submitted→OWNER/ADMIN dan prompt-review tenant setelah tiket selesai, keduanya best-effort + dedupe.
✅ RESOLVED (K-6/K-8): ticket-closed BARANG_PINDAH kini ke staf assignee (di luar tx).

#### 3. Temuan audit
| ID | Sev | Dampak bisnis | Lokasi | Fix/Task |
|---|---|---|---|---|
| N-01 | ✅ RESOLVED | Copy A17 sudah dua varian berdasarkan keberadaan submission/DP; pencatatan refund lossRefund* sudah task F2-3b SELESAI. | `payment-submissions.notifyLosingTenants` | **F2-3 selesai; F2-3b selesai** |
| Renew notif | ✅ RESOLVED | Notif siklus renewal + prompt H-10 + fallback admin tenant tanpa portal sudah selesai 2026-06-14. | `renew-requests.service.ts`, `auto-ops.service.ts` | **F2-2 selesai** |
| Sweeper-cancel | ✅ RESOLVED | Booking yang dibatalkan expiry/H+1/DP-forfeit mengirim notif tenant di luar transaksi; UAT tercatat lulus. | `cancelEndedUnpaidStay`/`expireBookingTx` | **F2-17 selesai** |
| N-02 | ✅ RESOLVED (F3-13, 2026-06-14) | `notifyPublished` menahan notif bila `startsAt` masih di masa depan → tak ada lagi notif instan ke konten yang belum tayang. (Pengiriman tepat di `startsAt` butuh sweeper terjadwal = lanjutan.) | `announcements.service.ts` `notifyPublished` | **F3-13 (N-02 selesai)** |
| Coverage 5 | 🟡 PARSIAL | payment-submitted→OWNER/ADMIN dan prompt-review tenant sudah selesai; tersisa ticket-assigned→staf, wifi-order, room-ready, dan K-8 penerima. | berbagai | **F3-2 selesai**; lanjut **F3-1** |
| N-04 | ✅ RESOLVED (F4-7, 2026-06-14) | `pruneOlderThan(90)` + sweeper `runNotificationPruning` di `runAll` (env `NOTIFICATION_RETENTION_DAYS`/`NOTIFICATION_PRUNING_ENABLED`) menghapus notif `createdAt < now−retensi`, batch 5000. UAT ROLLBACK: 100hr terhapus, 10hr tetap. | `app-notification.service.ts`, `auto-ops.service.ts` | **F4-7 selesai** |
| B-14 | ✅ RESOLVED (F3-13, 2026-06-14) | `runContractEndReminders` pakai window (`daysLeft <= threshold`) + dedupe per (stay, gelombang) via judul stabil `H-{wave}`; downtime sweeper di hari-H gelombang tak lagi menghilangkan reminder. Fallback admin tenant-tanpa-portal ikut per-gelombang. | `auto-ops.service.ts` `runContractEndReminders` | **F3-13 (B-14 selesai)** |

#### 4. Task
- **F2-2 · FASE 2 (SELESAI 2026-06-14):** notif renew (request→admin, approve/reject→tenant, prompt H-10) + fallback antrean admin untuk tenant tanpa portal. UAT: stay H-10 → notif tenant; tenant non-portal → notif 3 admin.
- **F2-3 · FASE 2 (SELESAI 2026-06-14):** copy A17 dua varian (loser sudah-transfer vs belum). **F2-3b (SELESAI 2026-06-14):** field bukti refund di sistem — enum `RefundStatus` + 7 field `Stay.lossRefund*` + endpoint OWNER proses refund.
- **F2-17 · FASE 2 (SELESAI 2026-06-14):** notif booking-dibatalkan-sweeper + alasan. UAT: sweeper batalkan → tenant terima "Booking dibatalkan otomatis".
- **F3-1 · FASE 3:** coverage tersisa (ticket-assign+K-8 penerima, wifi, room-ready, sweeper) best-effort+dedupe.
- **F3-2 · FASE 3 (SELESAI 2026-06-14):** submission pembayaran yang sudah commit mengirim inbox dedupe ke seluruh OWNER/ADMIN aktif dengan deep-link review. UAT rollback: 3 penerima, dua pemanggilan tetap 3 notifikasi, residu 0.
- **F3-20 · FASE 3 (SELESAI 2026-06-14):** tiket tenant ber-assignee STAFF pada DONE/CLOSED mengirim ajakan review dedupe ke portal tenant. UAT rollback tiket #12: dua pemanggilan tetap 1 notifikasi, residu 0.
- **F3-13:** N-02 + B-14. **F4-7 (SELESAI 2026-06-14):** pruning notif >90 hari (sweeper `runNotificationPruning`). **F4-2 (SELESAI 2026-06-15):** PWA Web Push — `PushSubscription` + outbox in-place (`AppNotification.pushStatus/pushAttempts/pushedAt`) + sweeper `runPushDispatch` (VAPID, web-push) + service worker push/notificationclick + UI opt-in `PushToggle`. Endpoint: `GET /push/vapid-public-key`, `POST /push/subscribe`, `POST /push/unsubscribe`, `POST /auto-ops/run/push-dispatch`.

#### 5. Konvensi & invarian
- **Konvensi event baru:** penerima eksplisit; linkTo terdalam relevan; dedupe key (recipient, entityType, entityId, title); best-effort never-throw; di LUAR tx bila pasca-commit.
- **Util target:** `notifySafe({recipient,dedupeKey,...})` terpusat (Langkah 1 murah) sebelum outbox push (Phase 3).
- **Prioritas penutupan:** renew (vacancy) > A17 copy (kepercayaan) > payment-submitted (kecepatan kas) > ticket-assign (SLA) > room-ready > wifi.
- **Pola terbaik (template):** `checkout-requests.service.ts:294-345` notifyOwnerAdminOnCreate.


## Bagian 4 - `docs/18_AUTH_FONDASI_ONBOARDING.md`

### DOSSIER 18 — AUTH, FONDASI & ONBOARDING (KTP)
**Domain:** auth/identitas, manajemen user/tenant, guard & rate-limit, role OWNER-only, onboarding + verifikasi KTP, fondasi lintas-modul. **Flow 1 + fondasi.**
**Status:** 🟢 KUAT (enumeration-safe, suspend putus sesi, E-1 guard global). Tambahan keputusan: OWNER-only 4 area + KTP gate aktivasi.
**File inti:** `auth.service.ts` (12.6KB), `users.service.ts`, `tenants.service.ts` (20.1KB), `common/*` (guards, rate-limit, file-signature), `jwt.strategy.ts`.

---
#### 1. Aturan bisnis
- **E-1 APP_GUARD global default-deny TERPASANG** (sejak V5.12.2) — controller baru otomatis 401 kecuali `@Public`. (Koreksi: kontrak lama "tidak ada guard global" BASI.)
- **Role: OWNER/ADMIN/STAFF/TENANT.** **OWNER-only (D-17):** (a) tutup/buka periode akuntansi, (b) hapus/nonaktif user & staf, (c) ubah setelan kamar & harga, (d) proses deposit & refund settlement — ADMIN tidak boleh.
- **forgotPassword enumeration-safe** (respons identik); token reset di-hash SHA-256; suspend memutus sesi seketika (jwt.strategy validasi DB/request).
- **Rate limit:** global 300/menit/IP, auth 10/15menit/IP (in-memory; multi-instance perlu store bersama).
- **Onboarding minimal: nama + HP + KTP**; data lain dapat dilengkapi lewat quest gamifikasi.
- **KTP (E1/P1-P4):** upload **saat check-in / sebelum aktivasi**; tanpa KTP verified → **blokir aktivasi kamar** (tak jadi OCCUPIED); simpan **terproteksi Bearer-scoped, admin/owner-only, hapus saat tenant keluar** (UU PDP); **cukup FOTO** (verifikasi visual, tidak simpan NIK).
- File security (sudah ada, pola dipakai KTP): magic-byte, rename CSPRNG, anti path-traversal, `private, no-store`.

#### 2. Peta kode
| Aksi | Lokasi |
|---|---|
| Login/me/forgot/reset/change | `auth.service.ts:28/75/96/152/218` |
| Guard global + @Public | `common/guards/*`, `app.module.ts` (E-1) |
| Rate limit | `common/middleware/rate-limit.middleware.ts` |
| User/tenant CRUD + portal access | `users.service.ts`, `tenants.service.ts:47/60/73` |
| File proof terproteksi (pola utk KTP) | `payment-submissions` proof endpoint + `common/utils/file-signature.util.ts` |

#### 3. Temuan audit
> 🔄 **SINKRON KODE (2026-06-15, audit menyeluruh):** **X-01/X-03/F2-5 SUDAH SELESAI** — helper keselamatan (qty inventaris, ticket-number, room-release) dikonsolidasi ke `common/utils/` (mis. `room-booking.util`, `staff-assignment.util`, `ticket-number.util`); jalur admin-review pakai util sama (ghost-stock tertutup). **Catatan go-live (L-4):** gate aktivasi KTP default OFF → WAJIB `KTP_ACTIVATION_GATE_ENABLED=true` di produksi (`04_DEPLOY`).
| ID | Sev | Dampak bisnis | Lokasi | Fix/Task |
|---|---|---|---|---|
| D-17 OWNER-only | ✅ SELESAI (2026-06-14) | 4 area kini OWNER-only (ADMIN→403): periode, user/staf (+role/isActive), setelan kamar & harga, deposit/refund. UAT lulus. | `users`/`rooms`/`stays`/`accounting` controller @Roles | **F2-16 ✅** |
| E1 KTP | ✅ RESOLVED (F3-17, 2026-06-14) | Foto KTP terproteksi (OWNER/ADMIN-only), verifikasi OWNER, gate aktivasi env-gated, hapus PDP saat checkout. Foto saja (NIK teks `identityNumber` terpisah). | `tenants.controller/service`, `stays.service` | **F3-17 selesai** |
| X-01 | 🟡 P3 | Util keselamatan tersebar (releaseRoom/generateTicketNumber/syncRoomItem 2-3 salinan). | lintas-modul | konsolidasi (ikut F2-5 dossier 14) |
| X-02 | 🟡 P3 | 76 nama foto kamar hardcoded di service. | marketing service | **F3-11** (dossier 17) |
| X-03 | 🟡 P3 | **Audit trail helpers terduplikasi** — `generateTicketNumber`, `releaseRoom`, `syncRoomItem` memiliki 2-3 salinan identik di berbagai service (tickets, stays, inventory). Satu source of truth rusak → semua jalur berbeda behavior. Cross-ref I-02 (ghost-stock via admin review). | lintas-modul: `tickets.service.ts`, `stays.service.ts`, `inventory-movements.service.ts`, `staff-field-reports.service.ts` | **F2-5**: konsolidasi ke shared helper (extract ke `common/utils/`) + gunakan satu implementasi untuk semua jalur |
| Auth | ✅ | enumeration-safe + suspend putus sesi + token hash = fondasi kuat. | `auth.service.ts` | pertahankan |
| Refresh token | INFO sadar-risiko | Tidak ada refresh token (expiry 24 jam). JWT di localStorage (PWA risk). | — | tunda (E-8 area) |
| Rate limit | INFO | In-memory per-proses; multi-replica perlu Redis. | middleware | tunda sampai skala |

#### 4. Task
- **F2-16 · FASE 2 ✅ SELESAI (2026-06-14):** perketat OWNER-only 4 area D-17 (ADMIN→403): periode (sudah OWNER); `users` create/update (cegah nonaktif + eskalasi role); `rooms` create/update/fasilitas/upload-image; `stays :id/deposit/process`. UAT: ADMIN 403, OWNER lolos. Scoping: `tenants portal-access/status` dibiarkan OWNER+ADMIN (moderasi tenant).
- **F2-5 · FASE 2:** konsolidasi helpers terduplikasi ke `common/utils/` — `generateTicketNumber`, `releaseRoom`, `syncRoomItem`. (X-01, X-03, cross-ref dossier 14 I-02)
- **F3-17 · FASE 3 (SELESAI 2026-06-14, schema approved):** `Tenant.ktpImage*`+`ktpVerifiedAt`+`ktpVerifiedById`+`ktpDeletedAt`. `POST /tenants/:id/ktp/upload` (OWNER/ADMIN, MIME-sig, folder `uploads/ktp-images`); `POST :id/ktp/verify` (OWNER); `GET :id/ktp/image` **OWNER/ADMIN-only** (no-store/nosniff/Vary); gate aktivasi `stays.create` via env `KTP_ACTIVATION_GATE_ENABLED` (default OFF); hapus PDP otomatis saat checkout (no other active stay) + manual `DELETE :id/ktp`. Foto saja (NIK teks terpisah). tsc 0 · unit 26/26.

#### 5. Invarian & verifikasi
- **Invarian:** controller tanpa `@Public` = wajib auth (default-deny); suspend = sesi putus seketika; token reset sekali pakai + berbatas waktu + disimpan sebagai hash; data sensitif (KTP) minimal + terproteksi + dihapus saat keluar.
- **UAT:** (1) controller baru tanpa @Public → 401; (2) suspend tenant → request berikutnya 401; (3) ADMIN coba tutup periode/ubah harga → 403 (pasca F2-16); (4) aktivasi kamar tanpa KTP verified → blocked (pasca F3-17); (5) forgot-password user tak-ada vs ada → respons identik.
- **Lintas-dossier:** OWNER-only deposit → dossier 12/13; KTP gate aktivasi → dossier 11 (booking); helper konsolidasi → dossier 14.


## Bagian 5 - `docs/_PROPOSAL_METER_LISTRIK_AIR.md`

### PROPOSAL — Meter Listrik & Air: Pascabayar Murni (keputusan owner 2026-06-16)

Status: **DISETUJUI owner (model & tampilan)**, implementasi BERTAHAP (belum mulai).
Terkait: dossier `10_PEMBAYARAN_INVOICE`, `03_KEPUTUSAN_OWNER`, `12_CHECKOUT_DEPOSIT_OVERSTAY`.

#### Keputusan inti

1. **Listrik 100% PASCABAYAR. TIDAK ada deposit listrik / saldo / token.**
   - Alasan: deposit listrik = saldo terselubung → menyisakan saldo saat checkout, melawan
     janji marketing. Pakai dulu, bayar kemudian (khusus meter).
2. **Pengaman checkout = DEPOSIT JAMINAN yang sudah ada** (refundable, tetap). Tagihan meter
   periode terakhir yang belum dibayar saat checkout → dipotong dari deposit jaminan, sisanya
   dikembalikan. (Tidak ada jenis deposit baru.)
3. **Invoice meter TERPISAH dari invoice sewa**, tapi bisa **"bayar sekaligus"** (dikelompokkan),
   demi transparansi. (Bukan merge fisik baris.)
4. **Marketing:** "Listrik bukan token/prabayar. Pakai dulu, bayar kemudian. Saat checkout tidak
   ada sisa saldo listrik. Transparan & pro-tenant." (untuk halaman publik/katalog).

#### Aturan siklus meter

- **Jangkar (anchor)** per stay = tanggal tagih (mis. tiap tanggal 25; ikut check-in/renewal).
- **Jendela catat = H-10 → hari-H**. **Telat boleh** (lupa sampai ganti periode tetap valid).
- **Satu invoice meter per siklus.** Siklus diukur dari **tanggal catatan terakhir**, bukan
  kalender. Catatan berikutnya hanya boleh dibuka mulai (jendela H-10 anchor berikutnya).
  Contoh sah: catat 10 Mar lalu 25 Mar = dua siklus berurutan, masing-masing 1 nilai.
- **Pencatat:** staf / admin / owner / **mandiri tenant**.
- **Input listrik & air BERSAMA** (satu form). Baris air hanya jika toggle air ON.

#### Perhitungan

```
pemakaianKwh   = meterSekarang − meterTerakhir
tagihanListrik = max(0, pemakaianKwh − kuotaGratisKwh) × tarifPerKwh
tagihanAir     = (toggle air ON) ? max(0, pemakaianM3 − kuotaGratisM3) × tarifPerM3 : 0
```

- Saat dicatat → **auto-generate invoice meter** (baris ELECTRICITY + WATER bila aktif).
- Invoice sewa/perpanjangan diberi catatan eksplisit:
  *"Belum termasuk listrik/air — tagihan meter terbit terpisah saat dicatat."*

#### Konstanta owner-settable (Settings owner) — nyambung permintaan "konstanta di Settings"

| Kunci | Default | Catatan |
|------|---------|---------|
| `freeElectricityKwhPerMonth` | **30** | jatah gratis listrik / siklus |
| `electricityTariffPerKwhRupiah` | **2500** | tarif kelebihan (kini); per-kamar boleh override |
| `waterMeteringEnabled` | **false** | toggle: air dihitung atau tidak (belum ada meter air) |
| `waterTariffPerM3Rupiah` | (ada) | dipakai bila toggle ON |
| `freeWaterM3PerMonth` | 0 | opsional |

Sumber TUNGGAL (hindari duplikasi). Per-kamar tetap bisa override tarif bila perlu.

#### UI

- **/rooms (depan):** saat stay masuk jendela H-10 & meter belum dicatat siklus ini →
  badge **"Catat meter"** di kartu + status kamar. Angka meter terakhir tampil di detail kamar.
- **Form catat meter gabungan** (listrik+air) untuk staf/admin/owner + versi mandiri tenant.
- **"Bayar sekaligus":** kelompokkan invoice sewa + meter yang sama-sama OPEN.

#### Rencana implementasi BERTAHAP (aman, tiap fase bisa dirilis)

- **M-1 (fondasi) — ✅ SELESAI 2026-06-16:** konstanta owner-settable di Settings (free kWh 30, tarif 2500,
  toggle air, tarif air). Backend: model `OperationalSetting` (singleton id=1) + modul `settings`
  (`GET /api/settings/operational` owner/admin, `PUT` owner-only). Frontend: tab "Tarif & Konstanta"
  di OwnerSettingsPage (`api/settings.ts`). Verified GET/PUT + UI.
- **M-2 — ✅ SELESAI 2026-06-16:** `POST /meter-readings/cycle` (OWNER/ADMIN) catat listrik+air
  sekaligus → usage sejak catatan terakhir → kurangi jatah gratis → tarif (room override →
  OperationalSetting) → auto-issue invoice meter via `invoicesService.createWithLinesAndIssue`
  (accounting di-skip aman bila COA belum siap). Reading pertama / dalam jatah gratis = tanpa invoice.
  Frontend: `MeterCycleModal` di tab Meter (`MeterTab`) — tombol "Catat & Terbitkan Tagihan" untuk
  owner/admin. Verified API (80kWh−30=50×tarif) + screenshot modal.
- **M-3 — ⏳ SEBAGIAN (2026-06-16):** ✅ pencatatan **mandiri tenant** auto-issue invoice
  ("system-issued", keputusan owner) — `/meter-readings/cycle` izinkan TENANT (kamar sendiri,
  roomId diabaikan demi keamanan); `createWithLinesAndIssue` opsi `systemIssued`; GET
  `/settings/operational` dibuka semua role; tombol "Catat Meter Listrik/Air" di portal tenant
  (MyStayPage, reuse MeterCycleModal). Verified API (tenant maya 70−30=40×tarif) + UI.
  ⏳ **BELUM:** badge "Catat meter" H-10 (backoffice + portal tenant) — butuh hitung "jatuh tempo".
- **M-4:** "bayar sekaligus" (group invoice OPEN) + catatan "belum termasuk listrik" di invoice sewa.
- **M-5:** checkout: tagihan meter terakhir dipotong dari deposit jaminan; teks marketing publik.

#### Catatan kondisi sekarang (verifikasi sebelum implementasi)

- Saat ini meter ikut **settlement invoice perpanjangan** (renew-requests.service: electricityReadingValue
  / meterReadingAt → meterSummary). M-2 menggeneralisasi ini jadi siklus mandiri + bukan-perpanjangan.
- Model sudah ada: `MeterReading`, `InvoiceLineType.ELECTRICITY/WATER`, `Room/Stay.electricityTariffPerKwhRupiah`,
  `waterTariffPerM3Rupiah`. Belum ada: konstanta global free-quota + toggle air + siklus 1×/bulan generik.
