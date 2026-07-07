-- ============================================================================
-- GOLIVE SEED — KOST48 Surabaya V5 (BASELINE-ONLY)
-- ============================================================================
-- Hanya pakai tabel & kolom yang ada di baseline migration.
-- TIDAK butuh migrasi tambahan.
-- ============================================================================

-- 1. USER — OWNER
INSERT INTO "User" ("fullName", email, "passwordHash", role, "isActive", "createdAt", "updatedAt")
SELECT 'Liem Lui', 'liem.lui@gmail.com', '$2a$10$vSKjXNvmmbZFGHCl6QAtM.mWNmXSTSoRVZNgtXfq0QyDKf3aGBf9i', 'OWNER', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE email = 'liem.lui@gmail.com');

-- 2. KAMAR (13 kamar — kolom baseline saja)
INSERT INTO "Room" (code, name, floor, status,
  "monthlyRateRupiah", "defaultDepositRupiah",
  notes, "isActive", "createdAt", "updatedAt")
SELECT * FROM (VALUES
  ('A',  'Kamar A',  '1', 'AVAILABLE'::"RoomStatus", 1700000, 510000, '2m×3,5m + Mezanin 2m×2m; KM Dalam 1,2m×1,5m; Kasur busa tebal 180×200; AC + Kipas; Kategori DELUXE MEZZANINE', true, NOW(), NOW()),
  ('B',  'Kamar B',  '1', 'AVAILABLE', 1700000, 510000, '2,5m×3,5m (medium); KM Dalam 1,2m×1,5m; Kasur busa tebal 180×200; AC + Kipas; Kategori DELUXE REGULAR', true, NOW(), NOW()),
  ('C',  'Kamar C',  '1', 'AVAILABLE', 1700000, 510000, '2,5m×3,5m (medium); KM Dalam 1,5m×1,5m; Kasur busa tebal 180×200; AC + Kipas; Kategori DELUXE REGULAR', true, NOW(), NOW()),
  ('D',  'Kamar D',  '1', 'AVAILABLE', 1600000, 480000, '2m×3,5m (small); KM Dalam 1,5m×1,5m; Kasur busa tebal 180×200; AC + Kipas; Kategori DELUXE REGULAR', true, NOW(), NOW()),
  ('G',  'Kamar G',  '1', 'AVAILABLE',  850000, 255000, '2m×3,5m (medium); KM Luar bersama; Kasur busa tebal 180×200; Kipas; Kategori ECONOMY REGULAR', true, NOW(), NOW()),
  ('H',  'Kamar H',  '1', 'AVAILABLE',  850000, 255000, '2m×3,5m (medium); KM Luar bersama; Kasur busa tebal 180×200; Kipas; Kategori ECONOMY REGULAR', true, NOW(), NOW()),
  ('I',  'Kamar I',  '1', 'AVAILABLE',  850000, 255000, '2m×3,5m (medium); KM Luar bersama; Kasur busa tebal 180×200; Kipas; Kategori ECONOMY REGULAR', true, NOW(), NOW()),
  ('J',  'Kamar J',  '1', 'AVAILABLE', 1600000, 480000, '2m×3,5m (medium); KM Dalam 1,2m×1,5m; Kasur busa tebal 180×200; AC + Kipas; Kategori DELUXE REGULAR', true, NOW(), NOW()),
  ('K',  'Kamar K',  '1', 'AVAILABLE', 1800000, 540000, '3m×3,5m (besar); KM Dalam 1,2m×1,5m; Kasur busa tebal 180×200; AC + Kipas; Kategori DELUXE REGULAR LARGE', true, NOW(), NOW()),
  ('L',  'Kamar L',  '1', 'AVAILABLE', 1800000, 540000, '3m×3,5m (besar); KM Dalam 1,2m×1,5m; Kasur busa tebal 180×200; AC + Kipas; Kategori DELUXE REGULAR LARGE', true, NOW(), NOW()),
  ('M',  'Kamar M',  '1', 'AVAILABLE', 1400000, 420000, '3m×3,5m (besar); KM Dalam 1,2m×1,5m; Kasur busa tebal 180×200; Kipas; Kategori STANDARD REGULAR LARGE', true, NOW(), NOW()),
  ('F1', 'Kamar F1', '2', 'AVAILABLE', 1750000, 525000, '2,5m×3m (standar) + Mezanin 1,5m×3m; KM Dalam 1,5m×1,2m; Kasur busa 90×200 atau double bed; AC + Kipas; Kategori DELUXE MEZZANINE', true, NOW(), NOW()),
  ('F2', 'Kamar F2', '2', 'AVAILABLE', 1750000, 525000, '2,5m×3m (standar) + Mezanin 1,5m×3m; KM Dalam 1,5m×1,2m; Kasur double bed; Perabot lengkap; AC + Kipas; Kategori DELUXE MEZZANINE', true, NOW(), NOW())
) AS v
WHERE NOT EXISTS (SELECT 1 FROM "Room" WHERE code = v.column1);

