# DOSSIER 14 — INVENTARIS & BARANG KAMAR
**Domain:** stok gudang, pergerakan (movement), barang per kamar (RoomItem), laporan kondisi staf, sinkronisasi 3 jalur. **Flow 9.**
**Status:** 🟢 SEHAT — qty single-writer via trigger DB; ghost-stock TIDAK ada di jalur resmi. 1 lubang nyata (I-02) di jalur admin-review.
**File inti:** `inventory-movements.service.ts` (176), `room-items.service.ts` (284), `staff-field-reports.service.ts` (651), `inventory-items.service.ts` (16.5KB), trigger `sql/bootstrap.sql:558-622`.

---
## 1. Aturan bisnis
- **Qty single-writer:** satu-satunya pengubah qty = trigger DB `inventory_movement_sync_qty_trg`; service hanya self-healing (tulis bila beda), bukan penambah kedua.
- **Movement tak boleh diedit** (wajib mutasi koreksi); catatan ≥8 char; ADJUSTMENT ditolak.
- **RoomItem create/ubah-qty langsung DIBLOKIR** — hanya via movement ASSIGN/RETURN.
- **Staf** hanya boleh LAPOR status (DAMAGED/MAINTENANCE/MISSING) + wajib catatan/foto; status final menunggu admin.
- **Status barang saat ASSIGN ditentukan admin** (D-08), bukan auto-GOOD (samakan kedua jalur).
- **Riwayat barang ditarik (qty 0): hapus saja** (D-16) — jejak cukup di AuditLog+tiket.

## 2. Peta kode (3 jalur sinkron qty)
| Jalur | Lokasi | Lock | Validasi RETURN | Status |
|---|---|---|---|---|
| 1. Movement resmi | `inventory-movements.service.ts:43-70` | ✅ `:88` | ✅ `:94-103` | 🟢 RUJUKAN EMAS |
| 2. Laporan staf (status only) | `room-items.service.ts:115-274` | n/a | n/a | 🟢 |
| 3. Admin-review field report (boleh buat movement) | `staff-field-reports.service.ts:478-505` | ❌ | ❌ | 🔴 I-02 |

## 3. Temuan audit
| ID | Sev | Dampak bisnis | Lokasi | Fix/Task |
|---|---|---|---|---|
| I-02 | 🔴 P2 | adminReview buat movement TANPA lock + TANPA validasi qty-kamar RETURN → bisa ghost-stock (kamar 1 kasur, RETURN qty 3 → gudang +2 fiktif). Satu-satunya vektor ghost-stock nyata. | `staff-field-reports.service.ts:478-505,563-597` | **F2-5** pakai util movement resmi (lock+validasi) |
| I-03 | 🟡 P3 | Dua salinan syncRoomItem beda kebijakan status (review set GOOD, resmi tidak). Owner: admin tentukan status (D-08). | `staff-field-reports.service.ts:629-632` | **F2-5** satukan; admin pilih status |
| I-01 | 🟡 P3 | Dedupe tiket laporan barang fuzzy match by-nama → barang mirip ("Kasur"/"Kasur Busa") tiketnya tercampur. | `room-items.service.ts:170-183` | prioritaskan `linkedRoomItemId` saja |
| I-05 | 🟡 P3 | Admin update status barang tanpa wajib catatan (staf justru wajib) — keadilan jejak. | `room-items.service.ts:103-113` | wajibkan note ≥8 char admin |
| X-01 | 🟡 P3 | `syncRoomItem`/`generateTicketNumber`/`releaseRoomAfterBookingCancelTx` ada 2-3 salinan → kebijakan mulai drift. | beberapa file | **F2-5** konsolidasi util bersama |
| I-04/I-06/I-07 | INFO | RoomItem delete saat qty 0 (owner: hapus saja D-16); movementDate bebas; generateTicketNumber duplikat. | — | sadar/ikut F2-5 |
| (sehat) | ✅ | trigger DB single-writer + edit-movement diblokir = inventaris lebih disiplin dari kebanyakan sistem kos. | — | pertahankan |

## 4. Task
- **F2-5 · FASE 2 🔴:** tutup ghost-stock — ekstrak `lockInventoryQtyTx`+`assertRoomItemQtyAvailableTx`+`ensureInventoryQtySyncedTx`+`syncRoomItem` ke util bersama; `adminReview` pakai util sama (lock dlm tx, validasi RETURN, status oleh admin per D-08). Sekalian konsolidasi `generateTicketNumber` + `releaseRoomAfterBookingCancelTx`. Kriteria: RETURN qty>kamar via adminReview → 409; race 2 admin → 1 sukses 1 konflik.
- I-01/I-05 menumpang sesi F2-5 (file sama).

## 5. Invarian, verifikasi, tools
- **Invarian:** `qtyOnHand = stok awal + Σ delta movement` (trigger=single writer); `RoomItem.qty` per (item,kamar) = ΣASSIGN−ΣRETURN, tak pernah negatif; tiap perubahan qty berjejak movement+AuditLog; movement tak pernah diedit (koreksi=movement lawan).
- **UAT regresi F2-5:** (1) kamar 1 kasur + adminReview RETURN qty 3 → HARUS 409; (2) 2 admin paralel approve item sama → 1 sukses 1 konflik; (3) movement resmi RETURN>kamar → 409 (regresi tetap).
- **Pemeriksaan historis I-02:** query InventoryMovement RETURN dari relatedMovement adminReview → cek selisih (belum-publish: dampak retroaktif nihil; tetap fix kode).
- **Tools belum ada (rekomendasi):** inventory turnover, dead-stock (item tanpa movement >90 hari). EOQ tidak relevan (consumable sedikit).
- **Pelajaran arsitektural** (layak masuk CLAUDE.md): setiap penulis qty baru WAJIB lewat util movement resmi — jangan tulis versi longgar.
