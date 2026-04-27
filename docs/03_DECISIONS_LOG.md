# KOST48 V3 — Decisions Log
**Arsip keputusan arsitektur dan freeze yang sudah dibuat. Jangan diubah kecuali menambah entri baru.**

---

## 2026-04-12 — Inisialisasi

| # | Keputusan | Alasan | Dampak |
|---|-----------|--------|--------|
| 1 | Arsitektur monorepo sederhana (`/backend`, `/frontend`, `/docs`) | Solo developer, setup cepat | Struktur tetap sederhana |
| 2 | UI memakai React-Bootstrap (tidak ada Tailwind) | Cocok untuk backoffice cepat jadi | Konsistensi komponen lebih mudah |
| 3 | Constraint bisnis di `bootstrap.sql` (trigger, partial index, check constraint) | Prisma tidak menutup semua kebutuhan integritas | Reset DB harus ingat jalankan bootstrap SQL |
| 4 | Vertical slice sebagai strategi utama | Menjaga fokus, mengurangi drift konteks | Hindari task lintas banyak modul sekaligus |
| 5 | Endpoint baru wajib diuji via Swagger/curl sebelum frontend mengasumsikan selesai | Mengurangi debug integrasi | Build success saja tidak cukup |

---

## 2026-04-15 s.d. 2026-04-17 — Freeze Baseline Existing

| # | Keputusan | Dampak |
|---|-----------|--------|
| 6 | Checkout = tenant keluar kos (tidak ada physical checkout terpisah) | Flow checkout tetap sederhana |
| 7 | Deposit diproses terpisah setelah checkout | Perlu langkah proses deposit terpisah |
| 8 | Debt flow ditunda | Tidak ada status invoice baru untuk hutang |
| 9 | Reminder lifecycle tetap PLAN-only (tidak ada scheduler) | Reminder ringan cukup computed display |
| 10 | Meter awal wajib atomik di create stay sebagai `MeterReading`, bukan field `Stay` | Create stay tetap transaksi multi-entity |
| 11 | Anomali `PENDING` masuk backlog — tidak dibuka sebagai redesign aktif | Tetap high-risk backlog |
| 12 | Meter awal wajib di backend DAN frontend | Validasi kedua sisi sama-sama diperlukan |
| 13 | Atomic initial meter flow dianggap baseline existing | Tidak boleh dibongkar tanpa blocker nyata |
| 14 | Checkout frontend wajib pakai `checkoutReason` | UX checkout aman untuk operasional |
| 15 | Reminder lifecycle fase ini = computed display ringan | Tidak boleh berubah menjadi automation engine |
| 16 | Reminder stay → badge di stays list | Tidak perlu endpoint baru |
| 17 | Reminder invoice → due-soon badge di invoices list | Tidak perlu enum baru |
| 18 | H-7 meter-aware reminder ditunda | Data existing belum cukup |
| 19 | H+1 deposit follow-up ditunda | Deposit queue lebih aman dari automation |
| 20 | Reminder ringan cukup frontend-only | Tidak membuka backend baru |
| 21 | Environment default = Windows PowerShell | Semua command default diasumsikan PowerShell |
| 22 | Deposit payment proof di UI bersifat display-only | UI harus netral terhadap `depositStatus` |
| 23 | Overpay tetap dilarang | Guard backend tetap dipertahankan |
| 24 | Renewal = extend existing `ACTIVE` stay — bukan create parallel stay baru | Basis flow renewal hingga sekarang |

---

## 2026-04-18 — Freeze Invoice Automation

| # | Keputusan | Dampak |
|---|-----------|--------|
| 25 | Create stay boleh auto-membuat invoice awal `DRAFT` | Manual invoice awal lama tidak lagi mutlak |
| 26 | `periodEnd` mengikuti `pricingTerm` atau override `plannedCheckOutDate`; `dueDate = periodEnd + 3 hari` | Rule tanggal invoice awal jelas |
| 27 | Renewal boleh auto-membuat invoice renewal `DRAFT` | Tidak auto-issue |
| 28 | Total invoice tetap mengikuti recalc — service tidak boleh set manual | Semua automation harus hormati trigger/recalc |
| 29 | Unit line `RENT` harus mengikuti `pricingTerm` (tidak hardcode "bulan") | DAILY/WEEKLY/BIWEEKLY/MONTHLY/SMESTERLY/YEARLY tetap semantik benar |
| 30 | Validasi overlap invoice renewal ditunda | Cukup validasi tanggal akhir baru lebih besar |
| 31 | Wording deposit di UI tetap netral (`HELD` ≠ sudah dibayar) | UI tetap hati-hati membaca deposit |

