# KOST48 V5 - Audit Menyeluruh dan Audit Flow

> File hasil pemampatan dari dokumen root `docs/`. File sumber lama sudah diarsipkan ke `docs/archieve/2026-06-16_root_docs_pre_M/`.

## Tujuan

Konsolidasi audit fase, audit menyeluruh, dan laporan audit flow realita kode vs aturan bisnis.

## Sumber Digabung

## Update 2026-06-30 - Audit Menyeluruh Terbaru + Keputusan Booking Flow

**Scope:** backend NestJS/Prisma, frontend React/Vite, auth/role guard, endpoint publik, upload, payment submission, booking public flow, AutoOps, meter, dan lifecycle check-in.  
**Verifikasi audit:** backend build lulus, frontend build lulus, backend unit test lulus 200/200, backend integration test lulus 18/18.

### Temuan Utama

| Area | Risiko | Severity | Status |
|------|--------|----------|--------|
| Booking publik phone/email | `phone` dan `email` optional; `Tenant.phone` wajib; `User.email` unique; phone-only bisa membuat email kosong dan email-only bisa gagal DB | High | Masuk Fase V-05 |
| Payment proof ownership | `fileKey/fileUrl` diterima dari client; batch payment bisa tanpa proof; ownership proof belum server-side | High | Masuk Fase V-06 |
| Booking room state | `RoomStatus.BOOKING` ambigu: kadang berarti unpaid, kadang DP; availability dan payment approval rawan salah | High | Masuk Fase V-00..V-04 |
| Upload marketing/fasilitas | Validasi percaya MIME/original filename; public static `/uploads/room-images` berisiko MIME spoof | Medium | Masuk Fase V-07 |
| Cron token | Secret diterima via query `?token=...` dan rawan bocor ke log/history | Medium | Masuk Fase V-07 |
| Tenant meter cycle | Tenant bisa submit tanggal/delta meter yang langsung memicu invoice tanpa guard periode/kewajaran cukup | Medium | Masuk Fase V-07 |
| Ticket image access | File tanpa ownership record bisa lolos untuk user terautentikasi jika filename diketahui | Low | Masuk Fase V-07 |
| JWT localStorage | Token di `localStorage` memperbesar dampak XSS | Low/Architecture | Backlog hardening setelah upload aman |

### Keputusan Booking Flow Baru

`RoomStatus.BOOKING` tidak dipakai lagi sebagai status fisik kamar. Booking tetap konsep bisnis di level stay/payment/UI.

State final:

```txt
Booking dibuat, belum bayar        -> Room AVAILABLE
DP 30% approved                    -> Room RESERVED
Full payment approved              -> Room RESERVED
Check-in/serah kunci setelah lunas  -> Room OCCUPIED
```

Catatan penting:

- Full payment approved tidak otomatis check-in.
- `initialMetersPromotedAt` hanya boleh diisi saat check-in/serah kunci.
- Lunas harus dibaca dari invoice/payment asli, bukan dari `downPaymentPaidRupiah`.
- Jika enum DB `BOOKING` masih ada, perlakukan sebagai legacy-only sampai cleanup data/schema aman.
- Checklist eksekusi aktif ada di `docs/M10_CHECKLIST_CHANGELOG.md` Fase V.

### Pendalaman Lanjutan 2026-06-30 - Semua Flow dan Komponen

Audit lanjutan membaca ulang kontrak domain, modul backend, route/frontend utama, upload/media helper, role guard, dan public/tenant/admin/staff workspace. Hasilnya bukan implementasi kode, tetapi perluasan checklist eksekusi detail di `docs/M10_CHECKLIST_CHANGELOG.md` V-00..V-16.

| Area | Temuan pendalaman | Dampak | Checklist |
|------|-------------------|--------|-----------|
| Payment booking path | `payment-submissions.service.ts` masih menentukan booking path dari `RoomStatus.BOOKING/RESERVED`; unpaid booking baru sengaja tetap `AVAILABLE` | DP bisa salah masuk jalur invoice-only dan ditolak | V-01, V-02 |
| Check-in booking | `stays.service.ts` pre-check mengizinkan `RESERVED`, tetapi lock transaction menolak selain `AVAILABLE` | Booking yang sudah reserved/lunas bisa gagal check-in atau dibuat lewat jalur yang salah | V-03 |
| Public availability | `marketing-public-rooms.service.ts` dan `publicRoomDisplay.ts` masih menganggap `RESERVED` bookable | Publik bisa melihat janji booking untuk kamar yang seharusnya terkunci | V-09 |
| Label status | `statusLabels.ts` masih menulis `RESERVED = Dipesan (Lunas)` | Owner/admin/tenant bisa salah baca reserved-DP sebagai lunas | V-04, V-10, V-11 |
| Tenant portal | Stage tenant sudah berbasis room `OCCUPIED`, tetapi copy/action pembayaran perlu dipastikan membaca payment asli | UX bisa benar stage-nya tetapi salah instruksi bayar/check-in | V-10 |
| Admin check-in UI | `StepRoomSelect` hanya blok `OCCUPIED/BOOKED`, bukan flow reserved booking pemenang | Admin bisa melihat pilihan kamar/aksi yang tidak sinkron dengan guard backend | V-03, V-11 |
| Role/data exposure | `analytics/finance/summary` mengizinkan STAFF membaca total billed/paid/expense; `wifi-sales` GET juga STAFF | Perlu keputusan scope STAFF agar tidak bocor data finansial sensitif | V-12 |
| Finance/accounting guard | Manual journal draft sudah disabled, tetapi create/update COA/cash account/asset masih perlu keputusan OWNER-only vs ADMIN | Risiko mutasi konfigurasi finansial terlalu lebar bila tidak sesuai owner | V-13 |
| Upload/media | Announcement/ticket/tenant/private images sudah sebagian pakai magic-byte; marketing/facility masih perlu parity dan ownership static/public | MIME spoof dan file access perlu diseragamkan | V-07, V-14 |
| Dokumen flow | M03/M05 masih menyimpan narasi lama "Booking = Room RESERVED" | AI eksekutor bisa mengikuti instruksi historis dan menghidupkan bug lama | V-08 |

**Kesimpulan:** tetap direkomendasikan tidak memakai `RoomStatus.BOOKING` sebagai status kamar. "Booking" tetap nama proses bisnis/UI; status fisik kamar cukup `AVAILABLE -> RESERVED -> OCCUPIED`. Sumber kebenaran DP vs lunas harus invoice/payment, bukan enum room.

### Sumber Historis yang Digabung

- `docs/AUDIT_FASE4_FINAL.md` - konten dipertahankan
- `docs/AUDIT_MENYELURUH_SEMUA_FASE.md` - konten dipertahankan
- `docs/FLOW_AUDIT_LAPORAN.md` - konten dipertahankan

## Update 2026-06-17 — AUDIT KEUANGAN ULTRA ✅

**Audit 5 jalur selesai 17 Jun 2026. Hasil: LULUS — sistem keuangan SEHAT.**

| Area | Status |
|------|--------|
| 8 Invarian Akuntansi | ✅ Semua PASS |
| 5 High-Risk Flows | ✅ Semua SEHAT |
| 7 DO-NOT-TOUCH blocks | ✅ Semua UTUH |
| PSAK 72 Recognition | ✅ 0 stranded |
| Dead code: `postPaymentReversalTx` | 🟡 Minor (0 pemanggil) |
| Deposit 16 stay × Rp500rb | ✅ MATCHED |
| Unmapped transactions | ✅ 0 |

## Update 2026-06-20 — Fase K: Pasca-Audit Total 12 Jalur ✅

**Audit 12 jalur paralel selesai 20 Jun 2026. 97 temuan (24 critical, 42 medium, 31 low). Semua critical difix. Detail: `docs/M16_PASCA_AUDIT_PLAN.md`.**

| Area | Temuan | Status |
|------|--------|--------|
| Keamanan Auth (RolesGuard, DTO, STAFF leak) | 5 critical | ✅ Semua difix |
| Data Integrity (resolveRent, helpers, schema) | 4 critical | ✅ Semua difix |
| Business Logic (deposit, arus kas, threshold) | 3 critical | ✅ Semua difix |
| Auto-Ops (race condition, circuit breaker) | 2 critical | ✅ Semua difix |
| CSS Chaos (7 :root blocks) | 1 critical | ✅ 00-tokens.css |
| DeepSeek Settings (no UI) | 1 critical | ✅ UI editable |
| Code Quality (as any, silent errors) | 8 medium | ✅ Sebagian difix |
| UI/UX (error handling, duplikasi) | 6 medium | ✅ Sebagian difix |
| Prisma Schema (missing index/enum/relation) | 10 medium | ✅ Sebagian difix |
| Backlog (31 low) | — | 📋 Tercatat di M16 |

## Update 2026-06-19 - Audit Guard Fase G AI

Fase G AI Owner/Admin (`docs/M12_AI_OWNER_ADMIN.md`) menambah risiko baru: biaya API, hallucination, PDP, dan over-automation. Audit wajib memakai guard berikut:

- **Manual trigger:** tidak boleh ada request DeepSeek dari cron, auto-ops, page-load, `useEffect`, polling, atau prefetch otomatis.
- **RBAC:** tombol dan endpoint AI berbayar hanya OWNER/ADMIN; finance deep analysis Owner-only.
- **No direct mutation:** AI endpoint tidak boleh menulis domain state final. Mutasi final harus lewat endpoint existing setelah human approval.
- **PDP:** jangan kirim foto KTP, foto bukti bayar, nomor KTP penuh, email, atau data personal yang tidak relevan ke DeepSeek.
- **Deterministic guard wins:** no-partial, TB balanced, period close, deposit liability, room readiness, dan stok lock tetap milik service domain.
- **Usage/cost:** response AI harus membawa model, promptHash, snapshotHash, dan usage bila tersedia.
- **AuditLog:** setiap aksi final yang memakai rekomendasi AI mencatat `AuditLog.meta.ai`.
- **Fallback:** tanpa API key atau API timeout, UI tetap aman dan tidak melakukan mutasi.

## Update 2026-06-20 - Audit Keamanan/PDP Fase J Owner AI

**Scope:** 12 endpoint `owner-ai.controller.ts`, helper guard Fase J, dan gating frontend tombol AI. Hasil: **LULUS** untuk pra-go-live dengan guard deterministik tetap menang.

