# CHECKLIST 16 — Operasional: Inventaris + WiFi-sales + Layanan Tambahan + Loyalty (Admin)

> **Baca `00_INDEX.md` dulu.** Prefiks temuan: **`C16-xx`**. **Role:** ADMIN/OWNER (+STAFF utk sebagian). **Audit-only.** DB UAT.

## Ruang lingkup
| Halaman | URL | File FE | Role |
|---|---|---|---|
| Inventaris (shell) | `/inventory` → `/inventory/gudang`, `/barang-kamar`, `/mutasi` | `pages/resources/InventoryShellPage.tsx` | OWNER/ADMIN |
| Inventory items | `/inventory-items` (redirect ke /inventory/gudang) | `ConfiguredResourcePage` | OWNER/ADMIN |
| Room items | `/room-items` | `ConfiguredResourcePage` | OWNER/ADMIN |
| Inventory movements | `/inventory-movements` | `ConfiguredResourcePage` | OWNER/ADMIN |
| WiFi sales (admin) | `/wifi-sales` | `ConfiguredResourcePage resource="wifi-sales"` | OWNER/ADMIN |
| Layanan tambahan | `/additional-services` | `ConfiguredResourcePage` | OWNER/ADMIN |
| Minat layanan | `/service-interests` | `pages/services/ServiceInterestsPage.tsx` | OWNER/ADMIN |
| Loyalty (admin) | `/loyalty` | `pages/loyalty/LoyaltyAdminPage.tsx` | (cek role di App.tsx) |

**Backend:** `inventory-items`, `room-items`, `inventory-movements`, `wifi-sales`, `additional-services`, `loyalty.admin`, `loyalty/peer-report`. Model: `InventoryItem`, `RoomItem`, `InventoryMovement`, `WifiSale`, `AdditionalService`, `ServiceInterest`, `LoyaltyReward`, `Redemption`, `PeerBehaviorReport`.

## Langkah audit

### A. Inventaris (JEBAKAN: stok tidak boleh minus)
- [ ] 1. `/inventory/gudang`: daftar barang + stok tampil. Tambah item → tersimpan?
- [ ] 2. **Mutasi** `/inventory/mutasi`: buat ASSIGN (gudang→kamar). **JB (stok):** ASSIGN melebihi stok tersedia → ditolak? Stok gudang berkurang benar? Uji assign > stok → **harus ditolak**, kalau bikin stok minus = **C16-xx HIGH**.
- [ ] 3. RETURN (kamar→gudang) → stok bertambah; OUT → stok berkurang. Cocokkan angka.
- [ ] 4. `/barang-kamar` (room items): barang per kamar konsisten dengan mutasi ASSIGN? FK ke InventoryItem benar?
- [ ] 5. **JB-12:** mutasi 2× cepat → stok tidak dobel-kurang.
- [ ] 6. **JB-18:** stok/angka tidak NaN/negatif tak wajar.

### B. WiFi sales (admin) `/wifi-sales`
- [ ] 7. Daftar pesanan WiFi (dari CHECKLIST_08 tenant) tampil? Aktivasi perangkat oleh admin → status "aktif"; tercermin di portal tenant (JB-20)?
- [ ] 8. Harga = Rp50.000 dari `OperationalSetting`? Bila WiFi jadi pendapatan → tercatat di ancillary revenue (CHECKLIST_13)?
- [ ] 9. **JB-12:** aktivasi 2× tidak dobel-charge.

### C. Layanan tambahan & minat
- [ ] 10. `/additional-services`: CRUD layanan (nama, harga). Harga negatif ditolak?
- [ ] 11. `/service-interests`: daftar minat tenant terhadap layanan tampil? **JB-19:** tidak bocor data lintas-tenant.

### D. Loyalty admin `/loyalty`
- [ ] 12. Kelola reward (buat/edit reward, biaya poin). Cek konsistensi dengan portal tenant (CHECKLIST_09).
- [ ] 13. **Peer behavior report** (`peer-report`): laporan perilaku antar-tenant — cek akses & privasi (JB-19). Siapa boleh lihat?
- [ ] 14. **JB-01/uang:** poin/reward bukan uang riil; penukaran tidak menciptakan entri kas keliru.
- [ ] 15. Reward dengan biaya poin 0/negatif → ditolak?

### E. Keamanan (ConfiguredResourcePage — CRUD generik rawan)
- [ ] 16. **JB-14 (penting untuk CRUD generik):** halaman CRUD generik (`ConfiguredResourcePage`) sering hanya guard di FE. Untuk `/wifi-sales`, `/additional-services`, `/room-items`, `/inventory-*` — uji endpoint via curl dengan token TENANT/STAFF → harus 403. CRUD generik yang endpoint-nya terbuka = **BLOCKER**.
  ```bash
  curl -s -H "Authorization: Bearer <TENANT_TOKEN>" http://localhost:3000/api/inventory-items | head -c 200
  curl -s -X POST -H "Authorization: Bearer <TENANT_TOKEN>" http://localhost:3000/api/additional-services -d '{}' | head -c 200
  ```
