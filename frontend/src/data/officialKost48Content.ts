import { getKost48FrontPhotoUrl } from './kost48Assets';

export type Kost48OfficialHighlight = {
  icon: string;
  title: string;
  description: string;
};

export type Kost48OfficialFaq = {
  question: string;
  answer: string;
  category: 'Lokasi' | 'Tarif' | 'Fasilitas' | 'Aturan' | 'Layanan';
};

const DEFAULT_WA = (import.meta.env.VITE_PUBLIC_ADMIN_WHATSAPP ?? '6285648887628').replace(/\D/g, '');

export function getWhatsappUrl(overrideWa?: string): string {
  const wa = (overrideWa ?? DEFAULT_WA).replace(/\D/g, '');
  return `https://wa.me/${wa}`;
}

export const officialKost48Location = {
  address: 'Jalan Hikmah V No. 48, Surabaya Barat',
  nearby: 'Dekat Pakuwon Mall / PTC, sekitar 7 menit berjalan kaki.',
  mapsUrl: 'https://maps.app.goo.gl/j2cZQzjZP87t6hja9',
  whatsappUrl: getWhatsappUrl(),  // D-25: owner-settable via Settings → adminWhatsappNumber
  googleReviewUrl: 'https://g.page/r/CQoPM7OnWlRoEAE/review',
};

export const officialKost48Highlights: Kost48OfficialHighlight[] = [
  {
    icon: '📍',
    title: 'Lokasi Surabaya Barat',
    description: 'Berada di Jalan Hikmah V No. 48, dekat area Pakuwon Mall / PTC.',
  },
  {
    icon: '🛏️',
    title: 'Pilihan kamar fleksibel',
    description: 'Tarif menyesuaikan ukuran kamar, AC/kipas, kamar mandi, dan fasilitas kamar.',
  },
  {
    icon: '🚿',
    title: 'Fasilitas harian lengkap',
    description: 'Ada parkir, dapur bersama, tandon air, jemuran, WiFi, dan pilihan layanan tambahan.',
  },
  {
    icon: '🛠️',
    title: 'Laporan kerusakan mudah',
    description: 'Kerusakan wajar seperti kran, lampu, kunci, atau shower dapat dilaporkan ke pengelola.',
  },
];

export const officialKost48TenantGuide: Kost48OfficialHighlight[] = [
  {
    icon: '💡',
    title: 'Listrik bulanan',
    description: 'Ada jatah listrik bulanan. Kelebihan pemakaian mengikuti tarif meter yang berlaku di KOST48.',
  },
  {
    icon: '📶',
    title: 'WiFi tambahan',
    description: 'WiFi tersedia sebagai layanan tambahan per perangkat agar kualitas koneksi tetap terjaga.',
  },
  {
    icon: '🚰',
    title: 'Air galon',
    description: 'Penghuni dapat membeli galon air melalui pengelola jika membutuhkan stok air minum.',
  },
  {
    icon: '🧹',
    title: 'Kebersihan bersama',
    description: 'Pengelola menjaga area kos, dan penghuni bisa melapor jika ada fasilitas bermasalah.',
  },
];

