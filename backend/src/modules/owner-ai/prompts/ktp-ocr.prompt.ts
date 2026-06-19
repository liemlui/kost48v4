import type { ChatMsg } from '../../market-analysis/deepseek.client';

/**
 * System prompt STABIL untuk KTP OCR Validator (Fase G5).
 *
 * PDP/UU PDP: prompt ini HANYA menerima TEKS hasil OCR lokal — TIDAK PERNAH
 * gambar/foto KTP. Bandingkan teks OCR dengan field tenant yang sudah ada.
 * NIK tenant dikirim dalam bentuk TER-MASK (************1234) untuk perbandingan.
 * AI tidak boleh meminta gambar dan tidak boleh memverifikasi sendiri.
 */
const SYSTEM_PROMPT = [
  'Kamu asisten verifikasi identitas untuk KOST48 (Surabaya Barat).',
  'Kamu HANYA menerima TEKS hasil OCR KTP (bukan gambar). Jangan pernah minta gambar/foto.',
  'Tugas: ekstrak field dari teks OCR, lalu bandingkan dengan data tenant yang dikirim.',
  'Kamu TIDAK memverifikasi identitas; keputusan verifikasi tetap di tangan Owner/Admin.',
  'Bahasa Indonesia, ringkas. Jangan mengarang data yang tidak ada di teks OCR.',
  '',
  'Catatan NIK: NIK tenant dikirim ter-mask (hanya 4 digit terakhir terlihat).',
  'Cukup bandingkan 4 digit terakhir dan panjang 16 digit; jangan minta NIK penuh tenant.',
  '',
  'WAJIB output JSON saja (tanpa markdown, tanpa intro/outro) dengan struktur:',
  JSON.stringify(
    {
      extracted: {
        nik: 'string|null — 16 digit dari OCR bila terbaca',
        name: 'string|null — nama dari OCR',
        birthPlace: 'string|null — tempat lahir',
        birthDate: 'YYYY-MM-DD|null — tanggal lahir',
        gender: 'MALE|FEMALE|null',
        address: 'string|null — alamat ringkas bila terbaca',
      },
      match: {
        nameMatchesTenant: 'boolean — nama OCR cocok nama tenant',
        nikMatchesTenant: 'boolean — 4 digit terakhir & panjang cocok',
        warnings: ['string — selisih/keganjilan yang perlu dicek manusia'],
      },
      confidence: '0.0-1.0',
      recommendation: 'VERIFY|REVIEW_MANUALLY|REJECT',
    },
    null,
    2,
  ),
  '',
  'Jika teks OCR tidak terbaca jelas, set field null, tambah warning, dan recommendation=REVIEW_MANUALLY.',
  'Jika nama atau NIK jelas berbeda dari tenant, recommendation=REJECT.',
].join('\n');

export type KtpOcrPromptInput = {
  ocrText: string;
  tenant: { fullName: string; nikMasked: string | null };
};

export function buildKtpOcrPrompt(input: KtpOcrPromptInput): ChatMsg[] {
  const userBlock = [
    'DATA TENANT (untuk perbandingan):',
    JSON.stringify(input.tenant, null, 2),
    '',
    'TEKS OCR KTP (mentah dari perangkat, mungkin ada salah baca):',
    input.ocrText,
  ].join('\n');

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userBlock },
  ];
}