-- 3. INVENTARIS — Barang gudang
INSERT INTO "InventoryItem" (sku, name, category, unit, "qtyOnHand", "minQty", status, notes, "isActive", "createdAt", "updatedAt")
SELECT * FROM (VALUES
  ('INV-FURN-001', 'Kasur Busa Tebal 180×200',  'Furniture', 'pcs', 13,  0, 'GOOD'::"InventoryItemStatus", 'Kasur busa tebal 180×200cm — 1 per kamar', true, NOW(), NOW()),
  ('INV-FURN-002', 'Lemari Baju',               'Furniture', 'pcs', 13,  0, 'GOOD', 'Lemari baju 1 pintu — 1 per kamar', true, NOW(), NOW()),
  ('INV-FURN-003', 'Gantungan Baju',             'Furniture', 'pcs', 13,  0, 'GOOD', 'Gantungan baju — 1 set per kamar', true, NOW(), NOW()),
  ('INV-FURN-004', 'Kipas Angin',                'Electronic','pcs', 13,  0, 'GOOD', 'Kipas angin — semua kamar punya', true, NOW(), NOW()),
  ('INV-FURN-005', 'AC Split 1/2 PK 380W',       'Electronic','pcs', 10,  0, 'GOOD', 'AC 1/2 PK 380W — kamar A,B,C,D,J,F1,F2 + cadangan', true, NOW(), NOW()),
  ('INV-FURN-006', 'AC Split 1/2 PK 450W',       'Electronic','pcs',  2,  0, 'GOOD', 'AC 1/2 PK 450W — kamar K,L (ukuran besar)', true, NOW(), NOW()),
  ('INV-FURN-007', 'Kasur Busa 90×200',          'Furniture', 'pcs',  2,  0, 'GOOD', 'Kasur busa 90×200cm — kamar F1,F2 (mezanin)', true, NOW(), NOW()),
  ('INV-FURN-008', 'Double Bed',                 'Furniture', 'pcs',  1,  0, 'GOOD', 'Double bed — kamar F2', true, NOW(), NOW())
) AS v
WHERE NOT EXISTS (SELECT 1 FROM "InventoryItem" WHERE sku = v.column1);

-- 4. ROOM ITEM — Mapping inventaris ke setiap kamar
-- 4a. Kasur Busa 180×200 (semua kamar)
INSERT INTO "RoomItem" ("roomId", "itemId", qty, status, "createdAt", "updatedAt")
SELECT r.id, i.id, 1, 'GOOD', NOW(), NOW()
FROM "Room" r CROSS JOIN "InventoryItem" i
WHERE i.sku = 'INV-FURN-001'
AND NOT EXISTS (SELECT 1 FROM "RoomItem" ri WHERE ri."roomId" = r.id AND ri."itemId" = i.id);

-- 4b. Lemari Baju (semua kamar)
INSERT INTO "RoomItem" ("roomId", "itemId", qty, status, "createdAt", "updatedAt")
SELECT r.id, i.id, 1, 'GOOD', NOW(), NOW()
FROM "Room" r CROSS JOIN "InventoryItem" i
WHERE i.sku = 'INV-FURN-002'
AND NOT EXISTS (SELECT 1 FROM "RoomItem" ri WHERE ri."roomId" = r.id AND ri."itemId" = i.id);

-- 4c. Gantungan Baju (semua kamar)
INSERT INTO "RoomItem" ("roomId", "itemId", qty, status, "createdAt", "updatedAt")
SELECT r.id, i.id, 1, 'GOOD', NOW(), NOW()
FROM "Room" r CROSS JOIN "InventoryItem" i
WHERE i.sku = 'INV-FURN-003'
AND NOT EXISTS (SELECT 1 FROM "RoomItem" ri WHERE ri."roomId" = r.id AND ri."itemId" = i.id);

