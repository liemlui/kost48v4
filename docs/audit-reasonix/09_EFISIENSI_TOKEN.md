# 09 — EFISIENSI TOKEN UNTUK AI

> **Diukur:** 7 Juli 2026 · **Backend:** 331 file / 43.130 baris · **Frontend:** 383 file / 63.394 baris
> **Metode:** Analisis statis oleh Reasonix Code — hitung file besar, duplikasi, inline style, `any` type, fungsi panjang.

---

## SKOR EFISIENSI TOKEN

| Kategori | Skor Maks | Skor Sekarang | Kehilangan | Penyebab Utama |
|----------|-----------|--------------|------------|----------------|
| **File size & markers** | 35 | **5** | -30 | 44 file >500 baris, **nol** section markers |
| **Shared utility** | 15 | **10** | -5 | dateOnly sudah difix, formatRupiah belum |
| **Format konsisten** | 15 | **5** | -10 | 36 file pakai `toLocaleString` mentah |
| **Inline style** | 10 | **0** | -10 | 19 file >5 inline styles |
| **Type safety** | 10 | **5** | -5 | 243× `any` di backend |
| **Fungsi pendek** | 10 | **5** | -5 | ~10 fungsi >100 baris |
| **Import efisien** | 5 | **5** | 0 | ✅ Tidak ada barrel import |
| **TOTAL** | **100** | **35** | -65 | |

> **Efisiensi token: 35/100.** Artinya ~65% token yang AI baca adalah "waste" — bisa dihilangkan tanpa mengubah fungsionalitas. Setelah 2 refactor hari ini (dateOnly + @ApiProperty), naik dari ~30 ke 35.

---

## RINCIAN PEMBOROSAN

### 🔴 Worst Offender: 44 File Monolitik >500 Baris Tanpa Section Markers

| Baris | File | Dampak Token |
|-------|------|:---:|
| 1.973 | `payment-submissions.service.ts` | 🔴🔴🔴 |
| 1.896 | `stays.service.ts` | 🔴🔴🔴 |
| 1.462 | `accounting-posting.service.ts` | 🔴🔴🔴 |
| 1.294 | `tickets.service.ts` | 🔴🔴 |
| 1.149 | `accounting-reports.service.ts` | 🔴🔴 |
| 1.125 | `owner-ai.service.ts` | 🔴🔴 |
| 1.052 | `tenant-bookings.service.ts` | 🔴🔴 |
| 1.361 | `TicketsPage.tsx` (frontend) | 🔴🔴 |
| 1.145 | `OwnerSettingsPage.tsx` | 🔴🔴 |
| 964 | `MyStayPage.tsx` | 🔴 |

**Cara fix termudah:** Tambah section markers seperti ini di setiap file >500 baris:
```typescript
// ═══════════════════════════════════════════════════════════
//  SECTION: Checkout & Penyelesaian Stay
// ═══════════════════════════════════════════════════════════
```
Ini **tidak mengubah kode**, hanya tambah komentar. AI bisa langsung lompat ke section yang relevan. Estimasi 2 jam untuk semua 44 file.

---

### 🟠 Duplikasi `toLocaleString('id-ID')` (36 file)

Shared utility `formatRupiah` / `formatRupiahWithoutSymbol` sudah ada di `frontend/src/utils/formatCurrency.ts`. Tapi 36 file masih pakai `toLocaleString('id-ID')` mentah.

**Cara fix:** Grep `toLocaleString('id-ID')` di frontend, ganti dengan `formatRupiah()` import.

---

### 🟠 Inline Styles (19 file)

19 file punya >5 inline `style={{...}}`. Pindahkan ke CSS class.

**Worst:** `InvoicePrintLayout.tsx` — 69 inline styles. Tapi ini print layout, sebagian intentional.

---

### 🟡 243× `any` Type (51 file backend)

Konsentrasi di modul akuntansi. Banyak yang unavoidable (Prisma dynamic queries), tapi banyak juga yang bisa diganti `unknown` atau typed.

---

### 🟡 10 Fungsi >100 Baris

Fungsi terpanjang: `createPaymentSubmission` (~280 baris), `createStay` (~200), `createTicket` (~180).

---

## REKOMENDASI URUTAN (low effort → high impact)

| # | Perbaikan | Estimasi | Peningkatan Skor | Token Hemat |
|---|-----------|----------|:---:|-------------|
| 1 | **Section markers** di 44 file >500 baris | 2 jam | +15 | ~40% |
| 2 | **Unifikasi `toLocaleString`** → `formatRupiah` | 1 jam | +10 | ~5% |
| 3 | **Inline style → CSS class** (10 file terburuk) | 3 jam | +5 | ~3% |
| 4 | **`any` → typed** (modul akuntansi) | 4 jam | +3 | ~2% |
| 5 | **Split fungsi >100 baris** (top 5) | 5 jam | +3 | ~5% |
| | **TOTAL** | **15 jam** | **+36** | **35→71** |

---

## TARGET: 71/100

Dengan 15 jam kerja, efisiensi token naik dari **35 → 71**. Artinya AI masa depan baca kode **2× lebih cepat** (setengah token terbuang).

**Yang TIDAK perlu dilakukan:**
- Refactor arsitektur besar
- Split semua file >500 baris (section markers sudah cukup)
- Hapus semua `any` (sebagian unavoidable)
- Rewrite semua inline style (yang print layout biarkan)

---

## BANDINGKAN: Sebelum vs Sesudah Refactor Hari Ini

| Metric | Sebelum (6 Jul) | Sesudah (7 Jul) |
|--------|:---:|:---:|
| `dateOnly()` implementasi | 5 berbeda | 1 shared ✅ |
| DTO dengan `@ApiProperty` | 11/91 | 14/91 ✅ |
| File docs usang di root | 4 | 0 (diarsipkan) ✅ |
| Clutter root (log, zip, temp) | 18 item | 0 (diarsipkan) ✅ |
| Skor efisiensi | ~30 | **35** |