- [ ] 17. **JB-19:** payload CRUD tidak bocor field sensitif.

### F. Kode
- [ ] 18. `inventory-movements.service.ts`: guard stok tak minus, mutasi atomik (transaksi), idempotent.
- [ ] 19. `ConfiguredResourcePage` config: cek resource mana yang di-expose & role guard backend-nya (controller `@Roles`).

## HASIL TEMUAN

> **Status:** **kode SELESAI** (bersih); **live TERTUNDA** (backend down).

### ✅ Verifikasi kode — BENAR (kuat)
- **Stok inventaris tak boleh negatif (`inventory-movements.service.ts`):** `SELECT qtyOnHand … FOR UPDATE` (row lock, race-safe, `:90`) → **`if (expectedQty < 0) throw Conflict('Stok inventory tidak boleh negatif.')`** (`:102`). Assign/OUT cek ketersediaan (`assertRoomItemQtyAvailableTx`, `:51`). Mutasi resmi **immutable** (harus mutasi koreksi, `:77`) → audit aman.
- **Loyalty redemption double-guard (`redemption.service.ts`):** `before < reward.pointCost → Conflict('Poin tidak cukup')` (`:75`) **dan** `after < 0 → Conflict` (`:97`) — poin **tak bisa minus** (race-safe); stok reward habis ditolak (`:72`).
- **Peer-report guards:** tak bisa lapor diri sendiri (`:27`), tak dobel (`:36`), transisi status valid (`:56,81,89`).

### C16-01 JB-14 CRUD generik — ✅ RESOLVED (dikonfirmasi live)
- **Uji live (token TENANT):** `GET /api/inventory-items`, `/wifi-sales`, `/additional-services`, `/room-items`, `/users`, `/expenses` → **SEMUA 403**. Endpoint CRUD generik **ter-guard backend** (bukan FE-only). **Tidak ada BLOCKER.** ✅ (bukan LOW lagi — aman.)

### ✅ LIVE CONFIRMED (owner, 3 Jul)
- **`/inventory` (→ /inventory/gudang) render:** "Inventaris Terpadu" tab **Gudang / Barang Kamar / Mutasi**; empty-state bersih ("Belum ada barang di gudang", Stok 0/Menipis 0/Habis 0/Aman 0/Rusak 0 — **tanpa NaN**); "Tambah barang akan membuat **mutasi masuk**" (konfirmasi logika mutasi-on-add). Tak error.
- **JB-14 (C16-01 RESOLVED):** CRUD generik `/inventory-items`, `/wifi-sales`, `/additional-services`, `/room-items` → TENANT **403**.

### ✅ LIVE CONFIRMED (`/loyalty` owner, 3 Jul)
- **Render "Loyalitas & Reward":** konversi **1 poin ≈ Rp100** (dapat disesuaikan owner). 3 seksi: **Permintaan Penukaran**, **Laporan Sikap Antar-Tenant**, **Katalog Reward** (+ tombol Reward). Semua empty-state ramah, tanpa NaN.
- **✅ JB-19 privasi peer-report SURFACED di UI:** judul seksi eksplisit "**moderasi — identitas pelapor dirahasiakan dari terlapor**". Konfirmasi desain privasi (pelapor anonim ke terlapor) muncul benar di layer UI, bukan hanya kode.

### Live TERTUNDA
- WiFi activation tenant↔admin end-to-end, mutasi UI (assign>stok ditolak — logika benar), reward CRUD submit (endpoint `/loyalty/rewards` 200 owner).

## Definition of Done — status
- [x] Stok tak-negatif + loyalty poin tak-minus (double-guard) diverifikasi kode.
- [~] JB-14 CRUD generik via curl + live mutasi/wifi/loyalty: tertunda (backend down) — **C16-01 wajib dikonfirmasi live**.
- [x] Temuan `C16-xx`; INDEX baris 16 diupdate.

## Definition of Done
- [ ] Mutasi inventaris diuji: assign>stok ditolak, stok tidak minus, double-submit (JB stok).
- [ ] WiFi activation konsisten tenant↔admin (JB-20).
- [ ] JB-14 diuji via curl untuk endpoint CRUD generik (wifi-sales, additional-services, inventory) — ini wajib.
- [ ] Loyalty admin & peer-report privasi (JB-19) dicek.
- [ ] Temuan `C16-xx`. Update Progres Global baris 16.