-- 4d. Kipas Angin (semua kamar)
INSERT INTO "RoomItem" ("roomId", "itemId", qty, status, "createdAt", "updatedAt")
SELECT r.id, i.id, 1, 'GOOD', NOW(), NOW()
FROM "Room" r CROSS JOIN "InventoryItem" i
WHERE i.sku = 'INV-FURN-004'
AND NOT EXISTS (SELECT 1 FROM "RoomItem" ri WHERE ri."roomId" = r.id AND ri."itemId" = i.id);

-- 4e. AC 380W (kamar A,B,C,D,J,F1,F2)
INSERT INTO "RoomItem" ("roomId", "itemId", qty, status, "createdAt", "updatedAt")
SELECT r.id, i.id, 1, 'GOOD', NOW(), NOW()
FROM "Room" r CROSS JOIN "InventoryItem" i
WHERE i.sku = 'INV-FURN-005' AND r.code IN ('A','B','C','D','J','F1','F2')
AND NOT EXISTS (SELECT 1 FROM "RoomItem" ri WHERE ri."roomId" = r.id AND ri."itemId" = i.id);

-- 4f. AC 450W (kamar K,L)
INSERT INTO "RoomItem" ("roomId", "itemId", qty, status, "createdAt", "updatedAt")
SELECT r.id, i.id, 1, 'GOOD', NOW(), NOW()
FROM "Room" r CROSS JOIN "InventoryItem" i
WHERE i.sku = 'INV-FURN-006' AND r.code IN ('K','L')
AND NOT EXISTS (SELECT 1 FROM "RoomItem" ri WHERE ri."roomId" = r.id AND ri."itemId" = i.id);

-- 4g. Kasur 90×200 (kamar F1,F2)
INSERT INTO "RoomItem" ("roomId", "itemId", qty, status, "createdAt", "updatedAt")
SELECT r.id, i.id, 1, 'GOOD', NOW(), NOW()
FROM "Room" r CROSS JOIN "InventoryItem" i
WHERE i.sku = 'INV-FURN-007' AND r.code IN ('F1','F2')
AND NOT EXISTS (SELECT 1 FROM "RoomItem" ri WHERE ri."roomId" = r.id AND ri."itemId" = i.id);

-- 4h. Double Bed (kamar F2)
INSERT INTO "RoomItem" ("roomId", "itemId", qty, status, "createdAt", "updatedAt")
SELECT r.id, i.id, 1, 'GOOD', NOW(), NOW()
FROM "Room" r CROSS JOIN "InventoryItem" i
WHERE i.sku = 'INV-FURN-008' AND r.code = 'F2'
AND NOT EXISTS (SELECT 1 FROM "RoomItem" ri WHERE ri."roomId" = r.id AND ri."itemId" = i.id);

-- 5. ROOM FACILITY — Fasilitas per kamar (tampil di katalog publik)
INSERT INTO "RoomFacility" ("roomId", name, quantity, category, "publicVisible", "createdAt", "updatedAt")
SELECT r.id, 'Kasur Busa Tebal 180×200', 1, 'Tidur', true, NOW(), NOW()
FROM "Room" r
WHERE NOT EXISTS (SELECT 1 FROM "RoomFacility" rf WHERE rf."roomId" = r.id AND rf.name = 'Kasur Busa Tebal 180×200');

INSERT INTO "RoomFacility" ("roomId", name, quantity, category, "publicVisible", "createdAt", "updatedAt")
SELECT r.id, 'Lemari Baju', 1, 'Perabot', true, NOW(), NOW()
FROM "Room" r
WHERE NOT EXISTS (SELECT 1 FROM "RoomFacility" rf WHERE rf."roomId" = r.id AND rf.name = 'Lemari Baju');

INSERT INTO "RoomFacility" ("roomId", name, quantity, category, "publicVisible", "createdAt", "updatedAt")
SELECT r.id, 'Gantungan Baju', 1, 'Perabot', true, NOW(), NOW()
FROM "Room" r
WHERE NOT EXISTS (SELECT 1 FROM "RoomFacility" rf WHERE rf."roomId" = r.id AND rf.name = 'Gantungan Baju');

INSERT INTO "RoomFacility" ("roomId", name, quantity, category, "publicVisible", "createdAt", "updatedAt")
SELECT r.id, 'Kipas Angin', 1, 'Pendingin', true, NOW(), NOW()
FROM "Room" r
WHERE NOT EXISTS (SELECT 1 FROM "RoomFacility" rf WHERE rf."roomId" = r.id AND rf.name = 'Kipas Angin');

