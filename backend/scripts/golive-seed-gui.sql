-- ============================================================================
-- GOLIVE SEED — KOST48 Surabaya V5 (versi GUI-safe)
-- ============================================================================
-- Untuk dijalankan lewat pgAdmin Query Tool → pilih "Execute script" (F8)
-- bukan "Execute query" (F5). Atau paste satu-satu per bagian.
-- ============================================================================

-- 1. USER — OWNER
INSERT INTO "User" ("fullName", email, "passwordHash", role, "isActive", "createdAt", "updatedAt")
SELECT 'Liem Lui', 'liem.lui@gmail.com', '$2a$10$vSKjXNvmmbZFGHCl6QAtM.mWNmXSTSoRVZNgtXfq0QyDKf3aGBf9i', 'OWNER', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE email = 'liem.lui@gmail.com');

-- 2. KAMAR (13 kamar)
-- Note: kolom "roomSize" ada di schema.prisma tapi belum dimigrasi — di-skip.
INSERT INTO "Room" (code, name, floor, status, category, "roomType",
  "monthlyRateRupiah", "defaultDepositRupiah",
  "hasAc", "acWattage", "acCleanIntervalDays", notes, "isActive", "createdAt", "updatedAt")
SELECT * FROM (VALUES
  ('A',  'Kamar A',  '1', 'AVAILABLE'::"RoomStatus", 'DELUXE'::"RoomCategory",   'MEZZANINE'::"RoomType", 1700000, 510000, true,  380, 90, '2m×3,5m + Mezanin 2m×2m; KM Dalam 1,2m×1,5m; Kasur busa tebal 180×200', true, NOW(), NOW()),
  ('B',  'Kamar B',  '1', 'AVAILABLE', 'DELUXE',   'REGULAR',   1700000, 510000, true,  380, 90, '2,5m×3,5m (medium); KM Dalam 1,2m×1,5m; Kasur busa tebal 180×200', true, NOW(), NOW()),
  ('C',  'Kamar C',  '1', 'AVAILABLE', 'DELUXE',   'REGULAR',   1700000, 510000, true,  380, 90, '2,5m×3,5m (medium); KM Dalam 1,5m×1,5m; Kasur busa tebal 180×200', true, NOW(), NOW()),
  ('D',  'Kamar D',  '1', 'AVAILABLE', 'DELUXE',   'REGULAR',   1600000, 480000, true,  380, 90, '2m×3,5m (small); KM Dalam 1,5m×1,5m; Kasur busa tebal 180×200', true, NOW(), NOW()),
  ('G',  'Kamar G',  '1', 'AVAILABLE', 'ECONOMY',  'REGULAR',    850000, 255000, false, NULL, NULL, '2m×3,5m (medium); KM Luar bersama; Kasur busa tebal 180×200', true, NOW(), NOW()),
  ('H',  'Kamar H',  '1', 'AVAILABLE', 'ECONOMY',  'REGULAR',    850000, 255000, false, NULL, NULL, '2m×3,5m (medium); KM Luar bersama; Kasur busa tebal 180×200', true, NOW(), NOW()),
  ('I',  'Kamar I',  '1', 'AVAILABLE', 'ECONOMY',  'REGULAR',    850000, 255000, false, NULL, NULL, '2m×3,5m (medium); KM Luar bersama; Kasur busa tebal 180×200', true, NOW(), NOW()),
  ('J',  'Kamar J',  '1', 'AVAILABLE', 'DELUXE',   'REGULAR',   1600000, 480000, true,  380, 90, '2m×3,5m (medium); KM Dalam 1,2m×1,5m; Kasur busa tebal 180×200', true, NOW(), NOW()),
  ('K',  'Kamar K',  '1', 'AVAILABLE', 'DELUXE',   'REGULAR',   1800000, 540000, true,  450, 90, '3m×3,5m (besar); KM Dalam 1,2m×1,5m; Kasur busa tebal 180×200', true, NOW(), NOW()),
  ('L',  'Kamar L',  '1', 'AVAILABLE', 'DELUXE',   'REGULAR',   1800000, 540000, true,  450, 90, '3m×3,5m (besar); KM Dalam 1,2m×1,5m; Kasur busa tebal 180×200', true, NOW(), NOW()),
  ('M',  'Kamar M',  '1', 'AVAILABLE', 'STANDARD', 'REGULAR',   1400000, 420000, false, NULL, NULL, '3m×3,5m (besar); KM Dalam 1,2m×1,5m; Kasur busa tebal 180×200; Superior/Economy tanpa AC', true, NOW(), NOW()),
  ('F1', 'Kamar F1', '2', 'AVAILABLE', 'DELUXE',   'MEZZANINE', 1750000, 525000, true,  380, 90, '2,5m×3m (standar) + Mezanin 1,5m×3m; KM Dalam 1,5m×1,2m; Kasur busa 90×200 atau double bed', true, NOW(), NOW()),
  ('F2', 'Kamar F2', '2', 'AVAILABLE', 'DELUXE',   'MEZZANINE', 1750000, 525000, true,  380, 90, '2,5m×3m (standar) + Mezanin 1,5m×3m; KM Dalam 1,5m×1,2m; Kasur double bed; Perabot lengkap', true, NOW(), NOW())
) AS v
WHERE NOT EXISTS (SELECT 1 FROM "Room" WHERE code = v.column1);