| Area | Hasil |
|------|-------|
| Role guard | PASS. `status` OWNER/ADMIN; `brief`, `finance/analyze`, `usage`, `test-connection`, `faqs/generate-draft` OWNER-only; draft expense/KTP/ticket/inventory/field-report/payment OWNER/ADMIN. |
| Secret/API key | PASS. `getStatus()` hanya expose configured/model/limit; `testConnection()` tidak mengembalikan API key; Authorization hanya dipakai di DeepSeek client. |
| PDP KTP/foto | PASS setelah hardening Fase J. OCR KTP menolak gambar/base64; NIK tenant dan NIK OCR di snapshot, prompt, dan response dimask via helper. |
| Snapshot ramping | PASS. Brief/finance/ops/payment memakai agregat dan snapshot terpilih; tidak mengirim foto bukti bayar, foto KTP, password, JWT, atau dump tabel mentah. |
| No direct mutation | PASS. `owner-ai.service.ts` hanya read/query + DeepSeek call; endpoint review/draft tidak menulis domain final. `AiDraftService` hanya menulis queue `AiDraft`, bukan state final domain. |
| Uang no-partial | PASS. Guard AI payment kini sadar FULL/DP/SETTLEMENT; DP booking sah tidak di-REJECT, nominal salah tetap kena warning deterministic. |
| Frontend AI | PASS. Tombol AI digate `configured===true` + role sesuai endpoint; error AI tampil non-blocking dengan tombol coba lagi; result panel menampilkan mode/model/fallback/warnings. |
| Audit `meta.ai` | PASS untuk jalur final yang memakai draft AI saat ini: create expense dari OCR membawa `meta.ai` ke AuditLog, dan `recentAiAudit()` membaca `jsonb_exists(meta,'ai')`. Endpoint lain tetap draft-only sampai human menjalankan action domain existing. |

## Catatan Pemakaian

- Jadikan file ini pintu masuk tematik; bila butuh detail mentah, cek file sumber di arsip yang disebut di atas.
- Heading asli dinaikkan levelnya agar tidak bertabrakan dengan struktur M-file.


## Bagian 1 - `docs/AUDIT_FASE4_FINAL.md`

### AUDIT FORENSIK FASE 4 + BACKLOG — temuan per fitur
**Mulai:** 2026-06-15. **Metode:** baca kode hasil-commit satu per satu; bandingkan dgn teori (PSAK, idempotency, privasi, race, RBAC). Severity: 🔴 BUG (harus fix) · 🟠 CELAH (risiko) · 🟡 CATATAN/over-confidence · ✅ OK.
**Aturan:** `[x]` di checklist hanya bila benar-benar lengkap. Item dengan temuan tetap dibuka.

---

#### FASE A — FINANCE (paling berisiko)

##### F4-1 Unearned Revenue (`rent-recognition.service.ts`)
- ✅ **A-OK1** Konsistensi nominal: Σ jadwal (`splitRentByMonths`) = `rentTotal` = deferral. Deferral DR 4000/CR 2200 = R; recognize Σ = R. Trial balance seimbang (UAT membuktikan). Hanya RENT yang ditangguhkan; utilitas (4100) tetap diakui langsung — **benar**.
- 🟠 **A-1 [entryDate periode tutup → recognition/deferral stranded]** `ensureSchedules` deferral pakai `entryDate=checkInDate`; `recognizeDue` pakai `entryDate=periodStart`. Bila periode akuntansi bulan itu sudah **CLOSED** sebelum posting (sweeper mati > ~1 bulan, atau periode ditutup dini), `postBalancedJournalTx` menolak (periode bukan OPEN) → baris **stranded pending selamanya** / deferral tak pernah jadi → pendapatan over/under-recognized. **Mitigasi saat ini:** sweeper 5 menit + deploy fresh → periode selalu OPEN saat diproses. **Saran:** bila periode target tutup, fallback ke periode berjalan + memo koreksi, ATAU larang tutup periode yang masih punya baris `recognizedAt=null` jatuh tempo. **Perlu keputusan owner.**
- 🟠 **A-2 [race prepay sebelum jadwal awal SMESTERLY]** `ensureSchedules` gate `rentRecognitionSchedules: none`. Bila stay SMESTERLY/YEARLY menerima **prabayar (F4-11)** sebelum sweeper sempat membuat jadwal awal → `scheduleExtension` mengisi baris → `none` jadi false → `ensureSchedules` **melewati stay selamanya** → sewa semester AWAL tak pernah ditangguhkan (tetap diakui penuh di issuance). Probabilitas kecil (prabayar di menit pertama stay SMESTERLY baru) tapi nyata.
- 🟡 **A-3 [deferral fires di issuance-posted+promoted, bukan eksplisit paid]** Bergantung invarian *promoted ⟹ sudah bayar* (benar di flow booking). Untuk SMESTERLY/YEARLY yang entah bagaimana promoted-tapi-belum-bayar, akan mengakui pendapatan tanpa kas. Risiko rendah.
- 🟡 **A-4 [pengakuan bulan-1 di awal periode]** Straight-line bulanan diakui di **awal** tiap bulan (bukan prorata harian). Sesuai metode yang owner pilih; bukan bug, dicatat agar tak dikira prorata.

##### F4-11 Prabayar (`prepay-extension.service.ts`)
- ✅ **A-OK2** Alur jurnal benar (issuance DR1100/CR4000 + payment DRkas/CR1100 + deferral DR4000/CR2200), periodIndex offset + sourceKey per-invoice mencegah bentrok. UAT TB seimbang tiap langkah.
- 🟡 **A-5 [tarif bulanan non-MONTHLY]** `monthlyRent = MONTHLY? agreedRent : room.monthlyRateRupiah`. Untuk stay non-MONTHLY, pakai **tarif kamar saat ini** (bukan terkunci D-16). Karena prabayar = "harga bulanan", wajar; tapi bila tarif kamar sudah naik, prabayar non-MONTHLY ikut tarif baru. **Abu-abu — perlu konfirmasi owner.**
- 🟡 **A-6 [tak ada cek tunggakan/invoice terbuka sebelum prabayar]** Prabayar bisa dibuat walau ada invoice belum lunas lain. Tidak salah secara kas (prabayar = uang baru), tapi mungkin owner mau blok prabayar bila ada tunggakan. **Abu-abu.**
- 🟡 **A-7 [prabayar tak memberi poin RENEWAL]** Prabayar memperpanjang sewa tapi tak lewat `renew-requests` → tak award poin RENEWAL/review. Mungkin diinginkan (prabayar ≠ renewal request). **Abu-abu.**

##### F4-10 Pembulatan (`money.helper.ts`)
- ✅ **A-OK3** `roundRupiah` half-away-from-zero (simetri D/K), `rupiahAmount` clamp ≥0. Identik `Math.round` untuk input ≥0 (terbukti unit test). DO-NOT-TOUCH (period-close) tak disentuh. Tidak ada bug.

##### Silang dengan audit AI lain (`FLOW_AUDIT_LAPORAN.md`, commit 0a83dbd pra-Fase 4)
- 🟠 **A-8 [WARISAN: Auto Journal Lite best-effort]** Temuan utama audit lama (R1): jurnal INVOICE_ISSUED/PAYMENT/CANCELLED/EXPENSE/WIFI/DEPOSIT_RECEIVED **best-effort** (try/catch, operasi tetap jalan walau jurnal gagal); hanya DEPOSIT_SETTLEMENT blocking. **Status: ISU ARSITEKTUR LAMA, di luar lingkup Fase 4** — tetap relevan untuk kredibilitas laporan. **Fase 4 saya justru BLOCKING:** F4-11 prabayar memeriksa hasil `postInvoiceIssuedTx`/`postInvoicePaymentTx`/deferral & **throw bila gagal** (tx rollback); F4-1 deferral throw bila tak terposting. **Mitigasi lama:** `backfillAutoJournal` ada (manual). **Saran owner:** pertimbangkan blocking + reconciliation otomatis (R1/R2 audit lama).
- ✅ Temuan audit lama A3 (high-signal tickets) & A4 (occupancy 0) = SUDAH diperbaiki (F2-12/F1-6) — STALE.
- 🟡 **A-9 [balanceSheet di reports.service]** Audit lama bilang "tak ada balanceSheet". **Perlu verifikasi:** `accounting-reports.service.ts` punya `balanceSheet()` (berbasis jurnal) — kemungkinan temuan lama parsial/stale. Dicek di Fase E.

#### FASE B — GAMIFIKASI

##### F4-9 Poin & Redemption (`loyalty.service.ts`, `redemption.service.ts`)
- ✅ **B-OK1** Idempotency poin solid: `@@unique(sourceType, sourceId)` + catch P2002 di `award`. Tiap sumber (RENEWAL/ON_TIME_PAYMENT/REDEMPTION/REFUND/PEER/REFERRAL) sourceId unik. UAT membuktikan dup di-skip.
- ✅ **B-OK2** Redemption flow benar: potong poin saat ajukan, refund saat REJECT, FULFILLED + jurnal DR6300/CR2100 saat APPROVE. Jurnal reward **DI DALAM tx decide** (lebih baik dari best-effort lama).
- 🟡 **B-1 [race overspend poin]** `requestRedemption`: cek saldo via `aggregate SUM` sebelum & sesudah insert, tapi isolation default **read-committed** → 2 request paralel bisa sama-sama lolos (tak lihat insert satu sama lain yang belum commit) → saldo bisa negatif. **Risiko rendah** (1 tenant, jarang paralel). Fix kuat: `SELECT ... FOR UPDATE` baris saldo / advisory lock per tenant / serializable.
- 🟡 **B-2 [race stok reward]** Sama: 2 request paralel reward stok=1 bisa sama-sama lolos `stockQty<=0` → stok jadi negatif. Risiko rendah. Fix: lock baris reward.
- 🟡 **B-3 [jurnal reward best-effort dalam tx]** `decideRedemption` APPROVE: bila `postRewardFulfillmentTx` **skip** (COA 6300/2100 hilang) → `journalEntryId=null` tapi status tetap **FULFILLED** → reward terkirim tanpa jurnal (M4). COA ter-seed → risiko rendah; tapi tak ada guard throw seperti F4-11. (Reward tanpa nilai/BADGE skip = sengaja, benar.)
- 🟡 **B-4 [ON_TIME_PAYMENT terlalu murah hati]** Trigger memberi +50 untuk SETIAP invoice PAID tepat waktu (termasuk DP, pelunasan, utilitas) — bisa banyak poin per siklus. Idempotent per invoiceId (benar), tapi mungkin owner hanya mau poin untuk invoice SEWA. **Abu-abu — perlu konfirmasi.**
- 🟡 **B-5 [VALIDATED_REPORT reuse skor]** Review-renewal (F4-13a) & lapor-tervalidasi pakai reason `VALIDATED_REPORT` (+30) karena enum `LoyaltyPointReason` tak punya nilai khusus. sourceType beda (RENEWAL_REVIEW vs VALIDATED_REPORT) → tak bentrok. Fungsional benar; hanya "reason" di ledger kurang spesifik. **Catatan, bukan bug.**

