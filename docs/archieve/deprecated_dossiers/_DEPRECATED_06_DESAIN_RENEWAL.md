# DESAIN FLOW RENEWAL (GAP #2) — deliverable desain task F2-1
**Tanggal:** 2026-06-13 · Sumber: keputusan owner R1-R4 (Bagian 2) + klarifikasi L1-L4 (Bagian 6) di `04_KEPUTUSAN_OWNER.md`.
**Status kode:** BELUM diimplementasi. `renew-requests.service.ts:77` approve LANGSUNG perpanjang tanpa fase DP. Dokumen ini = spesifikasi sebelum koding.

## 0. Prinsip inti (hasil wawancara)
1. Tenant lama yang **menyatakan perpanjang** punya **prioritas EKSKLUSIF atas kamarnya sampai hari-H** (tanggal kontrak habis) — **tanpa wajib bayar DP dulu** (klarifikasi L2 — INI MENGOREKSI R3 "first-paid-wins murni").
2. Tenant lama **WAJIB bayar DP 30% perpanjangan paling lambat hari-H** untuk mengamankan. Lewat hari-H tanpa DP → prioritas hilang, kamar dibuka untuk orang lain.
3. Tenant lama yang **memilih TIDAK perpanjang** → kamar langsung dibuka untuk pemesan baru (mulai tanggal checkout) seketika.
4. Setelah DP renewal masuk → **pelunasan maks H+7 dari pembayaran DP**; grace boleh melewati tanggal kontrak (tenant tetap huni selama grace), gagal lunas → forced checkout + DP hangus + potong deposit.
5. Pemesan baru selalu memesan **mulai tanggal checkout tenant lama** (tanpa overlap, L1).

## 1. State machine RenewRequest (status baru)
```
(tenant declare YES / prompt H-10..H-day)
        │
        ▼
   PENDING_DECISION ──(tenant: TIDAK)──► REJECTED_BY_TENANT → kamar dibuka publik seketika
        │ (tenant: YA)
        ▼
   AWAITING_DP  ──────────────────────────┐  prioritas eksklusif tenant lama s/d hari-H
        │ (tenant bayar DP 30% ≤ hari-H)   │
        │ admin approve bukti DP           │ (hari-H lewat, DP belum masuk)
        ▼                                  ▼
   DP_SECURED                         EXPIRED_PRIORITY → kamar dibuka publik (first-paid-wins orang baru)
        │ (pelunasan ≤ H+7 dari DP)
        │ admin approve pelunasan          (gagal lunas H+7)
        ▼                                  ▼
   COMPLETED (stay diperpanjang)      FORFEITED → DP hangus + forced checkout + potong deposit
```

## 2. Aturan per fase (file:baris yang disentuh)
| Fase | Aturan | Lokasi kode |
|---|---|---|
| Prompt | Auto-notif H-10/H-7/H-3/H-1/H-day "Perpanjang atau tidak?" (link portal). Tenant juga bisa ajukan sendiri kapan saja (R4). | `auto-ops.contractEndReminders` + `renew-requests.createRequest` |
| Tenant YA | Buat RenewRequest AWAITING_DP. Kamar TIDAK dibuka publik (prioritas tenant lama). Terbitkan invoice DP renewal 30% × sewa periode baru. | `renew-requests.service.ts` + invoice baru |
| Tenant TIDAK | RenewRequest REJECTED_BY_TENANT. Kamar segera tampil publik utk booking mulai tanggal checkout (L1). | `renew-requests` + `marketing-public-rooms` (tampilkan kamar OCCUPIED yang akan kosong) |
| Bayar DP ≤ hari-H | Approve bukti DP (jalur payment-submission renewal) → DP_SECURED → kamar keluar dari katalog → batalkan booking baru yang belum bayar + notif "kamar diperpanjang penghuni lama" (L3). | `payment-submissions.approveSubmission` (jalur renewal) + `cancelCompetingUnpaidBookingsTx` |
| Hari-H lewat, DP belum | Sweeper: AWAITING_DP yang lewat hari-H tanpa DP → EXPIRED_PRIORITY → kamar dibuka publik (first-paid-wins orang baru utk periode setelah checkout). | `auto-ops` job baru |
| Pelunasan ≤ H+7 | Approve pelunasan → stay diperpanjang (periode menyambung dari plannedCheckOutDate lama), meter checkpoint, invoice sewa penuh. | `stays.renewStayInTransaction` (sudah ada, dipanggil setelah lunas) |
| Grace H+7 lewat kontrak | Tenant tetap huni selama grace (sah, sudah bayar DP). Gagal lunas H+7 → forced checkout + DP renewal hangus + potong deposit (L4). | `auto-ops` job baru (mirip DP-forfeit tapi utk renewal) |

