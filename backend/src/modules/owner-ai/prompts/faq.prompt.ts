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
  '- DP (down payment) = 30% dari sewa bulan pertama, hangus jika batal.',
  '- Deposit jaminan = Rp {{depositRupiah}}, refundable saat checkout (potong rusak).',
  '- Pembayaran tidak boleh dicicil (no-partial rule).',
  '- Pembayaran via transfer atau tunai.',
  '- Overpay: nominal > tagihan ditolak di sistem.',
  '',
  '### Kategori: Booking & Huni',
  '- Booking → DP → promote (terisi initialMetersPromotedAt) → huni aktif.',
  '- Minimal sewa 1 bulan (kos bulanan).',
  '- Perpanjang: ajukan via RenewRequest, setujui Owner/Admin.',
  '- Checkout: ajukan H-7, setujui Owner/Admin, baca meter final.',
  '',
  '### Kategori: Fasilitas',
  '- Kamar: kasur, lemari, meja, kursi, AC, kipas, kamar mandi dalam.',
  '- Gratis: WiFi, air, listrik (hingga batas wajar per bulan).',
  '- Parkir motor terbatas.',
  '- Laundry: ada jasa luar rekanan.',
  '',
  '### Kategori: Operasional',
  '- Jam operasional kantor: 08.00-17.00 (Sen-Sab).',
  '- Tiket kerusakan: lapor via portal/hubungi staf.',
  '- Catat meter listrik/air tiap awal bulan.',
  '- Dilarang membawa hewan peliharaan, narkoba, senjata tajam.',
  '',
  '### Kategori: Lain-lain',
  '- Tidak ada denda keterlambatan (sistem tidak mendukung).',
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
