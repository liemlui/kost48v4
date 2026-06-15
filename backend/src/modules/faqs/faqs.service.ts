import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFaqDto, UpdateFaqDto } from './dto/faq.dto';

const DEFAULT_FAQS = [
  { category: 'Tarif', sortOrder: 1, question: 'Berapa kisaran tarif kamar?', answer: 'Tarif kamar berkisar Rp 800.000 – Rp 1.800.000 per bulan, tergantung ukuran kamar, kamar mandi dalam/luar, pendingin AC/kipas, perabotan, dan lokasi kamar. Untuk harga aktif, cek detail kamar terbaru di katalog.' },
  { category: 'Fasilitas', sortOrder: 2, question: 'Fasilitas apa saja yang tersedia?', answer: 'Fasilitas umum mencakup parkir mobil & motor, dapur bersama dengan kitchen set, air PDAM dengan 2 tandon 650 liter, balkon santai, area jemur, taman, dan perawatan fasilitas dasar. Fasilitas kamar: kasur, lemari baju, pendingin (AC atau kipas), serta kamar mandi dalam atau luar sesuai tipe.' },
  { category: 'Lokasi', sortOrder: 3, question: 'Di mana lokasi KOST48?', answer: 'KOST48 berada di Jalan Hikmah V No. 48, Kecamatan Sambikerep, Kelurahan Lontar, Surabaya Barat (kode pos 60216). Jaraknya sekitar 7 menit berjalan kaki dari Pakuwon Mall / PTC.' },
  { category: 'Aturan', sortOrder: 4, question: 'Satu kamar untuk berapa orang?', answer: 'Standar satu kamar untuk 1–2 orang. Penghuni tambahan perlu konfirmasi terlebih dahulu kepada pengelola.' },
  { category: 'Fasilitas', sortOrder: 5, question: 'Apakah tersedia WiFi?', answer: 'WiFi tersedia sebagai layanan tambahan dengan biaya Rp 50.000 per perangkat per bulan. Sistem ini menjaga kualitas koneksi agar tetap stabil bagi semua penghuni.' },
  { category: 'Fasilitas', sortOrder: 6, question: 'Apakah ada dispenser atau air minum?', answer: 'Tidak ada dispenser bersama, namun penghuni dapat membeli galon air merek Voila seharga Rp 15.000 per galon melalui pengelola.' },
  { category: 'Aturan', sortOrder: 7, question: 'Apakah KOST48 khusus pria atau wanita?', answer: 'KOST48 adalah kos campur (putra dan putri). Pengelola menjaga ketertiban dan norma lingkungan di lokasi setiap saat.' },
  { category: 'Aturan', sortOrder: 8, question: 'Bagaimana kebijakan tamu atau pasangan berkunjung?', answer: 'Tamu dan pasangan wajib mengikuti aturan pengelola dan norma lingkungan setempat.' },
  { category: 'Aturan', sortOrder: 9, question: 'Apakah boleh untuk pasangan suami istri?', answer: 'Pasangan suami istri diperbolehkan tinggal bersama dengan membawa bukti pernikahan (kartu nikah, KK, atau dokumen pernikahan lainnya) sesuai ketentuan pengelola.' },
  { category: 'Aturan', sortOrder: 10, question: 'Apakah kos bebas keluar masuk?', answer: 'Jam keluar masuk cukup fleksibel, namun penghuni tetap wajib menjaga ketertiban, norma, dan keamanan lingkungan kos.' },
  { category: 'Aturan', sortOrder: 11, question: 'Apakah boleh membawa hewan peliharaan?', answer: 'Hewan peliharaan dapat dipertimbangkan selama tidak merusak fasilitas. Penghuni bersedia membayar uang jaminan Rp 100.000 yang dikembalikan jika tidak ada kerusakan.' },
  { category: 'Fasilitas', sortOrder: 12, question: 'Apakah ada TV di kamar?', answer: 'TV dapat ditambahkan sebagai layanan opsional dengan biaya Rp 50.000 per bulan. TV yang tersedia adalah model layar datar 17 inch.' },
  { category: 'Fasilitas', sortOrder: 13, question: 'Seberapa bersih kondisi kos?', answer: 'Pengelola menjaga area kos dengan rutin. Penghuni juga diharapkan ikut menjaga kebersihan kamar dan area bersama.' },
  { category: 'Tarif', sortOrder: 14, question: 'Bagaimana aturan pemakaian listrik?', answer: 'Setiap kamar mendapat jatah listrik bulanan. Jika pemakaian melebihi jatah, biaya tambahan dihitung berdasarkan meter dengan tarif Rp 2.500/kWh.' },
  { category: 'Fasilitas', sortOrder: 15, question: 'Apakah ada makanan atau warung di sekitar?', answer: 'KOST48 tidak menyediakan konsumsi. Di sekitar lokasi tersedia banyak pilihan warung makan, kafe, dan restoran.' },
  { category: 'Lokasi', sortOrder: 16, question: 'Apakah ada kamar yang kosong sekarang?', answer: 'Ketersediaan kamar bisa berubah setiap saat. Lihat status terkini langsung di halaman Cek Kamar di aplikasi ini, atau hubungi admin via WhatsApp.' },
  { category: 'Aturan', sortOrder: 17, question: 'Apakah boleh menginap dengan tamu?', answer: 'Kebijakan tamu menginap wajib dikonfirmasi terlebih dahulu kepada pengelola. Pengelola akan menyesuaikan dengan aturan keluarga dan norma lingkungan yang berlaku.' },
  { category: 'Tarif', sortOrder: 18, question: 'Berapa biaya layanan tambahan seperti WiFi, TV, dan galon?', answer: 'WiFi: Rp 50.000/perangkat/bulan · TV: Rp 50.000/bulan · Galon air: Rp 15.000/galon. Semua layanan ini bersifat opsional.' },

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