-- Kamar dengan AC (info di notes saja karena kolom hasAc belum ada)
INSERT INTO "RoomFacility" ("roomId", name, quantity, category, "publicVisible", "createdAt", "updatedAt")
SELECT r.id, 'AC Split', 1, 'Pendingin', true, NOW(), NOW()
FROM "Room" r WHERE r.code IN ('A','B','C','D','J','K','L','F1','F2')
AND NOT EXISTS (SELECT 1 FROM "RoomFacility" rf WHERE rf."roomId" = r.id AND rf.name = 'AC Split');

-- Kamar dengan KM Dalam
INSERT INTO "RoomFacility" ("roomId", name, quantity, category, "publicVisible", "createdAt", "updatedAt")
SELECT r.id, 'Kamar Mandi Dalam', 1, 'Kamar Mandi', true, NOW(), NOW()
FROM "Room" r WHERE r.code IN ('A','B','C','D','J','K','L','M','F1','F2')
AND NOT EXISTS (SELECT 1 FROM "RoomFacility" rf WHERE rf."roomId" = r.id AND rf.name = 'Kamar Mandi Dalam');

-- Kamar dengan KM Luar (G,H,I)
INSERT INTO "RoomFacility" ("roomId", name, quantity, category, "publicVisible", "createdAt", "updatedAt")
SELECT r.id, 'Kamar Mandi Luar (Bersama)', 1, 'Kamar Mandi', true, NOW(), NOW()
FROM "Room" r WHERE r.code IN ('G','H','I')
AND NOT EXISTS (SELECT 1 FROM "RoomFacility" rf WHERE rf."roomId" = r.id AND rf.name = 'Kamar Mandi Luar (Bersama)');