##### F4-13c Quest sikap (`peer-report.service.ts`) — PRIVASI
- ✅ **B-OK3** Privasi pelapor terjaga: `listAboutMe` select TANPA `reporterTenantId`; notif ACKNOWLEDGE ke B tanpa identitas A; UAT membuktikan. Konfirmasi = A (reporter) atau admin (sesuai keputusan owner). Dedupe 1 laporan aktif per (A,B,kategori).
- 🟡 **B-6 [self-identify via deskripsi]** Sistem tak bocorkan pelapor, TAPI A bisa menulis identitasnya sendiri di `description` ("ini saya kamar 5"). Itu pilihan A, bukan kebocoran sistem. **Catatan.**
- 🟡 **B-7 [reportee bisa = tenant non-aktif?]** `create` hanya cek reportee tenant ada (bukan harus aktif/sehuni). `listCoTenants` (UI) hanya tampilkan penghuni aktif, jadi via UI aman; via API langsung bisa lapor tenant lama. Risiko rendah.

##### F4-13 Referral (`referral.service.ts`)
- ✅ **B-OK4** Anti-double via `TenantReferral.referredTenantId @unique` + upsert; self-referral diblok; reward hanya saat teman jadi tenant **AKTIF promoted** (harus benar-benar menyewa → tak bisa farming poin gratis). Idempotent per referralId.
- 🟡 **B-8 [hanya tenant BARU]** `linkReferralTx` dipanggil hanya saat `isNewTenant` di booking publik. Teman yang sudah pernah jadi tenant (balik lagi) tak tertaut. Sesuai semangat "ajak teman baru". **Catatan.**
- 🟡 **B-9 [kode via booking publik saja]** Referral hanya tertaut lewat booking PUBLIK (DTO `referralCode`). Booking via portal/admin tak ada jalur kode. Bila teman dibooking-kan admin, referral tak tercatat. **Abu-abu — perlu konfirmasi apakah perlu jalur admin.**

#### FASE C — OPERASIONAL

##### F4-8 Pindah kamar (`room-transfer.service.ts`)
- ✅ **C-OK1** Validasi benar (stay ACTIVE+promoted, toRoom AVAILABLE & tak ada penghuni aktif lain), tx + `FOR UPDATE` stay, kamar lama→MAINTENANCE+tiket inspeksi, baru→OCCUPIED, tarif kamar baru di-snapshot, override harga OWNER-only, RoomTransfer audit. UAT lengkap.
- 🟠 **C-1 [utilitas kamar LAMA tak diselesaikan saat pindah]** Transfer hanya snapshot meter **kamar BARU** (opsional). Pemakaian listrik/air tenant di kamar LAMA dari pembacaan terakhir s/d tanggal pindah **tidak di-snapshot/ditagih** — billing utilitas baca meter `roomId` saat ini (=kamar baru) → utilitas kamar lama periode berjalan bisa **hilang/tak tertagih**. **Perlu keputusan owner:** apakah pindah kamar harus menyelesaikan utilitas kamar lama dulu (snapshot meter akhir + tagih)?
- 🟡 **C-2 [toRoom tak di-lock]** Hanya stay yang `FOR UPDATE`; toRoom tidak. Dua pindah paralel ke kamar tujuan sama bisa lolos cek "tak ada penghuni aktif". Risiko rendah (admin-initiated). Fix: lock toRoom.
- 🟡 **C-3 [override harga vs jadwal recognition]** Bila stay SMESTERLY (punya RentRecognitionSchedule) lalu pindah + override harga, jadwal lama (harga lama) tak disesuaikan. Edge langka.

##### F4-15 Cuci AC (`auto-ops.service.ts runAcCleaningSchedule`)
- ✅ **C-OK2** Sweeper buat tiket AC_CLEANING saat lewat `acCleanIntervalDays`, dedupe via tiket terbuka, reset `acLastCleanedAt` saat tiket ditutup. Admin set AC via Room DTO.
- 🟡 **C-4 [OVER-CONFIDENCE: kWh/jam-pemakaian TIDAK diimplementasi]** Owner minta acuan **kWh listrik / estimasi jam dari watt** (AC 1/2 PK 380-450W). Implementasi hanya **interval HARI** (default 90); `acWattage` disimpan tapi TAK dipakai untuk trigger. Dicatat di checklist sbg "refinement" tapi sebenarnya bagian inti permintaan owner BELUM ada. **Status jujur: PARSIAL, bukan penuh.** Perlu keputusan: cukup interval, atau implement estimasi jam dari kWh?
- 🟡 **C-5 [biaya cuci → Expense manual]** Tak ada tautan otomatis tiket AC → Expense. Admin catat expense manual saat bayar tukang. Sesuai "flow normal" tapi tak otomatis.

##### F2-10 Round-robin (`tickets.service.ts pickStaffAssigneeTx`)
- ✅ **C-OK3** Logika benar (0→none, 1→dorman, ≥2→beban terendah). UAT membuktikan dorman/aktif.
- 🟡 **C-6 [cakupan parsial]** Round-robin hanya di `createTicketRecord` (tiket portal tenant + backoffice). Tiket **auto-system** (inspeksi checkout, AC, reward→tugas, room-transfer) masih `findFirst STAFF orderBy id asc` → menumpuk ke staf-1 walau ada ≥2 staf. **Perlu keputusan:** apakah tiket sistem juga harus round-robin?

##### F3-5 Leaderboard (`staff-performance.service.ts getLeaderboard`)
- ✅ **C-OK4** Peringkat skor KPI desc, `active=false` saat <2 staf (auto-aktif ≥2). UAT membuktikan. Reuse `getAdminMonthly` (konsisten skor). Tie → stable by fullName.

#### FASE D — INFRA / NOTIF

##### F4-2 PWA Push (`push.service.ts`, `sw.js`)
- ✅ **D-OK1** subscribe upsert by endpoint, unsubscribe deactivate, dispatch outbox (PENDING→SENT/FAILED), retry cap 3, 404/410 → deactivate subscription, VAPID off → skip aman (notif in-app tetap). UAT lengkap (offline). Tak ada bug berarti.
- 🟡 **D-1 [VAPID prod]** Wajib set `VAPID_PUBLIC_KEY/PRIVATE_KEY/SUBJECT` di env prod (langkah owner). Tanpa itu push diam (by design). Bukan bug.
- 🟡 **D-2 [butuh HTTPS + service worker hanya PROD]** Push hanya jalan di build PROD (SW di-register `import.meta.env.PROD`) + HTTPS. Di dev tak ada push. By design.

##### F4-7 Pruning notif (`app-notification.service.ts`)
- ✅ **D-OK2** `pruneOlderThan(90, batch 5000)` hapus `createdAt < cutoff`, batched via index. UAT membuktikan. Sweeper best-effort.
- 🟡 **D-3 [hapus termasuk unread]** Menghapus notif >90 hari TANPA pandang `isRead`. Notif penting yang belum dibaca & >90 hari ikut terhapus. Sesuai tujuan retensi; bisa diperhalus (hapus read-only) bila owner mau. **Catatan.**

##### F4-12 FAQ/Manual (`MyManualPage.tsx`)
- ✅ **D-OK3** Halaman tenant baca FAQ publik per kategori (Accordion). Reuse `Faq` + `/faqs/public`. Tanpa schema.
- 🟡 **D-4 [OVER-CONFIDENCE: "generate dari aturan flow" = manual]** Owner minta FAQ **di-generate dari semua aturan/flow**. Implementasi hanya **menampilkan** FAQ yang ADA; konten harus **dikurasi manual owner** via admin FAQ. Auto-generation konten dari `03_KEPUTUSAN_OWNER`/dossier **TIDAK** dibuat. **Status jujur: menu/tampilan PENUH, generasi konten BELUM.** Perlu keputusan: cukup kurasi manual, atau perlu seed FAQ awal dari aturan?

##### F4-14 Tip staf (`users` + `MyTicketsPage`)
- ✅ **D-OK4** `User.tip*` settable via users DTO/service; tenant lihat link tip assignee di tiket DONE/CLOSED; TIDAK dijurnal (sesuai keputusan).
- 🟠 **D-5 [TAK ADA UI input tip staf]** Backend menerima `tipGopay/Ovo/Dana/Bank` via update user, TAPI form manajemen user (ConfiguredResourcePage, config-driven) **belum punya field tip** → owner tak bisa mengisi info tip lewat UI (harus via API/DB langsung). **Fitur tip tak berguna sampai ada UI input.** Perlu: tambah field tip di form user, ATAU endpoint self-service staf.
- 🟡 **D-6 [staf tak bisa set tip sendiri]** Set tip via users update = OWNER-only (D-17). Staf tak bisa atur e-wallet sendiri. Mungkin owner mau self-service. **Abu-abu.**

#### FASE E — LINTAS (schema, RBAC, deploy)
- ✅ **E-OK1 [migration chain]** `migrate diff --from-migrations --to-schema` = **"No difference detected"** → 5 migration (F4-2/F4-1/S-3/S-4) konsisten; `migrate deploy` dari baseline menghasilkan schema persis. Deploy bersih.
- ✅ **E-OK2 [boot/DI]** App **"Nest application successfully started"**; SEMUA modul cross-dep baru (Accounting/AutoOps/Loyalty/Notifications/PaymentSubmissions/RenewRequests/Stays/TenantBookings/Tenants/Tickets) initialized — **TIDAK ADA circular dependency** (kritis krn banyak import baru sesi ini).
- ✅ **E-OK3 [balanceSheet]** Ada `accounting-reports.service.ts:356 balanceSheet()` berbasis jurnal → temuan audit lama "tak ada balance sheet" = **STALE** (mereka lihat reports.service operasional).
- ✅ **E-OK4 [RBAC]** Endpoint baru benar: transfer-room/prepay = OWNER/ADMIN; loyalty rewards = OWNER, redemptions decide = OWNER/ADMIN; peer-report tenant = TENANT, moderate = OWNER/ADMIN; leaderboard = OWNER/ADMIN; referral-code = auth (tenantId-gated).
- 🟡 **E-1 [db push --accept-data-loss]** S-4 db push butuh `--accept-data-loss` (false-alarm unique index pada kolom baru/null). `migrate deploy` tak terdampak (SQL additive). Bukan bug; catat di runbook agar tak panik.
- 🟡 **E-2 [bootstrap.sql]** Tabel/fitur baru TAK butuh trigger/constraint DB tambahan (idempotency via `@@unique` di schema). `sql/bootstrap.sql` tak perlu diubah untuk Fase 4. ✅ tapi pastikan dijalankan tetap (guard lama).

---

#### RINGKASAN TEMUAN

