# M16 — Audit 360° Flow Huni (Ringkasan)

> **Audit:** 6 Jul 2026 | **Fase P2** — Booking + Stay + Checkout | Detail → `docs/archieve/M16_AUDIT_360_FLOW_HUNI.md`

## Status: 🟢 93% SEHAT — 2 HIGH (FIXED), 4 MEDIUM, 1 LOW, 10 positif

Siklus huni implementasi **disiplin arsitektur tinggi**. Guard `FOR UPDATE` di setiap titik rawan race. Fase V override booking dipatuhi (Room AVAILABLE sampai bayar).

## Temuan HIGH (2) — ✅ FIXED

| ID | Temuan | Fix |
|----|--------|-----|
| **P2-01** | BookingSource hardcode `WEBSITE` di portal tenant → kanal tak terukur | Tambah `PORTAL` ke enum LeadSource (🧬) + ganti kode |
| **P2-02** | Tidak ada guard checkout ≤ `plannedCheckOutDate` di `createRequest` | Tambah guard tolak jika `requestedDate > plannedCheckOutDate` |

## MEDIUM (4) — 2 FIXED, 2 VALID

| ID | Temuan | Status |
|----|--------|--------|
| P2-03 | `LeadSource.WEBSITE` untuk public booking | ✅ VALID — memang dari website |
| P2-04 | `approveRequest` — `updateMany` tanpa lock stay | ✅ **FIXED** — tambah FOR UPDATE |
| P2-05 | Damage charge invoice setelah COMPLETED | ✅ VALID — desain intentional |
| P2-06 | Deposit cover meter guard inkonsistensi | ✅ VALID — defense-in-depth |

## LOW (1)
- P2-07: `linkTo` hardcode `/stays?status=BOOKINGS` → ✅ masih valid

## 10 Nota Positif
1. Fase V compliance penuh
2. FOR UPDATE di semua titik rawan
3. Cross-block checkout vs renew
4. Dedupe tiket CHECKOUT_INSPECTION
5. Room readiness gate
6. Rent-loyalty (D-16)
7. Deposit = Room.defaultDepositRupiah
8. Gate dua-nominal-sah approve booking
9. Notifikasi checkout lengkap
10. Raw SQL INSERT Booking
