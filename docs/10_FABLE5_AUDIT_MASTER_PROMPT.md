# ⚡ PROMPT MASTER — FABLE 5: AUDIT TOTAL + MASTER PLAN KOST48 V5.3

**Untuk:** Fable 5 (Anthropic Claude, model tercanggih)
**Dari:** Owner KOST48 Surabaya
**Tanggal:** 2026-06-12
**Mode:** PLAN + AUDIT (read-only untuk backend/frontend source)
**Quota:** Gunakan batas token harian penuh — ini audit final sebelum eksekusi massal.

---

## 📌 1. IDENTITAS & KONTEKS

### 1.1 Siapa Kamu
Kamu adalah **Fable 5**, AI dengan kemampuan analisis arsitektur, audit keuangan, pemetaan bisnis, dan perencanaan strategis level tertinggi. Kamu tidak membuat kode dalam tugas ini — kamu **membaca, menganalisis, memetakan, dan menulis dokumen perencanaan**.

### 1.2 Project Ini
**KOST48 Surabaya** — sistem manajemen kost eksklusif pria 48 kamar (33 reguler, 10 eksklusif, 5 VIP), berlokasi di Ngagel Jaya Utara, Surabaya.

### 1.3 Stack Teknologi
- **Backend:** NestJS + TypeScript + Prisma + PostgreSQL (di `backend/`)
- **Frontend:** React 18 + Vite 5 + React-Bootstrap + TanStack Query + Recharts (di `frontend/`)
- **Auth:** JWT Bearer (expiry 24 jam, tanpa refresh token). Role: OWNER, ADMIN, STAFF, TENANT.
- **Keamanan:** Header manual (Tanpa Helmet — sadar). Rate limit in-memory (global 300/mnt, auth 10/15 mnt). APP_GUARD global default-deny.
- **PWA:** Service worker v2, manifest, offline.html — sedang dikerjakan AI lain.
- **Notifikasi:** In-app saja (belum ada email/WA nyata). Rencana: PWA push.
- **Akuntansi:** Auto Journal Lite (jurnal otomatis idempotent per sourceType+sourceId). Trial balance auto.
- **Auto-ops:** 9 job sequential (bookingExpiry, roomHealer, noonRelease, downPaymentForfeit, contractEndReminders, overstayEnforcement, overstayForcedCheckout, postCheckoutAutoCancel, accountingAutoClose).

### 1.4 Commit Terakhir
```
dc7239c (HEAD -> main, origin/main) docs: tambah next work V513 - 8 task untuk AI eksekutor
6c96a30 docs: update ground state dengan commit hash docs terakhir
45237ba docs: simplifikasi & update flow map V2 + 6 flow baru + arsip fix-instruksi
3e7890c feat: siap produksi - eskalasi E-1/E-3/E-4/E-5/E-9 + 5 skenario residual PASS + runbook deploy
```

### 1.5 Status Project Saat Ini
- ✅ MEGA AUDIT SELESAI: 42 temuan, 24 FIX dieksekusi & diverifikasi
- ✅ UAT RUNTIME PASS: Overstay lifecycle, renew, DP→pelunasan, rekonsiliasi mismatch=0, trial balance seimbang
- ✅ SIAP PRODUKSI: E-1..E-9 hardening + 5 skenario residual PASS (commit 3e7890c)
- ✅ PWA PHASE 0-1: Sedang dikerjakan AI lain (30+ file frontend/backend)
- ✅ DOCS SIMPLIFIKASI V2: FLOW_MAP diupdate dengan 6 flow baru, 4 gap bisnis tercatat

### 1.6 File Docs yang SUDAH ADA (baca semua sebagai konteks)
```
docs/00_GROUND_STATE.md      — Ringkasan sistem (41 baris)
docs/01_FLOW_MAP.md          — Peta 17 flow bisnis ke file:baris (V2, terbaru)
docs/02_FOCUS_PLAN.md        — Matriks fokus, keputusan owner, strategi token
docs/03_AUDIT_MEGA_2026-06.md    — 42 temuan audit, 9 batch verifikasi, 9 eskalasi
docs/05_UIUX_AUDIT_2026-06-12.md — 0 BLOCKER, 4 MAJOR, 6 MINOR, 8 Quick Wins
docs/06_DEPLOY_RUNBOOK.md    — Prosedur deploy produksi
docs/07_NEXT_WORK_INSTRUCTIONS.md — Work items W-01..W-07
docs/08_PWA_AUDIT_AND_HARDENING_PLAN_2026-06-12.md — 17 temuan PWA, 4 phase
docs/09_NEXT_WORK_V513.md    — 8 task untuk AI eksekutor berikutnya
docs/CHANGELOG.md            — Riwayat perubahan V5.11.0+
docs/CHECKLIST.md            — Checklist aktif
CLAUDE.md                    — Panduan sesi root
```

