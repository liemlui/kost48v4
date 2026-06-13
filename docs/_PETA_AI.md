# _PETA_AI — Router Dokumen Root `/docs` (hemat token + trace ke real file)
**Versi:** 2026-06-13 (disinkronkan setelah normalisasi docs). **Fungsi:** router dokumen dan anchor kode terverifikasi untuk mengurangi pembacaan yang tidak perlu.

## 0. Cara pakai (AI eksekutor)
- Mulai dari `00_BLUEPRINT.md` (orientasi) → buka HANYA file yang kolom **"Baca saat"**-nya cocok. Dossier 10-19 MANDIRI (tak perlu baca silang).
- Untuk `file:baris`: pakai **§2 (terverifikasi)** atau anchor di **dossier 10-19**. ⚠️ **JANGAN pakai baris di `02_FLOW_MAP.md` — BASI** (lihat §3-D1).
- Task ID resmi = **`08_CHECKLIST.md` + `00_BLUEPRINT.md §4`**. Bila dossier menyebut ID berbeda → ikut `08_CHECKLIST` (lihat §3-D4).
- **Mau eksekusi otonom (YOLO)?** Lihat **§4** — set file minimum + apa yang boleh jalan tanpa tanya vs hard-STOP.

## 1. Router 22 file root
| File | KB | Baca saat | Akurasi anchor |
|---|---|---|---|
| `00_BLUEPRINT.md` | 9 | **SELALU dulu** — orientasi, indeks dossier, peta fase §4, invarian | 🟢 ref dossier benar (10-19) |
| `01_GROUND_STATE.md` | 10 | Butuh fakta terverifikasi (stack, 41 model, route, limitasi) | 🟢 model dan ref dossier sudah disinkronkan |
| `02_FLOW_MAP.md` | 31 | Narasi alur lintas-domain (apa→apa), bukan untuk angka baris | 🔴 **baris BASI** di file besar (§3-D1) |
| `03_KEPUTUSAN_OWNER.md` | 6 | **Sebelum ubah flow** — 84 keputusan, SUMBER KEBENARAN | 🟢 |
| `04_DEPLOY_AND_PWA.md` | 8 | Deploy fresh + 17 temuan PWA (Phase 0-3) | 🟢 |
| `05_VERIFIKASI_KEUANGAN.md` | 8 | **WAJIB tiap task uang** — invarian, unit test, DO-NOT-TOUCH | 🟢 anchor akuntansi benar |
| `06_CONTRACTS.md` | 17 | Matriks role + aturan bisnis distilled (tanpa baris) | 🟢 by-design tanpa anchor baris |
| `07_PLAN.md` | 10 | Rencana fase produksi (Fase 1-4) | 🟢 |
| `08_CHECKLIST.md` | 12 | **Daftar task BERURUTAN + protokol eksekutor** | 🟢 sumber ID task resmi |
| `09_TRACEABILITY.md` | 2 | Mapping audit V1/V3 → dossier (anti-temuan-hilang) | 🟢 |
| `10_PEMBAYARAN_INVOICE.md` | 6 | Bayar/approve/invoice/meter (F1-1R, F1-2) | 🟢 terverifikasi |
| `11_BOOKING_RENEWAL.md` | 7 | Booking + renewal (F1-10/11, F2-1 + desain §5) | 🟢 terverifikasi |
| `12_CHECKOUT_DEPOSIT_OVERSTAY.md` | 7 | Checkout/deposit/overstay/kabur (F2-6, F3-13/14/15/16) | 🟢 terverifikasi |
| `13_AKUNTANSI_LAPORAN.md` | 6 | Jurnal/laporan (F1-3..9) | 🟢 nama file inti sudah benar |
| `14_INVENTARIS.md` | 5 | Stok/movement/room-item (F2-5 ghost-stock) | 🟢 |
| `15_STAF_TIKET_KPI.md` | 4 | Tiket/KPI/review (F2-9, F3-19/20) | 🟢 ID task sudah mengikuti CHECKLIST |
| `16_NOTIFIKASI_PENGUMUMAN.md` | 4 | Notif/pengumuman/push (F2-2/3/17, F3-1/2) | 🟢 |
| `17_PUBLIK_MARKETING_UIUX.md` | 6 | Katalog/SEO/UI/chart (F2-11, F3-3/4/7/11/12) | 🟢 |
| `18_AUTH_FONDASI_ONBOARDING.md` | 5 | Auth/role/KTP (F2-16, F3-17) | 🟢 |
| `19_GAMIFIKASI_LOYALITAS.md` | 3 | Poin/reward tenant (F4-9, desain) | 🟢 belum ada kode (fitur baru) |
| `CHANGELOG.md` | 31 | Riwayat rilis (prepend-only) | 🟢 |
| `_PETA_AI.md` | — | **File ini** — router + anchor terverifikasi | 🟢 |