---

## 2026-04-18 — Sinkronisasi Batch 0 + Role-Based Restructure

| # | Keputusan | Alasan | Dampak |
|---|-----------|--------|--------|
| 32 | Proyek tidak dikerjakan sebagai rewrite total, tetapi stabilization lalu ACT kecil bertahap | Audit menunjukkan masih ada blocker runtime nyata | Hindari klaim ZIP final tanpa verifikasi |
| 33 | Batch 0 Stabilization menjadi gate wajib sebelum role-based restructure besar | Fondasi belum cukup bersih | Bug runtime dan gap integrasi didahulukan |
| 34 | `RenewStayModal` crash "Invalid time value" = P0 pertama | Menjatuhkan halaman detail stay | Helper date di area renew harus defensive |
| 35 | `PATCH /stays/:id` dianggap blocker existing | Frontend sudah memanggilnya; fitur notes 404 diam-diam | Wajib ditutup di batch stabilisasi |
| 36 | `renewStay` open-ended period bug = blocker existing | Menyebabkan invoice period salah secara bisnis | Fix backend masuk batch stabilisasi |
| 37 | Meter refresh cache mismatch = bug kritis frontend | Data terlihat stale walau create reading sukses | Hook/query key harus diselaraskan |
| 38 | Field enum di check-in wizard harus dropdown — tidak boleh free-text | Menghasilkan 400 backend yang bisa dicegah di UI | `bookingSource` dan `stayPurpose` wajib select |
| 39 | Role-based product surface menjadi arah resmi setelah stabilization | IA lama terlalu gemuk dan bercampur | Dashboard, menu, CTA dipisah per role |
| 40 | Tenant dan User TENANT harus terasa satu experience di UI | Email ganda dan relasi mentah membingungkan | Batch tenant identity = inti restructure |
| 41 | Create ticket harus tenant-first; backoffice fokus progress/assign/close | Sumber tiket paling logis dari tenant | Form create ticket backoffice masuk backlog |
| 42 | Meter readings, room items, inventory movements bukan menu utama — harus di-embed | Menu utama terlalu gemuk | IA baru wajib compact |
| 43 | Invoice dan payment akan bergerak ke approval flow vNext | Lebih sesuai operasional nyata | Butuh API vNext; jangan asumsikan sudah ada |
| 44 | Owner dashboard bersifat strategis, bukan operasional | Owner butuh KPI, report ringkas, ratio | Owner dashboard jadi phase tersendiri |
| 45 | Semua ACT selanjutnya mengikuti urutan: stabilization → restructure | Mengurangi regression dan false progress | Roadmap dibaca berlapis |

---

## 2026-04-19 — Freeze Frontend Stabilization + Role Split Inti

| # | Keputusan | Dampak |
|---|-----------|--------|
| 46 | Route `/dashboard` hanya untuk OWNER / ADMIN / STAFF | Guard route dan fallback dashboard harus role-aware |
| 47 | Form login harus kosong saat dibuka (tidak ada prefill) | Mengurangi risiko hygiene buruk |
| 48 | Dashboard invalidation memakai prefix/predicate — bukan key generik | Refresh dashboard lintas role lebih konsisten |
| 49 | Tenant portal wajib jujur soal empty vs error (tidak samakan semua error sebagai no-data) | UX tidak menyesatkan user |
| 50 | Paid summary frontend boleh bersifat netral bila payload tidak cukup kaya | Lebih baik jujur daripada angka terlihat final tapi salah |
| 51 | `MyTicketsPage` harus berdiri sendiri, bukan alias `TicketsPage` backoffice | Tenant butuh surface sederhana dan context-driven |
| 52 | Meter readings, room items, inventory movements tidak didorong sebagai menu utama generic | IA baru harus compact over clutter |
| 53 | Phase aktif berikutnya = Tenant Identity & Portal Access Simplification | Email portal ganda dan relasi tenant-user masih membingungkan |

---

## 2026-04-20 — Freeze Phase B Core Portal Access

