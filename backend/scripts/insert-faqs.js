require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../src/generated/prisma');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });

const data = [
  { category: 'Tarif', sortOrder: 1, question: 'Berapa kisaran tarif kamar?', answer: 'Tarif kamar berkisar Rp 800.000 - Rp 1.800.000 per bulan, tergantung ukuran kamar, kamar mandi dalam/luar, pendingin AC/kipas, perabotan, dan lokasi kamar. Untuk harga aktif, cek detail kamar terbaru di katalog.' },
  { category: 'Fasilitas', sortOrder: 2, question: 'Fasilitas apa saja yang tersedia?', answer: 'Fasilitas umum: parkir mobil & motor, dapur bersama kitchen set, air PDAM dengan 2 tandon 650 liter, balkon santai, area jemur, taman, dan perawatan fasilitas dasar. Fasilitas kamar: kasur, lemari baju, pendingin (AC atau kipas), kamar mandi dalam atau luar.' },
  { category: 'Lokasi', sortOrder: 3, question: 'Di mana lokasi KOST48?', answer: 'KOST48 berada di Jalan Hikmah V No. 48, Kecamatan Sambikerep, Kelurahan Lontar, Surabaya Barat 60216. Sekitar 7 menit berjalan kaki dari Pakuwon Mall / PTC.' },
  { category: 'Aturan', sortOrder: 4, question: 'Satu kamar untuk berapa orang?', answer: 'Standar 1-2 orang. Penghuni tambahan perlu konfirmasi kepada pengelola.' },
  { category: 'Fasilitas', sortOrder: 5, question: 'Apakah tersedia WiFi?', answer: 'WiFi tersedia sebagai layanan tambahan Rp 50.000 per perangkat per bulan agar kualitas koneksi tetap terjaga.' },
  { category: 'Fasilitas', sortOrder: 6, question: 'Apakah ada air minum atau galon?', answer: 'Tersedia galon air merek Voila seharga Rp 15.000 per galon melalui pengelola.' },
  { category: 'Aturan', sortOrder: 7, question: 'Apakah KOST48 khusus pria atau wanita?', answer: 'Kos campur (putra dan putri). Pengelola menjaga ketertiban dan norma lingkungan di lokasi.' },
  { category: 'Aturan', sortOrder: 8, question: 'Bagaimana kebijakan tamu berkunjung?', answer: 'Tamu wajib mengikuti aturan pengelola dan norma lingkungan setempat.' },
  { category: 'Aturan', sortOrder: 9, question: 'Apakah boleh untuk pasangan suami istri?', answer: 'Diperbolehkan dengan membawa bukti pernikahan (kartu nikah, KK, atau dokumen pernikahan lainnya) sesuai ketentuan pengelola.' },
  { category: 'Aturan', sortOrder: 10, question: 'Apakah kos bebas keluar masuk?', answer: 'Jam keluar masuk cukup fleksibel, namun penghuni wajib menjaga ketertiban, norma, dan keamanan lingkungan kos.' },
  { category: 'Aturan', sortOrder: 11, question: 'Apakah boleh membawa hewan peliharaan?', answer: 'Dapat dipertimbangkan selama tidak merusak fasilitas. Penghuni bersedia membayar uang jaminan Rp 100.000 yang dikembalikan jika tidak ada kerusakan.' },
  { category: 'Fasilitas', sortOrder: 12, question: 'Apakah ada TV di kamar?', answer: 'TV tersedia sebagai layanan opsional Rp 50.000 per bulan, layar datar 17 inch. Konfirmasi ketersediaan kepada pengelola.' },
  { category: 'Fasilitas', sortOrder: 13, question: 'Seberapa bersih kondisi kos?', answer: 'Pengelola menjaga area kos secara rutin. Penghuni diharapkan ikut menjaga kebersihan kamar dan area bersama untuk kenyamanan bersama.' },
  { category: 'Tarif', sortOrder: 14, question: 'Bagaimana aturan pemakaian listrik?', answer: 'Ada jatah listrik bulanan per kamar. Jika pemakaian melebihi jatah, biaya tambahan dihitung dengan tarif Rp 2.500/kWh.' },
  { category: 'Fasilitas', sortOrder: 15, question: 'Apakah ada makanan atau warung di sekitar?', answer: 'KOST48 tidak menyediakan konsumsi. Banyak pilihan warung makan, kafe, dan restoran yang mudah diakses di sekitar lokasi.' },
  { category: 'Lokasi', sortOrder: 16, question: 'Apakah ada kamar yang kosong sekarang?', answer: 'Ketersediaan bisa berubah setiap saat. Cek status terkini di halaman Cek Kamar di aplikasi ini, atau hubungi admin via WhatsApp untuk konfirmasi.' },
  { category: 'Aturan', sortOrder: 17, question: 'Apakah boleh menginap dengan tamu?', answer: 'Wajib konfirmasi kepada pengelola terlebih dahulu, disesuaikan dengan norma keluarga dan lingkungan yang berlaku.' },
  { category: 'Tarif', sortOrder: 18, question: 'Berapa biaya layanan tambahan?', answer: 'WiFi: Rp 50.000/perangkat/bulan. TV: Rp 50.000/bulan. Galon air: Rp 15.000/galon. Semua layanan ini bersifat opsional.' },
];

p.faq.count()
  .then((n) => {
    if (n > 0) {
      console.log('Sudah ada ' + n + ' FAQ di database.');
      return Promise.resolve();
    }
    return p.faq.createMany({ data }).then((r) => {
      console.log('Berhasil insert ' + r.count + ' FAQ ke database.');
    });
  })
  .catch((e) => { console.error('Error:', e.message); })
  .finally(() => p.$disconnect());