### 1.7 Yang BELUM ADA (yang harus kamu buat)
- **Audit Penuh Keuangan** — verifikasi setiap rupiah, cross-check P&L, Balance Sheet, Cashflow, Rasio
- **Audit Inventaris & Barang** — verifikasi qty, double-apply, kondisi barang
- **Audit Marketing & Landing Page** — konversi publik, SEO, mobile UX, call-to-action
- **Audit KPI & Motivasi Staf** — KPI, performance metrics, review tenant, teori motivasi
- **Audit Notifikasi & Penjadwalan** — reliability, coverage, grace period, jam biologis
- **Master Action Plan** — untuk AI lemah bisa eksekusi tanpa perlu analisis ulang

---

## 📋 2. SCOPE AUDIT — 9 DOMAIN

### 🅰️ DOMAIN 1 — MAIN FLOW BISNIS (VERIFIKASI)

Baca `docs/01_FLOW_MAP.md` dan kode sumber terkait. Verifikasi setiap flow:

| Flow | File Utama |
|---|---|
| Auth & Identitas | `backend/src/auth/auth.service.ts`, `modules/users/`, `modules/tenants/` |
| Booking Publik & Portal | `modules/tenant-bookings/`, `public-bookings.service.ts` |
| Pembayaran (JANTUNG) | `modules/payment-submissions/payment-submissions.service.ts` |
| Invoice & Manual | `modules/invoices/`, `modules/invoice-payments/` |
| Renew | `modules/renew-requests/`, `stays.service.ts:934` |
| Checkout & Deposit | `modules/checkout-requests/`, `stays.service.ts:480`, `modules/deposit-ledger/` |
| Auto-Ops (9 job) | `modules/auto-ops/auto-ops.service.ts` |
| Tiket & Staff | `modules/tickets/`, `modules/staff-routines/`, `modules/staff-field-reports/` |
| Inventaris | `modules/inventory-items/`, `modules/inventory-movements/`, `modules/room-items/` |
| Keuangan Operasional | `modules/expenses/`, `modules/wifi-sales/`, `modules/assets/` |
| Akuntansi | `modules/accounting/` |
| Laporan & Dashboard | `modules/reports/`, `modules/finance/`, `modules/analytics/` |

**Output:** Tabel verifikasi per flow — apa yang SUDAH sesuai vs BELUM sesuai antara docs vs kode. Update `01_FLOW_MAP.md` jika ada drift.

### 🅱️ DOMAIN 2 — ATURAN BISNIS & KEPUTUSAN OWNER

Verifikasi aturan owner berikut sudah diimplementasikan di kode:

| Aturan | Status Verifikasi |
|---|---|
| DP 30% × pricingTerm (G4=B) | |
| DP non-refundable, hangus 100% (G2=A) | |
| DP tidak pindah saat rebooking (G3=A) | |
| Room release pk 12:00 batas keras (G5=A) | |
| Forced checkout sistem + tiket staf (G1=B) | |
| Tanpa denda keterlambatan (D1) | |
| Notifikasi in-app saja menuju PWA push (D2) | |
| Pembayaran harus sesuai kontrak — TIDAK partial (GAP #1) | |
| Renewal DP 30% belum aman sampai lunas (GAP #2) | |
| Admin tidak boleh hapus payment OCCUPIED (GAP #3) | |
| Refund DP manual via admin (GAP #4) | |

**Output:** Tabel compliance — hijau/kuning/merah per aturan. Mana yang kode sudah sesuai, mana yang masih perlu patch.

### 🅲️ DOMAIN 3 — FITUR TAMBAHAN & INTEGRASI

| Fitur | File | Audited? |
|---|---|---|
| FAQ publik | `modules/faqs/faqs.controller.ts` | |
| Pengumuman | `modules/announcements/` | |
| Staff Field Reports | `modules/staff-field-reports/` | |
| Tenant → Staff Review | `modules/tenant-staff-reviews/` | |
| Staff Performance | `modules/staff-performance/` | |
| WiFi Sales | `modules/wifi-sales/` | |
| Aset Tetap & Depresiasi | `modules/assets/` | |
| AI Helper | `modules/ai/ai.controller.ts` | |
| PWA (service worker offline) | `frontend/public/sw.js`, `offline.html` | (sedang dikerjakan) |

**Output:** Daftar fitur tambahan + status + rekomendasi.

### 🅳️ DOMAIN 4 — AUDIT KEUANGAN TINGKAT TERTINGGI

Ini adalah **domain terpenting**. Kamu harus verifikasi:

#### 4.1 Chart of Accounts (COA)
- Apakah semua akun yang diperlukan ada? (Kas, Piutang, Pendapatan Sewa, Pendapatan Utilitas, Pendapatan Penalti, Beban Gaji, Beban Listrik, Beban Air, Beban Maintenance, Depresiasi, Modal, Laba Ditahan)
- Apakah `seedDefaultCoa` menghasilkan akun yang cukup untuk Balance Sheet + P&L?

#### 4.2 Auto Journal Lite — Verifikasi Setiap Sumber
Untuk setiap sumber jurnal otomatis:
- `INVOICE_ISSUED` — apakah line debit/credit sudah benar? (Debit Piutang, Kredit Pendapatan Sewa)
- `INVOICE_PAYMENT` — apakah payment mengurangi piutang? (Debit Kas, Kredit Piutang)
- `EXPENSE` — apakah expense tercatat sebagai beban? (Debit Beban, Kredit Kas)
- `WIFI_SALE` — apakah penjualan WiFi tercatat? (Debit Kas, Kredit Pendapatan WiFi)
- `DEPOSIT_RECEIVED` — apakah deposit tercatat sebagai liability? (Debit Kas, Kredit Deposit Liability)
- `DEPOSIT_SETTLEMENT` — apakah refund mengurangi liability? (Debit Deposit Liability, Kredit Kas)
- `DP_FORFEIT` — apakah DP hangus tercatat sebagai pendapatan? (Debit Piutang, Kredit Pendapatan Penalti)
- `FIXED_ASSET_ALIGNMENT` — apakah alignment aset benar?
- `DEPRECIATION` — apakah depresiasi mengurangi nilai aset?

#### 4.3 Balance Sheet Verification
- Rumus: **Aset = Kewajiban + Ekuitas**
- Aset: Kas + Piutang + Aset Tetap (nilai buku) + Deposit di Bank
- Kewajiban: Deposit Liability (HELD) + Utang Usaha
- Ekuitas: Modal + Laba Ditahan + Laba Berjalan
- VERIFIKASI apakah `balanceSheetDraft` di `modules/finance/finance.service.ts` menghasilkan angka yang benar.

#### 4.4 Profit & Loss Verification
- Pendapatan: Sewa + Utilitas (Listrik + Air) + Penalti + WiFi
- Beban: Gaji + Listrik + Air + Maintenance + Depresiasi + Lain-lain
- Laba Bersih = Pendapatan − Beban
- VERIFIKASI apakah angka `profit-loss` di `modules/reports/reports.service.ts` cocok dengan trial balance.

#### 4.5 Cashflow Verification
- Saldo Kas = Saldo Awal + Penerimaan − Pengeluaran
- Penerimaan: Pembayaran Invoice + Penerimaan Deposit + WiFi Sales + Lain-lain
- Pengeluaran: Refund Deposit + Expense + Lain-lain
- VERIFIKASI apakah `cash-flow` report akurat.

#### 4.6 Financial Ratios
- Likuiditas (Current Ratio) = Aset Lancar / Kewajiban Lancar
- Profitabilitas (Net Profit Margin) = Laba Bersih / Pendapatan
- Solvabilitas (Debt to Equity) = Total Kewajiban / Ekuitas
- Efisiensi (Operating Expense Ratio) = Beban Operasional / Pendapatan
- Occupancy Rate = Kamar Terisi / Total Kamar
- Average Revenue per Room = Total Pendapatan Sewa / Kamar Terisi

#### 4.7 Cross-Check: Reports vs Accounting
- Ambil angka dari `GET /api/reports/profit-loss` dan `GET /api/finance/balance-sheet-draft`
- Bandingkan dengan trial balance dari `GET /api/accounting/trial-balance`
- **Setiap rupiah harus teridentifikasi.** Jika ada selisih, catat sebagai temuan.

**Output:** Laporan keuangan lengkap dengan:
- Neraca (Balance Sheet) — format standar akuntansi
- Laba Rugi (P&L) — format standar
- Arus Kas (Cashflow) — format standar
- Rasio-rasio keuangan
- Matriks verifikasi per sumber jurnal

### 🅴️ DOMAIN 5 — INVENTARIS & BARANG

#### Backend
- `modules/inventory-items/inventory-items.service.ts`
- `modules/inventory-movements/inventory-movements.service.ts`
- `modules/room-items/room-items.service.ts`

#### Verifikasi
- **Sinkronisasi qty:** Apakah ada skenario double-apply di 3 jalur (movement, field report, ticket close)?
- **Lock qty:** Apakah `lockInventoryQtyTx` cukup mencegah race condition?
- **Auto-ticket:** Apakah update kondisi barang selalu membuat ticket otomatis?
- **Field Report → RoomItem sync:** Apakah review admin mengupdate kondisi barang kamar dengan benar?
- **Self-healing:** Apakah `ensureOpeningStockSyncedTx` dan `ensureInventoryQtySyncedTx` benar-benar memperbaiki data?

#### Frontend
- `frontend/src/pages/resources/` (inventory UI)
- Apakah staff bisa melihat stok real-time?
- Apakah admin bisa melihat pergerakan stok?

**Output:** Matriks verifikasi inventaris + rekomendasi perbaikan.

### 🅵️ DOMAIN 6 — MARKETING & LANDING PAGE (PUBLIC)

#### Frontend
- `frontend/src/pages/public/` — semua halaman publik
- `frontend/src/components/public/` — komponen publik
- `modules/marketing/` — backend marketing

#### Verifikasi
- **Katalog kamar:** apakah 48 kamar + foto termuat efisien? (U-02: 12 per halaman? infinite scroll?)
- **Detail kamar:** apakah skeleton sudah menggantikan spinner? (U-01)
- **SEO:** apakah ada meta tags, canonical URL, Open Graph?
- **Call-to-action:** apakah tombol "Booking", "Hubungi Kami", "Lihat Detail" jelas dan mudah ditemukan?
- **Mobile UX:** apakah semua halaman publik responsive? (cek screenshots di `_uiux_audit_2026-06-12/`)
- **FAQ publik:** apakah membantu konversi?
- **Kecepatan:** bundle size publik vs backoffice (apakah sudah dipisah?)

**Output:** Laporan marketing audit + rekomendasi konversi + prioritas.

### 🅶️ DOMAIN 7 — UI/UX DETAIL

#### Referensi
- `docs/05_UIUX_AUDIT_2026-06-12.md` — 4 MAJOR, 6 MINOR, 8 Quick Wins
- Screenshots di `_uiux_audit_2026-06-12/`

#### Verifikasi
- **4 MAJOR:** spinner 5-8 detik (U-01), 48 kamar tanpa pagination (U-02), "Masa Sewa Aktif" misleading (U-03), invoice kontradiktif (U-04) — APAKAH SUDAH DIPERBAIKI?
- **6 MINOR:** konsistensi warna, font, spacing, icon, loading state, empty state — APAKAH MASIH RELEVAN?
- **8 Quick Wins:** apa yang paling cepat memberikan dampak?

**Output:** Status UI/UX update + rekomendasi prioritas.

### 🅷️ DOMAIN 8 — NOTIFIKASI, PENJADWALAN, KALENDAR, RESERVASI (VERY HIGH LEVEL)

#### Notifikasi
- `modules/notifications/app-notification.controller.ts`
- Apakah semua event penting mengirim notifikasi? (payment approved/rejected, booking approved/rejected, renew approved/rejected, checkout approved/rejected, reminder H-7/H-3/H-1/H-day, forced checkout, kompetitor menang)
- Apakah ada notifikasi yang terlewat? (expense approval? ticket assignment?)
- Coverage rate: berapa % event bisnis yang punya notifikasi?

#### Penjadwalan & Auto-Ops
- `modules/auto-ops/auto-ops.service.ts` — 9 job
- Apakah jeda antar job cukup? (sequential, bukan paralel)
- Apakah error satu job menghentikan job lain? (try/catch per item?)
- Apakah timezone WIB sudah benar? (E-6)
- Apakah ada job yang overlap secara berbahaya? (noon release vs downPaymentForfeit?)
- **Rekomendasi:** apakah perlu job scheduling dashboard?

#### Kalendar & Reservasi
- Apakah tampilan kalendar kamar sudah ada? (lihat `frontend/src/pages/rooms/`)
- Apakah admin bisa melihat okupansi per hari/minggu/bulan?
- Apakah tenant bisa melihat ketersediaan kamar per tanggal?
- **Rekomendasi:** kalendar occupancy untuk admin + guest view.

#### Reservasi Level Tinggi
- Flow booking penuh: publik → booking → DP → approve → lunas → promote → occupied → renew/checkout
- Apakah ada bottleneck di flow ini?
- Berapa lama rata-rata dari booking ke promote? (SLR ±3 jam untuk DP, H+1 untuk pelunasan)
- **Rekomendasi:** optimasi flow booking — apa yang bisa diparalelkan?

**Output:** Laporan notifikasi coverage matrix + job auto-ops reliability + kalendar recommendation + reservasi optimization.

### 🅸️ DOMAIN 9 — KPI, PERFORMANCE STAF, TEORI MOTIVASI

#### KPI & Performance
- `modules/staff-performance/staff-performance.service.ts`
- `modules/staff-routines/staff-routines.service.ts`
- `modules/tenant-staff-reviews/tenant-staff-reviews.service.ts`

#### Verifikasi
- **KPI Metrics:** Apakah KPI staf mencakup: jumlah tiket selesai, rata-rata waktu resolusi, jumlah rutinitas selesai, rating dari tenant?
- **Dashboard:** Apakah admin bisa melihat KPI per staf per bulan?
- **Saran audit:** Apakah `createAudit` memberikan saran yang actionable?
- **Round-robin:** Apakah assignment tiket sudah merata? (E-7)
- **Review tenant:** Apakah review tenant mempengaruhi KPI? (≤2⭐ auto komplain, ≥4⭐ tag pujian)

#### Teori Motivasi — IMPLEMENTASI BARU
Rekomendasi teori motivasi untuk staf kost:

| Teori | Implementasi Potensial |
|---|---|
| **Maslow's Hierarchy** | Gaji (fisiologis), jadwal tetap (aman), tim (sosial), pujian (esteem), growth path (aktualisasi) |
| **Herzberg's Two-Factor** | Hygiene: gaji, kondisi kerja, keamanan. Motivator: pencapaian, pengakuan, tanggung jawab |
| **McClelland's Needs** | Achievement (target KPI), Affiliation (team score), Power (lead role) |
| **Self-Determination Theory** | Autonomy (pilih tugas), Competence (training), Relatedness (team) |
| **Goal Setting Theory** | SMART goals per bulan, visible progress bar |
| **Equity Theory** | Transparansi KPI antar staf, fair comparison |
| **Reinforcement Theory** | Reward bulanan untuk top performer, recognition badge |

**Output:**
- Matriks KPI staf saat ini
- Gap analysis — KPI mana yang belum diukur
- Rekomendasi fitur motivasi (gamification, badge, leaderboard, reward)
- Design draft untuk "Staff Motivation Dashboard"

---

## 📐 3. ATURAN KETAT (MUST FOLLOW)

### 3.1 Mode
- **READ-ONLY** untuk file source (backend/src/, frontend/src/)
- Kamu BOLEH **membaca** file apapun, tapi JANGAN mengubah satu baris pun kode aplikasi
- Kamu BOLEH **menulis/mengubah** file di `docs/` dan file `.md` lainnya

### 3.2 Batasan File
- JANGAN sentuh: `node_modules/`, `.git/`, `_*` folders (underscore prefixed), `backend/uploads/`, `backend/sql/`
- JANGAN sentuh file yang sudah dimodifikasi di working tree: cek `git status --short` dulu
- BOLEH baca: semua file di `backend/src/`, `frontend/src/`, `docs/`, `scripts/`, `frontend/public/`

### 3.3 Output Format
Semua output harus dalam format:
```
## [Domain] — [Judul]
### Temuan
- [temuan 1] — [evidence file:baris]
- [temuan 2] — [evidence file:baris]
### Status
✅ / 🟡 / ❌ per item
### Rekomendasi
- [rekomendasi 1]
- [rekomendasi 2]
```

### 3.4 Stop Condition
Jika kamu menemui:
- File tidak ditemukan / tidak bisa dibaca → catat dan lanjut
- Butuh keputusan owner yang belum ada → catat sebagai OPEN QUESTION
- Error dalam analisis → catat dan lanjut

---

## 📦 4. DELIVERABLES — APA YANG HARUS DIHASILKAN

### 4.1 File Output Utama

Buat folder `docs/fable5-audit/` dengan struktur:

```
docs/fable5-audit/
├── 00_INDEX.md                    — Indeks seluruh output + ringkasan eksekutif
├── 01_MAIN_FLOWS_VERIFIED.md      — Domain A: Verifikasi flow bisnis
├── 02_BUSINESS_RULES_COMPLIANCE.md — Domain B: Compliance aturan owner
├── 03_ADDITIONAL_FEATURES.md       — Domain C: Fitur tambahan
├── 04_FINANCE_AUDIT.md            — Domain D: AUDIT KEUANGAN LENGKAP
│   ├── coa-verification
│   ├── auto-journal-verification
│   ├── balance-sheet
│   ├── profit-loss
│   ├── cashflow
│   ├── financial-ratios
│   └── cross-check
├── 05_INVENTORY_AUDIT.md          — Domain E: Inventaris & barang
├── 06_MARKETING_LANDING.md        — Domain F: Marketing & landing page
├── 07_UIUX_DETAIL.md              — Domain G: UI/UX detail
├── 08_NOTIFICATIONS_SCHEDULING.md — Domain H: Notifikasi, penjadwalan, kalendar, reservasi
├── 09_KPI_MOTIVATION.md           — Domain I: KPI, performance, teori motivasi
└── 10_MASTER_ACTION_PLAN.md       — MASTER ACTION PLAN untuk AI lemah
```

### 4.2 Isi Setiap File

Setiap file harus memiliki:
1. **Executive Summary** — 1 paragraf kesimpulan
2. **Methodology** — bagaimana kamu melakukan audit
3. **Findings** — setiap temuan dengan evidence file:baris
4. **Status** — ✅/🟡/❌ per item
5. **Rekomendasi** — apa yang harus dilakukan
6. **Open Questions** — apa yang perlu keputusan owner

### 4.3 File Kunci: `10_MASTER_ACTION_PLAN.md`

File paling penting. Isinya:

#### A. Ringkasan Eksekutif (1 paragraf)
Buat kesimpulan satu paragraf tentang kondisi project — apa yang kuat, apa yang lemah, prioritas nomor 1.

#### B. Action Plan — Dibagi per Fase

**Fase 1 — KRITIS (harus dikerjakan sebelum deploy)**
| # | Task | File Target | Spesifikasi | Estimasi |
|---|---|---|---|---|
| 1 | ... | ... | Detail instruksi | 1 sesi |

**Fase 2 — PENTING (setelah deploy, sebelum PWA push)**
| # | Task | File Target | Spesifikasi | Estimasi |

**Fase 3 — OPTIMAL (setelah semua jalan)**
| # | Task | File Target | Spesifikasi | Estimasi |

**Fase 4 — FUTURE (visi jangka panjang)**
| # | Task | File Target | Spesifikasi | Estimasi |

#### C. Detail Instruksi per Task
Setiap task harus memiliki:
1. **File target** — path persis
2. **Apa yang harus diubah** — kode yang perlu ditambah/hapus/modifikasi
3. **Kriteria selesai** — bagaimana tahu task ini berhasil
4. **Larangan** — apa yang TIDAK boleh disentuh di file yang sama
5. **Stop condition** — kapan harus berhenti dan catat

#### D. Dependency Graph
Task A → B → C (mana yang blocking mana)

#### E. Risk Matrix
| Task | Risk | Mitigasi |
|---|---|---|

---

## ⚡ 5. STRATEGI EKSEKUSI — CARA KERJA

### Langkah 1: Baca Semua Docs yang Ada (30 menit)
Baca file-file ini secara berurutan:
1. `CLAUDE.md`
2. `docs/00_GROUND_STATE.md`
3. `docs/01_FLOW_MAP.md` (fokus — ini peta utama)
4. `docs/02_FOCUS_PLAN.md`
5. `docs/03_AUDIT_MEGA_2026-06.md` (42 temuan)
6. `docs/05_UIUX_AUDIT_2026-06-12.md`
7. `docs/06_DEPLOY_RUNBOOK.md`
8. `docs/07_NEXT_WORK_INSTRUCTIONS.md`
9. `docs/08_PWA_AUDIT_AND_HARDENING_PLAN_2026-06-12.md`
10. `docs/09_NEXT_WORK_V513.md`
11. `docs/CHANGELOG.md`
12. `docs/CHECKLIST.md`

### Langkah 2: Mapping File Structure (15 menit)
- `Get-ChildItem -Recurse -Depth 2 backend/src/` — mapping struktur backend
- `Get-ChildItem -Recurse -Depth 2 frontend/src/` — mapping struktur frontend

### Langkah 3: Domain Finance — Audit Terdalam (2-3 jam)

**Prioritas #1 — ini yang paling penting.**

Baca file demi file:
1. `backend/src/modules/accounting/` — semua file
2. `backend/src/modules/accounting/accounting-posting.service.ts` — verifikasi setiap posting function
3. `backend/src/modules/finance/finance.service.ts` — verifikasi businessHealth, balanceSheetDraft, ownerDashboard
4. `backend/src/modules/reports/reports.service.ts` — verifikasi setiap report

Untuk setiap fungsi:
- Baca raw SQL / Prisma query
- Hitung manual di Excel/notes
- Bandingkan dengan hasil yang diharapkan
- Catat selisih

### Langkah 4: Domain Inventory (1 jam)
Baca file:
1. `backend/src/modules/inventory-items/`
2. `backend/src/modules/inventory-movements/`
3. `backend/src/modules/room-items/`

### Langkah 5: Domain Marketing & UI/UX (1 jam)
- Lihat screenshots di `_uiux_audit_2026-06-12/`
- Baca `frontend/src/pages/public/`
- Baca `modules/marketing/`

### Langkah 6: Domain Notifikasi & Scheduling (1 jam)
- Baca `modules/notifications/`
- Baca `modules/auto-ops/auto-ops.service.ts`
- Buat coverage matrix

### Langkah 7: Domain KPI & Motivasi (30 menit)
- Baca `modules/staff-performance/`
- Baca `modules/staff-routines/`
- Baca `modules/tenant-staff-reviews/`

### Langkah 8: Sintesis + Tulis Output (2-3 jam)
- Tulis semua file output di `docs/fable5-audit/`
- Buat `10_MASTER_ACTION_PLAN.md` yang detail
- Pastikan action plan bisa dieksekusi oleh AI lemah

**Total estimasi:** 8-10 jam kerja intensif (gunakan seluruh token harian yang tersedia).

---

## 🚫 6. LARANGAN MUTLAK

1. **JANGAN ubah kode aplikasi** — read-only untuk `backend/src/` dan `frontend/src/`
2. **JANGAN tambah dependensi npm** — analisis hanya dari kode yang ada
3. **JANGAN ubah schema prisma** — `backend/prisma/schema.prisma` read-only
4. **JANGAN ubah file SQL** — `backend/sql/` read-only
5. **JANGAN ubah file scripts** — `scripts/` read-only
6. **JANGAN hapus file docs yang sudah ada** — hanya tambah baru di `docs/fable5-audit/`
7. **JANGAN commit/push** — biarkan file di working tree, owner yang akan commit
8. **JANGAN berasumsi** — jika ragu, catat sebagai OPEN QUESTION, jangan tebak

---

## ✅ 7. KRITERIA SUKSES

Kamu berhasil jika:
1. Semua file di `docs/fable5-audit/` terisi lengkap (11 file)
2. `04_FINANCE_AUDIT.md` memiliki verifikasi setiap sumber jurnal + Balance Sheet + P&L + Cashflow + Rasio
3. Setiap temuan memiliki evidence `file:baris`
4. `10_MASTER_ACTION_PLAN.md` memiliki task yang cukup detail untuk AI lemah jalankan tanpa tanya lagi
5. Tidak ada error TypeScript di file .md (tidak relevan, tapi pastikan format rapi)
6. Owner bisa membaca output dan langsung tahu: mana yang harus dikerjakan besok, mana yang bulan depan, mana yang tahun depan

---

## 🎯 MOTIVASI PENUTUP

Fable 5 — ini adalah **audit final** sebelum eksekusi massal. Kamu adalah model AI terbaik yang ada. Gunakan seluruh kemampuanmu:

- Baca setiap baris kode keuangan dengan teliti — satu rupiah salah berarti laporan keuangan salah
- Petakan setiap relasi antar modul — tidak ada yang boleh terlewat
- Buat action plan yang **actionable** — AI lemah harus bisa jalan tanpa mikir

**Ini adalah masterpiece-mu.** Buat yang terbaik.