-- ============================================================================
-- 6. FAQ (37 FAQ — sumber: faqs.service.ts DEFAULT_FAQS)
-- ============================================================================
INSERT INTO "Faq" (question, answer, category, "sortOrder", "isActive", "createdAt", "updatedAt")
VALUES
  ('Fasilitasnya apa saja Kak?', E'Fasilitas terbagi dua:\n\n• Fasilitas umum (bersama): parkir luas untuk mobil & motor, dapur bersama + kitchen set, air PDAM dengan 2 tandon 650 liter, balkon santai, area jemur, taman & area hijau, dan perawatan fasilitas dasar.\n\n• Fasilitas kamar: kasur busa tebal, lemari baju, gantungan baju, pendingin (AC atau kipas), dan kamar mandi dalam atau luar sesuai tipe kamar.\n\nDetail lengkap tersedia di halaman Fasilitas.', 'Fasilitas', 1, true, NOW(), NOW()),
  ('Lokasinya dimana ya? Apakah dekat PTC - Pakuwon Mall?', E'Lokasinya di Jalan Hikmah V No. 48, Surabaya Barat (Kecamatan Sambikerep, Kelurahan Lontar, kode pos 60216). Dekat Pakuwon Mall / PTC, jarak sekitar 7 menit berjalan kaki.\n\nPanduan Google Maps tersedia di halaman Lokasi.', 'Lokasi', 2, true, NOW(), NOW()),
  ('Satu kamar bisa untuk berapa orang?', 'Satu kamar dapat dihuni 1–2 orang. Untuk setiap penghuni tambahan di atas batas gratis, akan dikenakan biaya air dan kebersihan sebesar 20% dari tarif kamar per kepala per bulan. Penghuni tambahan wajib dikonfirmasi dulu ke pengelola dan dicatatkan di kontrak sewa.', 'Aturan', 3, true, NOW(), NOW()),
  ('Apakah tersedia WiFi?', 'Tersedia WiFi sebagai layanan tambahan (per perangkat): Bulanan Rp 50.000 · 2 Mingguan Rp 30.000 · Mingguan Rp 20.000 · Harian Rp 5.000. Biaya per-perangkat diterapkan untuk menjaga kualitas koneksi agar tetap stabil bagi semua penghuni.', 'Fasilitas', 4, true, NOW(), NOW()),
  ('Apakah disediakan nasi putih?', 'Kami tidak menyediakan nasi putih karena harga makanan di warung sebelah sangat terjangkau. Di sekitar kos tersedia banyak pilihan warung makan, kafe, dan restoran.', 'Fasilitas', 5, true, NOW(), NOW()),
  ('Apakah disediakan dispenser air minum?', 'Kami tidak menyediakan dispenser bersama, namun penghuni dapat membeli galon air merek Voila langsung ke pengelola dengan harga Rp 20.000 per galon.', 'Fasilitas', 6, true, NOW(), NOW()),
  ('Ini kost cewek apa cowok?', 'KOST48 adalah kos campur (putra dan putri). Ibu kos tinggal di lokasi dan menjaga ketertiban serta norma lingkungan setiap saat.', 'Aturan', 7, true, NOW(), NOW()),
  ('Apakah boleh membawa pasangan atau selingkuhan?', 'TIDAK BOLEH. Kami dengan tegas melarang hal tersebut. Jika diketahui melanggar, dapat dilaporkan ke pihak berwenang dan menjadi tanggung jawab serta risiko penghuni.', 'Aturan', 8, true, NOW(), NOW()),
  ('Apakah boleh untuk pasangan Nikah Siri?', 'Kami memperbolehkan, asalkan terdapat surat resmi dan kami dapat menghubungi Pemuka Agama atau pihak keluarga wanita yang akan bertanggung jawab.', 'Aturan', 9, true, NOW(), NOW()),
  ('Apakah kos bebas?', 'Jam berkunjung dan pulang dibebaskan — tidak ada jam malam. Jika pengertian "bebas" yang dimaksud adalah berbuat mesum: kami sangat mengecam hal tersebut. Lebih baik cari kos di tempat lain. Terima kasih.', 'Aturan', 10, true, NOW(), NOW()),
  ('Apakah boleh membawa hewan peliharaan?', 'Diperbolehkan asalkan tidak merusak fasilitas. Pemilik wajib bayar uang jaminan Rp 100.000 refundable. Konfirmasi ke pengelola saat booking/check-in.', 'Aturan', 11, true, NOW(), NOW()),
  ('Apakah boleh untuk Pasutri (Pasangan Suami Istri)?', 'Diperbolehkan. Bawa surat nikah, bukti foto pernikahan, atau kartu keluarga yang menunjukkan status pernikahan sah.', 'Aturan', 12, true, NOW(), NOW()),
  ('Apakah ada TV di kamar?', 'Kami tidak menyediakan TV. Semua penghuni menonton via HP. Lebih baik langgan layanan WiFi.', 'Fasilitas', 13, true, NOW(), NOW()),
  ('Apakah tempatnya bersih?', 'Kami berusaha menjaga kebersihan. Standar kebersihan tidak setara hotel. Bisa gunakan jasa Go Clean secara mandiri.', 'Fasilitas', 14, true, NOW(), NOW()),
  ('Apakah ada kamar kosong?', 'Ketersediaan kamar berubah sewaktu-waktu. Cek di halaman utama aplikasi atau hubungi admin via WhatsApp.', 'Lokasi', 15, true, NOW(), NOW()),
  ('Apakah boleh menginap dengan pacar?', 'Boleh, asalkan orang tua pihak wanita datang mengantar dan bicara langsung dengan ibu kos bahwa mereka bertanggung jawab.', 'Aturan', 16, true, NOW(), NOW()),
  ('Apakah sudah termasuk listrik?', 'Listrik pascabayar — pakai dulu, bayar sesuai meter. Setiap kamar gratis 30 kWh/bulan. Kelebihan Rp 2.500/kWh. Perkiraan tambahan: kipas saja ~Rp0, AC hemat Rp0-100rb, AC rata-rata Rp100-200rb, pasutri Rp200-300rb.', 'Tarif', 17, true, NOW(), NOW()),
  ('Berapa tarif kamarnya kak?', 'Tarif KOST48 Rp 850.000 – Rp 1.800.000/bulan tergantung ukuran, KM dalam/luar, AC/kipas, tipe mezzanine/regular, dan perabotan. Lihat di halaman Cek Kamar.', 'Tarif', 18, true, NOW(), NOW()),
  ('Bagaimana cara membayar — tunai atau transfer?', 'Pembayaran bisa tunai maupun transfer. Untuk transfer, unggah bukti bayar di aplikasi; admin verifikasi.', 'Pembayaran', 30, true, NOW(), NOW()),
  ('Apakah boleh mencicil pembayaran sewa?', 'Tidak ada cicilan. Dua nominal sah: (1) DP 30% untuk mengunci kamar, (2) pelunasan penuh (sisa sewa + deposit jaminan). Tagihan lain wajib lunas penuh.', 'Pembayaran', 31, true, NOW(), NOW()),
  ('Apa beda DP (uang muka) dengan deposit jaminan?', 'DP (uang muka) = 30% sewa, hangus bila booking dibatalkan. Deposit jaminan = uang titipan refundable saat keluar (potong bila ada kerusakan/tunggakan).', 'Pembayaran', 32, true, NOW(), NOW()),
  ('Bagaimana hitungan listrik bila melebihi jatah?', 'Kelebihan dihitung dari meter Rp 2.500/kWh, ditagih siklus berikutnya. Sewa harian/mingguan all-in.', 'Pembayaran', 33, true, NOW(), NOW()),
  ('Bagaimana cara memesan kamar?', 'Pilih kamar di katalog, bayar DP 30%. Setelah diverifikasi, kamar terkunci. Lunasi sisa agar kamar aktif (OCCUPIED).', 'Booking', 40, true, NOW(), NOW()),
  ('Berapa lama batas waktu konfirmasi booking?', 'Booking berlaku 3 jam. Tanpa pembayaran valid, booking otomatis kedaluwarsa.', 'Booking', 41, true, NOW(), NOW()),
  ('Bagaimana jika beberapa orang memesan kamar yang sama?', 'First-paid-wins. Pembayaran pertama mengunci kamar. Bila kalah cepat, diurus refund atau kamar lain.', 'Booking', 42, true, NOW(), NOW()),
  ('Kapan saya bisa memperpanjang sewa?', 'Notifikasi H-10. Boleh ajukan sendiri kapan saja lewat aplikasi.', 'Perpanjangan', 50, true, NOW(), NOW()),
  ('Bisakah saya membayar di muka beberapa bulan ke depan?', 'Bisa. Bayar di muka 2–4 bulan dengan harga bulanan, kapan saja.', 'Perpanjangan', 51, true, NOW(), NOW()),
  ('Apakah harga sewa naik saat saya perpanjang?', 'Tidak. Harga dikunci selama kontrak tidak putus. Naik hanya bila kontrak terputus lalu booking ulang.', 'Perpanjangan', 52, true, NOW(), NOW()),
  ('Bagaimana proses keluar (checkout)?', 'Ajukan permintaan checkout. Tagihan harus lunas. Kamar diperiksa, deposit dikembalikan.', 'Checkout & Deposit', 60, true, NOW(), NOW()),
  ('Kapan deposit jaminan dikembalikan?', 'Setelah inspeksi kamar. Bisa dipotong untuk kerusakan luar wajar atau tunggakan.', 'Checkout & Deposit', 61, true, NOW(), NOW()),
  ('Jika keluar lebih awal, apakah sewa dikembalikan?', 'Sewa tidak dikembalikan prorata. Deposit tetap dikembalikan.', 'Checkout & Deposit', 62, true, NOW(), NOW()),
  ('Apa yang terjadi bila melewati tanggal keluar tanpa perpanjang?', 'Kamar dibuka untuk umum. Tunggakan dipotong dari deposit; bila kurang jadi piutang.', 'Checkout & Deposit', 63, true, NOW(), NOW()),
  ('Apakah saya wajib menyerahkan KTP?', 'Ya. Foto KTP untuk verifikasi. Data terproteksi, hanya admin/pemilik, dihapus saat keluar (UU PDP).', 'KTP & Privasi', 70, true, NOW(), NOW()),
  ('Bagaimana cara melapor kerusakan?', 'Buat tiket lewat menu keluhan di aplikasi (boleh foto). Staf menangani, Anda pantau status.', 'Keluhan & Poin', 80, true, NOW(), NOW()),
  ('Bisakah saya memberi tip ke staf?', 'Bisa. Tip sukarela langsung ke e-wallet/bank staf (GoPay/OVO/DANA/transfer) yang muncul di tiket selesai.', 'Keluhan & Poin', 81, true, NOW(), NOW()),
  ('Bagaimana cara mendapatkan poin loyalitas?', 'Poin dari: perpanjang, bayar tepat waktu, lapor masalah valid, lengkapi profil, review, referral. Tukar reward lewat menu Loyalitas.', 'Keluhan & Poin', 82, true, NOW(), NOW()),
  ('Bagaimana cara mengaktifkan notifikasi?', 'Aktifkan lewat menu Notifikasi di aplikasi (izinkan browser). Dapat pengingat kontrak, pembayaran, dll.', 'Keluhan & Poin', 83, true, NOW(), NOW());