**Tidak ada 🔴 BUG baru dari Fase 4.** Gate (tsc 0, 40/40, UAT runtime, app boot) hijau; trial balance seimbang di semua jalur finance.

**🟠 CELAH (perlu keputusan owner):**
- **A-1** recognition/deferral bisa stranded bila periode tutup sebelum sweeper (mitigasi: sweeper 5 mnt). 
- **A-2** race prabayar sebelum jadwal SMESTERLY awal (edge langka).
- **C-1** utilitas kamar LAMA tak diselesaikan saat pindah kamar (bisa tak tertagih).
- **D-5** TAK ada UI input info tip staf (fitur tip tak berguna sampai ada UI).
- **A-8** (WARISAN, di luar Fase 4) auto-journal best-effort di flow lama.

**🟡 OVER-CONFIDENCE (di-check tapi parsial):**
- **C-4 F4-15:** acuan **kWh/jam** dari watt BELUM ada; hanya interval hari. (Permintaan owner sebagian.)
- **D-4 F4-12:** "generate FAQ dari aturan flow" = **manual kurasi**, bukan auto-generate.
- **C-6 F2-10:** round-robin hanya tiket portal/backoffice; tiket sistem-auto belum.

**🟡 ABU-ABU (perlu klarifikasi owner — lihat pertanyaan):** A-5/A-6/A-7 (prabayar: tarif non-MONTHLY, blok tunggakan, poin), B-4 (ON_TIME_PAYMENT setiap invoice?), B-9 (referral via admin?), D-6 (staf set tip sendiri?).

**Race-condition minor (🟡, risiko rendah krn 1 admin/low concurrency):** B-1 overspend poin, B-2 stok reward, C-2 toRoom lock. Fix umum: row lock / serializable bila nanti skala naik.

---

#### RINGKASAN TEMUAN (diisi akhir)


## Bagian 2 - `docs/AUDIT_MENYELURUH_SEMUA_FASE.md`

### AUDIT MENYELURUH — SEMUA FASE (1–4 + fondasi)
**Mulai:** 2026-06-15. **Lingkup:** seluruh domain (dossier 10–19), bukan hanya Fase 4. **Pelengkap** `AUDIT_FASE4_FINAL.md` (deep-dive Fase 4).
**Metode:** baca dossier §3 Temuan/§4 Task → **verifikasi langsung di kode hasil-commit** (anti over-confidence dua arah: cek yang diklaim selesai BENAR selesai, & cek yang diklaim open apakah masih open). Bandingkan dgn teori (PSAK, idempotency, lock/race, RBAC, PDP).
**Severity:** 🔴 BUG (harus fix) · 🟠 CELAH (risiko nyata) · 🟡 CATATAN/over-confidence · ✅ OK.

---

#### 🟢 KESIMPULAN UTAMA
**TIDAK ditemukan 🔴 bug baru di seluruh fase.** Satu-satunya 🔴 warisan yang menakutkan (ghost-stock I-02) ternyata **sudah ditutup di kode**. Gate hijau (tsc 0, build, unit, UAT runtime, app boot tanpa circular-dep), trial balance seimbang.

##### 🔎 TEMUAN DOMINAN (META) — DOSSIER DRIFT: dokumentasi TERTINGGAL dari kode
Tabel `§3 Temuan` & daftar `§4 Task` di banyak dossier masih menandai item sebagai **OPEN (🔴/🟠)** padahal **kode sudah mengimplementasikannya**. Diverifikasi langsung di kode = SELESAI tapi dossier bilang open:

| Item | Dossier bilang | Kode aktual | Bukti |
|---|---|---|---|
| **F1-1R** no-partial menyeluruh | 10 · B-01 🔴 P1 (task) | ✅ SELESAI | `payment-submissions.service.ts:418-450` (gate approve) + `invoice-payments.service.ts:167-172,223-228` (manual lunas penuh) |
| **F1-2** guard payment OCCUPIED | 10 · GAP#3 🟠 (task) | ✅ SELESAI | `invoice-payments.service.ts:270-276` |
| **F1-8** guard settlement deposit | 13 · F-24 🔴 P1 (task) | ✅ SELESAI | `accounting-posting.service.ts:631-641,727-736` (cek receipt journal) |
| **F1-3/F1-4** cashflow/rasio | 13 · F-01/F-02/F-18 🔴 (tabel) | ✅ SELESAI | `cashflow-classifier.ts` + `financial-ratios.helper.ts` ada + teruji (§6/§7) |
| **F1-10** kunci deposit | 11 · C3 🟠 P2 (task) | ✅ SELESAI | `tenant-bookings.service.ts:342-343` + `stays.service.ts:191-192` (= `Room.defaultDepositRupiah`) |
| **F2-5 / I-02** ghost-stock + konsolidasi helper | 14 · I-02 🔴 P2 (task), 18 · X-03 (task) | ✅ SELESAI | `staff-field-reports.service.ts:11,488-489` pakai `common/utils/room-booking.util` (lock+validasi) |
| **F2-14** monthRange WIB | 15 · K-5 🟡 (task) | ✅ SELESAI | `staff-performance.service.ts:9-22` (batas bulan WIB) |

**Implikasi:** ini ARAH AMAN (kode > docs, bukan klaim kosong), TAPI tetap risiko: pekerjaan masa depan bisa "mengulang" task yang sudah selesai, atau owner mengira fitur belum jadi. **Saran: sinkronkan tabel §3/§4 dossier 10/11/13/14/15/18 dengan status kode** (status header tiap dossier sudah akurat; hanya tabel detail yang basi).

---

#### TEMUAN OPEN NYATA (di luar Fase 4 — pelengkap AUD-1..AUD-8)

##### 🟠 L-1 (= A-8/AUD-8) Auto-journal best-effort di flow warisan — SISTEMIK
Call-site jurnal di flow lama menelan error posting & tetap commit operasinya:
- `stays.service.ts:331-337` (jurnal deposit liability saat check-in manual) — `.catch()`+`logger.warn`, tx tetap commit.
- `stays.service.ts:1418-1419` (`postInvoiceIssuedTx`) — idem.
- Pola sama untuk PAYMENT/CANCELLED/EXPENSE/WIFI (temuan audit lama `FLOW_AUDIT_LAPORAN.md` R1).
- Bila posting gagal → data operasional (kamar OCCUPIED, ledger, invoice) commit **tanpa jurnal** → laporan bisa understate sampai di-backfill.
- **Mitigasi yang ADA:** readiness `unmapped-operational` mendeteksi + `backfillAutoJournal` (manual). Deploy fresh (D-06) → COA selalu ter-seed → kegagalan jarang. **Kontras:** Fase 4 (F4-1/F4-11/redemption) justru BLOCKING (throw → rollback).
- **Keputusan owner perlu:** jadikan blocking + rekonsiliasi otomatis (R1/R2 audit lama)? Atau pertahankan best-effort + monitor readiness?

##### 🟡 L-2 (= F-30) Dedupe deposit-ledger belum pakai invoicePaymentId
`recordDepositReceivedTx` set `sourceId = paymentSubmissionId ?? stayId` (`deposit-ledger.service.ts:184`); kunci dedupe (`:123-128`) pakai `sourceId`. Kolom `invoicePaymentId` SUDAH ada di tabel tapi **tidak dipakai sebagai kunci dedupe** → setoran jaminan manual ke-2 tanpa submission berbeda akan ter-dedupe (kurang catat). **Dampak sangat rendah** (deposit lazimnya diterima 1× per stay). Fix kecil: masukkan `invoicePaymentId` ke `sourceId`/kunci dedupe.

##### 🟡 L-3 Jurnal reward vs spesifikasi dossier 19
Implementasi fulfillment reward selalu **DR 6300 (Beban Marketing)/CR 2100 (Utang)**, sedangkan dossier 19 §4 menyebut reward **diskon sewa → "jurnal pengurang pendapatan" (kontra-revenue)**. Untuk reward layanan/fisik, beban marketing wajar; untuk **diskon sewa**, idealnya kontra-revenue (kurangi 4000), bukan beban. **Dampak rendah** (owner memilih utamakan reward layanan in-house, bukan diskon sewa). **Klarifikasi bila reward "Diskon sewa" benar-benar diaktifkan.**

##### 🟡 L-4 Gate aktivasi KTP default OFF — RISIKO GO-LIVE
`stays.create` menggerbang KTP via env `KTP_ACTIVATION_GATE_ENABLED` (**default OFF**, F3-17). Artinya tanpa diset ON di produksi, kamar bisa diaktifkan **tanpa KTP terverifikasi** (lawan maksud E1/PDP). **Bukan bug** (sengaja default-off agar UAT lancar), tapi **WAJIB masuk runbook go-live** (`04_DEPLOY`): set `KTP_ACTIVATION_GATE_ENABLED=true` di produksi.

##### 🟡 L-5 SEO Lighthouse ≥90 belum diukur (implemented-but-unvalidated)
F3-3 mengimplementasi OG/JSON-LD/canonical/robots/sitemap, TAPI target Lighthouse SEO ≥90 **belum diukur** (konektor browser lokal gagal). Status jujur: implementasi ada, validasi belum. Juga tertunda kosmetik: UD-04 (chart owner all-zero), V-7 (seri Laba redundan). Bukan blocker.

##### ℹ️ L-6 Sadar-risiko (deferred, sesuai skala saat ini)
- Tanpa refresh token (JWT 24 jam, di localStorage PWA) — dossier 18, diterima.
- Rate-limit in-memory per-proses (multi-replica perlu Redis) — diterima sampai skala naik.
- wifi-order tanpa event in-app (via WhatsApp) — by design.

---

#### RINGKASAN PER DOMAIN
| Dossier | Status kode | Catatan audit |
|---|---|---|
| **10 Pembayaran/Invoice** | 🟢 KUAT | F1-1R/F1-2 SELESAI (dossier drift). No-partial menyeluruh tegak di create+approve+manual. |
| **11 Booking/Renewal** | 🟢 KUAT | F1-10 deposit-lock SELESAI (drift). Renewal state-machine + rent-loyalty utuh. |
| **12 Checkout/Deposit/Overstay** | 🟢 KUAT | F1-8 settlement-guard SELESAI; forced-checkout F3-16 (shortfall→AR) UAT 12/12. F-30 minor (L-2). |
| **13 Akuntansi/Laporan** | 🟢 engine sehat | F1-3/4/5/7/8/9 SELESAI (tabel §3 basi). L-1 best-effort journal (warisan). |
| **14 Inventaris** | 🟢 SEHAT | I-02 ghost-stock 🔴 **DITUTUP** (F2-5, util bersama). Tabel §3 basi. |
| **15 Staf/Tiket/KPI** | 🟢 | F2-14 WIB SELESAI (drift). Round-robin tiket sistem parsial (AUD-5). |
| **16 Notifikasi** | 🟢 LENGKAP | Coverage penuh + PWA push (F4-2). Hanya wifi-order by-design tanpa event. |
| **17 Publik/Marketing/UIUX** | 🟢 | SEO impl ada, Lighthouse belum diukur (L-5). UX minor tertunda. |
| **18 Auth/Fondasi/KTP** | 🟢 KUAT | default-deny guard, OWNER-only, KTP. Gate KTP default-OFF (L-4 go-live). |
| **19 Gamifikasi** | 🟢 SELESAI | Lihat `AUDIT_FASE4_FINAL.md` (FASE B). L-3 jurnal reward vs spec. |
| **M12 AI Owner/Admin** | 🟡 FASE BARU | Manual-only, OWNER/ADMIN, no direct mutation, audit usage/cost/PDP wajib. |

