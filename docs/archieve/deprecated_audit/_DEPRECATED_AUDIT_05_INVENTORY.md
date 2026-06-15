# INVENTARIS DEEP (V3) — Jalur movement resmi SEHAT; jalur admin-review field report BOCOR validasi (I-02 = vektor ghost-stock pertama yang ditemukan)
**Basis baca penuh:** `inventory-movements.service.ts` (176 baris), `room-items.service.ts` (284), `staff-field-reports.service.ts` (651, fokus adminReview :436-636) + verifikasi silang `inventory-items.service.ts` (V1) dan trigger DB `sql/bootstrap.sql:558-622`.

## Peta 3 jalur sinkron qty (verifikasi per baris)
| Jalur | Lock FOR UPDATE | Validasi stok cukup | Validasi qty kamar (RETURN) | Sinkron RoomItem | Sinkron gudang | Verdict |
|---|---|---|---|---|---|---|
| 1. Movement resmi (`inventory-movements.service.ts:43-70`) | ✅ `lockInventoryQtyTx:88` | ✅ :138 (pre) + dalam tx via expectedQty | ✅ `assertRoomItemQtyAvailableTx:94-103` (FOR UPDATE) | ✅ :156-174 | ✅ trigger DB + self-healing `:105-114` (tolak negatif :111) | ✅ SEHAT |
| 2. Laporan staf (`room-items.service.ts:115-274`) | n/a (tidak menyentuh qty) | n/a | n/a | status saja, qty DIBLOKIR :107-109 | n/a | ✅ SEHAT |
| 3. Admin review field report (`staff-field-reports.service.ts:478-505`) | ❌ TANPA lock | 🟡 hanya pre-check di LUAR tx :469-476 (race) | ❌ **TIDAK ADA** | ✅ :498-504 (salinan sendiri) | trigger DB saja, TANPA self-healing | 🔴 I-02 |

## TEMUAN
| # | Sev | File:Line | Issue | Dampak / Fix |
|---|---|---|---|---|
| I-01 | 🟡 P3 | `room-items.service.ts:170-183` | Dedupe tiket laporan barang memakai fuzzy match: `title contains itemName` ATAU `description contains itemName` — barang bernama mirip ("Kasur" vs "Kasur Busa", "Kursi" vs "Kursi Lipat") membuat laporan barang A ditempel ke tiket barang B; staf/admin membaca riwayat campur | Prioritaskan `linkedRoomItemId` + `RoomItem ID:` saja; buang 2 cabang contains-nama |
| I-02 | 🔴 P2 | `staff-field-reports.service.ts:478-505` vs `inventory-movements.service.ts:47-66` | `adminReview.createMovement` membuat InventoryMovement TANPA `lockInventoryQtyTx`, TANPA `ensureInventoryQtySyncedTx`, dan **TANPA `assertRoomItemQtyAvailableTx` untuk RETURN_FROM_ROOM** (validateMovement lokal :563-597 tidak mengecek qty kamar). Skenario ghost-stock: kamar punya 1 kasur, admin approve report dgn movement RETURN qty 3 → `syncRoomItem:621-623` nextQty=-2 → RoomItem DIHAPUS, trigger DB menambah gudang +3 → gudang menggelembung +2 unit fiktif. Race dua admin paralel juga lolos (validasi di luar tx) | Fix: panggil util yang SAMA dengan movement resmi (ekstrak lock+validasi ke helper bersama), atau delegasikan pembuatan movement ke InventoryMovementsService |
| I-03 | 🟡 P3 | `staff-field-reports.service.ts:629-632` vs `inventory-movements.service.ts:172` | Dua salinan `syncRoomItem` BERBEDA kebijakan: versi field-report menyetel status GOOD saat ASSIGN, versi movement resmi tidak menyentuh status → barang pengganti yang dipasang via review otomatis "Baik" tetapi via mutasi manual mewarisi status lama. Duplikasi = sumber drift | Satu util bersama (sekalian fix I-02) |
| I-04 | 🟡 P3 | `inventory-movements.service.ts:169-171` + field-reports `:622-623` | RoomItem dengan `nextQty <= 0` DIHAPUS — catatan status/note/riwayat kondisi barang per kamar ikut hilang; pemasangan ulang membuat row baru kosong | Pertimbangkan qty=0 + isActive=false alih-alih delete (butuh keputusan; delete saat ini konsisten dgn trigger) |
| I-05 | 🟡 P3 | `room-items.service.ts:103-113` | Admin/owner `update` boleh mengubah status barang TANPA catatan minimal (staf justru wajib catatan/foto :127-129) — V1 temuan #7 terverifikasi, presisi: hanya jalur admin | Wajibkan note ≥8 char juga utk admin (paritas) |
| I-06 | INFO | `inventory-movements.service.ts:58` | `movementDate` diterima bebas dari dto — bisa tanggal masa depan/lampau tanpa guard; memengaruhi laporan periodik stok | Tambah guard ≤ hari ini bila laporan periodik stok dibuat |
| I-07 | INFO | `room-items.service.ts:276-282` + `staff-field-reports.service.ts:638-649` | `generateTicketNumber` duplikat 2 file, count-based + fallback timestamp — aman dari bentrok tapi nomor bisa lompat; konsolidasi saat refactor I-02/I-03 | — |
| I-08 | ✅ | `inventory-movements.service.ts:72-77` | Edit movement DIBLOKIR TOTAL (wajib mutasi koreksi) — verified; tidak ada endpoint delete movement | — |
| I-09 | ✅ | `room-items.service.ts:98-101,107-109` | create RoomItem & ubah qty langsung DIBLOKIR (wajib via movement) — verified | — |
| I-10 | ✅ | `room-items.service.ts:116-118,136` | Staf hanya boleh lapor DAMAGED/MAINTENANCE/MISSING; status diterapkan sementara MAINTENANCE; final menunggu admin; event KPI +1/+2 (foto) :239-250 | — |