export const officialKost48Faq: Kost48OfficialFaq[] = [
  {
    category: 'Tarif',
    question: 'Berapa kisaran tarif kamar?',
    answer: 'Tarif kamar berkisar Rp 800.000 – Rp 1.800.000 per bulan, tergantung ukuran kamar, kamar mandi dalam/luar, pendingin AC/kipas, perabotan, dan lokasi kamar. Untuk harga aktif, cek detail kamar terbaru di katalog.',
  },
  {
    category: 'Fasilitas',
    question: 'Fasilitas apa saja yang tersedia?',
    answer: 'Fasilitas umum mencakup parkir mobil & motor, dapur bersama dengan kitchen set, air PDAM dengan 2 tandon 650 liter, balkon santai, area jemur, taman, dan perawatan fasilitas dasar. Fasilitas kamar: kasur, lemari baju, pendingin (AC atau kipas), serta kamar mandi dalam atau luar sesuai tipe.',
  },
  {
    category: 'Lokasi',
    question: 'Di mana lokasi KOST48?',
    answer: 'KOST48 berada di Jalan Hikmah V No. 48, Kecamatan Sambikerep, Kelurahan Lontar, Surabaya Barat (kode pos 60216). Jaraknya sekitar 7 menit berjalan kaki dari Pakuwon Mall / PTC.',
  },
  {
    category: 'Aturan',
    question: 'Satu kamar untuk berapa orang?',
    answer: 'Standar satu kamar untuk 1–2 orang. Penghuni tambahan perlu konfirmasi terlebih dahulu kepada pengelola. Biaya air dan kebersihan untuk penghuni tambahan berlaku sesuai ketentuan.',
  },
  {
    category: 'Fasilitas',
    question: 'Apakah tersedia WiFi?',
    answer: 'WiFi tersedia sebagai layanan tambahan (per perangkat): Bulanan Rp 50.000 · 2 Mingguan Rp 30.000 · Mingguan Rp 20.000 · Harian Rp 5.000. Biaya per-perangkat menjaga kualitas koneksi tetap stabil bagi semua penghuni.',
  },
  {
    category: 'Fasilitas',
    question: 'Apakah ada dispenser atau air minum?',
    answer: 'Tidak ada dispenser bersama, namun penghuni dapat membeli galon air merek Voila seharga Rp 20.000 per galon melalui pengelola kapan saja dibutuhkan.',
  },
  {
    category: 'Aturan',
    question: 'Apakah KOST48 khusus pria atau wanita?',
    answer: 'KOST48 adalah kos campur (putra dan putri). Pengelola menjaga ketertiban dan norma lingkungan di lokasi setiap saat.',
  },
  {
    category: 'Aturan',
    question: 'Bagaimana kebijakan tamu atau pasangan berkunjung?',
    answer: 'Tamu dan pasangan wajib mengikuti aturan pengelola dan norma lingkungan setempat. Untuk kondisi khusus, pengelola dapat meminta konfirmasi atau dokumen pendukung sebelum disetujui.',
  },
  {
    category: 'Aturan',
    question: 'Apakah boleh untuk pasangan suami istri?',
    answer: 'Pasangan suami istri diperbolehkan tinggal bersama dengan membawa bukti pernikahan (kartu nikah, KK, atau dokumen pernikahan lainnya) sesuai ketentuan pengelola.',
  },
  {
    category: 'Aturan',
    question: 'Apakah kos bebas keluar masuk?',
    answer: 'Jam keluar masuk cukup fleksibel, namun penghuni tetap wajib menjaga ketertiban, norma, dan keamanan lingkungan kos. Pengelola ada di lokasi untuk memastikan ketertiban.',
  },
  {
    category: 'Aturan',
    question: 'Apakah boleh membawa hewan peliharaan?',
    answer: 'Hewan peliharaan dapat dipertimbangkan selama tidak merusak fasilitas. Penghuni bersedia membayar uang jaminan Rp 100.000 yang akan dikembalikan penuh jika tidak ada kerusakan akibat hewan.',
  },
  {
    category: 'Fasilitas',
    question: 'Apakah ada TV di kamar?',
    answer: 'TV dapat ditambahkan sebagai layanan opsional dengan biaya Rp 50.000 per bulan. TV yang tersedia adalah model layar datar 17 inch. Konfirmasi ketersediaan kepada pengelola.',
  },
  {
    category: 'Fasilitas',
    question: 'Seberapa bersih kondisi kos?',
    answer: 'Pengelola menjaga area kos dengan rutin agar tetap bersih dan nyaman. Penghuni juga diharapkan ikut menjaga kebersihan kamar dan area bersama masing-masing untuk kenyamanan bersama.',
  },
  {
    category: 'Tarif',
    question: 'Bagaimana aturan pemakaian listrik?',
    answer: 'Setiap kamar mendapat jatah listrik bulanan. Jika pemakaian melebihi jatah, biaya tambahan dihitung berdasarkan meter dengan tarif Rp 2.500/kWh. Penghuni dengan kipas umumnya tidak banyak kelebihan. Penghuni AC dan pasutri perlu memperhatikan pemakaian lebih seksama.',
  },
  {
    category: 'Fasilitas',
    question: 'Apakah ada makanan atau warung di sekitar?',
    answer: 'KOST48 tidak menyediakan konsumsi. Di sekitar lokasi tersedia banyak pilihan warung makan, kafe, dan restoran yang dapat diakses dengan mudah dari area kos.',
  },
  {
    category: 'Lokasi',
    question: 'Apakah ada kamar yang kosong sekarang?',
    answer: 'Ketersediaan kamar bisa berubah setiap saat. Lihat status terkini langsung di halaman Cek Kamar di aplikasi ini, atau hubungi admin via WhatsApp untuk konfirmasi yang lebih cepat.',
  },
  {
    category: 'Aturan',
    question: 'Apakah boleh menginap dengan tamu?',
    answer: 'Kebijakan tamu menginap wajib dikonfirmasi terlebih dahulu kepada pengelola. Pengelola akan menyesuaikan dengan aturan keluarga dan norma lingkungan yang berlaku di kos.',
  },
  {
    category: 'Tarif',
    question: 'Berapa biaya layanan tambahan seperti WiFi, TV, dan galon?',
    answer: 'WiFi (per perangkat): Bulanan Rp 50.000 · 2 Mingguan Rp 30.000 · Mingguan Rp 20.000 · Harian Rp 5.000. Galon air Voila: Rp 20.000/galon. Semua layanan ini bersifat opsional dan bisa dikonfirmasi saat check-in atau kapan saja kepada admin.',
  },
];

export const officialKost48DecorImages = [
  {
    src: getKost48FrontPhotoUrl(),
    title: 'Tampak depan KOST48',
    description: 'Visual resmi area kos untuk membantu calon penghuni mengenali lokasi.',
  },
  {
    src: '/room-images/brosur-depan.webp',
    title: 'Brosur depan',
    description: 'Ringkasan informasi resmi KOST48.',
  },
  {
    src: '/room-images/spanduk-kost48-surabaya.webp',
    title: 'Spanduk KOST48',
    description: 'Materi promosi resmi KOST48 Surabaya.',
  },
  {
    src: '/room-images/brosur-belakang.webp',
    title: 'Brosur belakang',
    description: 'Informasi tambahan fasilitas dan lokasi.',
  },
];

export function getOfficialAnnouncementFallbackImage() {
  return '/room-images/brosur-depan.webp';
}