## 2. Anchor real-file TERVERIFIKASI (2026-06-13, cek vs kode — GANTI baris basi di FLOW_MAP)
Path relatif `backend/src/`. Angka = baris deklarasi `async`/method.
- **payment-submissions/payment-submissions.service.ts** (1564 baris): createSubmission:52 · approveSubmission:353 · cancelCompetingUnpaidBookingsTx:736 · rejectSubmission:909 · expireBooking:959 · runExpiryCheck:1096
- **stays/stays.service.ts** (1174): create:113 · complete:526 · cancel:675 · processDeposit:812 · renewStayInTransaction:997
- **auto-ops/auto-ops.service.ts** (1031): runAll:88 · runBookingExpiry:136 · runRoomReleaseAtNoon:164 · runRoomHealer:868
- **tickets/tickets.service.ts**: assign:405 · start:437 · markDone:493 · close:530
- **invoices/invoices.service.ts** (535): create:269 · createWithLinesAndIssue:281 · recalculateInvoiceTotal:423 · issue:444 · cancel:480
- **invoice-payments/invoice-payments.service.ts** (283): create:113 · update:189 · remove:237
- **tenant-bookings/tenant-bookings.service.ts**: createBooking:56 · approveBooking:247 · rejectBooking:506 · cancelPendingBooking:677
- **checkout-requests/checkout-requests.service.ts**: createRequest:47 · approveRequest:128 · rejectRequest:201
- **renew-requests/renew-requests.service.ts**: createRequest:21 · approveRequest:77 · rejectRequest:147
- **accounting/accounting-posting.service.ts** (38KB): postBalancedJournalTx:1110 (DO-NOT-TOUCH) · postPaymentReversalTx:741 (DEAD CODE)
- **accounting/accounting-reports.service.ts** (1148 baris — nama JAMAK "reports"): trialBalance:27 · profitLoss:227 · balanceSheet:347 · cashflow:731 · financialRatios:917 · blok saldo-kas E-4 :838-844 (DO-NOT-TOUCH)
- **marketing/marketing-public-rooms.service.ts** (303) · **notifications/app-notification.service.ts** (103)

## 3. Status Normalisasi 2026-06-13
- **D1 · DIMITIGASI:** angka baris di `02_FLOW_MAP.md` bukan anchor kanonik. Gunakan nama simbol atau anchor §2 file ini.
- **D2 · SELESAI:** nama `accounting-reports.service.ts` sudah dikoreksi.
- **D3 · SELESAI:** dossier root kini benar-benar bernama `10`-`19`; Ground State sudah menunjuk nomor baru.
- **D4 · SELESAI:** ID task staf mengikuti CHECKLIST: KPI `F2-9`, SLA `F3-19`, prompt review `F3-20`.

> Saat konflik aturan bisnis: `03_KEPUTUSAN_OWNER` menang. Saat memeriksa perilaku yang sudah berjalan: kode menang. Untuk ID dan urutan task: `08_CHECKLIST` menang.

## 4. EKSEKUSI OTONOM (YOLO) — file yang dipakai AI untuk jalan sendiri
Owner sudah menyatakan semua jelas di dokumen → eksekutor BOLEH jalan tanpa minta persetujuan, KECUALI hard-gate di bawah.
**Set file minimum (baca berurutan; sisanya on-demand):**
1. `00_BLUEPRINT.md` — orientasi + peta fase (§4).
2. `08_CHECKLIST.md` — ambil task teratas yang belum dicentang; **1 task = 1 commit**; ikuti "Protokol AI Eksekutor".
3. Dossier domain yang ditunjuk task (`10`-`19`) — spec lengkap: aturan + lokasi + cara fix + UAT.
4. `_PETA_AI.md §2` — anchor `file:baris` terverifikasi → langsung lompat ke kode.
5. Task uang (dossier 10/12/13) → **WAJIB** lewati `05_VERIFIKASI_KEUANGAN.md` sebelum commit.
Referensi bila ragu: `03_KEPUTUSAN_OWNER` (aturan), `06_CONTRACTS` (role/kontrak), `02_FLOW_MAP` (narasi alur).

**✅ BOLEH YOLO tanpa tanya:** task TANPA marker schema/owner → ubah kode, gate `tsc --noEmit`=0 / `npm run build` + harness finance hijau, commit Bahasa Indonesia, centang `08_CHECKLIST`, prepend `CHANGELOG`.

**⛔ TETAP STOP & lapor owner (hard-gate dari dokumen):**
- Task ber-marker **🧬 / [SCHEMA]** (ubah `schema.prisma`/`sql/`): F2-1, F2-3b, F2-18, F3-14/15/17, F4-1/8/9, dll.
- Langkah **🧑 / [OWNER]**: DEPLOY BERSIH (F1-9), drop/reset DB.
- `git push` (owner yang push) · `npm install` dependensi baru · file sedang di-M AI lain (cek `git status` dulu) · posisi baris bergeser jauh / error setelah 2× coba.
**Selain itu: jalan terus tanpa konfirmasi.**