## Jalur kombinasi yang dipantau (V1 item 5) — status setelah baca penuh
Risiko "field-report → ticket-close memproses barang yang sama dua kali": qty AMAN (hanya movement yang menyentuh qty, dan ticket-close kategori BARANG_PINDAH di tickets.service mem-parsing description — lihat `AUDIT_09_KPI.md`/tickets), tetapi STATUS barang bisa saling timpa: adminReview menulis status RoomItem? — TIDAK (hanya staffFieldReport.status), aman; yang menimpa adalah `room-items.update` admin (I-05) dan tiket-close BARANG_PINDAH. Residual tetap rendah; fokuskan ke I-02 yang lebih nyata.

## Tools analisis stok (tetap belum ada — rekomendasi V1 berlaku)
| Tool | Teori | Status | Cara termurah |
|---|---|---|---|
| Inventory turnover | Inventory Turnover Ratio | ❌ | Σ movement OUT/ASSIGN per item per bulan ÷ qty rata — endpoint reports baru read-only |
| Dead stock | — | ❌ | Item tanpa movement >90 hari — 1 query |
| EOQ | EOQ | ❌ tidak relevan | Consumable kost sedikit & supplier lokal harian — TUNDA permanen kecuali skala berubah |
| Nilai persediaan ke neraca | PSAK persediaan | ❌ sadar-risiko | COA 1200 idle (F-16); hanya bila owner butuh neraca penuh (F4-6) |

## RECOMMENDATIONS (ordered)
1. 🔴 I-02: satukan jalur pembuatan movement — `adminReview` HARUS memakai lock+validasi yang sama dengan movement resmi (1 sesi kecil, risiko rendah, menutup satu-satunya vektor ghost-stock).
2. I-01: ganti dedupe tiket ke `linkedRoomItemId`/marker ID saja.
3. I-05: paritas kewajiban catatan admin = staf.
4. I-03/I-07: ekstrak `syncRoomItem` + `generateTicketNumber` ke util bersama (ikut sesi I-02).
5. Laporan dead-stock (90 hari) — nilai tinggi, usaha kecil.

## OPEN QUESTIONS → ✅ TERJAWAB 2026-06-13 (`04_KEPUTUSAN_OWNER.md`)
- I-04 riwayat barang ditarik? → **hapus saja** (D-16) → F4-6 RoomItem soft-zero DIBATALKAN.
- I-03 status barang ASSIGN? → **ditentukan admin** (D-08) → F2-5 samakan ke perilaku ini.
- RETURN via admin review di produksi? → **belum publish, data testing** (D-06) → dampak retroaktif nihil; tetap fix kode (F2-5).

---

## LAMPIRAN — Audit per-file domain inventaris (format V3 §5)