| # | Keputusan | Dampak |
|---|-----------|--------|
| 54 | Tenant detail harus menampilkan portal summary langsung | `portalUserSummary` menjadi data penting di tenant context |
| 55 | Email portal tidak boleh terasa ganda di create/edit tenant | UX form harus jujur dan compact |
| 56 | Honest portal visibility mengalahkan fake toggle | Portal status visibility dibenahi dulu sebelum toggle nyata |
| 57 | Toggle portal access harus tenant-context (`PATCH /tenants/:id/portal-access/status`) | Lebih aman daripada generic `PATCH /users/:id` |
| 58 | Create portal account harus tenant-context (`POST /tenants/:id/portal-access`) | Tenant dan user TENANT harus terasa satu experience |
| 59 | Reset password portal dibuka sebagai slice tenant-context — bukan forgot-password global | Scope tetap kecil dan operasional-friendly |
| 60 | Phase B core portal access dianggap cukup freeze-ready | Tujuan inti penyederhanaan tenant identity sudah terpenuhi |
| 61 | Next official phase = Ticket Tenant-Only Redesign (Phase C) | Roadmap dan role matrix sama-sama menekankan ticket sebagai flow tenant-first |

---

## 2026-04-21 — Freeze V4 Roadmap & Arsitektur Tenant-First

| # | Keputusan | Dampak |
|---|-----------|--------|
| 62 | V4 akan memperkenalkan status kamar `RESERVED` untuk mendukung booking mandiri tenant | Perlu migrasi enum pada `RoomStatus` |
| 63 | Booking mandiri memiliki masa berlaku (`expiresAt`) dan kadaluarsa otomatis | Perlu cron job atau pengecekan berkala |
| 64 | Notifikasi akan menggunakan WhatsApp (prioritas) dan email (sekunder) | Perlu integrasi gateway WhatsApp (Waha/Whapi) |
| 65 | Registrasi user dapat menggunakan email atau nomor HP (WhatsApp) | Fleksibilitas untuk tenant yang tidak memiliki email |
| 66 | Penghapusan akun tenant bersifat soft delete (`isActive = false`) | Data historis tetap terjaga untuk audit |
| 67 | Tenant hanya mendapat akses penuh portal setelah pembayaran diverifikasi dan kamar `OCCUPIED` | Keamanan data dan fitur |
| 68 | Admin tetap memegang kendali akhir (approval booking, verifikasi pembayaran) | Model hybrid: self-service + human approval |

---

## 2026-04-21 — Freeze V4 Fase 4.0 Frontend Surface

| # | Keputusan | Dampak |
|---|-----------|--------|
| 69 | Route `/rooms` boleh memegang dua surface berbeda (backoffice vs katalog publik) | Kompatibilitas route lama tetap terjaga tanpa mematahkan workspace rooms existing |
| 70 | Frontend booking mandiri tenant dibuka melalui `/booking/:roomId` dan `/portal/bookings` | Tenant mendapat flow booking tanpa melihat ID teknis mentah |
| 71 | Surface booking reserved di backoffice cukup read-only pada Fase 4.0 | Approval admin sengaja ditunda ke Fase 4.1 |
| 72 | Setelah backend dan frontend inti Fase 4.0 tertutup, fokus resmi kembali ke UAT sebelum membuka Fase 4.1 | Mengurangi risiko false progress ke approval/payment flow |

---

## 2026-04-22 — Freeze Blueprint Implementasi Detail Fase 4.2–4.5

