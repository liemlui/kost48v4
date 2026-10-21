import type { ChatMsg } from '../../market-analysis/deepseek.client';

/**
 * System prompt STABIL untuk FAQ Generator.
 * Aturan bisnis hardcoded (dari M02/M04/M05/M06).
 * JANGAN membaca file MD runtime dari server produksi.
 */
const BUSINESS_RULES = [
  '## ATURAN BISNIS KOST48',
  '',
  '### Kategori: Pembayaran',
  '- DP (down payment) = 30% × tarif periode yang dipilih (pricingTerm), non-refundable; hangus bila batal atau gagal dilunasi.',
  '- Deposit jaminan = nominal default kamar (defaultDepositRupiah), refundable saat checkout; dapat menutup tagihan terbuka termasuk sewa, sisanya dikembalikan.',
  '- Pembayaran tidak boleh dicicil (no-partial rule).',
  '- Pembayaran via transfer atau tunai; bukti transfer manual diverifikasi admin.',
  '- Overpay: nominal > tagihan ditolak di sistem.',
  '',
  '### Kategori: Booking & Huni',
  '- Booking → DP → promote (terisi initialMetersPromotedAt) → huni aktif.',
  '- Semua pricingTerm yang tersedia di aplikasi dapat dipilih (harian/mingguan/2 mingguan/bulanan/6 bulan/1 tahun); tidak ada minimum 1 bulan.',
  '- Perpanjang: ajukan via RenewRequest; DP 30% paling lambat hari-H, pelunasan paling lambat H+7 setelah DP; finalisasi Owner/Admin.',
  '- Checkout: ajukan sebelum tanggal keluar, setujui Owner/Admin, baca meter final.',
  '',
  '### Kategori: Fasilitas',
  '- Kamar: kasur, lemari, meja, kursi, AC/kipas, kamar mandi dalam/luar sesuai tipe.',
  '- WiFi: layanan tambahan berbayar per perangkat; tarif dan paket tampil di halaman Pesan WiFi.',
  '- Air mengikuti tarif yang berlaku (saat ini gratis); listrik pascabayar dengan jatah gratis per kamar dan tarif kelebihan sesuai setting kamar.',
  '- Parkir motor terbatas.',
  '- Laundry: ada jasa luar rekanan.',
  '',
  '### Kategori: Operasional',
  '- Jam operasional kantor: 08.00-17.00 (Sen-Sab).',
  '- Tiket kerusakan: lapor via portal/hubungi staf.',
  '- Catat meter listrik/air pada jendela H-10 sampai akhir periode sewa yang tampil di portal.',
  '- Hewan peliharaan diizinkan dengan pemberitahuan + deposit hewan (default Rp100.000, refundable); narkoba dan senjata tajam dilarang.',
  '',
  '### Kategori: Lain-lain',
  '- Tidak ada denda keterlambatan otomatis (sistem tidak menerapkan late fee).',
  '- Notifikasi via in-app (PWA).',
  '- Referral: ajak teman, dapat poin loyalitas.',
].join('\n');

const SYSTEM_PROMPT = [
  'Kamu assisten KOST48.',
  'Tugas: baca aturan bisnis + daftar layanan aktif, lalu hasilkan draft FAQ.',
  'Bahasa Indonesia, ramah, jelas, tidak terlalu panjang (max 3 kalimat per jawaban).',
  '',
  BUSINESS_RULES,
  '',
  'WAJIB output JSON saja (tanpa markdown, tanpa intro/outro):',
  JSON.stringify({
    items: [
      {
        category: 'PEMBAYARAN | BOOKING | FASILITAS | OPERASIONAL | LAINNYA',
        question: 'string',
        answer: 'string (max 3 kalimat)',
        sortOrder: 1,
      },
    ],
    publicCopyDraft: 'string — teks singkat tentang KOST48 untuk landing page',
    tenantManualDraft: 'string — ringkasan aturan untuk tenant baru',
    warnings: ['string — hal yang perlu dicek manual'],
  }, null, 2),
  '',
  'Jangan mengarang aturan di luar yang diberikan.',
  'Jika kategori tidak sesuai, pakai LAINNYA.',
].join('\n');

export function buildFaqPrompt(layananAktif: Array<{ name: string; description?: string }>): ChatMsg[] {
  const layananBlock = [
    'LAYANAN TAMBAHAN YANG TERSEDIA:',
    ...(layananAktif.length > 0
      ? layananAktif.map((l) => `- ${l.name}${l.description ? ': ' + l.description : ''}`)
      : ['- Tidak ada layanan tambahan aktif']),
  ].join('\n');

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: layananBlock },
  ];
}