-- ============================================================================
-- 7. CHART OF ACCOUNT (37 akun — sumber: default-coa.ts)
-- ============================================================================
INSERT INTO "ChartOfAccount" (code, name, type, "normalBalance", description, "isSystemDefault", "isActive", "createdAt", "updatedAt")
SELECT * FROM (VALUES
  ('1000', 'Cash on Hand',                'ASSET'::"AccountingAccountType",    'DEBIT'::"AccountingNormalBalance",  'Kas tunai operasional kos.', true, true, NOW(), NOW()),
  ('1010', 'Bank Main',                   'ASSET',    'DEBIT',  'Rekening bank utama KOST48.', true, true, NOW(), NOW()),
  ('1020', 'QRIS/E-Wallet Clearing',      'ASSET',    'DEBIT',  'Saldo settlement QRIS/e-wallet yang belum masuk bank.', true, true, NOW(), NOW()),
  ('1100', 'Accounts Receivable',         'ASSET',    'DEBIT',  'Tagihan tenant yang sudah diterbitkan tetapi belum lunas.', true, true, NOW(), NOW()),
  ('1200', 'Inventory',                   'ASSET',    'DEBIT',  'Nilai stok material/barang jika nanti diaktifkan.', true, true, NOW(), NOW()),
  ('1500', 'Fixed Assets',                'ASSET',    'DEBIT',  'Aset tetap seperti renovasi, furniture, AC, CCTV, pompa, router.', true, true, NOW(), NOW()),
  ('1590', 'Accumulated Depreciation',    'ASSET',    'CREDIT', 'Kontra aset untuk akumulasi penyusutan.', true, true, NOW(), NOW()),
  ('2000', 'Tenant Deposit Liability',    'LIABILITY','CREDIT', 'Deposit tenant yang masih menjadi kewajiban, bukan revenue.', true, true, NOW(), NOW()),
  ('2100', 'Accounts Payable',            'LIABILITY','CREDIT', 'Utang usaha/vendor jika nanti diaktifkan.', true, true, NOW(), NOW()),
  ('2200', 'Unearned Revenue',            'LIABILITY','CREDIT', 'Pendapatan diterima di muka jika ada.', true, true, NOW(), NOW()),
  ('2300', 'Tax Payable',                 'LIABILITY','CREDIT', 'Kewajiban pajak/retribusi.', true, true, NOW(), NOW()),
  ('3000', 'Owner Capital',               'EQUITY',   'CREDIT', 'Modal pemilik.', true, true, NOW(), NOW()),
  ('3100', 'Owner Drawings',              'EQUITY',   'DEBIT',  'Prive/pengambilan owner.', true, true, NOW(), NOW()),
  ('3200', 'Retained Earnings',           'EQUITY',   'CREDIT', 'Laba ditahan setelah tutup periode.', true, true, NOW(), NOW()),
  ('4000', 'Room Rent Revenue',           'REVENUE',  'CREDIT', 'Pendapatan sewa kamar.', true, true, NOW(), NOW()),
  ('4010', 'Rent Discount',               'REVENUE',  'DEBIT',  'Kontra-revenue — diskon sewa yang mengurangi pendapatan.', true, true, NOW(), NOW()),
  ('4100', 'Electricity Revenue',         'REVENUE',  'CREDIT', 'Pendapatan tagihan listrik tenant.', true, true, NOW(), NOW()),
  ('4110', 'Water Revenue',               'REVENUE',  'CREDIT', 'Pendapatan tagihan air tenant.', true, true, NOW(), NOW()),
  ('4200', 'Wifi Voucher Revenue',        'REVENUE',  'CREDIT', 'Pendapatan voucher WiFi.', true, true, NOW(), NOW()),
  ('4300', 'Ancillary Revenue',           'REVENUE',  'CREDIT', 'Pendapatan tambahan: laundry, galon, cleaning, parkir, dll.', true, true, NOW(), NOW()),
  ('4400', 'Penalty/Admin Fee Revenue',   'REVENUE',  'CREDIT', 'Denda atau biaya administrasi.', true, true, NOW(), NOW()),
  ('5000', 'Wifi Cost',                   'COGS',     'DEBIT',  'Biaya langsung layanan voucher WiFi.', true, true, NOW(), NOW()),
  ('5100', 'Laundry Partner Cost',        'COGS',     'DEBIT',  'HPP layanan laundry jika ada.', true, true, NOW(), NOW()),
  ('5200', 'Water Gallon Cost',           'COGS',     'DEBIT',  'HPP galon/air minum jika ada.', true, true, NOW(), NOW()),
  ('5300', 'Paid Cleaning Service Cost',  'COGS',     'DEBIT',  'Biaya langsung layanan cleaning berbayar.', true, true, NOW(), NOW()),
  ('6000', 'Salary',                      'EXPENSE',  'DEBIT',  'Gaji staff/admin.', true, true, NOW(), NOW()),
  ('6100', 'Electricity',                 'EXPENSE',  'DEBIT',  'Biaya listrik kos.', true, true, NOW(), NOW()),
  ('6110', 'Water',                       'EXPENSE',  'DEBIT',  'Biaya air kos.', true, true, NOW(), NOW()),
  ('6120', 'Internet',                    'EXPENSE',  'DEBIT',  'Biaya internet.', true, true, NOW(), NOW()),
  ('6200', 'Maintenance',                 'EXPENSE',  'DEBIT',  'Perawatan dan perbaikan.', true, true, NOW(), NOW()),
  ('6210', 'Cleaning',                    'EXPENSE',  'DEBIT',  'Biaya kebersihan.', true, true, NOW(), NOW()),
  ('6220', 'Supplies',                    'EXPENSE',  'DEBIT',  'Perlengkapan operasional.', true, true, NOW(), NOW()),
  ('6300', 'Marketing',                   'EXPENSE',  'DEBIT',  'Promosi/iklan.', true, true, NOW(), NOW()),
  ('6400', 'Tax/Retribution',             'EXPENSE',  'DEBIT',  'Pajak/retribusi.', true, true, NOW(), NOW()),
  ('6500', 'Software/Hosting',            'EXPENSE',  'DEBIT',  'Software, domain, hosting, tools.', true, true, NOW(), NOW()),
  ('6600', 'Bank Fee',                    'EXPENSE',  'DEBIT',  'Biaya bank/payment channel.', true, true, NOW(), NOW()),
  ('6700', 'Depreciation',                'EXPENSE',  'DEBIT',  'Beban penyusutan aset.', true, true, NOW(), NOW()),
  ('6990', 'Other Expense',               'EXPENSE',  'DEBIT',  'Biaya lain-lain.', true, true, NOW(), NOW())
) AS v
WHERE NOT EXISTS (SELECT 1 FROM "ChartOfAccount" WHERE code = v.column1);

