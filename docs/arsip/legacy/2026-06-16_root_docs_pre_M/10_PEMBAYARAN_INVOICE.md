# DOSSIER 10 — PEMBAYARAN & INVOICE
**Domain:** alur uang masuk inti — bukti bayar tenant, review/approve admin, invoice & pembayaran manual, meter reading. **Flow 3 & 4.**
**Status:** 🟢 KUAT secara arsitektur (lock, cap, reversal blocking). Sisa: penegakan no-partial di titik approve + guard hapus payment.
**File inti:** `payment-submissions.service.ts` (1.564 baris — terbesar), `invoice-payments.service.ts` (283), `invoices.service.ts` (535), `meter-readings.service.ts`.

---
## 1. Aturan bisnis (sumber: keputusan owner — lihat `03_KEPUTUSAN_OWNER.md`)
- **NO-PARTIAL MENYELURUH (D-02):** nominal pembayaran yang sah HANYA: (a) DP 30% persis, atau (b) pelunasan penuh = sisa invoice + sisa deposit. Jalur invoice-only (renewal/utilitas) wajib LUNAS penuh. Tidak ada cicilan di mana pun.
- **Gate dua-nominal-sah A18** sudah ada di `createSubmission:122-135`; WAJIB direplikasi di `approveSubmission` (lihat task F1-1R).
- **Admin tak boleh hapus/ubah payment kamar OCCUPIED (GAP #3):** payment berjurnal sudah diblokir; payment tanpa-jurnal masih bisa dihapus saat promoted → harus diberi guard.
- Invoice status teknis tetap **DRAFT → ISSUED → PARTIAL → PAID / CANCELLED**. `PARTIAL` sah hanya sebagai hasil DP 30% yang tepat; cicilan dengan nominal bebas dilarang.
- Pembayaran booking WAJIB lewat approve bukti (bukan pembayaran manual) — guard A1 di `invoice-payments.create:142-150`.
- Reversal jurnal saat cancel = BLOCKING (pola A8) di semua jalur.

## 2. Peta kode (detail chain di `02_FLOW_MAP.md` §3-4)
| Aksi | Lokasi |
|---|---|
| Tenant upload bukti | `payment-submissions.service.ts:52` createSubmission; gate nominal :122-135 |
| Approve admin (aktivasi kamar+meter+first-paid-wins) | `:353` approveSubmission; split rent/deposit :406-430; OCCUPIED :587; promosi meter :630-686 |
| Batal pesaing first-paid-wins | `:736` cancelCompetingUnpaidBookingsTx |
| Pembayaran manual admin | `invoice-payments.service.ts:113` create (lock+anti-overpay), :237 remove (guard jurnal :245) |
| Issue/cancel invoice | `invoices.service.ts:444` issue, :480 cancel (lock+reversal blocking) |

## 3. Temuan audit (semua, dua-lapis: dampak bisnis + lokasi/fix)
> 🔄 **SINKRON KODE (2026-06-15, audit menyeluruh):** tabel di bawah BASI — item berikut SUDAH SELESAI di kode (terverifikasi langsung): **B-01/F1-1R** no-partial menyeluruh (`payment-submissions.service.ts:418-450` gate approve + `invoice-payments.service.ts:167-172,223-228` manual lunas penuh); **GAP#3/F1-2** guard payment OCCUPIED (`invoice-payments.service.ts:270-276`). Severity 🔴/🟠 di tabel = status historis, bukan TODO aktif.
| ID | Sev | Dampak bisnis | Lokasi kode | Fix / Task |
|---|---|---|---|---|
| B-01 | 🔴 P1 | GAP #1 sebagian tertutup; approve tidak re-validasi nominal dan pembayaran manual admin masih dapat mencatat nominal parsial. | `payment-submissions.service.ts` approve + `invoice-payments.service.ts` create/update | **F1-1R**: gate dua nominal booking; invoice-only/manual wajib lunas penuh |
| GAP#3/B-04 | 🟠 P2 | Admin bisa hapus payment kamar yang sudah ditempati bila jurnalnya gagal/skip → occupancy vs uang inkonsisten tanpa jejak. | `invoice-payments.service.ts:237` remove, :189 update | **F1-2**: 409 bila stay promoted / room OCCUPIED |
| F-09 | 🟠 P2 | Invoice DRAFT ikut dihitung pendapatan di laporan → revenue overstated. (Detail di `13_AKUNTANSI_LAPORAN`.) | reports/finance agregat | **F1-7** (lihat dossier 13) |
| B-09 | 🟡 P3 | Kebijakan posting jurnal tak konsisten: issue MELEMPAR bila gagal, tapi check-in/renew MENELAN error → invoice gagal-jurnal hanya tertangkap readiness. | `invoices.service.ts:136-137` vs `stays.service.ts:361-368` | Satukan pakai `resolveInvoiceAccountingMetadata` |
| B-11 | ✅ RESOLVED (F3-13, 2026-06-14) | Promosi meter dedupe per (room,utility,tanggal): bila ada reading di tanggal sama (rebooking sehari) dgn nilai BERBEDA, snapshot baru yang dibuang kini **dicatat `logger.warn`** → tak lagi diam-diam; admin diingatkan cek tagihan utilitas awal. Perilaku dedupe & bentuk response tak diubah (flag response = lanjutan opsional). | `payment-submissions.service.ts` (blok promote meter) | **F3-13 (B-11 selesai)** |
| F-29 | 🟡 INFO | `postPaymentReversalTx` = DEAD CODE (0 pemanggil); remove payment berjurnal kini diblokir. FLOW_MAP §4 lama menyebutnya → drift. | `accounting-posting.service.ts:741` | Hapus / dokumentasikan |
| B-02 | ✅ RESOLVED | Notif kalah-cepat sudah dua varian: tenant yang punya PaymentSubmission/DP tercatat diarahkan ke refund; tenant yang belum transfer diarahkan memilih kamar lain. Pencatatan bukti refund tetap F2-3b. | `payment-submissions.notifyLosingTenants` | **F2-3 selesai; F2-3b belum** |
| B-13 | ✅ positif | Tarif TERKUNCI setelah DP dibayar (tak bisa diubah saat approve) — cegah manipulasi. | `tenant-bookings.service.ts:326-344` | pertahankan |

## 4. Task (urutan & spec lengkap)
### F1-1R · 🔴 FASE 1 · No-partial menyeluruh
- **File:** `payment-submissions.service.ts` approve booking/invoice-only; `invoice-payments.service.ts` create/update pembayaran manual.
- **Spec:** (a) booking: replikasi gate createSubmission di approve — tolak bila amount bukan sisa DP tepat dan bukan pelunasan penuh; (b) submission invoice-only wajib sama dengan sisa tagihan; (c) pembayaran manual non-booking wajib melunasi sisa invoice, bukan membuat cicilan bebas.
- **Kriteria selesai:** DP tepat ✅; pelunasan tepat ✅; renewal/utilitas/manual lunas ✅; semua nominal kurang/aneh → 409; tsc 0.
- **Larangan:** JANGAN pakai spek V1 lama ("tolak bila < invoice+deposit") — itu menolak DP sah. **Stop:** struktur isBookingPath berubah → STOP.
### F1-2 · 🟠 FASE 1 · Guard remove/update payment OCCUPIED
- **File:** `invoice-payments.service.ts:189, :237`.
- **Spec:** dalam tx setelah lock, telusuri payment→invoice→stay; bila `initialMetersPromotedAt != null` ATAU room OCCUPIED → 409 "Tidak dapat mengubah/menghapus pembayaran kamar yang sudah ditempati."
- **Kriteria selesai:** remove pada stay promoted → 409 (meski tanpa jurnal); pada booking RESERVED → tetap bisa. **Stop:** relasi invoice→stay tak ada → STOP.

## 5. Invarian & UAT
- **Invarian:** total pembayaran ≤ invoice + sisa deposit; promosi meter & OCCUPIED hanya saat invoice PAID; satu pemenang per kamar; uang masuk = otomatisasi berhenti.
- **UAT:** (1) submit 600rb saat sisa DP 510rb & pelunasan 1.69jt → 409; (2) approve submission lama bernominal aneh → 409; (3) pembayaran manual 50% invoice non-booking → 409; (4) DP tepat → kamar terkunci; (5) pelunasan tepat → OCCUPIED + meter promoted; (6) hapus payment stay promoted tanpa jurnal → 409; (7) first-paid-wins + notif tenant kalah.
- **Prasyarat:** kerjakan SEBELUM deploy (Fase 1). Terkait deposit → dossier 12; akuntansi → dossier 13.