| # | Keputusan | Dampak |
|---|-----------|--------|
| 73 | Tenant tidak menulis langsung ke `InvoicePayment`; tenant membuat `PaymentSubmission` terlebih dahulu | Approval manusia tetap menjadi pagar operasional utama |
| 74 | `InvoicePayment` final hanya dibuat saat admin approve submission | Sinkronisasi invoice lebih aman dan audit trail lebih jelas |
| 75 | Approval payment submission harus idempotent dan race-safe | Mencegah duplicate payment final / double activation |
| 76 | Approval pembayaran yang melunasi invoice booking awal menjadi titik aktivasi resmi `RESERVED -> OCCUPIED` | Aktivasi kamar tidak boleh terjadi hanya karena upload proof |
| 77 | Expiry booking tetap ditangani sebagai job/scheduler sempit khusus booking | Tidak membuka automation engine umum yang terlalu besar |
| 78 | Reminder eksternal fase 4.3 memakai adapter WhatsApp terpusat dengan logging hasil kirim | Integrasi provider bisa diganti tanpa membongkar flow bisnis |
| 79 | Reminder 4.3 harus idempotent dan tidak boleh menjatuhkan transaksi bisnis utama | Kegagalan gateway tidak boleh memblok operasional inti |
| 80 | Room marketing detail fase 4.4 dibuka lewat endpoint publik terpisah `GET /public/rooms/:id` | Public surface bisa tumbuh tanpa mengotori workspace backoffice |
| 81 | Registrasi fleksibel fase 4.4 menerima email atau nomor HP; minimal salah satu wajib | Onboarding calon tenant lebih realistis di lapangan |
| 82 | Hapus akun tenant pada fase 4.4 berarti soft delete (`isActive = false`) | Histori stay/invoice/ticket tetap aman untuk audit |
| 83 | Self-service renew tenant pada fase 4.5 adalah **request + admin approval**, bukan renewal otomatis | Fondasi renewal existing tetap dihormati |
| 84 | Forgot/reset password self-service fase 4.5 memakai token/OTP dengan response generik | Keamanan auth tetap terjaga dan tidak membuka account enumeration |


---

## 2026-04-23 — Freeze Kejujuran Status Gate + Refactor Kerapian File

| # | Keputusan | Dampak |
|---|-----------|--------|
| 85 | Prototype 4.2 yang sempat dipatch untuk debugging integrasi **tidak otomatis mengubah** status gate resmi | Dokumentasi tetap harus jujur bahwa 4.2 belum baseline resmi |
| 86 | Hasil UAT parsial menang atas asumsi patch; bug tanggal/expiry/modal-close harus dicatat sebagai temuan nyata | Fokus tetap pada stabilisasi 4.0–4.1 |
| 87 | `expiresAt` untuk booking mandiri diperlakukan sensitif operasional dan lebih aman bila jatuh ke akhir hari daripada awal hari | Mengurangi false-expired saat approval |
| 88 | Serialisasi `Date` ke frontend harus dianggap bagian dari kontrak integrasi, bukan detail kosmetik | Surface admin/tenant tidak boleh kehilangan check-in / expiresAt |
| 89 | Refactor struktur source menjadi prioritas kebersihan aktif; target praktis file source manual diusahakan `<= 500` baris | Patch berikutnya lebih mudah dan risiko drift turun |
| 90 | Arah refactor backend = Prisma-first; raw SQL hanya untuk kebutuhan locking/compatibility yang jelas | Service baru tidak boleh liar berbasis raw SQL sebagai default |
| 91 | Refactor frontend mengikuti pola sections / helpers / config / types agar page besar lebih mudah dibaca | Wizard/config padat dipisah sebelum menambah fitur baru |

---

## 2026-04-24 — Freeze Sinkronisasi Deep Patch Booking/Payment

| # | Keputusan | Dampak |
|---|-----------|--------|
| 92 | Payment submission booking bergerak ke model **target-aware** (`INVOICE | DEPOSIT`) | Admin/tenant tidak lagi membaca payment booking sebagai satu keranjang ambigu |
| 93 | Tracking pembayaran deposit awal booking dipisah dari lifecycle proses refund/forfeit deposit existing | Aktivasi booking bisa lebih jujur tanpa membongkar flow deposit pasca checkout |
| 94 | Approval booking/payment yang membuat invoice line wajib menghormati urutan `DRAFT -> edit line -> status operasional` | Mencegah error trigger DB “Detail invoice hanya boleh diubah saat status DRAFT” |
| 95 | Expiry booking yang sudah sempat di-approve boleh melakukan cleanup invoice awal dan baseline meter yang relevan | Mengurangi orphan invoice / bentrok meter bila kamar dibooking ulang |
| 96 | Manual expire booking di backoffice boleh dibuka sebagai action administratif terbatas | Admin tidak harus menunggu job expiry otomatis untuk kasus tertentu |
| 97 | 4.2 dianggap sudah punya source patch lanjutan, tetapi **belum baseline resmi** sampai sinkronisasi schema + build lokal + UAT selesai | Dokumentasi tetap jujur, namun tidak lagi membaca 4.2 sebagai nol mutlak |