-- 3. INVENTARIS — Barang gudang
INSERT INTO "InventoryItem" (sku, name, category, unit, "qtyOnHand", "minQty", status, notes, "isActive", "createdAt", "updatedAt")
SELECT * FROM (VALUES
  ('INV-FURN-001', 'Kasur Busa Tebal 180×200',  'Furniture', 'pcs', 13,  0, 'GOOD'::"InventoryItemStatus", 'Kasur busa tebal 180×200cm — 1 per kamar', true, NOW(), NOW()),
  ('INV-FURN-002', 'Lemari Baju',               'Furniture', 'pcs', 13,  0, 'GOOD', 'Lemari baju 1 pintu — 1 per kamar', true, NOW(), NOW()),
  ('INV-FURN-003', 'Gantungan Baju',             'Furniture', 'pcs', 13,  0, 'GOOD', 'Gantungan baju — 1 set per kamar', true, NOW(), NOW()),
  ('INV-FURN-004', 'Kipas Angin',                'Electronic','pcs', 13,  0, 'GOOD', 'Kipas angin — semua kamar punya (termasuk yg ber-AC)', true, NOW(), NOW()),
  ('INV-FURN-005', 'AC Split 1/2 PK 380W',       'Electronic','pcs', 10,  0, 'GOOD', 'AC 1/2 PK 380W — kamar A,B,C,D,J,F1,F2 + cadangan', true, NOW(), NOW()),
  ('INV-FURN-006', 'AC Split 1/2 PK 450W',       'Electronic','pcs',  2,  0, 'GOOD', 'AC 1/2 PK 450W — kamar K,L (ukuran besar)', true, NOW(), NOW()),
  ('INV-FURN-007', 'Kasur Busa 90×200',          'Furniture', 'pcs',  2,  0, 'GOOD', 'Kasur busa 90×200cm — kamar F1,F2 (mezanin)', true, NOW(), NOW()),
  ('INV-FURN-008', 'Double Bed',                 'Furniture', 'pcs',  1,  0, 'GOOD', 'Double bed — kamar F2', true, NOW(), NOW())
) AS v
WHERE NOT EXISTS (SELECT 1 FROM "InventoryItem" WHERE sku = v.column1);

-- 4. ROOM ITEM — Kasur 180×200 (semua kamar)
INSERT INTO "RoomItem" ("roomId", "itemId", qty, status, "createdAt", "updatedAt")
SELECT r.id, i.id, 1, 'GOOD', NOW(), NOW()
FROM "Room" r CROSS JOIN "InventoryItem" i
WHERE i.sku = 'INV-FURN-001'
AND NOT EXISTS (SELECT 1 FROM "RoomItem" ri WHERE ri."roomId" = r.id AND ri."itemId" = i.id);

-- 4b. RoomItem — Lemari Baju (semua kamar)
INSERT INTO "RoomItem" ("roomId", "itemId", qty, status, "createdAt", "updatedAt")
SELECT r.id, i.id, 1, 'GOOD', NOW(), NOW()
FROM "Room" r CROSS JOIN "InventoryItem" i
WHERE i.sku = 'INV-FURN-002'
AND NOT EXISTS (SELECT 1 FROM "RoomItem" ri WHERE ri."roomId" = r.id AND ri."itemId" = i.id);

-- 4c. RoomItem — Gantungan Baju (semua kamar)
INSERT INTO "RoomItem" ("roomId", "itemId", qty, status, "createdAt", "updatedAt")
SELECT r.id, i.id, 1, 'GOOD', NOW(), NOW()
FROM "Room" r CROSS JOIN "InventoryItem" i
WHERE i.sku = 'INV-FURN-003'
AND NOT EXISTS (SELECT 1 FROM "RoomItem" ri WHERE ri."roomId" = r.id AND ri."itemId" = i.id);