## 3. Skenario kompetisi kamar (resolusi)
- **Tenant lama YA + bayar DP ≤ hari-H:** menang. Pemesan baru belum-bayar dibatalkan. Pemesan baru SUDAH-bayar-DP: tidak mungkin terjadi — karena selama AWAITING_DP kamar belum dibuka publik (prioritas tenant lama). Kamar baru dibuka HANYA setelah EXPIRED_PRIORITY/REJECTED.
- **Tenant lama YA tapi tak bayar DP s/d hari-H:** EXPIRED_PRIORITY → kamar dibuka → first-paid-wins murni antar pemesan baru (periode mulai tanggal checkout). Tenant lama wajib checkout hari-H; bila tetap tinggal → overstay flow (forced checkout H+1).
- **Tenant lama TIDAK:** kamar dibuka seketika → pemesan baru first-paid-wins.
- **Tidak ada respon tenant lama s/d hari-H:** diperlakukan seperti "tak bayar DP" → kamar dibuka hari-H (EXPIRED_PRIORITY). (Konsekuensi: jangan biarkan kamar terkunci selamanya menunggu tenant pasif.)

## 4. Invarian yang harus dijaga
1. Periode renewal menyambung TANPA gap/overlap: periode baru mulai = `plannedCheckOutDate` lama (exclusive).
2. Pemesan baru tidak pernah dapat tanggal mulai < tanggal checkout tenant lama (L1).
3. Kamar tidak pernah dibuka publik selama tenant lama masih punya prioritas AWAITING_DP (sebelum hari-H).
4. DP renewal hangus hanya bila gagal lunas H+7 (bukan saat EXPIRED_PRIORITY tanpa DP — di situ belum ada DP).
5. Selama grace H+7 yang melewati kontrak, tenant lama TIDAK kena overstay enforcement (sah huni).
6. Satu kamar: maksimal 1 tenant promoted pada satu waktu (tenant lama s/d checkout, tenant baru dari checkout).

## 5. Edge case untuk diuji (UAT)
1. Tenant YA, bayar DP H-2, lunas H+5 → stay diperpanjang mulus, tidak ada overstay.
2. Tenant YA, bayar DP hari-H persis (pk 11:00) → masih sah (deadline = hari-H).
3. Tenant YA, tak bayar DP s/d hari-H → kamar dibuka, orang baru DP, tenant lama overstay → forced checkout H+1.
4. Tenant YA, bayar DP, gagal lunas H+7 (grace lewat kontrak) → forced checkout + DP hangus + potong deposit.
5. Tenant TIDAK → kamar langsung publik, orang baru booking mulai tanggal checkout.
6. Dua orang baru kompetisi setelah EXPIRED_PRIORITY → first-paid-wins.
7. Race: tenant lama bayar DP hampir bersamaan dengan dibukanya kamar di hari-H → lock + cek prioritas (tenant lama menang bila DP approved sebelum EXPIRED_PRIORITY ditandai).

## 6. Perubahan schema (perlu owner-approve — additive)
- `RenewRequest.status` enum tambah: `AWAITING_DP`, `DP_SECURED`, `EXPIRED_PRIORITY`, `REJECTED_BY_TENANT`, `FORFEITED` (selain PENDING/APPROVED/REJECTED lama).
- `RenewRequest.downPaymentPaidAt`, `downPaymentDueDate` (= hari-H), `settlementDueDate` (= DP+7).
- Kamar publik: query marketing tampilkan kamar OCCUPIED yang `plannedCheckOutDate` dekat DAN (tenant TIDAK perpanjang ATAU EXPIRED_PRIORITY) sebagai "tersedia mulai [tanggal checkout]".

## 7. Task pelaksana (turunan F2-1)
1. Schema additive (di atas) — owner approve.
2. Sweeper renewal: AWAITING_DP lewat hari-H → EXPIRED_PRIORITY (job auto-ops baru).
3. Sweeper renewal: DP_SECURED gagal lunas H+7 → FORFEITED + forced checkout + potong deposit.
4. Marketing query: tampilkan kamar "akan tersedia" untuk booking periode-berikutnya.
5. Notif: prompt perpanjang H-x, DP diterima, pelunasan diterima, prioritas hangus, kamar diperpanjang penghuni lama (ke pemesan baru).
6. Reuse `cancelCompetingUnpaidBookingsTx` saat DP_SECURED.
7. UAT 7 skenario §5.

**Prasyarat:** kerjakan SETELAH Fase 1 (uang & laporan benar) + GAP #1 no-partial (F1-1R), karena renewal memakai jalur payment-submission yang sama.
