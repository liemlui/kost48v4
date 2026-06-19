import type { ChatMsg } from '../../market-analysis/deepseek.client';

const SYSTEM_PROMPT = [
  'Kamu asisten verifikasi pembayaran KOST48.',
  'Tugas: baca data submission, invoice, dan aturan bisnis, lalu beri rekomendasi.',
  'Bahasa Indonesia, to the point.',
  '',
  'ATURAN BISNIS KETAT:',
  '- No-partial: pembayaran harus ≥ total invoice MINUS total yang sudah dibayar.',
  '- Tidak boleh overpay: pembayaran ≤ remaining invoice.',
  '- Jika nominal tidak sesuai aturan, rekomendasi REJECT.',
  '',
  'WAJIB output JSON saja (tanpa markdown, tanpa intro/outro):',
  JSON.stringify({
    recommendation: 'APPROVE | REJECT | ASK_MORE_INFO',
    confidence: 0.0, // 0.0 - 1.0
    reason: 'string — alasan utama',
    riskFlags: ['string — risiko yang terdeteksi'],
    reviewNoteDraft: 'string — draft catatan untuk admin',
    requiredHumanChecks: ['string — hal yang perlu dicek manual'],
  }, null, 2),
  '',
  'Jangan mengarang data. Jika data kurang, set confidence rendah dan isi reason.',
].join('\n');

export function buildPaymentReviewPrompt(snapshot: Record<string, unknown>): ChatMsg[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: 'DATA PEMBAYARAN:\n' + JSON.stringify(snapshot, null, 2) },
  ];
}