-- 4d. RoomItem — Kipas Angin (semua kamar)
INSERT INTO "RoomItem" ("roomId", "itemId", qty, status, "createdAt", "updatedAt")
SELECT r.id, i.id, 1, 'GOOD', NOW(), NOW()
FROM "Room" r CROSS JOIN "InventoryItem" i
WHERE i.sku = 'INV-FURN-004'
AND NOT EXISTS (SELECT 1 FROM "RoomItem" ri WHERE ri."roomId" = r.id AND ri."itemId" = i.id);

-- 4e. RoomItem — AC 380W (kamar A,B,C,D,J,F1,F2)
INSERT INTO "RoomItem" ("roomId", "itemId", qty, status, "createdAt", "updatedAt")
SELECT r.id, i.id, 1, 'GOOD', NOW(), NOW()
FROM "Room" r CROSS JOIN "InventoryItem" i
WHERE i.sku = 'INV-FURN-005' AND r.code IN ('A','B','C','D','J','F1','F2')
AND NOT EXISTS (SELECT 1 FROM "RoomItem" ri WHERE ri."roomId" = r.id AND ri."itemId" = i.id);

-- 4f. RoomItem — AC 450W (kamar K,L)
INSERT INTO "RoomItem" ("roomId", "itemId", qty, status, "createdAt", "updatedAt")
SELECT r.id, i.id, 1, 'GOOD', NOW(), NOW()
FROM "Room" r CROSS JOIN "InventoryItem" i
WHERE i.sku = 'INV-FURN-006' AND r.code IN ('K','L')
AND NOT EXISTS (SELECT 1 FROM "RoomItem" ri WHERE ri."roomId" = r.id AND ri."itemId" = i.id);

-- 4g. RoomItem — Kasur 90×200 (kamar F1,F2)
INSERT INTO "RoomItem" ("roomId", "itemId", qty, status, "createdAt", "updatedAt")
SELECT r.id, i.id, 1, 'GOOD', NOW(), NOW()
FROM "Room" r CROSS JOIN "InventoryItem" i
WHERE i.sku = 'INV-FURN-007' AND r.code IN ('F1','F2')
AND NOT EXISTS (SELECT 1 FROM "RoomItem" ri WHERE ri."roomId" = r.id AND ri."itemId" = i.id);

-- 4h. RoomItem — Double Bed (kamar F2)
INSERT INTO "RoomItem" ("roomId", "itemId", qty, status, "createdAt", "updatedAt")
SELECT r.id, i.id, 1, 'GOOD', NOW(), NOW()
FROM "Room" r CROSS JOIN "InventoryItem" i
WHERE i.sku = 'INV-FURN-008' AND r.code = 'F2'
AND NOT EXISTS (SELECT 1 FROM "RoomItem" ri WHERE ri."roomId" = r.id AND ri."itemId" = i.id);

-- 5. ROOM FACILITY — Fasilitas dasar semua kamar
INSERT INTO "RoomFacility" ("roomId", name, quantity, category, "publicVisible", "createdAt", "updatedAt")
SELECT r.id, v.name, v.quantity, v.category, v."publicVisible", NOW(), NOW()
FROM "Room" r CROSS JOIN (VALUES
  ('Kasur Busa Tebal 180×200', 1, 'Tidur', true),
  ('Lemari Baju',              1, 'Perabot', true),
  ('Gantungan Baju',           1, 'Perabot', true),
  ('Kipas Angin',              1, 'Pendingin', true)
) AS v(name, quantity, category, "publicVisible")
WHERE NOT EXISTS (
  SELECT 1 FROM "RoomFacility" rf
  WHERE rf."roomId" = r.id AND rf.name = v.name
);

-- 5b. RoomFacility — AC + KM Dalam per kamar tertentu
INSERT INTO "RoomFacility" ("roomId", name, quantity, category, "publicVisible", "createdAt", "updatedAt")
SELECT r.id, 'AC Split', 1, 'Pendingin', true, NOW(), NOW()
FROM "Room" r WHERE r.code IN ('A','B','C','D','J','K','L','F1','F2')
AND NOT EXISTS (SELECT 1 FROM "RoomFacility" rf WHERE rf."roomId" = r.id AND rf.name = 'AC Split');

INSERT INTO "RoomFacility" ("roomId", name, quantity, category, "publicVisible", "createdAt", "updatedAt")
SELECT r.id, 'Kamar Mandi Dalam', 1, 'Kamar Mandi', true, NOW(), NOW()
FROM "Room" r WHERE r.code IN ('A','B','C','D','J','K','L','M','F1','F2')
AND NOT EXISTS (SELECT 1 FROM "RoomFacility" rf WHERE rf."roomId" = r.id AND rf.name = 'Kamar Mandi Dalam');

