# ⚡ PROMPT MASTER V2 — FABLE 5: AUDIT FORENSIK + MASTERPLAN KOST48

**Untuk:** Fable 5 — model terkuat Anthropic · **Dari:** Owner KOST48 Surabaya
**Tanggal:** 2026-06-12 · **Mode:** PLAN + AUDIT (read-only source) · **Quota:** FULL token harian
**Konsekuensi:** Outputmu menjadi blueprint 6 bulan ke depan. Satu rupiah salah = laporan keuangan error. Satu flow terlewat = bug produksi. **Kami hitung token — jangan hemat.**

---

## 📌 0. KONSEP DASAR — KAMU BUKAN KODER BIASA

Kamu adalah **AI auditor forensik** yang membaca kode seperti investigasi:
- Setiap `payment-submissions.service.ts` → apakah ada penggelapan?
- Setiap `inventory-movements.service.ts` → apakah ada ghost stock?
- Setiap `balanceSheetDraft` → apakah angka ini bisa dipertanggungjawabkan secara PSAK?

Kamu juga **design strategist**: buat action plan yang AI lemah bisa jalan tanpa mikir. Dan **UI/UX architect**: evaluasi dengan Nielsen Heuristics, Fitts's Law, Gestalt.

Gunakan **SEMUA teori dan tools di §10** sebagai checklist mental — jangan baca sekali lalu lupa. Tiap kali melihat file, tanya: "Teori mana yang relevan? Apa yang akan dikatakan Porter? Apa kata Maslow? Bagaimana menurut PSAK?"

---

## 📋 1. IDENTITAS & STATUS PROYEK

### 1.1 Siapa Kamu
**Fable 5.** Kemampuanmu: arsitektur enterprise, audit keuangan PSAK/IFRS, perencanaan strategis McKinsey-level, UI/UX Nielsen-level, operation excellence Six Sigma. Kamu TIDAK menulis kode — kamu MEMBACA, MENGANALISIS, MEMETAKAN, dan MENULIS DOKUMEN PERENCANAAN. Kamu adalah otak strategis, bukan tangan eksekusi.

### 1.2 Sistem
**KOST48 Surabaya** — kost eksklusif pria, 48 kamar (33 reguler, 10 eksklusif, 5 VIP), Ngagel Jaya Utara.

| Layer | Stack |
|---|---|
| Backend | NestJS + TypeScript + Prisma + PostgreSQL (di `backend/`) |
| Frontend | React 18 + Vite 5 + React-Bootstrap + **TanStack Query + Recharts** (di `frontend/`) |
| Auth | JWT Bearer, 24 jam, tanpa refresh. Role: OWNER/ADMIN/STAFF/TENANT |
| Security | Header manual, rate limit (global 300/mnt, auth 10/15/mnt), APP_GUARD global default-deny |
| PWA | Service worker v2, manifest, offline.html — **AI lain sedang kerjakan** |
| Notifikasi | In-app → rencana PWA push |
| Akuntansi | Auto Journal Lite (jurnal idempotent per sourceType+sourceId) |
| Auto-Ops | 9 sequential job (bookingExpiry → accountingAutoClose) |
| Charts | Recharts untuk dashboard finance |

### 1.3 Commit Terakhir
```
0535036 (HEAD -> main, origin/main) docs: prompt master untuk Fable 5 - audit total 9 domain
dc7239c docs: tambah next work V513 - 8 task untuk AI eksekutor
6c96a30 docs: update ground state dengan commit hash docs terakhir
45237ba docs: simplifikasi & update flow map V2 + 6 flow baru + arsip fix-instruksi
3e7890c feat: siap produksi - eskalasi E-1..E-5/E-9 + 5 skenario residual PASS
```

### 1.4 Status — APA YANG SUDAH DIBUAT
| Item | Status | Evidence |
|---|---|---|
| 42 temuan audit MEGA | ✅ Selesai | `docs/03_AUDIT_MEGA_2026-06.md` |
| 24 FIX dieksekusi | ✅ Verifikasi pass | CHANGELOG commit e4a8c31..f9d10ac |
| UAT overstay lifecycle | ✅ PASS penuh | CHANGELOG 2026-06-12 malam |
| UAT renew + P&L cross-check | ✅ PASS, selisih by design | 100rb penalty non-invoice |
| UAT DP→pelunasan | ✅ PASS | M-09, M-12, M-07 verified |
| Rekonsiliasi deposit | ✅ mismatch=0 | 21 stay, reconciliation-lite |
| Trial balance | ✅ seimbang | 104.494.250 debit = kredit |
| E-2 backfill (promotedAt) | ✅ DONE di UAT | 11 stay manual di-promote |
| PWA hardening Phase 0-1 | 🟡 Sedang dikerjakan AI lain | 30+ file M di git |
| **Audit Keuangan penuh** | ❌ BELUM | **TUGAS UTAMAMU** |
| **Audit Inventaris** | ❌ BELUM | |
| **Audit Marketing & Landing** | ❌ BELUM | |
| **Audit KPI & Motivasi** | ❌ BELUM | |
| **Master Action Plan** | ❌ BELUM | |

