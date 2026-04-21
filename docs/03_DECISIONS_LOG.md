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