INSERT INTO "RoomFacility" ("roomId", name, quantity, category, "publicVisible", "createdAt", "updatedAt")
SELECT r.id, 'Kamar Mandi Luar (Bersama)', 1, 'Kamar Mandi', true, NOW(), NOW()
FROM "Room" r WHERE r.code IN ('G','H','I')
AND NOT EXISTS (SELECT 1 FROM "RoomFacility" rf WHERE rf."roomId" = r.id AND rf.name LIKE 'Kamar Mandi Luar%');

-- 6. FAQ (37 FAQ) — jalankan per bagian bila perlu
INSERT INTO "Faq" (question, answer, category, "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT * FROM (VALUES
  ('Fasilitasnya apa saja Kak?',
   E'Fasilitas terbagi dua:\n\n• Fasilitas umum (bersama): parkir luas untuk mobil & motor, dapur bersama + kitchen set, air PDAM dengan 2 tandon 650 liter, balkon santai, area jemur, taman & area hijau, dan perawatan fasilitas dasar.\n\n• Fasilitas kamar: kasur busa tebal, lemari baju, gantungan baju, pendingin (AC atau kipas), dan kamar mandi dalam atau luar sesuai tipe kamar.\n\nDetail lengkap tersedia di halaman Fasilitas.',
   'Fasilitas', 1, true, NOW(), NOW()),
  ('Lokasinya dimana ya? Apakah dekat PTC - Pakuwon Mall?',
   E'Lokasinya di Jalan Hikmah V No. 48, Surabaya Barat (Kecamatan Sambikerep, Kelurahan Lontar, kode pos 60216). Dekat Pakuwon Mall / PTC, jarak sekitar 7 menit berjalan kaki.\n\nPanduan Google Maps tersedia di halaman Lokasi.',
   'Lokasi', 2, true, NOW(), NOW()),
  ('Satu kamar bisa untuk berapa orang?',
   E'Satu kamar dapat dihuni 1–2 orang. Untuk setiap penghuni tambahan di atas batas gratis, akan dikenakan biaya air dan kebersihan sebesar 20% dari tarif kamar per kepala per bulan.\n\nPenghuni tambahan wajib dikonfirmasi dulu ke pengelola dan dicatatkan di kontrak sewa.',
   'Aturan', 3, true, NOW(), NOW()),
  ('Apakah tersedia WiFi?',
   'Tersedia WiFi sebagai layanan tambahan (per perangkat): Bulanan Rp 50.000 · 2 Mingguan Rp 30.000 · Mingguan Rp 20.000 · Harian Rp 5.000. Biaya per-perangkat diterapkan untuk menjaga kualitas koneksi agar tetap stabil bagi semua penghuni.',
   'Fasilitas', 4, true, NOW(), NOW()),
  ('Apakah disediakan nasi putih?',
   'Kami tidak menyediakan nasi putih karena harga makanan di warung sebelah sangat terjangkau. Di sekitar kos tersedia banyak pilihan warung makan, kafe, dan restoran.',
   'Fasilitas', 5, true, NOW(), NOW()),
  ('Apakah disediakan dispenser air minum?',
   'Kami tidak menyediakan dispenser bersama, namun penghuni dapat membeli galon air merek Voila langsung ke pengelola dengan harga Rp 20.000 per galon.',
   'Fasilitas', 6, true, NOW(), NOW()),
  ('Ini kost cewek apa cowok?',
   E'KOST48 adalah kos campur (putra dan putri). Ibu kos tinggal di lokasi dan menjaga ketertiban serta norma lingkungan setiap saat.\n\nIbu kos juga dapat memantau dan memberikan laporan kepada keluarga penghuni bila diperlukan.',
   'Aturan', 7, true, NOW(), NOW()),
  ('Apakah boleh membawa pasangan atau selingkuhan?',
   'TIDAK BOLEH. Kami dengan tegas melarang hal tersebut. Jika diketahui melanggar, dapat dilaporkan ke pihak berwenang dan menjadi tanggung jawab serta risiko penghuni karena telah memberikan informasi tidak jujur saat mendaftar.',
   'Aturan', 8, true, NOW(), NOW()),
  ('Apakah boleh untuk pasangan Nikah Siri?',
   'Kami memperbolehkan, asalkan terdapat surat resmi dan kami dapat menghubungi Pemuka Agama atau pihak keluarga wanita yang akan bertanggung jawab atas segala hal yang mungkin terjadi.',
   'Aturan', 9, true, NOW(), NOW()),
  ('Apakah kos bebas?',
   E'Jam berkunjung dan pulang dibebaskan — tidak ada jam malam yang membatasi.\n\nJika pengertian "bebas" yang dimaksud adalah berbuat mesum: kami sangat mengecam hal tersebut. Lebih baik cari kos di tempat lain. Terima kasih.',
   'Aturan', 10, true, NOW(), NOW()),
  ('Apakah boleh membawa hewan peliharaan?',
   E'Diperbolehkan membawa hewan peliharaan asalkan tidak merusak fasilitas kami.\n\nPemilik hewan peliharaan wajib membayar uang jaminan sebesar Rp 100.000 yang akan dikembalikan penuh jika tidak terdapat kerusakan. Pastikan hewan peliharaan dikonfirmasi ke pengelola saat booking/check-in.',
   'Aturan', 11, true, NOW(), NOW()),
  ('Apakah boleh untuk Pasutri (Pasangan Suami Istri)?',
   'Diperbolehkan. Jangan lupa membawa surat nikah, bukti foto pernikahan, atau kartu keluarga yang menunjukkan status pernikahan sah.',
   'Aturan', 12, true, NOW(), NOW()),
  ('Apakah ada TV di kamar?',
   'Kami tidak menyediakan TV karena sudah lama tidak ada yang menonton — semua penghuni menonton via HP. Lebih baik langgan layanan WiFi dari kami untuk pengalaman streaming yang lebih nyaman.',
   'Fasilitas', 13, true, NOW(), NOW()),
  ('Apakah tempatnya bersih?',
   E'Kami berusaha menjaga kebersihan area kos dengan rutin. Namun perlu dimaklumi bahwa standar kebersihan kami tidak setara hotel.\n\nJika Anda menginginkan kebersihan kamar setara hotel, Anda bisa menggunakan jasa layanan bersih kamar seperti Go Clean secara mandiri.',
   'Fasilitas', 14, true, NOW(), NOW()),
  ('Apakah ada kamar kosong?',
   'Ketersediaan kamar dapat berubah sewaktu-waktu. Silakan cek langsung di halaman utama aplikasi ini untuk melihat status kamar secara real-time, atau hubungi admin via WhatsApp untuk informasi terbaru.',
   'Lokasi', 15, true, NOW(), NOW()),
  ('Apakah boleh menginap dengan pacar?',
   'Boleh, asalkan orang tua pihak wanita datang mengantar dan berbicara langsung dengan ibu kos, bahwa mereka mengetahui dan bertanggung jawab atas segala risikonya.',
   'Aturan', 16, true, NOW(), NOW()),
  ('Apakah sudah termasuk listrik?',
   E'Listrik menggunakan sistem pascabayar — pakai dulu, bayar sesuai pemakaian meter.\n\nSetiap kamar mendapat jatah listrik gratis 30 kWh per bulan. Kelebihan di atas jatah ditagihkan Rp 2.500 per kWh dan dicantumkan di invoice meter terpisah (bisa dibayar sekaligus dengan sewa).\n\nPerkiraan tambahan biaya listrik:\n• Hanya kipas: biasanya tidak ada tambahan\n• Kamar AC, hemat: Rp 0–100.000\n• Kamar AC, rata-rata: Rp 100.000–200.000\n• Pasutri sering di kos: Rp 200.000–300.000\n\nSaat keluar tidak ada sisa listrik yang hangus — tagihan meter terakhir dipotong dari deposit.',
   'Tarif', 17, true, NOW(), NOW()),
  ('Berapa tarif kamarnya kak?',
   E'Tarif kamar KOST48 berkisar Rp 850.000 – Rp 1.800.000 per bulan, dipengaruhi oleh:\n• Ukuran kamar (small/medium/big)\n• Kamar mandi dalam atau luar\n• Pendingin AC atau kipas\n• Tipe mezzanine atau kamar biasa\n• Perabotan dan kelengkapan\n\nLihat tarif lengkap dan ketersediaan di halaman Cek Kamar.',
   'Tarif', 18, true, NOW(), NOW()),
  ('Bagaimana cara membayar — tunai atau transfer?',
   'Pembayaran bisa tunai maupun transfer. Untuk transfer, unggah bukti bayar di aplikasi; admin akan memverifikasi sebelum pembayaran tercatat dan kamar diaktifkan.',
   'Pembayaran', 30, true, NOW(), NOW()),
  ('Apakah boleh mencicil pembayaran sewa?',
   'Tidak ada cicilan. Nominal yang sah hanya dua: (1) uang muka (DP) 30% tepat untuk mengunci kamar, atau (2) pelunasan penuh (sisa sewa + deposit jaminan). Tagihan lain seperti perpanjangan dan utilitas wajib dibayar lunas penuh.',
   'Pembayaran', 31, true, NOW(), NOW()),
  ('Apa beda DP (uang muka) dengan deposit jaminan?',
   'DP (uang muka) = 30% dari sewa untuk memesan/mengunci kamar dan akan HANGUS bila booking dibatalkan atau gagal dilunasi. Deposit jaminan = uang titipan yang DAPAT DIKEMBALIKAN saat Anda keluar, selama tidak ada kerusakan atau tunggakan. Keduanya berbeda dan dicatat terpisah.',
   'Pembayaran', 32, true, NOW(), NOW()),
  ('Bagaimana hitungan listrik bila melebihi jatah?',
   'Tiap kamar mendapat jatah listrik bulanan. Kelebihan dihitung dari meter dengan tarif Rp 2.500/kWh dan ditagihkan pada siklus berikutnya. Untuk sewa harian/mingguan, utilitas umumnya sudah termasuk (all-in).',
   'Pembayaran', 33, true, NOW(), NOW()),
  ('Bagaimana cara memesan kamar?',
   'Pilih kamar di katalog, lalu bayar DP 30% sebagai tanda jadi. Setelah bukti bayar diverifikasi admin, kamar terkunci untuk Anda. Lengkapi pelunasan sesuai jadwal agar kamar aktif (OCCUPIED).',
   'Booking', 40, true, NOW(), NOW()),
  ('Berapa lama batas waktu konfirmasi booking?',
   'Booking berlaku 3 jam. Bila dalam 3 jam belum ada pembayaran yang valid, pemesanan otomatis kedaluwarsa dan kamar kembali tersedia untuk orang lain.',
   'Booking', 41, true, NOW(), NOW()),
  ('Bagaimana jika beberapa orang memesan kamar yang sama?',
   'Berlaku "siapa cepat dia dapat" (first-paid-wins): pembayaran pertama yang disetujui mengunci kamar, dan pemesan lain dibatalkan. Bila Anda sudah terlanjur transfer namun kalah cepat, uang Anda akan diuruskan refund atau Anda diarahkan memilih kamar lain.',
   'Booking', 42, true, NOW(), NOW()),
  ('Kapan saya bisa memperpanjang sewa?',
   'Anda akan ditanya lewat notifikasi mulai 10 hari sebelum kontrak berakhir (H-10), tetapi Anda juga boleh mengajukan perpanjangan sendiri kapan saja melalui aplikasi.',
   'Perpanjangan', 50, true, NOW(), NOW()),
  ('Bisakah saya membayar di muka beberapa bulan ke depan?',
   'Bisa. Anda boleh membayar di muka untuk 2–4 bulan ke depan dengan harga bulanan, tanpa harus menunggu kontrak hampir habis.',
   'Perpanjangan', 51, true, NOW(), NOW()),
  ('Apakah harga sewa naik saat saya perpanjang?',
   'Tidak. Selama Anda terus memperpanjang tanpa putus kontrak, harga sewa Anda dikunci (tidak naik). Harga hanya bisa berubah bila kontrak terputus lalu Anda memesan ulang sebagai penghuni baru.',
   'Perpanjangan', 52, true, NOW(), NOW()),
  ('Bagaimana proses keluar (checkout)?',
   'Ajukan permintaan checkout paling lambat pada tanggal rencana keluar. Semua tagihan harus lunas. Setelah itu kamar diperiksa (inspeksi), lalu deposit jaminan dikembalikan.',
   'Checkout & Deposit', 60, true, NOW(), NOW()),
  ('Kapan deposit jaminan dikembalikan dan bisakah terpotong?',
   'Deposit dikembalikan setelah inspeksi kamar. Deposit dapat dipotong bila ada kerusakan di luar kewajaran atau tunggakan; sisanya dikembalikan. Setiap potongan disertai catatan yang jelas.',
   'Checkout & Deposit', 61, true, NOW(), NOW()),
  ('Jika saya keluar lebih awal, apakah sewa dikembalikan?',
   'Sewa yang sudah dibayar tidak dikembalikan secara prorata (hangus untuk sisa periode), namun deposit jaminan tetap dikembalikan seperti biasa.',
   'Checkout & Deposit', 62, true, NOW(), NOW()),
  ('Apa yang terjadi bila saya melewati tanggal keluar tanpa perpanjang?',
   'Bila melewati tanggal keluar dan tidak memperpanjang, kamar akan dibuka kembali untuk umum dan diproses checkout. Bila ada tunggakan, sisa tagihan dapat dipotong dari deposit; bila deposit tidak cukup, sisanya menjadi piutang Anda.',
   'Checkout & Deposit', 63, true, NOW(), NOW()),
  ('Apakah saya wajib menyerahkan KTP?',
   'Ya, foto KTP diperlukan saat check-in untuk verifikasi identitas. Cukup foto (untuk pencocokan visual). Data disimpan terproteksi, hanya dapat diakses admin/pemilik, dan dihapus saat Anda keluar sesuai UU Perlindungan Data Pribadi.',
   'KTP & Privasi', 70, true, NOW(), NOW()),
  ('Bagaimana cara melapor kerusakan atau keluhan?',
   'Buat tiket lewat menu keluhan di aplikasi (boleh sertakan foto). Staf akan menanganinya; Anda dapat memantau statusnya hingga selesai. Sebagai penghuni, Anda juga berperan mengawasi kualitas kerja staf.',
   'Keluhan & Poin', 80, true, NOW(), NOW()),
  ('Apakah saya bisa memberi tip ke staf setelah keluhan selesai?',
   'Bisa, tip bersifat sukarela dan langsung ke staf melalui link e-wallet/bank milik staf (GoPay/OVO/DANA/transfer) yang muncul di tiket yang sudah selesai. Tip ini langsung tenant ke staf dan tidak dipotong pengelola.',
   'Keluhan & Poin', 81, true, NOW(), NOW()),
  ('Bagaimana cara mendapatkan dan memakai poin loyalitas?',
   'Anda mendapat poin dari: memperpanjang sewa, membayar tepat waktu, melaporkan masalah yang tervalidasi, melengkapi profil, memberi review saat perpanjang, dan mengajak teman (referral). Poin dapat ditukar dengan reward layanan (mis. pembersihan kamar, voucher WiFi) lewat menu Loyalitas; penukaran dikonfirmasi admin. Poin hangus setelah Anda keluar.',
   'Keluhan & Poin', 82, true, NOW(), NOW()),
  ('Bagaimana cara mengaktifkan notifikasi?',
   'Aktifkan notifikasi lewat menu Notifikasi di aplikasi (izinkan notifikasi browser). Anda akan menerima pengingat kontrak, status pembayaran, dan info penting lainnya.',
   'Keluhan & Poin', 83, true, NOW(), NOW())
) AS v(question, answer, category, "sortOrder", "isActive", "createdAt", "updatedAt")
WHERE NOT EXISTS (SELECT 1 FROM "Faq" f WHERE f.question = v.question);