### backend/src/modules/inventory-movements/inventory-movements.service.ts (176 baris — dibaca penuh)
- **Function:** Mutasi stok resmi IN/OUT/ASSIGN/RETURN — satu-satunya jalur sah pengubah qty.
- **Audit:** create: lock qty FOR UPDATE (:88-92) → validasi RETURN qty kamar dgn FOR UPDATE (:94-103) → buat movement → sinkron RoomItem (:156-174) → self-healing gudang dgn tolak-negatif (:105-114). update DIBLOKIR TOTAL (:72-77) — koreksi wajib via mutasi baru. Role: staf read-only (:116-119). Catatan ≥8 char (:122-126). ADJUSTMENT ditolak (:137).
- **Theory ref:** Single-writer principle; audit trail.
- **Verdict:** ✅ rujukan emas — jalur lain HARUS meniru ini (dasar fix I-02).

### backend/src/modules/room-items/room-items.service.ts (284 baris — dibaca penuh)
- **Function:** Inventaris per kamar: list (admin/tenant), update status admin, laporan kondisi staf (auto tiket + field report + event KPI).
- **Audit:** create & ubah-qty diblokir (:98-101, :107-109) ✅; staf dibatasi 3 status laporan + wajib catatan/foto (:116-129) ✅; status diterapkan sementara MAINTENANCE menunggu admin (:136) ✅; dedupe tiket FUZZY by-nama (I-01 :170-183); admin update tanpa wajib catatan (I-05 :103-113); event KPI +1/+2 (:239-250).
- **Theory ref:** Maker-checker; recognition (label status Indonesia :17-25).
- **Verdict:** ✅ dengan 2 catatan kecil.

### backend/src/modules/staff-field-reports/staff-field-reports.service.ts (651 baris — fokus :340-650)
- **Function:** Antrean review admin (5 bucket :349-434) + keputusan admin atas laporan staf (boleh sekalian buat movement).
- **Audit:** adminReview wajib catatan ≥8 (:457-461); movement hanya saat APPROVE (:463-467); **TAPI** pembuatan movement (:478-505) tanpa lock, tanpa self-healing, tanpa validasi qty-kamar RETURN (validateMovement lokal :563-597 tidak mengecek RoomItem) = **I-02 ghost-stock**; salinan syncRoomItem beda kebijakan status (I-03 :629-632); status report mengikuti keputusan + movement (:507-514) — state machine benar.
- **Theory ref:** DMAIC — defect di jalur paralel yang tidak meniru kontrol jalur utama.
- **Verdict:** 🔴 1 temuan P2 (I-02) di file yang selain itu rapi.

### backend/src/modules/inventory-items/inventory-items.service.ts (16.5KB — verifikasi V1 dipertahankan)
- **Function:** Master barang gudang + sinkron stok awal + update status lapangan (auto-ticket bila rusak/hilang).
- **Audit:** `ensureOpeningStockSyncedTx` self-healing (tulis hanya bila beda) — bukan penambah kedua; trigger DB `inventory_movement_sync_qty_trg` (bootstrap.sql:558-622) tetap satu-satunya penulis qty dari movement. Tidak ada temuan baru pada pass ini.
- **Verdict:** ✅.

## Skenario uji regresi yang disarankan utk fix I-02 (bahan AI eksekutor)
1. Kamar punya RoomItem qty 1 → adminReview APPROVE + movement RETURN qty 3 → HARUS 409 (sebelum fix: roomItem terhapus + gudang +3).
2. Dua admin approve report berbeda utk item sama secara paralel → satu sukses, satu 409/serial (sebelum fix: keduanya lolos pre-check).
3. Movement resmi RETURN qty > qty kamar → 409 (regresi: pastikan tetap).
4. adminReview APPROVE tanpa movement → status report APPROVED, qty tidak berubah.
5. ASSIGN via adminReview → status RoomItem mengikuti kebijakan final yang dipilih owner (GOOD otomatis vs ditentukan admin).

## Invarian inventaris (dipegang audit berikutnya)
1. `InventoryItem.qtyOnHand` = stok awal + Σ delta movement (trigger DB = single writer; service hanya self-healing).
2. `RoomItem.qty` per (item,kamar) = Σ ASSIGN − Σ RETURN; tidak pernah negatif.
3. Setiap perubahan qty meninggalkan InventoryMovement ber-catatan ≥8 char + AuditLog.
4. Status barang berubah hanya via: laporan staf (sementara), keputusan admin (final), atau tutup tiket (final) — tiga-tiganya berjejak.
5. Movement tidak pernah diedit/dihapus — koreksi = movement lawan.

