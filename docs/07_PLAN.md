# KOST48 V5 — Master Execution Plan
**Versi:** 2026-06-13 · Rencana kanonik setelah sinkronisasi keputusan owner, fakta kode, dan checklist.

## 1. Hierarki Rencana

1. `03_KEPUTUSAN_OWNER.md` menentukan aturan bisnis.
2. `01_GROUND_STATE.md` dan `02_FLOW_MAP.md` menjelaskan fakta kode saat ini.
3. Dossier `10`-`19` menjelaskan gap, desain target, dan UAT per domain.
4. `08_CHECKLIST.md` adalah urutan task global dan satu-satunya daftar centang eksekusi.

Jika ID task atau status berbeda, `08_CHECKLIST.md` menang dan dokumen yang berbeda harus diperbaiki.

## 2. Current Phase — Fase 1 Sebelum Publish

**Tujuan:** memastikan penerimaan uang, deposit, jurnal, dan laporan benar sebelum database produksi dibuat.

Urutan:

1. Pasang harness finance minimum (`F1-T`).
2. Tegakkan no-partial pada approval (`F1-1R`).
3. Blokir perubahan payment untuk kamar yang sudah dihuni (`F1-2`).
4. Perbaiki cashflow, rasio, neraca, occupancy, dan revenue DRAFT (`F1-3` s.d. `F1-9`).
5. Kunci deposit kamar dan pastikan expiry booking 3 jam (`F1-10`, `F1-11`).
6. Nonaktifkan pembuatan jurnal draft manual (`F2-8`).
7. Deploy database produksi bersih (`F1-12`).

Build dan verification gate:

```powershell
Set-Location backend
npm run build
node --test test/

Set-Location ../frontend
npm run build
```

Task finance juga wajib melewati endpoint rekonsiliasi di `05_VERIFIKASI_KEUANGAN.md`.

## 3. Fase 2 — Flow Bisnis Inti

Prioritas setelah deploy:

1. Renewal DP, prioritas tenant lama, grace H+7, dan rent-loyalty (`F2-1`).
2. Notifikasi renewal H-10 serta hasil approve/reject (`F2-2`).
3. Copy dan pencatatan refund first-paid-wins (`F2-3`, `F2-3b`).
4. Tutup ghost-stock admin-review (`F2-5`).
5. Tiket inspeksi saat cancel stay promoted (`F2-6`).
6. Koreksi KPI, role OWNER-only, dan model tenant-pengawas (`F2-9`, `F2-16`, `F2-18`).
7. Performa publik, timezone WIB, dan notifikasi sweeper (`F2-11`, `F2-14`, `F2-17`).

Perubahan schema hanya boleh dilakukan setelah persetujuan owner.

## 4. Fase 3 — Operasional dan Visibilitas

Lingkup:

- SEO, social proof, dan occupancy heatmap.
- Tenant kabur, barang abandoned, dan forced checkout tunggakan.
- KTP sebelum aktivasi kamar.
- Expense rutin, SLA tiket, prompt review, dan depresiasi otomatis.
- Coverage notifikasi dan higiene laporan/jurnal.
- Perbaikan chart serta lead-source.

Nomor dan urutan lengkap ada di `08_CHECKLIST.md`.

## 5. Fase 4 — Future

- Unearned revenue untuk kontrak panjang.
- Gamifikasi dan reward tenant dengan jurnal akuntansi.
- PWA Web Push berbasis outbox.
- Pruning notifikasi.
- Flow pindah kamar resmi.

Round-robin dan leaderboard antar-staf tetap ditunda selama hanya ada satu staf.

## 6. Arsitektur Multi-App

Rencana ekstraksi tetap berlaku, tetapi **bukan current production blocker**:

| App target | Kepemilikan |
|---|---|
| `core-api` | Stay lifecycle, payment approval, booking approval, checkout, renewal, room status |
| `marketing-api` | Public rooms, room detail, gallery read-only |
| `staff-api` | Tickets, room view, inventory read-only |
| `tenant-api` | Request/read surface tenant; tidak mengeksekusi lifecycle final |
| `finance-api` | Report/read surface; approval payment tetap di core |
| `owner-api` | Ditunda |

Ekstraksi baru dimulai setelah Fase 1 stabil dan high-risk command boundary diaudit.

## 7. High-Risk Flows

Tetap di `core-api`:

- `PaymentSubmissionsService.approveSubmission()`
- `StaysService.create()`
- `StaysService.complete()`
- `StaysService.renewStay()`
- `TenantBookingsService.approveBooking()`
- `StaysService.cancel()`
- Deposit settlement
- Semua write status kamar
- Meter promotion

## 8. Verification Gates

- Backend dan frontend build lulus.
- Trial balance seimbang.
- Deposit reconciliation mismatch 0.
- Cashflow: beginning + net = ending.
- Public route tetap 200 tanpa token; protected route 401 tanpa token.
- Staff tidak bisa membuat official inventory movement.
- Manual browser UAT mencakup public, tenant, staff, admin, finance, dan owner.

## 9. Aturan Eksekusi

- Satu task kecil per commit.
- Jangan menambah dependency atau mengubah schema tanpa persetujuan.
- Jangan mengklaim PASS tanpa build/runtime evidence.
- Jangan memigrasikan data UAT ke produksi.
- Jangan mengekstrak high-risk flows sebelum command boundary siap.

**Sumber historis:** `docs/archieve/02_PLAN.md`.