-- 7. OPERATIONAL SETTING
INSERT INTO "OperationalSetting" (id,
  "freeElectricityKwhPerMonth", "electricityTariffPerKwhRupiah",
  "waterMeteringEnabled", "waterTariffPerM3Rupiah", "freeWaterM3PerMonth",
  "wifiRupiah", "galonRupiah", "petDepositRupiah", "extraOccupantFeePercent",
  "deepseekModel", "deepseekFinanceModel", "deepseekBaseUrl", "deepseekApiKey",
  "aiFeaturesEnabled", "aiManualOnly", "aiOwnerAdminOnly",
  "aiDailyRequestLimit", "aiMaxInputChars", "aiMaxOutputTokens", "aiFinanceMaxOutputTokens",
  "aiLogUsage", "aiDraftRetentionDays",
  "tenantLoyaltyEnabled", "adminWhatsappNumber", "updatedAt")
SELECT 1,
  30, 2500,
  false, 0, 0,
  50000, 20000, 100000, 20,
  'deepseek-v4-flash', 'deepseek-v4-pro', 'https://api.deepseek.com', '',
  false, true, true,
  50, 12000, 1400, 2200,
  true, 60,
  false, '6285648887628', NOW()
WHERE NOT EXISTS (SELECT 1 FROM "OperationalSetting" WHERE id = 1);