## Glosarium tipe movement & efeknya (peta lengkap)
| Tipe | Gudang | Kamar | roomId wajib? | Validasi kecukupan |
|---|---|---|---|---|
| IN | +qty | — | dilarang | — |
| OUT | −qty | — | dilarang | gudang ≥ qty |
| ASSIGN_TO_ROOM | −qty | +qty | wajib | gudang ≥ qty |
| RETURN_FROM_ROOM | +qty | −qty | wajib | kamar ≥ qty (jalur resmi ✅ / adminReview ❌ = I-02) |
| ADJUSTMENT | ditolak kedua jalur | — | — | by-design tidak didukung |

## Pemeriksaan dampak historis I-02 (dijalankan owner sebelum/atau saat F2-5)
1. Query: `SELECT m.* FROM "InventoryMovement" m JOIN "StaffFieldReport" r ON r."relatedMovementId" = m.id WHERE m."movementType" = 'RETURN_FROM_ROOM'` — daftar semua RETURN yang lahir dari adminReview.
2. Utk tiap baris: bandingkan qty movement vs qty RoomItem historis (AuditLog RoomItem) — selisih = ghost stock yang sudah terlanjur.
3. Bila ditemukan: koreksi via movement lawan (OUT) ber-catatan "koreksi ghost-stock I-02", BUKAN edit data.
4. Perkiraan risiko nyata: RENDAH (fitur review+movement relatif baru; volume consumable kecil) — tapi verifikasi 1 query ini murah.

## Keterkaitan lintas-domain
- I-02 × F-16: selama nilai stok tidak masuk neraca, ghost-stock TIDAK merusak laporan keuangan — hanya operasional. Ini menurunkan urgensi dari P1 ke P2.
- I-01 × K-8: dua-duanya soal tiket-barang salah sasaran; perbaiki bersama di sesi F2-5/F3-1.
- I-05 × Equity (09): catatan wajib admin = keadilan jejak yang sama dgn yang dituntut dari staf.

## Definisi selesai inventaris "hijau penuh"
1. Semua jalur pembuat movement memakai SATU util ber-lock+validasi (tidak ada salinan kebijakan).
2. Query pemeriksaan I-02 historis = 0 selisih (atau sudah dikoreksi via movement lawan).
3. Dedupe tiket barang 100% via linkedRoomItemId (0 fuzzy-match).
4. Laporan dead-stock & turnover tersedia dan dibaca owner bulanan.
5. Spot-check fisik kuartalan (manusia) cocok dgn qtyOnHand — satu-satunya verifikasi yang kode tidak bisa lakukan sendiri.

Kesimpulan domain: arsitektur single-writer (trigger DB) + larangan edit movement membuat inventaris KOST48 lebih disiplin daripada kebanyakan sistem kost komersial; satu-satunya retakan (I-02) lahir dari jalur pintas yang tidak meniru kontrol jalur utama — pelajaran umum: fitur "demi kenyamanan admin" wajib mewarisi guard fitur aslinya, bukan menulis ulang versi longgar.
Estimasi usaha penutupan seluruh temuan domain ini: 1 sesi AI (F2-5) + 1 query verifikasi owner — rasio nilai/usaha tertinggi kedua setelah copy A17.
Pemilik invarian: setiap PR yang menyentuh `inventory-*`/`room-items`/`staff-field-reports` wajib menyatakan di deskripsi PR invarian #1-#5 mana yang berpotensi tersentuh.
Prioritas relatif: I-02 (P2) > I-01/I-05 (P3) > sisanya (INFO) — kerjakan I-02 di F2-5 lebih dulu, tumpangkan I-01/I-03/I-05/I-07 pada sesi yang sama karena menyentuh file yang sama.

Penutup: domain inventaris adalah contoh terbaik dalam codebase tentang "guard di tempat yang tepat" (trigger DB = single writer) — dan sekaligus contoh terbaik tentang bahaya menduplikasi guard secara longgar (I-02/I-03). Pelajaran arsitektural ini layak ditulis di CLAUDE.md sebagai pedoman: setiap penulis qty baru WAJIB melewati util movement resmi, tanpa pengecualian.
