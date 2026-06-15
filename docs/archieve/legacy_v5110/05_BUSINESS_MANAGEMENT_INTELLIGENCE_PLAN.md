# KOST48 V5 — Business Management Intelligence Plan

> **Status:** PLAN / BRAINSTORMING  
> **Tanggal:** 1 Juni 2026  
> **Inisiatif:** Menerapkan seluruh kurikulum International Business Management (IB Diploma) ke dalam aplikasi KOST48  
> **Target Role:** OWNER  
> **Arsitektur AI-first:** AI Engine sebagai mesin utama yang menjalankan seluruh analisis otomatis

---

## 📑 Daftar Isi

1. [Visi Besar](#1-visi-besar)
2. [AI-First Architecture](#2-ai-first-architecture)
3. [Path A — Quick Win: Dashboard Fix](#3-path-a--quick-win-dashboard-fix)
4. [Path B — Grand Architecture: Management Intelligence Layer](#4-path-b--grand-architecture-management-intelligence-layer)
5. [Framework Full Map (~48 Framework)](#5-framework-full-map-48-framework)
6. [Framework Detail — Extended](#6-framework-detail--extended)
7. [AI Integration Detail (14 Framework × AI Spec)](#7-ai-integration-detail-14-framework--ai-spec)
8. [AI Service Module Architecture](#8-ai-service-module-architecture)
9. [Prompt Template Examples](#9-prompt-template-examples)
10. [Scheduler Design](#10-scheduler-design)
11. [Frontend AI Components](#11-frontend-ai-components)
12. [Arsitektur Teknis](#12-arsitektur-teknis)
13. [Timeline & Prioritas (Extended)](#13-timeline--prioritas-extended)
14. [Open Questions](#14-open-questions)

---

## 1. Visi Besar

### Tujuan
Membangun **Business Management Intelligence Platform** yang menerapkan seluruh teori manajemen bisnis IB Diploma secara penuh ke dalam operasional KOST48. Platform ini adalah **AI-first**: Artificial Intelligence (DeepSeek API) adalah mesin utama yang secara otomatis mengumpulkan data real dari database, menganalisis menggunakan framework bisnis, dan menghasilkan rekomendasi strategis untuk owner — tanpa perlu input manual setiap kali.

### Prinsip
- **AI-first** — AI bukan tool tambahan, tapi mesin utama yang menjalankan analisis. AI otomatis mengambil data operasional dari DB, menghitung metrik, menerapkan framework teori, dan menghasilkan output terstruktur.
- **Data-driven** — Semua analisis didasarkan pada data operasional nyata (invoice, occupancy, payment, expense, tickets, dll.). AI tidak perlu input manual untuk mengambil data.
- **Theory-grounded** — Setiap analysis menggunakan framework IB Diploma secara formal (rumus BEP, matrix BCG, SWOT kuadran, dll.). AI tidak membuat analisis sendiri — dia menggunakan template teori yang sudah kita desain.
- **Automated Scheduling** — Analisis berjalan otomatis via cron jobs: harian (narasi bisnis), mingguan (SWOT), bulanan (BCG, Ansoff, BEP, forecasting), triwulan (PESTLE).
- **Interactive** — Owner, admin, staff, tenant dapat di-interview oleh AI (via notifikasi) untuk mengisi gap data kualitatif seperti kepuasan, motivasi, dan preferensi.

---

## 2. AI-First Architecture

### Konsep Utama: AI-as-Engine

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI ENGINE (DeepSeek)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐   ┌──────────────────┐   ┌───────────────┐   │
│  │  DATA PIPELINE    │   │  THEORY ENGINE   │   │  PROMPT STORE │   │
│  │  (auto-fetch DB)  │   │  (framework map) │   │  (templates)  │   │
│  └────────┬─────────┘   └────────┬─────────┘   └───────┬───────┘   │
│           │                      │                      │            │
│           └──────────────────────┼──────────────────────┘            │
│                                  ▼                                   │
│                    ┌──────────────────────────┐                      │
│                    │     AI ANALYZER          │                      │
│                    │  (prompt builder + call) │                      │
│                    └────────────┬─────────────┘                      │
│                                 ▼                                    │
│                    ┌──────────────────────────┐                      │
│                    │  RECOMMENDATION STORE    │                      │
│                    │  (DB + cache)            │                      │
│                    └──────────────────────────┘                      │
│                                                                      │
│  TRIGGERS:                                                           │
│  🔄 Cron harian  → narasi bisnis + KPI auto                          │
│  📊 Data change  → occupancy berubah signifikan, milestone           │
│  👤 Manual owner → "Analisis keputusan buka cabang baru"            │
│  📅 Mingguan     → AI interview staff/tenant via notifikasi          │
└─────────────────────────────────────────────────────────────────────┘

         │
         ▼              Data dipakai oleh 14+ framework

┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│SWOT  │ │Ansoff│ │BCG   │ │BEP   │ │NPV   │ │Budget│ │Forecast...
└──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘
```

### Alur Data Otomatis

```
[Database PostgreSQL]
      │
      ▼
[AI Data Pipeline] — Prisma aggregations
  ├── Finance: totalRevenue, netProfit, occupancyRate, overdueCount, paymentPendingCount
  ├── Marketing: bookingSource, roomViewCount, wifiRevenue
  ├── Operations: ticketCount, ticketStatus, staffPerformance
  ├── HR: staffCount, tenantSatisfaction, turnover
  └── Trend: 6/12 month history per metric
      │
      ▼
[AI Theory Engine] — Pilih framework & build structured prompt
  ├── "Ini adalah SWOT Analysis. Data: {...}. Rumus: 4 kuadran."
  ├── "Ini adalah Break-even Analysis. Data: {...}. Rumus: BE = FC/(P-VC)."
  └── "Ini adalah BCG Matrix. Data: {...}. Kriteria: occupancy, growth, revenue."
      │
      ▼
[DeepSeek API] — Kirim prompt → Dapat JSON response
      │
      ▼
[Recommendation Store] — Save ke DB (ai_analyses table)
      │
      ▼
[Frontend] — Display di dashboard owner + notifikasi jika ada item urgent
```

### Keuntungan AI-First vs AI-Assisted

| Aspek | AI-Assisted (plan lama) | AI-First (baru) |
|---|---|---|
| Trigger | Manual — owner/tim klik "Generate" | Otomatis — cron + event-driven |
| Data Input | Manual atau partial | Auto-fetch dari DB via Prisma pipeline |
| Framework | AI bebas interpretasi | AI menggunakan template teori yang sudah ditentukan |
| Output | Natural language bebas | JSON terstruktur siap display di frontend |
| Reliability | Bervariasi — tergantung prompt | Konsisten — system prompt + format kaku |
| Schedule | Tidak ada schedule | Harian/mingguan/bulanan/triwulan terjadwal |

---

## 3. Path A — Quick Win: Dashboard Fix

### Target
Fix dashboard `/owner-dashboard` yang ada sekarang — perbaikan warna, chart, dan time range.

### Komponen Baru

| Komponen | Deskripsi |
|---|---|
| **recharts** | Charting library React. Install via `npm install recharts` di frontend |
| **Line Chart** | Revenue, Expense, Net Profit sebagai 3 line berbeda |
| **Best-fit Line** | Simple linear regression di frontend — `y = mx + b` |
| **Time Range Selector** | 1 Bulan, 3 Bulan, 6 Bulan, 1 Tahun |
| **Toggle Bar/Line** | Toggle antara bar chart dan line chart |
| **Donut/Pie Chart** | Occupancy breakdown (Terisi, Kosong, Reserved, Maintenance) |
| **Time Range Selector UI** | Tombol pill: `[1B] [3B] [6B] [1Y]` bukan dropdown |

### Warna Fixed
- Latar grade badge menggunakan warna solid dengan kontras tinggi
- Line chart: Revenue = `#3b82f6` (biru), Expense = `#f97316` (oranye), Net Profit = `#22c55e` (hijau)
- Background chart: putih bersih, grid line abu-abu tipis

### File yang Disentuh (5 file)

| # | File | Aksi |
|---|---|---|
| 1 | `frontend/package.json` | Tambah `recharts` dependency |
| 2 | `backend/src/modules/finance/dto/finance-query.dto.ts` | Tambah `trendMonths?: number` |
| 3 | `backend/src/modules/finance/finance.service.ts` | Loop dinamis 1/3/6/12 bulan |
| 4 | `frontend/src/api/finance.ts` | Update `fetchOwnerDashboard` signature |
| 5 | `frontend/src/pages/dashboard/OwnerDashboardPage.tsx` | Rewrite total dengan recharts |

### Tidak Diubah
- `DashboardOwner.tsx` — tetap sebagai Admin Command Center
- `dashboardShared.tsx` — tidak disentuh
- Backend route lain — tidak diubah
- Database schema — tidak diubah

---

## 4. Path B — Grand Architecture: Management Intelligence Layer

### Owner Dashboard Akhir (setelah Path A + Path B)

```
┌──────────────────────────────────────────────────────────────────┐
│ 🏠 KOST48 Management Intelligence          [OWNER: liem.lui]     │
├──────────────────────────────────────────────────────────────────┤
│ Tab: [Dashboard] [Strategy] [Marketing] [Human] [Organization]   │
│          🤖 AI Auto-Analysis aktif (jadwal: harian/mingguan/...) │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ TAB DASHBOARD (Path A result + AI Narrative)                     │
│ ┌─ Grade ─┬─ KPI ─┬─ Trend Chart ─┬─ Occupancy ─┐              │
│ │ SEHAT   │ Rp X  │ 📈 Line Chart  │ 🍩 Donut    │              │
│ │ Skor 87 │ +5%   │ + best-fit     │ 85% terisi   │              │
│ └─────────┴───────┴────────────────┴─────────────┘              │
│ ┌─ AI Narasi Bisnis Harian ─────────────────────────────┐      │
│ │ "Bulan ini revenue naik 12% mom. Overdue 3 item       │      │
│ │  perlu follow-up segera. Rekomendasi: kirim reminder  │      │
│ │  ke tenant G2-002 dan G3-001."                        │      │
│ └───────────────────────────────────────────────────────┘      │
│ ┌─ Signals ────────────────┐                                    │
│ │ ⚠️ Overdue: 3 (AI alert) │                                    │
│ │ 🟡 Pending: 2 (AI alert) │                                    │
│ └──────────────────────────┘                                    │
│                                                                  │
│ TAB STRATEGY (Semua AI-generated)                                │
│ ┌──────────┬───────────┬───────────┬───────────┐                │
│ │ Ansoff   │ BCG       │ Porter 5  │ SWOT 🤖   │ ← AI auto    │
│ │ Matrix   │ Matrix    │ Forces    │ Mingguan   │   generate   │
│ ├──────────┴───────────┴───────────┴───────────┤                │
│ │ PESTLE/STEEPLE (Triwulan 🤖) │ 7P Mix       │                │
│ ├──────────────────────┴───────────────────────┤                │
│ │ Business Model Canvas (9 blok interaktif)     │                │
│ ├──────────────────────────────────────────────┤                │
│ │ Business Objectives     │ Stakeholder Map    │                │
│ │ Growth Tracker          │ Decision Trees     │                │
│ │ Force Field Analysis    │                    │                │
│ └──────────────────────────────────────────────┘                │
│                                                                  │
│ TAB FINANCE & ACCOUNTS (AI-calculated)                           │
│ ┌──────────────────────────────────────────────────────┐        │
│ │ Investment Appraisal 🤖 — rekomendasi otomatis        │        │
│ │ Break-even Analysis 🤖 — update bulanan               │        │
│ │ Budget vs Actual 🤖 — variance + saran                 │        │
│ │ Gearing Ratio (otomatis)                              │        │
│ │ Sales Forecasting 🤖 — prediksi 6 bulan               │        │
│ └──────────────────────────────────────────────────────┘        │
│                                                                  │
│ TAB MARKETING (AI-analysed)                                      │
│ ┌─ Visitor Stats ─┬─ Conversion ─┬─ Channel Performance ─┐     │
│ │ Views: 1,200    │ Booking: 15  │ Website: 60%           │     │
│ │ Unique: 85      │ Rate: 1.25%  │ WA: 25% · lainnya: 15%│     │
│ ├─────────────────┴──────────────┴────────────────────────┤     │
│ │ 📈 Sales Forecast 🤖                                     │     │
│ │ 💡 AI Rekomendasi: "Tingkatkan promosi Juli-Agustus     │     │
│ │     karena okupansi historis turun 20% di musim liburan"│     │
│ └──────────────────────────────────────────────────────────┘     │
│                                                                  │
│ TAB HUMAN CAPITAL (AI-surveyed)                                  │
│ ┌─ Maslow Pyramid ────────────────┬─ Motivation Scores ───┐    │
│ │ 🏆 Self-actualization: 6/10    │ Herzberg 🤖: 7.2/10   │    │
│ │ 👥 Esteem: 7/10                │ Adams 🤖: 6.5/10      │    │
│ │ ❤️ Social: 8/10                │ Pink 🤖: 8.1/10       │    │
│ │ 🔒 Safety: 9/10                │ SDT 🤖: 7.5/10        │    │
│ │ 🏠 Physiological: 9/10         │                        │    │
│ ├────────────────────────────────┴────────────────────────┤    │
│ │ 💡 AI Insight: "Tenant merasa aman (skor 9) tapi        │    │
│ │     social/belonging turun 5% — rekomendasi: adakan     │    │
│ │     gathering tenant bulan depan"                       │    │
│ └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│ TAB ORGANIZATION                                                 │
│ ┌─ Hierarki ─────────────┬─ Gantt ──────────┬─ Crisis ───────┐│
│ │ 👑 Owner               │ Renovasi: 60%    │ 🤖 Contingency ││
│ │  └─ 👔 Admin           │ Maintenance: 80% │ plan auto      ││
│ │       └─ Staff, Tenant │                  │ generate       ││
│ └────────────────────────┴──────────────────┴────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Framework Full Map (~48 Framework)

### Legenda
- ✅ **Existing** — sudah ada di sistem/laporan
- 🟢 **Planned** — sudah ada di plan sebelumnya
- 🆕 **New** — baru ditambahkan dari IB BM syllabus
- 🦾 **AI-driven** — AI engine yang menjalankan analisis otomatis
- ⚪ **Deferred** — untuk fase berikutnya

| # | Framework | IB Chapter | Status | AI Auto | Prioritas |
|---|-----------|-----------|--------|---------|-----------|
| 1 | **SWOT Analysis** | BMT Ch 44 | 🟢 Planned | 🦾 Mingguan | ⭐⭐⭐ |
| 2 | **Ansoff Matrix** | BMT Ch 45 | 🟢 Planned | 🦾 Bulanan | ⭐⭐⭐ |
| 3 | **STEEPLE/PESTLE Analysis** | BMT Ch 46 | 🟢 Planned | 🦾 Triwulan | ⭐⭐⭐ |
| 4 | **BCG Matrix** | BMT Ch 47 | 🟢 Planned | 🦾 Bulanan | ⭐⭐⭐ |
| 5 | **Business Model Canvas** | BMT Ch 48 | 🟢 Planned | — Interaktif | ⭐⭐⭐ |
| 6 | **Decision Trees** | BMT Ch 49 | 🆕 Baru | 🦾 On-demand | ⭐⭐ |
| 7 | **Descriptive Statistics** | BMT Ch 50 | ✅ Existing | ✅ Existing | — |
| 8 | **Circular Business Models** | BMT Ch 51 | 🟢 Planned | — | ⭐ |
| 9 | **Gantt Charts (HL)** | BMT Ch 52 | 🆕 Baru | — Manual | ⭐ |
| 10 | **Porter's Generic Strategies (HL)** | BMT Ch 53 | 🟢 Planned | 🦾 Bulanan | ⭐⭐ |
| 11 | **Hofstede's Cultural Dimensions (HL)** | BMT Ch 54 | ⚪ Deferred | — | — |
| 12 | **Force Field Analysis (HL)** | BMT Ch 55 | 🆕 Baru | 🦾 On-demand | ⭐ |
| 13 | **Critical Path Analysis (HL)** | BMT Ch 56 | ⚪ Deferred | — | — |
| 14 | **Contribution Analysis (HL)** | BMT Ch 57 | 🟢 Planned | — | ⭐ |
| 15 | **Simple Linear Regression (HL)** | BMT Ch 58 | 🟢 Path A | 🦾 Path A | ⭐⭐⭐ |
| 16 | **Business Objectives** | Unit 1.3 | 🆕 Baru | 🦾 Bulanan | ⭐⭐ |
| 17 | **Stakeholders Mapping** | Unit 1.4 | 🆕 Baru | 🦾 Bulanan | ⭐⭐ |
| 18 | **Growth & Evolution** | Unit 1.5 | 🆕 Baru | 🦾 Triwulan | ⭐⭐ |
| 19 | **MNCs** | Unit 1.6 | ⚪ Deferred | — | — |
| 20 | **Organizational Structure** | Unit 2.2 | 🟢 Planned | — Manual | ⭐⭐ |
| 21 | **Leadership & Management** | Unit 2.3 | ⚪ Deferred | — | — |
| 22 | **Motivation Theories (Expanded)** | Unit 2.4 | 🆕 Baru | 🦾 Bulanan | ⭐⭐ |
| 23 | **Organizational Culture (HL)** | Unit 2.5 | ⚪ Deferred | — | — |
| 24 | **Communication** | Unit 2.6 | ⚪ Deferred | — | — |
| 25 | **Sources of Finance** | Unit 3.2 | ✅ Existing | — | — |
| 26 | **Costs & Revenues** | Unit 3.3 | ✅ Existing | ✅ Existing | — |
| 27 | **Final Accounts** | Unit 3.4 | ✅ Existing | ✅ Existing | — |
| 28 | **Profitability & Liquidity Ratios** | Unit 3.5 | ✅ Existing | ✅ Existing | — |
| 29 | **Debt/Equity Ratio (HL)** | Unit 3.6 | 🆕 Baru | 🦾 Bulanan | ⭐ |
| 30 | **Cash Flow** | Unit 3.7 | ✅ Existing | ✅ Existing | — |
| 31 | **Investment Appraisal (HL)** | Unit 3.8 | 🆕 Baru | 🦾 On-demand | ⭐⭐⭐ |
| 32 | **Budgets (HL)** | Unit 3.9 | 🆕 Baru | 🦾 Bulanan | ⭐⭐ |
| 33 | **Role of Marketing** | Unit 4.1 | 🟢 Planned | 🦾 Bulanan | ⭐⭐⭐ |
| 34 | **Marketing Planning** | Unit 4.2 | 🟢 Planned | 🦾 Bulanan | ⭐⭐ |
| 35 | **Sales Forecasting (HL)** | Unit 4.3 | 🆕 Baru | 🦾 Bulanan | ⭐⭐⭐ |
| 36 | **Market Research** | Unit 4.4 | 🆕 Baru | 🦾 Mingguan | ⭐⭐ |
| 37 | **7P Marketing Mix** | Unit 4.5a-g | 🟢 Planned | 🦾 Bulanan | ⭐⭐⭐ |
| 38 | **International Marketing (HL)** | Unit 4.6 | ⚪ Deferred | — | — |
| 39 | **Role of Operations Management** | Unit 5.1 | ✅ Existing | — | — |
| 40 | **Operations Methods** | Unit 5.2 | ⚪ Deferred | — | — |
| 41 | **Lean Production & Quality (HL)** | Unit 5.3 | ⚪ Deferred | — | — |
| 42 | **Location** | Unit 5.4 | 🆕 Baru | 🦾 On-demand | ⭐ |
| 43 | **Break-even Analysis** | Unit 5.5 | 🆕 Baru | 🦾 Bulanan | ⭐⭐⭐ |
| 44 | **Production Planning (HL)** | Unit 5.6 | ⚪ Deferred | — | — |
| 45 | **Crisis Management (HL)** | Unit 5.7 | 🆕 Baru | 🦾 On-demand | ⭐ |
| 46 | **R&D (HL)** | Unit 5.8 | ⚪ Deferred | — | — |
| 47 | **MIS (HL)** | Unit 5.9 | ✅ Existing | ✅ Existing | — |
| — | **Maslow Hierarchy** | (Human) | 🟢 Planned | 🦾 Bulanan | ⭐⭐⭐ |
| — | **Deci & Ryan SDT** | (Human) | 🟢 Planned | 🦾 Bulanan | ⭐⭐ |
| — | **Herzberg 2-Factor** | (Motivation) | 🆕 Baru | 🦾 Bulanan | ⭐⭐ |
| — | **Taylor / Scientific Management** | (Motivation) | 🆕 Baru | 🦾 Bulanan | ⭐ |
| — | **Adams Equity Theory** | (Motivation) | 🆕 Baru | 🦾 Bulanan | ⭐ |
| — | **Pink Drive Theory** | (Motivation) | 🆕 Baru | 🦾 Bulanan | ⭐ |
| — | **Narasi Bisnis Harian** | (Aggregate) | 🆕 Baru | 🦾 **Harian** | ⭐⭐⭐ |

### Ringkasan
| Kategori | Jumlah |
|---|---|
| ✅ Existing di sistem | 10 |
| 🟢 Planned (Path B) | 13 |
| 🆕 Baru dari IB BM syllabus | 17 |
| ⚪ Deferred | 9 |
| 🦾 AI-driven auto-analysis | **26 framework** |
| **Total** | **~49 framework/teori** |

---

## 6. Framework Detail — Extended

### 6.1 Business Objectives (Unit 1.3) 🆕 🦾

**Konsep:**
- Vision → Mission → Strategic Objectives → Tactical Objectives → Operational KPIs

**Implementasi di KOST48:**
```
Vision: Menjadi pilihan kost terbaik di Surabaya
Mission: Menyediakan hunian nyaman, aman, dan terjangkau
├─ Strategic: 95% occupancy rate dalam 2 tahun
│  ├─ Tactical: Implementasi promo early bird setiap semester
│  └─ Operational: Kirim notifikasi kamar kosong ke prospek setiap hari
```

**AI auto:** AI review progress objectives berdasarkan data real, beri update skor.

### 6.2 Stakeholders Mapping (Unit 1.4) 🆕 🦾

**Konsep:**
Power/Interest grid — siapa yang punya power tinggi dan interest tinggi

**Implementasi:**
```
HIGH POWER          HIGH POWER
LOW INTEREST        HIGH INTEREST
┌────────────┐     ┌────────────┐
│ Regulator  │     │ 🏆 OWNER   │
│ Supplier    │     │ Tenant     │
└────────────┘     └────────────┘
                   
LOW POWER           LOW POWER
LOW INTEREST        HIGH INTEREST
┌────────────┐     ┌────────────┐
│ Kompetitor │     │ Staff      │
│ Media      │     │ Community  │
└────────────┘     └────────────┘
```

**AI auto:** Analisis power/interest dari data interaksi user di sistem.

### 6.3 Growth & Evolution (Unit 1.5) 🆕 🦾

**Konsep:**
- Economies of scale (pembelian bulk, diskon listrik, staffing efficiency)
- Diseconomies of scale (birokrasi, komunikasi)
- Growth stages: startup → expansion → maturity
- Integration: horizontal (beli kost lain), vertical (buka laundry sendiri)

**AI auto:** AI evaluate apakah economies of scale tercapai, growth stage.

### 6.4 Motivation Theories — Expanded (Unit 2.4) 🆕 🦾

**Konsep — 6 teori motivasi:**

| Teori | Fokus | AI Role |
|---|---|---|
| **Maslow** | Hierarki kebutuhan tenant | Survey + analisis otomatis |
| **Herzberg 2-Factor** | Hygiene vs Motivator | Staff survey analysis |
| **Taylor Scientific** | Efisiensi, bonus output | Performance scorecard |
| **Adams Equity** | Keadilan input/output | Comparison analysis |
| **Pink Drive** | Autonomy, Mastery, Purpose | Survey + recommendation |
| **Deci & Ryan SDT** | Autonomy, Competence, Relatedness | Survey + recommendation |

**AI auto:** Kirim survey ke tenant/staff via notifikasi, analisis hasil, beri insight dan rekomendasi.

### 6.5 Debt/Equity Ratio Analysis (Unit 3.6) 🆕 🦾

**Konsep:**
- Gearing ratio = (Non-current liabilities / Capital employed) × 100
- High gearing = high risk but potential high return
- Low gearing = safe but may miss opportunities

**AI auto:** Hitung otomatis dari data deposit + modal (input manual sekali), beri insight.

### 6.6 Investment Appraisal (Unit 3.8) 🆕 🦾 ⭐⭐⭐

**Konsep — 3 metode:**

| Metode | Kegunaan di KOST48 |
|---|---|
| **Payback Period** | Berapa bulan renovasi kamar balik modal? |
| **Average Rate of Return (ARR)** | Rate investasi AC baru vs kenaikan harga kamar |
| **Net Present Value (NPV)** | Apakah buka cabang baru worth it? (discount rate 10%) |

**Contoh Kasus:**
```
Investasi: Renovasi 5 kamar — Rp 50.000.000
Revenue tambahan per tahun: Rp 18.000.000 (5 × Rp 300.000/bulan × 12)
Biaya tambahan per tahun: Rp 3.000.000 (listrik, maintenance)
Net cash inflow per tahun: Rp 15.000.000

Payback Period: 50.000.000 / 15.000.000 = 3.33 tahun ✅
ARR: (15.000.000 / 50.000.000) × 100 = 30% ✅
NPV (10% discount, 5 tahun): Cash flow projection → otomatis kalkulasi
```

**AI auto:** Hitung otomatis dari input project. AI juga rekomendasi investasi berdasarkan data historis.

### 6.7 Budgets (HL — Unit 3.9) 🆕 🦾

**Konsep:**
- Set budget bulanan per kategori (listrik, air, gaji, marketing, maintenance)
- Bandingkan actual vs budget → variance analysis

**AI auto:** Hitung variance otomatis dari data expense. AI kasih rekomendasi adjustment.

### 6.8 Sales Forecasting (HL — Unit 4.3) 🆕 🦾 ⭐⭐⭐

**Konsep:**
Predict future occupancy/revenue using:
1. Simple linear regression (y = mx + b)
2. Moving average
3. Seasonal adjustment (semester — mahasiswa naik turun)

**AI auto:** AI hitung forecast dari trend history, generate 3/6/12 bulan prediksi + confidence interval.

### 6.9 Market Research (Unit 4.4) 🆕 🦾

**Konsep:**
- Primary research: survey tenant langsung
- Secondary research: data existing di sistem
- Sampling methods: random, quota, stratified

**AI auto:** AI interview tenant, generate report market research otomatis.

### 6.10 Break-even Analysis (Unit 5.5) 🆕 🦾 ⭐⭐⭐

**Konsep:**
```
Break-even Point (units) = Fixed Cost / (Price - Variable Cost per unit)
```

**Contoh:**
```
Fixed cost: Rp 25.000.000/bulan
Variable cost/kamar: Rp 500.000
Price/kamar: Rp 1.500.000

BEP = 25.000.000 / (1.500.000 - 500.000) = 25 kamar
```

**AI auto:** Hitung BEP otomatis dari data expense dan room price. AI saran pricing adjustment.

### 6.11 Crisis Management & Contingency Planning (HL — Unit 5.7) 🆕 🦾

**Konsep:**
- Identify potential crisis scenarios
- Create contingency plan for each
- Crisis management team (roles)

**AI auto:** AI generate contingency plan berdasarkan data historis dan best practice.

### 6.12 Gantt Charts (BMT Ch 52) 🆕

**Konsep:**
Project timeline visual — task, duration, dependencies, progress

**Note:** Manual input owner/admin. AI bisa saran timeline dari data maintenance historis.

### 6.13 Force Field Analysis (BMT Ch 55) 🆕 🦾

**Konsep:**
- Driving forces → mendorong perubahan
- Restraining forces → menahan perubahan
- Total score → apakah perubahan layak dilakukan?

**AI auto:** AI saran driving/restraining forces based on data, owner tinggal adjust.

---

## 7. AI Integration Detail (14 Framework × AI Spec)

Setiap framework memiliki spesifikasi AI yang terdefinisi: **data input, prompt theory, output format, trigger schedule**.

| # | Framework | AI Input (Data Real dari DB) | Prompt Theory | AI Output (JSON) | Schedule |
|---|---|---|---|---|---|
| 1 | **Narasi Bisnis Harian** | KPI hari ini: revenue, expense, occupancy, overdue, pending | "Berdasarkan data KOST48, buat narasi 3 paragraf: health grade, rekomendasi, prediksi" | `{ title, summary, recommendations[], risks[] }` | **Harian** 07:00 WIB |
| 2 | **SWOT Analysis** | Okupansi %, revenue trend, overdue, pending payment, ticket trend, staff count, expense ratio | "Anda business strategist. Data KOST48: {data}. Isi SWOT 4 kuadran minimal 3 poin per kuadran" | `{ strengths[], weaknesses[], opportunities[], threats[], overallAssessment }` | **Mingguan** Senin 08:00 |
| 3 | **Ansoff Matrix** | Occupancy per room type, new service revenue, geo area | "Rekomendasi strategi Ansoff berdasarkan data market penetration KOST48" | `{ marketPenetration[], productDev[], marketDev[], diversification[] }` | **Bulanan** |
| 4 | **BCG Matrix** | Revenue per room type, growth rate %, occupancy vs market avg | "Klasifikasi room/layanan ke BCG kuadran. Star: >90% okupansi + growth positif" | `{ stars[], cashCows[], questionMarks[], dogs[] }` | **Bulanan** |
| 5 | **Porter's 5 Forces** | Manual input owner + AI public market knowledge | "Berdasarkan data KOST48 dan pengetahuan Anda tentang industri kost Surabaya, isi 5 Forces" | `{ rivalry, threatNewEntrants, buyerPower, supplierPower, substitutes, overall[] }` | **Triwulan** |
| 6 | **PESTLE/STEEPLE** | Data publik (AI knowledge) + local context | "Isi PESTLE untuk bisnis kost di Surabaya. Gunakan data makro yang Anda ketahui" | `{ political[], economic[], social[], technological[], legal[], environmental[] }` | **Triwulan** |
| 7 | **Break-even Analysis** | Fixed cost (expense summary), variable cost/kamar, room price | "Hitung BEP: FC/(P-VC). Analisis margin of safety. Beri rekomendasi pricing jika perlu" | `{ bepUnits, bepRupiah, marginOfSafety, recommendation, pricingSuggestion }` | **Bulanan** (setelah expense direkap) |
| 8 | **Sales Forecasting** | Historical occupancy 12+ bulan, revenue trend, musiman (semester) | "Gunakan linear regression + seasonal adjustment. Output forecast 6 bulan dengan confidence interval" | `{ forecast[], confidenceInterval, seasonalFactors[], trendLine }` | **Bulanan** |
| 9 | **Investment Appraisal** | Project data (initial cost, cash flows), discount rate | "Hitung Payback, ARR, NPV. Beri rekomendasi GO/NO-GO dengan reasoning" | `{ payback, arr, npv, recommendation, risks[], confidenceLevel }` | **On-demand** (trigger owner) |
| 10 | **Budget vs Actual** | Budget per kategori + actual expense per kategori | "Analisis variance per kategori. Identifikasi over/under. Beri saran adjustment" | `{ categories[], totalVariance, criticalItems[], adjustmentSuggestions[] }` | **Bulanan** |
| 11 | **Motivation Analysis** | Staff survey responses, tenant satisfaction, turnover rate, performance scores | "Gunakan Herzberg, Adams, Pink, SDT. Analisis motivasi staff dan tenant. Beri saran konkret" | `{ hygieneScore, motivatorScore, equityIndex, pinkScore, sdtScores, recommendations[] }` | **Bulanan** |
| 12 | **Market Research** | Booking source data, ticket category, tenant demographics | "Analisis pasar KOST48: tren permintaan, preferensi tenant, channel efektivitas" | `{ demandTrends, tenantPreferences[], channelEffectiveness[], recommendations[] }` | **Mingguan** |
| 13 | **7P Marketing Mix** | Data per P: room (product), pricing (price), location (place), ads (promotion), staff (people), flow (process), photos (physical) | "Analisis 7P KOST48. Identifikasi gap dan rekomendasi improvement per P" | `{ product, price, place, promotion, people, process, physicalEvidence, gaps[] }` | **Bulanan** |
| 14 | **Crisis Plan** | Skenario owner + data historis insiden | "Buat contingency plan detail untuk skenario: {scenario}. Format: risiko, dampak, plan, resources" | `{ scenario, probability, impact, plan[], roles[], resources[], timeline }` | **On-demand** |
| 15 | **AI Interview (General)** | Survey questions (dari theory engine) + recipient list | "Wawancara [TENANT/STAFF] tentang [TOPIC]. Format conversational. 5 pertanyaan." | `{ questions[], responses[], insights[], sentimentScore }` | **Mingguan** via notifikasi |

---

## 8. AI Service Module Architecture

### Struktur Backend Module

```
backend/src/modules/ai/
├── ai.module.ts
├── ai.controller.ts
├── ai.service.ts              ← Main orchestrator
├── ai-data-pipeline.ts        ← Auto-fetch data dari DB (Prisma aggregations)
├── ai-theory-engine.ts        ← Prompt builder per framework
├── ai-prompt-store.ts         ← Template prompt + system instructions per framework
├── ai-deepseek.client.ts      ← DeepSeek API wrapper (retry, timeout, fallback)
├── ai-scheduler.ts            ← Cron jobs + event trigger handlers
├── ai-recommendation-store.ts ← Save hasil ke DB + cache management
├── dto/
│   ├── ai-analyze.dto.ts
│   ├── ai-interview.dto.ts
│   └── ai-forecast.dto.ts
└── types/
    └── ai.types.ts
```

### 8.1 AI Data Pipeline (`ai-data-pipeline.ts`)

```typescript
// Auto-fetch semua data yang diperlukan oleh semua framework
// Output: BusinessData object lengkap

@Injectable()
export class AiDataPipeline {
  constructor(private readonly prisma: PrismaService) {}

  async collectBusinessData(year: number, month: number): Promise<BusinessData> {
    const [roomStats, stayStats, financeStats, ticketStats, staffStats, trend6Months] = 
      await Promise.all([
        this.getRoomStats(),
        this.getStayStats(),
        this.getFinanceStats(year, month),
        this.getTicketStats(),
        this.getStaffStats(),
        this.getTrendMonths(year, month, 6),
      ]);

    return {
      year, month,
      ...roomStats, ...stayStats, ...financeStats, ...ticketStats, ...staffStats,
      trend6Months,
      generatedAt: new Date().toISOString(),
    };
  }

  private async getFinanceStats(year: number, month: number) { /* Prisma aggregations */ }
  private async getRoomStats() { /* Room groupBy status */ }
  private async getStayStats() { /* Stay counts */ }
  private async getTicketStats() { /* Ticket counts + categories */ }
  private async getStaffStats() { /* Staff counts + performance scores */ }
  private async getTrendMonths(year: number, month: number, count: number) { /* History */ }
}
```

### 8.2 AI Theory Engine (`ai-theory-engine.ts`)

```typescript
// Theory engine: pilih framework yang tepat, bangun structured prompt
// Setiap framework memiliki:
// - systemPrompt: instruksi untuk AI (peran, aturan, format output)
// - userPromptBuilder: fungsi yang mengubah BusinessData → prompt string
// - responseParser: fungsi yang mengubah AI response → typed output

export type FrameworkType = 
  | 'SWOT' | 'ANSOFF' | 'BCG' | 'PORTER_5' | 'PESTLE' | 'BEP'
  | 'INVESTMENT' | 'BUDGET' | 'FORECAST' | 'MOTIVATION'
  | 'MARKET_RESEARCH' | '7P' | 'CRISIS' | 'NARRATIVE';

export class AiTheoryEngine {
  buildPrompt(framework: FrameworkType, data: BusinessData, extra?: any): AiPrompt {
    switch (framework) {
      case 'SWOT': return this.buildSwotPrompt(data);
      case 'BEP': return this.buildBepPrompt(data);
      case 'BCG': return this.buildBcgPrompt(data);
      // ... etc
    }
  }

  private buildSwotPrompt(data: BusinessData): AiPrompt {
    return {
      systemPrompt: SWOT_SYSTEM_PROMPT,      // ← template dari ai-prompt-store.ts
      userPrompt: this.formatSwotData(data),  // ← format data jadi teks
      responseFormat: 'json',                 // ← selalu JSON
      maxTokens: 2000,
    };
  }

  private formatSwotData(data: BusinessData): string {
    return `
DATA OPERASIONAL KOST48 — ${data.monthYear}:

Occupancy Rate: ${data.occupancyRatePercent}%
Total Revenue: Rp ${data.totalRevenueRupiah.toLocaleString('id-ID')}
Net Profit: Rp ${data.netProfitRupiah.toLocaleString('id-ID')}
Net Profit Margin: ${data.netProfitMarginPercent}%
Overdue Invoices: ${data.overdueCount} (Rp ${data.overdueRupiah.toLocaleString('id-ID')})
Pending Payments: ${data.pendingPaymentCount}
Active Stays: ${data.activeStayCount}
Total Rooms: ${data.totalRooms}
Open Tickets: ${data.openTicketCount}
Staff Count: ${data.staffCount}

TREN 6 BULAN:
${data.trend6Months.map(m => 
  `  ${m.label}: Revenue Rp ${m.revenue.toLocaleString('id-ID')}, Expense Rp ${m.expense.toLocaleString('id-ID')}, Net Rp ${m.netProfit.toLocaleString('id-ID')}`
).join('\n')}
`;
  }
}
```

### 8.3 AI Prompt Store (`ai-prompt-store.ts`)

```typescript
// Semua system prompt dan instruksi AI disimpan di sini
// Format: prompt yang sudah di-test dan dioptimasi

export const SWOT_SYSTEM_PROMPT = `
Anda adalah Senior Business Strategist untuk bisnis kost di Surabaya, Indonesia.
Anda akan menerima data operasional real dari sistem KOST48.
Tugas Anda: isi 4 kuadran SWOT (Strengths, Weaknesses, Opportunities, Threats) 
dengan minimal 3 poin per kuadran.

Panduan:
- Strengths & Weaknesses: FAKTOR INTERNAL berdasarkan data yang diberikan
- Opportunities & Threats: FAKTOR EKSTERNAL berdasarkan knowledge pasar kost Surabaya
- Setiap poin harus SPESIFIK, jangan general
- Sertakan evidence dari data untuk setiap poin

Return format JSON SAJA:
{
  "strengths": [{ "point": "...", "evidence": "...", "impact": "HIGH/MEDIUM/LOW" }],
  "weaknesses": [{ "point": "...", "evidence": "...", "impact": "HIGH/MEDIUM/LOW" }],
  "opportunities": [{ "point": "...", "evidence": "...", "impact": "HIGH/MEDIUM/LOW" }],
  "threats": [{ "point": "...", "evidence": "...", "impact": "HIGH/MEDIUM/LOW" }],
  "overallAssessment": "1 paragraf ringkasan"
}
`;

export const BEP_SYSTEM_PROMPT = `
Anda adalah Financial Analyst untuk bisnis kost KOST48.
Gunakan rumus Break-even Point: BEP = Fixed Cost / (Price - Variable Cost per unit).

Tugas Anda:
1. Hitung BEP dalam units (kamar)
2. Hitung BEP dalam rupiah
3. Hitung margin of safety (selisih okupansi aktual vs BEP)
4. Analisis apakah pricing saat ini optimal
5. Beri rekomendasi pricing jika diperlukan

Return JSON:
{
  "bepUnits": number,
  "bepRupiah": number,
  "currentOccupancy": number,
  "marginOfSafetyPercent": number,
  "isProfitable": boolean,
  "pricingAnalysis": "analisis singkat",
  "recommendation": "rekomendasi",
  "suggestedPriceAdjustment": number | null
}
`;

export const BCG_SYSTEM_PROMPT = `...`;  // akan diisi saat implementasi
export const ANSOFF_SYSTEM_PROMPT = `...`;
export const INVESTMENT_SYSTEM_PROMPT = `...`;
export const FORECAST_SYSTEM_PROMPT = `...`;
export const MOTIVATION_SYSTEM_PROMPT = `...`;
export const NARRATIVE_SYSTEM_PROMPT = `...`;
// ... semua prompt per framework
```

### 8.4 AI DeepSeek Client (`ai-deepseek.client.ts`)

```typescript
@Injectable()
export class DeepseekClient {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.deepseek.com/v1';

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
  }

  async analyze(prompt: AiPrompt): Promise<AiResponse> {
    const response = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/chat/completions`, {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: prompt.systemPrompt },
          { role: 'user', content: prompt.userPrompt },
        ],
        response_format: prompt.responseFormat === 'json' ? { type: 'json_object' } : undefined,
        max_tokens: prompt.maxTokens || 2000,
        temperature: 0.3,  // rendah agar konsisten
      }, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        timeout: 30_000,
      })
    );

    const content = response.data.choices[0].message.content;
    return JSON.parse(content) as AiResponse;
  }

  // Fallback: kalau DeepSeek down atau timeout
  async withFallback(prompt: AiPrompt): Promise<AiResponse> {
    try {
      return await this.analyze(prompt);
    } catch (error) {
      // Return cached response kalau ada, atau throw error
      throw new Error(`DeepSeek API failed: ${error.message}`);
    }
  }
}
```

---

## 9. Prompt Template Examples

### 9.1 SWOT Analysis — Full Prompt

**System Prompt:**
```
Anda adalah Senior Business Strategist untuk bisnis kost di Surabaya, Indonesia.
Anda akan menerima data operasional real dari sistem KOST48.
Tugas Anda: isi 4 kuadran SWOT (Strengths, Weaknesses, Opportunities, Threats) 
dengan minimal 3 poin per kuadran.

Panduan:
- Strengths & Weaknesses: FAKTOR INTERNAL berdasarkan data yang diberikan
- Opportunities & Threats: FAKTOR EKSTERNAL berdasarkan knowledge pasar kost Surabaya
- Setiap poin harus SPESIFIK, jangan general
- Sertakan evidence dari data untuk setiap poin

Return format JSON SAJA:
{
  "strengths": [{ "point": "...", "evidence": "...", "impact": "HIGH/MEDIUM/LOW" }],
  "weaknesses": [...],
  "opportunities": [...],
  "threats": [...],
  "overallAssessment": "1 paragraf ringkasan"
}
```

**User Prompt (auto-generated from data pipeline):**
```
DATA OPERASIONAL KOST48 — Juni 2026:

Occupancy Rate: 85%
Total Revenue: Rp 45.000.000
Net Profit: Rp 12.000.000
Net Profit Margin: 26.7%
Overdue Invoices: 3 (Rp 4.500.000)
Pending Payments: 2
Active Stays: 34
Total Rooms: 40
Open Tickets: 5
Staff Count: 3

TREN 6 BULAN:
  Jan: Revenue Rp 38jt, Expense Rp 25jt, Net Rp 13jt
  Feb: Revenue Rp 40jt, Expense Rp 26jt, Net Rp 14jt
  Mar: Revenue Rp 42jt, Expense Rp 27jt, Net Rp 15jt
  Apr: Revenue Rp 41jt, Expense Rp 28jt, Net Rp 13jt
  May: Revenue Rp 44jt, Expense Rp 30jt, Net Rp 14jt
  Jun: Revenue Rp 45jt, Expense Rp 33jt, Net Rp 12jt
```

### 9.2 Break-even Analysis — Full Prompt

**System Prompt:**
```
Anda adalah Financial Analyst untuk bisnis kost KOST48.
Hitung Break-even Point dan analisis profitabilitas.

Rumus:
  BEP (units) = Fixed Cost / (Price per unit - Variable Cost per unit)
  Margin of Safety = (Current Occupancy - BEP Units) / Current Occupancy × 100

Interpretasi:
- Jika okupansi saat ini > BEP → BISNIS UNTUNG
- Jika okupansi saat ini = BEP → BREAK EVEN
- Jika okupansi saat ini < BEP → BISNIS RUGI

Return JSON:
{
  "bepUnits": number,
  "bepRupiah": number,
  "currentOccupancyUnits": number,
  "currentOccupancyPercent": number,
  "marginOfSafetyPercent": number,
  "isProfitable": boolean,
  "status": "PROFITABLE" | "BREAK_EVEN" | "LOSS",
  "pricingAnalysis": "analisis singkat dalam Bahasa Indonesia",
  "recommendation": "rekomendasi dalam Bahasa Indonesia",
  "suggestedPriceAdjustment": number | null
}
```

### 9.3 Narasi Bisnis Harian — Full Prompt

**System Prompt:**
```
Anda adalah Business Intelligence Assistant untuk KOST48.
Berdasarkan data harian, buat NARASI BISNIS dalam 3-4 paragraf.

Format:
1. Paragraf 1 — Ringkasan performa bulan ini (grade, score, sorotan)
2. Paragraf 2 — Analisis detail: revenue, expense, occupancy, cashflow
3. Paragraf 3 — Rekomendasi konkret untuk owner
4. Bonus: Prediksi 1 bulan ke depan

Return JSON:
{
  "title": "Judul singkat",
  "summary": "paragraf 1",
  "detailAnalysis": "paragraf 2",
  "recommendations": ["rekom 1", "rekom 2", "rekom 3"],
  "prediction": "paragraf bonus",
  "riskFlags": [{ "type": "overdue" | "occupancy" | "expense", "level": "LOW/MEDIUM/HIGH", "message": "..." }]
}
```

---

## 10. Scheduler Design

### Cron Jobs

```typescript
// backend/src/modules/ai/ai-scheduler.ts

@Injectable()
export class AiScheduler {
  constructor(
    private readonly aiService: AiService,
    private readonly dataPipeline: AiDataPipeline,
  ) {}

  // ⏰ Harian jam 07:00 WIB — Narasi Bisnis Harian
  @Cron('0 7 * * *', { timeZone: 'Asia/Jakarta' })
  async dailyBusinessNarrative() {
    const data = await this.dataPipeline.collectBusinessData();
    await this.aiService.analyze('NARRATIVE', data);
  }

  // ⏰ Harian jam 07:30 WIB — Alert check
  @Cron('30 7 * * *', { timeZone: 'Asia/Jakarta' })
  async dailySignalCheck() {
    // Cek overdue, pending, occupancy drop → kirim notifikasi jika perlu
    const signals = await this.aiService.checkSignals();
    if (signals.length > 0) {
      await this.notificationService.sendOwnerAlert(signals);
    }
  }

  // ⏰ Mingguan Senin 08:00 — SWOT
  @Cron('0 8 * * 1', { timeZone: 'Asia/Jakarta' })
  async weeklySwotAnalysis() {
    const data = await this.dataPipeline.collectBusinessData();
    await this.aiService.analyze('SWOT', data);
  }

  // ⏰ Mingguan Senin 08:30 — Market Research
  @Cron('30 8 * * 1', { timeZone: 'Asia/Jakarta' })
  async weeklyMarketResearch() {
    const data = await this.dataPipeline.collectBusinessData();
    await this.aiService.analyze('MARKET_RESEARCH', data);
  }

  // ⏰ Bulanan tanggal 1 jam 09:00 — Deep Dive
  @Cron('0 9 1 * *', { timeZone: 'Asia/Jakarta' })
  async monthlyDeepDive() {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const data = await this.dataPipeline.collectBusinessData(year, month);
    
    await Promise.all([
      this.aiService.analyze('BCG', data),
      this.aiService.analyze('ANSOFF', data),
      this.aiService.analyze('BEP', data),
      this.aiService.analyze('FORECAST', data),
      this.aiService.analyze('BUDGET', data),
      this.aiService.analyze('7P', data),
      this.aiService.analyze('MOTIVATION', data),
    ]);
  }

  // ⏰ Bulanan tanggal 1 jam 10:00 — Report generation
  @Cron('0 10 1 * *', { timeZone: 'Asia/Jakarta' })
  async monthlyReportGeneration() {
    // Kumpulin semua analysis yang sudah di-generate → jadi 1 laporan owner
    await this.aiService.compileMonthlyReport();
  }

  // ⏰ Triwulan (1 Jan, 1 Apr, 1 Jul, 1 Okt) jam 11:00 — PESTLE
  @Cron('0 11 1 1,4,7,10 *', { timeZone: 'Asia/Jakarta' })
  async quarterlyPestleAnalysis() {
    const data = await this.dataPipeline.collectBusinessData();
    await this.aiService.analyze('PESTLE', data);
  }

  // ⏰ Mingguan — AI Interview (bergilir tenant/staff)
  @Cron('0 12 * * 5', { timeZone: 'Asia/Jakarta' })  // Jumat 12:00
  async weeklyAiInterview() {
    await this.aiService.interviewRandomTenant();  // interview 1 tenant random
  }
}
```

### Event-Driven Triggers

```typescript
// Selain cron, AI juga bisa dipicu oleh event bisnis

@Injectable()
export class AiEventTriggers {
  // Ketika okupansi berubah signifikan (+/- 10% dalam 1 minggu)
  @OnEvent('occupancy.sharpChange')
  async onOccupancyChange(payload: { previous: number; current: number }) {
    await this.aiService.analyze('ANSOFF', await this.dataPipeline.collectBusinessData());
  }

  // Ketika overdue melebihi threshold
  @OnEvent('overdue.thresholdExceeded')
  async onOverdueAlert(payload: { count: number; totalRupiah: number }) {
    await this.aiService.generateOverdueActionPlan(payload);
  }

  // Ketika milestone tercapai (misal: occupancy 100%, revenue tertinggi)
  @OnEvent('milestone.reached')
  async onMilestone(payload: MilestoneEvent) {
    await this.aiService.generateMilestoneNarrative(payload);
  }

  // Manual trigger dari owner via API
  @OnEvent('analysis.requested')
  async onManualRequest(payload: { framework: FrameworkType; ownerInput?: any }) {
    await this.aiService.analyze(payload.framework, await this.dataPipeline.collectBusinessData(), payload.ownerInput);
  }
}
```

---

## 11. Frontend AI Components

### 11.1 AI Analysis Panel (Reusable Component)

```tsx
// frontend/src/components/ai/AiAnalysisPanel.tsx

type AiAnalysisPanelProps = {
  framework: FrameworkType;
  title: string;
  description: string;
  autoGenerate: boolean;      // true kalau cron handle
  lastGenerated?: string;     // timestamp
  onGenerate?: () => Promise<void>;
  result?: AiAnalysisResult;  // dari DB
  onRefresh?: () => void;
};

export function AiAnalysisPanel({
  framework, title, description, autoGenerate,
  lastGenerated, onGenerate, result, onRefresh,
}: AiAnalysisPanelProps) {
  return (
    <Card className="ai-analysis-panel">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div>
          <strong>🤖 {title}</strong>
          {autoGenerate && <Badge bg="info" className="ms-2">Auto</Badge>}
        </div>
        <div className="d-flex gap-2">
          {lastGenerated && (
            <small className="text-muted">
              Terakhir: {formatDateTimeWib(lastGenerated)}
            </small>
          )}
          {!autoGenerate && onGenerate && (
            <Button size="sm" onClick={onGenerate}>
              Generate Sekarang
            </Button>
          )}
          {onRefresh && (
            <Button size="sm" variant="outline-secondary" onClick={onRefresh}>
              ↩
            </Button>
          )}
        </div>
      </Card.Header>
      <Card.Body>
        {!result ? (
          <EmptyState 
            icon="⏳" 
            title={autoGenerate ? "Menunggu jadwal AI..." : "Belum ada analisis"}
            description={description}
          />
        ) : (
          <AiResultRenderer framework={framework} result={result} />
        )}
      </Card.Body>
    </Card>
  );
}
```

### 11.2 AI Result Renderer (per Framework)

```tsx
// frontend/src/components/ai/AiResultRenderer.tsx

function AiResultRenderer({ framework, result }: { framework: FrameworkType; result: AiAnalysisResult }) {
  switch (framework) {
    case 'SWOT':
      return <SwotResultView data={result.output} />;
    case 'BEP':
      return <BepResultView data={result.output} />;
    case 'NARRATIVE':
      return <NarrativeResultView data={result.output} />;
    case 'BCG':
      return <BcgMatrixView data={result.output} />;
    case 'ANSOFF':
      return <AnsoffMatrixView data={result.output} />;
    // ...
  }
}

// Contoh: SWOT result
function SwotResultView({ data }: { data: SwotOutput }) {
  return (
    <Row className="g-3">
      <Col md={6}>
        <Card className="h-100 border-success">
          <Card.Body>
            <h6 className="text-success">💪 Strengths</h6>
            {data.strengths.map((s, i) => (
              <div key={i} className="mb-2">
                <strong>{s.point}</strong>
                <small className="text-muted d-block">{s.evidence}</small>
              </div>
            ))}
          </Card.Body>
        </Card>
      </Col>
      <Col md={6}>
        <Card className="h-100 border-danger">
          <Card.Body>
            <h6 className="text-danger">⚠️ Weaknesses</h6>
            {data.weaknesses.map((w, i) => (...))}
          </Card.Body>
        </Card>
      </Col>
      <Col md={6}>
        <Card className="h-100 border-primary">
          <Card.Body>
            <h6 className="text-primary">🚀 Opportunities</h6>
            {data.opportunities.map((o, i) => (...))}
          </Card.Body>
        </Card>
      </Col>
      <Col md={6}>
        <Card className="h-100 border-warning">
          <Card.Body>
            <h6 className="text-warning">🚨 Threats</h6>
            {data.threats.map((t, i) => (...))}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}

// Contoh: BEP result dengan chart
function BepResultView({ data }: { data: BepOutput }) {
  return (
    <div>
      <Row className="g-3 mb-3">
        <Col md={4}>
          <MetricCard title="BEP Units" value={data.bepUnits} suffix="kamar" />
        </Col>
        <Col md={4}>
          <MetricCard title="BEP Rupiah" value={`Rp ${formatRupiah(data.bepRupiah)}`} />
        </Col>
        <Col md={4}>
          <MetricCard 
            title="Margin of Safety" 
            value={`${data.marginOfSafetyPercent}%`}
            status={data.marginOfSafetyPercent > 20 ? 'SUCCESS' : 'WARNING'}
          />
        </Col>
      </Row>
      {data.recommendation && (
        <Alert variant={data.isProfitable ? 'success' : 'danger'}>
          💡 {data.recommendation}
        </Alert>
      )}
      {/* Recharts bar chart: revenue vs cost vs BEP line */}
    </div>
  );
}
```

### 11.3 Owner Dashboard — AI Summary Section

```tsx
// Di OwnerDashboardPage.tsx — ditambahkan setelah KPI cards

<Card className="mb-3 ai-narrative-card">
  <Card.Body>
    <div className="d-flex justify-content-between align-items-start mb-2">
      <h5 className="mb-0">🤖 Analisis AI — {monthLabel(ym)}</h5>
      <Badge bg={latestAnalysis ? 'success' : 'secondary'}>
        {latestAnalysis ? `Update ${formatTimeAgo(latestAnalysis.generatedAt)}` : 'Menunggu...'}
      </Badge>
    </div>
    
    {latestAnalysis ? (
      <>
        <h6>{latestAnalysis.title}</h6>
        <p>{latestAnalysis.summary}</p>
        {latestAnalysis.recommendations.length > 0 && (
          <div>
            <strong>Rekomendasi:</strong>
            <ul>
              {latestAnalysis.recommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </>
    ) : (
      <div className="text-center py-3">
        <Spinner animation="border" size="sm" />
        <span className="ms-2">AI sedang menyusun analisis bisnis...</span>
      </div>
    )}
  </Card.Body>
</Card>
```

---

## 12. Arsitektur Teknis

### 12.1 Frontend New Pages & Components

| Path | Komponen | Frameworks Used | AI Integration |
|---|---|---|---|
| `/owner-dashboard` | `OwnerDashboardPage.tsx` (rewrite) | recharts, react-bootstrap | AI Narrative + Signals |
| `/owner-dashboard?tab=strategy` | `StrategyTab.tsx` | Canvas API, recharts | SWOT, Ansoff, BCG, PESTLE, Porter, Force Field |
| `/owner-dashboard?tab=marketing` | `MarketingTab.tsx` | recharts | Market Research, 7P, Sales Forecast |
| `/owner-dashboard?tab=human` | `HumanCapitalTab.tsx` | recharts, survey components | Maslow, SDT, Motivation |
| `/owner-dashboard?tab=organization` | `OrganizationTab.tsx` | Drag & drop org chart | Gantt, Crisis, Objectives |
| `/owner-dashboard?tab=finance` | `FinanceStrategyTab.tsx` | recharts, calculators | BEP, Investment, Budget, Gearing |
| `/owner/bmc` | `BusinessModelCanvasPage.tsx` | 9 blok interaktif | AI saran konten per blok |
| `/owner/swot` | `SwotAnalysisPage.tsx` | 4 kuadran | 🦾 AI auto-generate |
| `/owner/investment` | `InvestmentAppraisalPage.tsx` | Payback/ARR/NPV | 🦾 AI rekomendasi |
| `/owner/breakeven` | `BreakEvenPage.tsx` | BEP chart | 🦾 AI auto-calculate |
| `/owner/forecast` | `SalesForecastPage.tsx` | Forecast chart | 🦾 AI predict |

### 12.2 Backend New Modules

| Module | Endpoints | AI Role |
|---|---|---|
| **ai** | `POST /ai/narrative`, `POST /ai/interview`, `POST /ai/recommend`, `POST /ai/forecast`, `POST /ai/analyze/:framework` | 🦾 **AI Engine utama** |
| **ai** | `GET /ai/analyses?type=SWOT`, `GET /ai/latest/:framework` | Read hasil AI |
| **ai** | `POST /ai/scheduler/trigger` | Trigger manual cron |
| **strategy** | `GET /strategy/bmc`, `PUT /strategy/bmc/:blokId` | — (manual edit) |
| **strategy** | `GET /strategy/swot`, `PUT /strategy/swot/:quadrant` | — (manual override) |
| **strategy** | `GET /strategy/objectives`, `PUT /strategy/objectives` | — (manual) |
| **strategy** | `GET /strategy/stakeholders`, `PUT /strategy/stakeholders` | — (manual) |
| **strategy** | `GET /strategy/decision-tree`, `POST /strategy/decision-tree` | 🦾 AI assisted |
| **strategy** | `GET /strategy/force-field`, `PUT /strategy/force-field` | 🦾 AI saran |
| **marketing** | `GET /marketing/stats`, `GET /marketing/channels` | — (data) |
| **marketing** | `GET /marketing/forecast`, `POST /marketing/forecast` | 🦾 AI forecast |
| **finance-strategy** | `GET /finance/investment`, `POST /finance/investment/calculate` | 🦾 AI calculate |
| **finance-strategy** | `GET /finance/breakeven`, `POST /finance/breakeven/calculate` | 🦾 AI calculate |
| **finance-strategy** | `GET /finance/budget`, `PUT /finance/budget/:id` | 🦾 AI variance |
| **finance-strategy** | `GET /finance/gearing` | — (calculation) |
| **human-capital** | `GET /human/survey`, `POST /human/survey/response` | 🦾 AI interview |
| **human-capital** | `GET /human/org-chart`, `PUT /human/org-chart` | — (manual) |
| **human-capital** | `GET /human/motivation/scores` | 🦾 AI analyze |
| **operations** | `GET /operations/gantt`, `PUT /operations/gantt/:taskId` | — (manual) |
| **operations** | `GET /operations/crisis-plans`, `PUT /operations/crisis-plans` | 🦾 AI generate |

### 12.3 Database Schema (New Tables)

```prisma
// ========================
// AI ENGINE TABLES
// ========================

model AiAnalysis {
  id          Int       @id @default(autoincrement())
  type        String    // 'narrative' | 'swot' | 'ansoff' | 'bcg' | 'bep' | 'forecast' | 'investment' | 'budget' | 'motivation' | 'market_research' | '7p' | 'crisis' | 'pestle' | 'porter_5'
  framework   String    // enum untuk filter
  input       Json      // BusinessData snapshot
  output      Json      // AI response
  status      String    @default('SUCCESS') // 'SUCCESS' | 'FAILED' | 'PENDING'
  errorMsg    String?
  generatedAt DateTime  @default(now())
  createdAt   DateTime  @default(now())

  @@index([type, generatedAt])
  @@index([framework])
}

model AiInterview {
  id          Int       @id @default(autoincrement())
  respondentId Int?
  respondentRole String // 'TENANT' | 'STAFF'
  topic       String    // 'motivation' | 'satisfaction' | 'feedback'
  questions   Json      // Array pertanyaan
  responses   Json?     // Array jawaban
  insights    Json?     // AI analysis after response
  status      String    @default('PENDING') // 'PENDING' | 'COMPLETED' | 'SKIPPED'
  sentAt      DateTime?
  completedAt DateTime?
  createdAt   DateTime  @default(now())
}

model AiSchedulerLog {
  id          Int       @id @default(autoincrement())
  task        String    // 'daily_narrative' | 'weekly_swot' | etc
  status      String    // 'RUNNING' | 'SUCCESS' | 'FAILED'
  startedAt   DateTime
  completedAt DateTime?
  errorMsg    String?
  analysisId  Int?      // relation to AiAnalysis
}

// ========================
// STRATEGY TABLES
// ========================

model BmcBlock {
  id          Int      @id @default(autoincrement())
  blockKey    String   @unique // 'value_proposition' | 'customer_segments' | etc
  label       String
  content     Json?
  updatedAt   DateTime @updatedAt
}

model SwotItem {
  id        Int      @id @default(autoincrement())
  quadrant  String   // 'strengths' | 'weaknesses' | 'opportunities' | 'threats'
  content   String
  source    String   @default('AI') // 'AI' | 'MANUAL'
  analysisId Int?    // relation to AiAnalysis (kalau dari AI)
  createdAt DateTime @default(now())
}

model BusinessObjective {
  id        Int      @id @default(autoincrement())
  level     String   // 'vision' | 'mission' | 'strategic' | 'tactical' | 'operational'
  content   String
  order     Int      @default(0)
  kpiTarget String?
  progress  Float?   // 0-100 (auto dari KPI data)
  createdAt DateTime @default(now())
}

model StakeholderMapItem {
  id        Int      @id @default(autoincrement())
  label     String
  power     Int      // 1-5
  interest  Int      // 1-5
  notes     String?
}

model DecisionTree {
  id        Int      @id @default(autoincrement())
  title     String
  nodes     Json     // Tree structure
  createdAt DateTime @default(now())
}

model ForceFieldItem {
  id        Int      @id @default(autoincrement())
  direction String   // 'driving' | 'restraining'
  label     String
  weight    Int      // 1-5
  decision  String
}

// ========================
// MARKETING TABLES
// ========================

model MarketingStat {
  id        Int      @id @default(autoincrement())
  year      Int
  month     Int
  visitors  Int      @default(0)
  bookings  Int      @default(0)
  channels  Json?
}

model SalesForecast {
  id        Int      @id @default(autoincrement())
  year      Int
  month     Int
  actual    Float?
  predicted Float?
  method    String
  analysisId Int?
}

// ========================
// FINANCE STRATEGY TABLES
// ========================

model InvestmentAppraisal {
  id            Int      @id @default(autoincrement())
  title         String
  initialInvestment Float
  cashFlows     Json
  discountRate  Float?
  paybackPeriod Float?
  arr           Float?
  npv           Float?
  aiRecommendation Json?
  createdAt     DateTime @default(now())
}

model BudgetItem {
  id        Int      @id @default(autoincrement())
  category  String
  period    String   // '2026-03'
  budgetAmount Float
  note      String?
}

// ========================
// HUMAN CAPITAL TABLES
// ========================

model SurveyResponse {
  id          Int      @id @default(autoincrement())
  respondentId Int?
  respondentRole String
  surveyType  String
  responses   Json
  aiInsights  Json?
  createdAt   DateTime @default(now())
}

model OrgStructure {
  id        Int      @id @default(autoincrement())
  label     String
  parentId  Int?     @default(0)
  role      String
  userId    Int?
  order     Int      @default(0)
}

model MotivationScore {
  id        Int      @id @default(autoincrement())
  period    String   // '2026-06'
  theory    String   // 'maslow' | 'herzberg' | 'adams' | 'pink' | 'sdt'
  scores    Json
  insights  Json?
  analysisId Int?
  createdAt DateTime @default(now())
}

// ========================
// OPERATIONS TABLES
// ========================

model GanttTask {
  id          Int      @id @default(autoincrement())
  title       String
  startDate   DateTime
  endDate     DateTime
  progress    Int      @default(0)
  parentId    Int?     @default(0)
  order       Int      @default(0)
  status      String   @default('PENDING')
}

model CrisisPlan {
  id          Int      @id @default(autoincrement())
  scenario    String
  probability String
  impact      String
  plan        String
  aiGenerated Boolean  @default(false)
  analysisId  Int?
  createdAt   DateTime @default(now())
}
```

---

## 13. Timeline & Prioritas (Extended)

### Phase 0 — AI Engine Foundation → 3-4 Hari
- [ ] Install DeepSeek SDK / buat API client wrapper
- [ ] Buat `ai-data-pipeline.ts` — auto-fetch semua data bisnis dari DB
- [ ] Buat `ai-theory-engine.ts` — struktur prompt builder per framework
- [ ] Buat `ai-prompt-store.ts` — 5 prompt pertama (Narrative, SWOT, BEP, BCG, Ansoff)
- [ ] Buat `ai-deepseek.client.ts` — call + retry + timeout + fallback
- [ ] Buat `ai-scheduler.ts` — cron: harian, mingguan, bulanan
- [ ] Buat tabel `AiAnalysis` + `AiSchedulerLog` di Prisma
- [ ] Test: call DeepSeek → dapat JSON → save ke DB

### Phase 1 — Path A (Quick Win Dashboard) → 1-2 Hari (parallel)
- [ ] Install recharts + rewrite OwnerDashboardPage
- [ ] Backend: support trendMonths dinamis
- [ ] Test & verify

### Phase 2 — Core Finance Strategy → 3-4 Hari
- [ ] Break-even Analysis (BEP calculator + chart + AI auto)
- [ ] Investment Appraisal (Payback/ARR/NPV calculator + AI rekomendasi)
- [ ] Budget vs Actual (CRUD + variance analysis + AI analysis)
- [ ] Gearing Ratio (calculation + gauge chart)

### Phase 3 — Marketing & Forecasting → 3-4 Hari
- [ ] Marketing stats endpoint (visitor, booking conversion, channel)
- [ ] Sales Forecasting (regression + AI predict + seasonal)
- [ ] Market Research (AI auto survey + report)
- [ ] Frontend: Marketing tab + Forecast page

### Phase 4 — Human Capital → 4-5 Hari
- [ ] Backend: survey module + org structure module
- [ ] AI Interview engine (kirim pertanyaan, kumpulkan jawaban, analisis)
- [ ] Frontend: Maslow pyramid visual
- [ ] Motivation: Herzberg, Taylor, Adams, Pink survey + scorecard (AI analyzed)
- [ ] SDT: Autonomy, Competence, Relatedness survey

### Phase 5 — Strategy Frameworks → 5-6 Hari
- [ ] Business Model Canvas (9 blok interaktif + AI saran)
- [ ] SWOT Analysis (4 kuadran + 🦾 AI auto mingguan)
- [ ] Ansoff Matrix + BCG Matrix (🦾 AI auto bulanan)
- [ ] Porter's 5 Forces + Generic Strategies (🦾 AI triwulan)
- [ ] PESTLE/STEEPLE (🦾 AI triwulan)
- [ ] 7P Marketing Mix (🦾 AI auto bulanan)
- [ ] Business Objectives Hierarchy (🦾 AI review)
- [ ] Stakeholder Mapping (Power/Interest grid)
- [ ] Growth & Evolution Tracker (🦾 AI triwulan)
- [ ] Decision Trees (🦾 AI on-demand)
- [ ] Force Field Analysis (🦾 AI on-demand)

### Phase 6 — Operations & Planning → 3-4 Hari
- [ ] Gantt Charts (project timeline)
- [ ] Crisis Management + Contingency Plans (🦾 AI generate)
- [ ] Location analysis (opsional)

### Phase 7 — AI Deep Integration & Polish → 4-5 Hari
- [ ] Integrasi semua framework ke scheduler
- [ ] Buat frontend AI Panel component reusable
- [ ] Buat notifikasi: "AI SWOT Analysis baru tersedia"
- [ ] Deduplikasi: jangan generate ulang kalau data belum berubah signifikan
- [ ] Cache: analysis cukup valid 1 hari/minggu sesuai jadwal
- [ ] Owner override: owner bisa edit/edit hasil AI
- [ ] Feedback loop: "Apakah analisis ini membantu?" → improve prompt

### Total Estimasi: ~30-35 Hari Pengerjaan (tidak termasuk review)

---

## 14. Open Questions

1. **DeepSeek API Key** — Sudah punya? Belum daftar? Perlu bantuan setup?
2. **Marketing Data** — Data visitor website dari mana? Google Analytics? Manual?
3. **Front-end halaman baru** — Tab di `/owner-dashboard` atau halaman sidebar terpisah?
4. **Org Chart** — Statis (drag & drop) atau sinkron dengan user roles di DB?
5. **Survey/Interview** — Notifikasi in-app saja? Atau perlu integrasi WhatsApp?
6. **Budget Data** — Input manual owner? Auto-suggest dari expense history?
7. **Investment Appraisal** — Owner input manual? Auto-suggest dari maintenance history?
8. **Motivation Surveys** — Frekuensi: bulanan? Triwulan? Per-event?
9. **Pricing Strategy** — Mau AI suggest harga kamar dari BEP analysis?
10. **DeepSeek vs OpenAI vs Claude** — Ada preferensi provider AI?
11. **Dokumentasi** — Setelah roadmap clear, update `01_CONTRACTS.md`, `02_PLAN.md`, `CHECKLIST.md`, `CHANGELOG.md`, `04_JOURNAL.md`

---

> **Next Step:** Jawab open questions (bisa sebagian) dan toggle ke ACT Mode untuk mulai implementasi Phase 0 (AI Engine) + Phase 1 (Quick Win Dashboard) secara parallel.
> **Catatan:** Jangan khawatir soal kompleksitas — AI Engine dirancang modular. Kita bisa mulai dari 3 prompt dulu (Narrative, SWOT, BEP) dan expand bertahap.