#### TINDAK LANJUT (ke `08_CHECKLIST.md`)
- **SINKRON-DOC:** rapikan tabel §3/§4 dossier 10/11/13/14/15/18 (tandai item SELESAI). _(pekerjaan docs, bukan kode)_
- **L-1/AUD-8:** keputusan owner — auto-journal blocking + rekonsiliasi otomatis vs best-effort+monitor.
- **L-4:** tambah `KTP_ACTIVATION_GATE_ENABLED=true` ke runbook go-live `04_DEPLOY`.
- **L-2/L-3/L-5:** perbaikan kecil/klarifikasi (rendah prioritas).
- AUD-1..AUD-7 (Fase 4) + D-21 sudah tercatat di checklist.


## Bagian 3 - `docs/FLOW_AUDIT_LAPORAN.md`

### LAPORAN AUDIT FLOW KOST48 V5 — Realita Kode vs Aturan Bisnis
**Tanggal:** 2026-06-14 | **Git HEAD:** `0a83dbd` | **Unit Test:** 26/26 ✅

---

#### A. NARASI REALITA 5 FLOW INTI

---

##### A1. FLOW BOOKING + PEMBAYARAN (Jantung Uang Masuk)

**Aktor yang terlibat:** Tenant (publik/portal), Admin, Sistem (Auto-Ops)

###### A1.1 Booking Publik (tanpa login)
1. **Input:** Tamu isi nama, email, telepon, pilih kamar, pilih tanggal.
2. **Validasi:**
   - `checkInDate` tidak boleh hari ini jika jam ≥ 21:00 WIB.
   - `checkInDate` tidak boleh masa lalu.
   - Phone dinormalisasi, email di-lowercase.
   - Ada **honeypot trap** (`dto.website`) — jika diisi, dianggap bot → 400.
3. **Buat akun sementara:** Password `Kost48${randomInt(10000,99999)}`, di-hash bcrypt, disimpan ke User + Tenant.
4. **Anti-duplikasi tenant:** Jika sudah ada tenant dengan email atau phone yang sama → pakai tenant yang sudah ada (gabung), bukan buat baru.
5. **Buat Stay (booking):** Dalam transaksi:
   - Lock kamar `FOR UPDATE` — kamar harus AVAILABLE atau RESERVED (multi-booking diizinkan).
   - Hitung harga = snapshot tarif per `pricingTerm`.
   - **DP = 30% × sewa** (`Math.round((agreedRent * 30) / 100)`).
   - **Expiry = 3 jam** dari waktu pembuatan booking (deadline flat).
   - Room → `RESERVED`, Stay status → `ACTIVE`, `initialMetersPromotedAt` = NULL.
6. **Notifikasi ke admin** — best-effort (tidak menggagalkan jika gagal).

###### A1.2 Booking Portal (tenant login)
- **SAMA persis** dengan publik, kecuali:
  - Tidak perlu buat akun (tenant sudah login).
  - Validasi tambahan: tenant harus aktif, tenant hanya boleh booking untuk dirinya sendiri.
  - Guard: tenant tidak boleh punya stay ACTIVE lain (1 tenant = 1 stay aktif).

###### A1.3 Tenant Upload Bukti Bayar (createSubmission)
1. Tenant login, pilih invoice yang ingin dibayar.
2. System cari `eligibleSubmissionTarget` — invoice harus milik stay tenant, status ISSUED/PARTIAL/DRAFT (kecuali RESERVED-strict).
3. **Anti-duplikasi:** Cek existing PENDING_REVIEW untuk stay+invoice yang sama → conflict.
4. Tenant upload file bukti (gambar) → simpan ke disk path.
5. Buat `PaymentSubmission` status `PENDING_REVIEW`.
6. **Notifikasi ke semua OWNER/ADMIN aktif** — dedupe per (recepient + title + entityType + entityId), best-effort.

###### A1.4 Admin Approve Pembayaran (approveSubmission) — KRUSIAL
**Ini titik paling kritis dalam sistem. Langkah demi langkah:**

1. **Lock submission** `FOR UPDATE` — harus PENDING_REVIEW, stay ACTIVE.
2. **Cek jalur:**
   - `isBookingPath = (room.status === 'RESERVED' && stay.initialMetersPromotedAt === null)` — booking belum check-in.
   - `isInvoiceOnlyPath` — sisanya (invoice langsung, bukan booking).
3. **Hitung ulang paid amount** dari invoice payments yang sudah ada.
4. **Dua-nominal gate** (F1-1R, F2-3 sudah diimplementasikan):
   - **Booking path:** nominal harus = DP 30% ATAU = total invoice (lunas penuh). Jika tidak → 409.
   - **Invoice-only path:** nominal harus = sisa tagihan (lunas penuh, tidak boleh partial). Jika tidak → 409.
5. **Split nominal:** `rentPortion` (dari invoice line RENT) + `depositPortion` (dari invoice line DEPOSIT).
6. **Buat InvoicePayment** — simpan ke invoice payments.
7. **Update status invoice:** Jika total paid = invoice total → `PAID`. Jika < → `PARTIAL`.
8. **Auto Journal Lite** — terbitkan jurnal INVOICE_PAYMENT (best-effort). Jika gagal, approval tetap jalan.
9. **Submission → APPROVED.**
10. **Jika booking path:**
    - Update `downPaymentPaidRupiah`.
    - **Jika invoice PAID (lunas penuh):**
      - Room → `OCCUPIED`.
      - Auto-set `plannedCheckOutDate` (checkIn + periode sewa).
      - Promosi meter (`initialMetersPromotedAt` diisi).
      - Stay → "promoted" (check-in nyata).
    - **CancelCompetingUnpaidBookingsTx:**
      - Cari booking lain di kamar yang sama (ACTIVE + belum promoted).
      - Untuk setiap pesaing: batalkan stay, batalkan invoice, reversal jurnal POSTED.
      - **Notifikasi ke tenant yang kalah** — best-effort.
      - **PENTING:** Booking dengan submission PENDING_REVIEW **TIDAK dibatalkan** — admin harus refund manual.

###### A1.5 Keputusan Admin (Reject / Expire)
- **rejectSubmission:** Admin tolak bukti bayar → submission REJECTED. Notifikasi tenant.
- **expireBooking:** Admin/System expire booking → submission EXPIRED, stay CANCELLED, room AVAILABLE.

###### 🔴 Temuan Flow Pembayaran:
| # | Masalah | File:Baris | Severitas |
|---|---------|-----------|-----------|
| B1 | Auto Journal Lite di `approveSubmission` adalah **best-effort** — jika gagal, approval tetap jalan, uang tercatat di invoice tapi **tidak ada jurnal** | `payment-submissions.service.ts:439-449` | 🔴 KRITIS |
| B2 | Deposit ledger (`recordDepositReceivedTx`) di booking path juga **best-effort** — jika gagal, deposit tidak tercatat di ledger | `payment-submissions.service.ts:483` | 🟠 TINGGI |
| B3 | `isBookingSchemaDriftError` (guard booking di createBooking:222) **menelan error** — jika terjadi race, error di-swallow, booking mungkin dibuat tanpa lock yang benar | `tenant-bookings.service.ts:222` | 🟠 TINGGI |

---

##### A2. FLOW INVOICE + PEMBAYARAN MANUAL

**Aktor:** Admin/OWNER, Sistem

###### A2.1 Buat Invoice
1. Admin pilih tenant+stay, input lines (RENT, UTILITY, PENALTY, DEPOSIT, DISCOUNT, ADJUSTMENT).
2. Guard: hanya OWNER/ADMIN, periode valid, total > 0.
3. Transaksi: buat invoice DRAFT → buat lines → ISSUE (status → ISSUED, `issuedAt` diisi).
4. **Saat ISSUE:** Auto Journal `INVOICE_ISSUED` — debit Piutang (AR 1100), kredit Pendapatan (Revenue). Best-effort.

###### A2.2 Pembayaran Manual Admin
1. Admin input payment (nominal) untuk invoice tertentu.
2. **Lock invoice** `FOR UPDATE` — hitung total paid existing.
3. **Anti-overpayment:** `existingPaid + amount > invoiceTotal` → 409.
4. **Jika booking path (status RESERVED):** wajib lewat jalur approve bukti bayar, bukan manual → 409.
5. Buat InvoicePayment → sync status invoice (PAID/PARTIAL/ISSUED).
6. **Auto Journal** INVOICE_PAYMENT — best-effort.

###### A2.3 Remove Payment (HAPUS)
Guard **OCCUPIED** (F1-2): Jika `initialMetersPromotedAt` terisi ATAU room OCCUPIED → 409. Aman ✅

###### A2.4 Cancel Invoice
1. Guard: invoice harus ISSUED/PARTIAL (tidak boleh PAID atau CANCELLED).
2. Transaksi: set status CANCELLED.
3. **Reversal jurnal:** Auto Journal `INVOICE_CANCELLED` — reversal jurnal ISSUED sebelumnya. Best-effort.

###### 🔴 Temuan Invoice:
| # | Masalah | File:Baris | Severitas |
|---|---------|-----------|-----------|
| I1 | Jurnal ISSUED dan reversal jurnal cancel adalah **best-effort** — invoice bisa ISSUED/CANCELLED tanpa jurnal | `invoices.service.ts:328-336` | 🔴 KRITIS |
| I2 | CREATE invoice untuk invoice di stay yang sudah COMPLETED tidak diblokir | `invoices.service.ts:289-290` | 🟡 MENENGAH |

---

##### A3. FLOW RENEWAL (Perpanjangan)

**Aktor:** Tenant, Admin, Sistem (Sweeper)