---

## 📖 2. FILE YANG HARUS DIBACA (12 docs — 18 menit)

Baca BERURUTAN. Jangan skip.

| Urut | File | Isi | Waktu |
|---|---|---|---|
| 1 | `CLAUDE.md` | Panduan sesi root | 1 menit |
| 2 | `docs/00_GROUND_STATE.md` | Ringkasan sistem | 2 menit |
| 3 | `docs/01_FLOW_MAP.md` | **PETA UTAMA** — 17 flow, 387 baris | 8 menit |
| 4 | `docs/02_FOCUS_PLAN.md` | Matriks fokus, keputusan D1-D4 | 3 menit |
| 5 | `docs/03_AUDIT_MEGA_2026-06.md` | 42 temuan + 9 batch verifikasi | 5 menit |
| 6 | `docs/05_UIUX_AUDIT_2026-06-12.md` | 4 MAJOR, 6 MINOR, 8 Quick Wins | 3 menit |
| 7 | `docs/06_DEPLOY_RUNBOOK.md` | Deploy prosedur | 3 menit |
| 8 | `docs/07_NEXT_WORK_INSTRUCTIONS.md` | W-01..W-07 | 3 menit |
| 9 | `docs/08_PWA_AUDIT_AND_HARDENING_PLAN_2026-06-12.md` | PWA audit + 4 phase | 5 menit |
| 10 | `docs/09_NEXT_WORK_V513.md` | 8 task untuk AI eksekutor | 3 menit |
| 11 | `docs/CHANGELOG.md` | Riwayat V5.11+ | 3 menit |
| 12 | `docs/CHECKLIST.md` | Checklist aktif | 1 menit |

**Total: ~40 menit dengan analisis simultan.**

---

## 🔬 3. SCOPE AUDIT — 10 DOMAIN INTI

### 🅰️ DOMAIN 1 — FLOW BISNIS (Verifikasi docs vs kode)

| Flow | File Utama | Check |
|---|---|---|
| Auth & Identitas | `auth.service.ts`, `modules/users/`, `tenants/` | [ ] |
| Booking Publik | `public-bookings.service.ts`, `marketing-public-rooms.service.ts` | [ ] |
| Booking Portal | `tenant-bookings.service.ts:56` `createBooking` | [ ] |
| Pembayaran (JANTUNG) | `payment-submissions.service.ts` (1.346 baris) | [ ] |
| Invoice Manual | `invoices.service.ts`, `invoice-payments.service.ts` | [ ] |
| Renew | `renew-requests.service.ts`, `stays.service.ts:934` | [ ] |
| Checkout & Deposit | `checkout-requests.service.ts`, `stays.service.ts:480`, `deposit-ledger/` | [ ] |
| Auto-Ops 9 job | `auto-ops/auto-ops.service.ts` | [ ] |
| Tiket & Staff | `tickets.service.ts`, `staff-routines/`, `staff-field-reports/` | [ ] |
| Inventaris | `inventory-items/`, `inventory-movements/`, `room-items/` | [ ] |
| Keuangan Ops | `expenses/`, `wifi-sales/`, `assets/` | [ ] |
| Akuntansi | `accounting/` — semua file | [ ] |
| Laporan & Dashboard | `reports/`, `finance/`, `analytics/` | [ ] |

**Output:** Tabel 13 baris × kolom: `Flow` | `Docs Match?` | `Kode Match?` | `GAP?` | `Severity`.

### 🅱️ DOMAIN 2 — ATURAN OWNER (Compliance Checklist)

| Aturan | Sumber | Kode Match? |
|---|---|---|
| DP 30% × pricingTerm | G4=B | [ ] |
| DP non-refundable, hangus 100% | G2=A | [ ] |
| DP tidak pindah rebooking | G3=A | [ ] |
| Room release pk 12:00 | G5=A | [ ] |
| Forced checkout sistem + tiket | G1=B | [ ] |
| Tanpa denda keterlambatan | D1 | [ ] |
| Notifikasi in-app → PWA push | D2 | [ ] |
| TIDAK partial payment | GAP #1 | [ ] |
| Renewal DP 30% aman setelah lunas | GAP #2 | [ ] |
| Admin jangan hapus payment OCCUPIED | GAP #3 | [ ] |
| Refund DP manual via admin | GAP #4 | [ ] |

**Output:** Tabel 11 baris: `Aturan` → `Status` (✅/🟡/❌) → `Evidence` (file:line) → `Perbaikan`.

### 🅲️ DOMAIN 3 — FITUR TAMBAHAN

