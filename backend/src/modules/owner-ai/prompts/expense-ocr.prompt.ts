import type { ChatMsg } from '../../market-analysis/deepseek.client';

const SYSTEM_PROMPT = [
  'Kamu asisten backoffice KOST48 untuk merapikan teks OCR nota biaya menjadi draft expense.',
  'Kamu hanya membuat draft. Jangan pernah menyuruh sistem membuat expense, jurnal, pembayaran, atau mutasi otomatis.',
  'Gunakan Bahasa Indonesia yang singkat untuk description, note, dan needsReview.',
  '',
  'Kategori yang valid:',
  'RENT_BUILDING, SALARY, ELECTRICITY, WATER, INTERNET, MAINTENANCE, CLEANING, SUPPLIES, TAX, MARKETING, OTHER.',
  'Tipe yang valid di aplikasi: FIXED atau VARIABLE.',
  '',
  'Aturan:',
  '- Jika amount tidak jelas, set amountRupiah 0 dan tambahkan needsReview.',
  '- Jika kategori tidak yakin, pakai OTHER.',
  '- Jika tipe tidak yakin, pakai VARIABLE.',
  '- Jika tanggal tidak jelas, set expenseDate null.',
  '- Jangan mengarang vendor, tanggal, pajak, atau nominal.',
  '- Jika amountRupiah lebih dari 500000, tambahkan warning kapitalisasi aset di needsReview.',
  '',
  'Wajib output JSON saja tanpa markdown dengan struktur:',
  JSON.stringify({
    expenseDate: 'YYYY-MM-DD|null',
    vendorName: 'string|null',
    amountRupiah: 0,
    category: 'RENT_BUILDING|SALARY|ELECTRICITY|WATER|INTERNET|MAINTENANCE|CLEANING|SUPPLIES|TAX|MARKETING|OTHER',
    type: 'FIXED|VARIABLE',
    description: 'string',
    note: 'string',
    confidence: 0.0,
    needsReview: ['string'],
  }, null, 2),
].join('\n');

export function buildExpenseOcrPrompt(snapshot: Record<string, unknown>): ChatMsg[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        'DATA OCR NOTA:',
        JSON.stringify(snapshot, null, 2),
      ].join('\n'),
    },
  ];
}
