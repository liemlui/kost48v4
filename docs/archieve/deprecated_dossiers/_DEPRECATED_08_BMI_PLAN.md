# KOST48 V5 — Business Management Intelligence (BMI) Plan
**Versi:** 2026-06-13 — ekstrak dari `archieve/05_BUSINESS_MANAGEMENT_INTELLIGENCE_PLAN.md`.
**Tujuan:** Rencana dashboard KPI, motivasi, dan analitik bisnis tingkat owner.

<!-- KOST48_DOCS_SYNC_20260612_BMI_PLAN -->

---

## 1. Visi BMI

Business Management Intelligence (BMI) adalah lapisan analitik di atas data operasional yang membantu owner:
- Memantau kesehatan bisnis secara real-time
- Mendeteksi anomali sebelum menjadi masalah besar
- Mengambil keputusan berbasis data, bukan intuisi
- Memotivasi staf dengan gamifikasi & KPI terukur

---

## 2. Dashboard Owner — Indikator Utama

### 2.1 Okupansi & Revenue
| Metrik | Definisi | Sumber Data |
|--------|----------|-------------|
| **Tingkat Okupansi** | % kamar berstatus OCCUPIED dari total kamar aktif | `Room.status` count |
| **Revenue Bulanan** | Total pendapatan sewa bulan berjalan | Invoice PAID (RENT line) |
| **Revenue Tahunan** | Akumulasi pendapatan sewa tahun berjalan | Invoice PAID (RENT line) |
| **Average Revenue per Room** | Revenue / jumlah kamar OCCUPIED | Kalkulasi client-side |

### 2.2 Piutang & Kolektibilitas
| Metrik | Definisi |
|--------|----------|
| **Total Piutang** | Sum invoice ISSUED - sum invoice PAID |
| **Piutang Jatuh Tempo** | Invoice ISSUED lewat `dueDate` |
| **Tingkat Kolektibilitas** | % invoice PAID dari total invoice ISSUED |
| **Aging Piutang** | Breakdown: <30 hari, 30-60, 60-90, >90 |

### 2.3 Deposit & Liability
| Metrik | Definisi |
|--------|----------|
| **Total Deposit Jaminan** | Sum `depositAmountRupiah` stay aktif |
| **Total Deposit Diterima** | Sum `depositPaidAmountRupiah` |
| **Liability HELD** | Deposit yang masih ditahan (belum disettle) |
| **Deposit Forfeit/Bulan** | Deposito hangus bulan berjalan |

### 2.4 Booking & Konversi
| Metrik | Definisi |
|--------|----------|
| **Booking Baru/Bulan** | Count stay baru bulan ini |
| **Conversion Rate** | % booking yang jadi OCCUPIED vs total booking |
| **First-Paid-Wins Rate** | % booking kalah first-paid-wins |
| **Average Time-to-Pay** | Rata-rata jam dari booking create ke DP approved |

---

## 3. Gamifikasi & Motivasi Staf

### 3.1 KPI Staf
| Metrik | Definisi | Bobot |
|--------|----------|-------|
| **Tiket Diselesaikan** | Count tiket closed bulan ini | 30% |
| **Rata-rata Waktu Penanganan** | `closedAt - createdAt` | 25% |
| **Rating Tenant** | Rata-rata rating dari StaffReview | 25% |
| **Room Readiness Time** | Waktu dari checkout → room AVAILABLE | 20% |

### 3.2 Gamifikasi
- **Level Staf** (bronze/silver/gold/platinum) berdasarkan skor akumulasi.
- **Badge** untuk milestone: 10/50/100 tiket, rating sempurna, room readiness <24 jam.
- **Leaderboard** bulanan (anonim bisa, opsional).
- Target: motivasi intrinsik, bukan kompetisi toxic.

### 3.3 Dashboard Staf
- "Tugas Hari Ini" — tiket assigned + checklist rutin.
- "Skor Saya" — donut gauge performa bulan ini.
- "Pencapaian" — badge & level.
- Fokus: satu halaman, tanpa data overload.

---

## 4. Anomali & Alert

### 4.1 Alert Otomatis
| Trigger | Alert |
|---------|-------|
| Kamar kosong > 7 hari | ⚠️ "Room X menganggur — pertimbangkan promosi" |
| Piutang > threshold | 🔴 "Total piutang melebihi batas" |
| Booking expiry tinggi | ⚠️ "X booking expired bulan ini — cek follow-up tenant" |
| Room readiness lambat | ⚠️ "Room X belum siap > 48 jam setelah checkout" |
| Deposit mismatch | 🔴 "Deposit reconciliation mismatch > 0" |

### 4.2 Analitik Prediktif (Future)
- Prediksi okupansi 1-3 bulan ke depan (berbasis `plannedCheckOutDate`).
- Deteksi tenant "berisiko" (sering telat bayar, rating rendah).
- Rekomendasi harga berdasarkan permintaan.

---

## 5. Arsitektur Teknis

### 5.1 Data Source
- Semua metrik dihitung dari data yang sudah ada (zero extra API call).
- Client-side aggregation via React Query + Recharts.
- Dashboard owner endpoint yang sudah expose data agregat.

### 5.2 Chart Library
- Recharts (`^3.8.1`) — satu-satunya chart library.
- Reusable components: `DonutGauge`, `HorizontalBarChart`, `TrendLine`.
- Chart panel kondisional (hanya bila data > 0).

---

## 6. Roadmap

| Fase | Konten | Prioritas |
|------|--------|-----------|
| **Fase 1** (sekarang) | Dashboard owner base + okupansi + revenue | ✅ Done (V5.10) |
| **Fase 2** | Piutang & kolektibilitas | 🔜 After V5.7 |
| **Fase 3** | Gamifikasi staf + KPI | 🔜 After staff-api |
| **Fase 4** | Anomali alert + prediktif | 📅 Future |

---

*Dokumen ini adalah blueprint. Implementasi bertahap sesuai prioritas Multi-App Shared-DB.*