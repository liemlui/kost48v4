import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFaqDto, UpdateFaqDto } from './dto/faq.dto';

const DEFAULT_FAQS = [
  // ── FAQ dari website kost48surabaya.com (18 FAQ asli, konten real) ──────────
  { category: 'Fasilitas', sortOrder: 1, question: 'Fasilitasnya apa saja Kak?', answer: 'Fasilitas terbagi dua:\n\n• Fasilitas umum (bersama): parkir luas untuk mobil & motor, dapur bersama + kitchen set, air PDAM dengan 2 tandon 650 liter, balkon santai, area jemur, taman & area hijau, dan perawatan fasilitas dasar.\n\n• Fasilitas kamar: kasur busa tebal, lemari baju, gantungan baju, pendingin (AC atau kipas), dan kamar mandi dalam atau luar sesuai tipe kamar.\n\nDetail lengkap tersedia di halaman Fasilitas.' },
  { category: 'Lokasi', sortOrder: 2, question: 'Lokasinya dimana ya? Apakah dekat PTC - Pakuwon Mall?', answer: 'Lokasinya di Jalan Hikmah V No. 48, Surabaya Barat (Kecamatan Sambikerep, Kelurahan Lontar, kode pos 60216). Dekat Pakuwon Mall / PTC, jarak sekitar 7 menit berjalan kaki.\n\nPanduan Google Maps tersedia di halaman Lokasi.' },
  { category: 'Aturan', sortOrder: 3, question: 'Satu kamar bisa untuk berapa orang?', answer: 'Satu kamar dapat dihuni 1–2 orang. Untuk setiap penghuni tambahan di atas batas gratis, akan dikenakan biaya air dan kebersihan sebesar 20% dari tarif kamar per kepala per bulan.\n\nPenghuni tambahan wajib dikonfirmasi dulu ke pengelola dan dicatatkan di kontrak sewa.' },
  { category: 'Fasilitas', sortOrder: 4, question: 'Apakah tersedia WiFi?', answer: 'Tersedia WiFi sebagai layanan tambahan (per perangkat): Bulanan Rp 50.000 · 2 Mingguan Rp 30.000 · Mingguan Rp 20.000 · Harian Rp 5.000. Biaya per-perangkat diterapkan untuk menjaga kualitas koneksi agar tetap stabil bagi semua penghuni.' },
  { category: 'Fasilitas', sortOrder: 5, question: 'Apakah disediakan nasi putih?', answer: 'Kami tidak menyediakan nasi putih karena harga makanan di warung sebelah sangat terjangkau. Di sekitar kos tersedia banyak pilihan warung makan, kafe, dan restoran.' },
  { category: 'Fasilitas', sortOrder: 6, question: 'Apakah disediakan dispenser air minum?', answer: 'Kami tidak menyediakan dispenser bersama, namun penghuni dapat membeli galon air merek Voila langsung ke pengelola dengan harga Rp 20.000 per galon.' },
  { category: 'Aturan', sortOrder: 7, question: 'Ini kost cewek apa cowok?', answer: 'KOST48 adalah kos campur (putra dan putri). Ibu kos tinggal di lokasi dan menjaga ketertiban serta norma lingkungan setiap saat.\n\nIbu kos juga dapat memantau dan memberikan laporan kepada keluarga penghuni bila diperlukan.' },
  { category: 'Aturan', sortOrder: 8, question: 'Apakah boleh membawa pasangan atau selingkuhan?', answer: 'TIDAK BOLEH. Kami dengan tegas melarang hal tersebut. Jika diketahui melanggar, dapat dilaporkan ke pihak berwenang dan menjadi tanggung jawab serta risiko penghuni karena telah memberikan informasi tidak jujur saat mendaftar.' },
  { category: 'Aturan', sortOrder: 9, question: 'Apakah boleh untuk pasangan Nikah Siri?', answer: 'Kami memperbolehkan, asalkan terdapat surat resmi dan kami dapat menghubungi Pemuka Agama atau pihak keluarga wanita yang akan bertanggung jawab atas segala hal yang mungkin terjadi.' },
  { category: 'Aturan', sortOrder: 10, question: 'Apakah kos bebas?', answer: 'Jam berkunjung dan pulang dibebaskan — tidak ada jam malam yang membatasi.\n\nJika pengertian "bebas" yang dimaksud adalah berbuat mesum: kami sangat mengecam hal tersebut. Lebih baik cari kos di tempat lain. Terima kasih.' },
  { category: 'Aturan', sortOrder: 11, question: 'Apakah boleh membawa hewan peliharaan?', answer: 'Diperbolehkan membawa hewan peliharaan asalkan tidak merusak fasilitas kami.\n\nPemilik hewan peliharaan wajib membayar uang jaminan sebesar Rp 100.000 yang akan dikembalikan penuh jika tidak terdapat kerusakan. Pastikan hewan peliharaan dikonfirmasi ke pengelola saat booking/check-in.' },
  { category: 'Aturan', sortOrder: 12, question: 'Apakah boleh untuk Pasutri (Pasangan Suami Istri)?', answer: 'Diperbolehkan. Jangan lupa membawa surat nikah, bukti foto pernikahan, atau kartu keluarga yang menunjukkan status pernikahan sah.' },
  { category: 'Fasilitas', sortOrder: 13, question: 'Apakah ada TV di kamar?', answer: 'Kami tidak menyediakan TV karena sudah lama tidak ada yang menonton — semua penghuni menonton via HP. Lebih baik langgan layanan WiFi dari kami untuk pengalaman streaming yang lebih nyaman.' },
  { category: 'Fasilitas', sortOrder: 14, question: 'Apakah tempatnya bersih?', answer: 'Kami berusaha menjaga kebersihan area kos dengan rutin. Namun perlu dimaklumi bahwa standar kebersihan kami tidak setara hotel.\n\nJika Anda menginginkan kebersihan kamar setara hotel, Anda bisa menggunakan jasa layanan bersih kamar seperti Go Clean secara mandiri.' },
  { category: 'Lokasi', sortOrder: 15, question: 'Apakah ada kamar kosong?', answer: 'Ketersediaan kamar dapat berubah sewaktu-waktu. Silakan cek langsung di halaman utama aplikasi ini untuk melihat status kamar secara real-time, atau hubungi admin via WhatsApp untuk informasi terbaru.' },
  { category: 'Aturan', sortOrder: 16, question: 'Apakah boleh menginap dengan pacar?', answer: 'Boleh, asalkan orang tua pihak wanita datang mengantar dan berbicara langsung dengan ibu kos, bahwa mereka mengetahui dan bertanggung jawab atas segala risikonya.' },
  { category: 'Tarif', sortOrder: 17, question: 'Apakah sudah termasuk listrik?', answer: 'Listrik menggunakan sistem pascabayar — pakai dulu, bayar sesuai pemakaian meter.\n\nSetiap kamar mendapat jatah listrik gratis 30 kWh per bulan. Kelebihan di atas jatah ditagihkan Rp 2.500 per kWh dan dicantumkan di invoice meter terpisah (bisa dibayar sekaligus dengan sewa).\n\nPerkiraan tambahan biaya listrik:\n• Hanya kipas: biasanya tidak ada tambahan\n• Kamar AC, hemat: Rp 0–100.000\n• Kamar AC, rata-rata: Rp 100.000–200.000\n• Pasutri sering di kos: Rp 200.000–300.000\n\nSaat keluar tidak ada sisa listrik yang hangus — tagihan meter terakhir dipotong dari deposit.' },
  { category: 'Tarif', sortOrder: 18, question: 'Berapa tarif kamarnya kak?', answer: 'Tarif kamar KOST48 berkisar Rp 850.000 – Rp 1.800.000 per bulan, dipengaruhi oleh:\n• Ukuran kamar (small/medium/big)\n• Kamar mandi dalam atau luar\n• Pendingin AC atau kipas\n• Tipe mezzanine atau kamar biasa\n• Perabotan dan kelengkapan\n\nLihat tarif lengkap dan ketersediaan di halaman Cek Kamar.' },

  // ── AUD-4 (Fase 5): FAQ operasional di-seed dari aturan/flow (03_KEPUTUSAN_OWNER + dossier).
  // Pembayaran
  { category: 'Pembayaran', sortOrder: 30, question: 'Bagaimana cara membayar — tunai atau transfer?', answer: 'Pembayaran bisa tunai maupun transfer. Untuk transfer, unggah bukti bayar di aplikasi; admin akan memverifikasi sebelum pembayaran tercatat dan kamar diaktifkan.' },
  { category: 'Pembayaran', sortOrder: 31, question: 'Apakah boleh mencicil pembayaran sewa?', answer: 'Tidak ada cicilan. Nominal yang sah hanya dua: (1) uang muka (DP) 30% tepat untuk mengunci kamar, atau (2) pelunasan penuh (sisa sewa + deposit jaminan). Tagihan lain seperti perpanjangan dan utilitas wajib dibayar lunas penuh.' },
  { category: 'Pembayaran', sortOrder: 32, question: 'Apa beda DP (uang muka) dengan deposit jaminan?', answer: 'DP (uang muka) = 30% dari sewa untuk memesan/mengunci kamar dan akan HANGUS bila booking dibatalkan atau gagal dilunasi. Deposit jaminan = uang titipan yang DAPAT DIKEMBALIKAN saat Anda keluar, selama tidak ada kerusakan atau tunggakan. Keduanya berbeda dan dicatat terpisah.' },
  { category: 'Pembayaran', sortOrder: 33, question: 'Bagaimana hitungan listrik bila melebihi jatah?', answer: 'Tiap kamar mendapat jatah listrik bulanan. Kelebihan dihitung dari meter dengan tarif Rp 2.500/kWh dan ditagihkan pada siklus berikutnya. Untuk sewa harian/mingguan, utilitas umumnya sudah termasuk (all-in).' },

  // Booking
  { category: 'Booking', sortOrder: 40, question: 'Bagaimana cara memesan kamar?', answer: 'Pilih kamar di katalog, lalu bayar DP 30% sebagai tanda jadi. Setelah bukti bayar diverifikasi admin, kamar terkunci untuk Anda. Lengkapi pelunasan sesuai jadwal agar kamar aktif (OCCUPIED).' },
  { category: 'Booking', sortOrder: 41, question: 'Berapa lama batas waktu konfirmasi booking?', answer: 'Booking berlaku 3 jam. Bila dalam 3 jam belum ada pembayaran yang valid, pemesanan otomatis kedaluwarsa dan kamar kembali tersedia untuk orang lain.' },
  { category: 'Booking', sortOrder: 42, question: 'Bagaimana jika beberapa orang memesan kamar yang sama?', answer: 'Berlaku "siapa cepat dia dapat" (first-paid-wins): pembayaran pertama yang disetujui mengunci kamar, dan pemesan lain dibatalkan. Bila Anda sudah terlanjur transfer namun kalah cepat, uang Anda akan diuruskan refund atau Anda diarahkan memilih kamar lain.' },

  // Perpanjangan / prabayar
  { category: 'Perpanjangan', sortOrder: 50, question: 'Kapan saya bisa memperpanjang sewa?', answer: 'Anda akan ditanya lewat notifikasi mulai 10 hari sebelum kontrak berakhir (H-10), tetapi Anda juga boleh mengajukan perpanjangan sendiri kapan saja melalui aplikasi.' },
  { category: 'Perpanjangan', sortOrder: 51, question: 'Bisakah saya membayar di muka beberapa bulan ke depan?', answer: 'Bisa. Anda boleh membayar di muka untuk 2–4 bulan ke depan dengan harga bulanan, tanpa harus menunggu kontrak hampir habis.' },
  { category: 'Perpanjangan', sortOrder: 52, question: 'Apakah harga sewa naik saat saya perpanjang?', answer: 'Tidak. Selama Anda terus memperpanjang tanpa putus kontrak, harga sewa Anda dikunci (tidak naik). Harga hanya bisa berubah bila kontrak terputus lalu Anda memesan ulang sebagai penghuni baru.' },

  // Checkout & deposit
  { category: 'Checkout & Deposit', sortOrder: 60, question: 'Bagaimana proses keluar (checkout)?', answer: 'Ajukan permintaan checkout paling lambat pada tanggal rencana keluar. Semua tagihan harus lunas. Setelah itu kamar diperiksa (inspeksi), lalu deposit jaminan dikembalikan.' },
  { category: 'Checkout & Deposit', sortOrder: 61, question: 'Kapan deposit jaminan dikembalikan dan bisakah terpotong?', answer: 'Deposit dikembalikan setelah inspeksi kamar. Deposit dapat dipotong bila ada kerusakan di luar kewajaran atau tunggakan; sisanya dikembalikan. Setiap potongan disertai catatan yang jelas.' },
  { category: 'Checkout & Deposit', sortOrder: 62, question: 'Jika saya keluar lebih awal, apakah sewa dikembalikan?', answer: 'Sewa yang sudah dibayar tidak dikembalikan secara prorata (hangus untuk sisa periode), namun deposit jaminan tetap dikembalikan seperti biasa.' },
  { category: 'Checkout & Deposit', sortOrder: 63, question: 'Apa yang terjadi bila saya melewati tanggal keluar tanpa perpanjang?', answer: 'Bila melewati tanggal keluar dan tidak memperpanjang, kamar akan dibuka kembali untuk umum dan diproses checkout. Bila ada tunggakan, sisa tagihan dapat dipotong dari deposit; bila deposit tidak cukup, sisanya menjadi piutang Anda.' },

  // KTP & privasi
  { category: 'KTP & Privasi', sortOrder: 70, question: 'Apakah saya wajib menyerahkan KTP?', answer: 'Ya, foto KTP diperlukan saat check-in untuk verifikasi identitas. Cukup foto (untuk pencocokan visual). Data disimpan terproteksi, hanya dapat diakses admin/pemilik, dan dihapus saat Anda keluar sesuai UU Perlindungan Data Pribadi.' },

  // Keluhan, tiket, tip, poin
  { category: 'Keluhan & Poin', sortOrder: 80, question: 'Bagaimana cara melapor kerusakan atau keluhan?', answer: 'Buat tiket lewat menu keluhan di aplikasi (boleh sertakan foto). Staf akan menanganinya; Anda dapat memantau statusnya hingga selesai. Sebagai penghuni, Anda juga berperan mengawasi kualitas kerja staf.' },
  { category: 'Keluhan & Poin', sortOrder: 81, question: 'Apakah saya bisa memberi tip ke staf setelah keluhan selesai?', answer: 'Bisa, tip bersifat sukarela dan langsung ke staf melalui link e-wallet/bank milik staf (GoPay/OVO/DANA/transfer) yang muncul di tiket yang sudah selesai. Tip ini langsung tenant ke staf dan tidak dipotong pengelola.' },
  { category: 'Keluhan & Poin', sortOrder: 82, question: 'Bagaimana cara mendapatkan dan memakai poin loyalitas?', answer: 'Anda mendapat poin dari: memperpanjang sewa, membayar tepat waktu, melaporkan masalah yang tervalidasi, melengkapi profil, memberi review saat perpanjang, dan mengajak teman (referral). Poin dapat ditukar dengan reward layanan (mis. pembersihan kamar, voucher WiFi) lewat menu Loyalitas; penukaran dikonfirmasi admin. Poin hangus setelah Anda keluar.' },
  { category: 'Keluhan & Poin', sortOrder: 83, question: 'Bagaimana cara mengaktifkan notifikasi?', answer: 'Aktifkan notifikasi lewat menu Notifikasi di aplikasi (izinkan notifikasi browser). Anda akan menerima pengingat kontrak, status pembayaran, dan info penting lainnya.' },
];