## 2026-04-24 — Freeze Combined Booking Payment 4.2

| # | Keputusan | Dampak |
|---|-----------|--------|
| 98 | **Workflow booking payment final menggunakan satu submission gabungan untuk sewa + deposit.** | Tenant tidak memilih target teknis; UX lebih sederhana dan tidak ada salah apply bukti deposit ke sewa. |
| 99 | **Nominal pembayaran awal wajib sama persis dengan sisa sewa + sisa deposit.** | Tidak ada underpay, overpay, atau partial pada workflow booking 4.2. |
| 100 | **Backend membagi combined payment secara internal.** | Rent portion membuat `InvoicePayment`; deposit portion mengupdate tracking deposit awal pada `Stay`. |
| 101 | **Room `RESERVED -> OCCUPIED` hanya setelah invoice sewa dan deposit sama-sama `PAID`.** | Aktivasi kamar tetap jujur dan tidak terjadi hanya karena upload proof. |
| 102 | **`targetType` / `targetId` bila masih ada diperlakukan sebagai compatibility/internal metadata, bukan pilihan tenant.** | Dokumen dan UI tidak lagi mendorong split Sewa/Deposit sebagai dua flow tenant-facing. |
| 103 | **Status `PARTIAL` tidak digunakan di workflow booking payment 4.2.** | Jika nominal tidak sesuai, submission ditolak; bukan diproses sebagian. |


---

## 2026-04-26 — Freeze Phase 4.3-A Reminder Preview

| # | Keputusan | Dampak |
|---|-----------|--------|
| 119 | Phase 4.3 dibuka dengan pola preview-first, bukan langsung WhatsApp send | Risiko gateway dan spam ditekan sebelum provider asli dipasang |
| 120 | Reminder Preview 4.3-A bersifat read-only | Tidak ada WhatsApp send, tidak ada `NotificationLog` write, tidak ada scheduler |
| 121 | Preview reminder hanya untuk OWNER/ADMIN | TENANT tidak melihat surface backoffice reminder |
| 122 | `/api/admin/reminders/preview/*` menjadi surface admin untuk kandidat reminder | Admin dapat melihat booking expiry, invoice due, invoice overdue, dan checkout approaching sebelum aksi kirim |
| 123 | Halaman `/reminders` menjadi pusat preview backoffice | Menu **Pengingat WhatsApp** masuk OWNER/ADMIN, tetapi belum memiliki tombol kirim |
| 124 | Phase 4.3-B berikutnya adalah Reminder Queue / Mock Send | Real provider WhatsApp dan scheduler tetap ditunda sampai mock flow aman |
| 125 | Reminder 4.3 tidak boleh berubah menjadi automation engine umum | Scope tetap booking, invoice, dan checkout reminder yang relevan |


---

## 2026-04-27 — Freeze Phase 4.3-C Notification Center + Payment Urgency Direction

| # | Keputusan | Dampak |
|---|-----------|--------|
| 126 | Phase 4.3-C memakai tabel baru `AppNotification`, bukan reuse `AuditLog` | AuditLog tetap untuk jejak aksi; AppNotification menjadi inbox/read-unread user |
| 127 | AppNotification wajib user-scoped memakai `recipientUserId = currentUser.id` | User tidak bisa membaca atau mark-read notifikasi milik user lain |
| 128 | Mock reminder membuat AppNotification untuk tenant target, bukan admin pengirim | Notifikasi mencerminkan kebutuhan penerima bisnis, bukan aktivitas operator |
| 129 | Kegagalan create AppNotification tidak boleh menggagalkan mock send | Reminder/mock send tetap fail-safe dan tidak menjatuhkan flow utama |
| 130 | Tenant mendapat sidebar menu **Notifikasi**; OWNER/ADMIN/STAFF cukup lewat bell/header | Backoffice tetap compact; tenant portal tetap jelas untuk user non-teknis |
| 131 | Announcement dan AppNotification tetap dipisahkan | Announcement = konten broadcast; AppNotification = inbox personal/read-unread |
| 132 | PWA Push diperlakukan sebagai channel, bukan entity pengganti Announcement/AppNotification | Ke depan Announcement dan AppNotification bisa dikirim via PWA tanpa mencampur model data |
| 133 | Finance-critical reminder tidak boleh hanya bergantung pada notification read/unread | Tenant tetap melihat urgency bisnis sampai invoice/booking/contract selesai |
| 134 | Phase 4.3-D berikutnya adalah Tenant Payment Urgency Header Chip | Prioritas bisnis bergeser dari sekadar inbox ke reminder pembayaran yang terus terlihat |
| 135 | Real WhatsApp, scheduler/cron, service worker, push, SSE/websocket tetap deferred | Foundation notification distabilkan dulu sebelum membuka automation/channel eksternal |