###### A3.1 State Machine (7 status)
```
PENDING_DECISION ──[TENANT=YA]──→ AWAITING_DP
PENDING_DECISION ──[TENANT=TIDAK] → REJECTED_BY_TENANT
AWAITING_DP ──[DP LUNAS]──→ DP_SECURED
AWAITING_DP ──[EXPIRED (H-H+0)] → EXPIRED_PRIORITY
DP_SECURED ──[PELUNASAN LUNAS] → COMPLETED (stay diperpanjang)
DP_SECURED ──[GAGAL LUNAS H+7] → FORFEITED (manual admin)
PENDING_DECISION ──[ADMIN REJECT] → REJECTED_BY_ADMIN
```

###### A3.2 Langkah Detail
1. **H-10:** Auto-Ops `runContractEndReminders` kirim notif ke tenant untuk renew.
2. **Tenant createRequest:** Pilih stay → hitung DP 30% → status `PENDING_DECISION`.
3. **Tenant decideByTenant:**
   - **YA:** Buat invoice DP 30% terpisah. Status → `AWAITING_DP`. Notif ke admin.
   - **TIDAK:** Status → `REJECTED_BY_TENANT`. Notif admin.
4. **Admin rejectRequest:** Status → `REJECTED_BY_ADMIN`. Notif tenant.
5. **Tenant bayar DP** (lewat flow payment submission biasa → invoice DP).
6. **Admin confirmDownPayment:**
   - Cek invoice DP sudah PAID.
   - Status → `DP_SECURED`.
   - **Terbitkan invoice pelunasan** (sisa sewa + utilitas, tanpa DP).
   - Notif tenant.
7. **Tenant bayar pelunasan** (lewat flow payment submission biasa).
8. **Admin finalizeRenewal:**
   - Cek invoice pelunasan sudah PAID.
   - Cek deadline: tidak boleh lewat H+7 dari `downPaymentDueDate`.
   - Stay diperpanjang: periode baru, plannedCheckOutDate baru.
   - Status → `COMPLETED`.
   - Notif tenant.
9. **Sweeper (Auto-Ops):**
   - `EXPIRED_PRIORITY`: AWAITING_DP lewat `downPaymentDueDate` → batalkan invoice DP + reversal jurnal.
   - `FORFEITED`: DP_SECURED lewat H+7 → flag + notif admin. **Forced checkout manual admin** (keputusan owner hibrida).

###### ✅ Status: **SELESAI** (F2-1, F2-2). State machine penuh, guard deadline, sweeper hibrida.

---

##### A4. FLOW CHECKOUT + DEPOSIT

**Aktor:** Tenant, Admin, Staf (inspeksi), Sistem

###### A4.1 Pengajuan Checkout
1. Tenant ajukan checkout request: guard `assertNoOpenInvoices` — tolak jika ada invoice belum PAID/CANCELLED.
2. Admin approve → notifikasi tenant + staf.
3. Atau admin reject → notifikasi tenant.

###### A4.2 Final Checkout (`complete`)
**KRUSIAL. Langkah demi langkah:**

1. **Guard actor:** Hanya OWNER/ADMIN.
2. **Guard invoice:** Query semua invoice stay. Jika ada yang belum PAID/CANCELLED → **BLOCK** (409).
3. **Transaksi:**
   - Stay → `COMPLETED`.
   - Room → `MAINTENANCE`.
   - Auto-create tiket `CHECKOUT_INSPECTION` (dedupe per stay+room+kategori).
   - Jika ada DRAFT invoice → batalkan (tanpa jurnal karena DRAFT).
4. **Auto Journal:** Reversal jurnal UTILITY yang belum diissue (best-effort).
5. **Notifikasi** ke staf + admin — best-effort.

###### A4.3 Settlement Deposit (`processDeposit`)
1. Guard: stay COMPLETED/CANCELLED, depositStatus HELD.
2. Aksi yang tersedia:
   - **FULL_REFUND:** depositStatus → REFUNDED.
   - **PARTIAL:** depositStatus → PARTIALLY_REFUNDED.
   - **FORFEIT:** depositStatus → FORFEITED.
3. **Jurnal DEPOSIT_SETTLEMENT** — dibuat di dalam transaksi (bukan best-effort). **Blocking.** ✅
4. **Deposit ledger** — dicatat di dalam transaksi. **Blocking.** ✅
5. Anti-double-settlement: guard depositStatus harus HELD.

###### A4.4 Room Readiness (Tiket Inspeksi)
1. Staf/Admin close tiket CHECKOUT_INSPECTION.
2. Cek tidak ada stay ACTIVE lain di kamar itu.
3. Cek semua barang GOOD.
4. **Room MAINTENANCE → AVAILABLE.**

###### ✅ Temuan Checkout:
| # | Masalah | File:Baris | Severitas |
|---|---------|-----------|-----------|
| C1 | Saat `complete`, Auto Journal UTILITY reversal adalah **best-effort** — reversal bisa gagal | `stays.service.ts:662-664` | 🟠 TINGGI |
| C2 | Auto Journal `DEPOSIT_SETTLEMENT` sudah blocking ✅ — tapi di versi sebelum F1-8 ada risiko settlement tanpa jurnal. Sekarang sudah diperbaiki. | `stays.service.ts:834-870` | ✅ SELESAI |

---

##### A5. FLOW AUTO-OPS + AKUNTANSI + LAPORAN

###### A5.1 Auto-Ops (13 Job Sequential)
**Urutan eksekusi** (mutex `running` mencegah overlap):

| # | Job | Fungsi | Status |
|---|-----|--------|--------|
| 1 | `runBookingExpiry` | Batalkan booking lewat `expiresAt` (3 jam) | ✅ |
| 2 | `runContractEndReminders` | Kirim notif kontrak akan berakhir (H-10,7,3,1,0) | ✅ |
| 3 | `runRenewalPriorityExpiry` | AWAITING_DP lewat deadline → EXPIRED_PRIORITY | ✅ |
| 4 | `runRenewalSettlementForfeit` | DP_SECURED lewat H+7 → FORFEITED (flag manual) | ✅ |
| 5 | `runDownPaymentForfeit` | Booking lewat checkIn+1 hari tanpa lunas → DP hangus | ✅ |
| 6 | `runOverstayForcedCheckout` | H+1 pk 12:00 → forced checkout. Skip jika ada tagihan. ✅ Skip DRAFT. | ✅ |
| 7 | `runPostCheckoutAutoCancel` | Stay belum promoted lewat plannedCheckOut → cancel | ✅ |
| 8 | `runRoomReleaseAtNoon` | pk 12:00 WIB → rilis booking expired | ✅ |
| 9 | `runRoomHealer` | Room RESERVED yatim → pulihkan | ✅ |
| 10 | `runOverstayEnforcement` | Kamar OCCUPIED lewat kontrak → tiket EVICT_OVERSTAY | ✅ |
| 11 | `runAutoExpenseDraft` | Buat draft expense rutin (gaji, listrik, dll) max 6/bln | ✅ |
| 12 | `runAutoDepreciation` | Depresiasi bulan sebelumnya | ✅ |
| 13 | `runAccountingAutoClose` | Tutup buku bulan lalu jika readiness aman | ✅ |

###### A5.2 Akuntansi (Auto Journal Lite)
**Sumber jurnal** dan cara kerjanya:

| Source Type | Trigger | Debit | Kredit | Best-Effort? |
|------------|---------|-------|--------|--------------|
| INVOICE_ISSUED | Invoice di-issue | AR (1100) | Revenue | ✅ Best-effort |
| INVOICE_PAYMENT | Payment diterima | Kas (10xx) | AR (1100) | ✅ Best-effort |
| INVOICE_CANCELLED | Invoice di-cancel | Revenue | AR (1100) | ✅ Best-effort |
| EXPENSE | Expense dikonfirmasi | Beban | Kas (10xx) | ✅ Best-effort |
| WIFI_SALE | Wifi terjual | Kas (10xx) | Pendapatan | ✅ Best-effort |
| DEPOSIT_RECEIVED | Deposit diterima | Kas (10xx) | Deposit Liab (2000) | ✅ Best-effort |
| DEPOSIT_SETTLEMENT | Deposit diselesaikan | Deposit Liab (2000) | Kas (10xx) | **Blocking** ✅ |
| DEPRECIATION_RUN | Depresiasi dijalankan | Beban Depresiasi | Akumulasi Depresiasi | ✅ Best-effort |

**Idempotensi:** Setiap source hanya boleh punya 1 jurnal POSTED → lock via `(sourceType, sourceId)` unique.

###### A5.3 Laporan Keuangan
| Laporan | Sumber Data | Exclude DRAFT? | Exclude CANCELLED? |
|---------|-------------|---------------|-------------------|
| **P&L** (profitLoss) | Invoice (totalAmount) + Wifi (soldPrice) + Expense (amount) | ✅ DRAFT | ✅ CANCELLED |
| **Cashflow** | InvoicePayment (amount) + Wifi (soldPrice) + Expense (amount) | ✅ (DRAFT expense) | ✅ CANCELLED invoice |
| **Balance Sheet** | **TIDAK ADA** method balanceSheet di reports.service | — | — |
| **Financial Ratios** | Mixed: invoice + kamar + hitung sendiri | ✅ | ✅ |
| **Occupancy Rate** | Kamar isActive + stay ACTIVE+promoted | ✅ | ✅ |

###### 🔴 Temuan Akuntansi:
| # | Masalah | File:Baris | Severitas |
|---|---------|-----------|-----------|
| A1 | **5 dari 8 sumber jurnal adalah best-effort** — jika jurnal gagal, laporan keuangan tidak balance dengan data operasional | berbagai | 🔴 KRITIS |
| A2 | Balance Sheet tidak ada method terpisah — hanya `balanceSheetDraft` di finance.service yang pakai data operasional, bukan jurnal penuh | `reports.service.ts` | 🟠 TINGGI |
| A3 | High signal tickets sebelumnya pakai kategori 'URGENT','HIGH','EMERGENCY' yang tidak valid → sinyal mati. **SUDAH DIPERBAIKI** F2-12 | `finance.service.ts` | ✅ SELESAI |
| A4 | Occupancy rate dulu selalu 0 karena pakai field `occupancyRate`. **SUDAH DIPERBAIKI** F1-6 — inline hitung dari kamar| `finance.service.ts` | ✅ SELESAI |

---

#### B. AUDIT BARIS PER BARIS — FILE KEUANGAN

##### B1. `payment-submissions.service.ts` (1727 baris)
| Baris | Kode | Masalah | Severitas |
|-------|------|---------|-----------|
| 439-449 | `postJournal?.postInvoicePaymentNoTx` | **Best-effort.** Jika jurnal gagal, approval tetap jalan | 🔴 |
| 483 | `depositLedger.recordDepositReceivedTx` | **Best-effort.** Deposit ledger bisa tidak tercatat | 🟠 |
| 1270, 1298 | `.catch(e => this.logger.warn(...))` | Notifikasi tenant bisa gagal tanpa dampak | 🟡 |
| 1320 | `PaymentSubmission.findFirst` tanpa `FOR UPDATE` | Race condition kecil saat read before tx | 🟡 |