| Fitur | File | Aktif? | Issues? |
|---|---|---|---|
| FAQ publik | `faqs.controller.ts` | [ ] | [ ] |
| Pengumuman | `announcements/` | [ ] | [ ] |
| Staff Field Reports | `staff-field-reports.service.ts` | [ ] | [ ] |
| Tenant → Staff Review | `tenant-staff-reviews.service.ts` | [ ] | [ ] |
| Staff Performance | `staff-performance.service.ts` | [ ] | [ ] |
| WiFi Sales | `wifi-sales.service.ts` | [ ] | [ ] |
| Aset & Depresiasi | `assets/` | [ ] | [ ] |
| AI Helper | `ai/ai.controller.ts` | [ ] | [ ] |
| PWA | `sw.js`, `offline.html` | 🟡 AI lain | [ ] |

**Output:** Tabel 9 baris.

### 🅳️ DOMAIN 4 — FINANCE FORENSIK (DOMINAN — 60% WAKTU)

**Ini adalah inti tugasmu. Habiskan 5-6 jam di sini.**

#### 4.1 — Chart of Accounts (PSAK/GAAP Compliance)
Cari `accounting.service.ts:52` `seedDefaultCoa`. Daftar semua COA yang di-seed.

**Checklist PSAK compliance:**
| Account Type | Wajib Ada? | Ada? | CoA Code |
|---|---|---|---|
| Kas (Cash) | ✅ | [ ] | |
| Piutang Usaha (Accounts Receivable) | ✅ | [ ] | |
| Persediaan (Inventory) | ✅ | [ ] | |
| Aset Tetap (Fixed Assets) | ✅ | [ ] | |
| Akumulasi Depresiasi | ✅ | [ ] | |
| Utang Usaha (Accounts Payable) | ✅ | [ ] | |
| Utang Deposit Tenant | ✅ | [ ] | |
| Modal (Owner's Equity) | ✅ | [ ] | |
| Laba Ditahan (Retained Earnings) | ✅ | [ ] | |
| Pendapatan Sewa | ✅ | [ ] | |
| Pendapatan Utilitas | ✅ | [ ] | |
| Pendapatan Penalti/Forfeit | ✅ | [ ] | |
| Beban Gaji | ✅ | [ ] | |
| Beban Listrik & Air | ✅ | [ ] | |
| Beban Maintenance | ✅ | [ ] | |
| Beban Depresiasi | ✅ | [ ] | |
| Beban Lain-lain | ✅ | [ ] | |

#### 4.2 — Auto Journal Lite Forensik
Baca `accounting-posting.service.ts`. Untuk SETIAP fungsi posting, verifikasi:

A. `postInvoiceIssuedTx` / `postInvoicePaymentTx`
```
Debit:  Piutang Usaha (AR)
Credit: Pendapatan Sewa (Revenue)
```
- Apakah debit = kredit? (Balance check)
- Apakah idempotent per (sourceType=INVOICE, sourceId=invoiceId)? (Cek `postBalancedJournalTx`)
- Apakah skip jika status = VOID? (clean up)
- **FOrensik:** Bisakah double-posting terjadi? Cek unique key di DB.

B. `postDepositReceivedForStayTx`
```
Debit:  Kas
Credit: Utang Deposit Tenant (Liability)
```
- Apakah deposit tercatat sebagai liabilitas, BUKAN pendapatan? (PSAK compliance)
- Jika ini salah → Balance Sheet salah → Laporan keuangan owner salah total.

C. `postDepositSettlementTx`
```
Full Refund: Debit Utang Deposit, Kredit Kas
Forfeit:     Debit Utang Deposit, Kredit Pendapatan Penalti
Partial:     Debit Utang Deposit (full), Kredit Kas, Kredit Pendapatan Penalti
```
- Apakah settlement mengurangi liability? Apakah forfeit masuk ke revenue?
- **Forensik:** Apakah ada skenario deposit settlement tanpa jurnal? (Asimetri best-effort vs blocking)

D. `postDownPaymentForfeitTx`
```
Debit:  Piutang Usaha (AR)
Credit: Pendapatan Penalti
```
- Apakah hanya diposting jika ada jurnal DP sebelumnya? (Anti piutang fiktif)
- **Forensik:** Apakah DP forfeit yang tidak terjurnal bisa lolos?

E. `postExpenseTx`
```
Debit:  Beban ××
Credit: Kas
```

F. `postWifiSaleTx`
```
Debit:  Kas
Credit: Pendapatan WiFi
```

G. `postFixedAssetLedgerAlignmentTx` — apa alignment-nya?

H. `postDepreciationRunTx` — apakah depresiasi mengurangi nilai aset + catat beban?

#### 4.3 — Balance Sheet Verification
Baca `finance.service.ts:234` `balanceSheetDraft`.

Hitung manual:
```
ASET = Kas(akhir) + Piutang(belum dibayar) + Aset Tetap(nilai buku) + Persediaan
KEWAJIBAN = Utang Deposit(HELD) + Utang Usaha
EKUITAS = Modal + Laba Ditahan + Laba Berjalan

CEK: ASET = KEWAJIBAN + EKUITAS ?
```

Jika tidak balance → **BLOCKING ISSUE** → catat sebagai P0.

#### 4.4 — Profit & Loss Verification
Baca `reports.service.ts` cari `profit-loss` queries.

Hitung manual:
```
PENDAPATAN = Sewa + Listrik + Air + Penalti + WiFi
BEBAN = Gaji + Listrik + Air + Maintenance + Depresiasi
LABA_BERSIH = PENDAPATAN - BEBAN

CEK: apakah trial balance menunjukkan angka yang sama?
```

Cross-check dengan `GET /api/accounting/trial-balance` logic di `accounting.service.ts`.

#### 4.5 — Cashflow Verification
Baca `reports.service.ts` cari `cash-flow`.

```
SALDO_AKHIR = SALDO_AWAL + PENERIMAAN - PENGELUARAN
PENERIMAAN: InvoicePayment + DepositReceived + WiFiSales
PENGELUARAN: DepositRefund + Expenses + Gaji
```

#### 4.6 — Financial Ratios (Rasio Keuangan)
Baca `reports.service.ts` cari `financial-ratios`. Verifikasi:

| Rasio | Rumus | Hitung Manual | Report Says | Match? |
|---|---|---|---|---|
| Current Ratio | Aset Lancar / Kewajiban Lancar | | | [ ] |
| Net Profit Margin | Laba Bersih / Pendapatan | | | [ ] |
| Debt to Equity | Total Kewajiban / Ekuitas | | | [ ] |
| OER | Beban Ops / Pendapatan | | | [ ] |
| Occupancy Rate | Kamar Terisi / 48 | | | [ ] |
| RevPAR | Pendapatan Sewa / 48 kamar | | | [ ] |

#### 4.7 — Reporting & Dashboard Owner
Baca `finance.service.ts`:
- `businessHealth`:40 — apa indikatornya? Apakah weighted? Apakah fair?
- `occupancySummary`:179 — apakah exclude RESERVED? (fix P2-26 sudah?)
- `ownerDashboard`:280 — apakah owner bisa lihat: laba rugi, occupancy, cashflow, rasio dalam 1 halaman?

#### 4.8 — Advanced Finance Analysis (WAJIB)

| Analisis | Rumus | Kamu Hitung |
|---|---|---|
| **Break-Even Occupancy** | Total Beban Tetap / (Rata-rata Sewa per Kamar) | Berapa kamar minimal harus terisi? |
| **Unit Economics per Room** | Revenue - Direct Cost - Cleaning - Utilities = Margin | Kamar mana paling menguntungkan? Reguler vs Eksklusif vs VIP? |
| **DCF / NPV** | Σ(CF_t / (1+r)^t) - Initial Investment | Apakah renovasi layak? |
| **Sensitivity Analysis** | -10% occupancy → how bad? -20%? Monte Carlo? | Worst case scenario |
| **DuPont ROE** | Net Profit Margin × Asset Turnover × Equity Multiplier | ROE breakdown |
| **Altman Z-Score** | 1.2A + 1.4B + 3.3C + 0.6D + 1.0E | Prediksi kebangkrutan |
| **Liquidity Stress Test** | 50% tenant stop bayar → berapa bulan survive? | Cash runway |

#### 4.9 — PSak / GAAP Compliance Assessment
Dari hasil 4.1-4.8, buat statement:
- ✅ Laporan keuangan KOST48 **compliant** / **non-compliant** dengan PSAK/GAAP
- Jika non-compliant, apa yang harus diubah?

---

### 🅴️ DOMAIN 5 — INVENTARIS DEEP AUDIT

| File | Fungsi | Audit |
|---|---|---|
| `inventory-items.service.ts` | Master barang gudang | CRUD + opening stock sync |
| `inventory-movements.service.ts` | Pergerakan stok IN/OUT | Lock qty + validasi |
| `room-items.service.ts` | Barang per kamar | Update kondisi + auto-ticket |
| `staff-field-reports.service.ts` | Laporan lapangan | Review admin → sync |
| `tickets.service.ts` | Ticket close → barang final | Gate kamar |

**Forensik:**
- **Double-apply risk:** Apakah satu barang bisa di-move + di-field-report + di-ticket-close secara independen → qty ganda?
- **Self-healing:** Baca `ensureOpeningStockSyncedTx` dan `ensureInventoryQtySyncedTx`. Apakah benar-benar memperbaiki? Atau hanya overwrite?
- **Audit trail:** Apakah setiap perubahan kondisi barang punya timestamp + actor + reason?

**Tools:** inventory turnover ratio, EOQ, dead stock analysis.

---

### 🅵️ DOMAIN 6 — MARKETING & LANDING PAGE

| File | Fungsi |
|---|---|
| `frontend/src/pages/public/` | Halaman publik |
| `modules/marketing/marketing-public-rooms.service.ts` | API publik |
| `_uiux_audit_2026-06-12/` | Screenshots |

**Audit dengan Marketing theory:**
1. **AIDA Model:** Apakah halaman publik Attention → Interest → Desire → Action? Cek: Headline? Foto? Harga? CTA?
2. **Value Proposition Canvas:** Gain creators? Pain relievers? Jobs-to-be-done?
3. **Jobs-to-be-Done:** Tenant "meng-hire" KOST48 untuk apa? Tempat tinggal? Status? Kenyamanan? Keamanan?
4. **Call-to-Action audit:** Apakah tombol booking visible? Contrast ratio? Fitts's Law?
5. **SEO audit:** Meta tags, canonical URL, Open Graph, JSON-LD structured data, sitemap.xml?
6. **Mobile UX:** 52 mobile screenshots di `_uiux_audit_2026-06-12/`. Evaluasi dengan Nielsen Heuristics.
7. **Conversion funnel:** Pengunjung → Lihat katalog → Detail → Booking → Bayar DP → Approve. Berapa step? Bisa dikurangi?
8. **Social proof:** Testimoni? Rating? Jumlah tenant? Foto tenant?

---

### 🅶️ DOMAIN 7 — UI/UX FORENSIK

**Gunakan 13 teori UI/UX ini:**

| Teori | Ceklist |
|---|---|
| **Nielsen 10 Heuristics** | 1. Visibility of system status · 2. Match real world · 3. User control · 4. Consistency · 5. Error prevention · 6. Recognition not recall · 7. Flexibility · 8. Aesthetic design · 9. Error recovery · 10. Help |
| **Fitts's Law** | Apakah CTA cukup besar? Jarak thumb-friendly? |
| **Hick's Law** | Berapa pilihan di tiap halaman? Bisa dikurangi? |
| **Gestalt Principles** | Proximity? Similarity? Closure? Figure-ground? |
| **Material Design 3** | Apakah design system konsisten? |
| **Atomic Design** | Atom = button, Molecule = card, Organism = page |
| **Progressive Disclosure** | Apakah informasi di-reveal bertahap? |
| **Micro-interactions** | Feedback setelah klik? Animasi? |
| **WCAG 2.2** | Warna kontras? Alt text? Keyboard navigable? |
| **Design Thinking** | Apakah ada empati buat tenant yang bingung booking? |
| **A/B Testing** | Mana yang bisa di-A/B test? CTA warna? Layout? |
| **Nudge Theory** | Apakah UI "mendorong" pembayaran tepat waktu? |
| **Loss Aversion** | Apakah DP hangus dibuat eksplisit untuk mencegah gagal bayar? |

**Output:** Tiap temuan harus di-refer ke teori. Contoh: ❌ "Button 'Booking' di katalog (heuristic #3 user control — user tidak bisa cancel setelah klik)".

---

### 🅷️ DOMAIN 8 — NOTIFIKASI, PENJADWALAN, KALENDAR, RESERVASI

#### Notifikasi — Coverage Matrix
Baca `modules/notifications/app-notification.controller.ts` dan cari semua `createNotification` di seluruh codebase.

| Event | Ada Notif? | Isi Notif | Link? | Read Status? |
|---|---|---|---|---|
| Payment submitted | [ ] | | | |
| Payment approved | [ ] | | | |
| Payment rejected | [ ] | | | |
| Booking approved | [ ] | | | |
| Booking rejected | [ ] | | | |
| Booking cancelled | [ ] | | | |
| Kalah first-paid-wins (A17) | [ ] | SUDAH | | |
| Renew approved | [ ] | | | |
| Renew rejected | [ ] | | | |
| Checkout approved | [ ] | | | |
| Checkout rejected | [ ] | | | |
| Reminder H-7 | [ ] | | | |
| Reminder H-3 | [ ] | | | |
| Reminder H-1 | [ ] | | | |
| Reminder H-day | [ ] | | | |
| Overstay enforcement (tiket EVICT) | [ ] | | | |
| Forced checkout H+1 | [ ] | | | |
| Room ready (cleaning done) | [ ] | | | |
| Ticket assigned | [ ] | | | |
| Ticket closed | [ ] | | | |
| Announcement published | [ ] | | | |
| WiFi order confirmed | [ ] | | | |

#### Auto-Ops — Reliability Audit
Baca `auto-ops/auto-ops.service.ts`. 9 job. Setiap job:

| Job | Try/Catch per Item? | Take Limit? | Timezone Aware? | Overlap Risk? |
|---|---|---|---|---|
| bookingExpiry | [ ] | 100 | [ ] | [ ] |
| roomHealer | [ ] | 100 | [ ] | [ ] |
| noonRelease | [ ] | tak terbatas | 🔴 E-6 | 🔴 vs #8 |
| downPaymentForfeit | [ ] | tak terbatas | [ ] | [ ] |
| contractEndReminders | [ ] | tak terbatas | [ ] | [ ] |
| overstayEnforcement | [ ] | tak terbatas | [ ] | [ ] |
| overstayForcedCheckout | [ ] | tak terbatas | [ ] | [ ] |
| postCheckoutAutoCancel | [ ] | tak terbatas | [ ] | 🔴 vs #3 |
| accountingAutoClose | [ ] | - | [ ] | [ ] |

#### Kalendar & Reservasi
- Apakah admin bisa lihat occupancy per tanggal? (seperti GitHub heatmap)
- Apakah tenant bisa lihat ketersediaan kamar? (calendar picker)
- Apakah ada "calendar view" untuk staff?
- **Rekomendasi:** Usul implementasi heatmap calendar dengan Recharts.

#### Queue Theory — Flow Booking
- Rata-rata waktu booking → approve → paid → promoted
- Antrian approval: berapa banyak pending payment di queue?
- **Rekomendasi:** dashboard "Queue Status" untuk admin.

---

### 🅸️ DOMAIN 9 — KPI & MOTIVASI (DENGAN TEORI PSIKOLOGIS)

#### KPI Matrix Saat Ini
Baca `staff-performance.service.ts`, `staff-routines.service.ts`, `tenant-staff-reviews.service.ts`.

| KPI | Ada? | Weight? | Display? |
|---|---|---|---|
| Jumlah tiket selesai per bulan | [ ] | [ ] | [ ] |
| Rata-rata waktu resolusi tiket | [ ] | [ ] | [ ] |
| Jumlah rutinitas selesai | [ ] | [ ] | [ ] |
| Rating dari tenant | [ ] | [ ] | [ ] |
| Jumlah field report | [ ] | [ ] | [ ] |
| Saran audit diterima | [ ] | [ ] | [ ] |

#### Gap Analysis — KPI Belum Ada
| KPI | Teori Relevan | Kenapa Penting |
|---|---|---|
| **Absensi & kehadiran** | Maslow (safety) | Staff tidak hadir = kamar tidak dibersihkan |
| **Inisiatif / proaktif** | Self-Determination (autonomy) | Staff yang lihat masalah dan fix sendiri |
| **Tenant satisfaction score** | Herzberg (hygiene) | Tenant puas → renew → no vacancy |
| **Kerjasama tim** | McClelland (affiliation) | Operasional kost butuh tim solid |
| **Learning & growth** | Goal-Setting (competence) | Staff naik skill → performa naik |

#### Teori Motivasi — Rekomendasi Implementasi

| Teori | Di Kode | Rekomendasi |
|---|---|---|
| **Maslow** | Belum | Layering reward sesuai hierarchy |
| **Herzberg** | Sebagian | Hygiene (gaji) sudah, motivator (pengakuan) belum |
| **McClelland** | Belum | Achievement badge + team score + lead role |
| **Self-Determination** | Belum | Staff pilih tugas sendiri? |
| **Goal-Setting** | Sebagian | SMART goals via staff-routines |
| **Equity** | Belum | Leaderboard transparan? |
| **Reinforcement** | Sebagian | Reward belum otomatis |
| **Expectancy Theory** | Belum | Effort → KPI → Reward jelas? |
| **Nudge** | Belum | UI dorong staff ke prioritas tertinggi |
| **Loss Aversion** | Sebagian | DP hangus untuk tenant |

#### Gamification System Design
Propose:
- **Point system:** Tiket solved = 10pt, Rutinitas = 5pt, Rating 5⭐ = 20pt, Rating ≤2⭐ = -10pt
- **Badges:** "Super Cleaner" (10 kamar bersih), "Problem Solver" (10 tiket solved), "Tenant Favorite" (5× rating 5⭐)
- **Leaderboard:** Bulanan, per-periode, all-time
- **Reward:** Top performer bulanan = bonus, featured staff of the month

---

### 🅹️ DOMAIN 10 — RECHARTS & VISUALISASI (WAJIB)

Baca `frontend/src/` untuk penggunaan Recharts.

| Chart Type | Digunakan? | Halaman | Optimal? |
|---|---|---|---|
| BarChart | [ ] | | [ ] |
| LineChart | [ ] | | [ ] |
| PieChart | [ ] | | [ ] |
| AreaChart | [ ] | | [ ] |
| ComposedChart | [ ] | | [ ] |
| RadarChart | [ ] | | [ ] |
| Treemap | [ ] | | [ ] |
| Sankey | [ ] | | [ ] |
| Waterfall | [ ] | | [ ] |
| BulletGraph | [ ] | | [ ] |
| Sparkline | [ ] | | [ ] |
| CalendarHeatmap | [ ] | | [ ] |

**Tufte's Data-Ink Ratio:** Apakah chart punya banyak "chart junk"? (3D, gridlines berlebihan, label redundant?)
**Colorbrewer:** Apakah warna chart accessible untuk color-blind?
**Performance:** Apakah chart di-lazy-load? `useMemo`? `React.memo`?

**Rekomendasi visualisasi baru (dengan Recharts):**
1. **Occupancy Heatmap Calendar** — GitHub-style, per tanggal
2. **Revenue Waterfall** — Dari pendapatan kotor ke laba bersih
3. **Cashflow Area Chart** — Saldo kas per hari
4. **KPI Bullet Graph** — Target vs aktual per staf
5. **Booking Funnel Sankey** — Visitors → Bookings → Paid → Checked In
6. **Room Profitability Treemap** — Margin per room, ukuran = profit
7. **Financial Ratios Sparklines** — Mini trend di dashboard owner

---

## 📦 4. DELIVERABLES — 11 FILE TERKOMPRESI

Buat folder `docs/fable5-audit/` dengan 11 file. **Setiap file MAX 100 baris** (kecuali action plan max 300).

```
docs/fable5-audit/
├── 00_INDEX.md                    — 1p ringkasan + link
├── 01_FLOW_VERIFIED.md            — 13 flow × status (tabel)
├── 02_RULES_COMPLIANCE.md         — 11 aturan × status (tabel)
├── 03_EXTRA_FEATURES.md           — 9 fitur × status (tabel)
├── 04_FINANCE_AUDIT.md            — COA+jurnal+BS+P&L+CF+Rasio (tabel)
├── 05_INVENTORY_AUDIT.md          — 3 file × status (tabel)
├── 06_MARKETING_LANDING.md        — 8 check × status (tabel)
├── 07_UIUX_FORENSIC.md            — 13 heuristics × temuan (tabel)
├── 08_NOTIF_SCHEDULE.md           — Coverage + job matrix (tabel)
├── 09_KPI_MOTIVATION.md           — KPI matrix + teori (tabel)
└── 10_MASTER_ACTION_PLAN.md       — WAJIB: 4 fase × task × instruksi
```

### Format WAJIB setiap file (token efficient):

```markdown
## [TOPIC] — [1-line verdict]
### FINDINGS
| # | Severity | File:Line | Issue | Theory Ref | Fix |
|---|---|---|---|---|---|
### RECOMMENDATIONS (ordered, no prose)
1. [Action] → [File] → [1 kalimat how]
### OPEN QUESTIONS
- [question]
```

**LARANGAN:**
- ❌ Tidak ada "untuk itu", "selanjutnya", "berdasarkan hal tersebut"
- ❌ Tidak ada intro paragraf yang basa-basi
- ❌ Tidak ada copy-paste kode panjang (cukup `file:line`)
- ❌ Tidak ada analisis >3 baris tanpa diubah ke tabel

---

## 🗺️ 5. FILE KUNCI: `10_MASTER_ACTION_PLAN.md` (MAX 300 BARIS)

**Ini output paling penting.** Setelah baca, AI lemah harus bisa jalan tanpa tanya lagi.

### Struktur:

```markdown
# MASTER ACTION PLAN — KOST48 V5.3
**Total:** 4 fase · N task · Estimasi N sesi AI · [Dependency graph]

## FASE 1 — KRITIS (sebelum deploy)
| # | Task | File:Line | Spesifikasi | Kriteria Selesai | Larangan | Stop Condition |
|---|---|---|---|---|---|---|
| 1 | | | | | | |

## FASE 2 — PENTING (setelah deploy)
| # | Task | File:Line | Spesifikasi | Kriteria Selesai | Larangan | Stop Condition |
|---|---|---|---|---|---|---|

## FASE 3 — OPTIMAL
| # | Task | ... | ... | ... | ... | ... |

## FASE 4 — FUTURE
| # | Task | ... | ... | ... | ... | ... |

## DEPENDENCY GRAPH
F1→F2→F3 (F1 blocking F2, F2 blocking F3)

## RISK MATRIX
| Task | Risk | Likelihood | Impact | Mitigasi |
|---|---|---|---|---|
```

### Contoh 1 task di Fase 1:
```
| 1 | Hapus partial payment | payment-submissions.service.ts:369 | Tambah guard: tolak jika total bayar < invoice + sisa deposit | Tenant dengan DP saja tidak bisa approve → error 400 | Jangan ubah `syncInvoiceStatus` atau `rejectSubmission` | File target tidak ditemukan → STOP |
```

---

## ⚡ 6. STRATEGI EKSEKUSI — 8 LANGKAH

### Langkah 1 — Baca Semua Docs (40 menit)
Baca 12 file di §2. Sembari baca, catat di mental:
- "Ini perlu di-verify di kode"
- "Ini kontradiksi dengan ..."
- "Ini gap belum dicover"

### Langkah 2 — Mapping Struktur (15 menit)
```
Get-ChildItem -Recurse -Depth 2 backend/src/modules/
Get-ChildItem -Recurse -Depth 2 frontend/src/
```
Buat peta modul di mental.

### Langkah 3 — Finance Forensik (4-5 jam)
1. `accounting/` — semua file: COA, posting, jurnal, trial balance
2. `finance/` — businessHealth, balanceSheetDraft, ownerDashboard
3. `reports/` — semua report: P&L, Cashflow, Rasio
4. Cross-check tiap angka

### Langkah 4 — Inventory Audit (1 jam)
### Langkah 5 — Marketing & UI/UX Review (1 jam)
### Langkah 6 — Notifikasi & Scheduling (45 menit)
### Langkah 7 — KPI & Motivasi (45 menit)
### Langkah 8 — Tulis 11 File Output (2-3 jam)

**Total: ~10 jam.** Gunakan semua token.

---

## 🚫 7. LARANGAN MUTLAK

1. 🚫 **JANGAN ubah kode aplikasi** — read-only untuk `backend/src/`, `frontend/src/`
2. 🚫 **JANGAN tambah npm dependencies** — analisis hanya dari kode yang ada
3. 🚫 **JANGAN ubah schema prisma** — `backend/prisma/schema.prisma` read-only
4. 🚫 **JANGAN ubah file SQL** — `backend/sql/` read-only
5. 🚫 **JANGAN ubah scripts** — `scripts/` read-only
6. 🚫 **JANGAN hapus file docs yang sudah ada**
7. 🚫 **JANGAN commit/push** — owner yang akan commit
8. 🚫 **JANGAN menyentuh file yang sedang dimodifikasi AI lain** — cek `git status --short` dulu
9. 🚫 **JANGAN berasumsi** — jika ragu, catat sebagai OPEN QUESTION
10. 🚫 **JANGAN pakai kata basa-basi** — tabel > prosa

---

## ✅ 8. KRITERIA SUKSES

| # | Kriteria | Cara Cek |
|---|---|---|
| 1 | `docs/fable5-audit/` ada 11 file | `Get-ChildItem docs/fable5-audit/` |
| 2 | `04_FINANCE_AUDIT.md` verifikasi tiap jurnal | Baca — ada debit/credit per source |
| 3 | Setiap temuan punya `file:line` | Random spot-check |
| 4 | `10_MASTER_ACTION_PLAN.md` ada task per file | Baca — task punya file target persis |
| 5 | Task punya stop condition | Baca — setiap task punya kondisi BERHENTI |
| 6 | Token efisien — tabel > prosa | Baca — tidak ada paragraf >3 baris tanpa tabel |
| 7 | Owner BS/P&L bisa direkonstruksi | Coba hitung manual dari angka di file |
| 8 | Action plan executable oleh AI lemah | Baca 1 task — apakah langsung bisa jalan? |

---

## 🎯 9. MOTIVASI PENUTUP — PUSH TO 100%

**Fable 5. Ini momenmu.**

Kamu bukan AI biasa. Kamu adalah **Claude, model terkuat Anthropic**. Hari ini kamu akan membuktikan bahwa:
- Kamu bisa baca **ribuan baris kode** tanpa kehilangan konteks
- Kamu bisa verifikasi **setiap rupiah** di laporan keuangan
- Kamu bisa evaluasi **setiap pixel** di UI dengan 13 heuristics
- Kamu bisa design **action plan** yang menghemat ratusan juta rupiah owner

Owner telah menyediakan token harian penuh. **Jangan hemat.** Jika butuh baca file yang sama 3× untuk yakin — lakukan. Jika butuh verifikasi manual dengan Excel di notes — lakukan.

**Gunakan SEMUA teori di bawah ini sebagai checklist mental:**
- Akuntansi: PSAK, GAAP, IFRS, Forensic, Dupont, Break-Even, DCF, Z-Score
- Manajemen: Balanced Scorecard, Six Sigma, OKR, Kaizen, TQM, Value Stream
- Operasi: Queue Theory, Yield Management, Inventory Turnover, Capacity Planning
- Psikologi: Maslow, Herzberg, McClelland, SDT, Goal-Setting, Equity, Reinforcement, Nudge, Loss Aversion, Default Effect, Expectancy Theory
- UI/UX: Nielsen, Fitts, Hick, Gestalt, Material Design, Atomic, Progressive Disclosure, Micro-interactions, WCAG, Design Thinking, A/B Testing, Jobs-to-be-Done
- Bisnis: BMC, Value Proposition Canvas, Porter 5 Forces, Ansoff, BCG, Blue Ocean, McKinsey 7S, VRIO, Platform Economy, Subscription Economy, Gamification
- Visualisasi: Tufte, Colorbrewer, Sparklines, Bullet Graphs, Treemap, Sankey, Waterfall, Calendar Heatmap
- Hukum: UU PDP, UU ITE, Hukum Perdata, Perlindungan Konsumen

**Ini adalah masterpiece terbesarmu.** Buat owner bangga memiliki AI sepertimu.

**START.**