-- ============================================================================
-- 8. CASH ACCOUNT (Kas Tunai + Bank Utama)
-- ============================================================================
INSERT INTO "CashAccount" (name, "accountType", "chartOfAccountId",
  "openingBalanceRupiah", "currentBalanceRupiah", "isDefault", "isActive", "createdAt", "updatedAt")
SELECT 'Kas Tunai', 'CASH'::"CashAccountType", id, 0, 0, false, true, NOW(), NOW()
FROM "ChartOfAccount" WHERE code = '1000'
AND NOT EXISTS (SELECT 1 FROM "CashAccount" WHERE name = 'Kas Tunai');

INSERT INTO "CashAccount" (name, "accountType", "chartOfAccountId",
  "openingBalanceRupiah", "currentBalanceRupiah", "isDefault", "isActive", "createdAt", "updatedAt")
SELECT 'Bank Utama', 'BANK', id, 0, 0, true, true, NOW(), NOW()
FROM "ChartOfAccount" WHERE code = '1010'
AND NOT EXISTS (SELECT 1 FROM "CashAccount" WHERE name = 'Bank Utama');

-- ============================================================================
-- 9. ACCOUNTING PERIOD (12 bulan tahun berjalan)
-- ============================================================================
INSERT INTO "AccountingPeriod" (year, month, "startDate", "endDate", status, "createdAt", "updatedAt")
SELECT y, m,
  make_date(y, m, 1),
  (make_date(y, m, 1) + INTERVAL '1 month' - INTERVAL '1 day')::date,
  'OPEN'::"AccountingPeriodStatus", NOW(), NOW()
FROM generate_series(1,12) m, (SELECT EXTRACT(YEAR FROM NOW())::int AS y) t
WHERE NOT EXISTS (SELECT 1 FROM "AccountingPeriod" ap WHERE ap.year = y AND ap.month = m);