-- 8. CHART OF ACCOUNT (37 akun)
INSERT INTO "ChartOfAccount" (code, name, type, "normalBalance", description, "isSystemDefault", "isActive", "createdAt", "updatedAt")
SELECT * FROM (VALUES
  ('1000', 'Cash on Hand',                'ASSET'::"AccountingAccountType", 'DEBIT'::"AccountingNormalBalance",  'Kas tunai operasional kos.', true, true, NOW(), NOW()),
  ('1010', 'Bank Main',                   'ASSET', 'DEBIT',  'Rekening bank utama KOST48.', true, true, NOW(), NOW()),
  ('1020', 'QRIS/E-Wallet Clearing',      'ASSET', 'DEBIT',  'Saldo settlement QRIS/e-wallet yang belum masuk bank.', true, true, NOW(), NOW()),
  ('1100', 'Accounts Receivable',         'ASSET', 'DEBIT',  'Tagihan tenant yang sudah diterbitkan tetapi belum lunas.', true, true, NOW(), NOW()),
  ('1200', 'Inventory',                   'ASSET', 'DEBIT',  'Nilai stok material/barang jika nanti diaktifkan.', true, true, NOW(), NOW()),
  ('1500', 'Fixed Assets',                'ASSET', 'DEBIT',  'Aset tetap seperti renovasi, furniture, AC, CCTV, pompa, router.', true, true, NOW(), NOW()),
  ('1590', 'Accumulated Depreciation',    'ASSET', 'CREDIT', 'Kontra aset untuk akumulasi penyusutan.', true, true, NOW(), NOW()),
  ('2000', 'Tenant Deposit Liability',    'LIABILITY', 'CREDIT', 'Deposit tenant yang masih menjadi kewajiban, bukan revenue.', true, true, NOW(), NOW()),
  ('2100', 'Accounts Payable',            'LIABILITY', 'CREDIT', 'Utang usaha/vendor jika nanti diaktifkan.', true, true, NOW(), NOW()),
  ('2200', 'Unearned Revenue',            'LIABILITY', 'CREDIT', 'Pendapatan diterima di muka jika ada.', true, true, NOW(), NOW()),
  ('2300', 'Tax Payable',                 'LIABILITY', 'CREDIT', 'Kewajiban pajak/retribusi.', true, true, NOW(), NOW()),
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

-- 9. CASH ACCOUNT
INSERT INTO "CashAccount" (name, "accountType", "chartOfAccountId",
  "openingBalanceRupiah", "currentBalanceRupiah", "isDefault", "isActive", "createdAt", "updatedAt")
SELECT 'Kas Tunai', 'CASH', id, 0, 0, false, true, NOW(), NOW()
FROM "ChartOfAccount" WHERE code = '1000'
AND NOT EXISTS (SELECT 1 FROM "CashAccount" WHERE name = 'Kas Tunai');

INSERT INTO "CashAccount" (name, "accountType", "chartOfAccountId",
  "openingBalanceRupiah", "currentBalanceRupiah", "isDefault", "isActive", "createdAt", "updatedAt")
SELECT 'Bank Utama', 'BANK', id, 0, 0, true, true, NOW(), NOW()
FROM "ChartOfAccount" WHERE code = '1010'
AND NOT EXISTS (SELECT 1 FROM "CashAccount" WHERE name = 'Bank Utama');

-- 10. ACCOUNTING PERIOD (12 bulan)
INSERT INTO "AccountingPeriod" (year, month, "startDate", "endDate", status, "createdAt", "updatedAt")
SELECT y, m,
  make_date(y, m, 1),
  (make_date(y, m, 1) + INTERVAL '1 month' - INTERVAL '1 day')::date,
  'OPEN', NOW(), NOW()
FROM (SELECT EXTRACT(YEAR FROM NOW())::int AS y) yr
CROSS JOIN generate_series(1,12) AS m
WHERE NOT EXISTS (
  SELECT 1 FROM "AccountingPeriod" ap
  WHERE ap.year = yr.y AND ap.month = m
);

-- 11. ADDITIONAL SERVICE
INSERT INTO "AdditionalService" (name, description, "priceRupiah", unit, "isActive", "sortOrder", "createdAt", "updatedAt")
SELECT * FROM (VALUES
  ('WiFi', 'Layanan WiFi per perangkat per bulan — kualitas koneksi stabil', 50000, '/perangkat/bulan', true, 1, NOW(), NOW()),
  ('Galon Air (Voila)', 'Air minum galon merk Voila — beli langsung ke pengelola', 20000, '/galon', true, 2, NOW(), NOW()),
  ('TV Tambahan', 'Layar datar 17 inci — opsional, konfirmasi dulu ke pengelola', 50000, '/bulan', true, 3, NOW(), NOW()),
  ('Deposit Hewan Peliharaan', 'Deposit jaminan hewan — refundable bila tidak ada kerusakan', 100000, '/hewan', true, 4, NOW(), NOW())
) AS v
WHERE NOT EXISTS (SELECT 1 FROM "AdditionalService" WHERE name = v.column1);

-- ============================================================================
-- SELESAI — Cek hasil
-- ============================================================================
SELECT 'User OWNER' AS info, COUNT(*) FROM "User" WHERE role = 'OWNER';
SELECT 'Kamar' AS info, COUNT(*) FROM "Room";
SELECT 'RoomFacility' AS info, COUNT(*) FROM "RoomFacility";
SELECT 'InventoryItem' AS info, COUNT(*) FROM "InventoryItem";
SELECT 'RoomItem' AS info, COUNT(*) FROM "RoomItem";
SELECT 'Faq' AS info, COUNT(*) FROM "Faq";
SELECT 'COA' AS info, COUNT(*) FROM "ChartOfAccount";
SELECT 'CashAccount' AS info, COUNT(*) FROM "CashAccount";
SELECT 'AccountingPeriod' AS info, COUNT(*) FROM "AccountingPeriod";
SELECT 'AdditionalService' AS info, COUNT(*) FROM "AdditionalService";
SELECT 'OperationalSetting' AS info, COUNT(*) FROM "OperationalSetting";