---

## 2026-04-27 — Freeze Lifecycle Integrity: Meter, Deposit, dan Announcement Guard

| # | Keputusan | Alasan | Dampak |
|---|-----------|--------|--------|
| 126 | Jawaban arsitektur yang dipakai sebagai dasar adalah diagnosa code-grounded: root cause meter duplicate ada pada pembuatan baseline saat approval booking dan normalisasi `readingAt` ke start-of-day. | Lebih cocok dengan kondisi source aktif daripada desain lifecycle rewrite besar. | Patch berikutnya fokus pada lifecycle integrity, bukan fitur baru. |
| 127 | Untuk tenant booking flow, `MeterReading` final hanya boleh dibuat saat payment approved dan room berubah `RESERVED -> OCCUPIED`. | Meter adalah data operasional, bukan data administrative approval. | Approval booking tidak lagi membuat baseline final yang bisa menjadi orphan. |
| 128 | Admin tetap mengisi meter awal saat approve booking, tetapi disimpan sebagai pending snapshot pada `Stay`. | Data input admin tidak hilang, tetapi belum dianggap histori operasional. | Perlu schema pending meter fields atau struktur setara yang typed. |
| 129 | Cancel/expired booking sebelum `OCCUPIED` hanya membersihkan pending snapshot; tidak menghapus histori meter operasional. | Menghindari data corruption pada stay yang sudah pernah aktif. | Cleanup meter lama harus diaudit, bukan bulk delete. |
| 130 | Backoffice direct check-in existing tetap boleh langsung membuat `MeterReading` karena room langsung `OCCUPIED`. | Flow direct check-in berbeda dari tenant booking approval. | Baseline existing tidak dibongkar total. |
| 131 | Checkout occupied stay tidak boleh mereset/menghapus invoice, payment, deposit, atau meter history. | Data tersebut adalah histori bisnis sah. | Deposit masuk refund/forfeit workflow terpisah. |
| 132 | Deposit awal booking dan deposit pasca-checkout dipisah secara konseptual. | Deposit awal adalah syarat aktivasi; deposit pasca-checkout adalah kewajiban refund/forfeit. | Booking batal sebelum occupied boleh reset/ignore deposit booking; checkout tidak reset deposit history. |
| 133 | Announcement audience `TENANT` jangka pendek hanya dikirim ke tenant dengan hunian aktif operasional (`Room.status = OCCUPIED`). | Pengumuman operasional seperti listrik/air hanya relevan untuk penghuni aktif. | Tenant booking/reserved tidak menerima announcement operational notification. |
| 134 | Tenant non-occupied yang membuka `/portal/announcements` harus diarahkan aman ke `/portal/bookings`. | Link lama dari notification atau URL manual tidak boleh membuka surface yang belum relevan. | Perlu frontend guard. |
| 135 | Stage-aware announcement audience (`TENANT_OCCUPIED`, `TENANT_BOOKING`, `TENANT_ALL`) ditunda setelah guard minimal stabil. | Menghindari schema/UI change terlalu cepat. | Long-term improvement dicatat, bukan ACT langsung. |
| 136 | Urutan berikutnya adalah G1 Announcement Guard, lalu G2 Pending Meter Snapshot. | G1 kecil dan aman; G2 menyentuh lifecycle payment/meter lebih sensitif. | Fitur baru ditahan sampai data integrity lebih kuat. |
| 137 | Legacy meter cleanup harus berupa audit dulu, bukan delete otomatis masal. | Risiko salah hapus meter operational tinggi. | G3 menjadi audit/cleanup terbatas. |
| 138 | WhatsApp, scheduler, PWA push, SSE/websocket tetap deferred. | Channel eksternal tidak menyelesaikan root cause lifecycle. | Fokus tetap internal notification + data integrity. |