@Injectable()
export class FaqsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic() {
    return this.prisma.faq.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: { id: true, question: true, answer: true, category: true, sortOrder: true },
    });
  }

  async listAll() {
    return this.prisma.faq.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async create(dto: CreateFaqDto) {
    return this.prisma.faq.create({
      data: {
        question: dto.question,
        answer: dto.answer,
        category: dto.category ?? 'Umum',
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: number, dto: UpdateFaqDto) {
    await this.findOne(id);
    return this.prisma.faq.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.faq.delete({ where: { id } });
  }

  async seed() {
    // Idempoten per-pertanyaan: tambah FAQ default yang BELUM ada (cocokkan teks question),
    // tanpa menduplikasi atau menimpa FAQ yang sudah diedit owner. Aman dijalankan ulang.
    const existing = await this.prisma.faq.findMany({ select: { question: true } });
    const existingQuestions = new Set(existing.map((f) => f.question.trim()));
    const toCreate = DEFAULT_FAQS.filter((f) => !existingQuestions.has(f.question.trim()));
    if (toCreate.length === 0) {
      return { message: 'Semua FAQ default sudah ada, tidak ada yang perlu di-seed.', created: 0, total: existing.length };
    }
    await this.prisma.faq.createMany({ data: toCreate });
    return { message: `FAQ berhasil di-seed (${toCreate.length} baru).`, created: toCreate.length, total: existing.length + toCreate.length };
  }

  private async findOne(id: number) {
    const faq = await this.prisma.faq.findUnique({ where: { id } });
    if (!faq) throw new NotFoundException(`FAQ #${id} tidak ditemukan`);
    return faq;
  }
}