##### B2. `invoices.service.ts` (535 baris)
| Baris | Kode | Masalah | Severitas |
|-------|------|---------|-----------|
| 328-336 | `postInvoiceIssuedTx` dipanggil di luar transaksi | Jurnal ISSUED bisa gagal, invoice tetap ISSUED | 🔴 |
| 480-530 | `cancel` → `postInvoiceCancelledTx` juga di luar tx | Reversal bisa gagal | 🔴 |

##### B3. `invoice-payments.service.ts` (~250 baris)
| Baris | Kode | Masalah | Severitas |
|-------|------|---------|-----------|
| 189-192 | `remove` → guard OCCUPIED menggunakan `initialMetersPromotedAt` | ✅ Sudah benar (F1-2) | ✅ |
| 113-193 | `create` → lock FOR UPDATE | ✅ Sudah benar | ✅ |

##### B4. `accounting-posting.service.ts` (1273 baris)
| Baris | Kode | Masalah | Severitas |
|-------|------|---------|-----------|
| 1130-1236 | `postBalancedJournalTx` — idempoten via `(sourceType, sourceId)` | ✅ Sudah benar | ✅ |
| 1258-1271 | `runIdempotentPosting` — catch P2002 race | ✅ Sudah benar | ✅ |

##### B5. `accounting.service.ts` (~700 baris)
| Baris | Kode | Masalah | Severitas |
|-------|------|---------|-----------|
| 585 | `createJournalEntry` guard periode OPEN | ✅ Sudah benar | ✅ |
| 325-526 | Opening balance draft/post/void | ✅ Sudah benar | ✅ |

##### B6. `accounting-period-close.service.ts` (~400 baris)
| Baris | Kode | Masalah | Severitas |
|-------|------|---------|-----------|
| 325-406 | `buildReadiness` — 11 checks | ✅ Sudah benar | ✅ |
| 122 | `autoCloseMonthly` — idempoten via `runAccountingAutoClose` | ✅ Sudah benar | ✅ |

##### B7. `reports.service.ts` (~400 baris)
| Baris | Kode | Masalah | Severitas |
|-------|------|---------|-----------|
| 306-370 | `profitLoss` — exclude DRAFT+CANCELLED | ✅ Sudah benar | ✅ |
| 251-298 | `cashFlow` — paymentDate, exclude DRAFT expense | ✅ Sudah benar | ✅ |
| 199-250 | `financialRatios` — expenseRatio (expense/revenue)x100 | ✅ Sudah benar | ✅ |

##### B8. `finance.service.ts` (~400 baris)
| Baris | Kode | Masalah | Severitas |
|-------|------|---------|-----------|
| 40-149 | `businessHealth` — overdue via `$queryRaw` sisa tagihan | ✅ Sudah benar | ✅ |
| 280-350 | `ownerDashboard` | ✅ Sudah benar | ✅ |

---

#### C. 5 PROMPT MERMAID UNTUK GEMINI

##### Prompt #1 — Flow Booking + Pembayaran

```
Buatkan flowchart Mermaid dalam Bahasa Indonesia untuk flow BOOKING DAN PEMBAYARAN KOST48.

Gunakan style flowchart (graph TD). Warna:
- Hijau (#22c55e) untuk aksi TENANT
- Biru (#3b82f6) untuk aksi ADMIN
- Oranye (#f97316) untuk aksi SISTEM/AUTO-OPS
- Merah (#ef4444) untuk ERROR/PENOLAKAN
- Abu-abu (#94a3b8) untuk NOTIFIKASI (best-effort)

Detail langkah:

START → [TENANT] Booking via publik (isi nama, email, telp, pilih kamar+tanggal)
  Decision: Apakah checkInDate < today? → YA → ERROR: "Tidak boleh booking masa lalu"
  → TIDAK → Decision: Apakah jam ≥ 21:00 WIB untuk check-in hari ini? → YA → ERROR: "Booking untuk hari ini ditutup"
  → TIDAK → [SISTEM] Cek apakah tenant sudah ada (email/phone match)
    Decision: Tenant baru? → YA → [SISTEM] Buat User+Tenant, password "Kost48{random}"
    → TIDAK → [SISTEM] Pakai tenant yang sudah ada
  → [SISTEM] Lock kamar (FOR UPDATE)
  → Decision: Kamar AVAILABLE atau RESERVED? → TIDAK → ERROR: "Kamar tidak tersedia"
  → YA → [SISTEM] Hitung harga = tarif × pricingTerm
  → [SISTEM] DP = 30% × sewa
  → [SISTEM] Expiry = 3 jam dari now
  → [SISTEM] Room → RESERVED, Stay → ACTIVE (initialMetersPromotedAt = NULL)
  → [ABU-ABU] Notif admin (best-effort)
  → [TENANT] Upload bukti bayar (PENDING_REVIEW)

  → [ADMIN] approveSubmission:
  → Decision: Apakah room RESERVED dan belum promoted? (booking path)
    → YA → [ADMIN] Validasi nominal: DP tepat(30%) ATAU lunas penuh
      → Decision: Valid? → TIDAK → ERROR: "Nominal harus DP 30% atau lunas penuh"
      → YA → [ADMIN] Split nominal: rentPortion + depositPortion
    → TIDAK (invoice-only) → [ADMIN] Validasi nominal = sisa tagihan
      → Decision: Valid? → TIDAK → ERROR: "Invoice-only wajib lunas penuh"
      → YA → [ADMIN] Buat InvoicePayment
  → [SISTEM] Update status invoice: PAID/PARTIAL/ISSUED
  → [ORANYE] Auto Journal INVOICE_PAYMENT (best-effort)
  → [SISTEM] Submission → APPROVED
  → Decision: Booking path + invoice PAID?
    → YA → 1) Room OCCUPIED 2) Auto plannedCheckOutDate 3) Promosi meter
           4) CancelCompetingUnpaidBookingsTx
           5) [ABU-ABU] Notif tenant kalah (best-effort)
    → TIDAK → Selesai
  → [ABU-ABU] Notif tenant pembayaran diterima (best-effort)

  Decision dari admin: Tolak (rejectSubmission)?
    → YA → [SISTEM] SUBMISSION REJECTED, notif tenant
    → TIDAK → Lanjut

END
```

##### Prompt #2 — Flow Invoice + Pembayaran Manual

```
Buatkan flowchart Mermaid dalam Bahasa Indonesia untuk flow INVOICE DAN PEMBAYARAN MANUAL KOST48.

Warna sama: Hijau=tenant, Biru=admin, Oranye=sistem, Merah=error, Abu-abu=notif.

Detail langkah:

START → [ADMIN] Buat invoice: pilih stay, input lines (RENT/UTILITY/PENALTY/DEPOSIT/DISCOUNT/ADJUSTMENT)
  → Decision: Total > 0? → TIDAK → ERROR
  → YA → [SISTEM] Create invoice DRAFT
  → [SISTEM] Issue invoice: status ISSUED, issuedAt = now
  → [ORANYE] Auto Journal INVOICE_ISSUED: debit AR(1100), kredit Revenue (best-effort)
  → Status: ISSUED

  → [ADMIN] Pembayaran manual (create InvoicePayment):
  → [SISTEM] Lock invoice FOR UPDATE
  → Decision: Apakah room RESERVED (belum check-in)? → YA → ERROR: "Harus lewat approve bukti bayar"
  → TIDAK → Decision: existingPaid + amount > invoiceTotal? → YA → ERROR: "Overpayment"
  → TIDAK → Buat InvoicePayment
  → [SISTEM] Sync status invoice:
    → Jika paid == total → PAID
    → Jika paid < total → PARTIAL (jika sebelumnya ISSUED)
  → [ORANYE] Auto Journal INVOICE_PAYMENT (best-effort)

  → [ADMIN] Hapus payment (remove):
  → Decision: Apakah initialMetersPromotedAt != NULL ATAU room OCCUPIED?
    → YA → ERROR 409: "Tidak bisa hapus payment saat kamar sudah dihuni"
    → TIDAK → Hapus payment, reversal jurnal

  → [ADMIN] Cancel invoice:
  → Decision: Status ISSUED/PARTIAL?
    → YA → Status CANCELLED
    → [ORANYE] Auto Journal INVOICE_CANCELLED (reversal, best-effort)
    → TIDAK → ERROR: "Tidak bisa cancel invoice PAID/CANCELLED"

END
```

##### Prompt #3 — Flow Renewal (Perpanjangan)

```
Buatkan flowchart Mermaid dalam Bahasa Indonesia untuk flow RENEWAL (PERPANJANGAN) KOST48.

Warna sama. Detail state machine dengan 7 status.

Detail langkah:

START → [SISTEM] H-10: runContractEndReminders → notif tenant kontrak akan berakhir
  → [TENANT] createRequest → pilih stay → hitung DP 30%
  → Status: PENDING_DECISION

  → [TENANT] decideByTenant:
  → Decision: YA atau TIDAK?
    → TIDAK → Status REJECTED_BY_TENANT → [ABU-ABU] Notif admin
    → YA → [SISTEM] Buat invoice DP 30% TERPISAH
       → Notif admin "tenant setuju renew"
       → Status: AWAITING_DP
       → Deadline: downPaymentDueDate = plannedCheckOutDate

  → [TENANT] Bayar DP (lewat flow payment submission biasa)
  → [ADMIN] confirmDownPayment:
  → Decision: Invoice DP sudah PAID?
    → TIDAK → ERROR: "DP belum dibayar"
    → YA → Status: DP_SECURED
    → [SISTEM] Terbitkan invoice PELUNASAN (sisa sewa + utilitas)
    → Deadline: settlementDueDate = now + 7 hari (H+7)
    → [ABU-ABU] Notif tenant "DP disetujui, segera bayar pelunasan"

  → [TENANT] Bayar pelunasan (lewat flow payment submission biasa)
  → [ADMIN] finalizeRenewal:
  → Decision: Invoice pelunasan sudah PAID?
    → TIDAK → ERROR
    → YA → Decision: Apakah sekarang > settlementDueDate?
      → YA → ERROR: "Melewati batas H+7, renewal tidak bisa difinalkan"
      → TIDAK → [SISTEM] Stay diperpanjang:
        1) Periode baru
        2) plannedCheckOutDate baru
        3) Status: COMPLETED
        → [ABU-ABU] Notif tenant "Kontrak diperpanjang"

  ── JALUR SISTEM (Sweeper Auto-Ops) ──
  → [SISTEM] runRenewalPriorityExpiry:
  → Decision: AWAITING_DP + downPaymentDueDate lewat?
    → YA → Status EXPIRED_PRIORITY
    → Batalkan invoice DP (reversal jurnal jika POSTED)
    → [ABU-ABU] Notif tenant "Prioritas renew hangus"

  → [SISTEM] runRenewalSettlementForfeit:
  → Decision: DP_SECURED + settlementDueDate lewat?
    → YA → Status FORFEITED
    → [ABU-ABU] Notif admin "Tenant gagal lunas, lakukan forced checkout manual"

  Decision from admin: rejectRequest?
    → YA → Status REJECTED_BY_ADMIN → [ABU-ABU] Notif tenant

END
```

