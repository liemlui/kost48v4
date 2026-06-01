import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

const FAQS = [
  { category: 'Tarif',     sortOrder: 1,  question: 'Berapa kisaran tarif kamar?',                        answer: 'Tarif kamar berkisar Rp 800.000 – Rp 1.800.000 per bulan, tergantung ukuran kamar, kamar mandi dalam/luar, pendingin AC/kipas, perabotan, dan lokasi kamar. Untuk harga aktif, cek detail kamar terbaru di katalog.' },
  { category: 'Fasilitas', sortOrder: 2,  question: 'Fasilitas apa saja yang tersedia?',                  answer: 'Fasilitas umum mencakup parkir mobil & motor, dapur bersama dengan kitchen set, air PDAM dengan 2 tandon 650 liter, balkon santai, area jemur, taman, dan perawatan fasilitas dasar. Fasilitas kamar: kasur, lemari baju, pendingin (AC atau kipas), serta kamar mandi dalam atau luar sesuai tipe.' },
  { category: 'Lokasi',    sortOrder: 3,  question: 'Di mana lokasi KOST48?',                             answer: 'KOST48 berada di Jalan Hikmah V No. 48, Kecamatan Sambikerep, Kelurahan Lontar, Surabaya Barat (kode pos 60216). Jaraknya sekitar 7 menit berjalan kaki dari Pakuwon Mall / PTC.' },
  { category: 'Aturan',    sortOrder: 4,  question: 'Satu kamar untuk berapa orang?',                     answer: 'Standar satu kamar untuk 1–2 orang. Penghuni tambahan perlu konfirmasi terlebih dahulu kepada pengelola.' },
  { category: 'Fasilitas', sortOrder: 5,  question: 'Apakah tersedia WiFi?',                              answer: 'WiFi tersedia sebagai layanan tambahan dengan biaya Rp 50.000 per perangkat per bulan. Sistem ini menjaga kualitas koneksi agar tetap stabil bagi semua penghuni.' },
  { category: 'Fasilitas', sortOrder: 6,  question: 'Apakah ada dispenser atau air minum?',               answer: 'Tidak ada dispenser bersama, namun penghuni dapat membeli galon air merek Voila seharga Rp 15.000 per galon melalui pengelola.' },
  { category: 'Aturan',    sortOrder: 7,  question: 'Apakah KOST48 khusus pria atau wanita?',             answer: 'KOST48 adalah kos campur (putra dan putri). Pengelola menjaga ketertiban dan norma lingkungan di lokasi setiap saat.' },
  { category: 'Aturan',    sortOrder: 8,  question: 'Bagaimana kebijakan tamu atau pasangan berkunjung?', answer: 'Tamu dan pasangan wajib mengikuti aturan pengelola dan norma lingkungan setempat.' },
  { category: 'Aturan',    sortOrder: 9,  question: 'Apakah boleh untuk pasangan suami istri?',           answer: 'Pasangan suami istri diperbolehkan tinggal bersama dengan membawa bukti pernikahan (kartu nikah, KK, atau dokumen pernikahan lainnya) sesuai ketentuan pengelola.' },
  { category: 'Aturan',    sortOrder: 10, question: 'Apakah kos bebas keluar masuk?',                     answer: 'Jam keluar masuk cukup fleksibel, namun penghuni tetap wajib menjaga ketertiban, norma, dan keamanan lingkungan kos.' },
  { category: 'Aturan',    sortOrder: 11, question: 'Apakah boleh membawa hewan peliharaan?',             answer: 'Hewan peliharaan dapat dipertimbangkan selama tidak merusak fasilitas. Penghuni bersedia membayar uang jaminan Rp 100.000 yang dikembalikan jika tidak ada kerusakan.' },
  { category: 'Fasilitas', sortOrder: 12, question: 'Apakah ada TV di kamar?',                            answer: 'TV dapat ditambahkan sebagai layanan opsional dengan biaya Rp 50.000 per bulan. TV yang tersedia adalah model layar datar 17 inch.' },
  { category: 'Fasilitas', sortOrder: 13, question: 'Seberapa bersih kondisi kos?',                       answer: 'Pengelola menjaga area kos dengan rutin. Penghuni juga diharapkan ikut menjaga kebersihan kamar dan area bersama.' },
  { category: 'Tarif',     sortOrder: 14, question: 'Bagaimana aturan pemakaian listrik?',                answer: 'Setiap kamar mendapat jatah listrik bulanan. Jika pemakaian melebihi jatah, biaya tambahan dihitung berdasarkan meter dengan tarif Rp 2.500/kWh.' },
  { category: 'Fasilitas', sortOrder: 15, question: 'Apakah ada makanan atau warung di sekitar?',         answer: 'KOST48 tidak menyediakan konsumsi. Di sekitar lokasi tersedia banyak pilihan warung makan, kafe, dan restoran.' },
  { category: 'Lokasi',    sortOrder: 16, question: 'Apakah ada kamar yang kosong sekarang?',             answer: 'Ketersediaan kamar bisa berubah setiap saat. Lihat status terkini langsung di halaman Cek Kamar di aplikasi ini, atau hubungi admin via WhatsApp.' },
  { category: 'Aturan',    sortOrder: 17, question: 'Apakah boleh menginap dengan tamu?',                 answer: 'Kebijakan tamu menginap wajib dikonfirmasi terlebih dahulu kepada pengelola. Pengelola akan menyesuaikan dengan aturan keluarga dan norma lingkungan yang berlaku.' },
  { category: 'Tarif',     sortOrder: 18, question: 'Berapa biaya layanan tambahan seperti WiFi, TV, dan galon?', answer: 'WiFi: Rp 50.000/perangkat/bulan · TV: Rp 50.000/bulan · Galon air: Rp 15.000/galon. Semua layanan ini bersifat opsional.' },
];

async function main() {
  const existing = await prisma.faq.count();
  if (existing > 0) {
    console.log(`Sudah ada ${existing} FAQ, skip.`);
    return;
  }
  const result = await prisma.faq.createMany({ data: FAQS });
  console.log(`✅ Berhasil insert ${result.count} FAQ ke database.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