##### Prompt #4 — Flow Checkout + Deposit

```
Buatkan flowchart Mermaid dalam Bahasa Indonesia untuk flow CHECKOUT DAN DEPOSIT KOST48.

Warna sama. Detail langkah:

START → [TENANT] Ajukan checkout request
  → [SISTEM] Guard: assertNoOpenInvoices
  → Decision: Ada invoice belum PAID/CANCELLED?
    → YA → ERROR: "Selesaikan semua tagihan dulu"
    → TIDAK → Status: PENDING

  → [ADMIN] Approve checkout request:
  → [ABU-ABU] Notif tenant + staf

  → [ADMIN] Final checkout (complete):
  → Guard actor: OWNER/ADMIN only
  → Guard invoice ulang: cek semua invoice stay → jika ada belum lunas → BLOCK (409)
  → [SISTEM] Dalam transaksi:
    1) Stay COMPLETED
    2) Room MAINTENANCE
    3) Buat tiket CHECKOUT_INSPECTION (dedupe)
    4) Batalkan DRAFT invoice (tanpa jurnal)
  → [ORANYE] Auto Journal UTILITY reversal (best-effort)
  → [ABU-ABU] Notif staf + admin

  ── TAHAP DEPOSIT ──
  → [ADMIN] processDeposit:
  → Decision: depositStatus HELD?
    → TIDAK → ERROR: "Deposit sudah diselesaikan"
    → YA → Pilih aksi:
      → FULL_REFUND → depositStatus REFUNDED
      → PARTIAL → depositStatus PARTIALLY_REFUNDED
      → FORFEIT → depositStatus FORFEITED
  → [SISTEM] Jurnal DEPOSIT_SETTLEMENT (BLOCKING di dalam tx) ✅
  → [SISTEM] Deposit ledger (BLOCKING di dalam tx) ✅

  ── TAHAP ROOM READINESS ──
  → [STAF/ADMIN] Tutup tiket CHECKOUT_INSPECTION
  → [SISTEM] Cek tidak ada stay ACTIVE lain
  → Decision: Semua barang GOOD?
    → YA → Room MAINTENANCE → AVAILABLE
    → TIDAK → Tunggu perbaikan

END
```

##### Prompt #5 — Flow Auto-Ops + Akuntansi + Laporan

```
Buatkan flowchart Mermaid dalam Bahasa Indonesia untuk flow AUTO-OPS, AKUNTANSI DAN LAPORAN KOST48.

Warna: Oranye=sistem, Biru=admin, Merah=error.

Detail langkah:

START → [SISTEM] Auto-Ops dijalankan (runAll) — sequential, mutex running=true:
  → Job 1: runBookingExpiry → Batalkan booking lewat 3 jam
  → Job 2: runContractEndReminders → Notif H-10,7,3,1,0
  → Job 3: runRenewalPriorityExpiry → AWAITING_DP expired
  → Job 4: runRenewalSettlementForfeit → DP_SECURED H+7 expired
  → Job 5: runDownPaymentForfeit → DP hangus (kamar di-booking, lewat checkIn+1)
  → Job 6: runOverstayForcedCheckout → H+1 pk 12 forced checkout
  → Job 7: runPostCheckoutAutoCancel → Cancel stay belum promoted
  → Job 8: runRoomReleaseAtNoon → pk 12 rilis booking expired
  → Job 9: runRoomHealer → Room RESERVED yatim pulihkan
  → Job 10: runOverstayEnforcement → Tiket EVICT_OVERSTAY
  → Job 11: runAutoExpenseDraft → Draft expense rutin
  → Job 12: runAutoDepreciation → Depresiasi bulan lalu
  → Job 13: runAccountingAutoClose → Tutup buku bulan lalu

  ── JURNAL ──
  [ORANYE] Auto Journal Lite (best-effort, kecuali DEPOSIT_SETTLEMENT):
  Untuk setiap operasi (INVOICE_ISSUED, INVOICE_PAYMENT, EXPENSE, WIFI_SALE, DEPOSIT_RECEIVED, DEPRECIATION_RUN):
    Decision: Apakah sudah ada jurnal POSTED untuk (sourceType, sourceId) yang sama?
      → YA → Skip (idempoten)
      → TIDAK → Buat jurnal balanced → post

  ── TUTUP BUKU ──
  [SISTEM] accountingReadiness.getReadiness() → cek 11 kondisi:
  1) Periode OPEN
  2) Tidak ada closing aktif
  3) Trial balance balanced
  4) COA Retained Earnings aktif
  5) Tidak ada draft journal
  6) Tidak ada posted journal unbalanced
  7) Tidak ada draft opening balance
  8) Tidak ada unmapped operational source
  9) Depresiasi sudah jalan
  dst.
  → Decision: Semua green? → YA → Tutup buku (CLOSED + retained earnings)
  → TIDAK → Skip dengan laporan

  ── LAPORAN ──
  [ADMIN] Lihat laporan:
  → P&L: Revenue (invoice PAID/ISSUED/PARTIAL, exclude DRAFT/CANCELLED) - Expense (CONFIRMED)
  → Cashflow: InvoicePayment (paymentDate) + Expense (expenseDate)
     = Cash In - Cash Out
  → Financial Ratios: occupancy, expenseRatio, currentRatio, dll
  → Owner Dashboard: businessHealth (skor 0-100), overdue, pending
  → Occupancy: kamar operable vs promote

END
```

---

#### D. REKOMENDASI PERBAIKAN

##### 🔴 KRITIS — Harus diperbaiki segera

| # | Rekomendasi | File Terkait | Dampak |
|---|------------|-------------|--------|
| R1 | **Jadikan Auto Journal Lite BLOCKING, bukan best-effort** untuk semua sumber operasional. Saat ini hanya DEPOSIT_SETTLEMENT yang blocking. Jika jurnal gagal, approval tetap jalan dan data keuangan tidak balance dengan operasional. | `accounting-posting.service.ts`, semua pemanggil `post*NoTx` | Laporan keuangan tidak akurat jika best-effort gagal |
| R2 | **Tambahkan mekanisme backfill/reconciliation** yang rutin membandingkan data operasional (invoice payments, expenses) dengan jurnal yang sudah diposting, lalu membuat jurnal yang hilang. | `accounting-posting.service.ts` `backfillAutoJournal` sudah ada tapi perlu otomatisasi | Jurnal hilang tidak pernah terisi |

##### 🟠 TINGGI — Perlu diperbaiki

| # | Rekomendasi | File Terkait | Dampak |
|---|------------|-------------|--------|
| R3 | **Hapus `catch` di `isBookingSchemaDriftError`** — error seharusnya tidak di-swallow | `tenant-bookings.service.ts:222` | Race condition bisa membuat booking tanpa lock |
| R4 | **Tambah balanceSheet method** di `reports.service.ts` — saat ini tidak ada balance sheet, hanya balanceSheetDraft di finance.service yang kurang lengkap | `reports.service.ts` | Owner tidak bisa lihat neraca formal |
| R5 | **Jadikan deposit ledger BLOCKING (bukan best-effort)** — saat ini deposit diterima di booking path tapi ledger bisa gagal | `payment-submissions.service.ts:483` | Deposit tidak tercatat di ledger |

##### 🟡 MENENGAH

| # | Rekomendasi | File Terkait |
|---|------------|-------------|
| R6 | Tambah guard untuk mencegah create invoice pada stay yang sudah COMPLETED | `invoices.service.ts:289-290` |
| R7 | Auto-close sebaiknya memiliki warning terlebih dahulu ke admin via notifikasi | `accounting-period-close.service.ts` |

---

#### E. RINGKASAN RISIKO

| Area | Risiko | Severitas |
|------|--------|-----------|
| **Uang masuk (payment)** | Auto Journal best-effort → laporan keuangan bisa tidak balance dengan realita | 🔴 KRITIS |
| **Invoice lifecycle** | Jurnal ISSUED dan reversal best-effort → invoice bisa tidak tercatat di akuntansi | 🔴 KRITIS |
| **Deposit** | Deposit ledger best-effort saat diterima (resiko pincang), tapi settlement blocking ✅ | 🟠 TINGGI |
| **Renewal** | ✅ Aman — state machine penuh, guard deadline, sweeper hibrida | ✅ |
| **Checkout** | ✅ Aman — guard invoice, auto-ticket inspeksi, settlement blocking | ✅ |
| **Auto-Ops** | ✅ Aman — sequential dengan mutex, idempoten | ✅ |
| **Laporan** | Balance Sheet tidak ada, sisanya ✅ exclude DRAFT/CANCELLED | 🟡 MENENGAH |
| **Unit Test** | 26/26 hijau ✅ | ✅ |

---

#### F. KESIMPULAN

Realita kode saat ini **SUDAH SESUAI** dengan aturan bisnis owner untuk:

1. ✅ **DP = 30%** dari sewa, perhitungan konsisten di booking dan renewal
2. ✅ **Expiry = 3 jam** flat di semua helper booking
3. ✅ **Partial payment diblokir** — dua-nominal gate (DP tepat / lunas penuh)
4. ✅ **Remove payment diblokir** saat OCCUPIED
5. ✅ **Renewal state machine** — 7 status, invoice DP terpisah, deadline H+7, sweeper
6. ✅ **Checkout guard** — invoice belum lunas = block, deposit settlement blocking
7. ✅ **Auto-Ops** — 13 job sequential dengan mutex, idempoten
8. ✅ **Unit test** 26/26 hijau

**KEKURANGAN UTAMA:** Auto Journal Lite yang **best-effort** di 5 dari 8 sumber jurnal. Ini adalah **satu-satunya risiko kritis** yang bisa membuat laporan keuangan tidak balance dengan data operasional. Jika Anda menginginkan laporan keuangan 100% kredibel, semua jurnal harus blocking (seperti DEPOSIT_SETTLEMENT yang sudah benar).

---
*Laporan ini dibuat berdasarkan audit kode langsung pada backend commit `0a83dbd` (2026-06-14).*
